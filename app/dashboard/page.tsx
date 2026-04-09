"use client";

import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { Map, Plane, Wallet, Sparkles, Clock, ArrowRight, MapPin, Plus, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const translations = {
  vi: {
    welcome: "Bảng điều khiển",
    subtitle: "Chào mừng trở lại, ",
    upcomingTrips: "Chuyến đi sắp tới",
    recentExpenses: "Chi phí gần đây",
    expenseAnalytics: "Phân tích chi tiêu",
    aiSuggestions: "Gợi ý từ AI",
    viewAll: "Xem tất cả",
    noTrips: "Chưa có chuyến đi nào.",
    createTrip: "Tạo chuyến đi đầu tiên",
    noExpenses: "Chưa có khoản chi nào được ghi nhận.",
    addExpense: "Thêm khoản chi",
    createTripTitle: "Khởi tạo chuyến đi mới",
    tripName: "Tên chuyến đi",
    tripCity: "Thành phố / Điểm đến",
    saveTrip: "Lưu chuyến đi",
    cancel: "Hủy",
    errorRequired: "Vui lòng nhập tên chuyến đi",
    aiTip1: "Nhật Bản đang bước vào mùa thu với lá phong đỏ rực. Chi phí máy bay đang giảm 15%!",
    aiTip2: "Bạn tiết kiệm được 20% nếu gom chi phí ăn ở chung với nhóm tại Đà Lạt.",
  },
  en: {
    welcome: "Dashboard",
    subtitle: "Welcome back, ",
    upcomingTrips: "Upcoming Trips",
    recentExpenses: "Recent Expenses",
    expenseAnalytics: "Expense Analytics",
    aiSuggestions: "AI Suggestions",
    viewAll: "View all",
    noTrips: "No upcoming trips.",
    createTrip: "Create first trip",
    noExpenses: "No expenses recorded yet.",
    addExpense: "Add expense",
    createTripTitle: "Create New Trip",
    tripName: "Trip Title",
    tripCity: "City / Destination",
    saveTrip: "Save Trip",
    cancel: "Cancel",
    errorRequired: "Trip title is required",
    aiTip1: "Japan is entering autumn with vibrant red leaves. Flights are currently 15% off!",
    aiTip2: "You can save 20% by pooling accommodation costs with your group in Da Lat.",
  }
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function DashboardPage() {
  const { lang } = useLang();
  const { data: session } = useSession();
  const t = translations[lang];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: "", city: "" });
  const [error, setError] = useState("");

  const { data: trips, mutate: mutateTrips, isLoading: isTripsLoading } = useSWR("/api/trips", fetcher);
  const { data: expenses, isLoading: isExpensesLoading } = useSWR("/api/expenses", fetcher);

  const COLORS = ['#22d3ee', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
  const chartData = expenses ? expenses.map((exp: any) => ({
    name: exp.title,
    value: exp.totalAmount
  })) : [];

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      setError(t.errorRequired);
      return;
    }
    
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create trip");
      }

      await mutateTrips(); // Automatically update UI
      setIsModalOpen(false);
      setFormData({ title: "", city: "" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white tracking-tight">{t.welcome}</h1>
          <p className="text-gray-400 mt-1">
            {t.subtitle} <span className="text-cyan-400 font-medium">{session?.user?.name || "Explorer"}</span>
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Upcoming Trips Panel */}
          <motion.div variants={itemVariants} className="lg:col-span-2 bg-[#0a1128] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plane className="w-5 h-5 text-emerald-400" />
                {t.upcomingTrips}
              </h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="hidden sm:flex items-center justify-center h-8 w-8 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <Link href="/itinerary" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 group">
                  {t.viewAll}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
            
            {isTripsLoading ? (
              <div className="p-6 flex justify-center items-center h-40">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
              </div>
            ) : trips && trips.length > 0 ? (
               <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                 {trips.map((trip: any) => (
                   <div key={trip.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col hover:border-cyan-500/30 transition-colors group cursor-pointer">
                     <h3 className="text-lg font-medium text-white mb-1 group-hover:text-cyan-400 transition-colors truncate">{trip.title}</h3>
                     <p className="text-sm text-gray-400 mb-3 flex items-center gap-1"><MapPin className="w-3 h-3"/> {trip.city || "Unknown Destination"}</p>
                     <div className="mt-auto flex justify-between items-center">
                       <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">Planning</span>
                       <span className="text-xs text-gray-500">{new Date(trip.createdAt).toLocaleDateString()}</span>
                     </div>
                   </div>
                 ))}
               </div>
            ) : (
              <div className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                  <Map className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-400 mb-4">{t.noTrips}</p>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20"
                >
                  {t.createTrip}
                </motion.button>
              </div>
            )}
          </motion.div>

          {/* Right Column: AI & Expenses */}
          <div className="grid grid-cols-1 gap-6">
            {/* Expense Analytics */}
            <motion.div variants={itemVariants} className="bg-gradient-to-br from-[#0a1128] to-[#121b38] rounded-2xl border border-white/5 overflow-hidden shadow-xl relative group min-h-[250px] flex flex-col">
              <div className="p-5 border-b border-white/5">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  {t.expenseAnalytics}
                </h2>
              </div>
              <div className="flex-1 p-4 relative">
                {isExpensesLoading ? (
                  <div className="absolute inset-0 flex justify-center items-center">
                    <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                    <PieChart>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#020817', borderColor: '#ffffff20', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: any) => `${Number(value).toLocaleString()} VND`}
                      />
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-6">
                    <Wallet className="w-8 h-8 mb-3 opacity-20" />
                    <p className="text-sm">{t.noExpenses}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Recent Expenses */}
            <motion.div variants={itemVariants} className="bg-[#0a1128] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
              <div className="p-5 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-400" />
                  {t.recentExpenses}
                </h2>
                <Link href="/split-bill" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors group">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              
              {isExpensesLoading ? (
                <div className="p-6 flex justify-center items-center h-full">
                  <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                </div>
              ) : expenses && expenses.length > 0 ? (
                <div className="flex flex-col dividing-y divide-white/5">
                  {expenses.slice(0, 3).map((exp: any) => (
                    <div key={exp.id} className="p-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors">
                      <div>
                        <p className="text-sm font-medium text-white">{exp.title}</p>
                        <p className="text-xs text-gray-500">{new Date(exp.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm font-bold text-amber-400">{exp.totalAmount.toLocaleString()} VND</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 flex flex-col items-center justify-center min-h-[160px]">
                  <Clock className="w-8 h-8 text-gray-500 mb-3" />
                  <p className="text-sm text-gray-400 text-center">{t.noExpenses}</p>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Create Trip Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                <h3 className="text-lg font-semibold text-white">{t.createTripTitle}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateTrip}>
                <div className="p-6 space-y-4">
                  {error && <p className="text-sm text-rose-400 bg-rose-400/10 p-2 rounded-lg border border-rose-400/20">{error}</p>}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.tripName} <span className="text-rose-500">*</span></label>
                    <input autoFocus required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} type="text" placeholder="Hanoi Adventure..." className="w-full px-3 py-2 bg-[#020817] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all placeholder:text-gray-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.tripCity}</label>
                    <input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} type="text" placeholder="Hanoi" className="w-full px-3 py-2 bg-[#020817] border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all placeholder:text-gray-600" />
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-white/5 bg-[#020817]/50 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                    {t.cancel}
                  </button>
                  <button disabled={isSubmitting} type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 disabled:hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {t.saveTrip}
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
