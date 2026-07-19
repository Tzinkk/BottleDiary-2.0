import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageUri } = req.body;
    if (!imageUri) {
      return res.status(400).json({ error: "No image URI provided" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY in your deployment environment." 
      });
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
        return res.status(400).json({ error: "Malformed data URL provided" });
      }
    } else {
      // Fetch image from remote URL
      const imgResponse = await fetch(imageUri);
      if (!imgResponse.ok) {
        return res.status(400).json({ error: `Failed to fetch image from URL: ${imgResponse.statusText}` });
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
      return res.status(500).json({ error: "No response from AI Sommelier" });
    }

    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    try {
      const parsedData = JSON.parse(cleanText);
      return res.status(200).json(parsedData);
    } catch (parseError) {
      console.error("Failed to parse AI Sommelier JSON output, raw text was:", text, parseError);
      return res.status(500).json({ error: "AI Sommelier response was invalid or failed to parse. Please try again." });
    }
  } catch (error) {
    console.error("AI label analysis error details in Pages router:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze wine label" });
  }
}
