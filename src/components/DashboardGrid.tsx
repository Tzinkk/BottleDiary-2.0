import React from 'react';
import { Wine, Globe, FlaskConical, Star } from 'lucide-react';

interface DashboardGridProps {
  bottleCount: number;
  regionCount: number;
  grapeCount: number;
  favoriteCount: number;
  onSelectCategory: (category: 'cellar' | 'regions' | 'grapes' | 'favorites') => void;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  bottleCount,
  regionCount,
  grapeCount,
  favoriteCount,
  onSelectCategory
}) => {
  const cards = [
    {
      id: 'cellar' as const,
      label: 'My Wines',
      count: bottleCount,
      subtext: 'In Cellar',
      icon: Wine,
      iconBg: 'bg-[#FDF2F4]',
      iconBorder: 'border-[#F5C2CB]',
      iconColor: 'text-[#722F37]',
      cardBorder: 'hover:border-[#722F37]/30'
    },
    {
      id: 'regions' as const,
      label: 'By Region',
      count: regionCount,
      subtext: 'Appellations',
      icon: Globe,
      iconBg: 'bg-[#FEFCE8]',
      iconBorder: 'border-[#FEF08A]',
      iconColor: 'text-[#CA8A04]',
      cardBorder: 'hover:border-[#CA8A04]/30'
    },
    {
      id: 'grapes' as const,
      label: 'By Grape',
      count: grapeCount,
      subtext: 'Varieties',
      icon: FlaskConical,
      iconBg: 'bg-[#F0FDF4]',
      iconBorder: 'border-[#BBF7D0]',
      iconColor: 'text-[#16A34A]',
      cardBorder: 'hover:border-[#16A34A]/30'
    },
    {
      id: 'favorites' as const,
      label: 'Favorites',
      count: favoriteCount,
      subtext: 'Top Reserve',
      icon: Star,
      iconBg: 'bg-[#FFF7ED]',
      iconBorder: 'border-[#FED7AA]',
      iconColor: 'text-[#C2410C]',
      cardBorder: 'hover:border-[#C2410C]/30'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-5">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <button
            key={card.id}
            onClick={() => onSelectCategory(card.id)}
            className={`bg-white border border-[#EBE7DF] ${card.cardBorder} p-4 md:p-5 rounded-2xl shadow-[0_2px_10px_rgba(28,25,23,0.03)] hover:shadow-[0_6px_20px_rgba(28,25,23,0.07)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 text-left flex flex-col justify-between cursor-pointer group`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} border ${card.iconBorder} flex items-center justify-center ${card.iconColor} shadow-inner group-hover:scale-105 transition-transform`}>
                <IconComponent size={20} strokeWidth={2} />
              </div>
              <span className="text-[10px] uppercase font-semibold text-stone-400 font-sans tracking-wider">
                {card.subtext}
              </span>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-serif font-bold text-stone-900 leading-none">
                {card.count}
              </p>
              <p className="text-xs font-semibold text-stone-600 mt-1 font-sans">
                {card.label}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
