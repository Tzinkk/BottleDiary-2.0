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

export async function getWineRecommendations(bottles: WineBottle[]): Promise<Recommendation[]> {
  if (bottles.length === 0) return [];
  console.log("[AI Service] Requesting wine recommendations for", bottles.length, "bottles.");
  try {
    const response = await fetch("/api/ai/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bottles }),
    });
    if (!response.ok) {
      console.warn("[AI Service] Recommendation API returned non-200 status:", response.status);
      return [];
    }
    return response.json();
  } catch (error) {
    console.error("[AI Service] Failed to fetch recommendations:", error);
    return [];
  }
}

export async function analyzeWineLabel(imageUri: string): Promise<Partial<WineBottle> & { mainTastingNotes?: string }> {
  console.log("[AI Service] Starting label scan...");
  if (!imageUri || typeof imageUri !== "string") {
    console.error("[AI Service] Error: Invalid image URI provided to analyzeWineLabel.");
    throw new Error("Invalid image URI provided");
  }

  // Diagnostic logs to check if it's base64 and print the length
  if (imageUri.startsWith("data:")) {
    console.log(`[AI Service] Image is a base64 Data URI. Size: ~${Math.round(imageUri.length / 1024)} KB`);
  } else {
    console.log(`[AI Service] Image is an external remote URL: "${imageUri.substring(0, 100)}..."`);
  }

  try {
    const response = await fetch("/api/scan-wine", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageUri }),
    });

    console.log(`[AI Service] Received response from /api/scan-wine. Status code: ${response.status} (${response.statusText})`);

    if (!response.ok) {
      let errorMsg = `Server error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch (parseErr) {
        console.warn("[AI Service] Failed to parse backend error JSON, falling back to raw response text.");
        try {
          const rawText = await response.text();
          if (rawText) {
            errorMsg = rawText.substring(0, 200);
          }
        } catch (textErr) {
          console.error("[AI Service] Failed to read raw response text:", textErr);
        }
      }
      console.error(`[AI Service] Label analysis failed on server: "${errorMsg}"`);
      throw new Error(errorMsg);
    }

    const data = await response.json();
    console.log("[AI Service] Label analysis succeeded! Extracted metadata:", data);
    return data;
  } catch (error: any) {
    console.error("[AI Service] Request to /api/scan-wine failed with exception:", error);
    throw error;
  }
}

export async function generateQuizQuestion(): Promise<QuizQuestion> {
  console.log("[AI Service] Requesting random quiz question from AI Wine Tutor...");
  try {
    const response = await fetch("/api/ai/tutor/question", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let errorMsg = `Server error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch (e) {}
      console.error("[AI Service] Failed to generate wine tutor question:", errorMsg);
      throw new Error(errorMsg);
    }

    const data = await response.json();
    console.log("[AI Service] Successfully retrieved quiz question:", data.question);
    return data;
  } catch (error: any) {
    console.error("[AI Service] Exception during wine tutor question retrieval:", error);
    throw error;
  }
}
