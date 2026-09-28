import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Wine, Trash2, Edit2, Star, X, Info, Globe, Banknote, ChevronDown, ChevronUp, ChevronRight, ArrowRight, Upload, Camera, Loader2, Sparkles, Sparkle, BarChart3, LogIn, LogOut, User as UserIcon, Droplets, FlaskConical, Leaf, Utensils, Check, Home as HomeIcon, Compass, Bookmark, Grid2X2, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  LineChart, 
  Line, 
  CartesianGrid, 
  Legend, 
  ScatterChart, 
  Scatter, 
  ZAxis
} from 'recharts';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, doc, setDoc, deleteDoc, updateDoc, limit, getDocs } from 'firebase/firestore';
import { auth, db, signInWithGoogle, logout, handleFirestoreError, OperationType } from './firebase';
import { WineBottle, WineType, SortOption, GrapeVariety, QuizQuestion, WINE_TYPES, WINE_TYPE_CONFIG } from './types';
import { analyzeWineLabel, generateQuizQuestion, refineTastingNotes, generateTastingNotesForBottle } from './services/aiService';
import { WorldMap } from './components/WorldMap';
import { TopHeader } from './components/TopHeader';
import { DashboardGrid } from './components/DashboardGrid';
import { RecentlyAddedCarousel } from './components/RecentlyAddedCarousel';
import { BottomNavBar, MainNavTab } from './components/BottomNavBar';
import { NavigationDrawer } from './components/NavigationDrawer';
import { ProfileView } from './components/ProfileView';
import { ExploreView } from './components/ExploreView';
import { WineGridCard } from './components/WineGridCard';
import { WineDetailModal } from './components/WineDetailModal';

// --- Configuration ---

const FALLBACK_QUESTIONS: QuizQuestion[] = [
  {
    question: "Which Italian wine region is famous for producing Sangiovese-based wines such as Chianti Classico and Brunello di Montalcino?",
    options: [
      "Tuscany",
      "Piedmont",
      "Veneto",
      "Sicily"
    ],
    correctAnswer: "Tuscany",
    explanation: "Sangiovese is Tuscany's signature red grape variety. It forms the backbone of famous wines like Chianti, Brunello di Montalcino, and Vino Nobile di Montepulciano, prized for its high acidity, firm tannins, and savory cherry notes."
  },
  {
    question: "Nebbiolo, the grape behind Barolo and Barbaresco, is renowned for which specific structural characteristics?",
    options: [
      "Low acidity and low tannins",
      "High acidity and extremely high, gripping tannins",
      "Low acidity and high tannins",
      "High acidity and extremely low tannins"
    ],
    correctAnswer: "High acidity and extremely high, gripping tannins",
    explanation: "Despite its deceptively pale ruby-orange color, Nebbiolo has massive, gripping tannins and high acidity. This powerful structure gives wines like Barolo incredible longevity and aging potential."
  },
  {
    question: "Syrah (or Shiraz) wines from cool-climate regions are most classically distinguished by which of the following flavor notes?",
    options: [
      "Tropical pineapple and sweet vanilla",
      "Crushed black pepper, savory olive, and dark plum",
      "Fresh strawberry, bubblegum, and low tannin",
      "Grapefruit pith and freshly cut grass"
    ],
    correctAnswer: "Crushed black pepper, savory olive, and dark plum",
    explanation: "Cool-climate Syrah (such as Northern Rhône Hermitage or Côte-Rôtie) is highly prized for its peppery, savory, and gamey aromas, often combined with dark berry fruits, making it distinct from warm-climate versions."
  }
];

const DEMO_BOTTLES: WineBottle[] = [
  {
    id: 'demo-1',
    name: 'Barolo Bricco Rocche',
    producer: 'Ceretto',
    year: '2016',
    type: 'Red',
    region: 'Piedmont',
    country: 'Italy',
    grape: ['Nebbiolo'],
    price: 6500,
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop&q=80',
    tastingNotes: 'A majestic expression of Castiglione Falletto with ethereal dried rose petal, tar, crushed cranberry, and white truffle aromas. Gripping, velvety tannins with extraordinary persistence.',
    appearance: 'Luminous garnet with delicate orange rim reflexes',
    nose: 'Intense bouquet of violet, wild strawberry, tobacco leaf, and forest floor',
    palate: 'Silky yet powerful structural backbone, vibrant acidity, and notes of blood orange and spice',
    finish: 'Tremendously long, mineral-driven finish with lingering savory nuances',
    winemakingPhilosophy: 'Organic and biodynamic farming, aged in French oak tonneaux followed by traditional large casks',
    viticulture: 'Single-vineyard amphitheater at 370m altitude with calcareous marl soil',
    foodPairing: ['Truffle Tagliolini', 'Slow-braised Osso Buco', 'Aged Parmigiano-Reggiano'],
    dateAdded: Date.now() - 86400000 * 14,
    userId: 'demo'
  },
  {
    id: 'demo-2',
    name: 'Château Margaux Premier Grand Cru Classé',
    producer: 'Château Margaux',
    year: '2015',
    type: 'Red',
    region: 'Bordeaux',
    country: 'France',
    grape: ['Cabernet Sauvignon', 'Merlot', 'Petit Verdot', 'Cabernet Franc'],
    price: 32000,
    imageUrl: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&auto=format&fit=crop&q=80',
    tastingNotes: 'Aristocratic elegance with sublime balance. Explosive violets, pure cassis, cedar box, and graphite leading into a seamless, satin-textured palate.',
    appearance: 'Deep, brooding opaque ruby with violet highlights',
    nose: 'Fresh blackcurrant, lilac blossoms, cedarwood, and graphite mineral core',
    palate: 'Multi-dimensional depth, ultra-fine cashmere tannins, fresh acidity, and pure dark fruit',
    finish: 'Endless harmonic persistence with delicate savory and floral echoes',
    winemakingPhilosophy: 'Traditional vinification in oak vats followed by 24 months in 100% new French oak',
    viticulture: 'Deep gravel soils overlying clay and limestone in the Margaux commune',
    foodPairing: ['Roasted Squab with Cherry Jus', 'Wagyu Ribeye Steak', 'Duck Breast with Plum Reduction'],
    dateAdded: Date.now() - 86400000 * 25,
    userId: 'demo'
  },
  {
    id: 'demo-3',
    name: 'Montée de Tonnerre Chablis Premier Cru',
    producer: 'Domaine François Raveneau',
    year: '2020',
    type: 'White',
    region: 'Burgundy',
    country: 'France',
    grape: ['Chardonnay'],
    price: 11500,
    imageUrl: 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?w=800&auto=format&fit=crop&q=80',
    tastingNotes: 'Pristine saline precision with gunflint, lemon oil, crisp green pear, and wet limestone. Tension and crystalline purity in every drop.',
    appearance: 'Pale straw gold with brilliant crystalline green shimmers',
    nose: 'Crushed oyster shell, citrus blossom, lemon zest, and white peach',
    palate: 'Chiseled minerality, laser-focused acidity, with a dense, mouthwatering saline core',
    finish: 'Vibrant, electrifying finish that cleanses the palate with stony persistence',
    winemakingPhilosophy: 'Spontaneous fermentation, aged in neutral used feuillettes to respect terroir',
    viticulture: 'Kimmeridgian limestone rich in fossilized Exogyra virgula shells',
    foodPairing: ['Fresh Belon Oysters', 'Pan-seared Dover Sole Meunière', 'Raw Scallop Carpaccio'],
    dateAdded: Date.now() - 86400000 * 5,
    userId: 'demo'
  },
  {
    id: 'demo-4',
    name: 'Dom Pérignon Vintage',
    producer: 'Moët & Chandon',
    year: '2013',
    type: 'Sparkling',
    region: 'Champagne',
    country: 'France',
    grape: ['Chardonnay', 'Pinot Noir'],
    price: 9200,
    imageUrl: 'https://images.unsplash.com/photo-1594488518001-094191d830b4?w=800&auto=format&fit=crop&q=80',
    tastingNotes: 'Luminous effervescence with toasted brioche, candied citrus, smoky flint, and white flowers. Creamy yet vibrant on the palate with aristocratic poise.',
    appearance: 'Luminous pale gold with a fine, continuous bead of effervescent bubbles',
    nose: 'Eucalyptus, mint, mirabelle plum, toasted hazelnut, and cardamom spice',
    palate: 'Energetic and tactile, balancing ripe stone fruit with saline minerality and silky mousse',
    finish: 'Long, vibrating finish with smoky elegance and lingering saline tension',
    winemakingPhilosophy: 'Only produced in exceptional vintage years, aged on lees for almost a decade',
    viticulture: 'Premier and Grand Cru vineyard selections across the Montagne de Reims and Côte des Blancs',
    foodPairing: ['Caviar with Blinis', 'Butter-poached Maine Lobster', 'Langoustine Tartare'],
    dateAdded: Date.now() - 86400000 * 30,
    userId: 'demo'
  }
];

const DEMO_GRAPES: GrapeVariety[] = [
  {
    id: 'demo-grape-1',
    name: 'Nebbiolo',
    type: 'Red',
    skin: 'Thin, translucent garnet-red skin with high natural bloom and high anthocyanin sensitivity',
    locations: ['Piedmont / Italy', 'Lombardy (Valtellina) / Italy'],
    body: 'Medium-Full',
    acidity: 'High',
    tannin: 'Very High',
    sweetness: 'Dry',
    aromaFlavor: 'Tar, dried roses, sour cherry, leather, clay, anise, and white truffle',
    otherNotes: 'One of the most noble grape varieties on Earth. Requires long aging to soften its fierce tannin structure.',
    foodPairing: ['White Truffle Risotto', 'Braised Beef in Barolo', 'Aged Castelmagno Cheese'],
    additionalNotes: 'Derives its name from "nebbia", the Italian word for fog that blankets the Langhe hills during late autumn harvest.',
    userId: 'demo',
    dateAdded: Date.now() - 86400000 * 20
  },
  {
    id: 'demo-grape-2',
    name: 'Chardonnay',
    type: 'White',
    skin: 'Golden-green delicate skin with high terroir reflectivity and phenolic malleability',
    locations: ['Burgundy / France', 'Champagne / France', 'Napa Valley / United States', 'Margaret River / Australia'],
    body: 'Medium to Full',
    acidity: 'Medium to High',
    tannin: 'None',
    sweetness: 'Dry',
    aromaFlavor: 'Green apple, lemon curd, flint, chalk, butter, toasted hazelnut, and brioche',
    otherNotes: 'A stylistic chameleon capable of crystalline mineral expression in Chablis or opulent richness in Meursault.',
    foodPairing: ['Roasted Turbot', 'Roast Chicken with Morel Cream', 'Lobster Thermidor'],
    additionalNotes: 'Naturally neutral grape variety that serves as the ultimate transparent canvas for soil and winemaking choices.',
    userId: 'demo',
    dateAdded: Date.now() - 86400000 * 18
  },
  {
    id: 'demo-grape-3',
    name: 'Cabernet Sauvignon',
    type: 'Red',
    skin: 'Thick, dark-blue skin with high tannin and pigment density, exceptionally resilient',
    locations: ['Bordeaux (Left Bank) / France', 'Napa Valley / United States', 'Coonawarra / Australia', 'Tuscany / Italy'],
    body: 'Full',
    acidity: 'Medium-High',
    tannin: 'High',
    sweetness: 'Dry',
    aromaFlavor: 'Blackcurrant (cassis), cedar, graphite, black pepper, tobacco, and dark chocolate',
    otherNotes: 'The world’s most widely planted and revered fine wine grape, naturally resistant to rot and cold.',
    foodPairing: ['Dry-aged Prime Ribeye', 'Roasted Lamb with Rosemary', 'Venison with Blackberry Sauce'],
    additionalNotes: 'A natural genetic crossing between Cabernet Franc and Sauvignon Blanc discovered in 17th-century France.',
    userId: 'demo',
    dateAdded: Date.now() - 86400000 * 22
  }
];

// --- Animation Variants ---

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.15
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.15,
      ease: [0.16, 1, 0.3, 1]
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.98, 
    transition: { duration: 0.1 } 
  }
};

// --- Components ---

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: string;
  isDanger?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm, onClose, confirmText = "Confirm", isDanger = true }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white p-7 max-w-sm w-full space-y-6 relative z-50 rounded-2xl border border-[#EBE7DF] shadow-[0_20px_60px_rgba(28,25,23,0.15)] text-stone-900"
      >
        <div className="space-y-4">
          <div className="w-12 h-12 bg-[#FDF2F4] border border-[#F5C2CB] rounded-xl flex items-center justify-center text-[#722F37] mx-auto shadow-xs">
            <Trash2 size={22} strokeWidth={2} />
          </div>
          <div className="text-center space-y-1.5">
            <h3 className="text-lg font-serif font-bold text-stone-900 tracking-normal">{title}</h3>
            <p className="text-xs text-stone-600 font-normal leading-relaxed">{message}</p>
          </div>
        </div>
        
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-[#E5E0D8] bg-[#F7F5F0] hover:bg-[#EBE7DF] text-stone-700 text-xs tracking-wider font-semibold rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-2.5 rounded-xl border ${isDanger ? 'border-[#722F37] bg-[#722F37] hover:bg-[#5C242C] shadow-sm' : 'border-[#CA8A04] bg-[#CA8A04] hover:bg-[#A16207] shadow-sm'} text-white text-xs tracking-wider font-semibold transition-all cursor-pointer`}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface GrapeCardProps {
  grape: GrapeVariety;
  onEdit: (grape: GrapeVariety) => void;
  onDelete: (id: string) => void;
  isComparing: boolean;
  onToggleCompare: (id: string) => void;
}

const GrapeCard: React.FC<GrapeCardProps> = ({ grape, onEdit, onDelete, isComparing, onToggleCompare }) => {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ scale: 1.01, transition: { duration: 0.15, ease: "easeOut" } }}
      whileTap={{ scale: 0.99 }}
      style={{ willChange: "transform, opacity" }}
      className={`bg-white border border-[#EBE7DF] hover:border-[#D6CFBF] p-6 flex flex-col h-full group relative transition-all duration-200 ease-out rounded-2xl shadow-[0_2px_12px_rgba(28,25,23,0.04)] hover:shadow-[0_6px_24px_rgba(28,25,23,0.08)] ${grape.type === 'Red' ? 'border-l-4 border-l-[#800020]' : 'border-l-4 border-l-[#CA8A04]'}`}
    >
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => onToggleCompare(grape.id)}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
              isComparing 
                ? 'bg-[#722F37] text-white border-[#722F37] shadow-sm' 
                : 'border-[#E5E0D8] bg-[#F7F5F0] hover:bg-[#EBE7DF] text-stone-600 hover:text-stone-900'
            }`}
            title={isComparing ? 'Remove from comparison' : 'Add to comparison'}
          >
            <Plus size={14} strokeWidth={2.5} className={isComparing ? 'transform rotate-45' : ''} />
          </button>
          <span className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full border ${grape.type === 'Red' ? 'bg-[#FDF2F4] text-[#800020] border-[#F5C2CB]' : 'bg-[#FEFCE8] text-[#854D0E] border-[#FEF08A]'}`}>
            {grape.type}
          </span>
        </div>
        <div className="flex space-x-1.5">
          <button 
            onClick={() => onEdit(grape)} 
            className="p-2 rounded-lg border border-[#E5E0D8] bg-[#F7F5F0] hover:bg-[#EBE7DF] text-stone-700 hover:text-stone-900 transition-all cursor-pointer"
            title="Edit Variety"
          >
            <Edit2 size={13} />
          </button>
          <button 
            onClick={() => onDelete(grape.id)} 
            className="p-2 rounded-lg border border-[#F5C2CB] bg-[#FDF2F4] hover:bg-[#FEE2E2] text-[#800020] transition-all cursor-pointer"
            title="Delete Variety"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="mb-5">
        <h3 className="font-serif text-2xl font-bold text-stone-900 tracking-tight leading-tight">{grape.name}</h3>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {(grape.locations || []).map((loc, i) => (
            <span key={i} className="text-xs bg-[#F7F5F0] border border-[#EBE7DF] font-medium px-2 py-0.5 rounded-md text-stone-700">
              {loc}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-5 p-3.5 bg-[#FAF8F3] border border-[#EBE7DF] rounded-xl">
        <div className="space-y-0.5">
          <p className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold">Skin</p>
          <p className="text-xs font-semibold text-stone-800">{grape.skin || '—'}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold">Body</p>
          <p className="text-xs font-semibold text-stone-800">{grape.body || '—'}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold">Acidity</p>
          <p className="text-xs font-semibold text-stone-800">{grape.acidity || '—'}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold">Tannin</p>
          <p className="text-xs font-semibold text-stone-800">{grape.tannin || '—'}</p>
        </div>
      </div>

      <div className="space-y-3 flex-1 text-stone-700">
        {grape.aromaFlavor && (
          <div>
            <p className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold mb-0.5">Aroma & Flavor</p>
            <p className="text-xs font-normal italic text-stone-700 line-clamp-2 leading-relaxed">{grape.aromaFlavor}</p>
          </div>
        )}
        {grape.otherNotes && (
          <div>
            <p className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold mb-0.5">Other Notes</p>
            <p className="text-xs font-normal text-stone-500 line-clamp-2 leading-relaxed">{grape.otherNotes}</p>
          </div>
        )}
        {Array.isArray(grape.foodPairing) && grape.foodPairing.length > 0 && (
          <div>
            <p className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold mb-1">Food Pairing</p>
            <div className="flex flex-wrap gap-1">
              {grape.foodPairing.map((fp, i) => (
                <span key={i} className="text-[10px] bg-[#FDF2F4] border border-[#F5C2CB] text-[#800020] px-2 py-0.5 rounded-md font-medium">
                  {fp}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <button 
        onClick={() => onEdit(grape)}
        className="mt-6 w-full py-2.5 bg-[#F7F5F0] hover:bg-[#722F37] hover:text-white border border-[#E5E0D8] rounded-xl text-stone-800 font-medium text-xs tracking-wider transition-all duration-200 cursor-pointer"
      >
        View Details
      </button>
    </motion.div>
  );
};

interface GrapeFormProps {
  grape?: GrapeVariety;
  onSave: (grape: Omit<GrapeVariety, 'id' | 'dateAdded' | 'userId'>) => void;
  onClose: () => void;
}

const GrapeForm = ({ grape, onSave, onClose }: GrapeFormProps) => {
  const [formData, setFormData] = useState({
    name: grape?.name || '',
    type: (grape?.type || 'Red') as 'Red' | 'White',
    skin: grape?.skin || '',
    locations: Array.isArray(grape?.locations) ? grape.locations : [],
    body: grape?.body || '',
    acidity: grape?.acidity || '',
    tannin: grape?.tannin || '',
    sweetness: grape?.sweetness || '',
    aromaFlavor: grape?.aromaFlavor || '',
    otherNotes: grape?.otherNotes || '',
    foodPairing: Array.isArray(grape?.foodPairing) ? grape.foodPairing : [],
    additionalNotes: grape?.additionalNotes || '',
  });

  const [locationInput, setLocationInput] = useState('');
  const [pairingInput, setPairingInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalLocations = locationInput.trim() ? [...formData.locations, locationInput.trim()] : formData.locations;
    const finalPairings = pairingInput.trim() ? [...formData.foodPairing, pairingInput.trim()] : formData.foodPairing;
    
    onSave({
      ...formData,
      locations: [...new Set(finalLocations)],
      foodPairing: [...new Set(finalPairings)]
    });
  };

  const addLocation = () => {
    if (locationInput.trim() && !formData.locations.includes(locationInput.trim())) {
      setFormData({ ...formData, locations: [...formData.locations, locationInput.trim()] });
      setLocationInput('');
    }
  };

  const removeLocation = (index: number) => {
    setFormData({
      ...formData,
      locations: formData.locations.filter((_, i) => i !== index)
    });
  };

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#FBF9F5] shadow-[-16px_0px_48px_rgba(28,25,23,0.15)] z-[60] overflow-y-auto border-l border-[#EBE7DF] text-stone-900 pointer-events-auto"
    >
      <div className="p-8 md:p-10">
        <div className="flex justify-between items-center mb-8 border-b border-[#EBE7DF] pb-4">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl text-[#5A1E24] font-bold tracking-tight">{grape ? 'Edit Variety' : 'New Variety'}</h2>
            <p className="text-xs uppercase tracking-wider font-semibold text-[#722F37] mt-1">Grape Encyclopedia</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2.5 bg-white hover:bg-[#F7F5F0] rounded-xl border border-[#E5E0D8] text-stone-600 hover:text-stone-900 transition-all cursor-pointer shadow-xs"
            aria-label="Close variety form"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Variety Name</label>
            <input
              required value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white border border-[#E5E0D8] rounded-xl px-4 py-2.5 text-stone-900 font-semibold text-lg focus:outline-none focus:border-[#722F37] focus:ring-1 focus:ring-[#722F37]/30 transition-all placeholder:text-stone-400"
              placeholder="e.g. Pinot Noir"
            />
          </div>

          <div className="flex gap-3">
            {['Red', 'White'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setFormData({ ...formData, type: t as any })}
                className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                  formData.type === t 
                    ? t === 'Red' 
                      ? 'bg-[#FDF2F4] text-[#800020] border-[#F5C2CB] shadow-xs' 
                      : 'bg-[#FEFCE8] text-[#854D0E] border-[#FEF08A] shadow-xs'
                    : 'bg-white text-stone-600 border-[#E5E0D8] hover:bg-[#F7F5F0]'
                }`}
              >
                {t} Grape
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Skin</label>
              <input value={formData.skin} onChange={e => setFormData({ ...formData, skin: e.target.value })} className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3.5 py-2 text-stone-900 font-medium focus:outline-none focus:border-[#722F37] transition-all text-xs" placeholder="Thick/Thin" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Body</label>
              <input value={formData.body} onChange={e => setFormData({ ...formData, body: e.target.value })} className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3.5 py-2 text-stone-900 font-medium focus:outline-none focus:border-[#722F37] transition-all text-xs" placeholder="Light/Medium/Full" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Geography (Region / Country)</label>
              <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                {formData.locations.map((loc, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F3] border border-[#EBE7DF] rounded-lg text-xs font-medium text-stone-700">
                    {loc}
                    <button type="button" onClick={() => removeLocation(i)} className="hover:text-[#722F37] cursor-pointer">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  value={locationInput} 
                  onChange={e => setLocationInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                  className="flex-1 bg-white border border-[#E5E0D8] rounded-xl px-3.5 py-2 text-stone-900 text-xs font-medium focus:outline-none focus:border-[#722F37] transition-all" 
                  placeholder="e.g. Piedmont / Italy"
                />
                <button type="button" onClick={addLocation} className="px-3 rounded-xl border border-[#E5E0D8] bg-[#F7F5F0] hover:bg-[#EBE7DF] text-stone-700 font-semibold cursor-pointer">
                  <Plus size={16} />
                </button>
              </div>
              <p className="text-[10px] text-stone-400 font-medium">Format: Region / Country (e.g., Bordeaux / France)</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Acidity</label>
              <input value={formData.acidity} onChange={e => setFormData({ ...formData, acidity: e.target.value })} className="w-full bg-white border border-[#E5E0D8] rounded-lg px-2.5 py-1.5 text-xs text-stone-900 font-medium focus:outline-none focus:border-[#722F37]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Tannin</label>
              <input value={formData.tannin} onChange={e => setFormData({ ...formData, tannin: e.target.value })} className="w-full bg-white border border-[#E5E0D8] rounded-lg px-2.5 py-1.5 text-xs text-stone-900 font-medium focus:outline-none focus:border-[#722F37]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Sweetness</label>
              <input value={formData.sweetness} onChange={e => setFormData({ ...formData, sweetness: e.target.value })} className="w-full bg-white border border-[#E5E0D8] rounded-lg px-2.5 py-1.5 text-xs text-stone-900 font-medium focus:outline-none focus:border-[#722F37]" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Aroma & Flavor</label>
              <textarea rows={2} value={formData.aromaFlavor} onChange={e => setFormData({ ...formData, aromaFlavor: e.target.value })} className="w-full bg-white border border-[#E5E0D8] rounded-xl p-3 text-xs text-stone-900 font-medium focus:outline-none focus:border-[#722F37] transition-all" placeholder="Red fruits, spice, earthy..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Other Notes</label>
              <textarea rows={2} value={formData.otherNotes} onChange={e => setFormData({ ...formData, otherNotes: e.target.value })} className="w-full bg-white border border-[#E5E0D8] rounded-xl p-3 text-xs text-stone-900 font-medium focus:outline-none focus:border-[#722F37] transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Additional Notes</label>
              <textarea rows={2} value={formData.additionalNotes} onChange={e => setFormData({ ...formData, additionalNotes: e.target.value })} className="w-full bg-white border border-[#E5E0D8] rounded-xl p-3 text-xs text-stone-900 font-medium focus:outline-none focus:border-[#722F37] transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Food Pairing</label>
              <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                {formData.foodPairing.map((p, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-[#FDF2F4] border border-[#F5C2CB] rounded-lg text-xs font-medium text-[#722F37]">
                    {p}
                    <button type="button" onClick={() => setFormData({ ...formData, foodPairing: formData.foodPairing.filter((_, idx) => idx !== i) })} className="hover:text-red-700 cursor-pointer">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="relative flex gap-2">
                <input
                  value={pairingInput}
                  onChange={e => setPairingInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      if (pairingInput.trim() && !formData.foodPairing.includes(pairingInput.trim())) {
                        setFormData({ ...formData, foodPairing: [...formData.foodPairing, pairingInput.trim()] });
                        setPairingInput('');
                      }
                    }
                  }}
                  className="flex-1 bg-white border border-[#E5E0D8] rounded-xl px-3.5 py-2 text-stone-900 font-medium text-xs focus:outline-none focus:border-[#722F37] transition-all"
                  placeholder="e.g. Grilled Salmon (Enter to add)"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (pairingInput.trim() && !formData.foodPairing.includes(pairingInput.trim())) {
                      setFormData({ ...formData, foodPairing: [...formData.foodPairing, pairingInput.trim()] });
                      setPairingInput('');
                    }
                  }}
                  className="px-3 rounded-xl border border-[#E5E0D8] bg-[#F7F5F0] hover:bg-[#EBE7DF] text-stone-700 font-semibold cursor-pointer"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-[#722F37] hover:bg-[#5C242C] text-white rounded-xl py-3.5 font-semibold tracking-wider uppercase text-xs cursor-pointer shadow-md transition-all active:scale-98">
            Register Variety
          </button>
        </form>
      </div>
    </motion.div>
  );
};

const GrapeComparisonView = ({ grapes, onClose }: { grapes: GrapeVariety[], onClose: () => void }) => {
  const attributes = [
    { key: 'type', label: 'Type' },
    { key: 'skin', label: 'Skin Color' },
    { key: 'body', label: 'Body' },
    { key: 'acidity', label: 'Acidity' },
    { key: 'tannin', label: 'Tannins' },
    { key: 'sweetness', label: 'Sweetness' },
    { key: 'aromaFlavor', label: 'Aroma & Flavor' },
    { key: 'foodPairing', label: 'Food Pairing' },
    { key: 'locations', label: 'Major Regions' },
  ];

  const getWeightClass = (attr: string, value: string) => {
    const values = grapes.map(g => {
      const val = (g as any)[attr];
      return Array.isArray(val) ? val.join(', ') : val;
    });
    const occurrences = values.filter(v => v === value).length;
    return occurrences === 1 ? 'text-[#722F37] font-bold bg-[#FDF2F4] border-[#F5C2CB]' : 'text-stone-700';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col bg-[#FBF9F5] text-stone-900"
    >
      <div className="flex flex-col h-full w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 md:px-10 border-b border-[#EBE7DF] flex justify-between items-center bg-white shrink-0 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#722F37]/10 border border-[#722F37]/20 flex items-center justify-center text-[#722F37]">
                <BarChart3 size={20} />
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 tracking-tight">Varietal Comparison</h2>
            </div>
            <p className="text-xs uppercase tracking-wider text-stone-500 font-medium">Side-by-side analytical contrast ({grapes.length} varieties)</p>
          </div>
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 border border-[#EBE7DF] bg-white hover:bg-stone-50 rounded-xl uppercase tracking-wider text-xs font-semibold text-stone-700 transition-all cursor-pointer shadow-sm"
          >
            <span>Close</span>
            <X size={16} />
          </button>
        </div>

        {/* Comparison Table Container */}
        <div className="flex-1 overflow-auto bg-[#FBF9F5] p-6 md:p-10 custom-scrollbar">
          <div className="min-w-max bg-white border border-[#EBE7DF] rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-48 md:w-64 p-5 text-left border-b border-r border-[#EBE7DF] bg-[#FAF8F5] sticky top-0 left-0 z-50">
                    <span className="text-xs uppercase tracking-wider text-stone-700 font-bold">Attribute</span>
                  </th>
                  {grapes.map(grape => (
                    <th key={grape.id} className="p-6 text-center border-b border-r border-[#EBE7DF] bg-white sticky top-0 z-40 min-w-[280px]">
                      <div className="space-y-2">
                        <span className={`text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full border font-semibold ${
                          grape.type === 'Red' 
                            ? 'bg-[#FDF2F4] text-[#800020] border-[#F5C2CB]' 
                            : 'bg-[#FEFCE8] text-[#854D0E] border-[#FEF08A]'
                        }`}>
                          {grape.type}
                        </span>
                        <h3 className="text-xl font-serif font-bold text-stone-900 tracking-tight">{grape.name}</h3>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attributes.map((attr, idx) => (
                  <tr key={attr.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAF8F5]/60'}>
                    <td className="p-4 border-b border-r border-[#EBE7DF] bg-[#FAF8F5] font-semibold text-xs uppercase tracking-wider text-stone-700 sticky left-0 z-30">
                      {attr.label}
                    </td>
                    {grapes.map(grape => {
                      const rawValue = (grape as any)[attr.key];
                      const displayValue = Array.isArray(rawValue) ? rawValue.join(', ') : (rawValue || '—');
                      const isHighlighted = getWeightClass(attr.key, displayValue).includes('text-[#722F37]');
                      
                      return (
                        <td 
                          key={grape.id} 
                          className={`p-4 border-b border-r border-[#EBE7DF] text-center font-medium text-xs ${isHighlighted ? 'bg-[#FDF2F4] text-[#722F37] font-bold' : 'text-stone-700'}`}
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-[#EBE7DF] bg-white flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 text-stone-500 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#722F37]/20 border border-[#722F37]/40"></span>
            <p className="text-xs">
              <strong className="text-[#722F37]">Burgundy highlight</strong> indicates a unique characteristic distinct among compared grapes.
            </p>
          </div>
          <span className="text-[10px] uppercase font-bold text-[#722F37] bg-[#722F37]/10 border border-[#722F37]/20 px-2.5 py-1 rounded-md">
            Analytical Suite
          </span>
        </div>
      </div>
    </motion.div>
  );
};

interface WineCardProps {
  bottle: WineBottle;
  onEdit: (bottle: WineBottle) => void;
  onDelete: (id: string) => void;
}

const WineCard: React.FC<WineCardProps> = ({ bottle, onEdit, onDelete }) => {
  const typeConfig = WINE_TYPE_CONFIG[bottle.type] || { text: 'text-amber-800', bg: 'bg-amber-50', border: 'border border-amber-200', accent: 'bg-amber-600', hex: '#D97706' };
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSensoryOpen, setIsSensoryOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const isMissingNotes = !bottle.appearance || !bottle.nose || !bottle.palate || !bottle.finish || !bottle.tastingNotes;

  const hasSensoryDetails = !!(
    bottle.appearance ||
    bottle.nose ||
    bottle.palate ||
    bottle.finish ||
    bottle.viticulture ||
    bottle.winemakingPhilosophy ||
    (Array.isArray(bottle.foodPairing) && bottle.foodPairing.length > 0) ||
    bottle.additionalNote
  );

  return (
    <>
      {/* Lightbox / Enlarged View */}
      <AnimatePresence>
        {isImageOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsImageOpen(false)}
            className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
          >
            <motion.div
              layoutId={`bottle-image-${bottle.id}`}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="relative w-full max-w-lg aspect-[2/3] bg-white border border-[#E6DFD5] rounded-3xl p-6 shadow-2xl flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                type="button"
                onClick={() => setIsImageOpen(false)}
                className="absolute top-4 right-4 z-[110] bg-stone-100 hover:bg-stone-200 text-stone-700 border border-[#E6DFD5] rounded-full p-2.5 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                aria-label="Close image preview"
              >
                <X size={18} strokeWidth={2} />
              </button>
              
              {bottle.imageUrl ? (
                <img 
                  src={bottle.imageUrl} 
                  alt={bottle.name}
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Wine size={120} className="text-stone-300" strokeWidth={1} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={() => {
          if (!isExpanded) {
            setIsExpanded(true);
          }
        }}
        whileHover={!isExpanded ? { scale: 1.003 } : undefined}
        style={{ willChange: "transform, opacity" }}
        className={`bg-white flex flex-col group transition-all duration-200 ease-out rounded-2xl overflow-hidden border border-[#E6DFD5] hover:border-[#D6CFBF] shadow-[0_2px_12px_rgba(28,25,23,0.04)] hover:shadow-[0_6px_20px_rgba(28,25,23,0.08)] ${
          bottle.type.includes('Red') 
            ? 'border-l-4 border-l-[#800020]' 
            : bottle.type.includes('White') 
            ? 'border-l-4 border-l-[#CA8A04]' 
            : 'border-l-4 border-l-[#0891B2]'
        } relative ${!isExpanded ? 'cursor-pointer hover:bg-[#FAF8F5]' : 'bg-white'}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isExpanded ? (
            /* --- MINIMALIST HORIZONTAL CARD LAYOUT --- */
            <motion.div
              key="collapsed-horizontal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full text-stone-900"
            >
              {/* Left: Thumbnail & Main Info */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {/* Thumbnail Image */}
                <motion.div
                  layoutId={`bottle-image-${bottle.id}`}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsImageOpen(true);
                  }}
                  className="w-14 h-14 rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] flex items-center justify-center cursor-zoom-in overflow-hidden shrink-0 hover:scale-105 transition-all shadow-inner"
                  title="Click to view full image"
                >
                  {bottle.imageUrl ? (
                    <img 
                      src={bottle.imageUrl} 
                      alt="thumbnail" 
                      className="w-full h-full object-contain p-1"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Wine size={22} className="text-stone-400" />
                  )}
                </motion.div>

                {/* Title & Producer */}
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex flex-wrap items-center gap-x-2.5">
                    <h3 className="font-serif text-lg md:text-xl font-bold text-[#5A1E24] tracking-tight truncate line-clamp-1">
                      {bottle.name}
                    </h3>
                    <span className="font-mono text-sm md:text-base font-semibold text-[#800020] shrink-0">
                      {bottle.year || 'NV'}
                    </span>
                    {isMissingNotes && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-800 text-[10px] font-semibold uppercase tracking-wider">
                        <Sparkle size={9} className="text-amber-600" />
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 font-medium tracking-wide truncate mt-0.5">
                    {bottle.producer || 'Unknown Producer'}
                  </p>
                </div>
              </div>

              {/* Middle: Type Badge & Origin */}
              <div className="flex items-center gap-3 shrink-0 justify-between md:justify-start">
                <div className={`text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full border ${typeConfig.border} ${typeConfig.text} ${typeConfig.bg}`}>
                  {bottle.type}
                </div>
                
                <div className="text-left md:text-right min-w-[110px] hidden sm:block">
                  <p className="text-xs text-[#1E1E1E] font-semibold truncate max-w-[130px]">{bottle.region || 'Any Region'}</p>
                  <p className="text-[10px] text-stone-500 italic truncate max-w-[130px]">{bottle.country || 'Unknown Origin'}</p>
                </div>
              </div>

              {/* Right: Price & Expand Indicator */}
              <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-[#EBE7DF]">
                {bottle.price ? (
                  <div className="text-left md:text-right mr-1">
                    <span className="font-mono text-xs md:text-sm bg-[#FDF2F4] text-[#800020] font-bold border border-[#F5C2CB] px-3 py-1 rounded-xl tabular-nums tracking-wide inline-block shadow-xs">
                      ฿{bottle.price.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <div className="text-left md:text-right mr-1">
                    <span className="text-[10px] uppercase font-medium text-stone-400 italic">No Price</span>
                  </div>
                )}

                {/* Edit Icon in Minimalist Mode */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(bottle);
                  }}
                  className="w-8 h-8 rounded-xl border border-[#E5E0D8] bg-[#F7F5F0] hover:bg-[#EBE7DF] text-stone-700 hover:text-stone-900 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                  title="Edit Entry"
                >
                  <Edit2 size={13} />
                </button>

                {/* Click instruction chevron */}
                <div className="text-stone-400 flex items-center justify-center w-8 h-8 rounded-xl border border-[#E5E0D8] bg-[#F7F5F0] group-hover:bg-[#EBE7DF] transition-colors">
                  <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform duration-200" />
                </div>
              </div>
            </motion.div>
          ) : (
            /* --- DETAILED EXPANDED CARD LAYOUT --- */
            <motion.div
              key="expanded-views"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{ willChange: "transform, opacity" }}
              className="p-6 md:p-8 flex flex-col min-w-0 relative text-stone-900"
            >
              {/* Close Button Top Right */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                  setIsSensoryOpen(false);
                }}
                className="absolute top-6 right-6 z-10 bg-[#F7F5F0] hover:bg-[#EBE7DF] text-stone-700 hover:text-stone-900 p-2.5 rounded-xl border border-[#E5E0D8] transition-all flex items-center justify-center cursor-pointer shadow-xs"
                title="Collapse Card"
                aria-label="Collapse Card"
              >
                <X size={16} />
              </button>

              {/* Top Line: Image Icon, Type and Price */}
              <div className="flex justify-between items-start mb-5 gap-4 pr-12">
                <div className="flex items-center gap-4">
                  {/* The Image Icon */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsImageOpen(true);
                    }}
                    className="w-16 h-16 rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] flex items-center justify-center cursor-zoom-in overflow-hidden shrink-0 shadow-inner"
                    title="Click to zoom image"
                  >
                    {bottle.imageUrl ? (
                      <img 
                        src={bottle.imageUrl} 
                        alt="thumbnail" 
                        className="w-full h-full object-contain p-1.5"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Wine size={26} className="text-stone-400" />
                    )}
                  </div>

                  <div className={`text-xs uppercase tracking-wider font-semibold px-3.5 py-1.5 rounded-full border ${typeConfig.border} ${typeConfig.text} ${typeConfig.bg}`}>
                    {bottle.type}
                  </div>
                </div>
                
                {bottle.price && (
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-stone-500 font-semibold">Price</span>
                    <span className="font-mono text-lg bg-[#FDF2F4] text-[#800020] font-bold border border-[#F5C2CB] px-3.5 py-0.5 rounded-xl tabular-nums tracking-wide shadow-xs">
                      ฿{bottle.price.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Title & Year */}
              <div className="mb-4">
                <h3 className="font-serif text-2xl md:text-3xl font-bold text-[#5A1E24] tracking-tight leading-tight">
                  {bottle.name} <span className="text-stone-300 mx-1.5 font-light">•</span> <span className="font-mono font-semibold text-[#800020]">{bottle.year || 'NV'}</span>
                </h3>
              </div>

              {/* Details: Producer, Varietal, Terroir */}
              <div className="space-y-2 mb-6 p-4 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl text-stone-700">
                <div className="flex items-baseline gap-4">
                  <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold shrink-0 w-24">Producer</span>
                  <p className="text-xs text-[#1E1E1E] font-semibold tracking-wide uppercase">
                    {bottle.producer || 'Unknown'}
                  </p>
                </div>
                <div className="flex items-baseline gap-4">
                  <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold shrink-0 w-24">Varietal</span>
                  <p className="text-xs text-[#1E1E1E] font-medium">
                    {Array.isArray(bottle.grape) ? bottle.grape.join(' • ') : bottle.grape || 'Secret Assemblage'}
                  </p>
                </div>
                <div className="flex items-baseline gap-4">
                  <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold shrink-0 w-24">Origin</span>
                  <p className="text-xs text-[#1E1E1E] font-medium">
                    {bottle.region}{bottle.country ? `, ${bottle.country}` : ''}
                  </p>
                </div>
              </div>

              {/* Tasting Diary */}
              {bottle.tastingNotes && (
                <div className="mb-5 p-5 bg-[#FDF2F4] border border-[#F5C2CB] rounded-xl shadow-xs">
                  <div className="flex items-center gap-2.5 mb-2">
                    <Sparkles size={14} className="text-[#800020]" />
                    <span className="text-xs uppercase tracking-wider text-[#800020] font-semibold">
                      Tasting Diary
                    </span>
                  </div>
                  <p className="text-sm font-normal text-[#1E1E1E] leading-relaxed italic">
                    "{bottle.tastingNotes}"
                  </p>
                </div>
              )}

              {/* Accordion Toggle Button: Fully closed by default with zero unnecessary height */}
              <div className="mt-2 pt-4 border-t border-[#E6DFD5]">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSensoryOpen(!isSensoryOpen);
                  }}
                  className="w-full flex items-center justify-between px-5 py-3 border border-[#E6DFD5] bg-[#FAF8F5] hover:bg-[#F2EFE9] rounded-xl transition-all cursor-pointer group"
                >
                  <span className="text-xs uppercase tracking-wider text-[#5A1E24] font-semibold flex items-center gap-2">
                    <Sparkles size={14} className="text-[#722F37]" />
                    {isSensoryOpen ? 'Hide Sensory & Physical Profile' : 'Reveal Sensory & Physical Profile'}
                  </span>
                  {isSensoryOpen ? (
                    <ChevronUp size={16} className="text-stone-600" />
                  ) : (
                    <ChevronDown size={16} className="text-stone-600 group-hover:translate-y-0.5 transition-transform" />
                  )}
                </button>
              </div>

              {/* Sensory & Physical Profile collapsible accordion content */}
              <AnimatePresence>
                {isSensoryOpen && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="overflow-hidden space-y-6 pt-5"
                  >
                    {!hasSensoryDetails ? (
                      <div className="p-4 bg-[#FAF8F5] border border-dashed border-[#E6DFD5] rounded-xl text-center">
                        <p className="text-xs text-stone-600">No additional sensory dimensions logged for this vintage yet.</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(bottle);
                          }}
                          className="mt-2 text-xs font-semibold text-[#722F37] hover:underline cursor-pointer"
                        >
                          + Log appearance, nose, palate & pairings
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {bottle.appearance && (
                            <div className="p-4 bg-[#FDF2F4] border border-[#F5C2CB] rounded-xl space-y-1.5">
                              <h4 className="text-xs uppercase tracking-wider text-[#800020] font-semibold flex items-center gap-1.5">
                                <Droplets size={14} /> Appearance
                              </h4>
                              <p className="text-xs text-[#1E1E1E] font-normal leading-relaxed">
                                {bottle.appearance}
                              </p>
                            </div>
                          )}

                          {Array.isArray(bottle.foodPairing) && bottle.foodPairing.length > 0 && (
                            <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl space-y-1.5">
                              <h4 className="text-xs uppercase tracking-wider text-[#15803D] font-semibold flex items-center gap-1.5">
                                <Utensils size={14} /> Gastronomy & Pairings
                              </h4>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {bottle.foodPairing.map((food, i) => (
                                  <span key={i} className="px-2.5 py-1 rounded-lg border border-[#BBF7D0] bg-white text-[#15803D] text-xs font-medium">
                                    {food}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Sensory Breakdown (Nose, Palate, Finish) */}
                        {(bottle.nose || bottle.palate || bottle.finish) && (
                          <div className="space-y-2.5">
                            <h4 className="text-xs uppercase tracking-wider text-[#5A1E24] font-semibold">
                              Sensory Breakdown
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                              {bottle.nose && (
                                <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E6DFD5]">
                                  <span className="text-[10px] uppercase tracking-wider text-[#6D28D9] font-semibold mb-1 block">Nose</span>
                                  <p className="text-xs text-[#1E1E1E] font-normal italic leading-relaxed">
                                    {bottle.nose}
                                  </p>
                                </div>
                              )}
                              {bottle.palate && (
                                <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E6DFD5]">
                                  <span className="text-[10px] uppercase tracking-wider text-[#CA8A04] font-semibold mb-1 block">Palate</span>
                                  <p className="text-xs text-[#1E1E1E] font-normal italic leading-relaxed">
                                    {bottle.palate}
                                  </p>
                                </div>
                              )}
                              {bottle.finish && (
                                <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E6DFD5]">
                                  <span className="text-[10px] uppercase tracking-wider text-[#800020] font-semibold mb-1 block">Finish</span>
                                  <p className="text-xs text-[#1E1E1E] font-normal italic leading-relaxed">
                                    {bottle.finish}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Terroir & Winemaking */}
                        {(bottle.viticulture || bottle.winemakingPhilosophy) && (
                          <div className="space-y-2.5">
                            <h4 className="text-xs uppercase tracking-wider text-[#5A1E24] font-semibold">
                              Terroir & Viticulture
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {bottle.viticulture && (
                                <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E6DFD5]">
                                  <span className="text-[10px] uppercase tracking-wider text-[#0E7490] font-semibold mb-1 block">Viticulture & Vineyard</span>
                                  <p className="text-xs text-[#1E1E1E] font-normal leading-relaxed">
                                    {bottle.viticulture}
                                  </p>
                                </div>
                              )}
                              {bottle.winemakingPhilosophy && (
                                <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E6DFD5]">
                                  <span className="text-[10px] uppercase tracking-wider text-[#7C3AED] font-semibold mb-1 block">Winemaking Philosophy</span>
                                  <p className="text-xs text-[#1E1E1E] font-normal leading-relaxed">
                                    {bottle.winemakingPhilosophy}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Collector's Notes */}
                        {bottle.additionalNote && (
                          <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E6DFD5]">
                            <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-1 block">Collector's Notes</span>
                            <p className="text-xs text-[#1E1E1E] font-normal leading-relaxed">
                              {bottle.additionalNote}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer Actions */}
              <div className="mt-6 pt-4 border-t border-[#E6DFD5] flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                    setIsSensoryOpen(false);
                  }}
                  className="px-3.5 py-1.5 border border-[#E5E0D8] rounded-xl bg-[#F7F5F0] hover:bg-[#EBE7DF] text-stone-700 text-xs uppercase tracking-wider font-semibold cursor-pointer transition-all"
                >
                  <span>↑ Collapse Card</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(bottle);
                    }}
                    className="p-2 border border-[#E5E0D8] rounded-xl bg-[#F7F5F0] hover:bg-[#EBE7DF] text-stone-700 transition-all cursor-pointer shadow-xs"
                    title="Edit Entry"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(bottle.id);
                    }}
                    className="p-2 border border-[#F5C2CB] rounded-xl bg-[#FDF2F4] hover:bg-[#FEE2E2] text-[#800020] transition-all cursor-pointer shadow-xs"
                    title="Archive Entry"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

interface WineFormProps {
  bottle?: WineBottle;
  grapes: GrapeVariety[];
  onSave: (bottle: Omit<WineBottle, 'id' | 'dateAdded'>) => void;
  onClose: () => void;
}

const WineForm = ({ bottle, grapes, onSave, onClose }: WineFormProps) => {
  const [formData, setFormData] = useState({
    name: bottle?.name || '',
    producer: bottle?.producer || '',
    year: bottle?.year || new Date().getFullYear().toString(),
    type: bottle?.type || 'Red' as WineType,
    region: bottle?.region || '',
    country: bottle?.country || '',
    grape: Array.isArray(bottle?.grape) ? bottle.grape : (typeof bottle?.grape === 'string' ? [bottle.grape] : []),
    tastingNotes: bottle?.tastingNotes || '',
    appearance: bottle?.appearance || '',
    nose: bottle?.nose || '',
    palate: bottle?.palate || '',
    finish: bottle?.finish || '',
    winemakingPhilosophy: bottle?.winemakingPhilosophy || '',
    viticulture: bottle?.viticulture || '',
    foodPairing: Array.isArray(bottle?.foodPairing) ? bottle.foodPairing : [],
    additionalNote: bottle?.additionalNote || '',
    price: bottle?.price || 0,
    imageUrl: bottle?.imageUrl || '',
    locationPurchased: bottle?.locationPurchased || '',
  });

  const [grapeInput, setGrapeInput] = useState('');
  const [pairingInput, setPairingInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTaskRef = useRef<Promise<string> | null>(null);
  const lastSelectedFileRef = useRef<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);
  const [isRefiningNotes, setIsRefiningNotes] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  const handleRefineNotes = async () => {
    if (!formData.tastingNotes.trim()) return;
    setIsRefiningNotes(true);
    setRefineError(null);
    try {
      const refined = await refineTastingNotes(formData.tastingNotes);
      setFormData(prev => ({ ...prev, tastingNotes: refined }));
    } catch (err: any) {
      console.error("Failed to refine notes:", err);
      setRefineError(err.message || "Failed to refine notes. Please try again.");
    } finally {
      setIsRefiningNotes(false);
    }
  };

  // Helper to compress image for Firestore fallback (max 1MB)
  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_DIM = 800; // Efficient size for mobile viewing
          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          let quality = 0.6;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          
          // Ensure it's under 500KB to be safe for Firestore strings
          while (dataUrl.length > 500000 && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          
          resolve(dataUrl);
        };
        img.onerror = (e) => reject(new Error("Image loading failed"));
      };
      reader.onerror = (e) => reject(new Error("File reading failed"));
    });
  };

  useEffect(() => {
    if (analysisSuccess) {
      const timer = setTimeout(() => setAnalysisSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [analysisSuccess]);

  const handleAIScan = async (imageUrl: string) => {
    if (!imageUrl) return;
    
    setIsAnalyzing(true);
    setUploadError(null);
    try {
      let targetUrl = imageUrl;
      
      // If the URL is not a base64 data URI, and we have the raw file, use the compressed base64 of the file
      if (!targetUrl.startsWith('data:') && lastSelectedFileRef.current) {
        try {
          targetUrl = await compressImage(lastSelectedFileRef.current);
        } catch (compressErr) {
          console.warn("Failed to compress image for scan, trying raw FileReader:", compressErr);
          try {
            targetUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error("Failed to read file"));
              reader.readAsDataURL(lastSelectedFileRef.current!);
            });
          } catch (readErr) {
            console.error("Failed to read raw file as fallback:", readErr);
          }
        }
      }

      const analysis = await analyzeWineLabel(targetUrl);
      setFormData(prev => ({
        ...prev,
        name: analysis.name || prev.name,
        producer: analysis.producer || prev.producer,
        year: analysis.year ? String(analysis.year) : prev.year,
        type: (analysis.type as WineType) || prev.type,
        region: analysis.region || prev.region,
        country: analysis.country || prev.country,
        grape: Array.isArray(analysis.grape) ? [...new Set([...(prev.grape || []), ...analysis.grape])] : (prev.grape || []),
        appearance: analysis.appearance || prev.appearance,
        nose: analysis.nose || prev.nose,
        palate: analysis.palate || prev.palate,
        finish: analysis.finish || prev.finish,
        winemakingPhilosophy: analysis.winemakingPhilosophy || prev.winemakingPhilosophy,
        viticulture: analysis.viticulture || prev.viticulture,
        foodPairing: Array.isArray(analysis.foodPairing) ? [...new Set([...(prev.foodPairing || []), ...analysis.foodPairing])] : (prev.foodPairing || []),
        additionalNote: analysis.additionalNote || prev.additionalNote,
        tastingNotes: analysis.mainTastingNotes || analysis.tastingNotes || prev.tastingNotes,
      }));
      setAnalysisSuccess(true);
    } catch (err: any) {
      console.error("AI Analysis failed:", err);
      const errMsg = err?.message || "AI label analysis timed out or failed";
      setUploadError(`${errMsg}. Note: your photo is uploaded successfully, so you can still save the wine manually.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    // Compress and return the base64 URL directly for client-side storage
    return compressImage(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';
    if (isHeic) {
      setUploadError('HEIC/HEIF images are not natively supported by browsers. Please select a JPEG, PNG, or WebP image.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file');
      return;
    }

    lastSelectedFileRef.current = file;
    setIsUploading(true);
    setUploadError(null);
    
    const localUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, imageUrl: localUrl }));
    
    // Start scan and upload in parallel. Pass compressed base64 to AI scan as local blob URLs cannot be fetched by server.
    compressImage(file).then(base64Url => {
      handleAIScan(base64Url);
    }).catch(err => {
      console.error("Failed to compress image for preview scan:", err);
      handleAIScan(localUrl);
    });
    
    const task = uploadFile(file);
    uploadTaskRef.current = task;
    
    task.then(remoteUrl => {
      setFormData(prev => ({ ...prev, imageUrl: remoteUrl }));
      URL.revokeObjectURL(localUrl);
      setIsUploading(false);
    }).catch(async (err) => {
      console.error('Auto-upload failed, preparing fallback:', err);
      try {
        // Prepare base64 fallback in background if remote upload fails
        const base64 = await compressImage(file);
        // We don't set it yet, just prepare it for handleSubmit if needed
        // or we can set it as the preview if the user wants to see it's "ready"
        setUploadError(null); // Clear errors because we have a fallback
      } catch (fallbackErr) {
        setUploadError('Background upload failed. Will try to save again on commit.');
      }
      setIsUploading(false);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Simulate input change
      const mockEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(mockEvent);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSaving) return;
    setIsSaving(true);
    setUploadError(null);

    try {
      let finalImageUrl = formData.imageUrl;

      // Ensure we have a permanent URL before saving
      if (finalImageUrl.startsWith('blob:')) {
        try {
          if (uploadTaskRef.current) {
            finalImageUrl = await uploadTaskRef.current;
          } else {
            throw new Error("No upload task");
          }
        } catch (err) {
          console.warn("Remote upload failed, using base64 fallback:", err);
          // If remote upload fails (credentials etc.), fallback to base64
          // We need the original file. Since we don't have it here easily, 
          // let's try to fetch it from the blob URL or re-read it.
          // Actually, we can just use the compressImage if we keep the file.
          // Let's modify handleFileUpload to store the file in a ref.
          if (lastSelectedFileRef.current) {
            finalImageUrl = await compressImage(lastSelectedFileRef.current);
          } else {
             throw new Error("Cloud upload failed and original file reference lost. Please re-select the photo.");
          }
        }
      }

      const currentGrapes = Array.isArray(formData.grape) ? formData.grape : [];
      const finalGrapes = grapeInput.trim() ? [...currentGrapes, grapeInput.trim()] : currentGrapes;
      
      const currentPairings = Array.isArray(formData.foodPairing) ? formData.foodPairing : [];
      const finalPairings = pairingInput.trim() ? [...currentPairings, pairingInput.trim()] : currentPairings;
      
      await onSave({ 
        ...formData, 
        imageUrl: finalImageUrl,
        grape: finalGrapes,
        foodPairing: finalPairings,
        region: formData.region || '',
        country: formData.country || '',
        producer: formData.producer || '',
        year: formData.year || 'NV',
        type: formData.type || 'Red'
      });
    } catch (error: any) {
      console.error("Form submission failed:", error);
      setUploadError(error.message || "Failed to save record. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const addGrape = () => {
    const currentGrapes = Array.isArray(formData.grape) ? formData.grape : [];
    if (grapeInput.trim() && !currentGrapes.includes(grapeInput.trim())) {
      setFormData({ ...formData, grape: [...currentGrapes, grapeInput.trim()] });
      setGrapeInput('');
    }
  };

  const removeGrape = (index: number) => {
    const currentGrapes = Array.isArray(formData.grape) ? formData.grape : [];
    setFormData({
      ...formData,
      grape: currentGrapes.filter((_, i) => i !== index)
    });
  };

  const addPairing = () => {
    const currentPairings = Array.isArray(formData.foodPairing) ? formData.foodPairing : [];
    if (pairingInput.trim() && !currentPairings.includes(pairingInput.trim())) {
      setFormData({ ...formData, foodPairing: [...currentPairings, pairingInput.trim()] });
      setPairingInput('');
    }
  };

  const removePairing = (index: number) => {
    const currentPairings = Array.isArray(formData.foodPairing) ? formData.foodPairing : [];
    setFormData({
      ...formData,
      foodPairing: currentPairings.filter((_, i) => i !== index)
    });
  };

  const wineTypes: WineType[] = ['Red', 'White', 'Rosé', 'Sparkling', 'Natural Red', 'Natural White', 'Pet Nat', 'Orange', 'Sato', 'Sake'];

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#FBF9F5] shadow-[-16px_0px_48px_rgba(28,25,23,0.15)] z-[60] overflow-y-auto border-l border-[#EBE7DF] text-stone-900 pointer-events-auto"
    >
      <div className="p-8 md:p-10">
        <div className="flex justify-between items-center mb-8 border-b border-[#EBE7DF] pb-4">
          <div className="flex-1">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#5A1E24] tracking-tight">
              {bottle ? 'Update Profile' : 'New Cellar Entry'}
            </h2>
            <p className="text-xs uppercase tracking-wider font-semibold text-[#722F37] mt-1">Wine & Sensory Ledger</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2.5 bg-white hover:bg-[#F7F5F0] rounded-xl border border-[#E5E0D8] text-stone-600 hover:text-stone-900 transition-all cursor-pointer shadow-xs"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Bottle/Estate Name</label>
            <input
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white border border-[#E5E0D8] rounded-xl px-4 py-2.5 text-stone-900 font-semibold text-lg focus:outline-none focus:border-[#722F37] focus:ring-1 focus:ring-[#722F37]/30 transition-all placeholder:text-stone-400"
              placeholder="e.g. Château Margaux"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Producer</label>
              <input
                required
                value={formData.producer}
                onChange={e => setFormData({ ...formData, producer: e.target.value })}
                className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3.5 py-2 text-stone-900 font-medium focus:outline-none focus:border-[#722F37] transition-all text-xs"
                placeholder="Estate Name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Vintage (NV or Year)</label>
              <input
                required
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: e.target.value })}
                className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3.5 py-2 text-stone-900 font-mono font-medium focus:outline-none focus:border-[#722F37] transition-all text-xs"
                placeholder="2018 or NV"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Classification</label>
            <div className="flex flex-wrap gap-2">
              {wineTypes.map(t => {
                const typeConfig = WINE_TYPE_CONFIG[t] || { text: 'text-[#800020]', bg: 'bg-[#FDF2F4]', border: 'border border-[#F5C2CB]' };
                const isSelected = formData.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: t })}
                    className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? `${typeConfig.bg} ${typeConfig.text} ${typeConfig.border} shadow-xs font-bold -translate-y-0.5`
                        : 'bg-white text-stone-600 border-[#E5E0D8] hover:bg-[#F7F5F0]'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Region</label>
              <input
                value={formData.region}
                onChange={e => setFormData({ ...formData, region: e.target.value })}
                className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3.5 py-2 text-stone-900 font-medium focus:outline-none focus:border-[#722F37] transition-all text-xs"
                placeholder="e.g. Bordeaux"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Country</label>
              <input
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3.5 py-2 text-stone-900 font-medium focus:outline-none focus:border-[#722F37] transition-all text-xs"
                placeholder="e.g. France"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Grape Varieties</label>
              <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                {Array.isArray(formData.grape) && formData.grape.map((g, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F3] border border-[#EBE7DF] rounded-lg text-xs font-medium text-stone-700">
                    {g}
                    <button 
                      type="button" 
                      onClick={() => removeGrape(i)}
                      className="hover:text-[#722F37] cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="relative flex gap-2">
                <input
                  value={grapeInput}
                  onChange={e => setGrapeInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addGrape();
                    }
                  }}
                  className="flex-1 bg-white border border-[#E5E0D8] rounded-xl px-3.5 py-2 text-stone-900 font-medium text-xs focus:outline-none focus:border-[#722F37] transition-all"
                  placeholder="Type a variety and press Enter"
                />
                <button
                  type="button"
                  onClick={addGrape}
                  className="px-3 rounded-xl border border-[#E5E0D8] bg-[#F7F5F0] hover:bg-[#EBE7DF] text-stone-700 font-semibold cursor-pointer"
                >
                  <Plus size={16} />
                </button>
                {grapeInput.trim() && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#EBE7DF] rounded-xl z-50 max-h-36 overflow-y-auto shadow-xl scroll-hide">
                    {grapes
                      .filter(g => g.name.toLowerCase().includes(grapeInput.toLowerCase()) && !(formData.grape || []).includes(g.name))
                      .map(g => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, grape: [...(formData.grape || []), g.name] });
                            setGrapeInput('');
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-medium text-stone-800 hover:bg-[#FDF2F4] hover:text-[#722F37] transition-colors border-b border-[#F2EFE9] last:border-0 cursor-pointer"
                        >
                          {g.name} <span className="opacity-50 text-[10px] ml-2">({(g.locations || [])[0] || 'Unknown'})</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Price (฿)</label>
              <input
                type="number"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3.5 py-2 text-stone-900 font-mono font-medium focus:outline-none focus:border-[#722F37] transition-all text-xs"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Bottle Photo & AI Scanner</label>
              
              <div 
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`w-full group cursor-pointer h-48 border border-dashed border-[#D6CFBF] bg-[#FAF8F3] rounded-2xl flex flex-col items-center justify-center overflow-hidden relative transition-all hover:bg-white hover:border-[#722F37]/50 ${
                  isUploading ? 'opacity-50 cursor-wait' : ''
                }`}
              >
                {isUploading || isAnalyzing ? (
                  <div className="flex flex-col items-center gap-3 text-stone-800">
                    <Loader2 size={30} className="animate-spin text-[#722F37]" />
                    <span className="text-xs uppercase tracking-wider font-semibold text-stone-800">
                      {isUploading && !isAnalyzing ? 'Uploading to cloud...' : isAnalyzing ? 'AI Analyzing Label...' : 'Processing...'}
                    </span>
                    {isAnalyzing && (
                      <p className="text-[10px] text-stone-500 font-medium animate-pulse">Extracting Producer, Year, Region & Tasting Notes...</p>
                    )}
                  </div>
                ) : formData.imageUrl ? (
                  <>
                    <img 
                      src={formData.imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex flex-col items-center gap-2">
                        <Camera size={24} className="text-white" />
                        <span className="text-xs uppercase tracking-wider font-semibold text-white bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">Replace Photo</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-stone-600">
                    <div className="p-3 bg-white border border-[#E5E0D8] rounded-xl group-hover:border-[#722F37]/40 shadow-xs transition-all">
                      <Upload size={22} className="text-stone-600 group-hover:text-[#722F37]" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-wider font-semibold text-stone-800">Upload Wine Photo</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Click or drag & drop</p>
                    </div>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden" 
                  accept="image/*"
                />
              </div>

              {uploadError && (
                <div className="mt-2 p-3 bg-[#FDF2F4] border border-[#F5C2CB] rounded-xl flex gap-2 items-start text-[#800020]">
                  <Info size={16} className="text-[#800020] mt-0.5 shrink-0" />
                  <p className="text-xs font-normal leading-relaxed">{uploadError}</p>
                </div>
              )}

              <div className="mt-2 text-xs flex items-center justify-between">
                <span className="text-stone-400 font-medium">Portrait orientation recommended</span>
                <div className="flex gap-2">
                  {formData.imageUrl && !isUploading && (
                    <button 
                      type="button" 
                      onClick={() => handleAIScan(formData.imageUrl)}
                      disabled={isAnalyzing}
                      className="px-3 py-1.5 rounded-xl font-semibold text-xs tracking-wider cursor-pointer disabled:opacity-50 flex items-center gap-1.5 bg-[#722F37] text-white shadow-xs hover:bg-[#5C242C] transition-colors"
                    >
                      {isAnalyzing ? (
                        <Loader2 size={12} className="animate-spin text-white" />
                      ) : (
                        <Sparkles size={12} className="text-white" />
                      )}
                      {analysisSuccess ? 'Scanned!' : isAnalyzing ? 'Analyzing...' : 'AI Scan Label'}
                    </button>
                  )}
                  {formData.imageUrl && (
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, imageUrl: '' }); }}
                      className="px-3 py-1.5 rounded-xl border border-[#E5E0D8] bg-[#F7F5F0] hover:bg-[#FDF2F4] text-stone-600 hover:text-[#800020] font-semibold text-xs tracking-wider transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Or Paste Image URL</label>
              <input
                type="text"
                value={formData.imageUrl}
                onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3.5 py-2 text-stone-900 text-xs focus:outline-none focus:border-[#722F37]"
                placeholder="https://..."
              />
            </div>
            
            <div className="space-y-4 pt-4 border-t border-[#EBE7DF]">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#722F37]" />
                <label className="text-xs font-semibold uppercase tracking-wider text-[#722F37]">Tasting Diary (Detailed Sensory Profile)</label>
              </div>
              
              <div className="space-y-3 p-4 bg-[#FAF8F3] border border-[#EBE7DF] rounded-xl">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-stone-600 font-semibold">Appearance & Hue</label>
                  <textarea
                    rows={2}
                    value={formData.appearance}
                    onChange={e => setFormData({ ...formData, appearance: e.target.value })}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl p-3 text-xs text-stone-900 focus:outline-none focus:border-[#722F37]"
                    placeholder="Describe the robe, clarity, and intensity..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-stone-600 font-semibold">The Nose (Aromatics)</label>
                  <textarea
                    rows={2}
                    value={formData.nose}
                    onChange={e => setFormData({ ...formData, nose: e.target.value })}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl p-3 text-xs text-stone-900 focus:outline-none focus:border-[#722F37]"
                    placeholder="Primary fruits, secondary fermentation notes, tertiary age..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-stone-600 font-semibold">Palate & Structure</label>
                <textarea
                  rows={2}
                  value={formData.palate}
                  onChange={e => setFormData({ ...formData, palate: e.target.value })}
                  className="w-full bg-white border border-[#E5E0D8] rounded-xl p-3 text-xs text-stone-900 focus:outline-none focus:border-[#722F37]"
                  placeholder="Body, acidity, tannins, alcohol, balance..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-stone-600 font-semibold">The Finish</label>
                <textarea
                  rows={2}
                  value={formData.finish}
                  onChange={e => setFormData({ ...formData, finish: e.target.value })}
                  className="w-full bg-white border border-[#E5E0D8] rounded-xl p-3 text-xs text-stone-900 focus:outline-none focus:border-[#722F37]"
                  placeholder="Length, persistence, and final impressions..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-stone-600 font-semibold">Viticulture & Vineyard</label>
                <textarea
                  rows={2}
                  value={formData.viticulture}
                  onChange={e => setFormData({ ...formData, viticulture: e.target.value })}
                  className="w-full bg-white border border-[#E5E0D8] rounded-xl p-3 text-xs text-stone-900 focus:outline-none focus:border-[#722F37]"
                  placeholder="Farming practices, soil type, vine age, elevation, organic/biodynamic..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-stone-600 font-semibold">Wine Making Philosophy</label>
                <textarea
                  rows={2}
                  value={formData.winemakingPhilosophy}
                  onChange={e => setFormData({ ...formData, winemakingPhilosophy: e.target.value })}
                  className="w-full bg-white border border-[#E5E0D8] rounded-xl p-3 text-xs text-stone-900 focus:outline-none focus:border-[#722F37]"
                  placeholder="Fermentation method, oak aging, minimal intervention, wild yeast..."
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wider text-stone-700 font-semibold">Main Tasting Summary</label>
                  <button
                    type="button"
                    disabled={isRefiningNotes || !formData.tastingNotes.trim()}
                    onClick={handleRefineNotes}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl font-semibold text-xs tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[#FAF8F3] border border-[#EBE7DF] text-[#722F37] hover:bg-white shadow-xs"
                    title="Polish raw thoughts or bullets into an editorial paragraph"
                  >
                    {isRefiningNotes ? (
                      <>
                        <Loader2 size={12} className="animate-spin text-[#722F37]" />
                        <span>Refining...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} className="text-[#722F37]" />
                        <span>Refine Notes</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={formData.tastingNotes}
                  onChange={e => setFormData({ ...formData, tastingNotes: e.target.value })}
                  className="w-full bg-white border border-[#E5E0D8] rounded-xl p-3 text-xs text-stone-900 focus:outline-none focus:border-[#722F37]"
                  placeholder="The primary descriptive notes that will appear on the main card..."
                />
                {refineError && (
                  <p className="text-xs text-rose-600 font-medium mt-1">{refineError}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Suggested Food Pairings</label>
              <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                {Array.isArray(formData.foodPairing) && formData.foodPairing.map((p, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-xs font-medium text-[#15803D]">
                    {p}
                    <button 
                      type="button" 
                      onClick={() => removePairing(i)}
                      className="hover:text-red-700 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="relative flex gap-2">
                <input
                  value={pairingInput}
                  onChange={e => setPairingInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addPairing();
                    }
                  }}
                  className="flex-1 bg-white border border-[#E5E0D8] rounded-xl px-3.5 py-2 text-stone-900 font-medium text-xs focus:outline-none focus:border-[#722F37]"
                  placeholder="e.g. Grilled Scallops (Enter to add)"
                />
                <button
                  type="button"
                  onClick={addPairing}
                  className="px-3 rounded-xl border border-[#E5E0D8] bg-[#F7F5F0] hover:bg-[#EBE7DF] text-stone-700 font-semibold cursor-pointer"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">Personal Notes / Storage Location</label>
              <textarea
                rows={2}
                value={formData.additionalNote}
                onChange={e => setFormData({ ...formData, additionalNote: e.target.value })}
                className="w-full bg-white border border-[#E5E0D8] rounded-xl p-3 text-xs text-stone-900 focus:outline-none focus:border-[#722F37]"
                placeholder="Rack B2, purchased from importer, opened for anniversary..."
              />
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={isUploading || isSaving}
              className={`w-full bg-[#722F37] hover:bg-[#5C242C] text-white rounded-xl py-3.5 font-semibold tracking-wider uppercase text-xs cursor-pointer flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-98 ${(isUploading || isSaving) ? 'opacity-50 cursor-wait' : ''}`}
            >
              {(isUploading || isSaving) && <Loader2 size={15} className="animate-spin text-white" />}
              {isUploading ? 'Processing Photo...' : isSaving ? 'Saving to Diary...' : 'Commit to Diary'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

// --- Cache Helpers for Stale-While-Revalidate Instant Loading ---
const BOTTLES_CACHE_KEY = 'bottle_diary_active_bottles_cache';
const GRAPES_CACHE_KEY = 'bottle_diary_active_grapes_cache';
const LAST_UID_KEY = 'bottle_diary_last_uid';
const USER_BOTTLES_KEY_PREFIX = 'bottle_diary_user_bottles_';
const USER_GRAPES_KEY_PREFIX = 'bottle_diary_user_grapes_';
const GUEST_BOTTLES_KEY = 'bottle_diary_guest_bottles';
const GUEST_GRAPES_KEY = 'bottle_diary_guest_grapes';

const loadCachedBottles = (uid?: string | null): WineBottle[] => {
  try {
    if (typeof window === 'undefined') return DEMO_BOTTLES;

    let bestCandidate: WineBottle[] = [];

    const testCandidate = (raw: string | null) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validBottles = parsed.filter(item => 
            item && typeof item === 'object' && ('name' in item || 'producer' in item || 'region' in item || 'type' in item)
          );
          if (validBottles.length > bestCandidate.length) {
            bestCandidate = validBottles as WineBottle[];
          }
        }
      } catch {}
    };

    // 1. Direct user UID keys
    if (uid) {
      testCandidate(localStorage.getItem(`${USER_BOTTLES_KEY_PREFIX}${uid}`));
    }
    const lastUid = localStorage.getItem(LAST_UID_KEY);
    if (lastUid) {
      testCandidate(localStorage.getItem(`${USER_BOTTLES_KEY_PREFIX}${lastUid}`));
    }

    // 2. Standard keys
    testCandidate(localStorage.getItem(BOTTLES_CACHE_KEY));
    testCandidate(localStorage.getItem(GUEST_BOTTLES_KEY));

    // 3. Known legacy and alternate keys across versions
    const knownKeys = [
      'bottles',
      'wines',
      'cellar_wines',
      'wine_collection',
      'bottle_diary_bottles',
      'sommelier_bottles',
      'wine_cellar',
      'my_wines',
      'wine_bottles',
      'saved_bottles',
      'user_bottles'
    ];
    for (const key of knownKeys) {
      testCandidate(localStorage.getItem(key));
    }

    // 4. Exhaustive scan across every key in localStorage to restore bottles if stored under another key
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        testCandidate(localStorage.getItem(key));
      }
    }

    if (bestCandidate.length > 0) {
      return bestCandidate;
    }
    return DEMO_BOTTLES;
  } catch {
    return DEMO_BOTTLES;
  }
};

const loadCachedGrapes = (uid?: string | null): GrapeVariety[] => {
  try {
    if (typeof window === 'undefined') return DEMO_GRAPES;

    let bestCandidate: GrapeVariety[] = [];

    const testCandidate = (raw: string | null) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validGrapes = parsed.filter(item => 
            item && typeof item === 'object' && ('name' in item || 'skin' in item || 'aromaFlavor' in item || 'locations' in item)
          );
          if (validGrapes.length > bestCandidate.length) {
            bestCandidate = validGrapes as GrapeVariety[];
          }
        }
      } catch {}
    };

    if (uid) {
      testCandidate(localStorage.getItem(`${USER_GRAPES_KEY_PREFIX}${uid}`));
    }
    const lastUid = localStorage.getItem(LAST_UID_KEY);
    if (lastUid) {
      testCandidate(localStorage.getItem(`${USER_GRAPES_KEY_PREFIX}${lastUid}`));
    }

    testCandidate(localStorage.getItem(GRAPES_CACHE_KEY));
    testCandidate(localStorage.getItem(GUEST_GRAPES_KEY));

    const knownKeys = [
      'grapes',
      'grape_varieties',
      'bottle_diary_grapes',
      'my_grapes',
      'saved_grapes',
      'user_grapes'
    ];
    for (const key of knownKeys) {
      testCandidate(localStorage.getItem(key));
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        testCandidate(localStorage.getItem(key));
      }
    }

    if (bestCandidate.length > 0) {
      return bestCandidate;
    }
    return DEMO_GRAPES;
  } catch {
    return DEMO_GRAPES;
  }
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [authLoading, setAuthLoading] = useState(true);
  const [isCloudSyncLoading, setIsCloudSyncLoading] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [isQuotaDismissed, setIsQuotaDismissed] = useState(false);
  const hasFetchedUserRef = useRef<string | null>(null);
  
  // Local guest reserve state so unauthenticated or cookie-blocked users can fully explore the app
  const [guestBottles, setGuestBottles] = useState<WineBottle[]>(() => {
    try {
      const saved = localStorage.getItem(GUEST_BOTTLES_KEY);
      return saved ? JSON.parse(saved) : DEMO_BOTTLES;
    } catch {
      return DEMO_BOTTLES;
    }
  });

  const [guestGrapes, setGuestGrapes] = useState<GrapeVariety[]>(() => {
    try {
      const saved = localStorage.getItem(GUEST_GRAPES_KEY);
      return saved ? JSON.parse(saved) : DEMO_GRAPES;
    } catch {
      return DEMO_GRAPES;
    }
  });

  // Pre-initialize firestoreBottles with cached data from localStorage so cards & numbers render with 0ms delay
  const [firestoreBottles, setFirestoreBottles] = useState<WineBottle[]>(() => {
    const lastUid = typeof window !== 'undefined' ? localStorage.getItem(LAST_UID_KEY) : null;
    return loadCachedBottles(lastUid);
  });
  const [firestoreGrapes, setFirestoreGrapes] = useState<GrapeVariety[]>(() => {
    const lastUid = typeof window !== 'undefined' ? localStorage.getItem(LAST_UID_KEY) : null;
    return loadCachedGrapes(lastUid);
  });

  // Seamlessly switch: if user is signed in, use their private Firestore collection. Otherwise, use guest bottles.
  // Robust fallback: if the active array is empty, always check and load from cached wines in localStorage
  const bottles = useMemo(() => {
    const primary = user ? firestoreBottles : guestBottles;
    if (primary && primary.length > 0) return primary;
    const fallback = loadCachedBottles(user?.uid);
    if (fallback && fallback.length > 0) return fallback;
    return primary || [];
  }, [user, firestoreBottles, guestBottles]);

  const grapes = useMemo(() => {
    const primary = user ? firestoreGrapes : guestGrapes;
    if (primary && primary.length > 0) return primary;
    const fallback = loadCachedGrapes(user?.uid);
    if (fallback && fallback.length > 0) return fallback;
    return primary || [];
  }, [user, firestoreGrapes, guestGrapes]);

  // Stale-While-Revalidate loading check: only true if data is still fetching AND cache is empty
  const isDataLoading = (authLoading || (!!user && isCloudSyncLoading)) && bottles.length === 0;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        try {
          localStorage.setItem(LAST_UID_KEY, u.uid);
          const cachedBottles = loadCachedBottles(u.uid);
          if (cachedBottles && cachedBottles.length > 0) {
            setFirestoreBottles(cachedBottles);
          }
          const cachedGrapes = loadCachedGrapes(u.uid);
          if (cachedGrapes && cachedGrapes.length > 0) {
            setFirestoreGrapes(cachedGrapes);
          }
        } catch {}
      } else {
        try {
          localStorage.removeItem(LAST_UID_KEY);
        } catch {}
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsCloudSyncLoading(false);
      hasFetchedUserRef.current = null;
      return;
    }

    // Only fetch once per user session to avoid continuous reads & hitting quota limits
    if (hasFetchedUserRef.current === user.uid) {
      return;
    }

    hasFetchedUserRef.current = user.uid;
    setIsCloudSyncLoading(true);

    const fetchCollectionsOnce = async () => {
      try {
        const qBottles = query(
          collection(db, 'bottles'),
          where('userId', '==', user.uid),
          limit(200)
        );

        const qGrapes = query(
          collection(db, 'grapes'),
          where('userId', '==', user.uid),
          limit(200)
        );

        const [bottlesSnap, grapesSnap] = await Promise.all([
          getDocs(qBottles),
          getDocs(qGrapes)
        ]);

        const freshBottles = bottlesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id })) as WineBottle[];
        const freshGrapes = grapesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id })) as GrapeVariety[];

        if (freshBottles.length > 0) {
          setFirestoreBottles(freshBottles);
          try {
            localStorage.setItem(`${USER_BOTTLES_KEY_PREFIX}${user.uid}`, JSON.stringify(freshBottles));
            localStorage.setItem(BOTTLES_CACHE_KEY, JSON.stringify(freshBottles));
          } catch {}
        } else {
          // If Firestore returns 0 items (e.g. fresh DB index or quota), preserve existing cached wines
          const existingCached = loadCachedBottles(user.uid);
          if (existingCached.length > 0) {
            setFirestoreBottles(existingCached);
          }
        }

        if (freshGrapes.length > 0) {
          setFirestoreGrapes(freshGrapes);
          try {
            localStorage.setItem(`${USER_GRAPES_KEY_PREFIX}${user.uid}`, JSON.stringify(freshGrapes));
            localStorage.setItem(GRAPES_CACHE_KEY, JSON.stringify(freshGrapes));
          } catch {}
        } else {
          const existingCachedGrapes = loadCachedGrapes(user.uid);
          if (existingCachedGrapes.length > 0) {
            setFirestoreGrapes(existingCachedGrapes);
          }
        }

        setIsCloudSyncLoading(false);
      } catch (error) {
        setIsCloudSyncLoading(false);
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource-exhausted')) {
          setQuotaExceeded(true);
        }
        // Always ensure local state is populated with cache on error
        const cachedB = loadCachedBottles(user.uid);
        if (cachedB.length > 0) {
          setFirestoreBottles(cachedB);
        }
        const cachedG = loadCachedGrapes(user.uid);
        if (cachedG.length > 0) {
          setFirestoreGrapes(cachedG);
        }
        console.warn('Initial Firestore query read notice (local cache active):', error);
      }
    };

    fetchCollectionsOnce();
  }, [user]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGrapeFormOpen, setIsGrapeFormOpen] = useState(false);
  const [editingBottle, setEditingBottle] = useState<WineBottle | undefined>();
  const [editingGrape, setEditingGrape] = useState<GrapeVariety | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<WineType | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [sortByGrapes, setSortByGrapes] = useState<'name' | 'type' | 'newest'>('newest');
  const [selectedGrapesForComparison, setSelectedGrapesForComparison] = useState<string[]>([]);
  const [isComparingGrapes, setIsComparingGrapes] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedBottleForDetail, setSelectedBottleForDetail] = useState<WineBottle | null>(null);

  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 100000 });
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedGrapes, setSelectedGrapes] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [view, setView] = useState<'home' | 'cellar' | 'explore' | 'profile' | 'stats' | 'wine-of-the-day' | 'grapes' | 'tutor'>('home');
  const [exploreTab, setExploreTab] = useState<'map' | 'grapes' | 'tutor'>('map');
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [statsSubTab, setStatsSubTab] = useState<'bottles' | 'grapes'>('bottles');
  const [selectedAnalysisCountry, setSelectedAnalysisCountry] = useState<string | null>(null);
  const [selectedAnalysisRegion, setSelectedAnalysisRegion] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'bottle' | 'grape' } | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Prevent background scrolling while modal or sheet is open
  useEffect(() => {
    if (isFormOpen || isGrapeFormOpen || itemToDelete || selectedBottleForDetail) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isFormOpen, isGrapeFormOpen, itemToDelete, selectedBottleForDetail]);

  // AI Wine Tutor States
  const [quizQuestion, setQuizQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [isQuizLoading, setIsQuizLoading] = useState<boolean>(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [totalQuizAnswered, setTotalQuizAnswered] = useState<number>(0);

  const fetchNewQuizQuestion = async () => {
    setIsQuizLoading(true);
    setQuizError(null);
    setSelectedAnswer(null);
    setIsAnswerRevealed(false);

    // 6-second timeout to seamlessly fall back if the request takes too long
    let timeoutId: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Timeout"));
      }, 6000);
    });

    try {
      const fetchPromise = generateQuizQuestion();
      const question = await Promise.race([fetchPromise, timeoutPromise]);
      clearTimeout(timeoutId);
      setQuizQuestion(question);
    } catch (err: any) {
      console.warn("Failed to generate or load quiz question, using fallback:", err);
      clearTimeout(timeoutId);
      
      // Select a random premium fallback question different from the current one if possible
      const filtered = FALLBACK_QUESTIONS.filter(q => q.question !== quizQuestion?.question);
      const candidates = filtered.length > 0 ? filtered : FALLBACK_QUESTIONS;
      const randomQuestion = candidates[Math.floor(Math.random() * candidates.length)];
      setQuizQuestion(randomQuestion);
    } finally {
      setIsQuizLoading(false);
    }
  };

  const availableGrapes = useMemo(() => {
    const fromBottles = bottles.flatMap(b => b.grape || []);
    const fromGrapes = grapes.map(g => g.name);
    return Array.from(new Set([...fromBottles, ...fromGrapes])).filter(Boolean).sort();
  }, [bottles, grapes]);

  const availableCountries = useMemo(() => {
    return Array.from(new Set(bottles.map(b => b.country).filter(Boolean))).sort();
  }, [bottles]);

  const filteredGrapes = grapes.filter(g => {
    const term = searchQuery.toLowerCase();
    const matchesName = (g.name || '').toLowerCase().includes(term);
    const matchesGeography = (g.locations || []).some(loc => loc.toLowerCase().includes(term));
    const matchesFlavor = (g.aromaFlavor || '').toLowerCase().includes(term);

    return matchesName || matchesGeography || matchesFlavor;
  }).sort((a, b) => {
    switch (sortByGrapes) {
      case 'newest':
        return (b.dateAdded || 0) - (a.dateAdded || 0);
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'type':
        return (a.type || '').localeCompare(b.type || '');
      default:
        return 0;
    }
  });

  const handleToggleCompare = (id: string) => {
    setSelectedGrapesForComparison(prev => 
      prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]
    );
  };

  const comparedGrapes = useMemo(() => {
    return selectedGrapesForComparison.map(id => grapes.find(g => g.id === id)).filter(Boolean) as GrapeVariety[];
  }, [selectedGrapesForComparison, grapes]);

  useEffect(() => {
    if (view !== 'grapes') {
      setSelectedGrapesForComparison([]);
    }
  }, [view]);

  useEffect(() => {
    if (view === 'tutor' && !quizQuestion) {
      fetchNewQuizQuestion();
    }
  }, [view, quizQuestion]);

  const handleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Login failed:", error);
      const msg = error?.message || '';
      if (error.code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setAuthError(`Domain "${window.location.hostname}" is not authorized yet in Firebase. You can continue previewing all features in Guest Reserve mode.`);
      } else if (error.code === 'auth/popup-blocked') {
        setAuthError("Login popup was blocked by your browser. Please allow popups or open this app directly in a full browser tab.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        setAuthError("The sign-in window was closed. Try opening the application in a new tab to bypass iframe pop-up limits.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        setAuthError("A sign-in request is already pending. Please wait a moment.");
      } else if (msg.includes('401') || msg.includes('malformed') || error.code === 'auth/internal-error') {
        setAuthError("Google authentication in this preview frame encountered a cookie/origin restriction (401). Open the app in a new tab or continue exploring in Guest Reserve Mode.");
      } else {
        setAuthError(error.message || "An unexpected error occurred during login. You can continue exploring in Guest Reserve mode.");
      }
    }
  };

  const wineOfTheDay = useMemo(() => {
    if (bottles.length === 0) return null;
    
    // Use current date as seed for consistent daily selection
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    // Pseudo-random index based on seed
    const index = seed % bottles.length;
    return bottles[index];
  }, [bottles]);

  const topVarietals = useMemo(() => {
    const counts: Record<string, { count: number }> = {};
    bottles.forEach(b => {
      (b.grape || []).forEach(g => {
        if (!counts[g]) counts[g] = { count: 0 };
        counts[g].count += 1;
      });
    });
    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [bottles]);

  const distinctRegionsCount = useMemo(() => {
    const regions = bottles.map(b => b.region).filter(Boolean);
    return new Set(regions).size || availableCountries.length;
  }, [bottles, availableCountries]);

  const favoritesCount = useMemo(() => {
    return bottles.filter(b => (b.price || 0) >= 3000 || (b.tastingNotes && b.tastingNotes.length > 80)).length;
  }, [bottles]);

  const handleCreateOrUpdate = async (data: Omit<WineBottle, 'id' | 'dateAdded'>) => {
    if (!user) {
      // Guest mode local storage commit
      if (editingBottle) {
        setGuestBottles(prev => {
          const updated = prev.map(b => b.id === editingBottle.id ? { ...b, ...data } : b);
          try {
            localStorage.setItem('bottle_diary_guest_bottles', JSON.stringify(updated));
            localStorage.setItem(BOTTLES_CACHE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      } else {
        const newBottle: WineBottle = {
          ...data,
          id: 'guest-' + Math.random().toString(36).substr(2, 9),
          dateAdded: Date.now(),
          userId: 'guest'
        };
        setGuestBottles(prev => {
          const updated = [newBottle, ...prev];
          try {
            localStorage.setItem('bottle_diary_guest_bottles', JSON.stringify(updated));
            localStorage.setItem(BOTTLES_CACHE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
      setIsFormOpen(false);
      setEditingBottle(undefined);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
      return;
    }

    try {
      console.log("Committing wine record:", { ...data, hasImage: !!data.imageUrl });
      if (editingBottle) {
        setFirestoreBottles(prev => {
          const updated = prev.map(b => b.id === editingBottle.id ? { ...b, ...data, lastUpdated: Date.now() } : b);
          try {
            localStorage.setItem(`${USER_BOTTLES_KEY_PREFIX}${user.uid}`, JSON.stringify(updated));
            localStorage.setItem(BOTTLES_CACHE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });

        setIsFormOpen(false);
        setEditingBottle(undefined);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 4000);

        const bottleRef = doc(db, 'bottles', editingBottle.id);
        await updateDoc(bottleRef, {
          ...data,
          lastUpdated: Date.now(),
          userId: user.uid
        });
      } else {
        const bottleId = Math.random().toString(36).substr(2, 9);
        const newBottle: WineBottle = {
          ...data,
          id: bottleId,
          dateAdded: Date.now(),
          userId: user.uid
        };

        setFirestoreBottles(prev => {
          const updated = [newBottle, ...prev];
          try {
            localStorage.setItem(`${USER_BOTTLES_KEY_PREFIX}${user.uid}`, JSON.stringify(updated));
            localStorage.setItem(BOTTLES_CACHE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });

        setIsFormOpen(false);
        setEditingBottle(undefined);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 4000);

        const bottleRef = doc(db, 'bottles', bottleId);
        await setDoc(bottleRef, newBottle);
      }
    } catch (error) {
      console.warn("Background wine persistence note (local state preserved):", error);
    }
  };

  const handleCreateOrUpdateGrape = async (data: Omit<GrapeVariety, 'id' | 'dateAdded' | 'userId'>) => {
    if (!user) {
      if (editingGrape) {
        setGuestGrapes(prev => {
          const updated = prev.map(g => g.id === editingGrape.id ? { ...g, ...data } : g);
          try { localStorage.setItem('bottle_diary_guest_grapes', JSON.stringify(updated)); } catch {}
          return updated;
        });
      } else {
        const newGrape: GrapeVariety = {
          ...data,
          id: 'guest-grape-' + Math.random().toString(36).substr(2, 9),
          dateAdded: Date.now(),
          userId: 'guest'
        };
        setGuestGrapes(prev => {
          const updated = [newGrape, ...prev];
          try { localStorage.setItem('bottle_diary_guest_grapes', JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
      setIsGrapeFormOpen(false);
      setEditingGrape(undefined);
      return;
    }

    try {
      if (editingGrape) {
        setFirestoreGrapes(prev => {
          const updated = prev.map(g => g.id === editingGrape.id ? { ...g, ...data } : g);
          try {
            localStorage.setItem(`${USER_GRAPES_KEY_PREFIX}${user.uid}`, JSON.stringify(updated));
            localStorage.setItem(GRAPES_CACHE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setIsGrapeFormOpen(false);
        setEditingGrape(undefined);

        const grapeRef = doc(db, 'grapes', editingGrape.id);
        await updateDoc(grapeRef, { ...data, userId: user.uid });
      } else {
        const grapeId = Math.random().toString(36).substr(2, 9);
        const newGrape: GrapeVariety = {
          ...data,
          id: grapeId,
          dateAdded: Date.now(),
          userId: user.uid
        };
        setFirestoreGrapes(prev => {
          const updated = [newGrape, ...prev];
          try {
            localStorage.setItem(`${USER_GRAPES_KEY_PREFIX}${user.uid}`, JSON.stringify(updated));
            localStorage.setItem(GRAPES_CACHE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setIsGrapeFormOpen(false);
        setEditingGrape(undefined);

        const grapeRef = doc(db, 'grapes', grapeId);
        await setDoc(grapeRef, newGrape);
      }
    } catch (error) {
      console.warn("Background grape persistence note (local state preserved):", error);
    }
  };

  const handleDeleteBottle = (id: string) => {
    setItemToDelete({ id, type: 'bottle' });
  };

  const handleDeleteGrape = (id: string) => {
    setItemToDelete({ id, type: 'grape' });
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const { id, type } = itemToDelete;
    
    if (!user) {
      if (type === 'bottle') {
        setGuestBottles(prev => {
          const updated = prev.filter(b => b.id !== id);
          try {
            localStorage.setItem('bottle_diary_guest_bottles', JSON.stringify(updated));
            localStorage.setItem(BOTTLES_CACHE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      } else {
        setGuestGrapes(prev => {
          const updated = prev.filter(g => g.id !== id);
          try {
            localStorage.setItem('bottle_diary_guest_grapes', JSON.stringify(updated));
            localStorage.setItem(GRAPES_CACHE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
      setItemToDelete(null);
      return;
    }

    if (type === 'bottle') {
      setFirestoreBottles(prev => {
        const updated = prev.filter(b => b.id !== id);
        try {
          localStorage.setItem(`${USER_BOTTLES_KEY_PREFIX}${user.uid}`, JSON.stringify(updated));
          localStorage.setItem(BOTTLES_CACHE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } else {
      setFirestoreGrapes(prev => {
        const updated = prev.filter(g => g.id !== id);
        try {
          localStorage.setItem(`${USER_GRAPES_KEY_PREFIX}${user.uid}`, JSON.stringify(updated));
          localStorage.setItem(GRAPES_CACHE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
    setItemToDelete(null);
    
    try {
      await deleteDoc(doc(db, type === 'bottle' ? 'bottles' : 'grapes', id));
    } catch (error) {
      console.warn("Background deletion note (local state preserved):", error);
    }
  };

  const wineTypes: WineType[] = ['Red', 'White', 'Rosé', 'Sparkling', 'Natural Red', 'Natural White', 'Pet Nat', 'Orange', 'Sato', 'Sake'];

  const filteredBottles = bottles
    .filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            b.producer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (b.region || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (b.country || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (b.grape || []).some(g => g.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = activeFilter === 'All' || b.type === activeFilter;
      
      const price = b.price || 0;
      const matchesPrice = price >= priceRange.min && price <= priceRange.max;
      
      const dateAdded = b.dateAdded;
      const startDate = dateRange.start ? new Date(dateRange.start).getTime() : 0;
      const endDate = dateRange.end ? new Date(dateRange.end).getTime() + 86399999 : Infinity; // End of the day
      const matchesDate = dateAdded >= startDate && dateAdded <= endDate;

      const matchesGrapes = selectedGrapes.length === 0 || 
                            (b.grape || []).some(g => selectedGrapes.includes(g));

      const matchesCountries = selectedCountries.length === 0 || 
                               selectedCountries.includes(b.country);

      return matchesSearch && matchesType && matchesPrice && matchesDate && matchesGrapes && matchesCountries;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return b.dateAdded - a.dateAdded;
        case 'year': 
          if (a.year === 'NV' && b.year === 'NV') return 0;
          if (a.year === 'NV') return 1;
          if (b.year === 'NV') return -1;
          return parseInt(b.year) - parseInt(a.year);
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

  const stats = {
    total: bottles.length,
    topCountry: bottles.length > 0 ? Object.entries(
      bottles.reduce((acc: Record<string, number>, b) => {
        if (!b.country) return acc;
        acc[b.country] = (acc[b.country] || 0) + 1;
        return acc;
      }, {})
    ).sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0]?.[0] || 'Unknown' : 'None'
  };

  const typeData = Object.entries(
    bottles.reduce((acc: Record<string, number>, b) => {
      acc[b.type] = (acc[b.type] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const regionData = Object.entries(
    bottles.reduce((acc: Record<string, number>, b) => {
      const region = b.region || 'Unknown';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  const cellarGrowthData = useMemo(() => {
    const sortedBottles = [...bottles].sort((a, b) => a.dateAdded - b.dateAdded);
    const growth: any[] = [];
    let cumulative = 0;

    sortedBottles.forEach(b => {
      const date = new Date(b.dateAdded);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      cumulative += 1;
      
      const existing = growth.find(item => item.name === monthYear);
      if (existing) {
        existing.count = cumulative;
      } else {
        growth.push({ name: monthYear, count: cumulative });
      }
    });

    return growth;
  }, [bottles]);

  const priceDistributionData = useMemo(() => {
    const ranges = [
      { name: '< ฿500', min: 0, max: 499, value: 0 },
      { name: '฿500-1k', min: 500, max: 999, value: 0 },
      { name: '฿1k-2k', min: 1000, max: 1999, value: 0 },
      { name: '฿2k-5k', min: 2000, max: 4999, value: 0 },
      { name: '฿5k+', min: 5000, max: Infinity, value: 0 },
    ];

    bottles.forEach(b => {
      const price = b.price || 0;
      const range = ranges.find(r => price >= r.min && price <= r.max);
      if (range) range.value += 1;
    });

    return ranges;
  }, [bottles]);

  const grapeGeographyData = useMemo(() => {
    const countries: Record<string, { regionMap: Record<string, Set<string>>; grapes: Set<string> }> = {};
    
    grapes.forEach(g => {
      const locations = Array.isArray(g.locations) ? g.locations : [];
      
      locations.forEach(loc => {
        const parts = loc.split('/').map(p => p.trim());
        let country = 'Unknown';
        let region = '';

        if (parts.length >= 2) {
          country = parts[1];
          region = parts[0];
        } else if (parts.length === 1 && parts[0]) {
          country = parts[0];
          region = 'General';
        }

        if (country) {
          if (!countries[country]) {
            countries[country] = { regionMap: {}, grapes: new Set() };
          }
          
          if (region) {
            if (!countries[country].regionMap[region]) {
              countries[country].regionMap[region] = new Set();
            }
            countries[country].regionMap[region].add(g.name);
          }
          if (g.name) countries[country].grapes.add(g.name);
        }
      });
    });

    return Object.entries(countries).map(([name, data]) => ({
      name,
      total: Object.keys(data.regionMap).length,
      regionMap: Object.entries(data.regionMap).map(([regionName, grapeSet]) => ({
        name: regionName,
        grapes: Array.from(grapeSet)
      })).sort((a, b) => a.name.localeCompare(b.name)),
      grapes: Array.from(data.grapes).sort()
    })).sort((a, b) => b.total - a.total);
  }, [grapes]);

  const grapeTypeData = useMemo(() => {
    const counts: Record<string, number> = { Red: 0, White: 0 };
    (grapes || []).forEach(g => {
      const gType = g?.type === 'White' ? 'White' : 'Red';
      counts[gType] = (counts[gType] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  }, [grapes]);

  const COLORS = ['#e11d48', '#d97706', '#059669', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-[#EBE7DF] p-3 rounded-xl shadow-lg text-stone-900">
          <p className="text-[10px] uppercase tracking-wider text-[#722F37] font-bold mb-1">{label || payload[0].payload.name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs text-stone-700 font-medium flex items-center justify-between gap-4">
              <span className="text-stone-500">{entry.name}:</span>
              <span className="font-semibold text-stone-900">
                {entry.name === 'price' ? `฿${entry.value.toLocaleString()}` : entry.value}
              </span>
            </p>
          ))}
          {payload[0].payload.type && (
            <p className="text-[9px] mt-1 text-stone-400 font-semibold uppercase">Classification: {payload[0].payload.type}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-900 font-sans flex flex-col relative selection:bg-[#722F37]/20 selection:text-[#722F37]">
      {/* Top Header */}
      <TopHeader
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isFilterExpanded={isFilterExpanded}
        onToggleFilter={() => setIsFilterExpanded(!isFilterExpanded)}
        onOpenMenu={() => setIsNavDrawerOpen(true)}
      />

      {/* Slide-out Navigation Drawer */}
      <NavigationDrawer
        isOpen={isNavDrawerOpen}
        onClose={() => setIsNavDrawerOpen(false)}
        user={user}
        onLogin={handleLogin}
        onLogout={logout}
        onNavigate={(v) => {
          if (v === 'grapes') {
            setView('explore');
            setExploreTab('grapes');
          } else if (v === 'tutor') {
            setView('explore');
            setExploreTab('tutor');
          } else if (v === 'stats') {
            setView('profile');
          } else {
            setView(v as any);
          }
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 pb-16 md:pb-12 relative">
        {/* Firestore Quota Exceeded Notification Banner */}
        <AnimatePresence>
          {quotaExceeded && !isQuotaDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-2xl bg-amber-50/95 border border-amber-200 text-amber-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 font-bold text-xs">
                  ⚡
                </div>
                <div>
                  <h4 className="text-xs font-serif font-bold tracking-wide uppercase text-amber-950">
                    Daily Cloud Read Quota Reached — Offline Local Cellar Active
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Your cellar is fully available through local offline cache. Live cloud syncing will automatically resume when the free daily quota resets tomorrow, or you can enable billing to remove limits.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <a
                  href="https://console.firebase.google.com/project/gen-lang-client-0599289351/firestore/databases/ai-studio-2da4c897-3845-4771-94e8-24391e141580/data?openUpgradeDialog=true"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-amber-900 hover:bg-amber-950 text-amber-50 text-[11px] font-medium tracking-wide transition shadow-xs cursor-pointer"
                >
                  Upgrade in Console
                </a>
                <button
                  onClick={() => setIsQuotaDismissed(true)}
                  className="px-2.5 py-1.5 rounded-lg text-amber-800 hover:bg-amber-100 transition cursor-pointer text-xs font-semibold flex items-center gap-1 border border-amber-300/60"
                  title="Dismiss banner"
                >
                  <span>✕</span>
                  <span>Dismiss</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detailed Filter Expandable Panel */}
        <AnimatePresence>
          {isFilterExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-sm space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-[#EBE7DF] pb-2">
                <h4 className="text-xs font-serif font-bold text-stone-900 uppercase tracking-wider">
                  Detailed Cellar Filters
                </h4>
                <button
                  onClick={() => {
                    setActiveFilter('All');
                    setPriceRange({ min: 0, max: 100000 });
                    setDateRange({ start: '', end: '' });
                    setSelectedGrapes([]);
                    setSelectedCountries([]);
                    setSearchQuery('');
                  }}
                  className="text-xs text-[#722F37] font-semibold hover:underline cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-stone-800">
                {/* Price */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold text-stone-500">Price Range (฿)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({ ...priceRange, min: parseInt(e.target.value) || 0 })}
                      className="w-full bg-[#FAF8F3] border border-[#E5E0D8] rounded-lg p-2 text-xs text-stone-900"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: parseInt(e.target.value) || 100000 })}
                      className="w-full bg-[#FAF8F3] border border-[#E5E0D8] rounded-lg p-2 text-xs text-stone-900"
                    />
                  </div>
                </div>
                {/* Dates */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold text-stone-500">Date Added</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="w-full bg-[#FAF8F3] border border-[#E5E0D8] rounded-lg p-1.5 text-[10px] text-stone-900"
                    />
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="w-full bg-[#FAF8F3] border border-[#E5E0D8] rounded-lg p-1.5 text-[10px] text-stone-900"
                    />
                  </div>
                </div>
                {/* Grapes */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold text-stone-500">Varieties</label>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                    {availableGrapes.slice(0, 10).map((g) => (
                      <button
                        key={g}
                        onClick={() => setSelectedGrapes(selectedGrapes.includes(g) ? selectedGrapes.filter(x => x !== g) : [...selectedGrapes, g])}
                        className={`text-[9px] uppercase px-2 py-0.5 rounded-md border font-semibold ${selectedGrapes.includes(g) ? 'bg-[#722F37] text-white border-[#722F37]' : 'bg-[#FAF8F3] text-stone-700 border-[#E5E0D8]'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Countries */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold text-stone-500">Country of Origin</label>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                    {availableCountries.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedCountries(selectedCountries.includes(c) ? selectedCountries.filter(x => x !== c) : [...selectedCountries, c])}
                        className={`text-[9px] uppercase px-2 py-0.5 rounded-md border font-semibold ${selectedCountries.includes(c) ? 'bg-[#722F37] text-white border-[#722F37]' : 'bg-[#FAF8F3] text-stone-700 border-[#E5E0D8]'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!user && (
          <div className="mb-8 p-4 md:p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#722F37]/10 border border-[#722F37]/20 flex items-center justify-center text-[#722F37] shrink-0">
                <Wine size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-900 tracking-wide flex items-center gap-2">
                  Sommelier Reserve Preview Mode
                  <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-medium">Active</span>
                </p>
                <p className="text-[11px] text-stone-600 mt-0.5">
                  Exploring with curated cellar bottles. Sign in with Google anytime to save and sync across your devices.
                </p>
              </div>
            </div>
            <button
              onClick={handleLogin}
              className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#722F37] hover:bg-[#5c242c] text-white text-xs uppercase font-semibold tracking-wider transition-all duration-200 ease-out active:scale-[0.98] rounded-xl shadow-sm cursor-pointer"
            >
              <LogIn size={14} />
              Sign in with Google
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {authLoading && bottles.length === 0 ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="min-h-[60vh] flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-4 p-8 bg-white border border-[#EBE7DF] rounded-3xl shadow-sm">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-2 border-[#722F37]/20 border-t-[#722F37] animate-spin" />
                  <Wine size={20} className="absolute inset-0 m-auto text-[#722F37] animate-pulse" />
                </div>
                <p className="text-xs uppercase tracking-widest text-stone-600 font-medium">Unlocking the Cellar...</p>
              </div>
            </motion.div>
          ) : view === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="space-y-8"
            >
              {/* Dashboard Grid - 4 Quick Access Metric Cards */}
              <DashboardGrid
                bottleCount={bottles.length}
                regionCount={distinctRegionsCount}
                grapeCount={availableGrapes.length}
                favoriteCount={favoritesCount}
                isLoading={isDataLoading}
                onSelectCategory={(category) => {
                  if (category === 'cellar' || (category as any) === 'bottles') {
                    setView('cellar');
                  } else if (category === 'regions') {
                    setView('explore');
                    setExploreTab('map');
                  } else if (category === 'grapes') {
                    setView('explore');
                    setExploreTab('grapes');
                  } else if (category === 'favorites') {
                    setView('cellar');
                    setPriceRange({ min: 2000, max: 100000 });
                  }
                }}
              />

              {/* Recently Added Section Carousel */}
              <RecentlyAddedCarousel
                bottles={bottles}
                onSelectBottle={(bottle) => {
                  setEditingBottle(bottle);
                  setIsFormOpen(true);
                }}
                onViewAll={() => setView('cellar')}
                typeConfigMap={WINE_TYPE_CONFIG}
                isLoading={isDataLoading}
              />

              {/* Wine of the Day Highlight Section in Warm Light Card */}
              {wineOfTheDay && (
                <div className="bg-white border border-[#EBE7DF] rounded-2xl p-6 md:p-8 shadow-[0_2px_12px_rgba(28,25,23,0.04)] relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-[#722F37]/10 text-[#722F37] border border-[#722F37]/20">
                          Sommelier's Pick of the Day
                        </span>
                        <span className="text-xs text-stone-500 font-medium">
                          {wineOfTheDay.type} • {wineOfTheDay.year}
                        </span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 leading-tight">
                        {wineOfTheDay.name}
                      </h3>
                      <p className="text-xs text-stone-600 line-clamp-2">
                        {wineOfTheDay.tastingNotes || wineOfTheDay.producer + (wineOfTheDay.region ? ` • ${wineOfTheDay.region}` : '')}
                      </p>
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={() => setView('wine-of-the-day')}
                          className="text-xs font-semibold text-[#722F37] hover:underline flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Read Full Tasting Notes</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                    {wineOfTheDay.imageUrl && (
                      <div className="w-28 h-36 bg-[#FAF8F5] rounded-xl border border-[#EBE7DF] flex items-center justify-center p-2 shrink-0">
                        <img
                          src={wineOfTheDay.imageUrl}
                          alt={wineOfTheDay.name}
                          className="max-h-full max-w-full object-contain drop-shadow"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ) : view === 'wine-of-the-day' ? (
            <motion.div
              key="wine-of-the-day"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E6DFD5]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest font-bold bg-[#722F37]/10 text-[#722F37] border border-[#722F37]/20 px-3 py-1 rounded-full inline-block">
                      Daily Selection
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#5A1E24] leading-tight">
                    Your Wine of the Day
                  </h2>
                  <p className="text-stone-600 max-w-xl font-normal text-xs">
                    A special selection from your private reserve, chosen to inspire your palate today.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setView('cellar')}
                  className="self-start sm:self-auto px-4 py-2 bg-white hover:bg-[#FAF8F5] text-stone-700 border border-[#E6DFD5] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                >
                  ← Back to Cellar
                </button>
              </div>

              {!wineOfTheDay && isDataLoading ? (
                <div className="max-w-4xl mx-auto bg-white border border-[#E6DFD5] rounded-3xl p-8 animate-pulse shadow-xs">
                  <div className="flex flex-col lg:flex-row gap-8 items-center">
                    <div className="w-full lg:w-1/2 h-72 bg-stone-100 rounded-2xl flex items-center justify-center">
                      <Wine size={48} className="text-stone-200" />
                    </div>
                    <div className="w-full lg:w-1/2 space-y-4">
                      <div className="h-6 bg-stone-200/70 rounded-md w-1/3" />
                      <div className="h-8 bg-stone-200/80 rounded-md w-3/4" />
                      <div className="h-4 bg-stone-100 rounded-md w-1/2" />
                      <div className="space-y-2 pt-4">
                        <div className="h-3 bg-stone-100 rounded w-full" />
                        <div className="h-3 bg-stone-100 rounded w-5/6" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : !wineOfTheDay ? (
                <div className="py-20 bg-white border border-dashed border-[#E6DFD5] rounded-3xl flex flex-col items-center justify-center text-center p-8 shadow-sm">
                  <Wine size={48} className="text-stone-300 mb-4" />
                  <h3 className="font-serif font-bold text-2xl text-[#5A1E24] mb-1">No Bottles Found</h3>
                  <p className="text-xs uppercase tracking-wider text-stone-500 mb-6 max-w-md font-medium">
                    Start adding bottles to your cellar to receive a daily selection.
                  </p>
                  <button 
                    type="button"
                    onClick={() => { setView('cellar'); setIsFormOpen(true); }}
                    className="flex items-center gap-2 bg-[#722F37] hover:bg-[#5C242C] text-white px-6 py-3 rounded-xl shadow-sm font-semibold text-xs uppercase active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Add your first bottle</span>
                  </button>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white border border-[#E6DFD5] rounded-3xl shadow-[0_4px_24px_rgba(28,25,23,0.06)] overflow-hidden">
                    <div className="flex flex-col lg:flex-row">
                      {wineOfTheDay.imageUrl && (
                        <div className="lg:w-1/2 min-h-72 lg:min-h-auto bg-[#FAF8F5] border-b lg:border-b-0 lg:border-r border-[#E6DFD5] relative flex items-center justify-center p-8">
                          <img 
                            src={wineOfTheDay.imageUrl} 
                            alt={wineOfTheDay.name}
                            className="max-h-72 w-auto object-contain drop-shadow-md transition-transform hover:scale-105 duration-300"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      
                      <div className={`p-6 md:p-8 flex flex-col justify-center ${wineOfTheDay.imageUrl ? 'lg:w-1/2' : 'w-full'}`}>
                        <div className="flex items-center justify-between mb-5">
                          <span className={`text-xs uppercase tracking-wider font-semibold px-3 py-1 rounded-full border ${WINE_TYPE_CONFIG[wineOfTheDay.type]?.bg || 'bg-[#FDF2F4]'} ${WINE_TYPE_CONFIG[wineOfTheDay.type]?.text || 'text-[#800020]'} ${WINE_TYPE_CONFIG[wineOfTheDay.type]?.border || 'border-[#F5C2CB]'}`}>
                            {wineOfTheDay.type}
                          </span>
                          {wineOfTheDay.price && (
                            <span className="text-xs font-mono font-bold bg-[#FDF2F4] text-[#800020] border border-[#F5C2CB] px-3 py-1 rounded-full shadow-xs">
                              ฿{wineOfTheDay.price.toLocaleString()}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 mb-5">
                          <h3 className="text-2xl md:text-3xl font-serif font-bold text-[#5A1E24] leading-tight">
                            {wineOfTheDay.name}
                          </h3>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold text-stone-700 text-sm">{wineOfTheDay.producer}</p>
                            <span className="text-stone-300">•</span>
                            <span className="text-xs font-mono font-semibold text-[#800020] bg-[#FDF2F4] border border-[#F5C2CB] px-2.5 py-0.5 rounded-full">
                              {wineOfTheDay.year || 'NV'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-5 border-y border-[#E6DFD5] py-3.5 bg-[#FAF8F5] rounded-2xl px-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Region</p>
                            <p className="text-xs font-semibold text-[#1E1E1E] mt-0.5">{wineOfTheDay.region || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Country</p>
                            <p className="text-xs font-semibold text-[#1E1E1E] mt-0.5">{wineOfTheDay.country || '—'}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Grapes</p>
                            <p className="text-xs font-semibold text-[#1E1E1E] mt-0.5">{wineOfTheDay.grape?.join(', ') || '—'}</p>
                          </div>
                        </div>

                        <div className="space-y-3.5">
                          <p className="text-[10px] uppercase tracking-wider text-[#5A1E24] font-bold flex items-center gap-2">
                            <Sparkles size={14} className="text-[#722F37]" />
                            Sommelier's Analytical Review
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {wineOfTheDay.appearance && (
                              <div className="p-3 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl">
                                <p className="text-[10px] text-[#5A1E24] uppercase font-bold">I. Appearance</p>
                                <p className="text-xs text-[#1E1E1E] font-normal mt-0.5">{wineOfTheDay.appearance}</p>
                              </div>
                            )}
                            {wineOfTheDay.nose && (
                              <div className="p-3 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl">
                                <p className="text-[10px] text-[#5A1E24] uppercase font-bold">II. Nose</p>
                                <p className="text-xs text-[#1E1E1E] font-normal mt-0.5">{wineOfTheDay.nose}</p>
                              </div>
                            )}
                            {wineOfTheDay.palate && (
                              <div className="p-3 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl">
                                <p className="text-[10px] text-[#5A1E24] uppercase font-bold">III. Palate</p>
                                <p className="text-xs text-[#1E1E1E] font-normal mt-0.5">{wineOfTheDay.palate}</p>
                              </div>
                            )}
                            {wineOfTheDay.finish && (
                              <div className="p-3 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl">
                                <p className="text-[10px] text-[#5A1E24] uppercase font-bold">IV. Finish</p>
                                <p className="text-xs text-[#1E1E1E] font-normal mt-0.5">{wineOfTheDay.finish}</p>
                              </div>
                            )}
                          </div>

                          {wineOfTheDay.tastingNotes && !wineOfTheDay.appearance && !wineOfTheDay.nose && !wineOfTheDay.palate && !wineOfTheDay.finish && (
                            <p className="text-xs text-[#1E1E1E] font-serif italic p-3.5 bg-[#FDF2F4] border border-[#F5C2CB] rounded-xl leading-relaxed">
                              "{wineOfTheDay.tastingNotes}"
                            </p>
                          )}
                          {Array.isArray(wineOfTheDay.foodPairing) && wineOfTheDay.foodPairing.length > 0 && (
                            <div className="p-3.5 border border-amber-200 bg-[#FFFBEB] rounded-xl">
                              <p className="text-[10px] uppercase tracking-wider text-amber-900 font-bold mb-2 flex items-center gap-1.5">
                                <Utensils size={12} className="text-amber-700" />
                                Sommelier's Pairing Suggestions
                              </p>
                              <ul className="space-y-1">
                                {wineOfTheDay.foodPairing.map((pairing, i) => (
                                  <li key={i} className="text-xs text-[#1E1E1E] font-medium flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                                    {pairing}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-5">
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingBottle(wineOfTheDay);
                              setIsFormOpen(true);
                            }}
                            className="w-full bg-[#722F37] hover:bg-[#5C242C] text-white py-3 rounded-xl text-xs uppercase font-semibold tracking-wider shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                          >
                            Update Tasting Notes
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : view === 'cellar' ? (
            <motion.div
              key="cellar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="space-y-8"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-[#EBE7DF]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest font-bold bg-[#722F37]/10 text-[#722F37] border border-[#722F37]/20 px-3 py-0.5 rounded-full">
                      Cellar Inventory
                    </span>
                    <span className="text-xs text-stone-500 font-medium font-mono">
                      {isDataLoading && bottles.length === 0 ? (
                        <span className="inline-block w-24 h-3.5 bg-stone-200/80 rounded animate-pulse align-middle" />
                      ) : (
                        `${filteredBottles.length} of ${bottles.length} Bottles`
                      )}
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#5A1E24] tracking-tight">My Wines</h1>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl">
                  <div className="relative group flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#722F37] transition-colors" size={16} />
                    <input
                      type="text"
                      placeholder="Search reserve by name, producer, grape..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-[#EBE7DF] pl-10 pr-4 py-2.5 text-xs font-medium outline-none rounded-xl text-stone-900 placeholder:text-stone-400 focus:border-[#722F37] transition-all shadow-sm"
                    />
                  </div>

                  {/* View Toggle: 2-Column Grid ⊞ vs List ☰ */}
                  <div className="flex items-center bg-[#F2EFE9] p-1 rounded-xl border border-[#E6DFD5] shadow-xs shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      title="2-Column Grid View"
                      aria-label="2-Column Grid View"
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                        viewMode === 'grid'
                          ? 'bg-[#722F37] text-white shadow-xs font-bold'
                          : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                      }`}
                    >
                      <Grid2X2 size={15} strokeWidth={2.2} />
                      <span className="font-sans">Grid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      title="List View"
                      aria-label="List View"
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                        viewMode === 'list'
                          ? 'bg-[#722F37] text-white shadow-xs font-bold'
                          : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                      }`}
                    >
                      <List size={15} strokeWidth={2.2} />
                      <span className="font-sans">List</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setEditingBottle(undefined);
                      setIsFormOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#722F37] hover:bg-[#5c242c] text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm active:scale-[0.98] whitespace-nowrap cursor-pointer shrink-0"
                  >
                    <Plus size={15} />
                    <span>Add Wine</span>
                  </button>
                </div>
              </div>

              {/* Horizontal Classifications Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scroll-hide">
                <button
                  onClick={() => setActiveFilter('All')}
                  className={`px-4 py-2 rounded-xl text-xs uppercase font-semibold tracking-wider transition-all whitespace-nowrap border shrink-0 cursor-pointer ${
                    activeFilter === 'All'
                      ? 'bg-[#722F37] text-white border-[#722F37] shadow-sm font-bold'
                      : 'bg-white border-[#EBE7DF] text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  All {isDataLoading && bottles.length === 0 ? (
                    <span className="inline-block w-4 h-3 bg-stone-200/80 rounded animate-pulse align-middle ml-1" />
                  ) : (
                    `(${bottles.length})`
                  )}
                </button>
                
                {WINE_TYPES.map(type => {
                  const count = bottles.filter(b => b.type === type).length;
                  const isSelected = activeFilter === type;
                  
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveFilter(type)}
                      className={`px-4 py-2 rounded-xl text-xs uppercase font-semibold tracking-wider transition-all whitespace-nowrap border shrink-0 flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-[#722F37] text-white border-[#722F37] shadow-sm font-bold'
                          : 'bg-white border-[#EBE7DF] text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                      }`}
                    >
                      <span>{type} ({count})</span>
                    </button>
                  );
                })}
              </div>

              {viewMode === 'grid' ? (
                <div className="max-w-5xl mx-auto w-full">
                  {isDataLoading && filteredBottles.length === 0 ? (
                    <div className="grid grid-cols-2 gap-3.5 px-3 py-2">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <div
                          key={`skeleton-grid-${idx}`}
                          className="bg-white border border-[#E6DFD5] rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-col justify-between animate-pulse"
                        >
                          <div className="w-full aspect-[3/4] rounded-xl bg-stone-100 mb-3 flex items-center justify-center">
                            <Wine size={40} className="text-stone-200" strokeWidth={1.2} />
                          </div>
                          <div className="space-y-2 flex-1">
                            <div className="h-4 bg-stone-200/70 rounded-md w-3/4" />
                            <div className="h-3 bg-stone-100 rounded-md w-1/2" />
                            <div className="h-2.5 bg-stone-100 rounded-md w-2/3" />
                          </div>
                          <div className="mt-3 pt-2.5 border-t border-[#F2EFE9] flex items-center justify-between">
                            <div className="h-3.5 bg-stone-200/70 rounded-md w-14" />
                            <div className="h-3 bg-stone-100 rounded-md w-10" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3.5 px-3 py-2">
                        {filteredBottles.map(bottle => (
                          <WineGridCard
                            key={bottle.id}
                            bottle={bottle}
                            onSelect={(b) => setSelectedBottleForDetail(b)}
                            onEdit={(b) => {
                              setEditingBottle(b);
                              setIsFormOpen(true);
                            }}
                            onDelete={handleDeleteBottle}
                          />
                        ))}
                      </div>

                      {filteredBottles.length === 0 && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="py-20 bg-white border border-dashed border-[#EBE7DF] rounded-3xl flex flex-col items-center text-center space-y-4 shadow-sm"
                        >
                          <div className="w-16 h-16 bg-[#722F37]/10 border border-[#722F37]/20 rounded-2xl flex items-center justify-center text-[#722F37]">
                            <Search size={28} />
                          </div>
                          <div className="space-y-1">
                            <p className="font-serif text-2xl text-stone-900 font-bold">No bottles match your filters</p>
                            <p className="text-xs uppercase tracking-wider text-stone-500 font-medium">Try resetting or adjusting your search criteria</p>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col gap-5 max-w-5xl mx-auto w-full"
                >
                  {isDataLoading && filteredBottles.length === 0 ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={`skeleton-list-${idx}`}
                        className="bg-white border border-[#E6DFD5] rounded-2xl p-4 shadow-xs flex gap-4 items-center animate-pulse"
                      >
                        <div className="w-16 h-24 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                          <Wine size={28} className="text-stone-200" strokeWidth={1.2} />
                        </div>
                        <div className="flex-1 space-y-2.5">
                          <div className="h-4 bg-stone-200/70 rounded-md w-1/2" />
                          <div className="h-3 bg-stone-100 rounded-md w-1/3" />
                          <div className="h-2.5 bg-stone-100 rounded-md w-1/4" />
                        </div>
                        <div className="w-16 h-5 bg-stone-100 rounded shrink-0 hidden sm:block" />
                      </div>
                    ))
                  ) : (
                    <>
                      <AnimatePresence mode="popLayout">
                        {filteredBottles.map(bottle => (
                          <WineCard
                            key={bottle.id}
                            bottle={bottle}
                            onEdit={(b) => {
                              setEditingBottle(b);
                              setIsFormOpen(true);
                            }}
                            onDelete={handleDeleteBottle}
                          />
                        ))}
                      </AnimatePresence>
                      
                      {filteredBottles.length === 0 && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="py-20 bg-white border border-dashed border-[#EBE7DF] rounded-3xl flex flex-col items-center text-center space-y-4 shadow-sm"
                        >
                          <div className="w-16 h-16 bg-[#722F37]/10 border border-[#722F37]/20 rounded-2xl flex items-center justify-center text-[#722F37]">
                            <Search size={28} />
                          </div>
                          <div className="space-y-1">
                            <p className="font-serif text-2xl text-stone-900 font-bold">No bottles match your filters</p>
                            <p className="text-xs uppercase tracking-wider text-stone-500 font-medium">Try resetting or adjusting your search criteria</p>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </motion.div>
          ) : (view === 'explore' || view === 'grapes' || view === 'tutor') ? (
            <ExploreView
              activeSubTab={exploreTab}
              onSubTabChange={(tab) => setExploreTab(tab)}
              bottles={bottles}
              grapes={grapes}
              filteredGrapes={filteredGrapes}
              grapeSearchQuery={searchQuery}
              onGrapeSearchChange={setSearchQuery}
              sortByGrapes={sortByGrapes}
              onSortByGrapesChange={setSortByGrapes}
              selectedGrapesForComparison={selectedGrapesForComparison}
              onToggleCompareGrape={handleToggleCompare}
              onSelectBottle={(b) => setSelectedBottleForDetail(b)}
              onOpenAddGrape={() => {
                setEditingGrape(undefined);
                setIsGrapeFormOpen(true);
              }}
              onEditGrape={(g) => {
                setEditingGrape(g);
                setIsGrapeFormOpen(true);
              }}
              onDeleteGrape={(id) => handleDeleteGrape(id)}
              renderGrapeCard={(grape) => (
                <GrapeCard
                  key={grape.id}
                  grape={grape}
                  onEdit={(g) => {
                    setEditingGrape(g);
                    setIsGrapeFormOpen(true);
                  }}
                  onDelete={handleDeleteGrape}
                  isComparing={selectedGrapesForComparison.includes(grape.id)}
                  onToggleCompare={handleToggleCompare}
                />
              )}
              quizQuestion={quizQuestion}
              isQuizLoading={isQuizLoading}
              quizError={quizError}
              quizScore={quizScore}
              totalQuizAnswered={totalQuizAnswered}
              selectedAnswer={selectedAnswer}
              isAnswerRevealed={isAnswerRevealed}
              onSelectAnswer={(option) => {
                setSelectedAnswer(option);
                setIsAnswerRevealed(true);
                setTotalQuizAnswered(prev => prev + 1);
                if (quizQuestion && option === quizQuestion.correctAnswer) {
                  setQuizScore(prev => prev + 1);
                }
              }}
              onFetchNewQuiz={fetchNewQuizQuestion}
            />
          ) : (
            <ProfileView
              user={user}
              bottles={bottles}
              grapes={grapes}
              typeData={typeData}
              regionData={regionData}
              cellarGrowthData={cellarGrowthData}
              topVarietals={topVarietals}
              customTooltip={CustomTooltip}
              colors={COLORS}
              onLogin={handleLogin}
              onLogout={logout}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Comparison Bar */}
      <AnimatePresence>
        {selectedGrapesForComparison.length > 0 && (view === 'grapes' || view === 'explore') && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl"
          >
            <div className="p-4 bg-white border border-[#EBE7DF] rounded-2xl shadow-[0_12px_40px_rgba(28,25,23,0.12)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#722F37]/10 border border-[#722F37]/20 rounded-xl flex items-center justify-center text-[#722F37]">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-stone-900 font-semibold">{selectedGrapesForComparison.length} Varieties Selected</p>
                  <div className="flex gap-1 mt-0.5">
                    {comparedGrapes.map(g => (
                      <span key={g.id} className="text-[10px] text-[#722F37] font-medium uppercase">{g.name}</span>
                    )).reduce((prev: any, curr: any) => [prev, <span key={`sep-${curr.key}`} className="text-[10px] text-stone-300 mx-1">•</span>, curr])}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedGrapesForComparison([])}
                  className="text-xs uppercase font-semibold text-stone-500 hover:text-stone-900 transition-colors px-3 py-2 cursor-pointer"
                >
                  Clear
                </button>
                <button 
                  onClick={() => setIsComparingGrapes(true)}
                  disabled={selectedGrapesForComparison.length < 2}
                  className={`bg-[#722F37] hover:bg-[#5c242c] text-white px-5 py-2.5 text-xs uppercase font-semibold shadow-sm rounded-xl transition-all cursor-pointer ${selectedGrapesForComparison.length < 2 ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-[0.98]'}`}
                >
                  {selectedGrapesForComparison.length < 2 
                    ? `Pick ${2 - selectedGrapesForComparison.length} more` 
                    : 'Compare Side-by-Side'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison Modal */}
      <AnimatePresence>
        {isComparingGrapes && (
          <GrapeComparisonView 
            grapes={comparedGrapes} 
            onClose={() => setIsComparingGrapes(false)} 
          />
        )}
      </AnimatePresence>

      {/* Side Sheet Form */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 pointer-events-auto"
            />
            <WineForm
              bottle={editingBottle}
              grapes={grapes}
              onClose={() => setIsFormOpen(false)}
              onSave={handleCreateOrUpdate}
            />
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGrapeFormOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGrapeFormOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 pointer-events-auto"
            />
            <GrapeForm
              grape={editingGrape}
              onClose={() => setIsGrapeFormOpen(false)}
              onSave={handleCreateOrUpdateGrape}
            />
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {itemToDelete && (
          <ConfirmationModal
            title={`Confirm Deletion`}
            message={`Are you sure you want to remove this ${itemToDelete.type}? This action cannot be undone.`}
            onConfirm={confirmDelete}
            onClose={() => setItemToDelete(null)}
            confirmText="Delete"
          />
        )}
      </AnimatePresence>

      {/* Wine Detail Inspection Modal for Grid View (and quick views) */}
      <WineDetailModal
        bottle={selectedBottleForDetail}
        isOpen={!!selectedBottleForDetail}
        onClose={() => setSelectedBottleForDetail(null)}
        onEdit={(bottle) => {
          setSelectedBottleForDetail(null);
          setEditingBottle(bottle);
          setIsFormOpen(true);
        }}
        onDelete={(id) => {
          setSelectedBottleForDetail(null);
          handleDeleteBottle(id);
        }}
      />

      <footer className="p-8 border-t border-[#EBE7DF] bg-[#FAF8F5] text-center mt-auto pb-24 md:pb-8">
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-serif font-bold text-stone-900 tracking-wide">
            Sommelier Reserve
          </p>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">
            Bottle Diary Archive • Private Collection
          </p>
        </div>
      </footer>

      {/* Floating 5-Item Bottom Navigation Bar */}
      <BottomNavBar
        currentTab={
          view === 'home'
            ? 'home'
            : view === 'cellar'
            ? 'cellar'
            : view === 'explore' || view === 'tutor' || view === 'grapes'
            ? 'explore'
            : 'profile'
        }
        onSelectTab={(tab) => {
          setView(tab as any);
        }}
        onAddNewWine={() => {
          setEditingBottle(undefined);
          setIsFormOpen(true);
        }}
        onOpenAddModal={() => {
          setEditingBottle(undefined);
          setIsFormOpen(true);
        }}
        wineCount={bottles.length}
        totalBottles={bottles.length}
      />

      {/* Success Toast Notification */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] px-4 w-full max-w-sm"
          >
            <div className="bg-white border border-emerald-300 p-4 rounded-2xl shadow-lg flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
                <Check size={18} />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase font-semibold text-emerald-800 leading-tight">
                  SUCCESS: RECORD COMMITTED TO DIARY!
                </p>
              </div>
              <button 
                onClick={() => setShowSuccessToast(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors"
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
