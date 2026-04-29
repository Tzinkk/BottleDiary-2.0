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
  rating: number; // 1-5
  tastingNotes: string;
  additionalNote?: string;
  locationPurchased?: string;
  price?: number;
  imageUrl?: string;
  dateAdded: number;
}

export type SortOption = 'newest' | 'rating' | 'year' | 'name';
