"use client";

import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { Map, Plane, Wallet, Sparkles, Clock, ArrowRight, MapPin, Plus, Loader2, X, Search, Trash2, ChevronRight, Tag, TrendingUp, AlertCircle, Bike } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchPromptChips } from "@/components/itinerary/SearchPromptChips";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

import { useToast } from "@/components/providers/ToastProvider";
import { PremiumModal } from "@/components/ui/PremiumModal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
  const { lang, t } = useLang();
  const { data: session } = useSession();
  const dashT = t.dashboard;
  const commonT = t.common;
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: "", city: "" });
  const [error, setError] = useState("");
  const { showToast } = useToast();
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; tripId: string | null }>({
    isOpen: false,
    tripId: null,
  });

  const { data: trips, mutate: mutateTrips, isLoading: isTripsLoading } = useSWR("/api/trips", fetcher);
  const { data: expenses, isLoading: isExpensesLoading } = useSWR("/api/expenses", fetcher);

  const COLORS = ['#22d3ee', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
  const chartData = Array.isArray(expenses) ? expenses.map((exp: any) => ({
    name: exp.title,
    value: exp.totalAmount
  })) : [];

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      setError(dashT.errorRequired);
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
      showToast(lang === "vi" ? "Đã tạo chuyến đi mới!" : "New trip created!", "success");
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirm = (e: React.MouseEvent, tripId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, tripId });
  };

  const handleDeleteTrip = async () => {
    if (!deleteConfirm.tripId) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${deleteConfirm.tripId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete trip");
      await mutateTrips();
      showToast(lang === "vi" ? "Đã xóa chuyến đi thành công" : "Trip deleted successfully", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
      setDeleteConfirm({ isOpen: false, tripId: null });
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-purple-500/5 blur-[100px] rounded-full" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-black text-foreground tracking-tight">{dashT.welcome}</h1>
          <p className="text-slate-500 font-medium mt-1 mb-8">
            {dashT.subtitle} <span className="text-indigo-400">{session?.user?.name || commonT.explorer}</span>
          </p>

          <div className="max-w-3xl">
            <div className="relative group mb-4">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (prompt.trim()) router.push(`/itinerary?q=${encodeURIComponent(prompt)}`);
                  }
                }}
                placeholder={lang === "vi" ? "Bạn muốn đi đâu tiếp theo?" : "Where to go next?"}
                className="relative w-full pl-5 pr-14 py-4 bg-slate-900/80 border border-white/10 rounded-2xl text-sm placeholder:text-slate-500 focus:bg-slate-900 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-2xl text-white"
              />
              <button
                disabled={!prompt.trim()}
                onClick={() => {
                  if (prompt.trim()) router.push(`/itinerary?q=${encodeURIComponent(prompt)}`);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg disabled:opacity-30 disabled:scale-100 transition-all flex items-center justify-center hover:bg-indigo-500 hover:shadow-indigo-500/25 active:scale-95"
              >
                <Search className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>
            <SearchPromptChips 
              onSelect={(text) => router.push(`/itinerary?q=${encodeURIComponent(text)}`)} 
            />
          </div>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Upcoming Trips Panel */}
          <motion.div variants={itemVariants} className="lg:col-span-2 bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2 mb-1">
                  <Plane className="w-4 h-4" />
                  {dashT.upcomingTrips}
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{trips?.length || 0} {lang === "vi" ? "Hành trình" : "Trips"}</p>
              </div>
              <div className="flex items-center gap-3">
                <motion.button 
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(79, 70, 229, 1)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <Plus className="w-4 h-4" strokeWidth={3} />
                  {lang === "vi" ? "Tạo chuyến đi" : "Add Trip"}
                </motion.button>
              </div>
            </div>
            
            {isTripsLoading ? (
              <div className="p-6 flex justify-center items-center h-40">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
              </div>
            ) : trips && trips.length > 0 ? (
               <div className="p-6 grid grid-cols-1 gap-6">
                 {trips.map((trip: any) => (
                   <motion.div 
                     whileHover={{ y: -6, scale: 1.01 }}
                     key={trip.id} 
                     className="relative bg-slate-950/60 border border-white/5 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-8 transition-all group cursor-pointer overflow-hidden backdrop-blur-xl shadow-2xl"
                   >
                     {/* Neon Glow Border Effect */}
                     <div className="absolute inset-0 border border-white/10 rounded-[2.5rem] group-hover:border-indigo-500/50 transition-all duration-500" />
                     <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500/20 via-transparent to-cyan-500/20 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />

                     {/* Ambient Mesh Background */}
                     <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/3 opacity-0 group-hover:opacity-100 transition-all duration-700" />

                     {/* Route Visualization */}
                     <div className="flex-1 w-full flex items-center justify-between gap-4 max-w-sm relative z-10">
                       <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-lg group-hover:bg-indigo-500/10 group-hover:border-indigo-500/40 group-hover:shadow-indigo-500/20 transition-all duration-300">
                            <MapPin className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                          </div>
                          <span className="text-[10px] font-black text-slate-600 mt-2 uppercase tracking-tighter">{lang === "vi" ? "Khởi hành" : "Depart"}</span>
                       </div>
                       
                       <div className="flex-1 flex flex-col items-center justify-center relative px-4">
                          <div className="w-full h-8 flex items-center relative overflow-hidden">
                            <div className="absolute left-1 right-1 h-[2px] bg-gradient-to-r from-indigo-500/20 via-indigo-500/40 to-cyan-500/20 rounded-full" />
                            <motion.div
                              animate={{ x: ["-15%", "95%"] }}
                              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                              className="absolute inset-0 flex items-center gap-1">
                               {[1, 2, 3].map((i) => (
                                 <ChevronRight key={i} className="w-3 h-3 text-cyan-400 opacity-40" strokeWidth={4} />
                               ))}
                               <Bike className="w-5 h-5 text-cyan-400 fill-cyan-400/20 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                            </motion.div>
                          </div>
                         <span className="text-[11px] font-bold text-indigo-400/80 mt-3 flex items-center gap-1.5 uppercase tracking-wide">
                           <Sparkles className="w-3 h-3" />
                           {lang === "vi" ? "Đang phượt" : "Phượt Core"}
                         </span>
                       </div>

                       <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-lg group-hover:bg-cyan-500/10 group-hover:border-cyan-500/40 group-hover:shadow-cyan-500/20 transition-all duration-300">
                            <MapPin className="w-5 h-5 text-cyan-400" />
                          </div>
                          <span className="text-[10px] font-black text-white mt-2 uppercase tracking-tighter truncate max-w-[100px] text-center">{trip.city || "Unknown"}</span>
                       </div>
                     </div>

                     {/* Trip Info Details */}
                     <div className="flex-1 w-full relative z-10">
                       <div className="flex items-center gap-2 mb-1">
                         <h3 className="text-lg font-black text-white tracking-tight leading-none">{trip.title}</h3>
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                       </div>
                       <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                         <Clock className="w-3 h-3" />
                         {new Date(trip.createdAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                       </p>
                     </div>

                     <div className="flex items-center gap-3 relative z-10">
                       <motion.button
                          whileHover={{ scale: 1.1, backgroundColor: 'rgba(244, 63, 94, 0.1)' }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => openDeleteConfirm(e, trip.id)}
                          className="p-3 rounded-2xl bg-white/5 border border-white/5 text-slate-500 hover:text-rose-400 transition-all"
                       >
                          <Trash2 className="w-5 h-5" />
                       </motion.button>
                       <Link href={`/itinerary?tripId=${trip.id}`} className="p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all">
                          <ChevronRight className="w-6 h-6" strokeWidth={3} />
                       </Link>
                     </div>
                   </motion.div>
                 ))}
               </div>
            ) : (
              <div className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                  <Map className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-400 mb-4">{dashT.noTrips}</p>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20"
                >
                  {dashT.createTrip}
                </motion.button>
              </div>
            )}
          </motion.div>

          {/* Right Column: AI & Expenses */}
          <div className="grid grid-cols-1 gap-6">
            {/* Expense Analytics */}
            <motion.div variants={itemVariants} className="bg-slate-900/40 border border-border rounded-[2rem] overflow-hidden shadow-soft relative flex flex-col min-h-[250px]">
              <div className="p-6 border-b border-border">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  {dashT.expenseAnalytics}
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
                    <p className="text-sm">{dashT.noExpenses}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Recent Expenses */}
            <motion.div variants={itemVariants} className="bg-slate-900/40 border border-border rounded-[2rem] overflow-hidden shadow-soft">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-3">
                  <Wallet className="w-4 h-4 text-indigo-400" />
                  {dashT.recentExpenses}
                </h2>
                <Link href="/split-bill" className="text-slate-500 hover:text-foreground transition-all">
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              
              {isExpensesLoading ? (
                <div className="p-6 flex justify-center items-center h-full">
                  <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                </div>
              ) : expenses && expenses.length > 0 ? (
                <div className="flex flex-col dividing-y divide-white/5">
                  {expenses.slice(0, 3).map((exp: any) => (
                    <div key={exp.id} className="p-5 flex justify-between items-center hover:bg-slate-950/40 transition-colors border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-bold text-foreground">{exp.title}</p>
                        <p className="text-[10px] text-slate-500 font-mono tracking-tighter mt-0.5">{new Date(exp.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm font-black text-indigo-400">{exp.totalAmount.toLocaleString()} VND</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 flex flex-col items-center justify-center min-h-[160px]">
                  <Clock className="w-8 h-8 text-gray-500 mb-3" />
                  <p className="text-sm text-gray-400 text-center">{dashT.noExpenses}</p>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Create Trip Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#020817]/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-lg bg-[#0a1128]/90 border border-white/10 rounded-[3rem] shadow-[0_0_100px_rgba(79,70,229,0.2)] overflow-hidden"
            >
              {/* Top Accent Bar */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-500" />
              
              <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center relative">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white mb-1">{dashT.createTripTitle}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                    {lang === "vi" ? "Bắt đầu hành trình mới cùng AI" : "Start your AI voyage"}
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-2.5 rounded-2xl bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateTrip}>
                <div className="p-10 space-y-8">
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      className="text-xs text-rose-400 bg-rose-400/5 p-4 rounded-2xl border border-rose-400/10 font-bold flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </motion.p>
                  )}
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 ml-1 flex items-center gap-2">
                       <Tag className="w-3.5 h-3.5" />
                       {dashT.tripName}
                    </label>
                    <div className="relative group/input">
                      <input 
                        autoFocus required 
                        value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})} 
                        type="text" 
                        placeholder={dashT.placeholderTripName} 
                        className="w-full pl-6 pr-6 py-4.5 bg-slate-950/50 border border-white/5 rounded-[1.5rem] text-white focus:bg-slate-950 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 focus:outline-none transition-all placeholder:text-slate-700 text-sm font-medium shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 ml-1 flex items-center gap-2">
                         <MapPin className="w-3.5 h-3.5" />
                         {dashT.tripCity}
                      </label>
                      <input 
                        value={formData.city} 
                        onChange={e => setFormData({...formData, city: e.target.value})} 
                        type="text" 
                        placeholder={dashT.placeholderCity} 
                        className="w-full pl-6 pr-6 py-4.5 bg-slate-950/50 border border-white/5 rounded-[1.5rem] text-white focus:bg-slate-950 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/5 focus:outline-none transition-all placeholder:text-slate-700 text-sm font-medium shadow-inner"
                      />
                    </div>

                    {/* Suggestions Chips */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-[9px] font-bold text-slate-600 uppercase pt-2 pr-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {lang === "vi" ? "Gợi ý:" : "Hot:"}
                      </span>
                      {["Singapore", "Đà Lạt", "Phú Quốc", "Tokyo", "Seoul"].map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => setFormData({ ...formData, city: city })}
                          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                            formData.city === city 
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20" 
                              : "bg-white/5 border-white/5 text-slate-500 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-10 py-8 border-t border-white/5 bg-slate-950/40 flex flex-col sm:flex-row justify-between items-center gap-6">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {lang === "vi" ? "Hủy bỏ" : "Go Back"}
                  </button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmitting} 
                    type="submit" 
                    className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-xs font-black uppercase tracking-[0.2em] rounded-[1.2rem] shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-3 relative overflow-hidden group/save"
                  >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/save:translate-y-0 transition-transform duration-300" />
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 fill-white/20" />}
                    <span className="relative z-10">{lang === "vi" ? "Bắt đầu hành trình" : "Launch Voyage"}</span>
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PremiumModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, tripId: null })}
        onConfirm={handleDeleteTrip}
        type="danger"
        loading={isSubmitting}
        title={lang === "vi" ? "Xác nhận xóa" : "Confirm Deletion"}
        message={lang === "vi" 
          ? "Bạn có chắc chắn muốn xóa chuyến đi này không? Mọi dữ liệu liên quan sẽ mất sạch và không thể khôi phục." 
          : "Are you sure you want to delete this trip? All related data will be permanently removed and cannot be recovered."}
        confirmText={lang === "vi" ? "Xóa ngay" : "Delete Now"}
      />
    </div>
  );
}
