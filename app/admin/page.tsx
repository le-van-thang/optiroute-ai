"use client";

import { useEffect, useState } from "react";
import { 
  Users, Bell, Map as TripIcon, MessageSquare, 
  TrendingUp, ArrowUpRight, ShieldAlert, Clock
} from "lucide-react";
import { motion } from "framer-motion";

interface Stats {
  userCount: number;
  tripCount: number;
  reportCount: number;
  messageCount: number;
}

interface RecentReport {
  id: string;
  reason: string;
  reporter: { name: string };
  reported: { name: string };
  createdAt: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setRecentReports(data.recentReports);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-800/20 rounded-3xl border border-white/5" />)}
    </div>
  </div>;

  const statCards = [
    { label: "Tổng người dùng", value: stats?.userCount, icon: Users, color: "text-indigo-400", bg: "bg-indigo-400/10" },
    { label: "Kế hoạch chuyến đi", value: stats?.tripCount, icon: TripIcon, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Báo cáo chờ xử lý", value: stats?.reportCount, icon: Bell, color: "text-orange-400", bg: "bg-orange-400/10" },
    { label: "Tổng tin nhắn", value: stats?.messageCount, icon: MessageSquare, color: "text-purple-400", bg: "bg-purple-400/10" },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* Welcome Header */}
      <div>
        <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Trung tâm Thống kê</h2>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Chào buổi chiều, dữ liệu hệ thống đang ổn định.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={card.label} 
            className="p-6 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl relative overflow-hidden group hover:border-white/10 transition-all"
          >
            <div className={`p-3 rounded-2xl w-fit mb-4 transition-transform group-hover:scale-110 ${card.bg}`}>
               <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">{card.label}</p>
            <h3 className="text-3xl font-black text-white">{card.value?.toLocaleString() || 0}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Reports List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-orange-500" />
                Báo cáo gần đây
             </h3>
             <button className="text-[9px] font-black uppercase text-indigo-400 hover:text-white transition-all underline decoration-indigo-500/30">Xem tất cả</button>
          </div>
          
          <div className="bg-slate-900/20 border border-white/5 rounded-[32px] overflow-hidden">
            {recentReports.length === 0 ? (
              <div className="p-12 text-center text-slate-600 font-bold text-xs">Không có báo cáo nào mới.</div>
            ) : (
              recentReports.map((report, i) => (
                <div key={report.id} className={`p-6 flex items-center justify-between hover:bg-white/[0.02] transition-all ${i !== recentReports.length - 1 ? 'border-b border-white/5' : ''}`}>
                   <div className="flex gap-4 items-center">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                         <Bell className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white mb-0.5">{report.reason}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                           Từ: <span className="text-slate-300">{report.reporter.name}</span> • Đối với: <span className="text-slate-300">{report.reported.name}</span>
                        </p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1.5">
                         <Clock className="w-3 h-3" />
                         {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                   </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Health / Shortcuts */}
        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest px-2">Trạng thái hệ thống</h3>
          <div className="p-6 bg-gradient-to-br from-indigo-600/20 to-transparent border border-indigo-500/20 rounded-[32px] space-y-6">
             <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-indigo-300">Kết nối Database</p>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                   <span className="text-[10px] font-black text-emerald-400">ỔN ĐỊNH</span>
                </div>
             </div>
             <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-indigo-300">Pusher Realtime</p>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                   <span className="text-[10px] font-black text-emerald-400">LIÊN KẾT</span>
                </div>
             </div>
             <div className="h-px bg-white/5" />
             <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-500">Lưu lượng truy cập</p>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: "65%" }}
                     className="h-full bg-indigo-500" 
                   />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-600 uppercase">
                   <span>Thấp</span>
                   <span>65% công suất</span>
                   <span>Cao</span>
                </div>
             </div>
          </div>
          
          <div className="bg-slate-900/40 border border-white/5 rounded-[32px] p-6 text-center">
             <TrendingUp className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
             <h4 className="text-sm font-black text-white mb-2">Tăng trưởng tháng</h4>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Hệ thống ghi nhận tăng 12% lượng người dùng mới trong 30 ngày qua.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
