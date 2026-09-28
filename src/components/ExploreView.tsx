import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, FlaskConical, Sparkles, Search, Plus, Check, X, Sparkle, ArrowRight, BarChart3, RefreshCw } from 'lucide-react';
import { WineBottle, GrapeVariety, QuizQuestion } from '../types';
import { WorldMap } from './WorldMap';

interface ExploreViewProps {
  activeSubTab: 'map' | 'grapes' | 'tutor';
  onSubTabChange: (tab: 'map' | 'grapes' | 'tutor') => void;
  bottles: WineBottle[];
  grapes: GrapeVariety[];
  filteredGrapes: GrapeVariety[];
  grapeSearchQuery: string;
  onGrapeSearchChange: (q: string) => void;
  sortByGrapes: 'name' | 'type' | 'newest';
  onSortByGrapesChange: (s: 'name' | 'type' | 'newest') => void;
  selectedGrapesForComparison: string[];
  onToggleCompareGrape: (id: string) => void;
  onOpenAddGrape: () => void;
  onEditGrape: (grape: GrapeVariety) => void;
  onDeleteGrape: (id: string, name: string) => void;
  renderGrapeCard: (grape: GrapeVariety) => React.ReactNode;
  // Tutor
  quizQuestion: QuizQuestion | null;
  isQuizLoading: boolean;
  quizError: string | null;
  quizScore: number;
  totalQuizAnswered: number;
  selectedAnswer: string | null;
  isAnswerRevealed: boolean;
  onSelectAnswer: (option: string) => void;
  onFetchNewQuiz: () => void;
  onSelectBottle?: (bottle: WineBottle) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  activeSubTab,
  onSubTabChange,
  bottles,
  grapes,
  filteredGrapes,
  grapeSearchQuery,
  onGrapeSearchChange,
  sortByGrapes,
  onSortByGrapesChange,
  onOpenAddGrape,
  renderGrapeCard,
  quizQuestion,
  isQuizLoading,
  quizError,
  quizScore,
  totalQuizAnswered,
  selectedAnswer,
  isAnswerRevealed,
  onSelectAnswer,
  onFetchNewQuiz,
  onSelectBottle,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Sub-navigation bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE7DF]">
        <div>
          <span className="text-[10px] uppercase tracking-widest font-bold bg-[#722F37]/10 text-[#722F37] border border-[#722F37]/20 px-3 py-1 rounded-full inline-block mb-1">
            Wine Discovery & Academics
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 tracking-tight">
            Explore & Learn
          </h1>
        </div>

        {/* 3 Pills for Sub-tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-[#EBE7DF] rounded-2xl shadow-sm self-start sm:self-auto">
          <button
            onClick={() => onSubTabChange('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
              activeSubTab === 'map'
                ? 'bg-[#722F37] text-white shadow-sm font-bold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Globe size={14} />
            <span>World Map</span>
          </button>
          <button
            onClick={() => onSubTabChange('grapes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
              activeSubTab === 'grapes'
                ? 'bg-[#722F37] text-white shadow-sm font-bold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <FlaskConical size={14} />
            <span>Grape Varieties</span>
          </button>
          <button
            onClick={() => onSubTabChange('tutor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
              activeSubTab === 'tutor'
                ? 'bg-[#722F37] text-white shadow-sm font-bold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Sparkles size={14} />
            <span>AI Wine Tutor</span>
          </button>
        </div>
      </div>

      {/* SubTab 1: World Map */}
      {activeSubTab === 'map' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#EBE7DF] rounded-2xl p-6 shadow-sm">
            <h3 className="text-xl font-serif font-bold text-stone-900 mb-1">Interactive World Provenance</h3>
            <p className="text-xs text-stone-500 mb-4">
              Explore the geographic origins of your private collection on our real-time world cartography.
            </p>
            <WorldMap bottles={bottles} onSelectBottle={onSelectBottle} />
          </div>
        </div>
      )}

      {/* SubTab 2: Grape Varieties Encyclopedia */}
      {activeSubTab === 'grapes' && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                {grapes.length} Varieties Documented
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Sort pills */}
              <div className="flex items-center gap-1 p-1 bg-white border border-[#EBE7DF] rounded-xl shadow-sm">
                {(['newest', 'name', 'type'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => onSortByGrapesChange(opt)}
                    className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      sortByGrapes === opt
                        ? 'bg-[#722F37] text-white shadow-sm font-bold'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    {opt === 'newest' ? 'Recent' : opt === 'type' ? 'Type' : 'A-Z'}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative group min-w-[200px]">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#722F37] transition-colors"
                />
                <input
                  type="text"
                  placeholder="Search varietals..."
                  value={grapeSearchQuery}
                  onChange={(e) => onGrapeSearchChange(e.target.value)}
                  className="w-full bg-white border border-[#EBE7DF] pl-9 pr-3 py-2 text-xs rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#722F37] transition-all shadow-sm"
                />
              </div>

              <button
                onClick={onOpenAddGrape}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-[#722F37] hover:bg-[#5c242c] text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <Plus size={14} />
                <span>Register Variety</span>
              </button>
            </div>
          </div>

          {/* Grapes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGrapes.map((grape) => (
              <React.Fragment key={grape.id}>
                {renderGrapeCard(grape)}
              </React.Fragment>
            ))}

            {filteredGrapes.length === 0 && (
              <div className="col-span-full py-16 bg-white border border-dashed border-[#EBE7DF] rounded-2xl flex flex-col items-center justify-center text-center p-8 shadow-sm">
                <FlaskConical size={36} className="text-stone-300 mb-3" />
                <h4 className="font-serif text-lg font-bold text-stone-800">No Varieties Match</h4>
                <p className="text-xs text-stone-500 mt-1 max-w-sm">
                  Adjust your search or register a new grape variety to expand your encyclopedia.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SubTab 3: AI Wine Tutor */}
      {activeSubTab === 'tutor' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-[#EBE7DF] rounded-2xl shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#722F37]">
                Sommelier Knowledge Assessment
              </span>
              <h3 className="text-2xl font-serif font-bold text-stone-900">AI Wine Sommelier Quiz</h3>
              <p className="text-xs text-stone-500">
                Sharpen your wine tasting knowledge with dynamic, sommelier-curated questions.
              </p>
            </div>

            {/* Score */}
            <div className="px-5 py-3 bg-[#FAF8F5] border border-[#EBE7DF] rounded-xl flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#722F37]/10 flex items-center justify-center text-[#722F37]">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold text-stone-400">Score</p>
                <p className="text-lg font-serif font-bold text-stone-900">
                  {totalQuizAnswered > 0 ? `${quizScore} / ${totalQuizAnswered}` : '0 / 0'}
                </p>
              </div>
            </div>
          </div>

          {/* Quiz Container */}
          <div className="p-6 md:p-8 bg-white border border-[#EBE7DF] rounded-2xl shadow-sm">
            <AnimatePresence mode="wait">
              {isQuizLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-16 flex flex-col items-center justify-center space-y-4"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-[#722F37]/20 border-t-[#722F37] animate-spin" />
                  <p className="text-xs uppercase tracking-wider text-stone-600 font-semibold">
                    Consulting the Sommelier...
                  </p>
                </motion.div>
              ) : quizError ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 text-center space-y-4"
                >
                  <p className="text-rose-600 text-sm font-medium">{quizError}</p>
                  <button
                    onClick={onFetchNewQuiz}
                    className="px-5 py-2.5 bg-[#722F37] text-white text-xs font-semibold uppercase tracking-wider rounded-xl shadow-sm cursor-pointer"
                  >
                    Try Again
                  </button>
                </motion.div>
              ) : quizQuestion ? (
                <motion.div
                  key={quizQuestion.question}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-[#722F37] tracking-widest px-2.5 py-1 rounded-full bg-[#722F37]/10 inline-block">
                      Question #{totalQuizAnswered + (isAnswerRevealed ? 0 : 1)}
                    </span>
                    <h4 className="text-xl md:text-2xl font-serif font-bold text-stone-900 leading-snug">
                      {quizQuestion.question}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 gap-3 pt-2">
                    {quizQuestion.options.map((option, idx) => {
                      const isSelected = selectedAnswer === option;
                      const isCorrect = option === quizQuestion.correctAnswer;

                      let style = 'bg-[#FAF8F5] border-[#EBE7DF] text-stone-800 hover:border-[#722F37]/40 hover:bg-stone-50';
                      let icon = null;

                      if (isAnswerRevealed) {
                        if (isCorrect) {
                          style = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold';
                          icon = <Check size={16} className="text-emerald-600" />;
                        } else if (isSelected) {
                          style = 'bg-rose-50 border-rose-300 text-rose-900 font-bold';
                          icon = <X size={16} className="text-rose-600" />;
                        } else {
                          style = 'bg-stone-50 border-stone-200 text-stone-400 opacity-60';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          disabled={isAnswerRevealed}
                          onClick={() => onSelectAnswer(option)}
                          className={`w-full text-left px-5 py-4 rounded-xl border text-sm font-medium flex items-center justify-between transition-all cursor-pointer ${style}`}
                        >
                          <span>{option}</span>
                          {icon}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswerRevealed && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3"
                    >
                      <p className="text-xs text-stone-800 leading-relaxed">
                        <strong className="text-amber-900 font-serif">Sommelier Note: </strong>
                        {quizQuestion.explanation}
                      </p>
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={onFetchNewQuiz}
                          className="flex items-center gap-2 px-5 py-2.5 bg-[#722F37] hover:bg-[#5c242c] text-white text-xs font-semibold uppercase tracking-wider rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                        >
                          <span>Next Question</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <div className="py-16 text-center space-y-4">
                  <p className="text-stone-600 text-sm">Begin your interactive sommelier tutorial session.</p>
                  <button
                    onClick={onFetchNewQuiz}
                    className="px-6 py-3 bg-[#722F37] hover:bg-[#5c242c] text-white text-xs uppercase font-semibold tracking-wider rounded-xl shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    Start AI Quiz
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
};
