"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Trash2, Sparkles, MapPin, Calendar, Clock } from "lucide-react";

interface Memory {
  id: string;
  photoUrl: string;
  placeName: string;
  filterName: string;
  timestamp: string;
  date: string;
  aiCaption: string;
  userNote: string;
}

interface MemoryStackProps {
  memories: Memory[];
  onDelete: (id: string) => void;
  onMemoryClick?: (memory: Memory) => void;
  lang: string;
  index: number;
}

const stackVariants: Variants = {
  initial: (i: number) => ({
    rotate: i % 2 === 0 ? -2 : 2,
    x: 0,
    y: 0,
    zIndex: 10 - i,
  }),
  hover: (i: number) => ({
    rotate: (i - 1) * 8, // Fan out angle
    x: (i - 1) * 45, // Fan out horizontally
    y: Math.abs(i - 1) * -10, // Slight arc
    zIndex: 20,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  }),
};

export const MemoryStack = ({ memories, onDelete, onMemoryClick, lang, index }: MemoryStackProps) => {
  const [isHovered, setIsHovered] = useState(false);

  // Take first 4 memories to show in stack for performance/visuals
  const displayMemories = memories.slice(0, 4);
  const mainMemory = memories[0];

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-12 sm:gap-24 w-full ${index % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"}`}>
      
      {/* 1. Stack Visuals */}
      <div 
        className="relative w-full sm:w-1/2 flex justify-center items-center h-[400px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative w-64 h-80">
          <AnimatePresence>
            {displayMemories.map((memory: Memory, i: number) => (
              <motion.div
                key={memory.id}
                custom={i}
                variants={stackVariants}
                initial="initial"
                animate={isHovered ? "hover" : "initial"}
                className="absolute inset-0 bg-white p-3 pb-10 shadow-xl border border-slate-100"
                style={{ originX: 0.5, originY: 1 }} // Fan out from bottom
              >
                <div 
                  className="relative w-full h-full overflow-hidden bg-slate-100 cursor-pointer"
                  onClick={() => onMemoryClick && onMemoryClick(memory)}
                >
                  <img 
                    src={memory.photoUrl} 
                    alt={memory.placeName} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/[0.03] group-hover:bg-black/0 transition-colors" />
                </div>
                
                {/* Polaroid Bottom Label (Only for top/hovered items) */}
                <div className="absolute bottom-2 left-3 right-3 flex justify-between items-center group/btn">
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter truncate max-w-[80%]">
                     {memory.date} · {memory.filterName}
                   </span>
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(memory.id);
                    }}
                    className="p-1 hover:text-rose-500 transition-colors text-slate-300"
                   >
                     <Trash2 className="w-3 h-3" />
                   </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Badge for more photos */}
          {memories.length > 4 && (
            <div className="absolute -bottom-4 -right-4 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-lg z-[30] border-2 border-white">
              +{memories.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* 2. Context & AI Insights */}
      <div className={`w-full sm:w-1/2 space-y-5 text-center ${index % 2 === 0 ? "sm:text-left" : "sm:text-right"}`}>
        <motion.div 
           initial={{ opacity: 0, y: 10 }}
           whileInView={{ opacity: 1, y: 0 }}
           className={`flex items-center gap-3 justify-center ${index % 2 === 0 ? "sm:justify-start" : "sm:justify-end"}`}
        >
          <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400/80">
            {lang === "vi" ? "Kỷ niệm AI" : "AI Memories"}
          </span>
        </motion.div>

        <h3 className="text-2xl font-black text-white tracking-tight leading-none group-hover:text-indigo-400 transition-colors">
          {mainMemory.placeName}
        </h3>

        <div className={`flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500 justify-center ${index % 2 === 0 ? "sm:justify-start" : "sm:justify-end"}`}>
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
            <Calendar className="w-3 h-3 text-indigo-500" />
            {mainMemory.date}
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
            <Clock className="w-3 h-3 text-indigo-500" />
            {mainMemory.timestamp}
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
            <MapPin className="w-3 h-3 text-indigo-500" />
            {memories.length} {lang === "vi" ? "ảnh" : "photos"}
          </div>
        </div>

        <div className={`relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] border-l-4 border-l-indigo-500 shadow-xl overflow-hidden group`}>
           <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <BookOpen className="w-12 h-12 text-indigo-500" />
           </div>
           <p className="relative text-sm text-slate-300 leading-relaxed font-medium italic">
             "{mainMemory.aiCaption}"
           </p>
        </div>
      </div>

    </div>
  );
};

const BookOpen = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
