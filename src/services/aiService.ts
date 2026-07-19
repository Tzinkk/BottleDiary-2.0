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
  try {
    const response = await fetch("/api/ai/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bottles }),
    });
    if (!response.ok) return [];
    return response.json();
  } catch (error) {
    console.error("Failed to fetch recommendations:", error);
    return [];
  }
}

export async function analyzeWineLabel(imageUri: string): Promise<Partial<WineBottle> & { mainTastingNotes?: string }> {
  if (!imageUri || typeof imageUri !== 'string') {
    throw new Error("Invalid image URI provided");
  }

  const response = await fetch("/api/scan-wine", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageUri }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to analyze wine label. Please try again.");
  }

  return response.json();
}

export async function generateQuizQuestion(): Promise<QuizQuestion> {
  const response = await fetch("/api/ai/tutor/question", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to generate wine tutor question.");
  }

  return response.json();
}
