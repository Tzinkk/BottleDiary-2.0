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
  const modelsToTry = [
    options.model || "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-2.5-flash",
  ];
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError: any = null;

  for (const model of uniqueModels) {
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
  }

  const lastMsg = String(lastError?.message || JSON.stringify(lastError) || lastError);
  if (
    lastMsg.includes("429") ||
    lastMsg.includes("RESOURCE_EXHAUSTED") ||
    lastMsg.includes("Quota") ||
    lastMsg.includes("quota") ||
    lastMsg.includes("RATE_LIMIT")
  ) {
    throw new Error("AI quota reached for the moment. Please wait a minute and try again, or enter details manually.");
  }

  if (lastMsg.includes("503") || lastMsg.includes("HIGH DEMAND") || lastMsg.includes("UNAVAILABLE")) {
    throw new Error("AI service is temporarily busy (High Demand 503). Please wait a moment and try again.");
  }

  // Not a quota/busy problem (e.g. model name not found, bad key): show the real reason
  throw new Error(`AI request failed: ${lastMsg.slice(0, 200)}`);
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


function stripJsonFences(text: string): string {
  let t = text.trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (m) return m[1].trim();
  const i = t.indexOf("{"), j = t.lastIndexOf("}");
  const ai = t.indexOf("["), aj = t.lastIndexOf("]");
  if (i !== -1 && j > i && (ai === -1 || i < ai)) return t.slice(i, j + 1);
  if (ai !== -1 && aj > ai) return t.slice(ai, aj + 1);
  return t;
}

/** Maps AI classification text to one of the app's WineType values (trusts the AI, no keyword guessing). */
export function normalizeWineType(raw: any, fallback: WineType = 'Red'): WineType {
  const c = String(raw || '').toLowerCase();
  if (!c) return fallback;
  if (c.includes('pet') && c.includes('nat') || c.includes('pétillant')) return 'Pet Nat';
  if (c.includes('natural white')) return 'Natural White';
  if (c.includes('natural red')) return 'Natural Red';
  if (c.includes('sparkling') || c.includes('champagne')) return 'Sparkling';
  if (c.includes('orange') || c.includes('amber') || c.includes('skin contact')) return 'Orange';
  if (c.includes('rosé') || c.includes('rose')) return 'Rosé';
  if (c.includes('sake')) return 'Sake';
  if (c.includes('sato')) return 'Sato';
  if (c.includes('white')) return 'White';
  if (c.includes('red')) return 'Red';
  return fallback;
}


/**
 * Label scan, 2 steps:
 *  1) read ONLY what is printed on the label (name, producer, vintage, region, grapes if printed)
 *  2) look the wine up on Google (same pipeline as typing the name) to fill the rest accurately
 */
export async function analyzeWineLabel(imageUri: string): Promise<Partial<WineBottle> & { mainTastingNotes?: string; alcohol?: string }> {
  if (!imageUri || typeof imageUri !== "string") {
    throw new Error("Invalid image URI provided");
  }

  const { base64, mimeType } = await imageUriToData(imageUri);
  const ai = getAIClient();

  const systemInstruction = `You are a precise multilingual OCR engine for wine labels.
Read ONLY what is actually printed on the label(s). Do NOT guess, infer or invent anything.
- If a field is not visible on the label, return an empty string "" (or [] for grapes).
- name: the wine's own name / cuvée as printed (not the producer, not the grape unless that is the name).
- producer: the estate / winery / domaine exactly as printed.
- vintage: 4-digit year if printed, otherwise "NV" only if clearly non-vintage, otherwise "".
- region / country: only if printed (appellation text counts, e.g. "Chablis" -> region "Chablis").
- grapes: only if printed.
- wineType: one of Red, White, Rosé, Sparkling, Natural Red, Natural White, Pet Nat, Orange - only if clearly stated or obvious from the label/bottle colour, otherwise "".
- alcohol: ABV if printed, otherwise "".`;

  const response = await generateWithRetryAndFallback(ai, {
    model: "gemini-3.5-flash",
    contents: [
      "Read this wine label. Return only what is printed.",
      { inlineData: { data: base64, mimeType } },
    ],
    config: {
      systemInstruction,
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          producer: { type: Type.STRING },
          vintage: { type: Type.STRING },
          wineType: { type: Type.STRING },
          country: { type: Type.STRING },
          region: { type: Type.STRING },
          grapes: { type: Type.ARRAY, items: { type: Type.STRING } },
          alcohol: { type: Type.STRING },
        },
        required: ["name", "producer", "vintage"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI Sommelier");
  const parsedData = JSON.parse(stripJsonFences(text));

  const wineName = sanitizeField(parsedData.name);
  const producer = sanitizeField(parsedData.producer);
  const vintage = sanitizeField(parsedData.vintage);
  const labelGrapes: string[] = (Array.isArray(parsedData.grapes) ? parsedData.grapes : [])
    .map((g: any) => sanitizeField(g)).filter(Boolean);

  if (!wineName && !producer) {
    throw new Error("Could not read the wine name from this photo. Please try a clearer, closer photo of the front label.");
  }

  // Step 2: grounded lookup using what was read from the label
  let profile: AIWineNameProfile | null = null;
  try {
    profile = await fetchWineProfileByName(wineName || producer, vintage, producer);
  } catch (err) {
    console.warn("[AI Service] Label lookup step failed, using label text only:", err);
  }

  const type = normalizeWineType(profile?.classification || parsedData.wineType, 'Red');

  return {
    name: wineName,
    producer: profile?.producer || producer,
    year: vintage || profile?.vintage || 'NV',
    region: sanitizeField(parsedData.region) || profile?.region || '',
    country: sanitizeField(parsedData.country) || profile?.country || '',
    type,
    grape: labelGrapes.length > 0 ? labelGrapes : (profile?.grapes || []),
    tastingNotes: profile?.mainSummary || '',
    appearance: profile?.appearance || '',
    nose: profile?.noseAromatics || '',
    palate: profile?.palateStructure || '',
    finish: profile?.finish || '',
    winemakingPhilosophy: profile?.winemaking || '',
    viticulture: profile?.viticulture || '',
    foodPairing: profile?.suggestedFoodPairings || [],
    additionalNote: '',
    mainTastingNotes: profile?.mainSummary || '',
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
 * Recommends wines based on the existing user's wine diary directly using gemini-3.5-flash.
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
 * Looks a wine up by name (+ optional producer / vintage) with Google Search grounding,
 * then converts the verified facts to the app's JSON. Never invents facts when search fails.
 */
export async function fetchWineProfileByName(
  bottleName: string,
  vintage?: string,
  producerHint?: string
): Promise<AIWineNameProfile> {
  if (!bottleName || !bottleName.trim()) {
    throw new Error("Please enter a wine name first");
  }

  const cleanName = bottleName.trim();
  // a 4-digit year typed inside the name wins; otherwise use the vintage field
  const yearInName = cleanName.match(/\b(19|20)\d{2}\b/)?.[0] || "";
  const cleanVintage = (yearInName || vintage || "").trim();
  const cleanProducer = (producerHint || "").trim();
  const queryStr = [cleanProducer, cleanName, cleanVintage].filter(Boolean).join(" ");

  const ai = getAIClient();

  // STEP 1: Google Search grounded research
  let factualResearch = "";
  try {
    const searchStepResponse = await generateWithRetryAndFallback(ai, {
      model: "gemini-3.5-flash",
      contents: `Find the exact wine "${queryStr}". Search for the producer's / importer's official technical sheet and reviews. Report: exact producer, exact vintage${cleanVintage ? "" : " (if the query has no year, say the wine is a multi-vintage and do not pick a year)"}, country, region/appellation, grape varieties with percentages, wine style (red/white/rosé/sparkling/orange/natural/pet-nat), farming, winemaking, tasting notes and food pairings. If you cannot find this exact wine, say "NOT FOUND" and do not describe a different wine.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `You are a meticulous wine researcher. Only report facts you actually found in search results for the exact wine requested. Never guess grape varieties or details. If a detail is not found, write "not found" for it.`,
        temperature: 0,
      },
    });
    factualResearch = searchStepResponse.text || "";
  } catch (searchErr: any) {
    throw new Error("Could not search for this wine right now. Please try again in a moment.");
  }

  if (!factualResearch.trim() || /NOT FOUND/i.test(factualResearch.slice(0, 300))) {
    throw new Error(`Could not find "${cleanName}" online. Try adding the producer name (e.g. "Producer + Wine name").`);
  }

  // STEP 2: JSON conversion
  const jsonSystemInstruction = `You convert a verified wine research dossier into JSON.
RULES: Use ONLY facts present in the dossier. If a field is "not found" or missing, return "" (or [] for lists). Never invent grapes, regions or notes. Write descriptions in clear English. classification must be one of: RED, WHITE, ROSÉ, SPARKLING, NATURAL RED, NATURAL WHITE, PET NAT, ORANGE.`;

  const jsonPrompt = `Wine query: ${queryStr}

Research dossier:
${factualResearch}

Return JSON with keys: producer, vintage ("${cleanVintage || ""}" unless the dossier proves otherwise; "NV" if non-vintage), classification, country, region, grapes (array), appearance, noseAromatics, palateStructure, finish, viticulture, winemaking, mainSummary (2-3 sentence tasting summary), suggestedFoodPairings (array of 2-4).`;

  const jsonStepResponse = await generateWithRetryAndFallback(ai, {
    model: "gemini-3.5-flash",
    contents: jsonPrompt,
    config: {
      systemInstruction: jsonSystemInstruction,
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          producer: { type: Type.STRING },
          vintage: { type: Type.STRING },
          classification: { type: Type.STRING },
          country: { type: Type.STRING },
          region: { type: Type.STRING },
          grapes: { type: Type.ARRAY, items: { type: Type.STRING } },
          appearance: { type: Type.STRING },
          noseAromatics: { type: Type.STRING },
          palateStructure: { type: Type.STRING },
          finish: { type: Type.STRING },
          viticulture: { type: Type.STRING },
          winemaking: { type: Type.STRING },
          mainSummary: { type: Type.STRING },
          suggestedFoodPairings: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["producer", "vintage", "classification", "country", "region", "grapes"],
      },
    },
  });

  const resText = jsonStepResponse.text || "";
  let parsed: any;
  try {
    parsed = JSON.parse(stripJsonFences(resText));
  } catch {
    throw new Error("AI returned an unreadable answer. Please try again.");
  }

  const grapesList: string[] = Array.isArray(parsed.grapes) ? parsed.grapes : [];
  const pairingsList: string[] = Array.isArray(parsed.suggestedFoodPairings) ? parsed.suggestedFoodPairings : [];

  return {
    producer: sanitizeField(parsed.producer),
    vintage: sanitizeField(parsed.vintage, cleanVintage),
    classification: sanitizeField(parsed.classification),
    country: sanitizeField(parsed.country),
    region: sanitizeField(parsed.region),
    grapes: grapesList.map((g) => sanitizeField(g)).filter(Boolean),
    appearance: sanitizeField(parsed.appearance),
    noseAromatics: sanitizeField(parsed.noseAromatics),
    palateStructure: sanitizeField(parsed.palateStructure),
    finish: sanitizeField(parsed.finish),
    viticulture: sanitizeField(parsed.viticulture),
    winemaking: sanitizeField(parsed.winemaking),
    mainSummary: sanitizeField(parsed.mainSummary),
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
      temperature: 0.7,
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

