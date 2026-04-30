import { WineBottle } from "../types";
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

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getWineRecommendations(bottles: WineBottle[]): Promise<Recommendation[]> {
  if (bottles.length === 0) return [];

  // Prepare a compact representation for the AI
  const collectionSummary = bottles.slice(0, 20).map(b => ({
    name: b.name,
    type: b.type,
    rating: b.rating,
    grapes: b.grape,
    region: b.region,
    notes: b.tastingNotes
  }));

  try {
    const systemInstruction = `You are a world-class sommelier and AI wine recommendation engine. 
    Based on the user's current wine diary (provided in JSON), suggest 3 unique wines they would likely enjoy.
    Focus on: Diversity, Specificity, Personalization, and Scale.`;

    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ text: `User Diary Data: ${JSON.stringify(collectionSummary)}` }],
      config: {
        systemInstruction,
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
              reason: { type: Type.STRING }
            },
            required: ["name", "producer", "type", "region", "country", "grape", "reason"]
          }
        }
      }
    });

    const text = result.text;
    return JSON.parse(text || "[]");
  } catch (error) {
    console.error("AI recommendation error:", error);
    return [];
  }
}

export async function analyzeWineLabel(imageUri: string): Promise<Partial<WineBottle>> {
  try {
    // 1. Fetch image and convert to base64
    const imgResponse = await fetch(imageUri);
    const blob = await imgResponse.blob();
    
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.readAsDataURL(blob);
    });

    const systemInstruction = `You are a professional sommelier. Analyze the wine label in the image and extract as much information as possible into a structured JSON format. 
    If you cannot find a piece of information, omit it from the JSON.
    Be precise with the classification (Red, White, Rosé, Sparkling, Natural Red, Natural White, Pet Nat, Orange, Sato, Sake).`;

    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { text: "Analyze this wine label and return JSON matching the schema." },
          {
            inlineData: {
              data: base64,
              mimeType: blob.type
            }
          }
        ]
      }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            producer: { type: Type.STRING },
            year: { type: Type.STRING, description: "YYYY or NV" },
            type: { type: Type.STRING, description: "Red, White, Rosé, Sparkling, Natural Red, Natural White, Pet Nat, Orange, Sato, Sake" },
            region: { type: Type.STRING },
            country: { type: Type.STRING },
            grape: { type: Type.ARRAY, items: { type: Type.STRING } },
            tastingNotes: { type: Type.STRING, description: "Brief predicted tasting notes based on the wine's identity." }
          }
        }
      }
    });

    const text = result.text;
    return JSON.parse(text || "{}");
  } catch (error) {
    console.error("AI label analysis error:", error);
    return {};
  }
}
