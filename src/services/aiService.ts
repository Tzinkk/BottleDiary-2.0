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

/**
 * Generates content using Gemini API with automatic retry and model fallbacks for 503 / 429 / high demand errors.
 */
async function generateWithRetryAndFallback(
  ai: GoogleGenAI,
  options: {
    model?: string;
    contents: any;
    config?: any;
  }
) {
  const model = options.model || "gemini-3.8-flash";
  let lastError: any = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[AI Service] Calling Gemini API (${model}, attempt ${attempt})...`);
      const result = await ai.models.generateContent({
        ...options,
        model,
      });
      return result;
    } catch (err: any) {
      lastError = err;
      const errStr = String(err?.message || JSON.stringify(err) || err);
      const isTransient =
        errStr.includes("503") ||
        errStr.includes("HIGH DEMAND") ||
        errStr.includes("429") ||
        errStr.includes("UNAVAILABLE") ||
        errStr.includes("RESOURCE_EXHAUSTED") ||
        errStr.includes("QUOTA") ||
        errStr.includes("quota") ||
        errStr.includes("RATE_LIMIT") ||
        errStr.includes("TEMPORARY");

      console.warn(`[AI Service] Model ${model} attempt ${attempt} failed:`, errStr);

      if (isTransient && attempt < 2) {
        // Exponential backoff of 2 seconds
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      } else {
        break;
      }
    }
  }

  const lastMsg = String(lastError?.message || JSON.stringify(lastError) || lastError);
  if (
    lastMsg.includes("429") ||
    lastMsg.includes("RESOURCE_EXHAUSTED") ||
    lastMsg.includes("Quota") ||
    lastMsg.includes("quota") ||
    lastMsg.includes("RATE_LIMIT")
  ) {
    throw new Error(lastError?.message || "AI quota reached. Please wait a moment and try again.");
  }

  if (lastMsg.includes("503") || lastMsg.includes("HIGH DEMAND") || lastMsg.includes("UNAVAILABLE")) {
    throw new Error(lastError?.message || "AI service is temporarily busy (503). Please wait a moment and try again.");
  }

  if (lastMsg.includes("Failed to fetch") || lastMsg.includes("NetworkError") || lastMsg.includes("network")) {
    throw new Error(lastError?.message || "Network connection error. Please check your internet connection.");
  }

  throw lastError instanceof Error ? lastError : new Error(lastMsg || "AI request failed");
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
 * Analyzes the wine label image directly using Gemini 3.8 Flash with strict Sommelier OCR.
 * Transcribes what is physically printed without inventing unprinted grapes or tasting notes.
 * @param imageUri base64 Data URI or blob/remote URL
 */
export async function analyzeWineLabel(imageUri: string): Promise<Partial<WineBottle> & { mainTastingNotes?: string; alcohol?: string }> {
  console.log("[AI Service] Scanning label with precision Sommelier OCR (gemini-3.8-flash)...");
  if (!imageUri || typeof imageUri !== "string") {
    console.error("[AI Service] Error: Invalid image URI provided to analyzeWineLabel.");
    throw new Error("Invalid image URI provided");
  }

  const { base64, mimeType } = await imageUriToData(imageUri);
  const ai = getAIClient();

  const systemInstruction = `You are a precision OCR extraction engine and Master Sommelier for wine labels.
Carefully examine the physical wine bottle label and extract ONLY what is physically printed or directly verifiable on the label:

1. VERBATIM EXTRACTION:
- name: Exact wine or cuvée name as printed on the label.
- producer: Estate, château, winery, or vigneron name.
- vintage: Harvest vintage year printed (e.g. "2021", "2019"). If non-vintage or unstated on label, return "" (empty string).
- wineType: Classification strictly based on label indications: 'Red' | 'White' | 'Rosé' | 'Sparkling' | 'Natural Red' | 'Natural White' | 'Pet Nat' | 'Orange' | 'Sato' | 'Sake'.
- country: Country of origin if printed or stated (e.g. France, Germany, Italy, Spain, USA, Australia, South Africa, Thailand).
- region: Specific appellation or region if printed on the label. If not printed, return "".
- grapes: Array of grape varieties ONLY if explicitly listed on the label. If unlisted, return [].
- alcohol: Alcohol by volume percentage if printed (e.g. "12.5% vol").

2. STRICT FIDELITY:
- Do NOT fabricate fictitious grapes or regions if they are not printed on the label.
- Do NOT guess or invent tasting notes if the label does not contain them. If the back label contains foreign descriptive text (e.g. German, French, Italian), translate and synthesize into clean English sommelier tasting notes across fields (appearance, nose, palate, finish, winemakingPhilosophy, viticulture, foodPairing, tastingNotes). If no sensory text is printed, return empty strings.`;

  const response = await generateWithRetryAndFallback(ai, {
    model: "gemini-3.8-flash",
    contents: [
      "Transcribe all physically printed details from this wine label verbatim in structured JSON format.",
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
          name: { type: Type.STRING },
          producer: { type: Type.STRING },
          vintage: { type: Type.STRING },
          wineType: { 
            type: Type.STRING, 
            enum: ['Red', 'White', 'Rosé', 'Sparkling', 'Natural Red', 'Natural White', 'Pet Nat', 'Orange', 'Sato', 'Sake'] 
          },
          country: { type: Type.STRING },
          region: { type: Type.STRING },
          grapes: { type: Type.ARRAY, items: { type: Type.STRING } },
          alcohol: { type: Type.STRING },
          appearance: { type: Type.STRING },
          nose: { type: Type.STRING },
          palate: { type: Type.STRING },
          finish: { type: Type.STRING },
          winemakingPhilosophy: { type: Type.STRING },
          viticulture: { type: Type.STRING },
          foodPairing: { type: Type.ARRAY, items: { type: Type.STRING } },
          tastingNotes: { type: Type.STRING },
          additionalNote: { type: Type.STRING },
        },
        required: ["name", "producer", "vintage", "wineType", "country", "region"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from AI Sommelier OCR");
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
  const wineName = sanitizeField(parsedData.name || parsedData.wineName);
  const producer = sanitizeField(parsedData.producer);
  const vintage = sanitizeField(parsedData.vintage || parsedData.year);
  const country = sanitizeField(parsedData.country);
  const region = sanitizeField(parsedData.region);
  const rawType = sanitizeField(parsedData.wineType || parsedData.type);

  // Grapes list sanitation
  const rawGrapes = parsedData.grapes || parsedData.grapeVarieties || parsedData.grape || [];
  const grapesList: string[] = (Array.isArray(rawGrapes) ? rawGrapes : (typeof rawGrapes === 'string' ? rawGrapes.split(',') : []))
    .map((g: any) => sanitizeField(g))
    .filter(Boolean);

  // Directly trust AI's direct classification output without keyword/tasting note heuristics
  const finalType = parseWineType(rawType);

  // Food pairings
  const rawPairings = parsedData.foodPairing || parsedData.foodPairings || [];
  const pairingsList: string[] = (Array.isArray(rawPairings) ? rawPairings : (typeof rawPairings === 'string' ? [rawPairings] : []))
    .map((p: any) => sanitizeField(p))
    .filter(Boolean);

  return {
    name: wineName,
    producer: producer,
    year: vintage,
    region: region,
    country: country,
    type: finalType,
    grape: grapesList,
    tastingNotes: sanitizeField(parsedData.tastingNotes || parsedData.notes),
    appearance: sanitizeField(parsedData.appearance),
    nose: sanitizeField(parsedData.nose || parsedData.aromatics),
    palate: sanitizeField(parsedData.palate),
    finish: sanitizeField(parsedData.finish),
    winemakingPhilosophy: sanitizeField(parsedData.winemakingPhilosophy),
    viticulture: sanitizeField(parsedData.viticulture),
    foodPairing: pairingsList,
    additionalNote: sanitizeField(parsedData.additionalNote),
    mainTastingNotes: sanitizeField(parsedData.tastingNotes || parsedData.notes),
    alcohol: sanitizeField(parsedData.alcohol),
  };
}

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
  producer: string;
  vintage: string;
  classification: string;
  country: string;
  region: string;
  grapes: string[];
  appearance: string;
  noseAromatics: string;
  palateStructure: string;
  finish: string;
  viticulture: string;
  winemaking: string;
  mainSummary: string;
  suggestedFoodPairings: string[];
}

/**
 * Auto-generates comprehensive sommelier profile for a wine by Name & Vintage using a 2-Step
 * Google Search Grounding & JSON synthesis pipeline.
 */
export async function fetchWineProfileByName(
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

  // Combine producer, cuvée name, and vintage cleanly for search grounding
  const queryParts: string[] = [];
  if (cleanProducer && !cleanName.toLowerCase().includes(cleanProducer.toLowerCase())) {
    queryParts.push(cleanProducer);
  }
  queryParts.push(cleanName);
  if (cleanVintage && cleanVintage !== "NV" && !cleanName.includes(cleanVintage)) {
    queryParts.push(cleanVintage);
  }
  const queryStr = queryParts.join(" ").trim();

  console.log(`[AI Service] Starting 2-step grounded wine profile extraction for: "${queryStr}"...`);
  const ai = getAIClient();

  // STEP 1: FACTUAL GOOGLE SEARCH (No JSON schema/MIME constraints)
  let factualResearch = "";
  try {
    const searchStepResponse = await generateWithRetryAndFallback(ai, {
      model: "gemini-3.8-flash",
      contents: `Search Google for the official winery technical sheet, importer profile, grape varieties/percentages, vinification, and tasting notes for: '${queryStr}'. Provide detailed factual bullet points.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `You are a meticulous wine researcher. Given a wine query, search Google thoroughly for its official technical sheet, producer notes, or importer profiles (e.g. Kermit Lynch, Becky Wasserman, Soma Vines, Different Drop, etc.).
Extract verified facts:
1. Producer / Estate and Cuvée name.
2. Real grape varietal composition and percentages (do NOT guess classic varieties if the producer uses an unusual blend).
3. Actual wine classification (strictly: 'Red', 'White', 'Rosé', 'Sparkling', 'Natural Red', 'Natural White', 'Pet Nat', 'Orange', 'Sato', 'Sake').
4. Country, Region / Appellation, and Producer.
5. Authentic sensory notes (appearance, nose, palate, finish), viticulture, winemaking, and food pairings directly from the tech sheet / sommelier notes.
Synthesize all factual findings in clear, concise bullet points.`,
      },
    });
    factualResearch = searchStepResponse.text || "";
    console.log(`[AI Service] Step 1 Google Search Grounding completed (${factualResearch.length} chars)`);
  } catch (searchErr: any) {
    console.warn("[AI Service] Step 1 search grounding notice, proceeding with direct sommelier synthesis:", searchErr?.message);
    factualResearch = `Wine: ${queryStr}`;
  }

  // STEP 2: STRUCTURED JSON SYNTHESIZER (No tools, responseMimeType: "application/json")
  const jsonSystemInstruction = `You are a master sommelier data serializer. Convert the factual wine technical dossier into the required JSON schema accurately.
CRITICAL RULES:
- Map accurately: producer, vintage (use "${cleanVintage}" if not specified in dossier), classification ('Red', 'White', 'Rosé', 'Sparkling', 'Natural Red', 'Natural White', 'Pet Nat', 'Orange', 'Sato', 'Sake'), country, region, and grapes.
- Do not invent, guess, or substitute fictional grape varieties that are not in the dossier.
- Return authentic English sommelier descriptions for appearance, noseAromatics, palateStructure, finish, viticulture, winemaking, mainSummary, and suggestedFoodPairings.
- Format output strictly as JSON.`;

  const jsonPrompt = `Convert the following wine technical research into structured JSON:

Wine Query: ${queryStr}

Research Dossier:
${factualResearch || `Wine: ${queryStr}`}

Required JSON Format:
{
  "producer": "Estate / Winemaker name",
  "vintage": "${cleanVintage}",
  "classification": "Red / White / Rosé / Sparkling / Natural Red / Natural White / Pet Nat / Orange / Sato / Sake",
  "country": "Country of origin",
  "region": "Specific Appellation or Region",
  "grapes": ["Verified Grape 1", "Verified Grape 2"],
  "appearance": "Visual description, color, hue, clarity",
  "noseAromatics": "Vivid aromatics, fruit, floral, terroir notes",
  "palateStructure": "Structure, acidity, texture, body, tannins",
  "finish": "Length, minerality, finish notes",
  "viticulture": "Farming practices, terroir, harvest details",
  "winemaking": "Maceration, fermentation, ancestral method, aging, sulfites",
  "mainSummary": "Comprehensive editorial sommelier tasting summary",
  "suggestedFoodPairings": ["Pairing 1", "Pairing 2", "Pairing 3"]
}`;

  let resText = "";
  try {
    const jsonStepResponse = await generateWithRetryAndFallback(ai, {
      model: "gemini-3.8-flash",
      contents: jsonPrompt,
      config: {
        systemInstruction: jsonSystemInstruction,
        responseMimeType: "application/json",
      },
    });
    resText = jsonStepResponse.text || "";
  } catch (synthErr: any) {
    throw synthErr;
  }

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

  const grapesList: string[] = Array.isArray(parsed.grapes)
    ? parsed.grapes
    : typeof parsed.grapes === "string"
    ? parsed.grapes.split(",")
    : [];

  const pairingsList: string[] = Array.isArray(parsed.suggestedFoodPairings)
    ? parsed.suggestedFoodPairings
    : Array.isArray(parsed.foodPairing)
    ? parsed.foodPairing
    : [];

  return {
    producer: sanitizeField(parsed.producer, cleanProducer),
    vintage: sanitizeField(parsed.vintage, cleanVintage),
    classification: sanitizeField(parsed.classification, "Red"),
    country: sanitizeField(parsed.country),
    region: sanitizeField(parsed.region),
    grapes: grapesList.map((g) => sanitizeField(g)).filter(Boolean),
    appearance: sanitizeField(parsed.appearance),
    noseAromatics: sanitizeField(parsed.noseAromatics || parsed.nose),
    palateStructure: sanitizeField(parsed.palateStructure || parsed.palate),
    finish: sanitizeField(parsed.finish),
    viticulture: sanitizeField(parsed.viticulture),
    winemaking: sanitizeField(parsed.winemaking || parsed.winemakingPhilosophy),
    mainSummary: sanitizeField(parsed.mainSummary || parsed.tastingNotes),
    suggestedFoodPairings: pairingsList.map((p) => sanitizeField(p)).filter(Boolean),
  };
}

export const autoFillWineByName = fetchWineProfileByName;

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

