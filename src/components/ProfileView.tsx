import React from 'react';
import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import { LogIn, LogOut, Wine, Award, Sparkles, TrendingUp, DollarSign, BookOpen, Quote } from 'lucide-react';
import { WineBottle, GrapeVariety, WINE_TYPE_CONFIG } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from 'recharts';

interface ProfileViewProps {
  user: User | null;
  bottles: WineBottle[];
  grapes: GrapeVariety[];
  typeData: { name: string; value: number }[];
  regionData: { name: string; value: number }[];
  cellarGrowthData: { name: string; count: number }[];
  topVarietals: { name: string; count: number }[];
  customTooltip: React.FC<any>;
  colors: string[];
  onLogin: () => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  bottles,
  typeData,
  regionData,
  cellarGrowthData,
  topVarietals,
  customTooltip: CustomTooltip,
  colors,
  onLogin,
  onLogout,
}) => {
  const totalValue = bottles.reduce((sum, b) => sum + (b.price || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-widest font-bold bg-[#722F37]/10 text-[#722F37] border border-[#722F37]/20 px-3 py-1 rounded-full inline-block">
          Sommelier Profile & Insights
        </span>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 tracking-tight">
          Private Reserve & Analytics
        </h1>
        <p className="text-xs text-stone-600 max-w-lg">
          Manage your sommelier account, cloud synchronization, and explore valuation and growth analytics.
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-[#EBE7DF] rounded-2xl p-6 md:p-8 shadow-[0_2px_12px_rgba(28,25,23,0.04)] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#EBE7DF]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#722F37]/10 border-2 border-[#722F37]/30 flex items-center justify-center text-[#722F37] overflow-hidden shrink-0 shadow-inner">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
              ) : (
                <Wine size={28} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-serif font-bold text-stone-900">
                  {user?.displayName || 'Connoisseur Reserve'}
                </h3>
                <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Grand Cru Member
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {user?.email || 'Local Reserve • Sync available'}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            {user ? (
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold tracking-wider transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#722F37] hover:bg-[#5c242c] text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <LogIn size={14} />
                <span>Sync with Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#EBE7DF]">
            <p className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider flex items-center gap-1.5">
              <Wine size={12} className="text-[#722F37]" />
              Total Bottles
            </p>
            <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{bottles.length}</p>
          </div>
          <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#EBE7DF]">
            <p className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider flex items-center gap-1.5">
              <DollarSign size={12} className="text-emerald-600" />
              Estimated Value
            </p>
            <p className="text-2xl font-serif font-bold text-stone-900 mt-1">฿{totalValue.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#EBE7DF]">
            <p className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider flex items-center gap-1.5">
              <Award size={12} className="text-amber-600" />
              Cellar Tier
            </p>
            <p className="text-xl font-serif font-bold text-stone-900 mt-1">Premier Cru</p>
          </div>
          <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#EBE7DF]">
            <p className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} className="text-purple-600" />
              Google Cloud Sync
            </p>
            <p className="text-xs font-semibold text-stone-800 mt-2 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              {user ? 'Cloud Active' : 'Offline Storage'}
            </p>
          </div>
        </div>
      </div>

      {/* Stevenson Reserve Plaque */}
      <div className="bg-gradient-to-br from-amber-50/70 via-[#FDFBF7] to-amber-50/40 border border-amber-200/80 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100/80 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 shadow-inner">
            <Quote size={20} />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-bold text-amber-800">
              The Stevenson Reserve Plaque
            </p>
            <blockquote className="font-serif italic text-lg md:text-xl text-stone-800 leading-relaxed">
              "Wine is bottled poetry."
            </blockquote>
            <p className="text-xs uppercase tracking-wider font-semibold text-[#722F37]">
              — Robert Louis Stevenson
            </p>
          </div>
        </div>
      </div>

      {/* Cellar Analytics Charts */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-stone-900">Cellar Analytics</h2>
            <p className="text-xs text-stone-500">Visual breakdowns of classifications and historical trends</p>
          </div>
        </div>

        {bottles.length === 0 ? (
          <div className="py-16 bg-white border border-dashed border-[#EBE7DF] rounded-2xl flex flex-col items-center justify-center text-center p-8 shadow-sm">
            <Wine size={36} className="text-stone-300 mb-3" />
            <h4 className="font-serif text-lg font-bold text-stone-800">No Bottles to Analyze</h4>
            <p className="text-xs text-stone-500 mt-1 max-w-sm">
              Add your first bottle to unlock interactive charts and provenance reports.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Type Distribution */}
              <div className="bg-white border border-[#EBE7DF] rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-serif font-bold text-stone-900">Distribution by Type</h3>
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-stone-400">Classified cellar proportions</p>
                </div>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                      >
                        {typeData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={WINE_TYPE_CONFIG[entry.name as any]?.hex || colors[index % colors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '500', paddingTop: '10px', color: '#57534E' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Regions */}
              <div className="bg-white border border-[#EBE7DF] rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-serif font-bold text-stone-900">Top Regions</h3>
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-stone-400">Most represented origins</p>
                </div>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionData} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#78716C"
                        fontSize={11}
                        fontWeight={500}
                        tickLine={false}
                        axisLine={false}
                        width={90}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Bottles" fill="#722F37" radius={[0, 6, 6, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Growth & Varietals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Popular Varieties */}
              <div className="bg-white border border-[#EBE7DF] rounded-2xl p-6 shadow-sm space-y-4 lg:col-span-1">
                <div>
                  <h3 className="text-lg font-serif font-bold text-stone-900">Top Varieties</h3>
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-stone-400">Most collected grapes</p>
                </div>
                <div className="space-y-2.5">
                  {topVarietals.slice(0, 5).map((v, i) => (
                    <div key={v.name} className="flex justify-between items-center p-3 bg-[#FAF8F5] border border-[#EBE7DF] rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-[#722F37] bg-[#722F37]/10 w-6 h-6 rounded-lg flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-xs font-serif font-semibold text-stone-900">{v.name}</p>
                          <p className="text-[9px] uppercase font-medium text-stone-500">{v.count} bottles</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cellar Growth Chart */}
              <div className="bg-white border border-[#EBE7DF] rounded-2xl p-6 shadow-sm space-y-4 lg:col-span-2">
                <div>
                  <h3 className="text-lg font-serif font-bold text-stone-900">Cellar Growth</h3>
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-stone-400">Bottles cataloged over time</p>
                </div>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cellarGrowthData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EBE7DF" vertical={false} />
                      <XAxis dataKey="name" stroke="#78716C" fontSize={10} fontWeight={500} tickLine={false} axisLine={false} dy={5} />
                      <YAxis stroke="#78716C" fontSize={10} fontWeight={500} tickLine={false} axisLine={false} dx={-5} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Bottles"
                        stroke="#722F37"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#722F37', stroke: '#FFFFFF', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#800020' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
