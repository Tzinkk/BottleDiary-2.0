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

/**
 * Analyzes the wine label image using the server-side proxy.
 * @param imageUri base64 Data URI or blob/remote URL
 */
export async function analyzeWineLabel(imageUri: string): Promise<Partial<WineBottle> & { mainTastingNotes?: string }> {
  console.log("[AI Service] Requesting server-side label scan...");
  if (!imageUri || typeof imageUri !== "string") {
    console.error("[AI Service] Error: Invalid image URI provided to analyzeWineLabel.");
    throw new Error("Invalid image URI provided");
  }

  const response = await fetch("/api/gemini/analyze-label", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageUri }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to analyze label (HTTP ${response.status}): ${response.statusText || 'Unknown Error'}`);
  }

  const parsedData = await response.json();

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
    foodPairing: parsedData.foodPairing || [],
    additionalNote: parsedData.additionalNote || "",
    mainTastingNotes: parsedData.tastingNotes || "",
  };
}

/**
 * Generates a random multiple choice question using the server-side proxy.
 */
export async function generateQuizQuestion(): Promise<QuizQuestion> {
  console.log("[AI Service] Requesting server-side quiz question...");
  const response = await fetch("/api/gemini/generate-quiz", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate quiz (HTTP ${response.status}): ${response.statusText || 'Unknown Error'}`);
  }

  return response.json();
}

/**
 * Recommends wines based on the existing user's wine diary.
 */
export async function getWineRecommendations(bottles: WineBottle[]): Promise<Recommendation[]> {
  if (bottles.length === 0) return [];
  console.log("[AI Service] Requesting server-side wine recommendations for", bottles.length, "bottles.");
  try {
    const response = await fetch("/api/gemini/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bottles }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch recommendations (HTTP ${response.status}): ${response.statusText || 'Unknown Error'}`);
    }

    return response.json();
  } catch (error) {
    console.error("[AI Service] Failed to fetch recommendations:", error);
    return [];
  }
}

/**
 * Rewrites raw bullet-point or rough tasting notes into a professional, elegant paragraph using the server-side proxy.
 */
export async function refineTastingNotes(rawNotes: string): Promise<string> {
  if (!rawNotes || !rawNotes.trim()) {
    throw new Error("No notes provided to refine");
  }
  console.log("[AI Service] Requesting server-side tasting notes refinement...");
  const response = await fetch("/api/gemini/refine-notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rawNotes }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to refine tasting notes (HTTP ${response.status}): ${response.statusText || 'Unknown Error'}`);
  }

  const data = await response.json();
  return data.refinedText;
}

/**
 * Generates tasting notes and analytical profile for a bottle that has no detailed notes.
 */
export async function generateTastingNotesForBottle(bottle: WineBottle): Promise<Partial<WineBottle>> {
  console.log(`[AI Service] Requesting server-side tasting notes generation for ${bottle.name}...`);
  const response = await fetch("/api/gemini/generate-notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bottle }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate notes (HTTP ${response.status}): ${response.statusText || 'Unknown Error'}`);
  }

  return response.json();
}
