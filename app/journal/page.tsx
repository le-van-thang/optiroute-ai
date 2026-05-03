"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  History, 
  ChevronLeft,
  Sparkles,
  BookOpen,
  Image as ImageIcon,
  Bike,
  Footprints,
  Navigation2,
  X,
  Download,
  Share2,
  Edit2,
  Check,
  MapPin as MapPinIcon
} from "lucide-react";
import Link from "next/link";
import { useLang } from "@/components/providers/LangProvider";
import { MemoryStack } from "@/components/journal/MemoryStack";

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

interface GroupedMemory {
  location: string;
  memories: Memory[];
  date: string;
}

// Hand-drawn path component with moving icon
const ArtisticPathSegment = ({ transportType }: { transportType: 'motorcycle' | 'walking' }) => {
  return (
    <div className="absolute left-1/2 top-0 bottom-0 w-8 -translate-x-1/2 pointer-events-none hidden sm:block">
      <svg width="100%" height="100%" viewBox="0 0 40 400" preserveAspectRatio="none" className="overflow-visible">
        {/* The path */}
        <motion.path
          d="M20,0 Q35,100 20,200 T20,400"
          fill="none"
          stroke="url(#pathGradient)"
          strokeWidth="3"
          strokeDasharray="8 8"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.3 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        
        {/* Moving Icon */}
        <motion.g
          initial={{ offsetDistance: "0%" }}
          animate={{ offsetDistance: "100%" }}
          transition={{ 
            duration: 12, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          style={{ offsetPath: "path('M20,0 Q35,100 20,200 T20,400')" }}
        >
          <foreignObject width="20" height="20" x="-10" y="-10">
            {transportType === 'motorcycle' ? (
              <Bike className="w-4 h-4 text-indigo-400 rotate-90 opacity-40" />
            ) : (
              <Footprints className="w-4 h-4 text-indigo-400 rotate-90 opacity-40" />
            )}
          </foreignObject>
        </motion.g>

        <defs>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="1" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default function JournalPage() {
  const { lang } = useLang();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedNote, setEditedNote] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("optiroute_journey_memories");
    if (saved) {
      try {
        setMemories(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load memories", e);
      }
    }
  }, []);

  // Group memories by location
  const groupedMemories = useMemo(() => {
    const groups: Record<string, GroupedMemory> = {};
    
    // Process in chronological order (or reverse depending on UI preference)
    // Here we use the natural order they were added
    memories.forEach(m => {
      if (!groups[m.placeName]) {
        groups[m.placeName] = {
          location: m.placeName,
          memories: [],
          date: m.date
        };
      }
      groups[m.placeName].memories.push(m);
    });
    
    return Object.values(groups);
  }, [memories]);

  const deleteMemory = (id: string) => {
    const updated = memories.filter(m => m.id !== id);
    setMemories(updated);
    localStorage.setItem("optiroute_journey_memories", JSON.stringify(updated));
    if (selectedMemory?.id === id) {
      setSelectedMemory(null);
    }
  };

  const handleSaveNote = () => {
    if (!selectedMemory) return;
    const updated = memories.map(m => m.id === selectedMemory.id ? { ...m, userNote: editedNote } : m);
    setMemories(updated);
    localStorage.setItem("optiroute_journey_memories", JSON.stringify(updated));
    setSelectedMemory({ ...selectedMemory, userNote: editedNote });
    setIsEditingNote(false);
  };

  const downloadImage = () => {
    if (!selectedMemory) return;
    const a = document.createElement("a");
    a.href = selectedMemory.photoUrl;
    a.download = `OptiRoute_Memory_${selectedMemory.date.replace(/\//g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const shareMemory = async () => {
    if (!selectedMemory) return;
    if (navigator.share) {
      try {
        // Convert base64 to File object if needed, but often text sharing is safer unless we make it a blob
        fetch(selectedMemory.photoUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], "memory.png", { type: blob.type });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              navigator.share({
                title: 'Kỷ niệm từ OptiRoute',
                text: `${selectedMemory.placeName}\n${selectedMemory.aiCaption}`,
                files: [file],
              });
            } else {
              navigator.share({
                title: 'Kỷ niệm từ OptiRoute',
                text: `${selectedMemory.placeName}\n${selectedMemory.aiCaption}`,
              });
            }
          });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      alert(lang === "vi" ? "Trình duyệt của bạn không hỗ trợ chia sẻ." : "Sharing is not supported on this browser.");
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] pt-6 pb-32 px-4 sm:px-6 relative overflow-hidden">
      {/* Background Texture (Scrapbook Feel) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/p6.png')]" />

      <div className="max-w-6xl mx-auto relative">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-8 mb-24">
          <div className="text-center sm:text-left">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4"
            >
              <Navigation2 className="w-4 h-4 text-indigo-400 rotate-45" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">
                Memories Trail
              </span>
            </motion.div>
            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase leading-[0.9]">
              {lang === "vi" ? "Nhật ký" : "Voyage"}<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                {lang === "vi" ? "Hành trình" : "Chronicles"}
              </span>
            </h1>
          </div>

          <div className="flex gap-4">
            <Link href="/itinerary">
             <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group flex items-center gap-3 px-8 py-4 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all shadow-xl shadow-indigo-500/10"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                {lang === "vi" ? "Trở về" : "Back"}
              </motion.button>
            </Link>
          </div>
        </header>

        {groupedMemories.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-40 text-center"
          >
            <div className="w-32 h-32 bg-slate-900/50 rounded-[50px] flex items-center justify-center mb-8 border border-white/5 backdrop-blur-xl">
              <ImageIcon className="w-12 h-12 text-slate-700" />
            </div>
            <h2 className="text-2xl font-black text-white mb-3">
              {lang === "vi" ? "Chưa có kỷ niệm nào" : "No Chronicles Yet"}
            </h2>
            <p className="text-slate-500 text-sm max-w-[320px] leading-relaxed font-medium">
              {lang === "vi" 
                ? "Bắt đầu hành trình của bạn, chụp những tấm ảnh thật đẹp và chúng sẽ xuất hiện tại đây." 
                : "Your journey starts with a single click. Capture photos and relive them here."}
            </p>
          </motion.div>
        ) : (
          <div className="relative space-y-32 sm:space-y-64">
             {groupedMemories.map((group, idx) => (
               <div key={group.location} className="relative">
                 {/* 1. Artistic Path Connector (only if not first) */}
                 {idx < groupedMemories.length - 1 && (
                    <ArtisticPathSegment transportType={idx % 2 === 0 ? 'motorcycle' : 'walking'} />
                 )}

                 {/* 2. Group Node */}
                 <motion.div
                   initial={{ opacity: 0, y: 50 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   className="relative z-10"
                 >
                   <MemoryStack 
                     memories={group.memories} 
                     onDelete={deleteMemory}
                     onMemoryClick={(m) => {
                       setSelectedMemory(m);
                       setEditedNote(m.userNote || "");
                       setIsEditingNote(false);
                     }}
                     lang={lang} 
                     index={idx}
                   />
                 </motion.div>
               </div>
             ))}
          </div>
        )}

        {/* Footer Stats */}
        {groupedMemories.length > 0 && (
          <footer className="mt-40 pt-10 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 opacity-30">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">{memories.length} Moments</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">{groupedMemories.length} Stops</span>
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest">
              OptiRoute AI Journey Chronology
            </p>
          </footer>
        )}
      </div>

      {/* Decorative Blur Orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Lightbox for Selected Memory */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex justify-center items-center p-4 sm:p-10 bg-slate-950/90 backdrop-blur-xl"
          >
            <button 
              onClick={() => setSelectedMemory(null)}
              className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-20"
            >
              <X className="w-6 h-6" />
            </button>

            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-5xl max-h-[90vh] flex flex-col sm:flex-row bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative z-10"
            >
              {/* Image Section */}
              <div className="w-full sm:w-3/5 bg-black relative flex items-center justify-center overflow-hidden group/lightbox">
                <img 
                  src={selectedMemory.photoUrl} 
                  alt={selectedMemory.placeName} 
                  className="w-full h-full object-contain max-h-[50vh] sm:max-h-[90vh]"
                />
                
                {/* Floating Actions on Image */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start opacity-0 group-hover/lightbox:opacity-100 transition-opacity">
                  <div className="flex gap-2">
                    <button 
                      onClick={downloadImage}
                      className="p-3 bg-black/50 backdrop-blur-md rounded-xl text-white hover:bg-indigo-600 transition-all border border-white/10 hover:border-transparent cursor-pointer pointer-events-auto"
                      title={lang === "vi" ? "Tải xuống" : "Download"}
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={shareMemory}
                      className="p-3 bg-black/50 backdrop-blur-md rounded-xl text-white hover:bg-emerald-600 transition-all border border-white/10 hover:border-transparent cursor-pointer pointer-events-auto"
                      title={lang === "vi" ? "Chia sẻ" : "Share"}
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar Section */}
              <div className="w-full sm:w-2/5 flex flex-col p-6 sm:p-10 overflow-y-auto">
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-[10px] uppercase tracking-widest rounded-lg">
                    {selectedMemory.filterName}
                  </span>
                  <span className="text-xs text-slate-500 font-bold font-mono tracking-tighter">
                    {selectedMemory.date} · {selectedMemory.timestamp}
                  </span>
                </div>

                <h2 className="text-3xl font-black text-white leading-tight mb-2">
                  {selectedMemory.placeName}
                </h2>
                
                <p className="text-sm text-slate-400 italic mb-8 border-l-4 border-slate-700 pl-4 py-1 leading-relaxed">
                  "{selectedMemory.aiCaption}"
                </p>

                {/* User Note Area */}
                <div className="flex-1 mt-auto border-t border-white/5 pt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                      {lang === "vi" ? "Ghi chú của bạn" : "Your Notes"}
                    </h4>
                    {!isEditingNote && (
                      <button 
                        onClick={() => setIsEditingNote(true)}
                        className="text-indigo-400 hover:text-indigo-300 transition-colors p-1"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {isEditingNote ? (
                    <div className="space-y-3">
                      <textarea 
                        value={editedNote}
                        onChange={(e) => setEditedNote(e.target.value)}
                        placeholder={lang === "vi" ? "Viết gì đó về kỷ niệm này..." : "Write something about this..."}
                        className="w-full h-32 bg-slate-950 border border-indigo-500/30 rounded-xl p-4 text-sm text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={handleSaveNote}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg flex justify-center gap-2 items-center cursor-pointer pointer-events-auto"
                        >
                          <Check className="w-4 h-4" />
                          {lang === "vi" ? "Lưu lại" : "Save"}
                        </button>
                        <button 
                          onClick={() => {
                            setEditedNote(selectedMemory.userNote || "");
                            setIsEditingNote(false);
                          }}
                          className="px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer pointer-events-auto"
                        >
                          {lang === "vi" ? "Hủy" : "Cancel"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => setIsEditingNote(true)}
                      className={`w-full min-h-[4rem] p-4 rounded-xl border border-white/5 cursor-pointer transition-colors cursor-pointer pointer-events-auto ${
                        selectedMemory.userNote ? "bg-slate-800/50 hover:bg-slate-800" : "bg-white/[0.02] hover:bg-white/[0.04] border-dashed"
                      }`}
                    >
                      {selectedMemory.userNote ? (
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {selectedMemory.userNote}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-600 font-medium text-center py-4">
                          {lang === "vi" ? "Chạm để thêm ghi chú..." : "Tap to add notes..."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
