import { GoogleGenAI, Type } from "@google/genai";
import { WineBottle, QuizQuestion } from "../types";

export interface Recommendation {
  name: string;
  producer: string;
  type: string;
  region: string;
  country: string;
  grape: string[];
  reason: string;
}

// WARNING: Calling Gemini API directly from the client/browser side exposes your API key if it is shipped to production.
// Ensure VITE_GEMINI_API_KEY is configured in Vercel/Deployment environment variables and that your API key is properly secured/restricted if exposed.
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;

function getAI() {
  if (!apiKey) {
    throw new Error(
      "VITE_GEMINI_API_KEY is not configured in your environment. Please define VITE_GEMINI_API_KEY in your .env file or Vercel Environment Variables."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build-client",
      },
    },
  });
}

/**
 * Analyzes the wine label image directly from the client side using the gemini-3.5-flash model.
 * @param imageUri base64 Data URI or blob/remote URL
 */
export async function analyzeWineLabel(imageUri: string): Promise<Partial<WineBottle> & { mainTastingNotes?: string }> {
  console.log("[AI Service] Client-side starting label scan using gemini-3.5-flash...");
  if (!imageUri || typeof imageUri !== "string") {
    console.error("[AI Service] Error: Invalid image URI provided to analyzeWineLabel.");
    throw new Error("Invalid image URI provided");
  }

  let base64 = "";
  let mimeType = "image/jpeg";

  if (imageUri.startsWith("data:")) {
    const split = imageUri.split(",");
    if (split.length > 1) {
      base64 = split[1];
      const match = imageUri.match(/^data:([^;]+);/);
      if (match) mimeType = match[1];
    } else {
      throw new Error("Malformed data URL provided");
    }
  } else {
    // Fetch image from blob/remote URL
    console.log("[AI Service] Fetching image from URL client-side...");
    const imgResponse = await fetch(imageUri);
    if (!imgResponse.ok) {
      throw new Error(`Failed to fetch image from URL: ${imgResponse.statusText}`);
    }
    const arrayBuffer = await imgResponse.arrayBuffer();
    
    // Convert ArrayBuffer to base64 in the browser safely
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    base64 = btoa(binary);
    mimeType = imgResponse.headers.get("content-type") || "image/jpeg";
  }

  const ai = getAI();

  const systemInstruction = `You are a professional sommelier. Analyze the wine label in the image and extract information into structured JSON.
  Be extremely descriptive and precise with the analytical profile fields:
  - wineName: The full, complete name of the wine.
  - producer: The estate, winery, or producer name.
  - vintage: The harvest year (e.g., '2020') or 'NV' if Non-Vintage.
  - region: The wine region (e.g., 'Napa Valley', 'Bordeaux').
  - grapeVarieties: List of grape varieties (e.g., ['Cabernet Sauvignon', 'Merlot']).
  - tastingNotes: A rich, poetic 1-2 sentence professional sommelier tasting summary/quote.
  - type: Guessed wine classification (Red, White, Rosé, Sparkling, Orange, Natural Red, Natural White, Pet Nat).
  - country: The country of origin.
  - appearance: Detailed appearance and color.
  - nose: The nose/aromatics description.
  - palate: Palate and structural profile.
  - finish: The finish and persistence.`;

  const result = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      "Identify this wine label details. Provide rich tasting notes and food pairings.",
      {
        inlineData: {
          data: base64,
          mimeType: mimeType,
        },
      },
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          wineName: { type: Type.STRING },
          producer: { type: Type.STRING },
          vintage: { type: Type.STRING },
          region: { type: Type.STRING },
          grapeVarieties: { type: Type.ARRAY, items: { type: Type.STRING } },
          tastingNotes: { type: Type.STRING },
          type: { type: Type.STRING },
          country: { type: Type.STRING },
          appearance: { type: Type.STRING },
          nose: { type: Type.STRING },
          palate: { type: Type.STRING },
          finish: { type: Type.STRING },
        },
        required: ["wineName", "producer", "vintage", "region", "grapeVarieties", "tastingNotes"],
      },
    },
  });

  const text = result.text;
  if (!text) {
    throw new Error("No response from AI Sommelier");
  }

  let cleanText = text.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }

  try {
    const parsedData = JSON.parse(cleanText);
    console.log("[AI Service] Direct scan success! Raw parsed:", parsedData);
    
    // Map response fields to match UI form filling logic expectations
    return {
      name: parsedData.wineName || "",
      producer: parsedData.producer || "",
      year: parsedData.vintage ? String(parsedData.vintage) : "NV",
      region: parsedData.region || "",
      grape: parsedData.grapeVarieties || [],
      tastingNotes: parsedData.tastingNotes || "",
      type: parsedData.type || "Red",
      country: parsedData.country || "",
      appearance: parsedData.appearance || "",
      nose: parsedData.nose || "",
      palate: parsedData.palate || "",
      finish: parsedData.finish || "",
      mainTastingNotes: parsedData.tastingNotes || "",
    };
  } catch (parseError: any) {
    console.error("Failed to parse AI Sommelier JSON output, raw text was:", text, parseError);
    throw new Error("AI Sommelier response was invalid or failed to parse. Please try again.");
  }
}

/**
 * Generates a random multiple choice question client-side using gemini-3.5-flash.
 */
export async function generateQuizQuestion(): Promise<QuizQuestion> {
  console.log("[AI Service] Client-side generating quiz question using gemini-3.5-flash...");
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: "Generate a highly engaging, unique, and informative multiple choice question about wine. Topics can include wine history, grape varieties, regions, production techniques, or food pairings. Ensure the options are plausible but only one is correct. Provide a helpful, educational 1-2 sentence 'Did you know?' style explanation.",
    config: {
      systemInstruction: "You are an expert sommelier and dynamic wine quiz master. Your task is to generate one high-quality multiple choice question about wine in raw JSON format.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ["question", "options", "correctAnswer", "explanation"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response generated from Gemini");
  }

  let cleanText = text.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }

  return JSON.parse(cleanText);
}

/**
 * Recommends wines based on the existing user's wine diary.
 */
export async function getWineRecommendations(bottles: WineBottle[]): Promise<Recommendation[]> {
  if (bottles.length === 0) return [];
  console.log("[AI Service] Client-side requesting wine recommendations for", bottles.length, "bottles.");
  try {
    const ai = getAI();
    const prompt = `Based on my current wine diary containing these bottles: ${JSON.stringify(
      bottles
    )}, suggest 3 wine recommendations that I would love. For each recommendation, provide name, producer, type, region, country, grape varieties, and a concise reason.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              producer: { type: Type.STRING },
              type: { type: Type.STRING },
              region: { type: Type.STRING },
              country: { type: Type.STRING },
              grape: { type: Type.ARRAY, items: { type: Type.STRING } },
              reason: { type: Type.STRING },
            },
            required: ["name", "producer", "type", "region", "country", "grape", "reason"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];

    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    return JSON.parse(cleanText);
  } catch (error) {
    console.error("[AI Service] Failed to fetch recommendations:", error);
    return [];
  }
}
