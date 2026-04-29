import { WineBottle } from "../types";

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
    const response = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bottles: collectionSummary })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to get recommendations');
    }

    return await response.json();
  } catch (error) {
    console.error("AI recommendation error:", error);
    return [];
  }
}

export async function analyzeWineLabel(imageUri: string): Promise<Partial<WineBottle>> {
  try {
    const response = await fetch('/api/analyze-label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: imageUri })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to analyze wine label');
    }

    return await response.json();
  } catch (error) {
    console.error("AI label analysis error:", error);
    return {};
  }
}
