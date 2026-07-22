export type WineType = 'Red' | 'White' | 'Rosé' | 'Sparkling' | 'Natural Red' | 'Natural White' | 'Pet Nat' | 'Orange' | 'Sato' | 'Sake';

export interface WineBottle {
  id: string;
  name: string;
  producer: string;
  year: string; // "YYYY" or "NV"
  type: WineType;
  region: string;
  country: string;
  grape: string[];
  tastingNotes: string;
  appearance?: string;
  nose?: string;
  palate?: string;
  finish?: string;
  winemakingPhilosophy?: string;
  viticulture?: string;
  additionalNote?: string;
  locationPurchased?: string;
  price?: number;
  imageUrl?: string;
  foodPairing?: string[];
  dateAdded: number;
  userId: string;
}

export interface GrapeVariety {
  id: string;
  name: string;
  type: 'Red' | 'White';
  skin: string;
  locations: string[];
  body: string;
  acidity: string;
  tannin: string;
  sweetness: string;
  aromaFlavor: string;
  otherNotes: string;
  foodPairing: string[];
  additionalNotes: string;
  userId: string;
  dateAdded: number;
}

export type SortOption = 'newest' | 'year' | 'name';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

