"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Check, Landmark, CreditCard, User, 
  Search, ChevronDown, Loader2, ShieldCheck,
  AlertCircle, Copy
} from "lucide-react";
import { useLang } from "@/components/providers/LangProvider";
import { useToast } from "@/components/providers/ToastProvider";

interface Bank {
  code: string;
  name: string;
}

const BANKS: Bank[] = [
  { code: "VCB", name: "Vietcombank" },
  { code: "CTG", name: "VietinBank" },
  { code: "BIDV", name: "BIDV" },
  { code: "VBA", name: "Agribank" },
  { code: "MB", name: "MB Bank" },
  { code: "TCB", name: "Techcombank" },
  { code: "ACB", name: "ACB" },
  { code: "VPB", name: "VPBank" },
  { code: "TPB", name: "TPBank" },
  { code: "VIB", name: "VIB" },
  { code: "STB", name: "Sacombank" },
  { code: "HDB", name: "HDBank" },
  { code: "SHB", name: "SHB" },
  { code: "EIB", name: "Eximbank" },
  { code: "MSB", name: "MSB" },
  { code: "OCB", name: "OCB" },
  { code: "LPBank", name: "LPBank" },
  { code: "TIMO", name: "Timo" },
  { code: "CAKE", name: "Cake" },
];

interface BankSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BankSettingsModal = ({ isOpen, onClose, onSuccess }: BankSettingsModalProps) => {
  const { lang } = useLang();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({
    bankCode: "",
    bankName: lang === "vi" ? "Chọn ngân hàng" : "Select bank",
    bankAccountNumber: "",
    bankAccountName: ""
  });
  
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchBankInfo();
    }
  }, [isOpen]);

  const fetchBankInfo = async () => {
    setLoading(true);
    try {
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      
      if (session?.user?.id) {
          const bankRes = await fetch(`/api/user/bank?userId=${session.user.id}`);
          const data = await bankRes.json();
          if (data && !data.error) {
              setFormData({
                  bankCode: data.bankCode || "",
                  bankName: data.bankName || (lang === "vi" ? "Chọn ngân hàng" : "Select bank"),
                  bankAccountNumber: data.bankAccountNumber || "",
                  bankAccountName: data.bankAccountName || ""
              });
              if (data.bankAccountNumber) {
                setIsEditing(false);
              } else {
                setIsEditing(true);
              }
          } else {
            setIsEditing(true);
          }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredBanks = useMemo(() => {
    if (!searchQuery) return BANKS;
    return BANKS.filter(b => 
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleSave = async () => {
    if (!formData.bankAccountNumber || !formData.bankAccountName) {
      setError(lang === "vi" ? "Vui lòng nhập đầy đủ thông tin" : "Please fill in all fields");
      return;
    }

    if (!/^\d+$/.test(formData.bankAccountNumber)) {
      setError(lang === "vi" ? "Số tài khoản chỉ được chứa chữ số" : "Account number must contain digits only");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user/bank", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Failed to save");
      
      onSuccess?.();
      setIsEditing(false);
      showToast(lang === "vi" ? "Đã lưu thông tin tài khoản" : "Bank account saved", "success");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xl"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-[#0a1128] border border-white/10 rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/20 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Landmark className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight leading-none mb-1">
                {lang === "vi" ? "Cài đặt nhận tiền" : "Receiving Info"}
              </h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-2.5 h-2.5" />
                {lang === "vi" ? "Thông tin chuyển khoản" : "Bank Details"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
               <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Đang tải cấu hình...</p>
            </div>
          ) : (
            <>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3 text-rose-400 text-sm font-medium"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              {formData.bankAccountNumber && !isEditing ? (
                <div className="space-y-6">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Tài khoản thụ hưởng</span>
                      <ShieldCheck className="w-4 h-4 text-indigo-500/50" />
                    </div>
                    
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-950/50 rounded-2xl border border-indigo-500/10 shadow-inner">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Số tài khoản</span>
                        <span className="text-sm font-black text-white tabular-nums tracking-wider">{formData.bankAccountNumber}</span>
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(formData.bankAccountNumber);
                          showToast(lang === "vi" ? "Đã sao chép STK" : "Acount number copied", "success");
                        }}
                        className="p-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-xl transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3 bg-slate-950/50 rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Ngân hàng</span>
                        <span className="text-sm font-black text-white truncate max-w-[180px]">{formData.bankName}</span>
                      </div>
                      <span className="text-[10px] font-black text-indigo-400/50">{formData.bankCode || "???"}</span>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3 bg-slate-950/50 rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Chủ tài khoản</span>
                        <span className="text-sm font-black text-white">{formData.bankAccountName || "CHƯA CẬP NHẬT"}</span>
                      </div>
                      <User className="w-3.5 h-3.5 text-indigo-500/50" />
                    </div>
                  </motion.div>

                  {formData.bankAccountNumber && formData.bankCode && (
                    <div className="flex flex-col items-center gap-3 bg-white/5 border border-white/5 rounded-3xl p-5">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Mã VietQR cá nhân</p>
                      <div className="relative group">
                         <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
                         <div className="relative bg-white p-2 rounded-xl">
                            <img 
                              src={`https://img.vietqr.io/image/${formData.bankCode}-${formData.bankAccountNumber}-compact2.png?accountName=${encodeURIComponent(formData.bankAccountName)}`} 
                              alt="VietQR" 
                              className="w-32 h-32 object-contain"
                            />
                         </div>
                      </div>
                      <p className="text-[9px] text-slate-500 font-medium text-center">Bạn bè có thể quét mã này để chuyển tiền nhanh hơn.</p>
                    </div>
                  )}

                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                  >
                    Thay đổi thông tin
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 py-2">
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">
                      {formData.bankAccountNumber ? "Cập nhật tài khoản" : "Cấu hình tài khoản"}
                    </span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Ngân hàng thụ hưởng</label>
                    <div className="relative">
                      <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="w-full relative flex items-center justify-between pl-12 pr-4 py-3.5 bg-slate-950 border border-white/5 rounded-2xl text-white text-sm font-bold focus:border-indigo-500/50 transition-all text-left"
                      >
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Landmark className="w-4.5 h-4.5 text-indigo-500/50" />
                        </div>
                        <span className="truncate">{formData.bankName} ({formData.bankCode})</span>
                        <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {showDropdown && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="relative mt-2 bg-slate-950/40 border border-white/10 rounded-2xl shadow-inner overflow-hidden flex flex-col max-h-[300px]"
                          >
                            <div className="p-3 border-b border-white/5 sticky top-0 bg-slate-950/50 z-10">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                                  placeholder="Tìm ngân hàng..."
                                  value={searchQuery}
                                  onChange={e => setSearchQuery(e.target.value)}
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                              {filteredBanks.map(b => (
                                <button
                                  key={b.code}
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, bankCode: b.code, bankName: b.name }));
                                    setShowDropdown(false);
                                    setSearchQuery("");
                                  }}
                                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                    b.code === formData.bankCode ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-white/5"
                                  }`}
                                >
                                  <span>{b.name}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded ${b.code === formData.bankCode ? 'bg-white/20' : 'bg-slate-800'}`}>
                                    {b.code}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Số tài khoản</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <CreditCard className="w-5 h-5 text-indigo-500/50" />
                      </div>
                      <input
                        type="text"
                        className={`w-full pl-12 pr-4 py-4 bg-slate-950 border ${validationError ? 'border-rose-500/50' : 'border-white/5'} rounded-2xl text-white text-sm font-bold focus:border-indigo-500/50 transition-all outline-none`}
                        placeholder="VD: 123456789"
                        value={formData.bankAccountNumber}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({ ...prev, bankAccountNumber: val }));
                          if (val && !/^\d+$/.test(val)) {
                            setValidationError(lang === "vi" ? "Chỉ được nhập số" : "Digits only");
                          } else {
                            setValidationError(null);
                          }
                        }}
                      />
                      {validationError && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-rose-500">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase">{validationError}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Tên chủ tài khoản</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="w-5 h-5 text-indigo-500/50" />
                      </div>
                      <input
                        type="text"
                        className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-white/5 rounded-2xl text-white text-sm font-bold focus:border-indigo-500/50 transition-all outline-none uppercase"
                        placeholder="VD: NGUYEN VAN A"
                        value={formData.bankAccountName}
                        onChange={e => setFormData(prev => ({ ...prev, bankAccountName: e.target.value.toUpperCase() }))}
                      />
                    </div>
                  </div>

                  <div className="pt-4 space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed font-bold text-amber-200/80 uppercase tracking-tight">
                        {lang === "vi" 
                          ? "Hãy kiểm tra kỹ số tài khoản và ngân hàng. Thông tin sai sẽ dẫn đến việc bạn không thể nhận được tiền từ bạn bè."
                          : "Please double-check your account number and bank. Incorrect info will prevent you from receiving payments."}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={saving || !!validationError}
                        onClick={handleSave}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        {lang === "vi" ? "Lưu thông tin" : "Save Changes"}
                      </motion.button>

                      {formData.bankAccountNumber && (
                        <button
                          onClick={() => setIsEditing(false)}
                          className="w-full py-3 text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Quay lại
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
