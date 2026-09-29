import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit2, MapPin, Sparkles, Utensils, BookOpen, Compass, ShieldCheck } from 'lucide-react';
import { GrapeVariety } from '../types';

interface GrapeDetailModalProps {
  grape: GrapeVariety | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (grape: GrapeVariety) => void;
}

export const GrapeDetailModal: React.FC<GrapeDetailModalProps> = ({
  grape,
  isOpen,
  onClose,
  onEdit
}) => {
  if (!isOpen || !grape) return null;

  const isRed = grape.type === 'Red';

  return (
    <AnimatePresence>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-xl bg-[#FBF9F5] border border-[#EBE7DF] rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-stone-900"
        >
          {/* Header */}
          <div className="p-5 md:p-6 bg-white border-b border-[#EBE7DF] flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] uppercase tracking-wider font-bold px-3 py-0.5 rounded-full border ${
                  isRed 
                    ? 'bg-[#FDF2F4] text-[#800020] border-[#F5C2CB]' 
                    : 'bg-[#FEFCE8] text-[#854D0E] border-[#FEF08A]'
                }`}>
                  {isRed ? '🍷 RED GRAPE VARIETY' : '🥂 WHITE GRAPE VARIETY'}
                </span>
                <span className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">
                  Ampelography Dossier
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5A1E24] tracking-tight">
                {grape.name}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(grape);
                }}
                className="p-2 rounded-xl border border-[#E5E0D8] bg-[#F7F5F0] hover:bg-[#EBE7DF] text-stone-700 hover:text-stone-900 transition-all cursor-pointer shadow-xs flex items-center gap-1.5 text-xs font-semibold"
                title="Edit Variety"
              >
                <Edit2 size={13} />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-[#F7F5F0] hover:bg-[#EBE7DF] rounded-xl border border-[#E5E0D8] text-stone-600 hover:text-stone-900 transition-all cursor-pointer shadow-xs"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-5 md:p-6 overflow-y-auto space-y-5 custom-scrollbar">
            {/* Structural Key Traits Metric Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 p-3.5 bg-white border border-[#EBE7DF] rounded-2xl shadow-xs text-center">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">Skin</span>
                <p className="text-xs font-bold text-stone-800 truncate">{grape.skin || '—'}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">Body</span>
                <p className="text-xs font-bold text-stone-800 truncate">{grape.body || '—'}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">Acidity</span>
                <p className="text-xs font-bold text-stone-800 truncate">{grape.acidity || '—'}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">Tannin</span>
                <p className="text-xs font-bold text-stone-800 truncate">{grape.tannin || (isRed ? 'Medium' : 'None')}</p>
              </div>
              <div className="space-y-0.5 col-span-2 sm:col-span-1">
                <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">Sweetness</span>
                <p className="text-xs font-bold text-stone-800 truncate">{grape.sweetness || 'Dry'}</p>
              </div>
            </div>

            {/* Geographical Origins */}
            {Array.isArray(grape.locations) && grape.locations.length > 0 && (
              <div className="p-4 bg-white border border-[#EBE7DF] rounded-2xl space-y-2 shadow-xs">
                <h4 className="text-xs uppercase font-bold text-[#722F37] tracking-wider flex items-center gap-1.5">
                  <MapPin size={13} /> Major Terroirs & Geographical Regions
                </h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  {grape.locations.map((loc, i) => (
                    <span 
                      key={i} 
                      className="px-3 py-1 bg-[#FAF8F5] border border-[#E6DFD5] text-stone-800 text-xs font-semibold rounded-xl"
                    >
                      {loc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Aroma & Flavor Profile */}
            {grape.aromaFlavor && (
              <div className="p-4 bg-white border border-[#EBE7DF] rounded-2xl space-y-1.5 shadow-xs">
                <h4 className="text-xs uppercase font-bold text-[#CA8A04] tracking-wider flex items-center gap-1.5">
                  <Sparkles size={13} /> Sensory Profile & Aromatics
                </h4>
                <p className="text-xs text-stone-800 font-medium leading-relaxed italic">
                  "{grape.aromaFlavor}"
                </p>
              </div>
            )}

            {/* Viticultural & Terroir Characteristics */}
            {grape.otherNotes && (
              <div className="p-4 bg-white border border-[#EBE7DF] rounded-2xl space-y-1.5 shadow-xs">
                <h4 className="text-xs uppercase font-bold text-stone-700 tracking-wider flex items-center gap-1.5">
                  <BookOpen size={13} /> Viticultural Characteristics & Aging Potential
                </h4>
                <p className="text-xs text-stone-700 leading-relaxed">
                  {grape.otherNotes}
                </p>
              </div>
            )}

            {/* Additional Ampelography Notes */}
            {grape.additionalNotes && (
              <div className="p-4 bg-[#FAF8F5] border border-[#E6DFD5] rounded-2xl space-y-1.5 shadow-xs">
                <h4 className="text-xs uppercase font-bold text-stone-600 tracking-wider flex items-center gap-1.5">
                  <Compass size={13} /> Historical Origin & Ampelography Trivia
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {grape.additionalNotes}
                </p>
              </div>
            )}

            {/* Food Pairings */}
            {Array.isArray(grape.foodPairing) && grape.foodPairing.length > 0 && (
              <div className="p-4 bg-[#FFFBEB] border border-amber-200 rounded-2xl space-y-2 shadow-xs">
                <h4 className="text-xs uppercase font-bold text-amber-900 tracking-wider flex items-center gap-1.5">
                  <Utensils size={13} className="text-amber-700" /> Sommelier Gastronomy Pairings
                </h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  {grape.foodPairing.map((pairing, i) => (
                    <span 
                      key={i} 
                      className="px-3 py-1 bg-white border border-amber-300 text-amber-950 text-xs font-semibold rounded-xl shadow-xs"
                    >
                      {pairing}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-[#FAF8F5] border-t border-[#EBE7DF] flex items-center justify-between">
            <span className="text-[11px] text-stone-400 font-medium">
              Registered Grape Variety
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-[#722F37] hover:bg-[#5C242C] text-white rounded-xl text-xs uppercase tracking-wider font-semibold shadow-xs transition-all cursor-pointer"
            >
              Close Dossier
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
