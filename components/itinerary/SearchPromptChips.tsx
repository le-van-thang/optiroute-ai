"use client";

import { motion } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";

interface SearchPromptChipsProps {
  onSelect: (prompt: string) => void;
  province?: string | null;
  className?: string;
}

export function SearchPromptChips({ onSelect, province, className = "" }: SearchPromptChipsProps) {
  const { lang } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const getDayChips = () => {
    // Dynamic logic based on province
    const provinceKey = province || "default";
    
    const data: Record<string, any[]> = {
      "Đà Nẵng": [
        { icon: "🐉", vi: "Cầu Rồng & Cầu Tình Yêu đêm nay", en: "Dragon & Love Bridge tonight" },
        { icon: "⛰️", vi: "Ngũ Hành Sơn & Chùa Linh Ứng", en: "Marble Mountains & Linh Ung Pagoda" },
        { icon: "🏰", vi: "Bà Nà Hills - Cầu Vàng 1 ngày", en: "Bana Hills - Golden Bridge 1 day" },
        { icon: "🥘", vi: "Food tour Đà Nẵng: Mì Quảng, Bánh Xèo", en: "Danang Food Tour: Mi Quang, Pancakes" },
        { icon: "🏖️", vi: "Bán đảo Sơn Trà - Ngắm voọc chà vá", en: "Son Tra Peninsula - Douc langur viewing" },
      ],
      "Lâm Đồng": [
        { icon: "🏕️", vi: "Cắm trại săn mây Đà Lạt", en: "Dalat cloud hunting & camping" },
        { icon: "☕", vi: "Tour cafe 'sống ảo' view thung lũng", en: "Vibe cafe tour with valley view" },
        { icon: "🌊", vi: "Thác Datanla & Chèo thuyền hồ Tuyền Lâm", en: "Datanla Falls & Tuyen Lam kayaking" },
        { icon: "🍓", vi: "Tham quan vườn dâu & Vườn hoa thành phố", en: "Strawberry garden & Flower garden tour" },
      ],
      "Hà Nội": [
        { icon: "🏛️", vi: "Phố cổ & Lăng Bác 1 ngày", en: "Old Quarter & Ho Chi Minh Mausoleum" },
        { icon: "🚲", vi: "Tour xe đạp quanh Hồ Tây", en: "West Lake cycling tour" },
        { icon: "☕", vi: "Thử Cafe Giảng & Bún Chả lâu đời", en: "Try Cafe Giang & Legendary Bun Cha" },
        { icon: "🎭", vi: "Xem múa rối nước & Thăm Văn Miếu", en: "Water Puppet show & Temple of Literature" },
      ],
      "TP Hồ Chí Minh": [
        { icon: "🌇", vi: "Ngắm thành phố từ Landmark 81", en: "Landmark 81 viewing deck" },
        { icon: "🍝", vi: "Food tour Quận 4 - Thiên đường ăn vặt", en: "District 4 food tour - Street food heaven" },
        { icon: "🚢", vi: "Ăn tối trên du thuyền Sông Sài Gòn", en: "Dinner cruise on Saigon River" },
        { icon: "🏫", vi: "Dinh Độc Lập & Bưu điện thành phố", en: "Independence Palace & City Post Office" },
      ],
      "Khánh Hòa": [
        { icon: "🏖️", vi: "Tour 4 đảo & VinWonders Nha Trang", en: "4-island tour & VinWonders" },
        { icon: "🦞", vi: "Hải sản Bình Ba & Tắm bùn khoáng", en: "Binh Ba seafood & Mud bath" },
      ],
      "default": [
        { icon: "🍜", vi: "Food tour Sài Gòn 1 ngày", en: "1-day Saigon food tour" },
        { icon: "🏖️", vi: "Nha Trang 3N2Đ khách sạn 4 sao", en: "Nha Trang 3D2N 4-star hotel" },
        { icon: "🏕️", vi: "Cắm trại Đà Lạt cuối tuần", en: "Dalat camping weekend" },
        { icon: "🏯", vi: "Hội An 2 ngày khám phá phố cổ", en: "2-day Hoi An ancient town" },
        { icon: "🌋", vi: "Phú Quốc 5N4Đ nghỉ dưỡng", en: "Phu Quoc 5D4N resort trip" },
        { icon: "🎋", vi: "Sapa trekking 3 ngày", en: "3-day Sapa trekking" },
      ]
    };

    return data[provinceKey] || data["default"];
  };

  const chips = getDayChips();

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
  }, []);

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
    <div className={`relative group/container ${className}`}>
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
  );
}
