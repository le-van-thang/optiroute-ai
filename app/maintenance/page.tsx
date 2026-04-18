"use client";

import { motion } from "framer-motion";
import { Hammer, AlertTriangle, Construction, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 overflow-hidden relative">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full text-center space-y-8 relative z-10">
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/20"
        >
          <Construction className="w-12 h-12 text-white" />
        </motion.div>

        <div className="space-y-4">
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Hệ thống đang bảo trì</h1>
          <p className="text-slate-400 font-bold uppercase text-[11px] tracking-widest leading-relaxed">
            Chúng tôi đang thực hiện một số nâng cấp quan trọng để mang lại trải nghiệm tốt hơn. Vui lòng quay lại sau ít phút nhé!
          </p>
        </div>

        <div className="p-6 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[32px] flex items-center gap-4 text-left">
           <div className="p-3 bg-orange-500/10 rounded-2xl">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
           </div>
           <div>
              <p className="text-[10px] font-black text-white uppercase mb-0.5">Thời gian dự kiến</p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Hoàn tất trong khoảng 30 - 60 phút.</p>
           </div>
        </div>

        <div className="flex justify-center">
           <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-400 hover:text-white transition-all">
              <ArrowLeft className="w-4 h-4" />
              Quay lại trang chủ
           </Link>
        </div>

      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
         <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">OptiRoute AI Engineering</p>
      </div>

    </div>
  );
}
