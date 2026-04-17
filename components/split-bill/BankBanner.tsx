"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, ShieldCheck, X } from "lucide-react";
import { useLang } from "@/components/providers/LangProvider";

interface BankBannerProps {
  onAction: () => void;
}

export const BankBanner = ({ onAction }: BankBannerProps) => {
  const { lang } = useLang();
  const [isVisible, setIsVisible] = React.useState(true);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="relative overflow-hidden group mb-8"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-[28px]" />
      <div className="absolute inset-0 border border-amber-500/30 rounded-[28px] group-hover:border-amber-500/50 transition-colors" />
      
      {/* Close button */}
      <button 
        onClick={() => setIsVisible(false)}
        className="absolute top-4 right-4 z-10 p-2 bg-amber-500/10 hover:bg-amber-500/20 rounded-full text-amber-500 transition-all"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[22px] bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shadow-lg shadow-amber-500/10">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-xl font-black text-white tracking-tight mb-1">
              {lang === "vi" ? "Chưa có thông tin nhận tiền" : "Missing Payment Info"}
            </h3>
            <p className="text-sm text-amber-200/70 font-medium max-w-md leading-relaxed">
              {lang === "vi" 
                ? "Cập nhật số tài khoản để bạn bè có thể quét mã VietQR và trả nợ cho bạn một cách nhanh chóng, chính xác." 
                : "Configure your bank account so friends can scan and pay you back instantly via VietQR."}
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ x: 5 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="flex items-center gap-3 px-8 py-4 bg-amber-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-amber-500/20 hover:bg-amber-400 transition-all cursor-pointer pointer-events-auto"
        >
          {lang === "vi" ? "Cập nhật ngay" : "Set Up Now"}
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Glossy overlay */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute -bottom-8 -right-8 opacity-20 group-hover:opacity-40 transition-opacity">
        <ShieldCheck className="w-32 h-32 text-amber-500" />
      </div>
    </motion.div>
  );
};
