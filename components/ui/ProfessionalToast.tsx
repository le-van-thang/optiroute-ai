"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[10000] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto"
            >
              <ProfessionalToast
                message={toast.message}
                type={toast.type}
                onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}

function ProfessionalToast({ message, type, onClose }: { message: string, type: ToastType, onClose: () => void }) {
  const getIcon = () => {
    switch (type) {
      case "success": return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case "error": return <AlertCircle className="w-5 h-5 text-rose-400" />;
      default: return <Info className="w-5 h-5 text-indigo-400" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case "success": return "border-emerald-500/20";
      case "error": return "border-rose-500/20";
      default: return "border-indigo-500/20";
    }
  };

  return (
    <div className={`flex items-center gap-4 px-5 py-4 bg-[#0a1128]/90 backdrop-blur-xl border ${getBorderColor()} rounded-2xl shadow-2xl min-w-[300px] max-w-md group`}>
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      <p className="flex-1 text-sm font-bold text-white leading-tight">
        {message}
      </p>
      <button 
        onClick={onClose}
        className="p-1 rounded-lg bg-white/5 text-slate-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* Animated Timer Bar */}
      <motion.div 
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 4, ease: "linear" }}
        className={`absolute bottom-0 left-0 h-0.5 rounded-full ${
          type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-rose-500' : 'bg-indigo-500'
        }`}
      />
    </div>
  );
}
