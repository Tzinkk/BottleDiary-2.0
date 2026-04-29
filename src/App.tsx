import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, Filter, Wine, Trash2, Edit2, Star, X, Info, Globe, Banknote, ChevronDown, Upload, Camera, Loader2, Sparkles, Sparkle, BarChart3, LogIn, LogOut, User as UserIcon } from 'lucide-react';
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
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle, logout, handleFirestoreError, OperationType } from './firebase';
import { WineBottle, WineType, SortOption } from './types';
import { getWineRecommendations, Recommendation, analyzeWineLabel } from './services/aiService';

// --- Configuration ---

const WINE_TYPE_CONFIG: Record<string, { text: string, bg: string, border: string, accent: string, hex: string }> = {
  'Red': { text: 'text-red-400', bg: 'bg-red-950/40', border: 'border-red-900/50', accent: 'bg-red-500', hex: '#f87171' },
  'White': { text: 'text-yellow-100', bg: 'bg-yellow-950/30', border: 'border-yellow-800/30', accent: 'bg-yellow-200', hex: '#fef3c7' },
  'Rosé': { text: 'text-rose-300', bg: 'bg-rose-950/30', border: 'border-rose-800/30', accent: 'bg-rose-400', hex: '#fb7185' },
  'Sparkling': { text: 'text-emerald-300', bg: 'bg-emerald-950/30', border: 'border-emerald-800/30', accent: 'bg-emerald-400', hex: '#34d399' },
  'Natural Red': { text: 'text-red-500', bg: 'bg-red-950/50', border: 'border-red-800/60', accent: 'bg-red-600', hex: '#ef4444' },
  'Natural White': { text: 'text-yellow-400', bg: 'bg-yellow-950/40', border: 'border-yellow-800/40', accent: 'bg-yellow-500', hex: '#fbbf24' },
  'Pet Nat': { text: 'text-purple-400', bg: 'bg-purple-950/30', border: 'border-purple-800/30', accent: 'bg-purple-500', hex: '#a855f7' },
  'Orange': { text: 'text-orange-400', bg: 'bg-orange-950/40', border: 'border-orange-800/50', accent: 'bg-orange-500', hex: '#f97316' },
  'Sato': { text: 'text-blue-300', bg: 'bg-blue-950/30', border: 'border-blue-800/30', accent: 'bg-blue-400', hex: '#60a5fa' },
  'Sake': { text: 'text-cyan-200', bg: 'bg-cyan-950/20', border: 'border-cyan-800/20', accent: 'bg-cyan-300', hex: '#a5f3fc' },
};

// --- Components ---

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
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 30 }}
      transition={{ 
        type: "spring",
        stiffness: 260,
        damping: 25,
        opacity: { duration: 0.4 }
      }}
      whileHover={{ y: -4 }}
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
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
  onSave: (bottle: Omit<WineBottle, 'id' | 'dateAdded'>) => void;
  onClose: () => void;
}

const WineForm = ({ bottle, onSave, onClose }: WineFormProps) => {
  const [formData, setFormData] = useState({
    name: bottle?.name || '',
    producer: bottle?.producer || '',
    year: bottle?.year || new Date().getFullYear().toString(),
    type: bottle?.type || 'Red' as WineType,
    region: bottle?.region || '',
    country: bottle?.country || '',
    grape: bottle?.grape || [] as string[],
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
    onSave({ ...formData, grape: grapeInput.trim() ? [...currentGrapes, grapeInput.trim()] : currentGrapes });
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
                value={formData.producer}
                onChange={e => setFormData({ ...formData, producer: e.target.value })}
                className="w-full bg-transparent border-b border-white/10 focus:border-gold outline-none py-2 transition-all text-ink font-light"
                placeholder="Estate Name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Vintage (NV or Year)</label>
              <input
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
      return;
    }

    const q = query(
      collection(db, 'bottles'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as WineBottle[];
      setBottles(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bottles');
    });

    return () => unsubscribe();
  }, [user]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBottle, setEditingBottle] = useState<WineBottle | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<WineType | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 100000 });
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedGrapes, setSelectedGrapes] = useState<string[]>([]);
  const [view, setView] = useState<'cellar' | 'recommendations' | 'stats'>('cellar');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isRecLoading, setIsRecLoading] = useState(false);

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

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'bottles', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bottles/${id}`);
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
                    
                    {wineTypes.map(type => {
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
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-gold text-wine-bg text-[10px] uppercase font-bold tracking-[0.3em] hover:bg-gold/90 transition-all rounded-sm shadow-xl active:scale-95"
            >
              <LogIn size={18} />
              Connect Devices
            </button>
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

              <button
                onClick={signInWithGoogle}
                className="bg-gold text-wine-bg px-12 py-5 font-bold tracking-[0.4em] uppercase text-xs hover:bg-gold/90 transition-all shadow-2xl active:scale-95 flex items-center gap-4"
              >
                <LogIn size={20} />
                Sign in with Google
              </button>
              
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

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                <AnimatePresence mode="popLayout">
                  {filteredBottles.map(bottle => (
                    <WineCard
                      key={bottle.id}
                      bottle={bottle}
                      onEdit={(b) => {
                        setEditingBottle(b);
                        setIsFormOpen(true);
                      }}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
                
                {filteredBottles.length === 0 && (
                  <div className="col-span-full py-32 flex flex-col items-center text-center space-y-6">
                    <div className="w-24 h-24 border border-white/5 rounded-full flex items-center justify-center text-ink/10">
                      <Search size={48} strokeWidth={1} />
                    </div>
                    <div className="space-y-2">
                      <p className="font-serif text-2xl text-ink/40 font-light italic">No bottles match your current filters</p>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-ink/20">Try adjusting your search criteria</p>
                    </div>
                  </div>
                )}
              </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                </div>
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
              <header className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.5em] text-gold font-bold flex items-center gap-2">
                  <span className="w-8 h-px bg-gold/30"></span>
                  Cellar Analytics
                </p>
                <h2 className="text-5xl font-serif font-light text-ink leading-tight">Insights into your <br />private collection.</h2>
              </header>

              {bottles.length === 0 ? (
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

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="glass-panel p-8 space-y-8 bg-white/5 border-white/10">
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
              onClose={() => setIsFormOpen(false)}
              onSave={handleCreateOrUpdate}
            />
          </>
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
