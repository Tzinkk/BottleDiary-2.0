import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WineBottle, WINE_TYPE_CONFIG } from '../types';
import { X, Edit2, Trash2, Wine, Sparkles, Droplets, Utensils, ZoomIn } from 'lucide-react';

interface WineDetailModalProps {
  bottle: WineBottle | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (bottle: WineBottle) => void;
  onDelete: (id: string) => void;
}

export const WineDetailModal: React.FC<WineDetailModalProps> = ({
  bottle,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  if (!isOpen || !bottle) return null;

  const typeConfig = WINE_TYPE_CONFIG[bottle.type] || {
    text: 'text-[#800020]',
    bg: 'bg-[#FDF2F4]',
    border: 'border-[#F5C2CB]',
    hex: '#800020'
  };

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
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative bg-white border border-[#E6DFD5] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-[70] p-6 sm:p-8 space-y-6 text-stone-900 pointer-events-auto my-auto"
        >
          {/* Header Bar */}
          <div className="flex items-start justify-between gap-4 border-b border-[#E6DFD5] pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[9px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border ${typeConfig.border} ${typeConfig.bg} ${typeConfig.text}`}
                >
                  {bottle.type}
                </span>
                {bottle.price && (
                  <span className="font-mono text-xs font-bold bg-[#FAF8F5] text-stone-900 border border-[#E6DFD5] px-2.5 py-0.5 rounded-full">
                    ฿{bottle.price.toLocaleString()}
                  </span>
                )}
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#5A1E24] leading-tight">
                {bottle.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-stone-600 font-medium">
                <span className="font-mono font-bold text-[#800020]">{bottle.year || 'NV'}</span>
                <span>•</span>
                <span>{bottle.producer || 'Reserve Producer'}</span>
                {(bottle.region || bottle.country) && (
                  <>
                    <span>•</span>
                    <span className="text-stone-500 italic">
                      {bottle.region ? `${bottle.region}, ` : ''}{bottle.country || ''}
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F2EFE9] text-stone-600 hover:text-stone-900 border border-[#E6DFD5] transition-colors cursor-pointer shrink-0 shadow-xs"
              aria-label="Close details"
            >
              <X size={18} />
            </button>
          </div>

          {/* Bottle Image & Highlights */}
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start bg-[#FAF8F5] border border-[#E6DFD5] rounded-2xl p-4 sm:p-5">
            <div
              onClick={() => bottle.imageUrl && setIsImageZoomed(true)}
              className={`w-32 h-44 rounded-xl border border-[#E6DFD5] bg-white flex items-center justify-center p-2 overflow-hidden shrink-0 shadow-xs ${
                bottle.imageUrl ? 'cursor-zoom-in group' : ''
              }`}
              title={bottle.imageUrl ? 'Click to enlarge' : undefined}
            >
              {bottle.imageUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={bottle.imageUrl}
                    alt={bottle.name}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-1 right-1 bg-white/80 p-1 rounded-md text-stone-600 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn size={12} />
                  </div>
                </div>
              ) : (
                <Wine size={48} className="text-stone-300" strokeWidth={1.2} />
              )}
            </div>

            <div className="space-y-2.5 flex-1 min-w-0 w-full text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Grape Varietal</span>
                <p className="font-semibold text-[#1E1E1E] mt-0.5">
                  {Array.isArray(bottle.grape) && bottle.grape.length > 0
                    ? bottle.grape.join(' • ')
                    : bottle.grape || 'Classified Assemblage'}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Terroir & Origin</span>
                <p className="font-semibold text-[#1E1E1E] mt-0.5">
                  {bottle.region || 'Appellation not logged'}
                  {bottle.country ? `, ${bottle.country}` : ''}
                </p>
              </div>

              {bottle.locationPurchased && (
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Acquisition Location</span>
                  <p className="font-medium text-stone-700 mt-0.5">{bottle.locationPurchased}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tasting Diary */}
          {bottle.tastingNotes && (
            <div className="p-4 sm:p-5 bg-[#FDF2F4] border border-[#F5C2CB] rounded-2xl space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#800020]" />
                <span className="text-xs uppercase tracking-wider text-[#800020] font-bold">
                  Tasting Diary
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#1E1E1E] leading-relaxed italic">
                "{bottle.tastingNotes}"
              </p>
            </div>
          )}

          {/* Sensory Profile breakdown */}
          {hasSensoryDetails && (
            <div className="space-y-4 pt-1">
              <h4 className="text-xs uppercase tracking-wider text-[#5A1E24] font-bold">
                Sensory & Physical Dimensions
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {bottle.appearance && (
                  <div className="p-3.5 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#800020] font-bold flex items-center gap-1.5">
                      <Droplets size={13} /> Appearance & Robe
                    </span>
                    <p className="text-xs text-[#1E1E1E] leading-relaxed">{bottle.appearance}</p>
                  </div>
                )}

                {bottle.nose && (
                  <div className="p-3.5 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#6D28D9] font-bold">
                      Nose & Aromatics
                    </span>
                    <p className="text-xs text-[#1E1E1E] leading-relaxed italic">{bottle.nose}</p>
                  </div>
                )}

                {bottle.palate && (
                  <div className="p-3.5 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#CA8A04] font-bold">
                      Palate & Mouthfeel
                    </span>
                    <p className="text-xs text-[#1E1E1E] leading-relaxed italic">{bottle.palate}</p>
                  </div>
                )}

                {bottle.finish && (
                  <div className="p-3.5 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#800020] font-bold">
                      Finish & Persistence
                    </span>
                    <p className="text-xs text-[#1E1E1E] leading-relaxed italic">{bottle.finish}</p>
                  </div>
                )}
              </div>

              {/* Food Pairings */}
              {Array.isArray(bottle.foodPairing) && bottle.foodPairing.length > 0 && (
                <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-[#15803D] font-bold flex items-center gap-1.5">
                    <Utensils size={13} /> Recommended Pairings
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {bottle.foodPairing.map((food, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-lg border border-[#BBF7D0] bg-white text-[#15803D] text-xs font-medium"
                      >
                        {food}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Terroir & Winemaking */}
              {(bottle.viticulture || bottle.winemakingPhilosophy) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {bottle.viticulture && (
                    <div className="p-3.5 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#0E7490] font-bold">
                        Viticulture
                      </span>
                      <p className="text-xs text-[#1E1E1E]">{bottle.viticulture}</p>
                    </div>
                  )}
                  {bottle.winemakingPhilosophy && (
                    <div className="p-3.5 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#7C3AED] font-bold">
                        Winemaking Philosophy
                      </span>
                      <p className="text-xs text-[#1E1E1E]">{bottle.winemakingPhilosophy}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Collector's Notes */}
              {bottle.additionalNote && (
                <div className="p-3.5 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">
                    Collector's Private Ledger
                  </span>
                  <p className="text-xs text-[#1E1E1E]">{bottle.additionalNote}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#E6DFD5] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(bottle.id);
              }}
              className="flex items-center gap-1.5 px-4 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold tracking-wider transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Delete Bottle</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(bottle);
                }}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#722F37] hover:bg-[#5c242c] text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer font-bold"
              >
                <Edit2 size={14} />
                <span>Edit Entry</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Optional Zoomed Image Lightbox */}
        <AnimatePresence>
          {isImageZoomed && bottle.imageUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImageZoomed(false)}
              className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
            >
              <div
                className="relative max-w-md w-full aspect-[2/3] bg-white rounded-2xl p-4 border border-[#E6DFD5] shadow-2xl flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setIsImageZoomed(false)}
                  className="absolute top-3 right-3 p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-full shadow-sm cursor-pointer"
                  aria-label="Close zoom"
                >
                  <X size={16} />
                </button>
                <img
                  src={bottle.imageUrl}
                  alt={bottle.name}
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
};
