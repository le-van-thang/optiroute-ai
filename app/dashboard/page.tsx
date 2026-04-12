"use client";

import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { Map, Plane, Wallet, Sparkles, Clock, ArrowRight, MapPin, Plus, Loader2, X, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchPromptChips } from "@/components/itinerary/SearchPromptChips";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
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
                className="w-full pl-5 pr-14 py-3.5 bg-slate-900/50 border border-white/10 rounded-2xl text-sm placeholder:text-slate-500 focus:bg-slate-900/80 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner text-white"
              />
              <button
                disabled={!prompt.trim()}
                onClick={() => {
                  if (prompt.trim()) router.push(`/itinerary?q=${encodeURIComponent(prompt)}`);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-xl shadow-lg disabled:opacity-30 disabled:scale-100 transition-all flex items-center justify-center hover:bg-indigo-500"
              >
                <Search className="w-4 h-4" strokeWidth={2} />
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
          <motion.div variants={itemVariants} className="lg:col-span-2 bg-slate-900/40 border border-border rounded-[2rem] overflow-hidden shadow-soft">
            <div className="p-8 border-b border-border flex justify-between items-center">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-3">
                <Plane className="w-4 h-4 text-indigo-400" />
                {dashT.upcomingTrips}
              </h2>
              <div className="flex items-center gap-4">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center justify-center p-2 rounded-xl bg-slate-900 border border-border text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </motion.button>
                <Link href="/itinerary" className="text-xs font-bold text-slate-400 hover:text-foreground transition-colors flex items-center gap-1 group">
                  {commonT.viewAll}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
            
            {isTripsLoading ? (
              <div className="p-6 flex justify-center items-center h-40">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
              </div>
            ) : trips && trips.length > 0 ? (
               <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                 {trips.map((trip: any) => (
                   <motion.div 
                     whileHover={{ scale: 1.02, y: -2 }}
                     whileTap={{ scale: 0.98 }}
                     key={trip.id} 
                     className="bg-slate-950/40 border border-border rounded-2xl p-5 flex flex-col hover:border-indigo-500/30 transition-all group cursor-pointer"
                   >
                     <h3 className="text-md font-bold text-foreground mb-1 transition-colors truncate">{trip.title}</h3>
                     <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5 font-medium"><MapPin className="w-3.5 h-3.5"/> {trip.city || "Unknown"}</p>
                     <div className="mt-auto flex justify-between items-center">
                       <span className="text-[10px] font-black uppercase tracking-tight text-indigo-400 bg-indigo-400/5 px-2 py-0.5 rounded-md border border-indigo-400/10">{commonT.planning}</span>
                       <span className="text-[10px] font-medium text-slate-600 font-mono tracking-tighter">{new Date(trip.createdAt).toLocaleDateString()}</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#020817]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-slate-900 border border-border rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-slate-950/50">
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground">{dashT.createTripTitle}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-foreground transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateTrip}>
                <div className="p-8 space-y-6">
                  {error && <p className="text-xs text-rose-400 bg-rose-400/5 p-3 rounded-xl border border-rose-400/10 font-medium">{error}</p>}
                  
                   <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{dashT.tripName}</label>
                    <input autoFocus required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} type="text" placeholder={dashT.placeholderTripName} className="w-full px-5 py-3.5 bg-slate-950 border border-border rounded-2xl text-foreground focus:ring-1 focus:ring-indigo-500/50 focus:outline-none transition-all placeholder:text-slate-700 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{dashT.tripCity}</label>
                    <input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} type="text" placeholder={dashT.placeholderCity} className="w-full px-5 py-3.5 bg-slate-950 border border-border rounded-2xl text-foreground focus:ring-1 focus:ring-indigo-500/50 focus:outline-none transition-all placeholder:text-slate-700 text-sm" />
                  </div>
                </div>

                <div className="px-8 py-6 border-t border-border bg-slate-950/50 flex justify-end gap-5">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-xs font-black uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors">
                    {dashT.cancel}
                  </button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }}
                    disabled={isSubmitting} 
                    type="submit" 
                    className="px-6 py-3 bg-foreground text-background text-xs font-black uppercase tracking-widest rounded-xl shadow-soft disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                    {dashT.saveTrip}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
