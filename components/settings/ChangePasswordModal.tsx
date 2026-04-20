"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Lock, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import confetti from "canvas-confetti";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal = ({ isOpen, onClose }: ChangePasswordModalProps) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setError(null);
      setShowCurrent(false);
      setShowNew(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("Mật khẩu mới phải dài ít nhất 6 ký tự");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Xác nhận mật khẩu không khớp");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra");
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#8b5cf6", "#3b82f6", "#ffffff"]
      });
      showToast("Đổi mật khẩu thành công", "success");
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-[#0a1128] border border-white/10 rounded-[32px] shadow-2xl flex flex-col"
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Lock className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight leading-none mb-1">
                Bảo mật
              </h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Thay đổi mật khẩu
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3 text-rose-400 text-sm font-medium"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Mật khẩu hiện tại</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4.5 h-4.5 text-purple-500/50" />
                </div>
                <input
                  type={showCurrent ? "text" : "password"}
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-950 border border-white/5 rounded-2xl text-white text-sm focus:border-purple-500/50 transition-all outline-none"
                  value={formData.currentPassword}
                  onChange={e => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-purple-400 transition-colors"
                >
                  {showCurrent ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <div className="h-px w-full bg-white/5 my-2"></div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Mật khẩu mới</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4.5 h-4.5 text-blue-500/50" />
                </div>
                <input
                  type={showNew ? "text" : "password"}
                  className={`w-full pl-11 pr-12 py-3.5 bg-slate-950 border rounded-2xl text-white text-sm focus:border-blue-500/50 transition-all outline-none ${
                    formData.newPassword.length > 0 && formData.newPassword.length < 6 ? 'border-rose-500/50' : 'border-white/5'
                  }`}
                  value={formData.newPassword}
                  onChange={e => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-blue-400 transition-colors"
                >
                  {showNew ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {formData.newPassword.length > 0 && formData.newPassword.length < 6 && (
                <p className="text-rose-400 text-xs ml-1 mt-1">Mật khẩu phải dài ít nhất 6 ký tự</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Xác nhận mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4.5 h-4.5 text-blue-500/30" />
                </div>
                <input
                  type={showNew ? "text" : "password"}
                  className={`w-full pl-11 pr-12 py-3.5 bg-slate-950 border rounded-2xl text-white text-sm focus:border-blue-500/50 transition-all outline-none ${
                    formData.confirmPassword.length > 0 && formData.confirmPassword !== formData.newPassword ? 'border-rose-500/50' : 'border-white/5'
                  }`}
                  value={formData.confirmPassword}
                  onChange={e => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>
              {formData.confirmPassword.length > 0 && formData.confirmPassword !== formData.newPassword && (
                <p className="text-rose-400 text-xs ml-1 mt-1">Xác nhận mật khẩu không khớp</p>
              )}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={saving || (formData.newPassword.length > 0 && formData.newPassword.length < 6) || (formData.confirmPassword.length > 0 && formData.confirmPassword !== formData.newPassword)}
            onClick={handleSave}
            className="w-full mt-4 py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-purple-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Lưu thay đổi
          </motion.button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
