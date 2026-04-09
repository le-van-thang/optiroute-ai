"use client";

import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { Sparkles, Map as MapIcon, Loader2, Calendar, MapPin, Clock, ArrowRight } from "lucide-react";

const translations = {
  vi: {
    sidebarTitle: "WanderDNA AI",
    sidebarSubtitle: "Phác thảo chuyến đi mơ ước của bạn.",
    promptPlaceholder: "Ví dụ: Đi Đà Lạt 3 ngày 2 đêm, chủ yếu săn mây, ăn đồ nướng và ngắm cảnh thiên nhiên yên tĩnh...",
    generateBtn: "Tạo Lịch Trình",
    generating: "AI đang suy nghĩ...",
    errorTitle: "Lỗi tạo lịch trình",
    emptyTitle: "Chưa có dữ liệu",
    emptySubtitle: "Nhập thông tin bên trái để AI tự động lên lịch trình dành riêng cho bạn.",
    day: "Ngày",
    estCost: "Dự kiến:",
  },
  en: {
    sidebarTitle: "WanderDNA AI",
    sidebarSubtitle: "Outline your dream adventure.",
    promptPlaceholder: "Example: 3 days in Da Lat, focusing on nature, cloud hunting, and local BBQ...",
    generateBtn: "Generate Itinerary",
    generating: "AI is thinking...",
    errorTitle: "Generation Error",
    emptyTitle: "No Data",
    emptySubtitle: "Enter a prompt on the left so AI can craft your personalized itinerary.",
    day: "Day",
    estCost: "Est:",
  }
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 } // Stagger cho từng ngày
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -20, y: 20 },
  show: { opacity: 1, x: 0, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
};

export default function ItineraryPage() {
  const { lang } = useLang();
  const t = translations[lang];

  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [itineraryResult, setItineraryResult] = useState<any>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError("");
    setItineraryResult(null);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate itinerary.");
      }

      setItineraryResult(data.data.itinerary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#020817] pt-[64px] overflow-hidden font-sans">
      
      {/* Left Sidebar - AI Control Panel */}
      <div className="w-full lg:w-[400px] h-full bg-[#0a1128] flex flex-col z-40 shadow-2xl shrink-0 border-r border-white/5 relative">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            {t.sidebarTitle}
          </h2>
          <p className="text-sm text-gray-400">{t.sidebarSubtitle}</p>
        </div>
        
        <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto">
          {error && (
             <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400">
               <span className="font-semibold block mb-1">{t.errorTitle}</span>
               {error}
             </div>
          )}

          <div className="flex-1 flex flex-col relative group">
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t.promptPlaceholder}
              className="w-full flex-1 min-h-[200px] bg-[#020817] border border-white/10 rounded-2xl p-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all resize-none shadow-inner"
            />
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-[#020817]">
          <button 
            disabled={isGenerating || !prompt.trim()}
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 disabled:grayscale text-white rounded-xl text-base font-semibold transition-all shadow-lg shadow-cyan-500/25"
          >
            {isGenerating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {t.generating}</>
            ) : (
              <><Sparkles className="w-5 h-5" /> {t.generateBtn}</>
            )}
          </button>
        </div>
      </div>

      {/* Right Area - Result View & Loading */}
      <div className="flex-1 relative bg-gradient-to-br from-[#050b1a] to-[#0a1128] overflow-y-auto p-8">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto relative z-10 pt-4 pb-20">
          
          {/* Default Empty State */}
          {!isGenerating && !itineraryResult && (
             <div className="flex flex-col items-center justify-center h-[60vh] text-center">
               <div className="w-24 h-24 bg-[#0a1128] rounded-3xl border border-white/10 flex items-center justify-center mb-6 shadow-2xl shadow-cyan-500/5 rotate-3 hover:rotate-0 transition-transform cursor-default">
                 <MapIcon className="w-10 h-10 text-cyan-500 opacity-50" />
               </div>
               <h3 className="text-2xl font-bold text-white mb-2">{t.emptyTitle}</h3>
               <p className="text-gray-500 max-w-sm">{t.emptySubtitle}</p>
             </div>
          )}

          {/* Loading Skeleton */}
          {isGenerating && (
            <div className="space-y-12">
              {[1, 2].map((i) => (
                 <div key={`skel-day-${i}`} className="space-y-6">
                   <div className="h-8 w-32 bg-white/5 rounded-lg animate-pulse" />
                   <div className="grid grid-cols-1 gap-4 object-cover">
                     {[1, 2, 3].map((j) => (
                        <div key={`skel-item-${i}-${j}`} className="p-5 rounded-2xl bg-[#0a1128]/50 border border-white/5 animate-pulse flex gap-5">
                          <div className="w-16 h-16 rounded-xl bg-white/5 shrink-0" />
                          <div className="flex-1 space-y-3 py-1">
                            <div className="h-4 w-1/3 bg-white/10 rounded-md" />
                            <div className="h-3 w-3/4 bg-white/5 rounded-md" />
                            <div className="h-3 w-1/4 bg-white/5 rounded-md" />
                          </div>
                        </div>
                     ))}
                   </div>
                 </div>
              ))}
            </div>
          )}

          {/* Result Cards */}
          {!isGenerating && itineraryResult && (
             <motion.div 
               variants={containerVariants} 
               initial="hidden" 
               animate="show"
               className="space-y-12"
             >
               {itineraryResult.map((day: any, dayIdx: number) => (
                 <motion.div variants={itemVariants} key={`day-${day.day}`} className="relative">
                   
                   {/* Day Header */}
                   <div className="flex items-center gap-3 mb-6 sticky top-0 bg-[#050b1a]/90 backdrop-blur-md py-4 z-20 border-b border-white/5">
                     <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                       <Calendar className="w-5 h-5 text-cyan-400" />
                     </div>
                     <h2 className="text-2xl font-bold text-white tracking-tight">{t.day} {day.day}</h2>
                   </div>

                   {/* Activities Container */}
                   <div className="space-y-4 pl-4 md:pl-6 relative">
                     {/* Timeline Line */}
                     <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/50 via-white/10 to-transparent ml-[23px] md:ml-[31px]"></div>

                     {day.activities.map((act: any, idx: number) => (
                       <motion.div 
                         variants={itemVariants} 
                         key={`act-${day.day}-${idx}`}
                         className="relative pl-10 md:pl-12"
                       >
                         {/* Timeline Dot */}
                         <div className="absolute left-0 top-6 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)] ml-[18px] md:ml-[26px] z-10 border-2 border-[#050b1a]"></div>
                         
                         {/* Activity Card */}
                         <div className="group bg-[#0a1128] hover:bg-[#0c1533] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-5 md:p-6 shadow-xl transition-all duration-300">
                           <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                             <div className="flex-1">
                               <div className="flex items-center gap-2 mb-2">
                                 <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 text-xs font-bold font-mono">
                                   <Clock className="w-3.5 h-3.5" />
                                   {act.time}
                                 </span>
                               </div>
                               <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                 {act.place}
                               </h3>
                               <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                 {act.description}
                               </p>
                             </div>
                             
                             <div className="shrink-0 flex items-center md:items-end justify-between md:flex-col p-3 rounded-xl bg-white/[0.02] border border-white/5">
                               <span className="text-xs text-gray-500">{t.estCost}</span>
                               <span className="text-sm font-bold text-emerald-400">
                                 {act.estimatedCost ? `${act.estimatedCost.toLocaleString()} VND` : 'Free'}
                               </span>
                             </div>
                           </div>
                         </div>
                       </motion.div>
                     ))}
                   </div>

                 </motion.div>
               ))}
             </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
