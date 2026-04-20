"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, Shield, Globe, Users, Lock, MessageCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal = ({ isOpen, onClose }: PrivacyModalProps) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [settings, setSettings] = useState({
    profileVisibility: "PUBLIC",
    acceptMessages: true
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
        profileVisibility: data.profileVisibility || "PUBLIC",
        acceptMessages: data.acceptMessages ?? true
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: any) => {
    try {
      setSettings(prev => ({ ...prev, [key]: value }));
      const payload = { [key]: value };
      
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Failed to save setting");
      showToast("Cập nhật quyền riêng tư thành công", "success");
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
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight leading-none mb-1">
                Quyền riêng tư
              </h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Kiểm soát thông tin cá nhân
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
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
             </div>
          ) : (
            <div className="space-y-6">
              
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Hiển thị hồ sơ</h4>
                <p className="text-xs text-slate-400 mb-2">Quyết định ai có thể xem thông tin cá nhân và lịch sử hành trình của bạn.</p>
                
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => saveSetting("profileVisibility", "PUBLIC")}
                    className={`flex items-center p-3 rounded-2xl border transition-all ${settings.profileVisibility === 'PUBLIC' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-900 border-white/5 hover:bg-slate-800'}`}
                  >
                     <Globe className={`w-5 h-5 mr-3 ${settings.profileVisibility === 'PUBLIC' ? 'text-blue-400' : 'text-slate-500'}`} />
                     <div className="text-left flex-1">
                       <p className={`text-sm font-bold ${settings.profileVisibility === 'PUBLIC' ? 'text-white' : 'text-slate-300'}`}>Công khai</p>
                       <p className="text-[10px] text-slate-500">Mọi người đều có thể tìm thấy bạn</p>
                     </div>
                  </button>

                  <button 
                    onClick={() => saveSetting("profileVisibility", "FRIENDS")}
                    className={`flex items-center p-3 rounded-2xl border transition-all ${settings.profileVisibility === 'FRIENDS' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-900 border-white/5 hover:bg-slate-800'}`}
                  >
                     <Users className={`w-5 h-5 mr-3 ${settings.profileVisibility === 'FRIENDS' ? 'text-blue-400' : 'text-slate-500'}`} />
                     <div className="text-left flex-1">
                       <p className={`text-sm font-bold ${settings.profileVisibility === 'FRIENDS' ? 'text-white' : 'text-slate-300'}`}>Bạn bè, đồng hành</p>
                       <p className="text-[10px] text-slate-500">Chỉ những người đã tham gia chung Trip</p>
                     </div>
                  </button>

                  <button 
                    onClick={() => saveSetting("profileVisibility", "PRIVATE")}
                    className={`flex items-center p-3 rounded-2xl border transition-all ${settings.profileVisibility === 'PRIVATE' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-900 border-white/5 hover:bg-slate-800'}`}
                  >
                     <Lock className={`w-5 h-5 mr-3 ${settings.profileVisibility === 'PRIVATE' ? 'text-blue-400' : 'text-slate-500'}`} />
                     <div className="text-left flex-1">
                       <p className={`text-sm font-bold ${settings.profileVisibility === 'PRIVATE' ? 'text-white' : 'text-slate-300'}`}>Riêng tư</p>
                       <p className="text-[10px] text-slate-500">Ẩn hoàn toàn khỏi công cụ tìm kiếm</p>
                     </div>
                  </button>
                </div>
              </div>

              <div className="h-px bg-white/5 w-full"></div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="pr-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Nhắn tin (Social Hub)</h4>
                    <p className="text-xs text-slate-400">Cho phép người lạ (không nằm trong danh sách bạn bè) gửi tin nhắn cho bạn.</p>
                  </div>
                  <button 
                    onClick={() => saveSetting("acceptMessages", !settings.acceptMessages)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.acceptMessages ? 'bg-blue-500' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.acceptMessages ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
