"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { Wallet, Plus, Users, Receipt, ArrowRightLeft, X, Loader2, Clock, BarChart as BarChartIcon } from "lucide-react";
import useSWR from "swr";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const translations = {
  vi: {
    title: "Split-Bill Ledger",
    subtitle: "Quản lý và chia sẻ chi phí minh bạch.",
    totalExpenses: "Tổng chi tiêu",
    myShare: "Phần của tôi",
    addExpense: "Thêm chi phí",
    recentTransactions: "Giao dịch gần đây",
    noTransactions: "Chưa có giao dịch nào.",
    settleUp: "Thanh toán",
    modalTitle: "Thêm khoản chi mới",
    descLabel: "Mô tả / Tên khoản chi",
    descPlaceholder: "Ví dụ: Tiền taxi sân bay...",
    amountLabel: "Số tiền (VND)",
    paidByLabel: "Người trả",
    cancelItem: "Hủy",
    saveItem: "Lưu khoản chi",
    meCurrentUser: "Tôi (Người dùng hiện tại)",
    paidByYou: "Bạn đã trả",
    errorRequired: "Tiêu đề và Số tiền là bắt buộc",
    expenseChart: "Biểu đồ phân bổ"
  },
  en: {
    title: "Split-Bill Ledger",
    subtitle: "Transparent expense tracking and splitting.",
    totalExpenses: "Total Expenses",
    myShare: "My Share",
    addExpense: "Add Expense",
    recentTransactions: "Recent Transactions",
    noTransactions: "No transactions yet.",
    settleUp: "Settle Up",
    modalTitle: "Add New Expense",
    descLabel: "Description",
    descPlaceholder: "E.g., Airport Taxi...",
    amountLabel: "Amount (VND)",
    paidByLabel: "Paid By",
    cancelItem: "Cancel",
    saveItem: "Save Expense",
    meCurrentUser: "Me (Current User)",
    paidByYou: "Paid by You",
    errorRequired: "Title and Amount are required",
    expenseChart: "Expense Distribution"
  }
};

export default function SplitBillPage() {
  const { lang } = useLang();
  const t = translations[lang];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: "", totalAmount: "" });
  const [error, setError] = useState("");

  const { data: expenses, mutate: mutateExpenses, isLoading } = useSWR("/api/expenses", fetcher);

  // Compute stats
  const totalExpenses = expenses ? expenses.reduce((acc: number, exp: any) => acc + exp.totalAmount, 0) : 0;
  // Currently simulating self share as 100% since no other users exist
  const myShare = totalExpenses;

  // Prepare Chart Data
  const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
  const chartData = expenses 
    ? expenses.slice(0, 5).map((exp: any) => ({
        name: exp.title.length > 10 ? exp.title.substring(0, 10) + '...' : exp.title,
        amount: exp.totalAmount
      }))
    : [];

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.totalAmount) {
      setError(t.errorRequired);
      return;
    }
    
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create expense");
      }

      await mutateExpenses(); // Autoupdate UI without F5
      setIsModalOpen(false);
      setFormData({ title: "", totalAmount: "" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] pt-[72px] pb-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <Wallet className="w-8 h-8 text-cyan-500" />
              {t.title}
            </h1>
            <p className="text-gray-400 mt-1">{t.subtitle}</p>
          </motion.div>
          
          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t.addExpense}
          </motion.button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-[#0a1128] to-[#121b38] rounded-2xl border border-white/5 p-6 shadow-xl"
          >
            <div className="flex items-center gap-3 text-gray-400 mb-2">
              <Receipt className="w-5 h-5 text-rose-400" />
              <span className="font-medium text-sm">{t.totalExpenses}</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalExpenses.toLocaleString()} <span className="text-lg text-gray-500 font-medium">VND</span></p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-[#0a1128] to-[#121b38] rounded-2xl border border-white/5 p-6 shadow-xl"
          >
            <div className="flex items-center gap-3 text-gray-400 mb-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span className="font-medium text-sm">{t.myShare}</span>
            </div>
            <p className="text-3xl font-bold text-white">{myShare.toLocaleString()} <span className="text-lg text-gray-500 font-medium">VND</span></p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-[#0a1128] rounded-2xl border border-cyan-500/20 p-6 flex flex-col justify-center items-center shadow-xl group hover:border-cyan-500/50 transition-colors cursor-pointer"
          >
             <ArrowRightLeft className="w-8 h-8 text-cyan-500 mb-2 group-hover:scale-110 transition-transform" />
             <span className="font-medium text-cyan-400">{t.settleUp}</span>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transactions List */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-[#0a1128] rounded-2xl border border-white/5 overflow-hidden shadow-xl min-h-[300px] flex flex-col"
          >
            <div className="p-5 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">{t.recentTransactions}</h2>
              {isLoading && <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />}
            </div>
            
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
                 <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
              </div>
            ) : expenses && expenses.length > 0 ? (
              <div className="flex flex-col flex-1 divide-y divide-white/5 overflow-y-auto max-h-[500px]">
                {expenses.map((exp: any) => (
                  <div key={exp.id} className="p-5 flex justify-between items-center hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                         <Receipt className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-base font-medium text-white">{exp.title}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(exp.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-rose-400">-{exp.totalAmount.toLocaleString()} VND</span>
                      <p className="text-xs text-emerald-400 mt-1">{t.paidByYou}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
                <Receipt className="w-12 h-12 mb-3 opacity-20" />
                <p>{t.noTransactions}</p>
              </div>
            )}
          </motion.div>

          {/* Bar Chart Overview */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="lg:col-span-1 bg-gradient-to-br from-[#0a1128] to-[#121b38] rounded-2xl border border-white/5 overflow-hidden shadow-xl min-h-[300px] flex flex-col"
          >
            <div className="p-5 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChartIcon className="w-5 h-5 text-cyan-400" />
                {t.expenseChart}
              </h2>
            </div>
            <div className="flex-1 p-5 min-h-[250px] relative">
              {isLoading ? (
                  <div className="absolute inset-0 flex justify-center items-center">
                    <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                  </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val: any) => `${val / 1000}k`} />
                    <RechartsTooltip 
                      cursor={{fill: '#ffffff05'}}
                      contentStyle={{ backgroundColor: '#020817', borderColor: '#ffffff20', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: any) => [`${Number(value).toLocaleString()} VND`, "Amount"]}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                   <BarChartIcon className="w-12 h-12 mb-3 opacity-20" />
                   <p className="text-sm">{t.noTransactions}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 px-4 sm:px-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#020817]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="relative w-full max-w-md bg-[#0a1128] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-[#020817]/50">
                <h3 className="text-lg font-semibold text-white">{t.modalTitle}</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSaveExpense}>
                <div className="p-6 space-y-4">
                  {error && <p className="text-sm text-rose-400 bg-rose-400/10 p-2 rounded-lg border border-rose-400/20">{error}</p>}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.descLabel}</label>
                    <input autoFocus required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} type="text" placeholder={t.descPlaceholder} className="w-full px-3 py-2 bg-[#020817] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.amountLabel}</label>
                    <input required value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: e.target.value})} type="number" placeholder="0" className="w-full px-3 py-2 bg-[#020817] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.paidByLabel}</label>
                    <select className="w-full px-3 py-2 bg-[#020817] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all appearance-none cursor-pointer">
                      <option>{t.meCurrentUser}</option>
                    </select>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-white/5 bg-[#020817]/50 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    {t.cancelItem}
                  </button>
                  <button disabled={isSubmitting} type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-70 disabled:hover:bg-cyan-600 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-cyan-500/20 flex items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {t.saveItem}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
