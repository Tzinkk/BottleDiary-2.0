import { WineBottle, QuizQuestion } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

export interface Recommendation {
  name: string;
  producer: string;
  type: string;
  region: string;
  country: string;
  grape: string[];
  reason: string;
}

/**
 * Gets the Google Gemini API Key from the available environment variables.
 * Checks import.meta.env (for Vite client-side) and process.env (for Node-like test runs).
 */
function getApiKey(): string {
  if (typeof import.meta !== "undefined" && import.meta) {
    const meta = import.meta as any;
    if (meta.env) {
      if (meta.env.VITE_GEMINI_API_KEY) {
        return meta.env.VITE_GEMINI_API_KEY;
      }
      if (meta.env.GEMINI_API_KEY) {
        return meta.env.GEMINI_API_KEY;
      }
    }
  }
  if (typeof process !== "undefined" && process.env) {
    if (process.env.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }
    if (process.env.VITE_GEMINI_API_KEY) {
      return process.env.VITE_GEMINI_API_KEY;
    }
  }
  return "";
}

/**
 * Initializes the Google Gen AI client with appropriate api key.
 */
function getAIClient(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please set VITE_GEMINI_API_KEY or GEMINI_API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Converts imageUri (which might be a base64 data URI, blob URL, or remote URL) to base64.
 */
async function imageUriToData(imageUri: string): Promise<{ base64: string; mimeType: string }> {
  if (imageUri.startsWith("data:")) {
    const parts = imageUri.split(",");
    const base64 = parts[1] || "";
    const match = imageUri.match(/^data:([^;]+);/);
    const mimeType = match ? match[1] : "image/jpeg";
    return { base64, mimeType };
  }

  // Handle blob URLs and remote URLs by fetching and converting to base64
  const response = await fetch(imageUri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const parts = dataUrl.split(",");
      const base64 = parts[1] || "";
      resolve({ base64, mimeType: blob.type || "image/jpeg" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Analyzes the wine label image directly using Google Gen AI client.
 * @param imageUri base64 Data URI or blob/remote URL
 */
export async function analyzeWineLabel(imageUri: string): Promise<Partial<WineBottle> & { mainTastingNotes?: string }> {
  console.log("[AI Service] Scanning label directly with gemini-3.5-flash...");
  if (!imageUri || typeof imageUri !== "string") {
    console.error("[AI Service] Error: Invalid image URI provided to analyzeWineLabel.");
    throw new Error("Invalid image URI provided");
  }

  const { base64, mimeType } = await imageUriToData(imageUri);
  const ai = getAIClient();

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
- finish: The finish and persistence.
- foodPairing: Array of 2-4 perfect food pairing dishes or components.
- additionalNote: A short, elegant note with serving recommendation, potential cellaring time, or background details.`;

  const response = await ai.models.generateContent({
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
          foodPairing: { type: Type.ARRAY, items: { type: Type.STRING } },
          additionalNote: { type: Type.STRING },
        },
        required: ["wineName", "producer", "vintage", "region", "grapeVarieties", "tastingNotes"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from AI Sommelier");
  }

  let cleanText = text.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }

  const parsedData = JSON.parse(cleanText);

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
    foodPairing: parsedData.foodPairing || [],
    additionalNote: parsedData.additionalNote || "",
    mainTastingNotes: parsedData.tastingNotes || "",
  };
}

/**
 * Generates a random multiple choice question directly using gemini-3.5-flash.
 */
export async function generateQuizQuestion(): Promise<QuizQuestion> {
  console.log("[AI Service] Generating quiz question directly with gemini-3.5-flash...");
  const ai = getAIClient();

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
    throw new Error("No response from AI");
  }

  let cleanText = text.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }

  return JSON.parse(cleanText);
}

/**
 * Recommends wines based on the existing user's wine diary directly using gemini-3.5-flash.
 */
export async function getWineRecommendations(bottles: WineBottle[]): Promise<Recommendation[]> {
  if (bottles.length === 0) return [];
  console.log("[AI Service] Generating wine recommendations directly with gemini-3.5-flash for", bottles.length, "bottles.");
  try {
    const ai = getAIClient();
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
    if (!text) {
      return [];
    }

    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    return JSON.parse(cleanText);
  } catch (error) {
    console.error("[AI Service] Failed to generate recommendations directly:", error);
    return [];
  }
}

/**
 * Rewrites raw bullet-point or rough tasting notes into a professional, elegant paragraph using gemini-3.5-flash.
 */
export async function refineTastingNotes(rawNotes: string): Promise<string> {
  if (!rawNotes || !rawNotes.trim()) {
    throw new Error("No notes provided to refine");
  }
  console.log("[AI Service] Refining tasting notes directly with gemini-3.5-flash...");
  const ai = getAIClient();
  const prompt = `Rewrite the following rough, raw bullet-point wine tasting notes into a single, cohesive, professional, and elegant paragraph suitable for an editorial wine diary. Do not add any conversational text or explanation; return only the refined paragraph.

Rough notes:
${rawNotes}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from AI");
  }

  return text.trim();
}

/**
 * Generates tasting notes and analytical profile for a bottle that has no detailed notes using gemini-3.5-flash.
 */
export async function generateTastingNotesForBottle(bottle: WineBottle): Promise<Partial<WineBottle>> {
  console.log(`[AI Service] Generating tasting notes directly with gemini-3.5-flash for ${bottle.name}...`);
  const ai = getAIClient();
  const prompt = `You are an expert sommelier. Based on the following wine details, generate a comprehensive tasting profile including tasting notes, appearance, nose, palate, finish, food pairing, and additional elegant serving notes:
  - Name: ${bottle.name}
  - Producer: ${bottle.producer}
  - Vintage: ${bottle.year}
  - Type: ${bottle.type}
  - Region: ${bottle.region}
  - Country: ${bottle.country}
  - Grape Varieties: ${bottle.grape ? (Array.isArray(bottle.grape) ? bottle.grape.join(', ') : bottle.grape) : 'Unknown'}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are an expert sommelier. Generate detailed wine tasting profiles in raw JSON format.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tastingNotes: { type: Type.STRING },
          appearance: { type: Type.STRING },
          nose: { type: Type.STRING },
          palate: { type: Type.STRING },
          finish: { type: Type.STRING },
          foodPairing: { type: Type.ARRAY, items: { type: Type.STRING } },
          additionalNote: { type: Type.STRING },
        },
        required: ["tastingNotes", "appearance", "nose", "palate", "finish"],
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from AI");
  }

  let cleanText = text.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }

  return JSON.parse(cleanText);
}
