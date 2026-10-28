import { WineBottle, WineType, QuizQuestion } from "../types";
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
  const metaEnv = (typeof import.meta !== "undefined" && (import.meta as any).env) || {};
  const processEnv = (typeof process !== "undefined" && process.env) || {};

  const apiKey = 
    metaEnv.VITE_GEMINI_API_KEY || 
    metaEnv.GEMINI_API_KEY || 
    processEnv.GEMINI_API_KEY || 
    processEnv.VITE_GEMINI_API_KEY ||
    "";

  return apiKey;
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
 * Single-pass client-side image compression for OCR: max dimension 1600px with JPEG quality 0.92
 * Ensures small vintage fonts, château engravings, and appellation text remain sharp and legible.
 */
export async function compressImageForAI(imageSource: string | Blob | File): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    let src = '';
    let isCreatedBlob = false;
    if (typeof imageSource === 'string') {
      src = imageSource;
    } else {
      src = URL.createObjectURL(imageSource);
      isCreatedBlob = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const MAX_SIZE = 1600;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }

        // Fill clean white background in case of transparent PNG/WebP
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const base64 = dataUrl.split(',')[1] || '';
        if (isCreatedBlob) URL.revokeObjectURL(src);
        resolve({ base64, mimeType: 'image/jpeg', dataUrl });
      } catch (err) {
        if (isCreatedBlob) URL.revokeObjectURL(src);
        reject(err);
      }
    };
    img.onerror = () => {
      if (isCreatedBlob) URL.revokeObjectURL(src);
      reject(new Error('Failed to load image for OCR preparation'));
    };
    img.src = src;
  });
}

/**
 * Extracts raw base64 data directly without redundant re-compression.
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

export const PRIMARY_AI_MODEL = "gemini-3.8-flash";
export const FALLBACK_AI_MODEL = "gemini-3.5-flash-lite";

/**
 * Executes a Gemini API request with a resilient dual-model architecture:
 * - Primary Model: gemini-3.8-flash
 * - Fallback Model: gemini-3.5-flash-lite
 * If the primary model returns 503 (High Demand / Service Unavailable) or 429 (Rate Limit / Quota),
 * it seamlessly retries once using the fallback model before throwing a clean, informative error.
 */
export async function generateWithRetryAndFallback(
  ai: GoogleGenAI,
  options: {
    model?: string;
    contents: any;
    config?: any;
  }
) {
  const targetPrimary = options.model || PRIMARY_AI_MODEL;

  try {
    console.log(`[AI Service] Executing Gemini request with primary model: ${targetPrimary}...`);
    return await ai.models.generateContent({
      ...options,
      model: targetPrimary,
    });
  } catch (primaryErr: any) {
    const errMsg = String(primaryErr?.message || JSON.stringify(primaryErr) || primaryErr);
    console.warn(`[AI Service] Primary model (${targetPrimary}) encountered error:`, errMsg);

    const isRetryableError =
      errMsg.includes("503") ||
      errMsg.includes("HIGH DEMAND") ||
      errMsg.includes("high demand") ||
      errMsg.includes("429") ||
      errMsg.includes("UNAVAILABLE") ||
      errMsg.includes("unavailable") ||
      errMsg.includes("RESOURCE_EXHAUSTED") ||
      errMsg.includes("quota") ||
      errMsg.includes("Quota") ||
      errMsg.includes("RATE_LIMIT") ||
      errMsg.includes("overloaded");

    if (isRetryableError && targetPrimary !== FALLBACK_AI_MODEL) {
      console.warn(`[AI Service] Seamlessly retrying with fallback model (${FALLBACK_AI_MODEL})...`);
      // Brief 1.5s backoff before attempting fallback
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const fallbackRes = await ai.models.generateContent({
          ...options,
          model: FALLBACK_AI_MODEL,
        });
        console.log(`[AI Service] Fallback model (${FALLBACK_AI_MODEL}) succeeded!`);
        return fallbackRes;
      } catch (fallbackErr: any) {
        console.error(`[AI Service] Fallback model (${FALLBACK_AI_MODEL}) also failed:`, fallbackErr);
        const fbMsg = String(fallbackErr?.message || fallbackErr);
        if (fbMsg.includes("503") || fbMsg.includes("HIGH DEMAND") || fbMsg.includes("UNAVAILABLE")) {
          throw new Error("Google server high demand - please try again in a few seconds.");
        }
        if (fbMsg.includes("429") || fbMsg.includes("RESOURCE_EXHAUSTED") || fbMsg.includes("quota")) {
          throw new Error("AI request quota reached. Please wait a moment and try again, or enter details manually.");
        }
        throw fallbackErr instanceof Error ? fallbackErr : new Error(fbMsg);
      }
    }

    if (errMsg.includes("503") || errMsg.includes("HIGH DEMAND") || errMsg.includes("UNAVAILABLE")) {
      throw new Error("Google server high demand - please try again in a few seconds.");
    }
    if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
      throw new Error("AI request quota reached. Please wait a moment and try again, or enter details manually.");
    }

    throw primaryErr instanceof Error ? primaryErr : new Error(errMsg);
  }
}

/**
 * Sanitizes string values to prevent literal "null", "undefined", or "N/A" artifacts.
 */
function sanitizeField(val: any, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  const str = String(val).trim();
  const lower = str.toLowerCase();
  if (lower === 'null' || lower === 'undefined' || lower === 'none' || lower === 'n/a' || lower === 'unknown') {
    return fallback;
  }
  return str;
}

/**
 * Parses raw classification string into a valid canonical WineType without inspecting tasting notes or grape blends.
 */
export function parseWineType(typeStr?: string): WineType {
  const norm = (typeStr || '').trim().toLowerCase();
  if (norm.includes('pet nat') || norm.includes('pet-nat') || norm.includes('pét-nat') || norm.includes('pét nat') || norm.includes('ancestrale')) return 'Pet Nat';
  if (norm.includes('natural white')) return 'Natural White';
  if (norm.includes('natural red')) return 'Natural Red';
  if (norm.includes('sparkling') || norm.includes('champagne') || norm.includes('cava') || norm.includes('sekt') || norm.includes('prosecco') || norm.includes('cremant') || norm.includes('crémant')) return 'Sparkling';
  if (norm.includes('orange') || norm.includes('amber') || norm.includes('skin contact') || norm.includes('skin-contact')) return 'Orange';
  if (norm.includes('rosé') || norm.includes('rose') || norm.includes('rosato') || norm.includes('rosado')) return 'Rosé';
  if (norm.includes('white') || norm.includes('blanc') || norm.includes('bianco') || norm.includes('blanco') || norm.includes('weiss')) return 'White';
  if (norm.includes('red') || norm.includes('rouge') || norm.includes('rosso') || norm.includes('tinto') || norm.includes('rot')) return 'Red';
  if (norm.includes('sake')) return 'Sake';
  if (norm.includes('sato')) return 'Sato';

  const validTypes: WineType[] = ['Red', 'White', 'Rosé', 'Sparkling', 'Natural Red', 'Natural White', 'Pet Nat', 'Orange', 'Sato', 'Sake'];
  const matched = validTypes.find(t => t.toLowerCase() === norm);
  return matched || 'Red';
}

/**
 * LABEL PHOTO OCR SCANNER (scanWineLabelImage):
 * Reads physically printed text on the bottle label with extreme precision:
 * Producer, Bottle Name, Vintage year / NV, Region, Appellation, Alcohol % ABV.
 * If information is not visible on the label, leaves it empty rather than guessing or hallucinating.
 * @param imageUri base64 Data URI, blob, or remote image URL
 */
export async function scanWineLabelImage(imageUri: string): Promise<Partial<WineBottle> & { 
  bottleName?: string;
  vintage?: string;
  classification?: WineType;
  grapes?: string[];
  grapeVarieties?: string[];
  alcohol?: string; 
  mainTastingNotes?: string;
}> {
  console.log(`[AI Service] Scanning label photo with precision OCR (${PRIMARY_AI_MODEL})...`);
  if (!imageUri || typeof imageUri !== "string") {
    console.error("[AI Service] Error: Invalid image URI provided to scanWineLabelImage.");
    throw new Error("Invalid image data provided for label scan");
  }

  const { base64, mimeType } = await imageUriToData(imageUri);
  const ai = getAIClient();

  const systemInstruction = `You are a precision wine label OCR scanner.
Read visible text physically printed on the wine bottle label with extreme fidelity and accuracy.

VISIBLE FIELD EXTRACTION:
- bottleName: Cuvée or wine name as printed on the label.
- producer: Estate, château, winery, or vigneron name printed.
- vintage: Harvest vintage year printed (e.g. "2021", "2018"). If non-vintage or unstated, return "".
- classification: Classification indicated on label ('Red' | 'White' | 'Rosé' | 'Sparkling' | 'Natural Red' | 'Natural White' | 'Pet Nat' | 'Orange' | 'Sato' | 'Sake'). If not stated, default to 'Red'.
- region: Specific appellation or region if printed on the label. If not printed, return "".
- country: Country of origin if printed. If not printed, return "".
- grapeVarieties: Only grape varieties explicitly listed on the label. If unlisted, return [].
- abv: Alcohol by volume percentage if printed (e.g. "12.5% vol"). If unstated, return "".
- body: Body indicated on the label ('Light' | 'Medium-Minus' | 'Medium' | 'Medium-Plus' | 'Full') or 'Medium'.
- tastingSummary: English translation/synthesis of back-label tasting impressions ONLY if physically printed; if not printed, return "".
- winemaking: Winemaking method, fermentation, vessels, aging, or sulfite info ONLY if physically printed; if not, return "".
- viticulture: Farming, vineyard, soil, or organic/biodynamic certification details ONLY if physically printed; if not, return "".

CRITICAL ANTI-HALLUCINATION RULE:
If information is not physically visible on the label, leave it empty ("" or []) rather than guessing, hallucinating, or inventing facts.`;

  const response = await generateWithRetryAndFallback(ai, {
    model: PRIMARY_AI_MODEL,
    contents: [
      "Transcribe all physically printed details from this wine label accurately in structured JSON format.",
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
          bottleName: { type: Type.STRING },
          producer: { type: Type.STRING },
          vintage: { type: Type.STRING },
          classification: { 
            type: Type.STRING, 
            enum: ['Red', 'White', 'Rosé', 'Sparkling', 'Natural Red', 'Natural White', 'Pet Nat', 'Orange', 'Sato', 'Sake'] 
          },
          country: { type: Type.STRING },
          region: { type: Type.STRING },
          grapeVarieties: { type: Type.ARRAY, items: { type: Type.STRING } },
          abv: { type: Type.STRING },
          body: { 
            type: Type.STRING,
            enum: ['Light', 'Medium-Minus', 'Medium', 'Medium-Plus', 'Full']
          },
          tastingSummary: { type: Type.STRING },
          winemaking: { type: Type.STRING },
          viticulture: { type: Type.STRING },
        },
        required: ["bottleName", "producer", "vintage", "classification", "country", "region"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from AI label OCR scanner");
  }

  let cleanText = text.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }

  let parsedData: any = {};
  try {
    parsedData = JSON.parse(cleanText);
  } catch {
    throw new Error("Failed to parse label OCR response.");
  }

  // Extract clean fields
  const wineName = sanitizeField(parsedData.bottleName || parsedData.name || parsedData.wineName);
  const producer = sanitizeField(parsedData.producer);
  const vintage = sanitizeField(parsedData.vintage || parsedData.year);
  const country = sanitizeField(parsedData.country);
  const region = sanitizeField(parsedData.region);
  const rawType = sanitizeField(parsedData.classification || parsedData.wineType || parsedData.type);
  const finalType = parseWineType(rawType);

  const rawGrapes = parsedData.grapeVarieties || parsedData.grapes || parsedData.grape || [];
  const grapesList: string[] = (Array.isArray(rawGrapes) ? rawGrapes : (typeof rawGrapes === 'string' ? rawGrapes.split(',') : []))
    .map((g: any) => sanitizeField(g))
    .filter(Boolean);

  const abv = sanitizeField(parsedData.abv || parsedData.alcohol);
  const body = sanitizeField(parsedData.body, 'Medium');
  const tastingSummary = sanitizeField(parsedData.tastingSummary || parsedData.tastingNotes || parsedData.notes);
  const winemaking = sanitizeField(parsedData.winemaking || parsedData.winemakingPhilosophy);
  const viticulture = sanitizeField(parsedData.viticulture);

  return {
    name: wineName,
    bottleName: wineName,
    producer: producer,
    year: vintage,
    vintage: vintage,
    region: region,
    country: country,
    type: finalType,
    classification: finalType,
    grape: grapesList,
    grapes: grapesList,
    grapeVarieties: grapesList,
    abv: abv,
    alcohol: abv,
    body: body,
    tastingSummary: tastingSummary,
    tastingNotes: tastingSummary,
    mainTastingNotes: tastingSummary,
    winemaking: winemaking,
    winemakingPhilosophy: winemaking,
    viticulture: viticulture,
  };
}

export const analyzeWineLabel = scanWineLabelImage;

/**
 * Generates a random multiple choice question directly using gemini-3.5-flash.
 */
export async function generateQuizQuestion(): Promise<QuizQuestion> {
  console.log("[AI Service] Generating quiz question...");
  const ai = getAIClient();

  const response = await generateWithRetryAndFallback(ai, {
    model: "gemini-3.8-flash",
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
 * Recommends wines based on the existing user's wine diary directly using gemini-3.8-flash.
 */
export async function getWineRecommendations(bottles: WineBottle[]): Promise<Recommendation[]> {
  if (bottles.length === 0) return [];
  console.log("[AI Service] Generating wine recommendations for", bottles.length, "bottles.");
  try {
    const ai = getAIClient();
    const prompt = `Based on my current wine diary containing these bottles: ${JSON.stringify(
      bottles
    )}, suggest 3 wine recommendations that I would love. For each recommendation, provide name, producer, type, region, country, grape varieties, and a concise reason.`;

    const response = await generateWithRetryAndFallback(ai, {
      model: "gemini-3.8-flash",
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
 * Rewrites raw bullet-point or rough tasting notes into a professional, elegant paragraph using gemini-3.8-flash.
 */
export async function refineTastingNotes(rawNotes: string): Promise<string> {
  if (!rawNotes || !rawNotes.trim()) {
    throw new Error("No notes provided to refine");
  }
  console.log("[AI Service] Refining tasting notes...");
  const ai = getAIClient();
  const prompt = `Rewrite the following rough, raw bullet-point wine tasting notes into a single, cohesive, professional, and elegant paragraph suitable for an editorial wine diary. Do not add any conversational text or explanation; return only the refined paragraph.

Rough notes:
${rawNotes}`;

  const response = await generateWithRetryAndFallback(ai, {
    model: "gemini-3.8-flash",
    contents: prompt,
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from AI");
  }

  return text.trim();
}

/**
 * Generates tasting notes and analytical profile for a bottle that has no detailed notes using gemini-3.8-flash.
 */
export async function generateTastingNotesForBottle(bottle: WineBottle): Promise<Partial<WineBottle>> {
  console.log(`[AI Service] Generating tasting notes for ${bottle.name}...`);
  const ai = getAIClient();
  const prompt = `You are an expert sommelier. Based on the following wine details, generate a comprehensive tasting profile including tasting notes, appearance, nose, palate, finish, viticulture (farming/vineyard practices), winemaking philosophy (fermentation/aging style), food pairing, and additional elegant serving notes:
  - Name: ${bottle.name}
  - Producer: ${bottle.producer}
  - Vintage: ${bottle.year}
  - Type: ${bottle.type}
  - Region: ${bottle.region}
  - Country: ${bottle.country}
  - Grape Varieties: ${bottle.grape ? (Array.isArray(bottle.grape) ? bottle.grape.join(', ') : bottle.grape) : 'Unknown'}`;

  const response = await generateWithRetryAndFallback(ai, {
    model: "gemini-3.8-flash",
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
          winemakingPhilosophy: { type: Type.STRING },
          viticulture: { type: Type.STRING },
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

export interface AIGrapeProfile {
  type: 'Red' | 'White';
  skin: string;
  body: string;
  locations: string[];
  acidity: string;
  tannin: string;
  sweetness: string;
  aromaFlavor: string;
  otherNotes: string;
  foodPairing: string[];
  additionalNotes?: string;
}

/**
 * Auto-generates authentic oenological data for a grape variety using Gemini API.
 */
export async function fetchGrapeProfile(varietyName: string): Promise<AIGrapeProfile> {
  if (!varietyName || !varietyName.trim()) {
    throw new Error("Please enter a grape variety name first");
  }

  console.log(`[AI Service] Generating grape profile for "${varietyName}"...`);
  const ai = getAIClient();

  const prompt = `You are a Master of Wine and ampelographer. Provide authentic, precise oenological and viticultural data for the grape variety "${varietyName.trim()}".
Return the data in structured JSON matching this schema:
- type: Either "Red" or "White" (or default to the standard categorization).
- skin: Thickness and characteristics (e.g. "Thin, delicate skin" or "Thick, dark-blue skin").
- body: Typical body (e.g. "Light-Medium", "Medium-Full", "Full").
- locations: Array of prominent regions/countries where this grape thrives (formatted as "Region / Country", e.g., ["Burgundy / France", "Oregon / United States"]).
- acidity: Acidity level (e.g., "High", "Medium-High", "Medium", "Low").
- tannin: Tannin level (e.g., "Very High", "High", "Medium", "Low", "None").
- sweetness: Typical wine sweetness style (e.g., "Dry", "Off-Dry", "Sweet").
- aromaFlavor: Detailed sensory notes (primary fruit, florals, earth, herbs, spice).
- otherNotes: Viticultural characteristics, aging potential, sensitivity to terroir.
- foodPairing: Array of 3-4 classic food pairing dishes.
- additionalNotes: Historical origin, genetic parentage, or interesting sommelier trivia.`;

  const response = await generateWithRetryAndFallback(ai, {
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are a master ampelographer and sommelier. Generate structured grape variety profile data in raw JSON format.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["Red", "White"] },
          skin: { type: Type.STRING },
          body: { type: Type.STRING },
          locations: { type: Type.ARRAY, items: { type: Type.STRING } },
          acidity: { type: Type.STRING },
          tannin: { type: Type.STRING },
          sweetness: { type: Type.STRING },
          aromaFlavor: { type: Type.STRING },
          otherNotes: { type: Type.STRING },
          foodPairing: { type: Type.ARRAY, items: { type: Type.STRING } },
          additionalNotes: { type: Type.STRING },
        },
        required: ["type", "skin", "body", "locations", "acidity", "tannin", "sweetness", "aromaFlavor", "otherNotes", "foodPairing"],
      },
    },
  });

  const resText = response.text;
  if (!resText) {
    throw new Error("No response from AI Sommelier");
  }

  let cleaned = resText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }

  const parsed = JSON.parse(cleaned);
  return {
    type: parsed.type === "White" ? "White" : "Red",
    skin: parsed.skin || "",
    body: parsed.body || "",
    locations: Array.isArray(parsed.locations) ? parsed.locations : [],
    acidity: parsed.acidity || "",
    tannin: parsed.tannin || "",
    sweetness: parsed.sweetness || "Dry",
    aromaFlavor: parsed.aromaFlavor || "",
    otherNotes: parsed.otherNotes || "",
    foodPairing: Array.isArray(parsed.foodPairing) ? parsed.foodPairing : [],
    additionalNotes: parsed.additionalNotes || "",
  };
}

export interface AIWineNameProfile {
  bottleName: string;
  name?: string;
  producer: string;
  vintage: string;
  year?: string;
  classification: string;
  country: string;
  region: string;
  grapeVarieties: string[];
  grapes: string[];
  grape?: string[];
  abv: string;
  alcohol?: string;
  body: 'Light' | 'Medium-Minus' | 'Medium' | 'Medium-Plus' | 'Full' | string;
  tastingSummary: string;
  winemaking: string;
  viticulture: string;
  mainSummary?: string;
  tastingNotes?: string;
  winemakingPhilosophy?: string;
}

/**
 * GOOGLE SEARCH GROUNDED AUTO-FILL (autoFillWineByName):
 * Constructs search query: "{producer} {wineName} {vintage} wine technical sheet".
 * Employs clean Gemini 3 generation config with tools: [{ googleSearch: {} }].
 * Extracts verified facts: bottleName, producer, vintage, classification, region, country,
 * grapeVarieties, abv, body, tastingSummary, winemaking, viticulture.
 */
export async function autoFillWineByName(
  bottleName: string,
  producer?: string,
  vintage?: string
): Promise<AIWineNameProfile> {
  if (!bottleName || !bottleName.trim()) {
    throw new Error("Please enter a wine name first");
  }

  const cleanName = bottleName.trim();
  const cleanProducer = (producer || "").trim();
  const cleanVintage = (vintage || "").trim();

  // Search Query: "{producer} {wineName} {vintage} wine technical sheet"
  const queryTokens: string[] = [];
  if (cleanProducer) {
    queryTokens.push(cleanProducer);
  }
  if (!cleanProducer || !cleanName.toLowerCase().includes(cleanProducer.toLowerCase())) {
    queryTokens.push(cleanName);
  } else {
    queryTokens.push(cleanName);
  }
  if (cleanVintage && cleanVintage !== "NV" && !cleanName.includes(cleanVintage)) {
    queryTokens.push(cleanVintage);
  }
  queryTokens.push("wine technical sheet");
  const searchQuery = queryTokens.join(" ").trim();

  console.log(`[AI Service] Grounded Wine Search starting: "${searchQuery}" (${PRIMARY_AI_MODEL})...`);
  const ai = getAIClient();

  // STEP 1: FACTUAL GOOGLE SEARCH (tools: [{ googleSearch: {} }])
  let factualResearch = "";
  try {
    const searchStepResponse = await generateWithRetryAndFallback(ai, {
      model: PRIMARY_AI_MODEL,
      contents: `Search Google for the technical sheet: "${searchQuery}". Extract verified facts from winemaker technical sheets or importer portfolios.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `You are a technical wine data researcher. Search Google thoroughly using the search tool for: "${searchQuery}".
Extract verified facts:
1. bottleName: Cuvée or wine name.
2. producer: Winery or estate name.
3. vintage: Harvest year.
4. classification: Strictly one of: RED, WHITE, ROSÉ, SPARKLING, NATURAL RED, NATURAL WHITE, PET NAT, ORANGE, SATO, SAKE.
5. region & country: Specific Appellation/Region and Country of origin.
6. grapeVarieties: Real grape varietal composition and percentages (do NOT guess or invent varieties).
7. abv: Alcohol % by volume (e.g. "12.5%").
8. body: Body profile ('Light' | 'Medium-Minus' | 'Medium' | 'Medium-Plus' | 'Full').
9. tastingSummary: Concise summary of verified tasting impressions from real importer/sommelier notes.
10. winemaking: Fermentation, vessels, maceration, sulfur, oak, aging details.
11. viticulture: Soil type, farming practices, elevation, organic/biodynamic certifications.
Synthesize all factual findings in concise bullet points.`,
      },
    });
    factualResearch = searchStepResponse.text || "";
    console.log(`[AI Service] Step 1 Google Search completed (${factualResearch.length} chars)`);
  } catch (searchErr: any) {
    console.warn("[AI Service] Step 1 search notice, proceeding with direct synthesis:", searchErr?.message);
    factualResearch = `Wine: ${searchQuery}`;
  }

  // STEP 2: STRUCTURED JSON SYNTHESIS (Clean JSON serialization without tools)
  const jsonSystemInstruction = `You are a master sommelier data serializer. Convert the wine technical research into clean, structured JSON.
CRITICAL RULES:
- bottleName: "${cleanName}".
- producer: "${cleanProducer || 'Producer name'}".
- vintage: "${cleanVintage}".
- classification must be one of: 'RED', 'WHITE', 'ROSÉ', 'SPARKLING', 'NATURAL RED', 'NATURAL WHITE', 'PET NAT', 'ORANGE', 'SATO', 'SAKE'.
- grapeVarieties must contain real grape varieties extracted from research. Do NOT fabricate fictitious grapes.
- abv: e.g. "12.5%".
- body must be one of: 'Light', 'Medium-Minus', 'Medium', 'Medium-Plus', 'Full'.
- tastingSummary: concise real tasting notes summary.
- winemaking: vinification, fermentation, oak, sulfur, aging details.
- viticulture: soil, farming practices, organic/biodynamic details.
- Format output strictly as JSON.`;

  const jsonPrompt = `Convert the following wine research into structured JSON:

Target Query: ${searchQuery}

Research Dossier:
${factualResearch || `Wine: ${searchQuery}`}

Required JSON Schema:
{
  "bottleName": "${cleanName}",
  "producer": "${cleanProducer || 'Producer name'}",
  "vintage": "${cleanVintage}",
  "classification": "RED | WHITE | ROSÉ | SPARKLING | NATURAL RED | NATURAL WHITE | PET NAT | ORANGE | SATO | SAKE",
  "region": "Specific Appellation or Region",
  "country": "Country of origin",
  "grapeVarieties": ["Grape 1", "Grape 2"],
  "abv": "Alcohol % (e.g. 12.5%)",
  "body": "Light | Medium-Minus | Medium | Medium-Plus | Full",
  "tastingSummary": "Concise summary of verified tasting notes",
  "winemaking": "Fermentation, vessels, oak, aging, and sulfur details",
  "viticulture": "Soil type, farming practices, organic or biodynamic info"
}`;

  const jsonStepResponse = await generateWithRetryAndFallback(ai, {
    model: PRIMARY_AI_MODEL,
    contents: jsonPrompt,
    config: {
      systemInstruction: jsonSystemInstruction,
      responseMimeType: "application/json",
    },
  });

  const resText = jsonStepResponse.text || "";
  if (!resText) {
    throw new Error("No response received from wine data serializer.");
  }

  let cleaned = resText.trim();
  if (cleaned.includes("```")) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      cleaned = match[1].trim();
    } else {
      cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }
  } else {
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }
  }

  let parsed: any = {};
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse wine technical data from AI response.");
  }

  const rawGrapes = parsed.grapeVarieties || parsed.grapes || [];
  const grapeVarieties: string[] = (Array.isArray(rawGrapes)
    ? rawGrapes
    : typeof rawGrapes === "string"
    ? rawGrapes.split(",")
    : []
  ).map((g) => sanitizeField(g)).filter(Boolean);

  const bottleNameOut = sanitizeField(parsed.bottleName || parsed.name, cleanName);
  const producerOut = sanitizeField(parsed.producer, cleanProducer);
  const vintageOut = sanitizeField(parsed.vintage || parsed.year, cleanVintage);
  const rawClass = sanitizeField(parsed.classification, "RED").toUpperCase();
  const tastingSummary = sanitizeField(parsed.tastingSummary || parsed.mainSummary || parsed.tastingNotes);
  const winemaking = sanitizeField(parsed.winemaking || parsed.winemakingPhilosophy);
  const viticulture = sanitizeField(parsed.viticulture);
  const abv = sanitizeField(parsed.abv || parsed.alcohol);
  const body = sanitizeField(parsed.body, "Medium");

  return {
    bottleName: bottleNameOut,
    name: bottleNameOut,
    producer: producerOut,
    vintage: vintageOut,
    year: vintageOut,
    classification: rawClass,
    country: sanitizeField(parsed.country),
    region: sanitizeField(parsed.region),
    grapeVarieties,
    grapes: grapeVarieties,
    grape: grapeVarieties,
    abv,
    alcohol: abv,
    body,
    tastingSummary,
    tastingNotes: tastingSummary,
    mainSummary: tastingSummary,
    winemaking,
    winemakingPhilosophy: winemaking,
    viticulture,
  };
}

export const fetchWineProfileByName = autoFillWineByName;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendedBottles?: string[];
  timestamp: number;
}

/**
 * Context-aware AI Sommelier cellar assistant that provides pairing & recommendation advice
 * grounded in the user's specific collection of bottles.
 */
export async function askSommelierAssistant(
  userQuery: string,
  bottles: WineBottle[],
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<{ text: string; recommendedBottles?: string[] }> {
  if (!userQuery.trim()) {
    throw new Error("Please enter your question for the Sommelier.");
  }

  const ai = getAIClient();

  // Create an inventory summary of the user's private reserve
  const inventorySummary = bottles.map((b, idx) => {
    return `${idx + 1}. "${b.name}" | Producer: ${b.producer} | Vintage: ${b.year || 'NV'} | Classification: ${b.type} | Region: ${b.region}, ${b.country} | Grapes: ${(b.grape || []).join(', ')} | Price: ฿${(b.price || 0).toLocaleString()} | Notes: ${b.tastingNotes ? b.tastingNotes.slice(0, 160) : 'None'}`;
  }).join('\n');

  const systemInstruction = `You are a distinguished, knowledgeable Master Sommelier and Private Cellar Curator.
The user has a private wine cellar with the following bottles currently in stock:

--- CURRENT USER CELLAR INVENTORY (${bottles.length} bottles) ---
${inventorySummary}
---------------------------------------------------------------

Your role:
1. Provide elegant, authentic, highly perceptive sommelier advice for wine pairings, drinking order, peak maturity, vintage context, or style comparisons.
2. Whenever the user asks for what to drink, food pairing, or specific recommendations, ALWAYS check their cellar inventory first and prioritize recommending SPECIFIC bottles that exist in their collection.
3. Clearly mention the bottle name, producer, vintage, and why it matches the request (tannin structure, acidity, terroir, aromatic profile).
4. If appropriate, recommend 1 to 3 specific bottles from their cellar by their exact names.
5. Keep your tone warm, sophisticated, welcoming, and knowledgeable (concise yet insightful).

At the very end of your response, if you recommended any specific bottles from the user's cellar, append a JSON block on a new line with the exact bottle names:
<!--RECOMMENDED_BOTTLES: ["Exact Bottle Name 1", "Exact Bottle Name 2"]-->`;

  const conversationContents: any[] = [];
  
  // Add previous conversational context (up to last 6 messages)
  const recentHistory = history.slice(-6);
  for (const msg of recentHistory) {
    conversationContents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    });
  }

  // Add the current user query
  conversationContents.push({
    role: 'user',
    parts: [{ text: userQuery }]
  });

  const response = await generateWithRetryAndFallback(ai, {
    model: "gemini-3.8-flash",
    contents: conversationContents,
    config: {
      systemInstruction,
    }
  });

  let rawText = response.text || "I am currently unable to review the cellar inventory. Please try asking again.";
  let recommendedBottles: string[] | undefined = undefined;

  // Extract recommended bottle names if present
  const match = rawText.match(/<!--RECOMMENDED_BOTTLES:\s*(\[.*?\])-->/s);
  if (match) {
    try {
      recommendedBottles = JSON.parse(match[1]);
    } catch {}
    rawText = rawText.replace(/<!--RECOMMENDED_BOTTLES:\s*\[.*?\]-->/s, '').trim();
  }

  return {
    text: rawText,
    recommendedBottles
  };
}

