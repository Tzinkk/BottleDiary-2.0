import React from 'react';
import { WineBottle, WINE_TYPE_CONFIG } from '../types';
import { Wine, Sparkles, ChevronRight } from 'lucide-react';

interface RecentlyAddedCarouselProps {
  bottles: WineBottle[];
  onSelectBottle: (bottle: WineBottle) => void;
  onViewAll: () => void;
  typeConfigMap?: Record<string, { text: string; bg: string; border: string }>;
  isLoading?: boolean;
}

export const RecentlyAddedCarousel: React.FC<RecentlyAddedCarouselProps> = ({
  bottles,
  onSelectBottle,
  onViewAll,
  typeConfigMap = WINE_TYPE_CONFIG,
  isLoading = false
}) => {
  const recentBottles = [...bottles]
    .sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0))
    .slice(0, 8);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-serif font-bold text-stone-900 tracking-tight">
            Recently Added
          </h3>
          <p className="text-xs text-stone-500 font-sans">
            Latest acquisitions in your sommelier reserve
          </p>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-[#722F37] hover:text-[#5C242C] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>View All</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth -mx-1 px-1 scrollbar-none touch-pan-x">
        {recentBottles.map((bottle) => {
          const typeStyle = typeConfigMap?.[bottle.type] || WINE_TYPE_CONFIG[bottle.type] || {
            text: 'text-[#800020]',
            bg: 'bg-[#FDF2F4]',
            border: 'border-[#F5C2CB]'
          };

          return (
            <div
              key={bottle.id}
              onClick={() => onSelectBottle(bottle)}
              className="w-[195px] min-w-[195px] max-w-[210px] bg-white border border-[#E6DFD5] hover:border-[#722F37]/50 rounded-2xl p-3.5 shadow-[0_2px_10px_rgba(28,25,23,0.03)] hover:shadow-[0_8px_24px_rgba(28,25,23,0.08)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between shrink-0 group"
            >
              {/* Bottle Image Thumbnail & Badge */}
              <div className="relative w-full h-44 rounded-xl overflow-hidden bg-[#FAF8F5] border border-[#E6DFD5] mb-3 flex items-center justify-center p-2.5">
                {bottle.imageUrl ? (
                  <img
                    src={bottle.imageUrl}
                    alt={bottle.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Wine size={38} className="text-stone-300 group-hover:text-[#722F37]/50 transition-colors" />
                )}
                <span
                  className={`absolute top-2 left-2 text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${typeStyle.border} ${typeStyle.bg} ${typeStyle.text} shadow-xs`}
                >
                  {bottle.type}
                </span>
              </div>

              {/* Title & Vintage */}
              <div className="space-y-1 flex-1">
                <div className="flex items-baseline justify-between gap-1">
                  <h4 className="font-serif font-bold text-stone-900 text-sm truncate flex-1" title={bottle.name}>
                    {bottle.name}
                  </h4>
                  <span className="font-mono text-xs font-semibold text-[#800020] shrink-0">
                    {bottle.year || 'NV'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 font-medium truncate">
                  {bottle.producer || 'Reserve Producer'}
                </p>
                <p className="text-[10px] text-stone-400 italic truncate">
                  {bottle.region ? `${bottle.region}, ` : ''}{bottle.country || 'Classic Origin'}
                </p>
              </div>

              {/* Bottom Price or Notes indicator */}
              <div className="mt-3 pt-2.5 border-t border-[#F2EFE9] flex items-center justify-between">
                {bottle.price ? (
                  <span className="font-mono text-xs font-bold text-stone-800">
                    ฿{bottle.price.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-[10px] text-stone-400 font-sans italic">Reserve Bottle</span>
                )}
                <span className="text-[10px] font-semibold text-[#722F37] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  View <ChevronRight size={11} />
                </span>
              </div>
            </div>
          );
        })}

        {isLoading && recentBottles.length === 0 ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`skeleton-${idx}`}
              className="w-[195px] min-w-[195px] max-w-[210px] bg-white border border-[#E6DFD5] rounded-2xl p-3.5 shadow-xs shrink-0 flex flex-col justify-between animate-pulse"
            >
              <div className="w-full h-44 rounded-xl bg-stone-100/90 mb-3 flex items-center justify-center">
                <Wine size={32} className="text-stone-200" />
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
          ))
        ) : recentBottles.length === 0 ? (
          <div className="w-full py-8 text-center text-stone-400 text-xs italic bg-white border border-dashed border-[#EBE7DF] rounded-2xl">
            No bottles in cellar yet. Tap '+' to register your first bottle.
          </div>
        ) : null}
      </div>
    </div>
  );
};
