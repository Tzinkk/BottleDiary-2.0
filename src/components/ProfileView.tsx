import React, { useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import { LogIn, LogOut, Wine, Award, Sparkles, TrendingUp, DollarSign, BookOpen, Quote, Download, Upload, FileText, FileSpreadsheet, Check, AlertCircle, ShieldCheck } from 'lucide-react';
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
  onImportBackup?: (importedData: { bottles?: WineBottle[]; grapes?: GrapeVariety[] }) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  bottles,
  grapes,
  typeData,
  regionData,
  cellarGrowthData,
  topVarietals,
  customTooltip: CustomTooltip,
  colors,
  onLogin,
  onLogout,
  onImportBackup,
}) => {
  const totalValue = bottles.reduce((sum, b) => sum + (b.price || 0), 0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Helper: Export Cellar as JSON
  const handleExportJSON = () => {
    try {
      const backupData = {
        exportDate: new Date().toISOString(),
        appName: "Bottle Diary & Cellar Sommelier",
        totalBottles: bottles.length,
        totalGrapes: grapes.length,
        bottles,
        grapes
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `cellar-reserve-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export JSON error:", err);
    }
  };

  // Helper: Export Cellar as CSV
  const handleExportCSV = () => {
    try {
      const headers = [
        "Name",
        "Producer",
        "Vintage",
        "Type",
        "Country",
        "Region",
        "Grapes",
        "Price (THB)",
        "Appearance",
        "Nose",
        "Palate",
        "Finish",
        "Food Pairing",
        "Winemaking Philosophy",
        "Viticulture",
        "Tasting Notes",
        "Date Added"
      ];

      const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return '""';
        const str = Array.isArray(value) ? value.join('; ') : String(value);
        return `"${str.replace(/"/g, '""')}"`;
      };

      const rows = bottles.map(b => [
        escapeCSV(b.name),
        escapeCSV(b.producer),
        escapeCSV(b.year || 'NV'),
        escapeCSV(b.type),
        escapeCSV(b.country || ''),
        escapeCSV(b.region || ''),
        escapeCSV(b.grape || []),
        escapeCSV(b.price || 0),
        escapeCSV(b.appearance || ''),
        escapeCSV(b.nose || ''),
        escapeCSV(b.palate || ''),
        escapeCSV(b.finish || ''),
        escapeCSV(b.foodPairing || []),
        escapeCSV(b.winemakingPhilosophy || ''),
        escapeCSV(b.viticulture || ''),
        escapeCSV(b.tastingNotes || ''),
        escapeCSV(new Date(b.dateAdded).toISOString().slice(0, 10))
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `cellar-wines-export-${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export CSV error:", err);
    }
  };

  // Helper: Import Backup JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        
        let importedBottles: WineBottle[] = [];
        let importedGrapes: GrapeVariety[] = [];

        if (Array.isArray(parsed)) {
          importedBottles = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.bottles)) importedBottles = parsed.bottles;
          if (Array.isArray(parsed.grapes)) importedGrapes = parsed.grapes;
        }

        if (importedBottles.length === 0 && importedGrapes.length === 0) {
          setImportStatus({
            type: 'error',
            message: "The uploaded file does not contain valid cellar bottles or grape varieties."
          });
          setTimeout(() => setImportStatus(null), 5000);
          return;
        }

        if (onImportBackup) {
          onImportBackup({ bottles: importedBottles, grapes: importedGrapes });
        }

        setImportStatus({
          type: 'success',
          message: `Successfully restored backup: ${importedBottles.length} bottles and ${importedGrapes.length} grape varieties.`
        });
        setTimeout(() => setImportStatus(null), 5000);
      } catch (err: any) {
        console.error("Failed to parse backup JSON:", err);
        setImportStatus({
          type: 'error',
          message: "Invalid JSON backup file. Please verify file integrity."
        });
        setTimeout(() => setImportStatus(null), 5000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

      {/* FEATURE 2: Cellar Backup & Portable Export Section */}
      <div className="bg-white border border-[#EBE7DF] rounded-2xl p-6 md:p-8 shadow-[0_2px_12px_rgba(28,25,23,0.04)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE7DF]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#722F37]/10 border border-[#722F37]/20 flex items-center justify-center text-[#722F37] shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-stone-900">
                Cellar Backup & Data Safety
              </h3>
              <p className="text-xs text-stone-500">
                Export complete snapshots of your {bottles.length} cellar bottles or restore from a backup file.
              </p>
            </div>
          </div>

          <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full self-start sm:self-auto">
            Zero Data Loss Guarantee
          </span>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-2 p-3.5 bg-[#FAF8F5] hover:bg-[#FDF2F4] text-stone-800 hover:text-[#722F37] border border-[#E6DFD5] hover:border-[#F5C2CB] rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer group active:scale-98"
          >
            <FileText size={16} className="text-[#722F37] group-hover:scale-110 transition-transform" />
            <span>Export Cellar as JSON</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 p-3.5 bg-[#FAF8F5] hover:bg-[#FDF2F4] text-stone-800 hover:text-[#722F37] border border-[#E6DFD5] hover:border-[#F5C2CB] rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer group active:scale-98"
          >
            <FileSpreadsheet size={16} className="text-[#722F37] group-hover:scale-110 transition-transform" />
            <span>Export Cellar as CSV</span>
          </button>

          {/* Import Backup */}
          <label className="flex items-center justify-center gap-2 p-3.5 bg-[#722F37] hover:bg-[#5A1E24] text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer group active:scale-98">
            <Upload size={16} className="group-hover:scale-110 transition-transform" />
            <span>Import Backup (.json)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Import Status Feedback */}
        {importStatus && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
              importStatus.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-red-50 border border-red-200 text-red-900'
            }`}
          >
            {importStatus.type === 'success' ? (
              <Check size={16} className="text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-red-700 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>
        )}
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
      {bottles.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cellar by Type */}
            <div className="bg-white border border-[#EBE7DF] rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900">Cellar Composition</h3>
                <p className="text-[10px] uppercase font-semibold tracking-wider text-stone-400">Distribution by wine style</p>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
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
    </motion.div>
  );
};
