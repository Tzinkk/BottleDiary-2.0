import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogIn, LogOut, Wine, Globe, FlaskConical, BarChart3, Sparkles, User as UserIcon } from 'lucide-react';
import { User } from 'firebase/auth';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onNavigate: (view: 'home' | 'cellar' | 'explore' | 'profile' | 'wine-of-the-day' | 'grapes' | 'stats' | 'tutor') => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  user,
  onLogin,
  onLogout,
  onNavigate
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 right-0 w-full max-w-xs sm:max-w-sm bg-[#FBF9F5] border-l border-[#EBE7DF] z-50 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto"
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#EBE7DF]">
                <div>
                  <h3 className="font-serif font-bold text-xl text-stone-900 tracking-tight">
                    BOTTLE DIARY
                  </h3>
                  <p className="text-[10px] uppercase font-semibold text-[#722F37] tracking-widest">
                    Private Reserve
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white border border-[#E5E0D8] text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* User Profile / Status */}
              <div className="p-4 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs">
                {user ? (
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-10 h-10 rounded-full border border-[#722F37]/30 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#722F37] text-white flex items-center justify-center font-bold">
                        <UserIcon size={18} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-900 truncate">
                        {user.displayName || 'Collector'}
                      </p>
                      <p className="text-[10px] text-stone-500 truncate font-mono">{user.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#FDF2F4] border border-[#F5C2CB] text-[#722F37] flex items-center justify-center font-bold text-xs">
                        <UserIcon size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-800">Guest Reserve Mode</p>
                        <p className="text-[10px] text-stone-500">Sync with Google to save</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onLogin();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#722F37] hover:bg-[#5C242C] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <LogIn size={14} />
                      <span>Sync with Google</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Nav Links */}
              <div className="space-y-1.5 font-sans">
                <button
                  onClick={() => {
                    onNavigate('home');
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-stone-700 hover:bg-white hover:text-[#722F37] hover:shadow-xs transition-all cursor-pointer text-left"
                >
                  <Wine size={16} className="text-[#722F37]" />
                  <span>Dashboard & Overview</span>
                </button>
                <button
                  onClick={() => {
                    onNavigate('cellar');
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-stone-700 hover:bg-white hover:text-[#722F37] hover:shadow-xs transition-all cursor-pointer text-left"
                >
                  <Wine size={16} className="text-[#722F37]" />
                  <span>Cellar Inventory</span>
                </button>
                <button
                  onClick={() => {
                    onNavigate('wine-of-the-day');
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-stone-700 hover:bg-white hover:text-[#722F37] hover:shadow-xs transition-all cursor-pointer text-left"
                >
                  <Sparkles size={16} className="text-[#CA8A04]" />
                  <span>Wine of the Day</span>
                </button>
                <button
                  onClick={() => {
                    onNavigate('grapes');
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-stone-700 hover:bg-white hover:text-[#722F37] hover:shadow-xs transition-all cursor-pointer text-left"
                >
                  <FlaskConical size={16} className="text-[#16A34A]" />
                  <span>Grape Varieties</span>
                </button>
                <button
                  onClick={() => {
                    onNavigate('stats');
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-stone-700 hover:bg-white hover:text-[#722F37] hover:shadow-xs transition-all cursor-pointer text-left"
                >
                  <BarChart3 size={16} className="text-[#0E7490]" />
                  <span>Cellar Analytics</span>
                </button>
                <button
                  onClick={() => {
                    onNavigate('tutor');
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-stone-700 hover:bg-white hover:text-[#722F37] hover:shadow-xs transition-all cursor-pointer text-left"
                >
                  <Sparkles size={16} className="text-[#7C3AED]" />
                  <span>AI Wine Tutor</span>
                </button>
              </div>

              {/* Stevenson Reserve Plaque */}
              <div className="p-4 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs">
                <p className="text-[9px] uppercase tracking-wider font-semibold text-[#800020] mb-1">
                  Reserve Plaque
                </p>
                <p className="text-xs font-serif italic text-stone-700 leading-relaxed">
                  "Wine is bottled poetry."
                </p>
                <p className="text-[10px] text-stone-400 mt-1.5 font-medium">— Robert Louis Stevenson</p>
              </div>
            </div>

            {/* Logout button if signed in */}
            {user && (
              <div className="pt-4 border-t border-[#EBE7DF]">
                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#F5C2CB] bg-[#FDF2F4] text-[#800020] text-xs font-semibold hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
