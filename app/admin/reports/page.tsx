"use client";

import { useEffect, useState } from "react";
import { 
  Bell, CheckCircle2, XCircle, Clock, 
  Search, ShieldAlert, MessageCircle, AlertTriangle,
  Loader2, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReportData {
  id: string;
  reason: string;
  content: string | null;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  reporter: { name: string; email: string };
  reported: { name: string; email: string };
  conversationId: string | null;
}

export default function AdminReports() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"PENDING" | "ALL">("PENDING");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/reports");
      if (res.ok) setReports(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleAction = async (reportId: string, status: string) => {
    setIsProcessing(reportId);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, status })
      });
      if (res.ok) fetchReports();
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredReports = activeTab === "PENDING" ? reports.filter(r => r.status === "PENDING") : reports;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Báo cáo Vi phạm</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Xử lý {reports.filter(r => r.status === 'PENDING').length} khiếu nại đang chờ.</p>
        </div>
        
        <div className="flex gap-2 bg-slate-900/40 p-1.5 rounded-2xl border border-white/5">
           <button 
             onClick={() => setActiveTab("PENDING")}
             className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'PENDING' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
           >Đang chờ</button>
           <button 
             onClick={() => setActiveTab("ALL")}
             className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'ALL' ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
           >Tất cả báo cáo</button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 text-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto opacity-50" /></div>
        ) : filteredReports.length === 0 ? (
          <div className="col-span-full py-20 bg-slate-900/20 border border-white/5 rounded-[40px] text-center">
             <CheckCircle2 className="w-12 h-12 text-emerald-500/20 mx-auto mb-4" />
             <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Sạch bóng báo cáo! Hệ thống đang rất an toàn.</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={report.id} 
              className="p-6 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[32px] hover:border-white/10 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                         <ShieldAlert className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-orange-400 tracking-widest leading-none mb-1 block">Yêu cầu xử lý</span>
                        <h4 className="text-sm font-black text-white uppercase">{report.reason}</h4>
                      </div>
                   </div>
                   <span className="text-[9px] font-bold text-slate-500 bg-black/40 px-2 py-1 rounded-full uppercase flex items-center gap-1.5 border border-white/5">
                      <Clock className="w-3 h-3" />
                      {new Date(report.createdAt).toLocaleDateString()}
                   </span>
                </div>
                
                <div className="space-y-4 mb-8">
                   <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-black uppercase text-slate-500 mb-2 px-1">Nội dung báo cáo</p>
                      <p className="text-xs text-slate-200 leading-relaxed font-medium italic">"{report.content || "Người dùng không để lại tin nhắn chi tiết."}"</p>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-3.5 bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
                         <p className="text-[9px] font-black uppercase text-indigo-400/70 mb-1.5">Người báo cáo</p>
                         <p className="text-xs font-black text-white truncate">{report.reporter.name}</p>
                         <p className="text-[8px] text-slate-500 font-bold truncate">{report.reporter.email}</p>
                      </div>
                      <div className="p-3.5 bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
                         <p className="text-[9px] font-black uppercase text-red-400/70 mb-1.5">Người bị báo cáo</p>
                         <p className="text-xs font-black text-white truncate">{report.reported.name}</p>
                         <p className="text-[8px] text-slate-500 font-bold truncate">{report.reported.email}</p>
                      </div>
                   </div>
                </div>
              </div>

              {report.status === "PENDING" ? (
                <div className="flex gap-3">
                   <button 
                     onClick={() => handleAction(report.id, "RESOLVED")}
                     disabled={isProcessing === report.id}
                     className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                   >
                      {isProcessing === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Đã xử lý
                   </button>
                   <button 
                     onClick={() => handleAction(report.id, "DISMISSED")}
                     disabled={isProcessing === report.id}
                     className="flex-1 py-3 bg-white/5 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                   >
                      <XCircle className="w-4 h-4" />
                      Bác bỏ
                   </button>
                </div>
              ) : (
                <div className={`p-3 text-center rounded-xl text-[10px] font-black uppercase tracking-widest ${report.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                   Trạng thái: {report.status === 'RESOLVED' ? 'Đã xử lý' : 'Đã bác bỏ'}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
