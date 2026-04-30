import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Wine, Trash2, Edit2, Star, X, Info, Globe, Banknote, ChevronDown, Upload, Camera, Loader2, Sparkles, Sparkle, BarChart3, LogIn, LogOut, User as UserIcon, Droplets, FlaskConical, Leaf } from 'lucide-react';
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
import { WineBottle, WineType, SortOption, GrapeVariety } from './types';
import { getWineRecommendations, Recommendation, analyzeWineLabel } from './services/aiService';

// --- Configuration ---

const WINE_TYPES: WineType[] = ['Red', 'White', 'Rosé', 'Sparkling', 'Natural Red', 'Natural White', 'Pet Nat', 'Orange', 'Sato', 'Sake'];

const WINE_TYPE_CONFIG: Record<string, { text: string, bg: string, border: string, accent: string, hex: string }> = {
  'Red': { text: 'text-[#ff4d4d]', bg: 'bg-[#ff4d4d]/10', border: 'border-[#ff4d4d]/20', accent: 'bg-[#ff4d4d]', hex: '#800020' },
  'White': { text: 'text-[#f0e68c]', bg: 'bg-[#f0e68c]/10', border: 'border-[#f0e68c]/20', accent: 'bg-[#f0e68c]', hex: '#D4AF37' },
  'Rosé': { text: 'text-[#ffb6c1]', bg: 'bg-[#ffb6c1]/10', border: 'border-[#ffb6c1]/20', accent: 'bg-[#ffb6c1]', hex: '#FFC0CB' },
  'Sparkling': { text: 'text-[#e0ffff]', bg: 'bg-[#e0ffff]/10', border: 'border-[#e0ffff]/20', accent: 'bg-[#e0ffff]', hex: '#C0C0C0' },
  'Natural Red': { text: 'text-[#8b0000]', bg: 'bg-[#8b0000]/10', border: 'border-[#8b0000]/20', accent: 'bg-[#8b0000]', hex: '#4A0404' },
  'Natural White': { text: 'text-[#fafad2]', bg: 'bg-[#fafad2]/10', border: 'border-[#fafad2]/20', accent: 'bg-[#fafad2]', hex: '#EEDC82' },
  'Pet Nat': { text: 'text-[#ffe4b5]', bg: 'bg-[#ffe4b5]/10', border: 'border-[#ffe4b5]/20', accent: 'bg-[#ffe4b5]', hex: '#FFDB58' },
  'Orange': { text: 'text-[#ffa500]', bg: 'bg-[#ffa500]/10', border: 'border-[#ffa500]/20', accent: 'bg-[#ffa500]', hex: '#CC5500' },
  'Sato': { text: 'text-[#fffaf0]', bg: 'bg-[#fffaf0]/10', border: 'border-[#fffaf0]/20', accent: 'bg-[#fffaf0]', hex: '#FDF5E6' },
  'Sake': { text: 'text-[#f5f5f5]', bg: 'bg-[#f5f5f5]/10', border: 'border-[#f5f5f5]/20', accent: 'bg-[#f5f5f5]', hex: '#F0F8FF' },
};

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
        className="glass-panel p-8 max-w-sm w-full space-y-6 relative z-50 rounded-sm border-white/10 shadow-2xl bg-[#1a1414]"
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
}

const GrapeCard: React.FC<GrapeCardProps> = ({ grape, onEdit, onDelete }) => {
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
        <span className={`text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-1 rounded-full border ${grape.type === 'Red' ? 'text-red-400 bg-red-950/40 border-red-900/50' : 'text-yellow-100 bg-yellow-950/30 border-yellow-800/30'}`}>
          {grape.type}
        </span>
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
        <p className="text-[10px] text-gold/60 uppercase tracking-widest mt-1">{grape.region}, {grape.country}</p>
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
          <p className="text-[8px] text-ink/30 uppercase tracking-[0.2em] font-bold mb-1">Food Pairing</p>
          <p className="text-xs text-gold/60 line-clamp-2 font-serif italic">{grape.foodPairing || '—'}</p>
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
    region: grape?.region || '',
    country: grape?.country || '',
    body: grape?.body || '',
    acidity: grape?.acidity || '',
    tannin: grape?.tannin || '',
    sweetness: grape?.sweetness || '',
    aromaFlavor: grape?.aromaFlavor || '',
    otherNotes: grape?.otherNotes || '',
    foodPairing: grape?.foodPairing || '',
    additionalNotes: grape?.additionalNotes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#141212] shadow-2xl z-50 overflow-y-auto border-l border-white/5"
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

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Region</label>
              <input value={formData.region} onChange={e => setFormData({ ...formData, region: e.target.value })} className="w-full bg-transparent border-b border-white/10 py-2 text-ink" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Country</label>
              <input value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} className="w-full bg-transparent border-b border-white/10 py-2 text-ink" />
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
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Food Pairing</label>
              <textarea rows={2} value={formData.foodPairing} onChange={e => setFormData({ ...formData, foodPairing: e.target.value })} className="w-full bg-white/5 border border-white/10 p-4 rounded text-sm text-ink" placeholder="Grilled salmon, duck..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Other Notes</label>
              <textarea rows={2} value={formData.otherNotes} onChange={e => setFormData({ ...formData, otherNotes: e.target.value })} className="w-full bg-white/5 border border-white/10 p-4 rounded text-sm text-ink" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Additional Notes</label>
              <textarea rows={2} value={formData.additionalNotes} onChange={e => setFormData({ ...formData, additionalNotes: e.target.value })} className="w-full bg-white/5 border border-white/10 p-4 rounded text-sm text-ink" />
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

interface WineCardProps {
  bottle: WineBottle;
  onEdit: (bottle: WineBottle) => void;
  onDelete: (id: string) => void;
}

const WineCard: React.FC<WineCardProps> = ({ bottle, onEdit, onDelete }) => {
  const typeConfig = WINE_TYPE_CONFIG[bottle.type] || { text: 'text-gray-400', bg: 'bg-gray-900/40', border: 'border-gray-800/50', accent: 'bg-gray-500' };

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className={`glass-panel p-6 flex flex-col h-full group relative transition-all duration-300 rounded-sm overflow-hidden border-l-2 ${typeConfig.border.replace('border-', 'border-l-')}`}
    >
      <div className="flex justify-between items-start mb-6">
        <span className={`text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-1 rounded-full border ${typeConfig.text} ${typeConfig.bg} ${typeConfig.border}`}>
          {bottle.type}
        </span>
        <div className="flex space-x-1">
          <button
            onClick={() => onEdit(bottle)}
            className="p-1.5 text-ink/40 hover:text-gold transition-colors"
            title="Edit Diary"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(bottle.id)}
            className="p-1.5 text-ink/40 hover:text-red-500 transition-colors"
            title="Delete Entry"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {bottle.imageUrl && (
        <div className="mb-6 -mx-6 -mt-6 h-48 overflow-hidden rounded-t-sm border-b border-white/5 relative bg-black/40">
          <img 
            src={bottle.imageUrl} 
            alt={bottle.name} 
            className="w-full h-full object-cover mix-blend-lighten opacity-80 group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141212] to-transparent opacity-60"></div>
        </div>
      )}

      <div className="mb-4">
        <h3 className="font-serif text-2xl font-light text-ink tracking-wide line-clamp-2 leading-tight group-hover:text-gold transition-colors">{bottle.name}</h3>
        <p className="font-serif italic text-gold/80 text-sm mt-1">{bottle.producer} • <span className="font-sans not-italic text-xs tracking-widest uppercase opacity-60">{bottle.year}</span></p>
      </div>

      <div className="mt-auto space-y-4">
        <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
          {Array.isArray(bottle.grape) && bottle.grape.map((g, i) => (
            <span key={i} className="text-[9px] uppercase tracking-wider text-gold/60 border border-gold/10 px-2 py-0.5 rounded-sm flex items-center gap-1">
              <span className="w-1 h-1 bg-gold/40 rounded-full"></span>
              {g}
            </span>
          ))}
        </div>
        
        <div className="flex items-center space-x-0.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={12}
              className={i < bottle.rating ? 'fill-gold text-gold' : 'text-white/10'}
            />
          ))}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[9px] text-ink/30 uppercase tracking-widest font-bold">Region & Country</p>
            <p className="text-[11px] font-medium text-ink/80 flex items-center gap-1">
              <Globe size={10} className="text-gold/60" />
              {bottle.region}{bottle.country ? `, ${bottle.country}` : ''}
            </p>
          </div>
          {bottle.price && (
            <div className="space-y-1">
              <p className="text-[9px] text-ink/30 uppercase tracking-widest font-bold">Value</p>
              <p className="text-[11px] font-medium text-gold flex items-center gap-1">
                <Banknote size={10} className="text-gold/60" />
                ฿{bottle.price.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-white/5">
        <p className="text-[11px] text-ink/30 uppercase tracking-widest font-bold mb-2">Tasting Notes</p>
        <p className="text-xs italic text-ink/60 line-clamp-2 leading-relaxed mb-3">
          {bottle.tastingNotes || "No tasting notes recorded..."}
        </p>
        
        {bottle.additionalNote && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-[9px] text-ink/30 uppercase tracking-widest font-bold mb-1">Additional Notes</p>
            <p className="text-[11px] text-ink/50 leading-relaxed line-clamp-2">
              {bottle.additionalNote}
            </p>
          </div>
        )}
      </div>
      
      <button 
        onClick={() => onEdit(bottle)}
        className="mt-4 w-full py-2 border border-gold/20 text-gold hover:bg-gold/5 text-[9px] uppercase tracking-[0.3em] transition-all rounded-sm"
      >
        Reveal Detail
      </button>
    </motion.div>
  );
};

interface RecommendationCardProps {
  recommendation: Recommendation;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation }) => {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className="glass-panel p-6 flex flex-col h-full bg-gold/5 border-gold/10 relative overflow-hidden"
    >
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-gold/5 blur-3xl rounded-full"></div>
      
      <div className="flex justify-between items-start mb-6">
        <span className="text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-1 rounded-full border text-gold bg-gold/10 border-gold/20 flex items-center gap-2">
          <Sparkles size={10} />
          AI Suggestion
        </span>
        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-ink/30">
          {recommendation.type}
        </span>
      </div>

      <div className="mb-4">
        <h3 className="font-serif text-2xl font-light text-ink tracking-wide line-clamp-2 leading-tight">{recommendation.name}</h3>
        <p className="font-serif italic text-gold/80 text-sm mt-1">{recommendation.producer}</p>
      </div>

      <div className="mt-auto space-y-4">
        <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
          {recommendation.grape.map((g, i) => (
            <span key={i} className="text-[9px] uppercase tracking-wider text-gold/40 border border-gold/10 px-2 py-0.5 rounded-sm">
              {g}
            </span>
          ))}
        </div>
        
        <div className="space-y-1">
          <p className="text-[9px] text-ink/30 uppercase tracking-widest font-bold">Region & Country</p>
          <p className="text-[11px] font-medium text-ink/80 flex items-center gap-1">
            <Globe size={10} className="text-gold/60" />
            {recommendation.region}, {recommendation.country}
          </p>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-gold/10">
        <p className="text-[10px] text-gold/60 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
          <Info size={10} />
          Why you'll love it
        </p>
        <p className="text-xs italic text-ink/80 leading-relaxed">
          {recommendation.reason}
        </p>
      </div>
    </motion.div>
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
    rating: bottle?.rating || 3,
    tastingNotes: bottle?.tastingNotes || '',
    additionalNote: bottle?.additionalNote || '',
    price: bottle?.price || 0,
    imageUrl: bottle?.imageUrl || '',
    locationPurchased: bottle?.locationPurchased || '',
  });

  const [grapeInput, setGrapeInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);

  useEffect(() => {
    if (analysisSuccess) {
      const timer = setTimeout(() => setAnalysisSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [analysisSuccess]);

  const handleAIScan = async (imageUrl: string) => {
    if (!imageUrl) return;
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeWineLabel(imageUrl);
      setFormData(prev => ({
        ...prev,
        ...analysis,
        name: analysis.name || prev.name,
        producer: analysis.producer || prev.producer,
        year: analysis.year || prev.year,
        type: (analysis.type as WineType) || prev.type,
        region: analysis.region || prev.region,
        country: analysis.country || prev.country,
        grape: Array.isArray(analysis.grape) ? [...new Set([...(Array.isArray(prev.grape) ? prev.grape : []), ...analysis.grape])] : prev.grape,
        tastingNotes: analysis.tastingNotes ? `${analysis.tastingNotes}${prev.tastingNotes ? '\n\n' + prev.tastingNotes : ''}` : prev.tastingNotes,
      }));
      setAnalysisSuccess(true);
    } catch (err) {
      console.error("AI Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload image');
      }

      setFormData(prev => ({ ...prev, imageUrl: result.url }));
      setIsUploading(false);
      
      // Automatically trigger AI scan for new uploads
      await handleAIScan(result.url);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err instanceof Error ? err.message : 'An unexpected error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Please select a valid image file');
        return;
      }
      uploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Please drop a valid image file');
        return;
      }
      uploadFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentGrapes = Array.isArray(formData.grape) ? formData.grape : [];
    const finalGrapes = grapeInput.trim() ? [...currentGrapes, grapeInput.trim()] : currentGrapes;
    
    onSave({ 
      ...formData, 
      grape: finalGrapes,
      region: formData.region || '',
      country: formData.country || '',
      producer: formData.producer || '',
      year: formData.year || 'NV',
      type: formData.type || 'Red'
    });
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

  const wineTypes: WineType[] = ['Red', 'White', 'Rosé', 'Sparkling', 'Natural Red', 'Natural White', 'Pet Nat', 'Orange', 'Sato', 'Sake'];

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#141212] shadow-2xl z-50 overflow-y-auto border-l border-white/5"
    >
      <div className="p-10">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="font-serif text-4xl text-ink font-light tracking-wide">
              {bottle ? 'Update Entry' : 'New Cellar Entry'}
            </h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold/60 mt-2">Log your latest discovery</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5">
            <X size={20} />
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
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#1a1414] border border-white/10 rounded-sm z-50 max-h-32 overflow-y-auto shadow-2xl scroll-hide">
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
                          {g.name} <span className="opacity-40 italic ml-2">({g.region})</span>
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

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Personal Rating</label>
            <div className="flex space-x-3 pt-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: r })}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={28}
                    className={r <= formData.rating ? 'fill-gold text-gold' : 'text-white/10'}
                  />
                </button>
              ))}
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
            
            <div className="space-y-2 pt-4">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Tasting Notes</label>
              <textarea
                rows={3}
                value={formData.tastingNotes}
                onChange={e => setFormData({ ...formData, tastingNotes: e.target.value })}
                className="w-full bg-white/5 border border-white/10 p-4 rounded focus:border-gold outline-none transition-all text-sm text-ink italic font-light"
                placeholder="Aroma, palate, and finish..."
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Additional Notes</label>
              <textarea
                rows={2}
                value={formData.additionalNote}
                onChange={e => setFormData({ ...formData, additionalNote: e.target.value })}
                className="w-full bg-white/5 border border-white/10 p-4 rounded focus:border-gold outline-none transition-all text-sm text-ink font-light"
                placeholder="Storing location, food pairings, etc..."
              />
            </div>
          </div>

          <div className="pt-8">
            <button
              type="submit"
              className="w-full bg-gold text-wine-bg py-5 font-bold tracking-[0.3em] uppercase text-xs hover:bg-gold/90 transition-all shadow-2xl active:scale-95"
            >
              Commit to Diary
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
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 100000 });
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedGrapes, setSelectedGrapes] = useState<string[]>([]);
  const [view, setView] = useState<'cellar' | 'recommendations' | 'stats' | 'wine-of-the-day' | 'grapes'>('cellar');
  const [statsSubTab, setStatsSubTab] = useState<'bottles' | 'grapes'>('bottles');
  const [selectedAnalysisCountry, setSelectedAnalysisCountry] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isRecLoading, setIsRecLoading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'bottle' | 'grape' } | null>(null);

  const filteredGrapes = grapes.filter(g => {
    const term = searchQuery.toLowerCase();
    return (g.name || '').toLowerCase().includes(term) ||
           (g.region || '').toLowerCase().includes(term) ||
           (g.country || '').toLowerCase().includes(term) ||
           (g.aromaFlavor || '').toLowerCase().includes(term);
  });

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
    
    // Prefer higher rated bottles
    const potentialWines = bottles.filter(b => b.rating >= 4);
    const sourcePool = potentialWines.length > 0 ? potentialWines : bottles;
    
    // Pseudo-random index based on seed
    const index = seed % sourcePool.length;
    return sourcePool[index];
  }, [bottles]);

  const topVarietals = useMemo(() => {
    const counts: Record<string, { count: number; totalRating: number }> = {};
    bottles.forEach(b => {
      (b.grape || []).forEach(g => {
        if (!counts[g]) counts[g] = { count: 0, totalRating: 0 };
        counts[g].count += 1;
        counts[g].totalRating += b.rating;
      });
    });
    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgRating: parseFloat((data.totalRating / data.count).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [bottles]);

  const fetchRecommendations = async () => {
    if (bottles.length === 0) return;
    setIsRecLoading(true);
    try {
      const recs = await getWineRecommendations(bottles);
      setRecommendations(recs);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRecLoading(false);
    }
  };

  const handleCreateOrUpdate = async (data: Omit<WineBottle, 'id' | 'dateAdded'>) => {
    if (!user) return;

    try {
      if (editingBottle) {
        const bottleRef = doc(db, 'bottles', editingBottle.id);
        await updateDoc(bottleRef, {
          ...data,
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
    } catch (error) {
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

      return matchesSearch && matchesType && matchesPrice && matchesDate && matchesGrapes;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return b.dateAdded - a.dateAdded;
        case 'rating': return b.rating - a.rating;
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
    averageRating: bottles.length > 0 ? (bottles.reduce((acc: number, b) => acc + b.rating, 0) / bottles.length).toFixed(1) : '—',
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

  const ratingTimeData = bottles
    .slice()
    .sort((a, b) => (a.dateAdded as number) - (b.dateAdded as number))
    .reduce((acc: any[], b) => {
      const date = new Date(b.dateAdded);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      const existing = acc.find(item => item.name === monthYear);
      if (existing) {
        existing.totalRating += b.rating;
        existing.count += 1;
        existing.rating = parseFloat((existing.totalRating / existing.count).toFixed(1));
      } else {
        acc.push({ name: monthYear, rating: b.rating, totalRating: b.rating, count: 1 });
      }
      return acc;
    }, []);

  const priceRatingData = bottles
    .filter(b => b.price && b.price > 0)
    .map(b => ({
      name: b.name,
      price: b.price,
      rating: b.rating,
      type: b.type
    }));

  const grapeGeographyData = useMemo(() => {
    const countries: Record<string, { regions: Set<string>; grapes: Set<string>; total: number }> = {};
    
    grapes.forEach(g => {
      const country = g.country || 'Unknown';
      if (!countries[country]) {
        countries[country] = { regions: new Set(), grapes: new Set(), total: 0 };
      }
      countries[country].total += 1;
      if (g.region) countries[country].regions.add(g.region);
      if (g.name) countries[country].grapes.add(g.name);
    });

    return Object.entries(countries).map(([name, data]) => ({
      name,
      total: data.total,
      regions: Array.from(data.regions),
      grapes: Array.from(data.grapes)
    })).sort((a, b) => b.total - a.total);
  }, [grapes]);

  const COLORS = ['#D4AF37', '#800020', '#C0C0C0', '#FFD700', '#E5E4E2', '#B8860B', '#BC8F8F', '#8B4513'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 bg-[#1a1414] border border-gold/20 shadow-2xl">
          <p className="text-[10px] uppercase tracking-widest text-gold font-bold mb-1">{label || payload[0].payload.name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-[11px] text-ink/80 flex items-center justify-between gap-4">
              <span className="opacity-60">{entry.name}:</span>
              <span className="font-bold">
                {entry.name === 'price' ? `฿${entry.value.toLocaleString()}` : entry.value}
                {entry.name === 'rating' ? ' / 5' : ''}
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
                view === 'cellar' ? 'bg-white/10 text-gold font-bold shadow-lg' : 'text-ink/40 hover:text-ink hover:bg-white/5'
              }`}
            >
              <Wine size={16} />
              My Cellar
            </button>
            <button
              onClick={() => setView('wine-of-the-day')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-sm transition-all text-[11px] uppercase tracking-[0.3em] ${
                view === 'wine-of-the-day' ? 'bg-gold/10 text-gold font-bold shadow-lg' : 'text-ink/40 hover:text-ink hover:bg-white/5'
              }`}
            >
              <Star size={16} />
              Wine of the Day
            </button>
            <button
              onClick={() => setView('grapes')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-sm transition-all text-[11px] uppercase tracking-[0.3em] ${
                view === 'grapes' ? 'bg-gold/10 text-gold font-bold shadow-lg' : 'text-ink/40 hover:text-ink hover:bg-white/5'
              }`}
            >
              <FlaskConical size={16} />
              Grape Varieties
            </button>
            <button
              onClick={() => {
                setView('recommendations');
                if (recommendations.length === 0) fetchRecommendations();
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-sm transition-all text-[11px] uppercase tracking-[0.3em] ${
                view === 'recommendations' ? 'bg-gold text-wine-bg font-bold shadow-[0_0_20px_rgba(212,175,55,0.3)]' : 'text-ink/40 hover:text-ink hover:bg-gold/10'
              }`}
            >
              <Sparkles size={16} />
              AI Sommelier
            </button>
            <button
               onClick={() => setView('stats')}
               className={`w-full flex items-center gap-4 px-4 py-3 rounded-sm transition-all text-[11px] uppercase tracking-[0.3em] ${
                 view === 'stats' ? 'bg-white/10 text-gold font-bold shadow-lg' : 'text-ink/40 hover:text-ink hover:bg-white/5'
               }`}
             >
               <BarChart3 size={16} />
               Cellar Analytics
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
                   <div className="space-y-1.5">
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
                  <div className="px-4 space-y-3">
                    <p className="text-[8px] uppercase tracking-widest text-ink/20 font-bold mb-2">Grape Varieties</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(new Set(bottles.flatMap(b => b.grape || []))).sort().map(grape => (
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
                              ? 'bg-gold/20 border-gold/40 text-gold'
                              : 'bg-white/5 border-white/10 text-ink/40 hover:border-gold/20'
                          }`}
                        >
                          {grape}
                        </button>
                      ))}
                    </div>
                    {selectedGrapes.length > 0 && (
                      <button 
                        onClick={() => setSelectedGrapes([])}
                        className="text-[7px] uppercase tracking-widest text-gold hover:text-gold/80 transition-colors underline"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>

                  {/* Reset All Filters */}
                  <div className="px-4 pt-4 border-t border-white/5">
                    <button 
                      onClick={() => {
                        setActiveFilter('All');
                        setPriceRange({ min: 0, max: 100000 });
                        setDateRange({ start: '', end: '' });
                        setSelectedGrapes([]);
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
              <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-sm">
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

          <div className="glass-panel p-6 rounded-sm border-gold/10 relative overflow-hidden">
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
      <main className="flex-1 md:ml-80 p-8 md:p-16 relative">
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
                  Access your tasting notes, ratings, and cellar analytics from your Android, iOS, or Desktop.
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
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#141212] lg:block hidden"></div>
                          <div className="absolute inset-0 bg-gradient-to-t from-[#141212] to-transparent lg:hidden block"></div>
                        </div>
                      )}
                      
                      <div className={`p-10 flex flex-col justify-center ${wineOfTheDay.imageUrl ? 'lg:w-1/2' : 'w-full'}`}>
                        <div className="flex items-center justify-between mb-8">
                           <span className={`text-[10px] uppercase tracking-[0.2em] font-bold px-4 py-1.5 rounded-full border ${WINE_TYPE_CONFIG[wineOfTheDay.type]?.text} ${WINE_TYPE_CONFIG[wineOfTheDay.type]?.bg} ${WINE_TYPE_CONFIG[wineOfTheDay.type]?.border}`}>
                            {wineOfTheDay.type}
                          </span>
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                size={12} 
                                className={i < wineOfTheDay.rating ? "text-gold fill-current" : "text-white/10"} 
                              />
                            ))}
                          </div>
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

                        <div className="space-y-3">
                          <p className="text-[9px] uppercase tracking-widest text-gold font-bold flex items-center gap-2">
                             <Sparkles size={12} />
                             Sommelier's Flashback
                          </p>
                          <p className="text-sm italic text-ink/60 leading-relaxed font-serif">
                            "{wineOfTheDay.tastingNotes || "A vintage waiting to be rediscovered..."}"
                          </p>
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
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1 max-w-3xl">
                  <div className="relative group flex-1">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-ink/20 group-focus-within:text-gold transition-colors" size={20} />
                    <input
                      type="text"
                      placeholder="Search varieties..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 px-16 py-5 text-lg font-serif font-light outline-none focus:bg-white/10 focus:border-gold/30 transition-all rounded-sm tracking-wide text-ink"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setEditingGrape(undefined);
                      setIsGrapeFormOpen(true);
                    }}
                    className="bg-gold text-wine-bg px-10 py-5 font-bold tracking-[0.4em] uppercase text-[10px] hover:bg-gold/90 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 whitespace-nowrap"
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
                      className="w-full bg-white/5 border border-white/5 px-16 py-5 text-lg font-serif font-light outline-none focus:bg-white/10 focus:border-gold/30 transition-all rounded-sm tracking-wide text-ink"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setEditingBottle(undefined);
                      setIsFormOpen(true);
                    }}
                    className="bg-gold text-wine-bg px-10 py-5 font-bold tracking-[0.4em] uppercase text-[10px] hover:bg-gold/90 transition-all shadow-[0_15px_40px_rgba(212,175,55,0.15)] active:scale-95 flex items-center justify-center gap-3 whitespace-nowrap"
                  >
                    <Plus size={18} />
                    Add to Reserve
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
            </motion.div>
          ) : view === 'recommendations' ? (
            <motion.div
              key="recommendations"
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -20 }}
              transition={{ duration: 0.5, ease: "anticipate" }}
              className="space-y-12"
            >
              <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.5em] text-gold font-bold flex items-center gap-2">
                    <span className="w-8 h-px bg-gold/30"></span>
                    AI Sommelier Guide
                  </p>
                  <h2 className="text-5xl font-serif font-light text-ink leading-tight">Handpicked for your <br />unique palate.</h2>
                  <p className="text-ink/40 max-w-xl font-light leading-relaxed">
                    Our AI Sommelier analyzes your ratings, tasting history, and preferences 
                    to suggest bottles that align with your evolution as a collector.
                  </p>
                </div>
                
                <button
                  onClick={fetchRecommendations}
                  disabled={isRecLoading || bottles.length === 0}
                  className={`flex items-center gap-3 px-8 py-4 border border-gold/30 text-gold rounded-sm text-[10px] uppercase tracking-[0.3em] font-bold transition-all hover:bg-gold/10 ${isRecLoading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {isRecLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Refresh Suggestions
                </button>
              </div>

              {bottles.length === 0 ? (
                <div className="py-32 bg-white/5 border border-dashed border-white/10 rounded-sm flex flex-col items-center justify-center text-center p-12">
                  <Wine size={48} className="text-ink/10 mb-6" />
                  <h3 className="font-serif text-2xl text-ink/40 mb-2 italic">Your Cellar is Empty</h3>
                  <p className="text-[10px] uppercase tracking-widest text-ink/20 mb-8 max-w-md">
                    We need to know your tastes before we can make personalized recommendations. Log a few bottles to start.
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
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                  {isRecLoading ? (
                    [1, 2, 3].map(i => (
                      <div key={i} className="glass-panel p-6 h-[400px] animate-pulse bg-white/5 border-white/5 flex flex-col justify-between">
                        <div className="space-y-4 shadow-xl">
                          <div className="h-4 bg-white/5 rounded w-1/3"></div>
                          <div className="h-8 bg-white/5 rounded w-3/4"></div>
                          <div className="h-4 bg-white/5 rounded w-1/2"></div>
                        </div>
                        <div className="h-20 bg-white/5 rounded"></div>
                      </div>
                    ))
                  ) : (
                    recommendations.map((rec, i) => (
                      <RecommendationCard key={i} recommendation={rec} />
                    ))
                  )}
                </motion.div>
              )}
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
                    className={`px-6 py-2 text-[10px] uppercase tracking-[0.2em] transition-all rounded-sm ${statsSubTab === 'bottles' ? 'bg-gold text-wine-bg font-bold shadow-lg' : 'text-ink/40 hover:text-ink/60'}`}
                  >
                    Cellar
                  </button>
                  <button
                    onClick={() => setStatsSubTab('grapes')}
                    className={`px-6 py-2 text-[10px] uppercase tracking-[0.2em] transition-all rounded-sm ${statsSubTab === 'grapes' ? 'bg-gold text-wine-bg font-bold shadow-lg' : 'text-ink/40 hover:text-ink/60'}`}
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
                          <h3 className="text-lg font-serif text-ink mb-1">Most Favorite Varieties</h3>
                          <p className="text-[10px] uppercase tracking-widest text-ink/30">Based on your tasting ratings</p>
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
                              <div className="text-right">
                                <p className="text-lg font-serif text-gold">{v.avgRating}</p>
                                <div className="flex space-x-0.5 justify-end">
                                  {[...Array(5)].map((_, starI) => (
                                    <Star key={starI} size={6} className={starI < Math.round(v.avgRating) ? 'fill-gold text-gold' : 'text-white/10'} />
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="glass-panel p-8 space-y-8 bg-white/5 border-white/10 lg:col-span-2 shadow-2xl">
                        <div>
                          <h3 className="text-lg font-serif text-ink mb-1">Palate Evolution</h3>
                          <p className="text-[10px] uppercase tracking-widest text-ink/30">Average bottle rating over time</p>
                        </div>
                        <div className="h-[350px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={ratingTimeData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
                                domain={[0, 5]}
                                dx={-10}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Line 
                                type="monotone" 
                                dataKey="rating" 
                                name="Average Rating"
                                stroke="#D4AF37" 
                                strokeWidth={3} 
                                dot={{ r: 4, fill: '#D4AF37', strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: '#D4AF37', strokeWidth: 2, stroke: '#1a1414' }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                      <div className="glass-panel p-8 space-y-8 bg-white/5 border-white/10">
                        <div>
                          <h3 className="text-lg font-serif text-ink mb-1">Price vs Rating</h3>
                          <p className="text-[10px] uppercase tracking-widest text-ink/30">Correlation between value and enjoyment</p>
                        </div>
                        <div className="h-[350px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis 
                                type="number" 
                                dataKey="price" 
                                name="Price" 
                                unit="฿" 
                                stroke="#f8f4ed" 
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis 
                                type="number" 
                                dataKey="rating" 
                                name="Rating" 
                                domain={[0, 5]} 
                                stroke="#f8f4ed" 
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                              />
                              <ZAxis type="number" range={[60, 400]} />
                              <Tooltip content={<CustomTooltip />} />
                              <Scatter 
                                name="Wines" 
                                data={priceRatingData} 
                                fill="#D4AF37"
                                fillOpacity={0.6}
                              >
                                {priceRatingData.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={WINE_TYPE_CONFIG[entry.type]?.hex || '#D4AF37'} 
                                  />
                                ))}
                              </Scatter>
                            </ScatterChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="glass-panel p-8 space-y-8 bg-white/5 border-white/10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h3 className="text-lg font-serif text-ink mb-1">Grape Geography</h3>
                      <p className="text-[10px] uppercase tracking-widest text-ink/30">Encyclopedia diversity by country</p>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scroll-hide">
                      {grapeGeographyData.map(country => (
                        <button
                          key={country.name}
                          onClick={() => setSelectedAnalysisCountry(selectedAnalysisCountry === country.name ? null : country.name)}
                          className={`px-4 py-2 text-[9px] uppercase tracking-widest border transition-all whitespace-nowrap rounded-sm ${selectedAnalysisCountry === country.name ? 'bg-gold text-wine-bg border-gold' : 'border-white/10 text-ink/40 hover:border-gold/30 hover:text-ink'}`}
                        >
                          {country.name} ({country.total})
                        </button>
                      ))}
                      {grapeGeographyData.length === 0 && (
                        <p className="text-[9px] uppercase tracking-widest text-ink/20">Add grapes to see geography insights</p>
                      )}
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
                            {grapeGeographyData.find(c => c.name === selectedAnalysisCountry)?.regions.map(region => (
                              <span key={region} className="px-3 py-1 bg-white/5 border border-white/5 text-[11px] text-ink/60 rounded-sm">
                                {region}
                              </span>
                            )) || <p className="text-xs text-ink/30 italic">No regions specified</p>}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold">Varieties from {selectedAnalysisCountry}</p>
                          <div className="flex flex-wrap gap-2">
                            {grapeGeographyData.find(c => c.name === selectedAnalysisCountry)?.grapes.map(grape => (
                              <span key={grape} className="px-3 py-1 border border-gold/10 text-gold/80 text-[11px] font-serif italic rounded-sm">
                                {grape}
                              </span>
                            )) || <p className="text-xs text-ink/30 italic">No varieties specified</p>}
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="py-12 text-center border-t border-white/5">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-ink/20">Select a country above to see regional & variety insights</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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
            Bottle Diary Archive • Version 2.0.0
          </p>
        </div>
      </footer>
    </div>
  );
}
