"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, CreditCard, Loader2, ArrowUpRight, ArrowDownLeft, MapPin } from "lucide-react";
import { useSession } from "next-auth/react";

interface Transaction {
  id: string;
  amount: number;
  status: string;
  updatedAt: string;
  payerId: string;
  receiverId: string;
  trip: { title: string };
  payer: { name: string; image?: string };
  receiver: { name: string; image?: string };
}

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionHistoryModal = ({ isOpen, onClose }: TransactionHistoryModalProps) => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen && session?.user?.id) {
      fetchTransactions();
    }
  }, [isOpen, session]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/transactions");
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const data = await res.json();
      setTransactions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
        className="relative w-full max-w-lg bg-[#0a1128] border border-white/10 rounded-[32px] shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/20 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <CreditCard className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight leading-none mb-1">
                Lịch sử giao dịch
              </h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Đã thanh toán (Split-Bill)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
             <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Đang tải lịch sử...</p>
             </div>
          ) : transactions.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                 <CreditCard className="w-8 h-8 text-slate-600" />
               </div>
               <p className="text-white font-bold mb-1">Chưa có giao dịch nào</p>
               <p className="text-sm text-slate-500">Các khoản tiền bạn đã thanh toán hoặc nhận được sẽ hiển thị ở đây.</p>
            </div>
          ) : (
            <div className="space-y-4">
               {transactions.map((t) => {
                 const isPayer = t.payerId === session?.user?.id;
                 const otherPerson = isPayer ? t.receiver.name : t.payer.name;
                 
                 return (
                   <div key={t.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPayer ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                             {isPayer ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                           </div>
                           <div>
                             <p className="text-sm font-bold text-white leading-none mb-1">
                               {isPayer ? `Chuyển cho ${otherPerson}` : `Nhận từ ${otherPerson}`}
                             </p>
                             <p className="text-[10px] text-slate-400 font-medium">{formatDate(t.updatedAt)}</p>
                           </div>
                         </div>
                         <div className="text-right">
                           <p className={`text-base font-black ${isPayer ? 'text-rose-400' : 'text-emerald-400'}`}>
                             {isPayer ? '-' : '+'}{formatCurrency(t.amount)}
                           </p>
                           <p className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-wider">Thành công</p>
                         </div>
                      </div>
                      
                      <div className="bg-slate-950/50 rounded-xl p-3 flex items-center gap-2 border border-white/5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-xs font-bold text-indigo-300/80 truncate">Hành trình: {t.trip.title}</span>
                      </div>
                   </div>
                 );
               })}
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
