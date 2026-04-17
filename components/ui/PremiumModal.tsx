"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { useLang } from "@/components/providers/LangProvider";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "info" | "success";
  loading?: boolean;
}

export function PremiumModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  type = "info",
  loading = false
}: PremiumModalProps) {
  const { lang } = useLang();

  const getIcon = () => {
    switch (type) {
      case "danger": return <AlertTriangle className="w-8 h-8 text-rose-500" />;
      case "success": return <CheckCircle2 className="w-8 h-8 text-emerald-500" />;
      default: return <Info className="w-8 h-8 text-indigo-500" />;
    }
  };

  const getConfirmColor = () => {
    switch (type) {
      case "danger": return "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20";
      case "success": return "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20";
      default: return "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#020817]/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[#0a1128] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/5 flex items-center justify-center mb-6 shadow-inner">
                {getIcon()}
              </div>
              
              <h3 className="text-2xl font-black text-white mb-2 tracking-tight leading-tight">
                {title}
              </h3>
              
              <p className="text-sm text-slate-400 font-medium leading-relaxed mb-8">
                {message}
              </p>

              <div className="w-full flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  {cancelText || (lang === "vi" ? "Hủy" : "Cancel")}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className={`flex-1 px-6 py-4 rounded-2xl text-white text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 ${getConfirmColor()}`}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : (
                    confirmText || (lang === "vi" ? "Xác nhận" : "Confirm")
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
