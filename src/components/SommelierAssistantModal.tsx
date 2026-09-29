import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, X, Bot, User as UserIcon, Loader2, Wine, Trash2, ChevronRight, MessageSquare, Compass, Utensils, Award } from 'lucide-react';
import { WineBottle } from '../types';
import { askSommelierAssistant, ChatMessage } from '../services/aiService';

interface SommelierAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  bottles: WineBottle[];
  onSelectBottle?: (bottle: WineBottle) => void;
}

const QUICK_PROMPTS = [
  "What bottle from my cellar should I drink with roasted duck or steak tonight?",
  "Which crisp, high-acidity natural white in my reserve should I open first?",
  "Recommend a great pairing for artisan pizza or pasta from my collection",
  "Which bottle in my cellar is currently at its absolute peak maturity?",
  "Suggest 2 contrasting red wines from my cellar for a dinner with friends"
];

export const SommelierAssistantModal: React.FC<SommelierAssistantModalProps> = ({
  isOpen,
  onClose,
  bottles,
  onSelectBottle
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Good evening. I am your Private Sommelier Assistant. I have evaluated all **${bottles.length} bottles** currently in your reserve.\n\nAsk me for customized dinner pairings, tasting order suggestions, vintage insights, or which bottle from your cellar to uncork tonight.`,
        timestamp: Date.now()
      }
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: query,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const historyForAI = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const response = await askSommelierAssistant(query, bottles, historyForAI);

      const assistantMsg: ChatMessage = {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: response.text,
        recommendedBottles: response.recommendedBottles,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("Sommelier AI Assistant Error:", err);
      setError(err?.message || "Our sommelier encountered an issue reviewing the cellar. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: `Cellar consultation cleared. I am ready to advise you on your **${bottles.length} cellar bottles**. What would you like to explore?`,
        timestamp: Date.now()
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#FBF9F5] border border-[#E6DFD5] w-full max-w-2xl h-[88vh] max-h-[750px] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-900 relative"
        >
          {/* Header */}
          <div className="p-4 sm:px-6 bg-white border-b border-[#EBE5DC] flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#722F37] text-white flex items-center justify-center shadow-sm">
                <Sparkles size={20} className="animate-pulse text-amber-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-serif font-bold text-stone-900">
                    AI Sommelier Cellar Assistant
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FDF2F4] text-[#722F37] border border-[#F5C2CB]">
                    Live Cellar Context
                  </span>
                </div>
                <p className="text-xs text-stone-500">
                  {bottles.length} bottles indexed in your private reserve
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';

              // Find matching bottle objects if recommended
              const matchedBottles = isAssistant && msg.recommendedBottles && msg.recommendedBottles.length > 0
                ? msg.recommendedBottles.map(name => {
                    const match = bottles.find(b => 
                      b.name.toLowerCase().includes(name.toLowerCase()) || 
                      name.toLowerCase().includes(b.name.toLowerCase())
                    );
                    return match;
                  }).filter(Boolean) as WineBottle[]
                : [];

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isAssistant ? 'items-start' : 'items-start flex-row-reverse'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs shadow-xs font-bold ${
                      isAssistant
                        ? 'bg-[#722F37] text-amber-100'
                        : 'bg-stone-800 text-white'
                    }`}
                  >
                    {isAssistant ? <Sparkles size={14} /> : <UserIcon size={14} />}
                  </div>

                  <div className={`space-y-2 max-w-[85%] ${isAssistant ? '' : 'text-right'}`}>
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed text-left whitespace-pre-wrap ${
                        isAssistant
                          ? 'bg-white border border-[#EBE5DC] text-stone-900 shadow-2xs'
                          : 'bg-[#722F37] text-white shadow-xs'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Interactive Recommended Bottle Cards */}
                    {matchedBottles.length > 0 && (
                      <div className="pt-1 space-y-1.5 text-left">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#722F37] flex items-center gap-1">
                          <Wine size={12} />
                          <span>Recommended From Your Reserve:</span>
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {matchedBottles.map(bottle => (
                            <button
                              key={bottle.id}
                              type="button"
                              onClick={() => {
                                onSelectBottle?.(bottle);
                                onClose();
                              }}
                              className="flex items-center gap-2.5 p-2.5 bg-white border border-[#F5C2CB] hover:border-[#722F37] rounded-xl text-left shadow-2xs hover:shadow-xs transition group cursor-pointer"
                            >
                              <div className="w-9 h-11 bg-[#FAF8F5] rounded-lg overflow-hidden shrink-0 flex items-center justify-center p-1 border border-[#EBE5DC]">
                                {bottle.imageUrl ? (
                                  <img src={bottle.imageUrl} alt={bottle.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                ) : (
                                  <Wine size={16} className="text-stone-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h5 className="font-serif font-bold text-xs text-stone-900 truncate group-hover:text-[#722F37] transition">
                                  {bottle.name}
                                </h5>
                                <p className="text-[10px] text-stone-500 truncate">
                                  {bottle.year || 'NV'} • {bottle.region} • {bottle.type}
                                </p>
                              </div>
                              <ChevronRight size={13} className="text-stone-400 group-hover:text-[#722F37] group-hover:translate-x-0.5 transition" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#722F37] text-amber-100 flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles size={14} className="animate-spin" />
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#EBE5DC] shadow-2xs flex items-center gap-2 text-xs text-stone-600">
                  <Loader2 size={14} className="animate-spin text-[#722F37]" />
                  <span>Consulting cellar inventory & pairing algorithms...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="font-semibold text-red-900 underline ml-2 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestions */}
          {messages.length <= 2 && (
            <div className="px-4 sm:px-6 py-2 bg-[#F6F3ED] border-t border-[#EBE5DC] overflow-x-auto shrink-0 flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-stone-500 whitespace-nowrap">
                Suggestions:
              </span>
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSendMessage(prompt)}
                  className="text-[11px] whitespace-nowrap px-3 py-1 bg-white hover:bg-[#FDF2F4] text-stone-700 hover:text-[#722F37] border border-[#E6DFD5] hover:border-[#F5C2CB] rounded-full transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 sm:p-4 bg-white border-t border-[#EBE5DC] shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the Sommelier (e.g., 'What pairs best with pan-seared sea bass?')"
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#E6DFD5] focus:outline-none focus:ring-2 focus:ring-[#722F37]/20 focus:border-[#722F37] text-xs sm:text-sm bg-[#FAF8F5] transition"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-2.5 bg-[#722F37] hover:bg-[#5A1E24] text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
              >
                <span>Ask</span>
                <Send size={14} />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
