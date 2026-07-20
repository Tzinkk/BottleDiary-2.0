import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Wine, Trash2, Edit2, Star, X, Info, Globe, Banknote, ChevronDown, Upload, Camera, Loader2, Sparkles, Sparkle, BarChart3, LogIn, LogOut, User as UserIcon, Droplets, FlaskConical, Leaf, Utensils, Check } from 'lucide-react';
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
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, limit } from 'firebase/firestore';
import { auth, db, signInWithGoogle, logout, handleFirestoreError, OperationType } from './firebase';
import { WineBottle, WineType, SortOption, GrapeVariety, QuizQuestion } from './types';
import { analyzeWineLabel, generateQuizQuestion, refineTastingNotes, generateTastingNotesForBottle } from './services/aiService';
import { WorldMap } from './components/WorldMap';

// --- Configuration ---

const WINE_TYPES: WineType[] = ['Red', 'White', 'Rosé', 'Sparkling', 'Natural Red', 'Natural White', 'Pet Nat', 'Orange', 'Sato', 'Sake'];

const WINE_TYPE_CONFIG: Record<string, { text: string, bg: string, border: string, accent: string, hex: string, activeBg: string, activeText: string }> = {
  'Red': { text: 'text-[#ff99ac]', bg: 'bg-[#650015]/30', border: 'border-[#650015]/50', accent: 'bg-[#650015]', hex: '#650015', activeBg: 'bg-[#650015]', activeText: 'text-[#E6C280] border-[#650015]' },
  'White': { text: 'text-[#f0e68c]', bg: 'bg-[#f0e68c]/10', border: 'border-[#f0e68c]/20', accent: 'bg-[#f0e68c]', hex: '#f0e68c', activeBg: 'bg-[#f0e68c]', activeText: 'text-wine-bg border-[#f0e68c]' },
  'Rosé': { text: 'text-[#ffb6c1]', bg: 'bg-[#ffb6c1]/10', border: 'border-[#ffb6c1]/20', accent: 'bg-[#ffb6c1]', hex: '#ffb6c1', activeBg: 'bg-[#ffb6c1]', activeText: 'text-wine-bg border-[#ffb6c1]' },
  'Sparkling': { text: 'text-[#e0ffff]', bg: 'bg-[#e0ffff]/10', border: 'border-[#e0ffff]/20', accent: 'bg-[#e0ffff]', hex: '#e0ffff', activeBg: 'bg-[#e0ffff]', activeText: 'text-wine-bg border-[#e0ffff]' },
  'Natural Red': { text: 'text-[#ff8095]', bg: 'bg-[#4a000e]/30', border: 'border-[#4a000e]/50', accent: 'bg-[#4a000e]', hex: '#4a000e', activeBg: 'bg-[#4a000e]', activeText: 'text-[#E6C280] border-[#4a000e]' },
  'Natural White': { text: 'text-[#fafad2]', bg: 'bg-[#fafad2]/10', border: 'border-[#fafad2]/20', accent: 'bg-[#fafad2]', hex: '#fafad2', activeBg: 'bg-[#fafad2]', activeText: 'text-wine-bg border-[#fafad2]' },
  'Pet Nat': { text: 'text-[#ffe4b5]', bg: 'bg-[#ffe4b5]/10', border: 'border-[#ffe4b5]/20', accent: 'bg-[#ffe4b5]', hex: '#ffe4b5', activeBg: 'bg-[#ffe4b5]', activeText: 'text-wine-bg border-[#ffe4b5]' },
  'Orange': { text: 'text-[#ffa500]', bg: 'bg-[#ffa500]/10', border: 'border-[#ffa500]/20', accent: 'bg-[#ffa500]', hex: '#ffa500', activeBg: 'bg-[#ffa500]', activeText: 'text-wine-bg border-[#ffa500]' },
  'Sato': { text: 'text-[#fffaf0]', bg: 'bg-[#fffaf0]/10', border: 'border-[#fffaf0]/20', accent: 'bg-[#fffaf0]', hex: '#fffaf0', activeBg: 'bg-[#fffaf0]', activeText: 'text-wine-bg border-[#fffaf0]' },
  'Sake': { text: 'text-[#f5f5f5]', bg: 'bg-[#f5f5f5]/10', border: 'border-[#f5f5f5]/20', accent: 'bg-[#f5f5f5]', hex: '#f5f5f5', activeBg: 'bg-[#f5f5f5]', activeText: 'text-wine-bg border-[#f5f5f5]' },
};

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

// --- Animation Variants ---

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring", 
      stiffness: 100, 
      damping: 15 
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    transition: { duration: 0.2 } 
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
        className="fixed inset-0 bg-[#000]/80 backdrop-blur-md z-40"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="glass-panel p-8 max-w-sm w-full space-y-6 relative z-50 rounded-sm border-white/10 shadow-2xl bg-[#071F17]"
      >
        <div className="space-y-4">
          <div className="w-12 h-12 bg-red-900/20 border border-red-900/30 rounded-full flex items-center justify-center text-red-500 mx-auto">
            <Trash2 size={24} strokeWidth={1.5} />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-serif text-ink uppercase tracking-widest">{title}</h3>
            <p className="text-[10px] text-ink/40 uppercase tracking-[0.2em] leading-relaxed">{message}</p>
          </div>
        </div>
        
        <div className="flex gap-4 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 border border-white/10 text-[10px] uppercase tracking-widest text-ink/60 hover:bg-white/5 transition-all rounded-sm font-bold active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-6 py-4 ${isDanger ? 'bg-red-700/80 text-[#f8f4ed] hover:bg-red-600' : 'bg-gold text-wine-bg hover:bg-gold/90'} text-[10px] uppercase tracking-widest transition-all rounded-sm font-bold shadow-lg shadow-black/40 active:scale-95`}
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
      layout
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className={`glass-panel p-6 flex flex-col h-full group relative transition-all duration-300 rounded-sm overflow-hidden border-l-2 ${grape.type === 'Red' ? 'border-red-900/50' : 'border-yellow-800/30'}`}
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onToggleCompare(grape.id)}
            className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-all ${
              isComparing 
                ? 'bg-gold border-gold text-wine-bg shadow-[0_0_10px_rgba(212,175,55,0.4)]' 
                : 'bg-white/5 border-white/10 text-transparent hover:border-gold/40'
            }`}
          >
            <Plus size={12} strokeWidth={3} className={isComparing ? 'transform rotate-45' : ''} />
          </button>
          <span className={`text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-1 rounded-full border ${grape.type === 'Red' ? 'text-red-400 bg-red-950/40 border-red-900/50' : 'text-yellow-100 bg-yellow-950/30 border-yellow-800/30'}`}>
            {grape.type}
          </span>
        </div>
        <div className="flex space-x-1">
          <button onClick={() => onEdit(grape)} className="p-1.5 text-ink/40 hover:text-gold transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(grape.id)} className="p-1.5 text-ink/40 hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-serif text-2xl font-light text-ink tracking-wide leading-tight">{grape.name}</h3>
        <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
          {(grape.locations || []).map((loc, i) => (
            <span key={i} className="text-[10px] text-gold/60 uppercase tracking-widest">
              {loc}{i < (grape.locations || []).length - 1 ? ' • ' : ''}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-white/5">
        <div className="space-y-1">
          <p className="text-[8px] text-ink/30 uppercase tracking-[0.2em] font-bold">Skin</p>
          <p className="text-xs text-ink/80">{grape.skin || '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[8px] text-ink/30 uppercase tracking-[0.2em] font-bold">Body</p>
          <p className="text-xs text-ink/80">{grape.body || '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[8px] text-ink/30 uppercase tracking-[0.2em] font-bold">Acidity</p>
          <p className="text-xs text-ink/80">{grape.acidity || '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[8px] text-ink/30 uppercase tracking-[0.2em] font-bold">Tannin</p>
          <p className="text-xs text-ink/80">{grape.tannin || '—'}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[8px] text-ink/30 uppercase tracking-[0.2em] font-bold mb-1">Aroma & Flavor</p>
          <p className="text-xs italic text-ink/60 line-clamp-2">{grape.aromaFlavor || '—'}</p>
        </div>
        <div>
          <p className="text-[8px] text-ink/30 uppercase tracking-[0.2em] font-bold mb-1">Other Notes</p>
          <p className="text-xs text-ink/60 line-clamp-2">{grape.otherNotes || '—'}</p>
        </div>
        <div>
          <p className="text-[8px] text-ink/30 uppercase tracking-[0.2em] font-bold mb-1">Additional Notes</p>
          <p className="text-xs text-ink/60 line-clamp-2">{grape.additionalNotes || '—'}</p>
        </div>
        <div>
          <p className="text-[8px] text-ink/30 uppercase tracking-[0.2em] font-bold mb-1">Food Pairing</p>
        {Array.isArray(grape.foodPairing) && grape.foodPairing.length > 0 ? (
          <p className="text-[10px] text-gold/60 font-serif italic flex flex-wrap gap-x-2">
            {grape.foodPairing.map((fp, i) => (
              <span key={i}>
                {fp}{i < grape.foodPairing.length - 1 ? ' • ' : ''}
              </span>
            ))}
          </p>
        ) : (
          <p className="text-xs text-gold/60 line-clamp-2 font-serif italic">—</p>
        )}
        </div>
      </div>

      <button 
        onClick={() => onEdit(grape)}
        className="mt-6 w-full py-2 border border-gold/20 text-gold hover:bg-gold/5 text-[9px] uppercase tracking-[0.3em] transition-all rounded-sm"
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
      className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#071F17] shadow-2xl z-50 overflow-y-auto border-l border-white/5"
    >
      <div className="p-10">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="font-serif text-4xl text-ink font-light tracking-wide">{grape ? 'Edit Variety' : 'New Variety'}</h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold/60 mt-2">Grape Encyclopedia</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-full border border-white/5"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Variety Name</label>
            <input
              required value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-transparent border-b border-white/10 py-3 text-2xl font-serif text-ink"
              placeholder="e.g. Pinot Noir"
            />
          </div>

          <div className="flex gap-4">
            {['Red', 'White'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setFormData({ ...formData, type: t as any })}
                className={`px-6 py-2 text-[10px] uppercase tracking-widest border transition-all rounded-sm ${formData.type === t ? 'bg-gold/10 border-gold text-gold font-bold' : 'border-white/10 text-ink/60'}`}
              >
                {t} Grape
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Skin</label>
              <input value={formData.skin} onChange={e => setFormData({ ...formData, skin: e.target.value })} className="w-full bg-transparent border-b border-white/10 py-2 text-ink" placeholder="Thick/Thin" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Body</label>
              <input value={formData.body} onChange={e => setFormData({ ...formData, body: e.target.value })} className="w-full bg-transparent border-b border-white/10 py-2 text-ink" placeholder="Light/Medium/Full" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Geography (Region / Country)</label>
              <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                {formData.locations.map((loc, i) => (
                  <span key={i} className="flex items-center gap-1 px-3 py-1 bg-gold/5 border border-gold/10 rounded-full text-[10px] text-gold">
                    {loc}
                    <button type="button" onClick={() => removeLocation(i)} className="hover:text-red-500 transition-colors">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  value={locationInput} 
                  onChange={e => setLocationInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                  className="flex-1 bg-transparent border-b border-white/10 py-2 text-ink text-sm font-light italic" 
                  placeholder="e.g. Piedmont / Italy"
                />
                <button type="button" onClick={addLocation} className="p-2 border border-white/10 rounded hover:bg-white/5 transition-colors text-gold">
                  <Plus size={14} />
                </button>
              </div>
              <p className="text-[8px] text-white/20 italic">Format: Region / Country (e.g., Bordeaux / France)</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink/30">Acidity</label>
              <input value={formData.acidity} onChange={e => setFormData({ ...formData, acidity: e.target.value })} className="w-full bg-transparent border-b border-white/10 py-2 text-xs text-ink" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink/30">Tannin</label>
              <input value={formData.tannin} onChange={e => setFormData({ ...formData, tannin: e.target.value })} className="w-full bg-transparent border-b border-white/10 py-2 text-xs text-ink" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink/30">Sweetness</label>
              <input value={formData.sweetness} onChange={e => setFormData({ ...formData, sweetness: e.target.value })} className="w-full bg-transparent border-b border-white/10 py-2 text-xs text-ink" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Aroma & Flavor</label>
              <textarea rows={2} value={formData.aromaFlavor} onChange={e => setFormData({ ...formData, aromaFlavor: e.target.value })} className="w-full bg-white/5 border border-white/10 p-4 rounded text-sm text-ink italic" placeholder="Red fruits, spice, earthy..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Other Notes</label>
              <textarea rows={2} value={formData.otherNotes} onChange={e => setFormData({ ...formData, otherNotes: e.target.value })} className="w-full bg-white/5 border border-white/10 p-4 rounded text-sm text-ink" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Additional Notes</label>
              <textarea rows={2} value={formData.additionalNotes} onChange={e => setFormData({ ...formData, additionalNotes: e.target.value })} className="w-full bg-white/5 border border-white/10 p-4 rounded text-sm text-ink" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Food Pairing</label>
              <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                {formData.foodPairing.map((p, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-gold/10 border border-gold/20 rounded-full text-[10px] text-gold/80 italic">
                    {p}
                    <button type="button" onClick={() => setFormData({ ...formData, foodPairing: formData.foodPairing.filter((_, idx) => idx !== i) })} className="hover:text-red-400 transition-colors">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="relative">
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
                  className="w-full bg-transparent border-b border-white/10 py-2 transition-all text-ink font-light pr-10 text-xs italic"
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
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gold/50 hover:text-gold transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-gold text-wine-bg py-5 font-bold tracking-[0.3em] uppercase text-xs hover:bg-gold/90 transition-all shadow-2xl">
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
    // Simple logic to check if this value is unique among the compared set
    const values = grapes.map(g => {
      const val = (g as any)[attr];
      return Array.isArray(val) ? val.join(', ') : val;
    });
    const occurrences = values.filter(v => v === value).length;
    return occurrences === 1 ? 'text-gold font-bold italic' : 'text-ink/60';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col bg-wine-bg"
    >
      <div className="flex flex-col h-full w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-6 md:px-12 md:py-10 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-xl shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-sm bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                <BarChart3 size={20} />
              </div>
              <h2 className="text-3xl md:text-4xl font-serif text-ink tracking-tight">Varietal Comparison</h2>
            </div>
            <p className="text-[10px] uppercase tracking-[0.5em] text-ink/30 pl-14">Side-by-side analytical contrast ({grapes.length} varieties)</p>
          </div>
          <button 
            onClick={onClose}
            className="group flex items-center gap-4 px-6 py-3 border border-white/10 text-ink/60 hover:text-ink hover:border-gold/40 transition-all rounded-sm uppercase tracking-[0.3em] text-[10px] bg-white/5"
          >
            <span>Close Comparison</span>
            <X size={18} className="group-hover:text-gold transition-colors" />
          </button>
        </div>

        {/* Comparison Table Container */}
        <div className="flex-1 overflow-auto bg-[#071F17] custom-scrollbar">
          <div className="min-w-max p-6 md:p-12">
            <table className="w-full border-separate border-spacing-0 table-fixed">
              <thead>
                <tr>
                  <th className="w-48 md:w-64 p-6 text-left border-b border-r border-white/10 bg-[#071F17] sticky top-0 left-0 z-50">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold">Attribute</span>
                  </th>
                  {grapes.map(grape => (
                    <th key={grape.id} className="p-10 text-center border-b border-r border-white/10 bg-[#071F17] sticky top-0 z-40 min-w-[350px]">
                      <div className="space-y-4 pb-4">
                        <span className={`text-[9px] uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border transition-all ${
                          grape.type === 'Red' 
                            ? 'text-red-400 border-red-950/50 bg-red-950/20 shadow-[0_0_15px_rgba(153,27,27,0.1)]' 
                            : 'text-gold border-gold/40 bg-gold/5 shadow-[0_0_15px_rgba(212,175,55,0.05)]'
                        }`}>
                          {grape.type}
                        </span>
                        <h3 className="text-3xl md:text-4xl font-serif text-ink tracking-tight leading-none">{grape.name}</h3>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-ink/30 font-medium">
                          {typeof grape.locations === 'string' ? grape.locations : (Array.isArray(grape.locations) && grape.locations.length > 0 ? (typeof grape.locations[0] === 'string' ? grape.locations[0] : (grape.locations[0] as any).country) : 'Global varietal')}
                        </p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {attributes.map((attr, idx) => (
                  <tr key={attr.key} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="p-8 border-r border-white/10 bg-[#071F17] sticky left-0 z-30 transition-colors group-hover:bg-[#113d2f]">
                      <span className="text-[10px] uppercase tracking-[0.3em] text-ink/30 font-bold group-hover:text-gold transition-colors">{attr.label}</span>
                    </td>
                    {grapes.map(grape => {
                      const rawValue = (grape as any)[attr.key];
                      const displayValue = Array.isArray(rawValue) ? rawValue.join(', ') : (rawValue || '—');
                      const isHighlighted = getWeightClass(attr.key, displayValue).includes('gold');
                      
                      return (
                        <td 
                          key={grape.id} 
                          className={`p-10 border-r border-white/5 text-center transition-colors ${idx % 2 === 0 ? 'bg-white/[0.01]' : 'bg-transparent'}`}
                        >
                          <div className={`text-base md:text-lg tracking-wide leading-relaxed px-6 py-6 rounded-sm transition-all duration-500 ${
                            isHighlighted 
                              ? 'bg-gold/[0.07] border border-gold/30 shadow-[0_0_30px_rgba(212,175,55,0.05)] scale-[1.02] z-10' 
                              : 'border border-transparent'
                          }`}>
                            <p className={`${getWeightClass(attr.key, displayValue)} leading-relaxed`}>
                              {displayValue}
                            </p>
                          </div>
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
        <div className="px-12 py-8 border-t border-white/5 bg-black/40 backdrop-blur-xl flex flex-col md:flex-row justify-between items-center gap-6 shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-2.5 h-2.5 rounded-full bg-gold shadow-[0_0_10px_rgba(212,175,55,0.5)] animate-pulse"></div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-ink/40 max-w-xl leading-relaxed">
              <span className="text-gold font-bold">Gold Highlight</span> indicates a distinct varietal characteristic that sets it apart in this comparative set.
            </p>
          </div>
          <div className="flex items-center gap-8 text-[9px] uppercase tracking-[0.4em] text-ink/20">
            <span>Analytical Sommelier Suite</span>
            <div className="w-1 h-1 bg-white/10 rounded-full"></div>
            <span>V 2.0.4</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

interface WineCardProps {
  bottle: WineBottle;
  onEdit: (bottle: WineBottle) => void;
  onDelete: (id: string) => void;
  isBatchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

const WineCard: React.FC<WineCardProps> = ({ bottle, onEdit, onDelete, isBatchMode, isSelected, onToggleSelect }) => {
  const typeConfig = WINE_TYPE_CONFIG[bottle.type] || { text: 'text-gray-400', bg: 'bg-gray-900/40', border: 'border-gray-800/50', accent: 'bg-gray-500' };
  const [expansionState, setExpansionState] = useState<'collapsed' | 'basic' | 'full'>('collapsed');
  const [isImageOpen, setIsImageOpen] = useState(false);
  const isMissingNotes = !bottle.appearance || !bottle.nose || !bottle.palate || !bottle.finish || !bottle.tastingNotes;

  return (
    <>
      {/* Lightbox / Enlarged View */}
      <AnimatePresence>
        {isImageOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            onClick={() => setIsImageOpen(false)}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
          >
            <motion.div
              layoutId={`bottle-image-${bottle.id}`}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="relative w-full max-w-2xl aspect-[2/3.5] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setIsImageOpen(false)}
                className="absolute top-4 right-4 md:-top-16 md:-right-16 z-[110] text-white/40 hover:text-gold transition-all bg-white/5 hover:bg-white/10 rounded-full p-3 backdrop-blur-md group/close"
                aria-label="Close"
              >
                <X size={32} className="group-hover/close:rotate-90 transition-transform duration-300" />
              </button>
              
              {bottle.imageUrl ? (
                <img 
                  src={bottle.imageUrl} 
                  alt={bottle.name}
                  className="w-full h-full object-contain drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Wine size={300} className="text-gold/10" strokeWidth={0.5} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout
        transition={{ 
          layout: { type: "spring", stiffness: 220, damping: 26 },
          opacity: { duration: 0.15 } 
        }}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={() => {
          if (isBatchMode) {
            onToggleSelect?.(bottle.id);
            return;
          }
          if (expansionState === 'collapsed') {
            setExpansionState('basic');
          } else if (expansionState === 'basic') {
            setExpansionState('full');
          }
        }}
        whileHover={expansionState === 'collapsed' || isBatchMode ? { y: -3, scale: 1.002, transition: { duration: 0.2 } } : undefined}
        className={`glass-panel flex flex-col group transition-all duration-500 rounded-sm overflow-hidden border-l border-white/5 md:border-l-4 ${typeConfig.border.replace('border-', 'border-l-')} shadow-2xl hover:border-gold/30 mb-6 relative ${
          isSelected 
            ? 'border-gold/60 bg-gold/[0.02] shadow-[0_0_20px_rgba(212,175,55,0.05)]' 
            : expansionState === 'collapsed' || isBatchMode 
              ? 'cursor-pointer hover:bg-white/[0.01]' 
              : ''
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {expansionState === 'collapsed' ? (
            /* --- MINIMALIST HORIZONTAL CARD LAYOUT --- */
            <motion.div
              key="collapsed-horizontal"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full"
            >
              {/* Left: Thumbnail & Main Info */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {isBatchMode && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect?.(bottle.id);
                    }}
                    className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                      isSelected
                        ? 'bg-gold border-gold text-[#071F17]'
                        : 'border-white/20 hover:border-gold/50 bg-white/[0.02]'
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                )}

                {/* "Icon" Thumbnail Image */}
                <motion.div
                  layoutId={`bottle-image-${bottle.id}`}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsImageOpen(true);
                  }}
                  className="w-12 h-12 rounded-full border border-gold/20 bg-black/40 flex items-center justify-center cursor-zoom-in overflow-hidden hover:border-gold/50 transition-all shadow-md shrink-0"
                  title="Click to view full image"
                >
                  {bottle.imageUrl ? (
                    <img 
                      src={bottle.imageUrl} 
                      alt="thumbnail" 
                      className="w-full h-full object-contain p-1 opacity-80 hover:opacity-100 transition-all duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Wine size={20} className="text-gold/30" />
                  )}
                </motion.div>

                {/* Title & Producer */}
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <h3 className="font-serif text-lg md:text-xl font-bold text-gold tracking-tight truncate line-clamp-1">
                      {bottle.name}
                    </h3>
                    <span className="italic font-normal text-gold/80 text-sm md:text-base shrink-0">
                      {bottle.year || 'NV'}
                    </span>
                    {isMissingNotes && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-gold/10 border border-gold/20 text-gold/80 text-[8px] uppercase tracking-wider font-extrabold font-sans">
                        <Sparkle size={7} className="animate-pulse text-gold" />
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-[10px] text-ink/40 uppercase tracking-[0.2em] truncate mt-0.5">
                    {bottle.producer || 'Unknown Producer'}
                  </p>
                </div>
              </div>

              {/* Middle: Type Badge & Origin */}
              <div className="flex items-center gap-4 shrink-0 justify-between md:justify-start">
                <div className={`text-[9px] uppercase tracking-[0.3em] font-black px-2.5 py-1 rounded-sm border shadow-sm backdrop-blur-md transition-all duration-500 ${typeConfig.text} ${typeConfig.bg} ${typeConfig.border}`}>
                  {bottle.type}
                </div>
                
                <div className="text-left md:text-right min-w-[100px] hidden sm:block">
                  <p className="text-[10px] uppercase tracking-wider text-ink/40 font-semibold truncate max-w-[120px]">{bottle.region || 'Any Region'}</p>
                  <p className="text-[9px] text-ink/30 italic truncate max-w-[124px]">{bottle.country || 'Unknown Origin'}</p>
                </div>
              </div>

              {/* Right: Price & Expand Indicator */}
              <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-white/5">
                {bottle.price ? (
                  <div className="text-left md:text-right mr-1">
                    <span className="text-[8px] uppercase tracking-wider text-ink/30 font-black block leading-none mb-0.5">Price</span>
                    <span className="font-sans text-xs md:text-sm text-gold font-bold tabular-nums tracking-wide">
                      ฿{bottle.price.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <div className="text-left md:text-right mr-1">
                    <span className="text-[8px] uppercase tracking-wider text-ink/20 italic block leading-none">No Price</span>
                  </div>
                )}

                {/* Edit Icon in Minimalist Mode */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(bottle);
                  }}
                  className="w-8 h-8 rounded-full border border-white/10 hover:border-gold/30 bg-white/[0.02] hover:bg-gold/10 flex items-center justify-center text-ink/45 hover:text-gold transition-all"
                  title="Edit Entry"
                >
                  <Edit2 size={13} />
                </button>

                {/* Click instruction chevron */}
                <div className="text-gold/40 group-hover:text-gold transition-colors flex items-center justify-center w-8 h-8 rounded-full border border-white/5 hover:border-gold/20 bg-white/[0.01]">
                  <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform duration-300" />
                </div>
              </div>
            </motion.div>
          ) : (
            /* --- PARTIAL & FULL EXPANDED CARD LAYOUT --- */
            <motion.div
              key="expanded-views"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.05,
                    delayChildren: 0.05
                  }
                }
              }}
              className="p-8 md:p-10 flex flex-col min-w-0 relative"
            >
              {/* Elegant Close Button Top Right */}
              <motion.button
                variants={{
                  hidden: { opacity: 0, scale: 0.8 },
                  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 200, damping: 15 } }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpansionState('collapsed');
                }}
                className="absolute top-6 right-6 z-10 text-white/30 hover:text-gold hover:bg-white/5 p-2 rounded-full border border-white/15 hover:border-gold/30 transition-all flex items-center justify-center group/close-btn bg-black/20"
                title="Close Full Card"
              >
                <X size={18} className="group-hover/close-btn:scale-110 transition-transform" />
              </motion.button>

              {/* Top Line: Image Icon, Type and Price */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 150, damping: 15 } }
                }}
                className="flex justify-between items-start mb-6 gap-4 pr-10"
              >
                <div className="flex items-center gap-4">
                  {/* The "Icon" Corner Image */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsImageOpen(true);
                    }}
                    className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-gold/20 bg-black/40 flex items-center justify-center cursor-zoom-in overflow-hidden hover:border-gold/50 transition-all shadow-lg group/icon shrink-0"
                    title="Click to zoom image"
                  >
                    {bottle.imageUrl ? (
                      <img 
                        src={bottle.imageUrl} 
                        alt="thumbnail" 
                        className="w-full h-full object-contain p-1.5 opacity-80 group-hover/icon:opacity-100 group-hover/icon:scale-110 transition-all duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Wine size={24} className="text-gold/30" />
                    )}
                  </div>

                  <div className={`text-[9px] uppercase tracking-[0.4em] font-black px-3 py-1.5 rounded-sm border shadow-sm backdrop-blur-md transition-all duration-500 ${typeConfig.text} ${typeConfig.bg} ${typeConfig.border}`}>
                    {bottle.type}
                  </div>
                </div>
                
                {bottle.price && (
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[8px] uppercase tracking-[0.2em] text-ink/30 font-black">Price</span>
                    <span className="font-sans text-xl text-gold font-bold tabular-nums tracking-wide">
                      ฿{bottle.price.toLocaleString()}
                    </span>
                  </div>
                )}
              </motion.div>

              {/* Title & Year */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="mb-6"
              >
                <h3 className="font-serif text-2xl md:text-3xl font-bold text-gold tracking-tight leading-tight selection:bg-gold/30">
                  {bottle.name} <span className="text-gold/40 mx-2 font-light">•</span> <span className="italic font-medium text-gold/80">{bottle.year || 'NV'}</span>
                </h3>
              </motion.div>

              {/* Details: Producer, Varietal, Terroir */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="space-y-2.5 mb-8"
              >
                <div className="flex items-baseline gap-4">
                  <span className="text-[9px] uppercase tracking-[0.3em] text-ink/20 font-black shrink-0 w-24">Producer</span>
                  <p className="font-sans text-xs text-ink/70 font-semibold tracking-widest uppercase">
                    {bottle.producer || 'Unknown'}
                  </p>
                </div>
                <div className="flex items-baseline gap-4">
                  <span className="text-[9px] uppercase tracking-[0.3em] text-ink/20 font-black shrink-0 w-24">Varietal</span>
                  <p className="font-sans text-xs text-ink/50 italic">
                    {Array.isArray(bottle.grape) ? bottle.grape.join(' • ') : bottle.grape || 'Secret Assemblage'}
                  </p>
                </div>
                <div className="flex items-baseline gap-4">
                  <span className="text-[9px] uppercase tracking-[0.3em] text-ink/20 font-black shrink-0 w-24">Origin</span>
                  <p className="font-sans text-xs text-ink/50">
                    {bottle.region}{bottle.country ? `, ${bottle.country}` : ''}
                  </p>
                </div>
              </motion.div>

              {/* Tasting Diary (showing tastingNotes) */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="mb-8"
              >
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-[8px] uppercase tracking-[0.4em] text-gold/40 font-black">Tasting Diary</span>
                  <div className="h-[1px] flex-1 bg-gold/10"></div>
                </div>
                <p className="text-base font-serif text-ink/90 font-medium leading-relaxed italic pr-4">
                  "{bottle.tastingNotes || "Discovery awaits in the glass..."}"
                </p>
              </motion.div>

              {/* Multi-tier Click-Reveal Banner or Full Info */}
              {expansionState === 'basic' ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 pt-6 border-t border-white/5 flex flex-col items-center gap-3"
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpansionState('full');
                    }}
                    className="w-full flex items-center justify-between px-5 py-3.5 border border-gold/15 hover:border-gold/30 bg-gold/[0.02] hover:bg-gold/[0.05] rounded-sm transition-all group/reveal cursor-pointer"
                  >
                    <span className="text-[9px] uppercase tracking-[0.3em] text-gold/70 group-hover:text-gold transition-all font-black flex items-center gap-2">
                      <Sparkles size={11} className="text-gold/60 animate-pulse" />
                      Reveal Sensory & Physical Profile
                    </span>
                    <ChevronDown size={14} className="text-gold/40 group-hover:text-gold group-hover:translate-y-0.5 transition-all duration-300" />
                  </button>
                </motion.div>
              ) : (
                /* Immersive Profile Content rendered inside full card directly */
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 15 } }
                  }}
                  className="pt-8 border-t border-white/5 space-y-12"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    {/* Section 1: PHYSICAL PROFILE */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] uppercase tracking-[0.35em] text-gold font-black flex items-center gap-2">
                        <span className="w-4 h-[1px] bg-gold/30"></span>
                        Appearance
                      </h4>
                      <div className="bg-black/25 p-5 rounded-sm border border-white/5 shadow-inner">
                        <p className="font-serif text-sm text-ink/80 leading-relaxed italic">
                          {bottle.appearance || "Robe and clarity details not recorded for this millésime."}
                        </p>
                      </div>
                    </div>

                    {/* Section 2: GASTRONOMY */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] uppercase tracking-[0.35em] text-gold font-black flex items-center gap-2">
                        <span className="w-4 h-[1px] bg-gold/30"></span>
                        Gastronomy & Pairings
                      </h4>
                      <div className="bg-black/25 p-5 rounded-sm border border-white/5 shadow-inner min-h-[4.5rem]">
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(bottle.foodPairing) && bottle.foodPairing.length > 0 ? (
                            bottle.foodPairing.map((food, i) => (
                              <span key={i} className="px-3 py-1 rounded-full bg-gold/5 border border-gold/10 text-gold/80 text-[10px] font-serif italic">
                                {food}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-ink/30 italic">No recommendations recorded.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: SENSORY ANALYSIS */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] uppercase tracking-[0.35em] text-gold font-black flex items-center gap-2">
                      <span className="w-4 h-[1px] bg-gold/30"></span>
                      Sensory Analysis
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-black/25 p-4 rounded-sm border border-white/5 shadow-inner">
                        <span className="text-[8px] uppercase tracking-[0.25em] text-ink/30 font-black mb-1.5 block">Nose</span>
                        <p className="font-serif text-xs text-ink/70 leading-relaxed italic last:mb-0">
                          {bottle.nose || "Aromatic profile remains unlogged."}
                        </p>
                      </div>
                      <div className="bg-black/25 p-4 rounded-sm border border-white/5 shadow-inner">
                        <span className="text-[8px] uppercase tracking-[0.25em] text-ink/30 font-black mb-1.5 block">Palate</span>
                        <p className="font-serif text-xs text-ink/70 leading-relaxed italic last:mb-0">
                          {bottle.palate || "Structural and mouthfeel analysis missing."}
                        </p>
                      </div>
                      <div className="bg-black/25 p-4 rounded-sm border border-white/5 shadow-inner">
                        <span className="text-[8px] uppercase tracking-[0.25em] text-ink/30 font-black mb-1.5 block">Finish</span>
                        <p className="font-serif text-xs text-ink/70 leading-relaxed italic last:mb-0">
                          {bottle.finish || "Final persistence not described."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: SUMMARY & SECURE NOTES */}
                  {bottle.additionalNote && (
                    <div className="bg-gold/[0.01] p-6 rounded-sm border border-gold/5 relative overflow-hidden">
                      <span className="text-[8px] uppercase tracking-[0.25em] text-gold/50 font-black mb-2 block">Collector's Notes</span>
                      <p className="font-serif text-xs text-ink/80 leading-relaxed">
                        {bottle.additionalNote}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Footer Actions */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpansionState('collapsed');
                    }}
                    className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.3em] font-black text-ink/40 hover:text-gold transition-all"
                  >
                    <span>↑ Collapse Card</span>
                  </button>

                  {expansionState === 'full' && (
                    <>
                      <span className="text-white/5">|</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpansionState('basic');
                        }}
                        className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.3em] font-black text-gold/60 hover:text-gold transition-all"
                      >
                        <span>↑ Roll Back to Tasting Notes</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(bottle);
                    }}
                    className="p-2 text-ink/30 hover:text-gold transition-all hover:scale-105"
                    title="Edit Entry"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(bottle.id);
                    }}
                    className="p-2 text-ink/30 hover:text-red-500/80 transition-all hover:scale-105"
                    title="Archive Entry"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
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
      setIsSaving(false);
    } finally {
      // isSaving is handled in App.tsx by closing the form, 
      // but if we stay here (error), we need to unset it
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
      className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#071F17] shadow-2xl z-50 overflow-y-auto border-l border-white/5"
    >
      <div className="p-10">
        <div className="flex justify-between items-center mb-12">
          <div className="flex-1 space-y-6">
            <h2 className="font-serif text-3xl font-black text-gold tracking-tight selection:bg-gold/30">
              {bottle ? 'Update Profile' : 'New Cellar Entry'}
            </h2>
            <div className="h-[1px] w-12 bg-gold/50"></div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-white/5 hover:bg-gold/10 rounded-full transition-all border border-white/5 hover:border-gold/30 group"
          >
            <X size={20} className="text-ink/40 group-hover:text-gold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Bottle/Estate Name</label>
            <input
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-transparent border-b border-white/10 focus:border-gold outline-none py-3 text-2xl font-serif font-light transition-all text-ink"
              placeholder="e.g. Château Margaux"
            />
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Producer</label>
              <input
                required
                value={formData.producer}
                onChange={e => setFormData({ ...formData, producer: e.target.value })}
                className="w-full bg-transparent border-b border-white/10 focus:border-gold outline-none py-2 transition-all text-ink font-light"
                placeholder="Estate Name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Vintage (NV or Year)</label>
              <input
                required
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: e.target.value })}
                className="w-full bg-transparent border-b border-white/10 focus:border-gold outline-none py-2 transition-all text-ink font-light"
                placeholder="2018 or NV"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Classification</label>
            <div className="flex flex-wrap gap-2">
              {wineTypes.map(t => {
                const typeConfig = WINE_TYPE_CONFIG[t] || { text: 'text-gold', accent: 'bg-gold', border: 'border-gold', bg: 'bg-gold/10' };
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: t })}
                    className={`px-4 py-2 text-[10px] uppercase tracking-widest border transition-all rounded-sm ${
                      formData.type === t
                        ? `${typeConfig.bg} ${typeConfig.border} ${typeConfig.text} font-bold shadow-lg scale-105`
                        : 'border-white/10 text-ink/60 hover:border-gold/40'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Region</label>
              <input
                value={formData.region}
                onChange={e => setFormData({ ...formData, region: e.target.value })}
                className="w-full bg-transparent border-b border-white/10 focus:border-gold outline-none py-2 transition-all text-ink font-light"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Country</label>
              <input
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                className="w-full bg-transparent border-b border-white/10 focus:border-gold outline-none py-2 transition-all text-ink font-light"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2 col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Grape Varieties</label>
              <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                {Array.isArray(formData.grape) && formData.grape.map((g, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-gold/80">
                    {g}
                    <button 
                      type="button" 
                      onClick={() => removeGrape(i)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="relative">
                <input
                  value={grapeInput}
                  onChange={e => setGrapeInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addGrape();
                    }
                  }}
                  className="w-full bg-transparent border-b border-white/10 focus:border-gold outline-none py-2 transition-all text-ink font-light pr-10"
                  placeholder="Type a variety and press Enter"
                />
                <button
                  type="button"
                  onClick={addGrape}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gold/50 hover:text-gold transition-colors"
                >
                  <Plus size={16} />
                </button>
                {grapeInput.trim() && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#071F17] border border-white/10 rounded-sm z-50 max-h-32 overflow-y-auto shadow-2xl scroll-hide">
                    {/* Suggestions from Encyclopedia */}
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
                          className="w-full text-left px-4 py-2 text-[10px] uppercase tracking-widest text-ink/60 hover:bg-gold/10 hover:text-gold transition-colors border-b border-white/5 last:border-0"
                        >
                          {g.name} <span className="opacity-40 italic ml-2">({(g.locations || [])[0] || 'Unknown'})</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Price (฿)</label>
              <input
                type="number"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) })}
                className="w-full bg-transparent border-b border-white/10 focus:border-gold outline-none py-2 transition-all text-ink font-light"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Bottle Photo</label>
              
              <div 
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`w-full group cursor-pointer h-48 border-2 border-dashed transition-all flex flex-col items-center justify-center rounded-sm overflow-hidden relative ${
                  formData.imageUrl ? 'border-gold/30' : 'border-white/10 hover:border-gold/30 hover:bg-white/5'
                } ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
              >
                {isUploading || isAnalyzing ? (
                  <div className="flex flex-col items-center gap-3 text-gold">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold">
                      {isUploading && !isAnalyzing ? 'Uploading to cloud...' : isAnalyzing ? 'AI Analyzing Label...' : 'Processing...'}
                    </span>
                    {isAnalyzing && (
                      <p className="text-[8px] text-gold/60 animate-pulse">Extracting Producer, Year, Region...</p>
                    )}
                  </div>
                ) : formData.imageUrl ? (
                  <>
                    <img 
                      src={formData.imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover mix-blend-lighten opacity-80 transition-transform group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex flex-col items-center gap-2">
                        <Camera size={24} className="text-gold" />
                        <span className="text-[9px] uppercase tracking-widest text-gold">Replace Photo</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-ink/30 transition-colors group-hover:text-gold/60">
                    <div className="p-4 bg-white/5 rounded-full">
                      <Upload size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-[0.2em] font-bold">Upload Photo</p>
                      <p className="text-[9px] mt-1 opacity-60">or drag & drop</p>
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
                <div className="mt-2 p-3 bg-red-950/40 border border-red-900/50 rounded flex gap-2 items-start">
                  <Info size={14} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-[9px] text-red-200 leading-relaxed font-medium uppercase tracking-wider">{uploadError}</p>
                </div>
              )}

              <div className="mt-2 text-[9px] text-ink/20 flex items-center justify-between">
                <span>Recommended: Portrait Orientation</span>
                <div className="flex gap-4">
                  {formData.imageUrl && !isUploading && (
                    <button 
                      type="button" 
                      onClick={() => handleAIScan(formData.imageUrl)}
                      disabled={isAnalyzing}
                      className={`${analysisSuccess ? 'text-green-400' : 'text-gold hover:text-gold/80'} flex items-center gap-1 uppercase tracking-widest transition-colors font-bold disabled:opacity-50`}
                    >
                      {isAnalyzing ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : analysisSuccess ? (
                        <Sparkle size={10} className="fill-current" />
                      ) : (
                        <Sparkles size={10} />
                      )}
                      {analysisSuccess ? 'Scan Complete' : isAnalyzing ? 'Analyzing...' : 'AI Scan Label'}
                    </button>
                  )}
                  {formData.imageUrl && (
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, imageUrl: '' }); }}
                      className="text-red-400 hover:text-red-300 flex items-center gap-1 uppercase tracking-widest transition-colors font-bold"
                    >
                      Clear Photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Or Paste Image URL</label>
              <input
                type="text"
                value={formData.imageUrl}
                onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full bg-transparent border-b border-white/10 focus:border-gold outline-none py-2 transition-all text-ink font-light text-xs opacity-60 focus:opacity-100"
                placeholder="https://..."
              />
            </div>
            
            <div className="space-y-4 pt-4">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Tasting Diary (Detailed Analytical Profile)</label>
              
              {/* Prioritizing most expressive descriptive notes */}
              <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-sm">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-widest text-gold/60 font-black ml-1">Appearance & Hue</label>
                  <textarea
                    rows={2}
                    value={formData.appearance}
                    onChange={e => setFormData({ ...formData, appearance: e.target.value })}
                    className="w-full bg-white/5 border border-white/5 p-4 rounded focus:border-gold outline-none transition-all text-sm text-ink italic font-light"
                    placeholder="Describe the robe, clarity, and intensity..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-widest text-gold/60 font-black ml-1">The Nose (Aromatics)</label>
                  <textarea
                    rows={2}
                    value={formData.nose}
                    onChange={e => setFormData({ ...formData, nose: e.target.value })}
                    className="w-full bg-white/5 border border-white/5 p-4 rounded focus:border-gold outline-none transition-all text-sm text-ink italic font-light"
                    placeholder="Primary fruits, secondary fermentation notes, tertiary age..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-ink/40 font-medium ml-1">Palate & Structure</label>
                <textarea
                  rows={2}
                  value={formData.palate}
                  onChange={e => setFormData({ ...formData, palate: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded focus:border-gold outline-none transition-all text-sm text-ink italic font-light"
                  placeholder="Body, acidity, tannins, alcohol, balance..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-ink/40 font-medium ml-1">The Finish</label>
                <textarea
                  rows={2}
                  value={formData.finish}
                  onChange={e => setFormData({ ...formData, finish: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded focus:border-gold outline-none transition-all text-sm text-ink italic font-light"
                  placeholder="Length, persistence, and final impressions..."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[9px] uppercase tracking-widest text-gold font-black">Main Tasting Notes (List View Quote)</label>
                  <button
                    type="button"
                    disabled={isRefiningNotes || !formData.tastingNotes.trim()}
                    onClick={handleRefineNotes}
                    className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-gold hover:text-gold/80 disabled:text-ink/30 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title="Rewrite bullet-points or rough text into a professional editorial paragraph"
                  >
                    {isRefiningNotes ? (
                      <>
                        <Loader2 size={11} className="animate-spin text-gold" />
                        <span>Refining...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={11} className="text-gold" />
                        <span>Refine Notes</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={formData.tastingNotes}
                  onChange={e => setFormData({ ...formData, tastingNotes: e.target.value })}
                  className="w-full bg-gold/5 border border-gold/20 p-4 rounded focus:border-gold outline-none transition-all text-sm text-ink font-medium italic"
                  placeholder="The primary descriptive notes that will appear on the main card. Write raw thoughts or bullets, then click 'Refine Notes' to polish them..."
                />
                {refineError && (
                  <p className="text-[10px] text-red-400 mt-1">{refineError}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Suggested Food Pairings</label>
              <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                {Array.isArray(formData.foodPairing) && formData.foodPairing.map((p, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-gold/10 border border-gold/20 rounded-full text-[10px] text-gold/80 italic">
                    {p}
                    <button 
                      type="button" 
                      onClick={() => removePairing(i)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="relative">
                <input
                  value={pairingInput}
                  onChange={e => setPairingInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addPairing();
                    }
                  }}
                  className="w-full bg-transparent border-b border-white/10 focus:border-gold outline-none py-2 transition-all text-ink font-light pr-10 italic"
                  placeholder="e.g. Grilled Scallops (Enter to add)"
                />
                <button
                  type="button"
                  onClick={addPairing}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gold/50 hover:text-gold transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Summary / Personal Storage Notes</label>
              <textarea
                rows={2}
                value={formData.additionalNote}
                onChange={e => setFormData({ ...formData, additionalNote: e.target.value })}
                className="w-full bg-white/5 border border-white/10 p-4 rounded focus:border-gold outline-none transition-all text-sm text-ink font-light"
                placeholder="Storing location, personal memories, price history, etc..."
              />
            </div>
          </div>

          <div className="pt-8">
            <button
              type="submit"
              disabled={isUploading || isSaving}
              className={`w-full bg-gold text-wine-bg py-5 font-bold tracking-[0.3em] uppercase text-xs hover:bg-gold/90 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 ${(isUploading || isSaving) ? 'opacity-50 cursor-wait' : ''}`}
            >
              {(isUploading || isSaving) && <Loader2 size={16} className="animate-spin" />}
              {isUploading ? 'Processing Photo...' : isSaving ? 'Saving to Diary...' : 'Commit to Diary'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [bottles, setBottles] = useState<WineBottle[]>([]);
  const [grapes, setGrapes] = useState<GrapeVariety[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setBottles([]);
      setGrapes([]);
      return;
    }

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

    const unsubBottles = onSnapshot(qBottles, (snapshot) => {
      setBottles(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as WineBottle[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'bottles'));

    const unsubGrapes = onSnapshot(qGrapes, (snapshot) => {
      setGrapes(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as GrapeVariety[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'grapes'));

    return () => {
      unsubBottles();
      unsubGrapes();
    };
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

  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 100000 });
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedGrapes, setSelectedGrapes] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [view, setView] = useState<'cellar' | 'stats' | 'wine-of-the-day' | 'grapes' | 'tutor'>('cellar');
  const [statsSubTab, setStatsSubTab] = useState<'bottles' | 'grapes'>('bottles');
  const [selectedAnalysisCountry, setSelectedAnalysisCountry] = useState<string | null>(null);
  const [selectedAnalysisRegion, setSelectedAnalysisRegion] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'bottle' | 'grape' } | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Batch processing states
  const [selectedBottleIds, setSelectedBottleIds] = useState<string[]>([]);
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState<boolean>(false);
  const [batchAnalysisProgress, setBatchAnalysisProgress] = useState<{ current: number, total: number, wineName: string } | null>(null);
  const [batchAnalysisError, setBatchAnalysisError] = useState<string | null>(null);

  const needingNotesCount = useMemo(() => {
    return bottles.filter(b => !b.appearance || !b.nose || !b.palate || !b.finish || !b.tastingNotes).length;
  }, [bottles]);

  const handleSelectAllNeedingNotes = () => {
    const lackingIds = bottles
      .filter(b => !b.appearance || !b.nose || !b.palate || !b.finish || !b.tastingNotes)
      .map(b => b.id);
    setSelectedBottleIds(lackingIds);
  };

  const handleRunBatchAnalysis = async () => {
    if (selectedBottleIds.length === 0) return;
    setIsBatchAnalyzing(true);
    setBatchAnalysisError(null);
    setBatchAnalysisProgress({ current: 0, total: selectedBottleIds.length, wineName: '' });

    try {
      for (let i = 0; i < selectedBottleIds.length; i++) {
        const bottleId = selectedBottleIds[i];
        const bottle = bottles.find(b => b.id === bottleId);
        if (!bottle) continue;

        setBatchAnalysisProgress({
          current: i + 1,
          total: selectedBottleIds.length,
          wineName: bottle.name
        });

        // Generate tasting notes
        const generatedNotes = await generateTastingNotesForBottle(bottle);

        // Update in Firestore
        const bottleRef = doc(db, 'bottles', bottleId);
        await updateDoc(bottleRef, {
          ...generatedNotes,
          lastUpdated: Date.now()
        });
      }

      setIsBatchMode(false);
      setSelectedBottleIds([]);
      setBatchAnalysisProgress(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
    } catch (err: any) {
      console.error("Batch analysis error:", err);
      setBatchAnalysisError(err.message || "Failed to complete batch analysis. Progress saved for completed items.");
    } finally {
      setIsBatchAnalyzing(false);
    }
  };

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
      if (error.code === 'auth/unauthorized-domain') {
        setAuthError(`Domain "${window.location.hostname}" is not authorized. Please add it to "Authorized domains" in your Firebase Console Authentication settings.`);
      } else if (error.code === 'auth/popup-blocked') {
        setAuthError("Login popup was blocked by your browser. Please allow popups for this site and try again.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        setAuthError("The sign-in window was closed before completion. Please try again. If you continue to see this error, try opening the application in a new tab to bypass iframe pop-up limits.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        setAuthError("A sign-in request is already pending. Please wait a moment or refresh the page and try again.");
      } else {
        setAuthError(error.message || "An unexpected error occurred during login.");
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



  const handleCreateOrUpdate = async (data: Omit<WineBottle, 'id' | 'dateAdded'>) => {
    if (!user) return;

    try {
      console.log("Committing wine record:", { ...data, hasImage: !!data.imageUrl });
      if (editingBottle) {
        const bottleRef = doc(db, 'bottles', editingBottle.id);
        await updateDoc(bottleRef, {
          ...data,
          lastUpdated: Date.now(), // More accurate sync tracking
          userId: user.uid
        });
      } else {
        const bottleId = Math.random().toString(36).substr(2, 9);
        const bottleRef = doc(db, 'bottles', bottleId);
        await setDoc(bottleRef, {
          ...data,
          id: bottleId,
          dateAdded: Date.now(),
          userId: user.uid
        });
      }
      setIsFormOpen(false);
      setEditingBottle(undefined);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
    } catch (error) {
      console.error("Persistence failed:", error);
      handleFirestoreError(error, OperationType.WRITE, 'bottles');
    }
  };

  const handleCreateOrUpdateGrape = async (data: Omit<GrapeVariety, 'id' | 'dateAdded' | 'userId'>) => {
    if (!user) return;

    try {
      if (editingGrape) {
        const grapeRef = doc(db, 'grapes', editingGrape.id);
        await updateDoc(grapeRef, { ...data, userId: user.uid });
      } else {
        const grapeId = Math.random().toString(36).substr(2, 9);
        const grapeRef = doc(db, 'grapes', grapeId);
        await setDoc(grapeRef, {
          ...data,
          id: grapeId,
          dateAdded: Date.now(),
          userId: user.uid
        });
      }
      setIsGrapeFormOpen(false);
      setEditingGrape(undefined);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'grapes');
    }
  };

  const handleDeleteBottle = (id: string) => {
    setItemToDelete({ id, type: 'bottle' });
  };

  const handleDeleteGrape = (id: string) => {
    setItemToDelete({ id, type: 'grape' });
  };

  const confirmDelete = async () => {
    if (!user || !itemToDelete) return;
    const { id, type } = itemToDelete;
    
    try {
      await deleteDoc(doc(db, type === 'bottle' ? 'bottles' : 'grapes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${type === 'bottle' ? 'bottles' : 'grapes'}/${id}`);
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
    grapes.forEach(g => {
      if (counts[g.type] !== undefined) {
        counts[g.type]++;
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  }, [grapes]);

  const COLORS = ['#D4AF37', '#800020', '#C0C0C0', '#FFD700', '#E5E4E2', '#B8860B', '#BC8F8F', '#8B4513'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 bg-wine-bg shadow-2xl">
          <p className="text-[10px] uppercase tracking-widest text-gold font-bold mb-1">{label || payload[0].payload.name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-[11px] text-ink/80 flex items-center justify-between gap-4">
              <span className="opacity-60">{entry.name}:</span>
              <span className="font-bold">
                {entry.name === 'price' ? `฿${entry.value.toLocaleString()}` : entry.value}
              </span>
            </p>
          ))}
          {payload[0].payload.type && (
            <p className="text-[9px] mt-2 text-ink/40 italic">Classification: {payload[0].payload.type}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row wine-gradient overflow-x-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-80 border-r border-white/10 p-10 flex flex-col md:fixed md:h-full z-10 bg-black/20 backdrop-blur-md">
        <div className="flex items-center space-x-4 mb-16 group">
          <div className="w-12 h-12 border border-gold rounded-full flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-wine-bg transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <Sparkle size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-light tracking-widest uppercase text-ink">Bottle Diary</h1>
            <p className="text-[9px] uppercase tracking-[0.4em] text-gold/60 mt-1">Private Reserve</p>
          </div>
        </div>

        <nav className="flex-1 space-y-10 scroll-hide overflow-y-auto">
          <div className="space-y-2">
            <button
              onClick={() => setView('cellar')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-sm transition-all text-[11px] uppercase tracking-[0.3em] ${
                view === 'cellar' ? 'bg-white/[0.09] backdrop-blur-sm border border-white/10 text-gold font-bold shadow-lg' : 'text-ink/50 hover:text-ink hover:bg-white/5'
              }`}
            >
              <Wine size={16} />
              My Cellar
            </button>
            <button
              onClick={() => setView('wine-of-the-day')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-sm transition-all text-[11px] uppercase tracking-[0.3em] ${
                view === 'wine-of-the-day' ? 'bg-white/[0.09] backdrop-blur-sm border border-white/10 text-gold font-bold shadow-lg' : 'text-ink/50 hover:text-ink hover:bg-white/5'
              }`}
            >
              <Star size={16} />
              Wine of the Day
            </button>
            <button
              onClick={() => setView('grapes')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-sm transition-all text-[11px] uppercase tracking-[0.3em] ${
                view === 'grapes' ? 'bg-white/[0.09] backdrop-blur-sm border border-white/10 text-gold font-bold shadow-lg' : 'text-ink/50 hover:text-ink hover:bg-white/5'
              }`}
            >
              <FlaskConical size={16} />
              Grape Varieties
            </button>

            <button
               onClick={() => setView('stats')}
               className={`w-full flex items-center gap-4 px-4 py-3 rounded-sm transition-all text-[11px] uppercase tracking-[0.3em] ${
                 view === 'stats' ? 'bg-white/[0.09] backdrop-blur-sm border border-white/10 text-gold font-bold shadow-lg' : 'text-ink/50 hover:text-ink hover:bg-white/5'
               }`}
             >
               <BarChart3 size={16} />
               Cellar Analytics
             </button>

             <button
                onClick={() => setView('tutor')}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-sm transition-all text-[11px] uppercase tracking-[0.3em] ${
                  view === 'tutor' ? 'bg-white/[0.09] backdrop-blur-sm border border-white/10 text-gold font-bold shadow-lg' : 'text-ink/50 hover:text-ink hover:bg-white/5'
                }`}
              >
                <Sparkles size={16} />
                <span>AI Wine Tutor</span>
              </button>
           </div>
 
           <div>
             <button 
               onClick={() => setIsFilterExpanded(!isFilterExpanded)}
               className="w-full flex items-center justify-between group mb-6 hover:text-gold transition-colors"
             >
               <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold transition-colors">
                 {isFilterExpanded ? 'Hide Filters' : 'Filter Collection'}
               </h3>
               <div className={`transition-transform duration-300 ${isFilterExpanded ? 'rotate-180' : ''}`}>
                 <ChevronDown size={14} className="text-ink/20 group-hover:text-gold" />
               </div>
             </button>
             
             <AnimatePresence initial={false}>
               {isFilterExpanded && (
                 <motion.div 
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: 'auto', opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   className="space-y-6 overflow-hidden pb-10"
                 >
                   <div className="space-y-1.5 hidden">
                     <button 
                       onClick={() => setActiveFilter('All')}
                       className={`w-full flex items-center justify-between px-4 py-2.5 rounded-sm transition-all text-[9px] uppercase tracking-[0.3em] ${
                         activeFilter === 'All' 
                           ? 'bg-gold/10 text-gold border border-gold/20 font-bold' 
                           : 'text-ink/40 hover:text-ink hover:bg-white/5 border border-transparent'
                       }`}
                     >
                       <span>Entire Cellar</span>
                       <span className="opacity-40">{bottles.length}</span>
                     </button>
                     
                     <div className="h-4"></div>
                     <p className="text-[8px] uppercase tracking-widest text-ink/20 font-bold px-4 mb-2">Classifications</p>
                     
                     {WINE_TYPES.map(type => {
                       const typeConfig = WINE_TYPE_CONFIG[type];
                       return (
                         <button 
                           key={type}
                           onClick={() => setActiveFilter(type)}
                           className={`w-full flex items-center justify-between px-4 py-2.5 rounded-sm transition-all text-[9px] uppercase tracking-[0.3em] group ${
                             activeFilter === type 
                               ? `${typeConfig.bg} ${typeConfig.text} ${typeConfig.border} border font-bold` 
                               : 'text-ink/40 hover:text-ink hover:bg-white/5 border border-transparent'
                           }`}
                         >
                           <div className="flex items-center gap-2">
                             <div className={`w-1 h-1 rounded-full ${typeConfig.accent} ${activeFilter === type ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}></div>
                             <span>{type}</span>
                           </div>
                           <span className="opacity-40">
                             {bottles.filter(b => b.type === type).length}
                           </span>
                         </button>
                       );
                     })}
                   </div>

                  {/* Price Range Filter */}
                  <div className="px-4 space-y-3">
                    <p className="text-[8px] uppercase tracking-widest text-ink/20 font-bold mb-2">Price Range (฿)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[7px] uppercase tracking-widest text-ink/30">Min</label>
                        <input 
                          type="number"
                          value={priceRange.min}
                          onChange={(e) => setPriceRange({ ...priceRange, min: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/5 border border-white/10 rounded-sm py-2 px-3 text-[10px] text-ink outline-none focus:border-gold/30"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] uppercase tracking-widest text-ink/30">Max</label>
                        <input 
                          type="number"
                          value={priceRange.max}
                          onChange={(e) => setPriceRange({ ...priceRange, max: parseInt(e.target.value) || 100000 })}
                          className="w-full bg-white/5 border border-white/10 rounded-sm py-2 px-3 text-[10px] text-ink outline-none focus:border-gold/30"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Date Range Filter */}
                  <div className="px-4 space-y-3">
                    <p className="text-[8px] uppercase tracking-widest text-ink/20 font-bold mb-2">Date Added</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[7px] uppercase tracking-widest text-ink/30">Start</label>
                        <input 
                          type="date"
                          value={dateRange.start}
                          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-sm py-2 px-3 text-[10px] text-ink outline-none focus:border-gold/30"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] uppercase tracking-widest text-ink/30">End</label>
                        <input 
                          type="date"
                          value={dateRange.end}
                          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-sm py-2 px-3 text-[10px] text-ink outline-none focus:border-gold/30"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grape Variety Filter */}
                  <div className="px-4 space-y-3 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[8px] uppercase tracking-widest text-ink/20 font-bold">Grape Varieties</p>
                      {selectedGrapes.length > 0 && (
                        <button 
                          onClick={() => setSelectedGrapes([])}
                          className="text-[7px] uppercase tracking-widest text-gold hover:text-gold/80 transition-colors underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                      {availableGrapes.map(grape => (
                        <button
                          key={grape}
                          onClick={() => {
                            if (selectedGrapes.includes(grape)) {
                              setSelectedGrapes(selectedGrapes.filter(g => g !== grape));
                            } else {
                              setSelectedGrapes([...selectedGrapes, grape]);
                            }
                          }}
                          className={`text-[8px] uppercase tracking-wider px-2 py-1 rounded-sm border transition-all ${
                            selectedGrapes.includes(grape)
                              ? 'bg-gold/20 border-gold/40 text-gold shadow-[0_0_10px_rgba(212,175,55,0.1)]'
                              : 'bg-white/5 border-white/10 text-ink/40 hover:border-gold/20'
                          }`}
                        >
                          {grape}
                        </button>
                      ))}
                      {availableGrapes.length === 0 && (
                        <p className="text-[8px] text-ink/20 italic">No varieties found</p>
                      )}
                    </div>
                  </div>

                  {/* Country Filter */}
                  <div className="px-4 space-y-3 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[8px] uppercase tracking-widest text-ink/20 font-bold">Countries</p>
                      {selectedCountries.length > 0 && (
                        <button 
                          onClick={() => setSelectedCountries([])}
                          className="text-[7px] uppercase tracking-widest text-gold hover:text-gold/80 transition-colors underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                      {availableCountries.map(country => (
                        <button
                          key={country}
                          onClick={() => {
                            if (selectedCountries.includes(country)) {
                              setSelectedCountries(selectedCountries.filter(c => c !== country));
                            } else {
                              setSelectedCountries([...selectedCountries, country]);
                            }
                          }}
                          className={`text-[8px] uppercase tracking-wider px-2 py-1 rounded-sm border transition-all ${
                            selectedCountries.includes(country)
                              ? 'bg-gold/20 border-gold/40 text-gold shadow-[0_0_10px_rgba(212,175,55,0.1)]'
                              : 'bg-white/5 border-white/10 text-ink/40 hover:border-gold/20'
                          }`}
                        >
                          {country}
                        </button>
                      ))}
                      {availableCountries.length === 0 && (
                        <p className="text-[8px] text-ink/20 italic">No countries found</p>
                      )}
                    </div>
                  </div>

                  {/* Reset All Filters */}
                  <div className="px-4 pt-4 border-t border-white/5">
                    <button 
                      onClick={() => {
                        setActiveFilter('All');
                        setPriceRange({ min: 0, max: 100000 });
                        setDateRange({ start: '', end: '' });
                        setSelectedGrapes([]);
                        setSelectedCountries([]);
                        setSearchQuery('');
                      }}
                      className="w-full py-3 bg-red-950/20 text-red-500/60 border border-red-950/40 text-[8px] uppercase tracking-[0.3em] font-bold hover:bg-red-950/40 transition-all rounded-sm"
                    >
                      Reset All Filters
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        <div className="mt-auto pt-10 space-y-6">
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 bg-black/20 backdrop-blur-md border border-gold/10 rounded-sm">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-gold/30" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                    <UserIcon size={16} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-ink font-bold truncate uppercase tracking-widest">{user.displayName || 'Collector'}</p>
                  <p className="text-[8px] text-ink/30 truncate uppercase tracking-tighter">{user.email}</p>
                </div>
                <button 
                  onClick={logout}
                  className="p-2 text-ink/40 hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleLogin}
                  className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-gold text-wine-bg text-[10px] uppercase font-bold tracking-[0.3em] hover:bg-gold/90 transition-all rounded-sm shadow-xl active:scale-95"
                >
                  <LogIn size={18} />
                  Connect Devices
                </button>
                {authError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] uppercase tracking-widest leading-relaxed rounded-sm">
                    {authError}
                  </div>
                )}
              </div>
            )}

          <div className="bg-black/20 backdrop-blur-md border border-gold/10 p-6 rounded-sm shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2 opacity-10">
               <Wine size={40} />
             </div>
             <p className="text-[11px] font-light text-ink/60 leading-relaxed italic relative z-10">
               "Wine is bottled poetry."
             </p>
             <p className="text-[9px] uppercase mt-3 text-gold tracking-widest relative z-10">— R.L. Stevenson</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-80 p-8 md:p-16 relative bg-[#071F17] min-h-screen">
        <AnimatePresence mode="wait">
          {authLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
              transition={{ duration: 0.8, ease: "circOut" }}
              className="min-h-screen flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-6">
                <Loader2 size={48} className="text-gold animate-spin" />
                <p className="text-[10px] uppercase tracking-[0.5em] text-gold font-bold">Unlocking the Cellar...</p>
              </div>
            </motion.div>
          ) : !user ? (
            <motion.div
              key="auth-prompt"
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -40, filter: 'blur(10px)' }}
              transition={{ duration: 0.6, ease: "circOut" }}
              className="min-h-[80vh] flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-12"
            >
              <div className="w-32 h-32 border border-gold/30 rounded-full flex items-center justify-center text-gold animate-pulse">
                <Wine size={64} strokeWidth={1} />
              </div>
              
              <div className="space-y-6">
                <h2 className="text-6xl font-serif font-light text-ink leading-tight">Sync your cellar across <br />all your devices.</h2>
                <p className="text-ink/40 font-light leading-relaxed max-w-lg mx-auto">
                  Sign in with your Google account to securely store your wine collection in our private reserve. 
                  Access your tasting notes, and cellar analytics from your Android, iOS, or Desktop.
                </p>
              </div>

              <div className="space-y-8 flex flex-col items-center">
                <button
                  onClick={handleLogin}
                  className="bg-gold text-wine-bg px-12 py-5 font-bold tracking-[0.4em] uppercase text-xs hover:bg-gold/90 transition-all shadow-2xl active:scale-95 flex items-center gap-4"
                >
                  <LogIn size={20} />
                  Sign in with Google
                </button>

                {authError && (
                  <div className="max-w-md p-4 bg-red-500/5 border border-red-500/20 text-red-500 text-[10px] uppercase tracking-[0.2em] leading-relaxed rounded-sm animate-shake">
                    {authError}
                  </div>
                )}
              </div>
              
              <div className="pt-12 grid grid-cols-3 gap-12 w-full border-t border-white/5 opacity-40">
                 <div className="space-y-2">
                   <p className="text-xl font-serif text-ink tracking-widest italic">01</p>
                   <p className="text-[8px] uppercase tracking-widest text-ink">Real-time Sync</p>
                 </div>
                 <div className="space-y-2">
                   <p className="text-xl font-serif text-ink tracking-widest italic">02</p>
                   <p className="text-[8px] uppercase tracking-widest text-ink">Private Vault</p>
                 </div>
                 <div className="space-y-2">
                   <p className="text-xl font-serif text-ink tracking-widest italic">03</p>
                   <p className="text-[8px] uppercase tracking-widest text-ink">AI Insights</p>
                 </div>
              </div>
            </motion.div>
          ) : view === 'wine-of-the-day' ? (
            <motion.div
              key="wine-of-the-day"
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -20 }}
              transition={{ duration: 0.5, ease: "anticipate" }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.5em] text-gold font-bold flex items-center gap-2">
                  <span className="w-8 h-px bg-gold/30"></span>
                  Daily Selection
                </p>
                <h2 className="text-5xl font-serif font-light text-ink leading-tight">Your Wine of the Day.</h2>
                <p className="text-ink/40 max-w-xl font-light leading-relaxed">
                  A special selection from your private reserve, chosen to inspire your palate today.
                </p>
              </div>

              {!wineOfTheDay ? (
                <div className="py-32 bg-white/5 border border-dashed border-white/10 rounded-sm flex flex-col items-center justify-center text-center p-12">
                  <Wine size={48} className="text-ink/10 mb-6" />
                  <h3 className="font-serif text-2xl text-ink/40 mb-2 italic">No Bottles Found</h3>
                  <p className="text-[10px] uppercase tracking-widest text-ink/20 mb-8 max-w-md">
                    Start adding bottles to your cellar to receive a daily selection.
                  </p>
                  <button 
                    onClick={() => { setView('cellar'); setIsFormOpen(true); }}
                    className="flex items-center gap-2 text-gold group"
                  >
                    <Plus size={14} />
                    <span className="text-[10px] uppercase tracking-[0.3em] font-bold group-hover:underline">Add your first bottle</span>
                  </button>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto">
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel overflow-hidden bg-white/5 border-gold/20"
                  >
                    <div className="flex flex-col lg:flex-row">
                      {wineOfTheDay.imageUrl && (
                        <div className="lg:w-1/2 h-96 lg:h-auto bg-black relative">
                          <img 
                            src={wineOfTheDay.imageUrl} 
                            alt={wineOfTheDay.name}
                            className="w-full h-full object-cover mix-blend-lighten opacity-80"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#071F17] lg:block hidden"></div>
                          <div className="absolute inset-0 bg-gradient-to-t from-[#071F17] to-transparent lg:hidden block"></div>
                        </div>
                      )}
                      
                      <div className={`p-10 flex flex-col justify-center ${wineOfTheDay.imageUrl ? 'lg:w-1/2' : 'w-full'}`}>
                        <div className="flex items-center justify-between mb-8">
                           <span className={`text-[10px] uppercase tracking-[0.2em] font-bold px-4 py-1.5 rounded-full border ${WINE_TYPE_CONFIG[wineOfTheDay.type]?.text} ${WINE_TYPE_CONFIG[wineOfTheDay.type]?.bg} ${WINE_TYPE_CONFIG[wineOfTheDay.type]?.border}`}>
                            {wineOfTheDay.type}
                          </span>
                        </div>

                        <div className="space-y-4 mb-10">
                          <h3 className="text-4xl font-serif font-light text-ink leading-tight">{wineOfTheDay.name}</h3>
                          <div className="space-y-1">
                            <p className="font-serif italic text-gold text-lg">{wineOfTheDay.producer}</p>
                            <p className="text-[10px] uppercase tracking-[0.4em] text-ink/30">{wineOfTheDay.year}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-10 border-y border-white/5 py-8">
                          <div className="space-y-1">
                            <p className="text-[9px] uppercase tracking-widest text-ink/30 font-bold">Region</p>
                            <p className="text-sm text-ink/80">{wineOfTheDay.region || '—'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] uppercase tracking-widest text-ink/30 font-bold">Country</p>
                            <p className="text-sm text-ink/80">{wineOfTheDay.country || '—'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] uppercase tracking-widest text-ink/30 font-bold">Grapes</p>
                            <p className="text-sm text-ink/80">{wineOfTheDay.grape?.join(', ') || '—'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] uppercase tracking-widest text-ink/30 font-bold">Price</p>
                            <p className="text-sm text-ink/80">฿{wineOfTheDay.price?.toLocaleString() || '—'}</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <p className="text-[9px] uppercase tracking-widest text-gold font-bold flex items-center gap-2">
                             <Sparkles size={12} />
                             Sommelier's Analytical Review
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {wineOfTheDay.appearance && (
                              <div className="space-y-2">
                                <p className="text-[8px] text-ink/30 uppercase tracking-[0.2em] font-bold">I. Appearance</p>
                                <p className="text-sm italic text-ink/70 leading-relaxed font-serif">{wineOfTheDay.appearance}</p>
                              </div>
                            )}
                            {wineOfTheDay.nose && (
                              <div className="space-y-2">
                                <p className="text-[8px] text-ink/30 uppercase tracking-[0.2em] font-bold">II. Nose</p>
                                <p className="text-sm italic text-ink/70 leading-relaxed font-serif">{wineOfTheDay.nose}</p>
                              </div>
                            )}
                            {wineOfTheDay.palate && (
                              <div className="space-y-2">
                                <p className="text-[8px] text-ink/30 uppercase tracking-[0.2em] font-bold">III. Palate</p>
                                <p className="text-sm italic text-ink/70 leading-relaxed font-serif">{wineOfTheDay.palate}</p>
                              </div>
                            )}
                            {wineOfTheDay.finish && (
                              <div className="space-y-2">
                                <p className="text-[8px] text-ink/30 uppercase tracking-[0.2em] font-bold">IV. Finish</p>
                                <p className="text-sm italic text-ink/70 leading-relaxed font-serif">{wineOfTheDay.finish}</p>
                              </div>
                            )}
                          </div>

                          {wineOfTheDay.tastingNotes && !wineOfTheDay.appearance && !wineOfTheDay.nose && !wineOfTheDay.palate && !wineOfTheDay.finish && (
                            <p className="text-sm italic text-ink/60 leading-relaxed font-serif">
                              "{wineOfTheDay.tastingNotes}"
                            </p>
                          )}
                          {Array.isArray(wineOfTheDay.foodPairing) && wineOfTheDay.foodPairing.length > 0 && (
                            <div className="mt-6 p-6 border border-gold/10 bg-gold/5 rounded-sm">
                              <p className="text-[10px] uppercase tracking-widest text-gold font-bold mb-3 flex items-center gap-2">
                                <Utensils size={10} />
                                Sommelier's Pairing Suggestions
                              </p>
                              <ul className="space-y-2">
                                {wineOfTheDay.foodPairing.map((pairing, i) => (
                                  <li key={i} className="text-xs italic text-ink/80 flex items-start gap-3">
                                    <span className="mt-1.5 w-1 h-1 rounded-full bg-gold/40 shrink-0" />
                                    {pairing}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-10">
                          <button 
                            onClick={() => {
                              setEditingBottle(wineOfTheDay);
                              setIsFormOpen(true);
                            }}
                            className="bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20 px-8 py-4 text-[10px] uppercase tracking-[0.3em] font-bold transition-all"
                          >
                            Update Tasting Notes
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          ) : view === 'grapes' ? (
            <motion.div
              key="grapes"
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -20 }}
              transition={{ duration: 0.5, ease: "anticipate" }}
              className="space-y-16"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-px bg-gold/30"></div>
                    <span className="text-[10px] uppercase tracking-[0.6em] text-gold font-bold">Encyclopedia</span>
                  </div>
                  <h1 className="text-6xl font-serif font-light text-ink">Grape Varieties</h1>
                  <div className="flex items-center gap-6 mt-6">
                    <div className="flex flex-col">
                      <span className="text-[8px] uppercase tracking-widest text-ink/30 font-bold mb-1">Total Varieties</span>
                      <span className="text-xl font-serif text-ink">{grapes.length}</span>
                    </div>
                    <div className="w-px h-6 bg-white/5"></div>
                    <div className="flex flex-col">
                      <span className="text-[8px] uppercase tracking-widest text-ink/30 font-bold mb-1">Red</span>
                      <span className="text-xl font-serif text-[#800020]">{grapes.filter(g => g.type === 'Red').length}</span>
                    </div>
                    <div className="w-px h-6 bg-white/5"></div>
                    <div className="flex flex-col">
                      <span className="text-[8px] uppercase tracking-widest text-ink/30 font-bold mb-1">White</span>
                      <span className="text-xl font-serif text-gold">{grapes.filter(g => g.type === 'White').length}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1 max-w-3xl">
                  <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/5 rounded-sm">
                    <span className="text-[7px] uppercase tracking-widest text-ink/30 font-bold px-3 hidden sm:block">Sort by</span>
                    {(['newest', 'name', 'type'] as const).map((option) => (
                      <button
                        key={option}
                        onClick={() => setSortByGrapes(option)}
                        className={`px-4 py-3 text-[8px] tracking-[0.2em] font-bold uppercase transition-all rounded-sm ${
                          sortByGrapes === option 
                            ? 'bg-gold text-wine-bg shadow-lg' 
                            : 'text-ink/40 hover:text-ink hover:bg-white/5'
                        }`}
                      >
                        {option === 'newest' ? 'Added Date' : option === 'type' ? 'Variety Type' : 'Alphabetical'}
                      </button>
                    ))}
                  </div>

                  <div className="relative group flex-1">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-ink/20 group-focus-within:text-gold transition-colors" size={20} />
                    <input
                      type="text"
                      placeholder="Search varieties..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 px-16 py-5 text-lg font-serif font-light outline-none focus:bg-white/10 focus:border-gold/30 transition-all rounded-sm tracking-wide text-ink placeholder:text-ink/65"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setEditingGrape(undefined);
                      setIsGrapeFormOpen(true);
                    }}
                    className="bg-gold text-[#071F17] px-10 py-5 font-extrabold tracking-[0.4em] uppercase text-[10px] hover:bg-gold/90 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 whitespace-nowrap"
                  >
                    <Plus size={18} />
                    Register Variety
                  </button>
                </div>
              </div>

              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10"
              >
                <AnimatePresence mode="popLayout">
                  {filteredGrapes.map(grape => (
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
                  ))}
                </AnimatePresence>
                
                {grapes.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full py-32 flex flex-col items-center text-center space-y-6"
                  >
                    <div className="w-24 h-24 border border-white/5 rounded-full flex items-center justify-center text-ink/10">
                      <FlaskConical size={48} strokeWidth={1} />
                    </div>
                    <div className="space-y-2">
                       <p className="font-serif text-2xl text-ink/40 font-light italic">Your Encyclopedia is Empty</p>
                       <p className="text-[10px] uppercase tracking-[0.3em] text-ink/20">Start cataloging grape varieties to build your knowledge base</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          ) : view === 'cellar' ? (
            <motion.div
              key="cellar"
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -20 }}
              transition={{ duration: 0.5, ease: "anticipate" }}
              className="space-y-16"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-px bg-gold/30"></div>
                    <span className="text-[10px] uppercase tracking-[0.6em] text-gold font-bold">Cellar</span>
                  </div>
                  <h1 className="text-6xl font-serif font-light text-ink">Inventory</h1>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1 max-w-3xl">
                  <div className="relative group flex-1">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-ink/20 group-focus-within:text-gold transition-colors" size={20} />
                    <input
                      type="text"
                      placeholder="Search reserve..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 px-16 py-5 text-lg font-serif font-light outline-none focus:bg-white/10 focus:border-gold/30 transition-all rounded-sm tracking-wide text-ink placeholder:text-ink/65"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setEditingBottle(undefined);
                      setIsFormOpen(true);
                    }}
                    className="bg-gold text-[#071F17] px-10 py-5 font-extrabold tracking-[0.4em] uppercase text-[10px] hover:bg-gold/90 transition-all shadow-[0_15px_40px_rgba(212,175,55,0.15)] active:scale-95 flex items-center justify-center gap-3 whitespace-nowrap"
                  >
                    <Plus size={18} />
                    Add to Reserve
                  </button>

                  <button
                    onClick={() => {
                      setIsBatchMode(!isBatchMode);
                      setSelectedBottleIds([]);
                    }}
                    className={`px-8 py-5 font-extrabold tracking-[0.4em] uppercase text-[10px] transition-all active:scale-95 flex items-center justify-center gap-3 whitespace-nowrap border rounded-sm ${
                      isBatchMode
                        ? 'bg-gold/25 border-gold text-gold shadow-lg shadow-gold/10 font-bold'
                        : 'bg-white/[0.04] border-white/10 hover:border-gold/30 text-ink/80 hover:text-ink'
                    }`}
                  >
                    <Sparkles size={16} className={isBatchMode ? "animate-pulse" : ""} />
                    {isBatchMode ? 'Cancel Batch' : 'Batch AI'}
                  </button>
                </div>
              </div>

              {/* Horizontal Classifications Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-4 scroll-hide border-b border-white/5">
                <button
                  onClick={() => setActiveFilter('All')}
                  className={`relative px-5 py-2.5 rounded-sm text-[9px] uppercase font-bold tracking-[0.25em] transition-all whitespace-nowrap border shrink-0 ${
                    activeFilter === 'All'
                      ? 'text-gold border-gold shadow-[0_5px_15px_rgba(212,175,55,0.15)] font-bold'
                      : 'border-white/10 text-ink/70 hover:text-ink hover:border-gold/30'
                  }`}
                >
                  {activeFilter === 'All' && (
                    <motion.div
                      layoutId="activeFilterBg"
                      className="absolute inset-0 bg-gold/15 border border-gold/45 -z-10 rounded-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">Entire Cellar ({bottles.length})</span>
                </button>
                
                {WINE_TYPES.map(type => {
                  const typeConfig = WINE_TYPE_CONFIG[type];
                  const count = bottles.filter(b => b.type === type).length;
                  const isSelected = activeFilter === type;
                  
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveFilter(type)}
                      className={`relative px-5 py-2.5 rounded-sm text-[9px] uppercase tracking-[0.25em] transition-all whitespace-nowrap border shrink-0 flex items-center gap-2 ${
                        isSelected
                          ? `${typeConfig.activeText} font-bold shadow-lg`
                          : 'border-white/10 text-ink/70 hover:text-ink hover:border-gold/30'
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="activeFilterBg"
                          className={`absolute inset-0 ${typeConfig.activeBg} -z-10 rounded-sm`}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-current opacity-100' : `${typeConfig.accent} opacity-30`}`}></div>
                        <span>{type} ({count})</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-6 max-w-5xl mx-auto w-full"
              >
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
                      isBatchMode={isBatchMode}
                      isSelected={selectedBottleIds.includes(bottle.id)}
                      onToggleSelect={(id) => {
                        if (selectedBottleIds.includes(id)) {
                          setSelectedBottleIds(prev => prev.filter(bId => bId !== id));
                        } else {
                          setSelectedBottleIds(prev => [...prev, id]);
                        }
                      }}
                    />
                  ))}
                </AnimatePresence>
                
                {filteredBottles.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full py-32 flex flex-col items-center text-center space-y-6"
                  >
                    <div className="w-24 h-24 border border-white/5 rounded-full flex items-center justify-center text-ink/10">
                      <Search size={48} strokeWidth={1} />
                    </div>
                    <div className="space-y-2">
                      <p className="font-serif text-2xl text-ink/40 font-light italic">No bottles match your current filters</p>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-ink/20">Try adjusting your search criteria</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Batch Processing Floating Action Bar */}
              <AnimatePresence>
                {isBatchMode && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[45] glass-panel px-6 py-4 rounded-sm border border-white/10 shadow-2xl bg-[#071F17]/95 backdrop-blur-md max-w-2xl w-[calc(100%-2rem)] flex flex-col md:flex-row items-center justify-between gap-4"
                  >
                    <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                      <span className="text-[10px] uppercase tracking-widest text-gold font-bold">
                        {selectedBottleIds.length} Selected
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSelectAllNeedingNotes}
                          className="text-[10px] uppercase tracking-wider text-gold/80 hover:text-gold transition-all"
                        >
                          Select Needing Notes ({filteredBottles.filter(b => !b.appearance || !b.nose || !b.palate || !b.finish || !b.tastingNotes).length})
                        </button>
                        <span className="text-white/10">|</span>
                        <button
                          onClick={() => setSelectedBottleIds([])}
                          className="text-[10px] uppercase tracking-wider text-ink/50 hover:text-ink transition-all"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                      <button
                        onClick={() => {
                          setIsBatchMode(false);
                          setSelectedBottleIds([]);
                        }}
                        className="px-4 py-2 border border-white/10 hover:border-white/20 text-ink/70 hover:text-ink text-[10px] uppercase tracking-wider rounded-sm transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={selectedBottleIds.length === 0 || isBatchAnalyzing}
                        onClick={handleRunBatchAnalysis}
                        className="bg-gold text-[#071F17] px-5 py-2 font-black tracking-widest uppercase text-[10px] hover:bg-gold/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 rounded-sm"
                      >
                        {isBatchAnalyzing ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={12} />
                            <span>Generate Tasting Notes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Batch Analysis Progress Overlay */}
              <AnimatePresence>
                {batchAnalysisProgress && (
                  <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/80 backdrop-blur-md z-40"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="glass-panel p-8 max-w-md w-full space-y-6 relative z-50 rounded-sm border-white/10 shadow-2xl bg-[#071F17]"
                    >
                      <div className="space-y-4 text-center">
                        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                          <Loader2 size={40} className="text-gold animate-spin absolute" />
                          <Sparkles size={20} className="text-gold/80 animate-pulse" />
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-lg font-serif text-ink uppercase tracking-widest">
                            AI Sommelier at Work
                          </h3>
                          <p className="text-[10px] text-ink/40 uppercase tracking-[0.2em]">
                            Analyzing and generating sensory profiles...
                          </p>
                        </div>

                        {/* Custom Progress Bar */}
                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/10 mt-4">
                          <motion.div 
                            className="bg-gold h-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(batchAnalysisProgress.current / batchAnalysisProgress.total) * 100}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>

                        <div className="flex justify-between text-[10px] uppercase tracking-wider text-ink/50 px-1">
                          <span>Bottle {batchAnalysisProgress.current} of {batchAnalysisProgress.total}</span>
                          <span>{Math.round((batchAnalysisProgress.current / batchAnalysisProgress.total) * 100)}%</span>
                        </div>

                        {batchAnalysisProgress.wineName && (
                          <p className="text-xs font-serif italic text-gold font-medium truncate mt-2 bg-white/[0.02] py-2 px-4 border border-white/5 rounded-sm">
                            "{batchAnalysisProgress.wineName}"
                          </p>
                        )}

                        {batchAnalysisError && (
                          <div className="bg-red-950/20 border border-red-500/20 p-4 rounded text-left mt-4">
                            <p className="text-xs text-red-400 font-medium">{batchAnalysisError}</p>
                            <button
                              onClick={() => {
                                setBatchAnalysisProgress(null);
                                setBatchAnalysisError(null);
                              }}
                              className="mt-2 text-[10px] uppercase tracking-wider text-gold hover:underline"
                            >
                              Close
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : view === 'tutor' ? (
            <motion.div
              key="tutor"
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -20 }}
              transition={{ duration: 0.5, ease: "anticipate" }}
              className="space-y-12 max-w-3xl mx-auto"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-white/5 pb-8">
                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.5em] text-gold font-bold flex items-center gap-2">
                    <span className="w-8 h-px bg-gold/30"></span>
                    Interactive Academy
                  </p>
                  <h2 className="text-4xl font-serif font-light text-ink tracking-wide">AI Wine Tutor</h2>
                  <p className="text-ink/40 text-xs font-light tracking-wide max-w-md">
                    Expand your sommelier expertise with dynamic quizzes and educational insights curated in real-time by artificial intelligence.
                  </p>
                </div>
                
                {/* Score badge */}
                <div className="glass-panel px-6 py-4 bg-white/[0.02] border border-white/5 rounded-sm flex items-center gap-4 self-start sm:self-auto">
                  <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                    <Sparkle size={14} />
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-widest text-ink/40">Intellect Score</p>
                    <p className="text-sm font-serif text-gold font-bold">
                      {totalQuizAnswered > 0 ? `${quizScore} / ${totalQuizAnswered}` : "0 / 0"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quiz Body */}
              <div className="glass-panel p-8 md:p-12 bg-white/[0.01] border border-white/5 rounded-sm relative overflow-hidden shadow-2xl">
                <AnimatePresence mode="wait">
                  {isQuizLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="py-24 flex flex-col items-center justify-center space-y-6"
                    >
                      <Loader2 size={40} className="text-gold animate-spin stroke-1" />
                      <div className="text-center space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold">Consulting the Sommelier...</p>
                        <p className="text-ink/30 text-xs font-light">Crafting a bespoke wine question for you</p>
                      </div>
                    </motion.div>
                  ) : quizError ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="py-16 text-center space-y-6"
                    >
                      <p className="text-red-400 font-serif text-lg italic">{quizError}</p>
                      <button
                        onClick={fetchNewQuizQuestion}
                        className="border border-gold/30 hover:border-gold hover:bg-gold/5 text-gold text-[10px] uppercase tracking-widest font-bold px-6 py-3 transition-colors"
                      >
                        Try Again
                      </button>
                    </motion.div>
                  ) : quizQuestion ? (
                    <motion.div
                      key={quizQuestion.question}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="space-y-8"
                    >
                      <div className="space-y-4">
                        <span className="inline-block px-3 py-1 bg-gold/5 border border-gold/10 text-gold text-[8px] uppercase tracking-[0.2em] rounded-sm font-bold">
                          Question #{totalQuizAnswered + (isAnswerRevealed ? 0 : 1)}
                        </span>
                        <h3 className="text-2xl font-serif font-light text-ink leading-relaxed tracking-wide">
                          {quizQuestion.question}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 gap-4 pt-4">
                        {quizQuestion.options.map((option, idx) => {
                          const isSelected = selectedAnswer === option;
                          const isCorrectOption = option === quizQuestion.correctAnswer;
                          
                          let buttonStyle = "border-white/5 bg-white/[0.02] text-ink/70 hover:border-gold/30 hover:bg-white/[0.04] hover:text-ink";
                          let iconNode = null;

                          if (isAnswerRevealed) {
                            if (isCorrectOption) {
                              buttonStyle = "border-gold/50 bg-gold/10 text-gold font-medium";
                              iconNode = <Check size={16} className="text-gold" />;
                            } else if (isSelected) {
                              buttonStyle = "border-red-500/40 bg-red-500/10 text-red-300";
                              iconNode = <X size={16} className="text-red-400" />;
                            } else {
                              buttonStyle = "border-white/5 bg-white/[0.01] text-ink/30 cursor-not-allowed";
                            }
                          }

                          return (
                            <button
                              key={idx}
                              disabled={isAnswerRevealed}
                              onClick={() => {
                                setSelectedAnswer(option);
                                setIsAnswerRevealed(true);
                                setTotalQuizAnswered(prev => prev + 1);
                                if (option === quizQuestion.correctAnswer) {
                                  setQuizScore(prev => prev + 1);
                                }
                              }}
                              className={`w-full text-left px-6 py-5 rounded-sm transition-all text-sm flex items-center justify-between border ${buttonStyle}`}
                            >
                              <span className="font-light tracking-wide">{option}</span>
                              {iconNode}
                            </button>
                          );
                        })}
                      </div>

                      {/* Reveal feedback & educational note */}
                      <AnimatePresence>
                        {isAnswerRevealed && (
                          <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="pt-8 border-t border-white/5 space-y-6"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`text-[11px] uppercase tracking-[0.4em] font-bold ${selectedAnswer === quizQuestion.correctAnswer ? 'text-gold' : 'text-red-400'}`}>
                                {selectedAnswer === quizQuestion.correctAnswer ? 'Magnificent & Correct' : 'Fascinating, but incorrect'}
                              </span>
                              <span className="text-ink/10">|</span>
                              <span className="text-xs text-ink/40 font-light">
                                The answer is <strong className="text-gold font-serif italic">{quizQuestion.correctAnswer}</strong>
                              </span>
                            </div>

                            <div className="p-6 bg-[#041510]/60 border-l border-gold/40 rounded-sm">
                              <p className="text-[9px] uppercase tracking-[0.2em] text-gold/60 mb-2 font-bold flex items-center gap-2">
                                <Info size={12} />
                                Did you know?
                              </p>
                              <p className="text-ink/80 text-sm font-light leading-relaxed font-serif italic">
                                {quizQuestion.explanation}
                              </p>
                            </div>

                            <div className="flex justify-center pt-4">
                              <button
                                onClick={fetchNewQuizQuestion}
                                className="bg-gold text-[#071F17] hover:bg-gold/90 text-[10px] uppercase tracking-[0.3em] font-bold px-8 py-4 rounded-sm transition-all shadow-xl active:scale-95 flex items-center gap-2"
                              >
                                <Sparkles size={14} />
                                Next Question
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="start"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="py-24 text-center space-y-6"
                    >
                      <p className="text-ink/40 font-light">Begin your interactive wine tutorial journey.</p>
                      <button
                        onClick={fetchNewQuizQuestion}
                        className="bg-gold text-[#071F17] hover:bg-gold/90 text-[10px] uppercase tracking-[0.3em] font-bold px-8 py-4 rounded-sm transition-all shadow-xl"
                      >
                        Start Quiz
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="stats"
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -20 }}
              transition={{ duration: 0.5, ease: "anticipate" }}
              className="space-y-16"
            >
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <header className="space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.5em] text-gold font-bold flex items-center gap-2">
                    <span className="w-8 h-px bg-gold/30"></span>
                    {statsSubTab === 'bottles' ? 'Cellar Analytics' : 'Variety Analytics'}
                  </p>
                  <h2 className="text-5xl font-serif font-light text-ink leading-tight">
                    {statsSubTab === 'bottles' ? (
                      <>Insights into your <br />private collection.</>
                    ) : (
                      <>Knowledge base <br />demographics.</>
                    )}
                  </h2>
                </header>

                <div className="flex gap-1 bg-white/5 p-1 rounded-sm border border-white/5">
                  <button
                    onClick={() => setStatsSubTab('bottles')}
                    className={`px-6 py-2 text-[10px] uppercase tracking-[0.2em] transition-all rounded-sm ${statsSubTab === 'bottles' ? 'bg-gold text-[#071F17] font-bold shadow-lg' : 'text-ink/70 hover:text-ink'}`}
                  >
                    Cellar
                  </button>
                  <button
                    onClick={() => setStatsSubTab('grapes')}
                    className={`px-6 py-2 text-[10px] uppercase tracking-[0.2em] transition-all rounded-sm ${statsSubTab === 'grapes' ? 'bg-gold text-[#071F17] font-bold shadow-lg' : 'text-ink/70 hover:text-ink'}`}
                  >
                    Grapes
                  </button>
                </div>
              </div>

              {statsSubTab === 'bottles' ? (
                bottles.length === 0 ? (
                  <div className="py-32 bg-white/5 border border-dashed border-white/10 rounded-sm flex flex-col items-center justify-center text-center p-12">
                    <BarChart3 size={48} className="text-ink/10 mb-6" />
                    <h3 className="font-serif text-2xl text-ink/40 mb-2 italic">No Data to Analyze</h3>
                    <p className="text-[10px] uppercase tracking-widest text-ink/20 mb-8 max-w-md">
                      Start documenting your cellar to unlock visual insights and trends.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-12">
                    <WorldMap bottles={bottles} />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="glass-panel p-8 space-y-8 bg-white/5 border-white/10">
                        <div>
                          <h3 className="text-lg font-serif text-ink mb-1">Distribution by Type</h3>
                          <p className="text-[10px] uppercase tracking-widest text-ink/30">Categorized cellar breakdown</p>
                        </div>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={typeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {typeData.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={WINE_TYPE_CONFIG[entry.name]?.hex || COLORS[index % COLORS.length]} 
                                  />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="glass-panel p-8 space-y-8 bg-white/5 border-white/10">
                        <div>
                          <h3 className="text-lg font-serif text-ink mb-1">Top Regions</h3>
                          <p className="text-[10px] uppercase tracking-widest text-ink/30">Most prevalent origins in your archive</p>
                        </div>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={regionData} layout="vertical" margin={{ left: 20, right: 30 }}>
                              <XAxis type="number" hide />
                              <YAxis 
                                dataKey="name" 
                                type="category" 
                                stroke="#f8f4ed" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                width={100}
                              />
                              <Tooltip 
                                content={<CustomTooltip />}
                                cursor={{ fill: 'rgba(212,175,55,0.05)' }}
                              />
                              <Bar dataKey="value" name="Bottles" fill="#D4AF37" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                      <div className="glass-panel p-8 space-y-8 bg-white/5 border-white/10 lg:col-span-1">
                        <div>
                          <h3 className="text-lg font-serif text-ink mb-1">Most Popular Varieties</h3>
                          <p className="text-[10px] uppercase tracking-widest text-ink/30">Highest frequency in your collection</p>
                        </div>
                        <div className="space-y-6">
                          {topVarietals.map((v, i) => (
                            <div key={v.name} className="flex justify-between items-center group">
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] text-gold/40 font-mono w-4 italic">{i+1}.</span>
                                <div>
                                  <p className="text-sm font-serif text-ink group-hover:text-gold transition-colors">{v.name}</p>
                                  <p className="text-[9px] uppercase tracking-widest text-ink/30">{v.count} bottles documented</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="glass-panel p-8 space-y-8 bg-white/5 border-white/10 lg:col-span-2 shadow-2xl">
                        <div>
                          <h3 className="text-lg font-serif text-ink mb-1">Cellar Growth</h3>
                          <p className="text-[10px] uppercase tracking-widest text-ink/30">Cumulative bottle count over time</p>
                        </div>
                        <div className="h-[350px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={cellarGrowthData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis 
                                dataKey="name" 
                                stroke="#f8f4ed" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                dy={10}
                              />
                              <YAxis 
                                stroke="#f8f4ed" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                dx={-10}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Line 
                                type="monotone" 
                                dataKey="count" 
                                name="Total Bottles"
                                stroke="#D4AF37" 
                                strokeWidth={3} 
                                dot={{ r: 4, fill: '#D4AF37', strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: '#D4AF37', strokeWidth: 2, stroke: '#071F17' }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                      <div className="glass-panel p-8 space-y-8 bg-white/5 border-white/10">
                        <div>
                          <h3 className="text-lg font-serif text-ink mb-1">Value Distribution</h3>
                          <p className="text-[10px] uppercase tracking-widest text-ink/30">Breakdown of reserve value tiers</p>
                        </div>
                        <div className="h-[350px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={priceDistributionData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis 
                                dataKey="name" 
                                stroke="#f8f4ed" 
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis 
                                stroke="#f8f4ed" 
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Bar 
                                dataKey="value" 
                                name="Bottles" 
                                fill="#D4AF37"
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-12">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                      <div className="glass-panel p-8 bg-white/5 border-white/10 lg:col-span-1">
                        <div className="mb-8">
                          <h3 className="text-lg font-serif text-ink mb-1">Variety Composition</h3>
                          <p className="text-[10px] uppercase tracking-widest text-ink/30">Red vs White Library</p>
                        </div>
                        <div className="space-y-6">
                           {grapeTypeData.map((item) => (
                             <div key={item.name} className="space-y-2">
                               <div className="flex justify-between items-end">
                                 <span className="text-[10px] uppercase tracking-[0.2em] text-ink font-bold">{item.name}</span>
                                 <span className="text-xl font-serif text-gold">{item.value}</span>
                               </div>
                               <div className="h-1.5 w-full bg-white/5 overflow-hidden">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${(item.value / grapes.length) * 100}%` }}
                                   transition={{ duration: 1, ease: "easeOut" }}
                                   className="h-full" 
                                   style={{ 
                                     backgroundColor: item.name === 'Red' ? '#800020' : '#f8f4ed'
                                   }}
                                 />
                               </div>
                               <p className="text-[8px] text-right text-ink/20 italic">{Math.round((item.value / grapes.length) * 100)}% of library</p>
                             </div>
                           ))}
                           {grapes.length === 0 && (
                             <p className="text-xs text-ink/30 italic">Add grapes to see composition</p>
                           )}
                        </div>
                        
                        <div className="mt-12 pt-8 border-t border-white/5">
                           <p className="text-[32px] font-serif text-ink leading-none">{grapes.length}</p>
                           <p className="text-[9px] uppercase tracking-[0.4em] text-gold mt-2">Total Varieties</p>
                        </div>
                      </div>

                      <div className="glass-panel p-8 space-y-8 bg-white/5 border-white/10 lg:col-span-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div>
                            <h3 className="text-lg font-serif text-ink mb-1">Grape Geography</h3>
                            <p className="text-[10px] uppercase tracking-widest text-ink/30">Encyclopedia diversity by country</p>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scroll-hide">
                            {grapeGeographyData.map(country => (
                              <button
                                key={country.name}
                                onClick={() => {
                                  if (selectedAnalysisCountry === country.name) {
                                    setSelectedAnalysisCountry(null);
                                    setSelectedAnalysisRegion(null);
                                  } else {
                                    setSelectedAnalysisCountry(country.name);
                                    setSelectedAnalysisRegion(null);
                                  }
                                }}
                                className={`px-4 py-2 text-[9px] uppercase tracking-widest border transition-all whitespace-nowrap rounded-sm ${selectedAnalysisCountry === country.name ? 'bg-gold text-wine-bg border-gold' : 'border-white/10 text-ink/40 hover:border-gold/30 hover:text-ink'}`}
                              >
                                {country.name} ({country.total})
                              </button>
                            ))}
                          </div>
                        </div>

                        <AnimatePresence mode="wait">
                    {selectedAnalysisCountry ? (
                      <motion.div
                        key={selectedAnalysisCountry}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-6 border-t border-white/5"
                      >
                        <div className="space-y-4">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold">Regions in {selectedAnalysisCountry}</p>
                          <div className="flex flex-wrap gap-2">
                            {grapeGeographyData.find(c => c.name === selectedAnalysisCountry)?.regionMap.map(region => (
                              <button 
                                key={region.name} 
                                onClick={() => setSelectedAnalysisRegion(selectedAnalysisRegion === region.name ? null : region.name)}
                                className={`px-3 py-1 border text-[11px] rounded-sm transition-all flex items-center gap-2 ${
                                  selectedAnalysisRegion === region.name 
                                    ? 'bg-gold/20 border-gold/40 text-gold' 
                                    : 'bg-white/5 border-white/5 text-ink/60 hover:border-gold/20'
                                }`}
                              >
                                {region.name}
                                <span className="text-[8px] opacity-40">({region.grapes.length})</span>
                              </button>
                            )) || <p className="text-xs text-ink/30 italic">No regions specified</p>}
                          </div>
                        </div>

                        <div className="space-y-6">
                          {selectedAnalysisRegion ? (
                            <motion.div
                              initial={{ opacity: 0, x: 5 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="space-y-4"
                            >
                              <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold flex items-center justify-between">
                                Varieties in {selectedAnalysisRegion}
                                <button 
                                  onClick={() => setSelectedAnalysisRegion(null)}
                                  className="text-[8px] border border-gold/20 px-2 py-1 hover:bg-gold/10 transition-colors"
                                >
                                  Back to All Country Varieties
                                </button>
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {grapeGeographyData
                                  .find(c => c.name === selectedAnalysisCountry)
                                  ?.regionMap.find(r => r.name === selectedAnalysisRegion)
                                  ?.grapes.map(grape => (
                                    <span key={grape} className="px-3 py-1 border border-gold/20 text-gold text-[11px] font-serif italic rounded-sm bg-gold/5">
                                      {grape}
                                    </span>
                                  ))}
                              </div>
                            </motion.div>
                          ) : (
                            <div className="space-y-4">
                              <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold">All Varieties from {selectedAnalysisCountry}</p>
                              <div className="flex flex-wrap gap-2">
                                {grapeGeographyData.find(c => c.name === selectedAnalysisCountry)?.grapes.map(grape => (
                                  <span key={grape} className="px-3 py-1 border border-gold/10 text-gold/80 text-[11px] font-serif italic rounded-sm">
                                    {grape}
                                  </span>
                                )) || <p className="text-xs text-ink/30 italic">No varieties specified</p>}
                              </div>
                              <p className="text-[8px] text-ink/20 italic mt-2">Click a region to filter by area</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <div className="py-12 text-center border-t border-white/5">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-ink/20">Select a country above to see regional & variety insights</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
        </AnimatePresence>
      </main>

      {/* Comparison Bar */}
      <AnimatePresence>
        {selectedGrapesForComparison.length > 0 && view === 'grapes' && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl"
          >
            <div className="glass-panel p-4 bg-gold/10 border-gold/30 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-gold/30 rounded-full flex items-center justify-center text-gold">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gold font-bold">{selectedGrapesForComparison.length} Varieties Selected</p>
                  <div className="flex gap-1 mt-1">
                    {comparedGrapes.map(g => (
                      <span key={g.id} className="text-[8px] text-ink/60 uppercase">{g.name}</span>
                    )).reduce((prev: any, curr: any) => [prev, <span key={`sep-${curr.key}`} className="text-[8px] text-ink/20 mx-1">•</span>, curr])}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedGrapesForComparison([])}
                  className="text-[9px] uppercase tracking-widest text-ink/40 hover:text-ink transition-colors px-4"
                >
                  Clear
                </button>
                <button 
                  onClick={() => setIsComparingGrapes(true)}
                  disabled={selectedGrapesForComparison.length < 2}
                  className={`bg-gold text-wine-bg px-8 py-3 text-[10px] uppercase tracking-[0.2em] font-bold shadow-lg transition-all ${selectedGrapesForComparison.length < 2 ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                >
                  {selectedGrapesForComparison.length < 2 
                    ? `Add ${2 - selectedGrapesForComparison.length} more` 
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
              className="fixed inset-0 bg-[#000]/80 backdrop-blur-md z-40"
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
              className="fixed inset-0 bg-[#000]/80 backdrop-blur-md z-40"
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

      <footer className="md:ml-80 p-12 border-t border-white/5 text-center mt-auto">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-[1px] bg-gold/20"></div>
          <p className="text-[9px] uppercase tracking-[0.5em] text-ink/20 font-bold">
            Bottle Diary Archive • Version 2.1.5 • AI Sommelier v3.3
          </p>
        </div>
      </footer>

      {/* Success Toast Notification */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] px-4 w-full max-w-sm"
          >
            <div className="bg-[#1c2e1c] border border-green-500/30 p-5 rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0 shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                <Check size={18} strokeWidth={3} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase font-black tracking-[0.15em] text-green-100 leading-tight">
                  SUCCESS: IMAGE COMMITTED TO DIARY. RECORD UPDATED.
                </p>
              </div>
              <button 
                onClick={() => setShowSuccessToast(false)}
                className="text-green-500/40 hover:text-green-500 transition-colors"
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
            <motion.div 
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 4, ease: "linear" }}
              className="absolute bottom-0 left-0 h-0.5 bg-green-500/50 rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
