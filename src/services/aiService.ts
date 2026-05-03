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
  // Use a mix of top rated and recent wines for better diversity
  const sortedByRating = [...bottles].sort((a, b) => b.rating - a.rating);
  const sample = sortedByRating.slice(0, 30);
  
  const collectionSummary = sample.map(b => ({
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
    Focus on: Diversity, Specificity, Personalization, and Scale. 
    Respond with JSON array of recommendations.`;

    const result = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: `User Diary Data: ${JSON.stringify(collectionSummary)}` }] }],
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
    if (!text) throw new Error("No response from AI Sommelier");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI recommendation error details:", error);
    // Return empty if it's a quota or pattern error
    return [];
  }
}

export async function analyzeWineLabel(imageUri: string): Promise<Partial<WineBottle>> {
  try {
    if (!imageUri || typeof imageUri !== 'string') {
      throw new Error("Invalid image URI provided");
    }

    // 1. Fetch image and convert to base64
    const imgResponse = await fetch(imageUri);
    if (!imgResponse.ok) {
        throw new Error(`Failed to fetch image: ${imgResponse.status} ${imgResponse.statusText}. Ensure the image is accessible.`);
    }
    const blob = await imgResponse.blob();
    
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result;
        if (typeof res === 'string') {
          const split = res.split(',');
          if (split.length > 1) {
            resolve(split[1]);
          } else {
            reject(new Error("Invalid image format encountered. Please try another photo."));
          }
        } else {
          reject(new Error("Failed to read image data."));
        }
      };
      reader.onerror = () => reject(new Error("Image processing failed."));
      reader.readAsDataURL(blob);
    });

    const systemInstruction = `You are a professional sommelier. Analyze the wine label in the image and extract information into structured JSON. 
    Omit missing fields. Be precise with classifications like (Red, White, Rosé, Sparkling, Orange).`;

    const result = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{
        role: "user",
        parts: [
          { text: "Identify this wine label details." },
          {
            inlineData: {
              data: base64,
              mimeType: blob.type || "image/jpeg"
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
            year: { type: Type.STRING },
            type: { type: Type.STRING },
            region: { type: Type.STRING },
            country: { type: Type.STRING },
            grape: { type: Type.ARRAY, items: { type: Type.STRING } },
            tastingNotes: { type: Type.STRING }
          }
        }
      }
    });

    const text = result.text;
    if (!text) return {};
    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI label analysis error details:", error);
    // Better user-facing error messages
    if (error?.message?.includes("string did not match")) {
        throw new Error("The image data format is unexpected. Please try capturing the photo again.");
    }
    throw error; 
  }
}
