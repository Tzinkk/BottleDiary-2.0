import React from 'react';
import { Search, Filter, Menu, User as UserIcon, X } from 'lucide-react';
import { User } from 'firebase/auth';

interface TopHeaderProps {
  user: User | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isFilterExpanded: boolean;
  onToggleFilter: () => void;
  onOpenMenu: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  user,
  searchQuery,
  onSearchChange,
  isFilterExpanded,
  onToggleFilter,
  onOpenMenu
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.displayName ? user.displayName.split(' ')[0] : 'Collector';

  return (
    <header className="w-full bg-[#FBF9F5] border-b border-[#EBE7DF] sticky top-0 z-30 px-4 md:px-8 py-3.5 backdrop-blur-md bg-[#FBF9F5]/90 transition-all">
      <div className="max-w-6xl mx-auto flex flex-col gap-3">
        {/* Top Row: User Greeting, Avatar & Menu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                className="w-10 h-10 rounded-full border-2 border-[#722F37]/30 object-cover shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#722F37] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 font-sans">
                {getGreeting()}
              </p>
              <h2 className="text-xl md:text-2xl font-serif font-bold text-stone-900 leading-tight">
                {displayName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF2F4] border border-[#F5C2CB] text-[#722F37] text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#722F37] animate-pulse" />
              Private Reserve
            </span>
            <button
              onClick={onOpenMenu}
              className="p-2.5 rounded-xl border border-[#E5E0D8] bg-white hover:bg-[#F7F5F0] text-stone-700 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        {/* Search Bar & Filter Toggle */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text"
              placeholder="Search by wine name, varietal, estate, or region..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 rounded-full bg-white border border-[#E5E0D8] text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#722F37] focus:ring-1 focus:ring-[#722F37]/30 shadow-[0_2px_8px_rgba(28,25,23,0.03)] transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            onClick={onToggleFilter}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-xs font-semibold uppercase tracking-wider transition-all shadow-sm cursor-pointer whitespace-nowrap ${
              isFilterExpanded
                ? 'bg-[#722F37] text-white border-[#722F37]'
                : 'bg-white text-stone-700 border-[#E5E0D8] hover:bg-[#F7F5F0]'
            }`}
          >
            <Filter size={15} />
            <span className="hidden sm:inline">{isFilterExpanded ? 'Hide' : 'Filters'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
