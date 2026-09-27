import React from 'react';
import { WineBottle, WINE_TYPE_CONFIG } from '../types';
import { Wine, Edit2, Sparkles, ChevronRight } from 'lucide-react';

interface WineGridCardProps {
  bottle: WineBottle;
  onSelect: (bottle: WineBottle) => void;
  onEdit: (bottle: WineBottle) => void;
  onDelete?: (id: string) => void;
}

export const WineGridCard: React.FC<WineGridCardProps> = ({
  bottle,
  onSelect,
  onEdit
}) => {
  const typeConfig = WINE_TYPE_CONFIG[bottle.type] || {
    text: 'text-[#800020]',
    bg: 'bg-[#FDF2F4]',
    border: 'border-[#F5C2CB]',
    hex: '#800020'
  };

  return (
    <div
      onClick={() => onSelect(bottle)}
      className="bg-white border border-[#E6DFD5] hover:border-[#722F37]/50 rounded-2xl p-3 sm:p-3.5 shadow-[0_2px_10px_rgba(28,25,23,0.03)] hover:shadow-[0_8px_24px_rgba(28,25,23,0.08)] hover:-translate-y-1 active:translate-y-0 transition-all duration-200 cursor-pointer flex flex-col justify-between group overflow-hidden"
    >
      {/* Top: Rounded container holding the wine bottle image (aspect-[3/4], soft background #F9F8F6) */}
      <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-[#F9F8F6] border border-[#E6DFD5] mb-3 flex items-center justify-center p-2.5">
        {bottle.imageUrl ? (
          <img
            src={bottle.imageUrl}
            alt={bottle.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
        ) : (
          <Wine
            size={48}
            className="text-stone-300 group-hover:text-[#722F37]/60 transition-colors"
            strokeWidth={1.2}
          />
        )}

        {/* Floating badge on the image: Classification / Tag */}
        <span
          className={`absolute top-2 left-2 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border shadow-xs backdrop-blur-xs ${typeConfig.border} ${typeConfig.bg} ${typeConfig.text}`}
        >
          {bottle.type}
        </span>

        {/* Quick Edit shortcut icon on image hover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(bottle);
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-stone-600 hover:text-[#722F37] border border-[#E6DFD5] shadow-xs flex items-center justify-center transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-105"
          title="Edit Wine"
          aria-label="Edit Wine"
        >
          <Edit2 size={12} />
        </button>

        {/* Subtle Tasting Notes indicator */}
        {bottle.tastingNotes && (
          <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-white/90 border border-[#E6DFD5] text-[#722F37] flex items-center justify-center shadow-xs">
            <Sparkles size={11} />
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="space-y-1.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Bottle/Estate Name (elegant serif, bold, max 2 lines truncated) */}
          <h3
            className="font-serif font-bold text-sm sm:text-base text-[#5A1E24] leading-snug line-clamp-2 group-hover:text-[#722F37] transition-colors"
            title={bottle.name}
          >
            {bottle.name}
          </h3>

          {/* Vintage & Producer (muted subtle text) */}
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium truncate mt-1">
            <span className="font-mono font-bold text-[#800020] shrink-0">
              {bottle.year || 'NV'}
            </span>
            <span className="text-stone-300">•</span>
            <span className="truncate" title={bottle.producer || 'Reserve Producer'}>
              {bottle.producer || 'Reserve Producer'}
            </span>
          </div>

          {/* Appellation & Origin */}
          {(bottle.region || bottle.country) && (
            <p className="text-[10px] text-stone-400 italic truncate mt-0.5">
              {bottle.region ? `${bottle.region}, ` : ''}{bottle.country || ''}
            </p>
          )}
        </div>

        {/* Price tag & Details prompt */}
        <div className="mt-2.5 pt-2 border-t border-[#F2EFE9] flex items-center justify-between">
          {bottle.price ? (
            <span className="font-mono text-xs font-bold text-stone-900 bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E6DFD5]">
              ฿{bottle.price.toLocaleString()}
            </span>
          ) : (
            <span className="text-[10px] text-stone-400 italic font-sans">Reserve</span>
          )}

          <span className="text-[10px] font-semibold text-[#722F37] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
            Details <ChevronRight size={11} />
          </span>
        </div>
      </div>
    </div>
  );
};
