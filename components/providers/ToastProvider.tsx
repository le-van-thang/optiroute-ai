"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-8 right-8 z-[10000] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              layout
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              className="pointer-events-auto"
            >
              <div className={`
                flex items-center gap-4 px-6 py-5 bg-[#0a1128]/90 backdrop-blur-xl border rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[320px] max-w-md group relative overflow-hidden
                ${toast.type === "success" ? "border-emerald-500/20" : ""}
                ${toast.type === "error" ? "border-rose-500/20" : ""}
                ${toast.type === "info" ? "border-indigo-500/20" : ""}
                ${toast.type === "warning" ? "border-amber-500/20" : ""}
              `}>
                <div className={`p-2 rounded-xl flex-shrink-0 ${
                  toast.type === "success" ? "bg-emerald-500/10 text-emerald-400" : 
                  toast.type === "error" ? "bg-rose-500/10 text-rose-400" : 
                  toast.type === "warning" ? "bg-amber-500/10 text-amber-400" :
                  "bg-indigo-500/10 text-indigo-400"
                }`}>
                  {toast.type === "success" && <CheckCircle2 className="w-5 h-5" />}
                  {toast.type === "error" && <AlertCircle className="w-5 h-5" />}
                  {toast.type === "warning" && <AlertTriangle className="w-5 h-5" />}
                  {toast.type === "info" && <Info className="w-5 h-5" />}
                </div>
                
                <p className="flex-1 text-sm font-black text-white leading-tight tracking-tight">
                  {toast.message}
                </p>
                
                <button 
                  onClick={() => removeToast(toast.id)}
                  className="p-1 rounded-lg bg-white/5 text-slate-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Animated Timer Bar */}
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 4.5, ease: "linear" }}
                  className={`absolute bottom-0 left-0 h-1 ${
                    toast.type === 'success' ? 'bg-emerald-500' : 
                    toast.type === 'error' ? 'bg-rose-500' : 
                    toast.type === 'warning' ? 'bg-amber-500' :
                    'bg-indigo-500'
                  }`}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};
