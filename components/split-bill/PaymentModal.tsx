"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Check, Landmark, CreditCard, User, 
  Loader2, ShieldCheck, Copy, ImageIcon, 
  ArrowRight, QrCode
} from "lucide-react";
import { useLang } from "@/components/providers/LangProvider";
import { useToast } from "@/components/providers/ToastProvider";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiver: {
    id: string;
    name: string;
    bankCode?: string;
    bankAccount?: string;
    bankAccountName?: string;
  };
  amount: number;
  tripId: string;
  onSuccess: (newSettle: any) => void;
}

export const PaymentModal = ({ isOpen, onClose, receiver, amount, tripId, onSuccess }: PaymentModalProps) => {
  const { lang } = useLang();
  const { showToast } = useToast();
  const [isReporting, setIsReporting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  const qrUrl = `https://img.vietqr.io/image/${receiver.bankCode}-${receiver.bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(`OPTIRoute SplitBill ${tripId}`)}&accountName=${encodeURIComponent(receiver.bankAccountName || "")}`;

  const handleCopySTK = () => {
    if (receiver.bankAccount) {
      navigator.clipboard.writeText(receiver.bankAccount);
      showToast(lang === "vi" ? "Đã sao chép số tài khoản" : "Account number copied", "success");
    }
  };

  const handleReportPayment = async () => {
    setIsReporting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: receiver.id,
          amount: Number(amount),
        }),
      });
      if (!res.ok) throw new Error("Failed to report payment");
      const newSettle = await res.json();
      onSuccess(newSettle);
      onClose();
      showToast(lang === "vi" ? "Đã gửi thông báo chuyển khoản!" : "Payment reported!", "success");
    } catch (e) {
      console.error(e);
      showToast(lang === "vi" ? "Lỗi khi gửi báo cáo" : "Failed to report", "error");
    } finally {
      setIsReporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden"
      >
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5">
                <Landmark className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  {lang === "vi" ? "Thanh toán" : "Payment"}
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  {lang === "vi" ? "Quét QR hoặc Chuyển khoản" : "Scan QR or Transfer"}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="text-center space-y-0.5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                {lang === "vi" ? "Số tiền nộp" : "Amount to pay"}
              </span>
              <div className="text-3xl font-black text-white tabular-nums tracking-tighter">
                {amount.toLocaleString()} <span className="text-emerald-500 text-xl">₫</span>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-4 bg-emerald-500/15 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-white p-2.5 rounded-2xl shadow-xl">
                <img 
                  src={qrUrl} 
                  alt="VietQR" 
                  className="w-44 h-44 object-contain"
                />
              </div>
            </div>
            
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-white/5">
                <div className="flex flex-col items-start px-1">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                    {lang === "vi" ? "Số tài khoản" : "Account number"}
                  </span>
                  <span className="text-xs font-bold text-white tabular-nums tracking-wider">{receiver.bankAccount}</span>
                </div>
                <button 
                  onClick={handleCopySTK}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-black uppercase transition-all"
                >
                  <Copy className="w-2.5 h-2.5" />
                  {lang === "vi" ? "Copy" : "Copy"}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-white/5">
                <div className="flex flex-col items-start px-1 text-left">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                    {lang === "vi" ? "Ngân hàng" : "Bank"}
                  </span>
                  <span className="text-[11px] font-bold text-white uppercase italic">{receiver.bankCode}</span>
                </div>
                <div className="flex flex-col items-end px-1">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                    {lang === "vi" ? "Chủ tài khoản" : "Account name"}
                  </span>
                  <span className="text-[11px] font-bold text-white truncate max-w-[150px]">{receiver.bankAccountName || "..."}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest italic">
                {lang === "vi" ? "Nhấn báo sau khi chuyển" : "Report after transfer"}
              </span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <button
              onClick={handleReportPayment}
              disabled={isReporting}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 transition-all flex flex-col items-center justify-center gap-0.5 group"
            >
              <div className="flex items-center gap-2">
                {isReporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                <span>{lang === "vi" ? "Tôi đã chuyển khoản" : "I've transferred"}</span>
              </div>
              <span className="text-[8px] text-white/50 font-bold normal-case tracking-normal">
                {lang === "vi" ? `Thông báo gửi tới ${receiver.name}` : `Notify ${receiver.name}`}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
