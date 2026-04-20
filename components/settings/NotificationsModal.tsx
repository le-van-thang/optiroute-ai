"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, Bell, Mail, Smartphone, Loader2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal = ({ isOpen, onClose }: NotificationsModalProps) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings({
        emailNotifications: data.emailNotifications ?? true,
        pushNotifications: data.pushNotifications ?? true
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: boolean) => {
    try {
      setSettings(prev => ({ ...prev, [key]: value }));
      const payload = { [key]: value };
      
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Failed to save setting");
      showToast("Đã cập nhật tùy chọn thông báo", "success");
    } catch (error) {
      showToast("Lỗi khi lưu cài đặt", "error");
      fetchSettings(); // Revert
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
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight leading-none mb-1">
                Thông báo
              </h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Cho phép ứng dụng đẩy tin
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
             <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
             </div>
          ) : (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between p-4 bg-slate-900 border border-white/5 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-0.5">Push Notifications</h4>
                    <p className="text-[10px] text-slate-400">Nhận thông báo Pop-up ngay trên màn hình.</p>
                  </div>
                </div>
                <button 
                  onClick={() => saveSetting("pushNotifications", !settings.pushNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.pushNotifications ? 'bg-cyan-500' : 'bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.pushNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-900 border border-white/5 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-0.5">Email Alerts</h4>
                    <p className="text-[10px] text-slate-400">Nhận thông báo chia tiền, hệ thống về hòm thư Email.</p>
                  </div>
                </div>
                <button 
                  onClick={() => saveSetting("emailNotifications", !settings.emailNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.emailNotifications ? 'bg-rose-500' : 'bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
