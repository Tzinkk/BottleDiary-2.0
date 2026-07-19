import { GoogleGenAI, Type } from "@google/genai";

export async function POST(request) {
  try {
    const { imageUri } = await request.json();
    if (!imageUri) {
      return new Response(JSON.stringify({ error: "No image URI provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key is not configured. Please add GEMINI_API_KEY in your deployment environment." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    let base64 = "";
    let mimeType = "image/jpeg";

    if (imageUri.startsWith("data:")) {
      const split = imageUri.split(",");
      if (split.length > 1) {
        base64 = split[1];
        const match = imageUri.match(/^data:([^;]+);/);
        if (match) mimeType = match[1];
      } else {
        return new Response(JSON.stringify({ error: "Malformed data URL provided" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    } else {
      // Fetch image from remote URL
      const imgResponse = await fetch(imageUri);
      if (!imgResponse.ok) {
        return new Response(
          JSON.stringify({ error: `Failed to fetch image from URL: ${imgResponse.statusText}` }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      const arrayBuffer = await imgResponse.arrayBuffer();
      base64 = Buffer.from(arrayBuffer).toString("base64");
      mimeType = imgResponse.headers.get("content-type") || "image/jpeg";
    }

    const systemInstruction = `You are a professional sommelier. Analyze the wine label in the image and extract information into structured JSON.
    Be extremely descriptive and precise with the analytical profile fields:
    - appearance: Describe the appearance, clarity, intensity, and specific color hue.
    - nose: Describe the nose/aromatics (primary fruit characters, secondary fermentation or oak notes, tertiary notes).
    - palate: Describe the palate and structure (body, acidity level, tannin strength, alcohol heat, taste profiles).
    - finish: Describe the finish (length, persistence, and lingering flavors).
    - mainTastingNotes: A concise, poetic 1-2 sentence professional sommelier tasting summary/quote suitable for a list view.
    
    Suggest 3 specific 'foodPairing' ideas that would complement this specific wine.
    Be precise with classifications like (Red, White, Rosé, Sparkling, Orange).`;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          { text: "Identify this wine label details. Provide rich tasting notes and food pairings." },
          {
            inlineData: {
              data: base64,
              mimeType: mimeType,
            },
          },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            producer: { type: Type.STRING },
            year: { type: Type.STRING },
            type: { type: Type.STRING },
            region: { type: Type.STRING },
            country: { type: Type.STRING },
            grape: { type: Type.ARRAY, items: { type: Type.STRING } },
            tastingNotes: { type: Type.STRING, description: "Detailed tasting notes (alternative/legacy field)" },
            appearance: { type: Type.STRING, description: "Detailed Appearance & Hue of the wine" },
            nose: { type: Type.STRING, description: "The Nose / Aromatics description of the wine" },
            palate: { type: Type.STRING, description: "Palate & Structure description of the wine" },
            finish: { type: Type.STRING, description: "The Finish / persistence description of the wine" },
            mainTastingNotes: { type: Type.STRING, description: "Concise 1-2 sentence professional sommelier tasting summary" },
            foodPairing: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });

    const text = result.text;
    if (!text) {
      return new Response(JSON.stringify({ error: "No response from AI Sommelier" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    try {
      const parsedData = JSON.parse(cleanText);
      return new Response(JSON.stringify(parsedData), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (parseError) {
      console.error("Failed to parse AI Sommelier JSON output, raw text was:", text, parseError);
      return new Response(
        JSON.stringify({ error: "AI Sommelier response was invalid or failed to parse. Please try again." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("AI label analysis error details in App router:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to analyze wine label" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
