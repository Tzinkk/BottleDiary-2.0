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

export const WINE_TYPES: WineType[] = ['Red', 'White', 'Rosé', 'Sparkling', 'Natural Red', 'Natural White', 'Pet Nat', 'Orange', 'Sato', 'Sake'];

export const WINE_TYPE_CONFIG: Record<string, { text: string, bg: string, border: string, accent: string, hex: string, activeBg: string, activeText: string }> = {
  'Red': { text: 'text-[#800020]', bg: 'bg-[#FDF2F4]', border: 'border border-[#F5C2CB]', accent: 'bg-[#800020]', hex: '#800020', activeBg: 'bg-[#722F37]', activeText: 'text-white' },
  'White': { text: 'text-[#854D0E]', bg: 'bg-[#FEFCE8]', border: 'border border-[#FEF08A]', accent: 'bg-[#CA8A04]', hex: '#CA8A04', activeBg: 'bg-[#854D0E]', activeText: 'text-white' },
  'Rosé': { text: 'text-[#9D174D]', bg: 'bg-[#FDF2F8]', border: 'border border-[#FBCFE8]', accent: 'bg-[#DB2777]', hex: '#DB2777', activeBg: 'bg-[#9D174D]', activeText: 'text-white' },
  'Sparkling': { text: 'text-[#0E7490]', bg: 'bg-[#ECFEFF]', border: 'border border-[#A5F3FC]', accent: 'bg-[#0891B2]', hex: '#0891B2', activeBg: 'bg-[#0E7490]', activeText: 'text-white' },
  'Natural Red': { text: 'text-[#991B1B]', bg: 'bg-[#FEF2F2]', border: 'border border-[#FECACA]', accent: 'bg-[#DC2626]', hex: '#DC2626', activeBg: 'bg-[#991B1B]', activeText: 'text-white' },
  'Natural White': { text: 'text-[#A16207]', bg: 'bg-[#FEFCE8]', border: 'border border-[#FDE68A]', accent: 'bg-[#D97706]', hex: '#D97706', activeBg: 'bg-[#A16207]', activeText: 'text-white' },
  'Pet Nat': { text: 'text-[#C2410C]', bg: 'bg-[#FFF7ED]', border: 'border border-[#FED7AA]', accent: 'bg-[#EA580C]', hex: '#EA580C', activeBg: 'bg-[#C2410C]', activeText: 'text-white' },
  'Orange': { text: 'text-[#B45309]', bg: 'bg-[#FFFBEB]', border: 'border border-[#FDE68A]', accent: 'bg-[#D97706]', hex: '#D97706', activeBg: 'bg-[#B45309]', activeText: 'text-white' },
  'Sato': { text: 'text-[#15803D]', bg: 'bg-[#F0FDF4]', border: 'border border-[#BBF7D0]', accent: 'bg-[#16A34A]', hex: '#16A34A', activeBg: 'bg-[#15803D]', activeText: 'text-white' },
  'Sake': { text: 'text-[#6D28D9]', bg: 'bg-[#F5F3FF]', border: 'border border-[#DDD6FE]', accent: 'bg-[#7C3AED]', hex: '#7C3AED', activeBg: 'bg-[#6D28D9]', activeText: 'text-white' },
};

