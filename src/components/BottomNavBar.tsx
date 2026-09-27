import React from 'react';
import { Home as HomeIcon, Wine, Plus, Compass, User as UserIcon } from 'lucide-react';

export type MainNavTab = 'home' | 'cellar' | 'explore' | 'profile';

export interface BottomNavBarProps {
  currentTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  onAddNewWine?: () => void;
  onOpenAddModal?: () => void;
  wineCount?: number;
  totalBottles?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onSelectTab,
  onAddNewWine,
  onOpenAddModal,
  wineCount,
  totalBottles
}) => {
  const handleAdd = () => {
    if (onAddNewWine) {
      onAddNewWine();
    } else if (onOpenAddModal) {
      onOpenAddModal();
    }
  };

  const count = wineCount ?? totalBottles ?? 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EBE7DF] shadow-[0_-4px_20px_rgba(28,25,23,0.06)] px-4 py-2 pointer-events-auto">
      <div className="max-w-md mx-auto flex items-center justify-between relative">
        {/* 1: Home */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            currentTab === 'home'
              ? 'text-[#722F37] font-semibold scale-105'
              : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <HomeIcon size={20} strokeWidth={currentTab === 'home' ? 2.5 : 1.8} />
          <span className="text-[10px] mt-1 tracking-tight font-sans font-medium">Home</span>
        </button>

        {/* 2: My Wines */}
        <button
          type="button"
          onClick={() => onSelectTab('cellar')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all relative cursor-pointer ${
            currentTab === 'cellar'
              ? 'text-[#722F37] font-semibold scale-105'
              : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <div className="relative">
            <Wine size={20} strokeWidth={currentTab === 'cellar' ? 2.5 : 1.8} />
            {count > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-[#722F37] text-white text-[8px] font-bold rounded-full min-w-3.5 text-center leading-tight">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight font-sans font-medium">My Wines</span>
        </button>

        {/* 3: Center Floating '+' Add Button */}
        <div className="flex-1 flex justify-center -translate-y-5 relative z-50">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAdd();
            }}
            className="w-14 h-14 rounded-full bg-[#722F37] hover:bg-[#5C242C] text-white shadow-[0_6px_20px_rgba(114,47,55,0.4)] active:scale-95 flex items-center justify-center border-4 border-[#FBF9F5] transition-all cursor-pointer group pointer-events-auto"
            title="New Cellar Entry"
            aria-label="Add new wine bottle"
          >
            <Plus size={26} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>

        {/* 4: Explore */}
        <button
          type="button"
          onClick={() => onSelectTab('explore')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            currentTab === 'explore'
              ? 'text-[#722F37] font-semibold scale-105'
              : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <Compass size={20} strokeWidth={currentTab === 'explore' ? 2.5 : 1.8} />
          <span className="text-[10px] mt-1 tracking-tight font-sans font-medium">Explore</span>
        </button>

        {/* 5: Profile */}
        <button
          type="button"
          onClick={() => onSelectTab('profile')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            currentTab === 'profile'
              ? 'text-[#722F37] font-semibold scale-105'
              : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <UserIcon size={20} strokeWidth={currentTab === 'profile' ? 2.5 : 1.8} />
          <span className="text-[10px] mt-1 tracking-tight font-sans font-medium">Profile</span>
        </button>
      </div>
    </nav>
  );
};
