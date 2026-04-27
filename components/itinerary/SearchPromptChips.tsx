"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { PROVINCE_DATA } from "@/lib/vietnam-provinces-data";

interface SearchPromptChipsProps {
  onSelect: (prompt: string) => void;
  province?: string | null;
  className?: string;
}

const DEFAULT_CHIPS = [
  { icon: "🍜", vi: "Food tour Sài Gòn 1 ngày", en: "1-day Saigon food tour" },
  { icon: "🏖️", vi: "Nha Trang 3N2Đ khách sạn 4 sao", en: "Nha Trang 3D2N 4-star hotel" },
  { icon: "🏕️", vi: "Cắm trại Đà Lạt cuối tuần", en: "Dalat camping weekend" },
  { icon: "🏯", vi: "Hội An 2 ngày khám phá phố cổ", en: "2-day Hoi An ancient town" },
  { icon: "🌋", vi: "Phú Quốc 5N4Đ nghỉ dưỡng", en: "Phu Quoc 5D4N resort trip" },
  { icon: "🎋", vi: "Sapa trekking 3 ngày", en: "3-day Sapa trekking" },
];

export function SearchPromptChips({ onSelect, province, className = "" }: SearchPromptChipsProps) {
  const { lang } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const provinceInfo = province ? PROVINCE_DATA[province] : null;
  const chips = provinceInfo ? provinceInfo.chips : DEFAULT_CHIPS;

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeft(scrollLeft > 10);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [chips]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Province Intro */}
      <AnimatePresence mode="wait">
        {provinceInfo && (
          <motion.div
            key={province}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex gap-3 items-start"
          >
            <div className="p-2 bg-indigo-500/20 rounded-xl mt-0.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300 mb-1">
                {lang === "vi" ? `Khám phá ${province}` : `Explore ${province}`}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {lang === "vi" ? provinceInfo.intro.vi : provinceInfo.intro.en}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative group/container">
        {/* Scroll Arrows */}
        {showLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-all opacity-0 group-hover/container:opacity-100"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={3} />
          </button>
        )}
        
        {showRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-all opacity-0 group-hover/container:opacity-100"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={3} />
          </button>
        )}

        {/* Chips Container */}
        <div 
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style jsx>{`
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {chips.map((chip) => (
            <motion.button
              key={chip.vi}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const text = lang === "vi" ? chip.vi : chip.en;
                onSelect(text);
              }}
              className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/10 text-slate-300 hover:text-white text-[12px] font-bold transition-all whitespace-nowrap backdrop-blur-sm shadow-sm"
            >
              <span className="text-lg leading-none">{chip.icon}</span>
              <span>{lang === "vi" ? chip.vi : chip.en}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
