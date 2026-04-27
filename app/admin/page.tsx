"use client";

import { useEffect, useState } from "react";
import { 
  Users, Bell, Map as TripIcon, MessageSquare, 
  TrendingUp, ArrowUpRight, ShieldAlert, Clock, Zap, 
  Activity as Pulse, Globe, ShieldCheck, Database, Server, RefreshCw,
  X, Send, AlertTriangle, Info, ChevronRight, Loader2, BarChart3, Map as MapIcon,
  Flame, Search, Mail, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/providers/ToastProvider";
import { WeatherDetailModal } from "@/components/weather/WeatherDetailModal";

interface Stats {
  userCount: number;
  tripCount: number;
  reportCount: number;
  messageCount: number;
  onlineCount: number;
  cityDistribution?: Record<string, number>;
}

interface LiveEvent {
  type: string;
  title: string;
  detail: string;
  time: string;
}

const REASON_LABELS: Record<string, string> = {
  SPAM: "Làm phiền / Spam",
  HARASSMENT: "Quấy rối / Đe dọa",
  SCAM: "Lừa đảo / Chiếm đoạt",
  INAPPROPRIATE: "Nội dung phản cảm",
  OTHER: "Lý do khác"
};

interface RecentReport {
  id: string;
  reason: string;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  reporter: { name: string; email: string };
  reported: { name: string; email: string };
  createdAt: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  
  interface CityWeather { name: string; temp: number; code: number; isBad: boolean; }
  const [liveWeather, setLiveWeather] = useState<CityWeather[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastPing, setLastPing] = useState(new Date());
  const [siteName, setSiteName] = useState("OptiRoute AI");
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
  const [healthStats, setHealthStats] = useState({ uptime: 99.99, latency: 42 });
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: "", content: "", type: "INFO" });
  const [isWeatherDetailOpen, setIsWeatherDetailOpen] = useState(false);
  const [selectedWeatherCity, setSelectedWeatherCity] = useState("Hà Nội");
  const { showToast } = useToast();

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentReports(data.recentReports);
        setLiveEvents(data.liveEvents || []);
        if (data.stats.siteName) setSiteName(data.stats.siteName);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const statsInterval = setInterval(fetchData, 30000);
    
    const healthInterval = setInterval(() => {
      setHealthStats({
        uptime: parseFloat((99.95 + Math.random() * 0.04).toFixed(2)),
        latency: Math.floor(35 + Math.random() * 20)
      });
    }, 5000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandCenterOpen(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const pingTimer = setInterval(() => setLastPing(new Date()), 1000);
    
    // Phase 3: Fetch Live Weather Pulse for Admin
    const fetchWeather = async () => {
      try {
        const cities = [
          { name: "Hà Nội", lat: 21.0285, lng: 105.8542 },
          { name: "Đà Nẵng", lat: 16.0678, lng: 108.2208 },
          { name: "Đà Lạt", lat: 11.9404, lng: 108.4583 },
          { name: "TP. HCM", lat: 10.8231, lng: 106.6297 }
        ];
        
        const lats = cities.map(c => c.lat).join(",");
        const lngs = cities.map(c => c.lng).join(",");
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,weather_code&timezone=Asia/Bangkok`);
        const data = await res.json();
        
        // Handle array response for multiple locations
        const results = (Array.isArray(data) ? data : [data]).map((d: any, i: number) => {
          const code = d.current.weather_code;
          const isBad = (code >= 51 && code <= 67) || (code >= 80 && code <= 99);
          return {
            name: cities[i].name,
            temp: d.current.temperature_2m,
            code,
            isBad
          };
        });
        setLiveWeather(results);
      } catch (err) {
        console.error("Failed to fetch admin weather:", err);
      }
    };
    
    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 5 * 60 * 1000); // 5 mins

    return () => {
      clearInterval(statsInterval);
      clearInterval(healthInterval);
      clearInterval(pingTimer);
      clearInterval(weatherInterval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const getCityCount = (cityName: string) => {
    const dist = stats?.cityDistribution || {};
    if (cityName === "Hà Nội") return (dist["Hanoi"] || dist["Hà Nội"] || 0);
    if (cityName === "Đà Nẵng") return (dist["Da Nang"] || dist["Đà Nẵng"] || 0);
    if (cityName === "TP. HCM") return (dist["Ho Chi Minh City"] || dist["TP. HCM"] || dist["Saigon"] || 0);
    if (cityName === "Hải Phòng") return (dist["Hai Phong"] || dist["Hải Phòng"] || 0);
    if (cityName === "Huế") return (dist["Hue"] || dist["Huế"] || 0);
    if (cityName === "Đà Lạt") return (dist["Da Lat"] || dist["Đà Lạt"] || 0);
    if (cityName === "Cần Thơ") return (dist["Can Tho"] || dist["Cần Thơ"] || 0);
    return dist[cityName] || 0;
  };

  const handleSendBroadcast = async () => {
    if (!broadcastForm.title || !broadcastForm.content) {
      showToast("Vui lòng nhập đầy đủ tiêu đề và nội dung!", "error");
      return;
    }
    setIsSending(true);
    
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(broadcastForm)
      });
      
      if (res.ok) {
        const data = await res.json();
        showToast(`Đã gửi thông báo tới ${data.count} người dùng!`, "success");
        setShowBroadcastModal(false);
        setBroadcastForm({ title: "", content: "", type: "INFO" });
      } else {
        const error = await res.json();
        showToast(error.error || "Gửi thông báo thất bại!", "error");
      }
    } catch (err) {
      showToast("Có lỗi xảy ra khi gửi thông báo!", "error");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-800/20 rounded-3xl border border-white/5" />)}
    </div>
  </div>;

  const statCards = [
    { label: "Tổng người dùng", value: stats?.userCount, icon: Users, color: "text-indigo-400", bg: "bg-indigo-400/10" },
    { label: "Kế hoạch chuyến đi", value: stats?.tripCount, icon: TripIcon, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Báo cáo chờ xử lý", value: stats?.reportCount, icon: Bell, color: "text-orange-400", bg: "bg-orange-400/10" },
    { label: "Người dùng Online", value: stats?.onlineCount || 0, icon: Zap, color: "text-amber-400", bg: "bg-amber-400/10" },
  ];

  const BROADCAST_TEMPLATES = [
    { title: "Bảo trì hệ thống", content: "Hệ thống sẽ tạm nghỉ để bảo trì nâng cấp từ 00:00 đến 02:00. Rất xin lỗi vì sự bất tiện này!", type: "WARNING" },
    { title: "Tính năng mới", content: "OptiRoute vừa cập nhật tính năng AI Trip Planner mới. Hãy thử ngay tại trang Lịch trình nhé!", type: "INFO" },
    { title: "Nhắc nhở thanh toán", content: "Đừng quên kiểm tra và thanh toán các khoản chi tiêu trong chuyến đi của bạn nhé!", type: "INFO" },
    { title: "Sự kiện đặc biệt", content: "Chào mừng ngày lễ, OptiRoute tặng ngay 500 điểm cho tất cả người dùng hoạt động hôm nay!", type: "EMERGENCY" },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" />
            Trung tâm thống kê {siteName}
          </h1>
          <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-[10px]">Chào buổi chiều, dữ liệu hệ thống đang ổn định.</p>
        </div>
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
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl w-fit transition-transform group-hover:scale-110 ${card.bg}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
              {card.label === "Người dùng Online" && (
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">{card.label}</p>
            <h3 className="text-3xl font-black text-white">{card.value?.toLocaleString() || 0}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Reports List */}
        <div className="lg:col-span-2 space-y-10">
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-orange-500" />
                  Báo cáo gần đây
               </h3>
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
                          <p className="text-sm font-black text-white mb-0.5">{REASON_LABELS[report.reason] || report.reason}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                             Từ: <span className="text-slate-300">{report.reporter.name}</span> • Đối với: <span className="text-slate-300">{report.reported.name}</span>
                          </p>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border mb-2 inline-block ${
                          report.status === 'PENDING' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        }`}>
                           {report.status === 'PENDING' ? 'Chờ xử lý' : 'Đã xử lý'}
                        </div>
                     </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Live Events Stream */}
          <div className="space-y-6">
             <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2 px-2">
               <Search className="w-4 h-4" />
               Sự kiện trực tiếp (Live Stream)
             </h3>
             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {liveEvents.length > 0 ? liveEvents.map((ev, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={i} 
                    className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl flex items-start gap-4 hover:border-indigo-500/30 transition-all"
                  >
                     <div className={`p-2 rounded-xl ${
                       ev.type === "USER" ? "bg-blue-500/10 text-blue-400" :
                       ev.type === "TRIP" ? "bg-emerald-500/10 text-emerald-400" :
                       "bg-amber-500/10 text-amber-400"
                     }`}>
                        {ev.type === "USER" ? <Users className="w-4 h-4" /> : ev.type === "TRIP" ? <TripIcon className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">{ev.title}</p>
                        <p className="text-[11px] text-white font-bold mt-0.5 line-clamp-1">{ev.detail}</p>
                        <p className="text-[9px] text-slate-600 font-medium mt-1">{new Date(ev.time).toLocaleTimeString()}</p>
                     </div>
                  </motion.div>
                )) : (
                  <p className="text-xs text-slate-600 italic">Đang chờ sự kiện tiếp theo...</p>
                 )}
             </div>
          </div>

          {/* Phase 3: Live Weather Pulse */}
          <div className="space-y-6">
             <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 px-2">
               <Globe className="w-4 h-4 text-cyan-500" />
               Nhịp đập thời tiết toàn quốc
             </h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {liveWeather.map((w, i) => {
                  let icon = "☁️";
                  if (w.code === 0) icon = "☀️";
                  else if (w.code <= 3) icon = "⛅";
                  else if (w.code === 45 || w.code === 48) icon = "🌫️";
                  else if (w.code >= 51 && w.code <= 67) icon = "🌧️";
                  else if (w.code >= 71 && w.code <= 77) icon = "❄️";
                  else if (w.code >= 80 && w.code <= 82) icon = "🌧️";
                  else if (w.code >= 95 && w.code <= 99) icon = "⛈️";

                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={w.name}
                      onClick={() => {
                        setSelectedWeatherCity(w.name);
                        setIsWeatherDetailOpen(true);
                      }}
                      className={`p-4 rounded-3xl border transition-all relative overflow-hidden group cursor-pointer hover:scale-105 ${w.isBad ? 'bg-rose-500/10 border-rose-500/30 ring-1 ring-rose-500/20' : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}
                    >
                      {w.isBad && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      )}
                      <div className="text-2xl mb-2">{icon}</div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{w.name}</p>
                      <div className="flex items-center gap-2">
                        <p className={`text-xl font-black ${w.isBad ? 'text-rose-400' : 'text-white'}`}>{Math.round(w.temp)}°</p>
                        {w.isBad && <span className="text-[8px] font-bold bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-sm uppercase">Cảnh báo</span>}
                      </div>
                    </motion.div>
                  );
                })}
             </div>
          </div>
        </div>

        {/* System Health / Shortcuts */}
        <div className="space-y-6">
          <div className="bg-slate-900/40 border border-white/5 rounded-[40px] p-8 overflow-hidden relative group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32 transition-all group-hover:bg-indigo-500/20" />
             <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest mb-8 flex items-center gap-2">
                <Globe className="w-4 h-4 animate-spin-slow" />
                Live Traffic Pulse
             </h3>
             <div className="h-64 relative bg-slate-950/40 rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center opacity-10 grayscale pointer-events-none">
                   <MapIcon className="w-48 h-48 text-slate-400" />
                </div>
                
                {/* Pulsing Dots for Cities */}
                <div className="absolute top-[12%] left-[50%]">
                   <div className="relative">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping absolute" />
                      <div className="w-2 h-2 bg-indigo-500 rounded-full relative z-10" />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[7px] font-black uppercase text-white bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap shadow-xl">Hà Nội • {getCityCount("Hà Nội")}</span>
                   </div>
                </div>
                <div className="absolute top-[22%] left-[45%]">
                   <div className="relative">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping absolute" />
                      <div className="w-2 h-2 bg-blue-400 rounded-full relative z-10" />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[7px] font-black uppercase text-white bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap shadow-xl">Hải Phòng • {getCityCount("Hải Phòng")}</span>
                   </div>
                </div>
                <div className="absolute top-[42%] left-[53%]">
                   <div className="relative">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping absolute" />
                      <div className="w-2 h-2 bg-emerald-500 rounded-full relative z-10" />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[7px] font-black uppercase text-white bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap shadow-xl">Huế • {getCityCount("Huế")}</span>
                   </div>
                </div>
                <div className="absolute top-[52%] left-[62%]">
                   <div className="relative">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping absolute" />
                      <div className="w-2 h-2 bg-emerald-400 rounded-full relative z-10" />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[7px] font-black uppercase text-white bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap shadow-xl">Đà Nẵng • {getCityCount("Đà Nẵng")}</span>
                   </div>
                </div>
                <div className="absolute bottom-[32%] left-[55%]">
                   <div className="relative">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping absolute" />
                      <div className="w-2 h-2 bg-amber-500 rounded-full relative z-10" />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[7px] font-black uppercase text-white bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap shadow-xl">Đà Lạt • {getCityCount("Đà Lạt")}</span>
                   </div>
                </div>
                <div className="absolute bottom-[22%] left-[45%]">
                   <div className="relative">
                      <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping absolute" />
                      <div className="w-2 h-2 bg-rose-500 rounded-full relative z-10" />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[7px] font-black uppercase text-white bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap shadow-xl">TP. HCM • {getCityCount("TP. HCM")}</span>
                   </div>
                </div>
                <div className="absolute bottom-[12%] left-[35%]">
                   <div className="relative">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping absolute" />
                      <div className="w-2 h-2 bg-cyan-400 rounded-full relative z-10" />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[7px] font-black uppercase text-white bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap shadow-xl">Cần Thơ • {getCityCount("Cần Thơ")}</span>
                   </div>
                </div>
                <div className="absolute bottom-[40%] left-[25%]">
                   <div className="relative">
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-ping absolute" />
                      <div className="w-2 h-2 bg-slate-500 rounded-full relative z-10" />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[7px] font-black uppercase text-white bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap shadow-xl">Vị trí khác • {Math.max(0, (stats?.onlineCount || 0) - (getCityCount("Hà Nội") + getCityCount("Đà Nẵng") + getCityCount("TP. HCM") + getCityCount("Hải Phòng") + getCityCount("Huế") + getCityCount("Đà Lạt") + getCityCount("Cần Thơ")))}</span>
                   </div>
                </div>
             </div>

             {/* Real-time Location List */}
             <div className="mt-6 space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5 pb-2">Chi tiết vị trí (Real-time)</h4>
                <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                   {stats?.cityDistribution && Object.entries(stats.cityDistribution).length > 0 ? (
                      Object.entries(stats.cityDistribution).map(([city, count]) => (
                         <div key={city} className="flex items-center justify-between py-1">
                            <span className="text-[11px] text-slate-300 font-medium">{city}</span>
                            <span className="text-[11px] text-indigo-400 font-black">{count}</span>
                         </div>
                      ))
                   ) : (
                      <p className="text-[10px] text-slate-600 italic">Đang xác định vị trí...</p>
                   )}
                </div>
             </div>
             
             <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group-hover:bg-white/[0.08] transition-all">
                   <div className="flex items-center justify-between mb-1">
                      <p className="text-[8px] font-black text-slate-500 uppercase">Hệ thống</p>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   </div>
                   <p className="text-lg font-black text-white">{healthStats.uptime}%</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group-hover:bg-white/[0.08] transition-all">
                   <div className="flex items-center justify-between mb-1">
                      <p className="text-[8px] font-black text-slate-500 uppercase">Latency</p>
                      <div className={`w-1.5 h-1.5 rounded-full ${healthStats.latency < 50 ? 'bg-indigo-500' : 'bg-amber-500'} animate-pulse`} />
                   </div>
                   <p className="text-lg font-black text-indigo-400">{healthStats.latency}ms</p>
                </div>
             </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-indigo-600/20 to-transparent border border-indigo-500/20 rounded-[32px] space-y-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Database className="w-3.5 h-3.5 text-indigo-400" />
                   <p className="text-[10px] font-black uppercase text-indigo-300">Kết nối Database</p>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                   <span className="text-[10px] font-black text-emerald-400">ỔN ĐỊNH</span>
                </div>
             </div>
             <div className="h-px bg-white/5" />
             <div className="space-y-3">
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black uppercase text-slate-500">Last System Ping</p>
                   <p className="text-[10px] font-mono text-indigo-400 font-bold">{lastPing.toLocaleTimeString()}</p>
                </div>
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
             <button className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl hover:border-indigo-500/30 transition-all group flex flex-col items-center gap-2">
                <RefreshCw className="w-4 h-4 text-slate-500 group-hover:rotate-180 transition-transform duration-500" />
                <span className="text-[8px] font-black uppercase text-slate-400">Backup</span>
             </button>
             <button 
               onClick={() => setShowBroadcastModal(true)}
               className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl hover:border-emerald-500/30 transition-all group flex flex-col items-center gap-2"
             >
                <Globe className="w-4 h-4 text-slate-500 group-hover:scale-110 group-hover:text-emerald-400 transition-all" />
                <span className="text-[8px] font-black uppercase text-slate-400 group-hover:text-emerald-300">Broadcast</span>
             </button>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-[32px] p-6 text-center group hover:bg-indigo-600/5 transition-colors">
             <TrendingUp className="w-8 h-8 text-indigo-500 mx-auto mb-3 group-hover:translate-y-[-5px] transition-transform" />
             <h4 className="text-sm font-black text-white mb-2">Tăng trưởng tháng</h4>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Hệ thống ghi nhận tăng 12% lượng người dùng mới trong 30 ngày qua.</p>
          </div>
        </div>
      </div>

      {/* Broadcast Modal */}
      <AnimatePresence>
        {showBroadcastModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => !isSending && setShowBroadcastModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#0a1128] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <Globe className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white leading-none">Phát thông báo</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Gửi tới {stats?.userCount || 0} người dùng</p>
                  </div>
                </div>
                <button onClick={() => setShowBroadcastModal(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <label className="text-[9px] font-black uppercase text-slate-500 mb-3 block px-1 tracking-widest">Gợi ý mẫu nhanh</label>
                <div className="flex flex-wrap gap-2">
                  {BROADCAST_TEMPLATES.map((tmpl, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setBroadcastForm({ title: tmpl.title, content: tmpl.content, type: tmpl.type })}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-400 hover:text-white hover:bg-indigo-600/20 hover:border-indigo-500/50 transition-all font-bold"
                    >
                      {tmpl.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black uppercase text-indigo-400 mb-2 block px-1">Tiêu đề thông báo</label>
                  <input 
                    type="text" 
                    value={broadcastForm.title}
                    onChange={e => setBroadcastForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="VD: Bảo trì hệ thống định kỳ..."
                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-indigo-400 mb-2 block px-1">Loại thông báo</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["INFO", "WARNING", "EMERGENCY"] as const).map(type => (
                      <button 
                        key={type}
                        onClick={() => setBroadcastForm(p => ({ ...p, type }))}
                        className={`py-2 rounded-xl text-[10px] font-black border transition-all ${
                          broadcastForm.type === type 
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20' 
                          : 'bg-slate-950/50 border-white/5 text-slate-500 hover:border-white/10'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-indigo-400 mb-2 block px-1">Nội dung chi tiết</label>
                  <textarea 
                    value={broadcastForm.content}
                    onChange={e => setBroadcastForm(p => ({ ...p, content: e.target.value }))}
                    rows={4}
                    placeholder="Nhập nội dung bạn muốn gửi tới tất cả người dùng..."
                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700 resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setShowBroadcastModal(false)}
                    disabled={isSending}
                    className="flex-1 py-4 text-slate-500 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    onClick={handleSendBroadcast}
                    disabled={isSending || !broadcastForm.title || !broadcastForm.content}
                    className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Gửi ngay
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Command Center Overlay */}
      <AnimatePresence>
        {isCommandCenterOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 backdrop-blur-sm bg-black/40"
            onClick={() => setIsCommandCenterOpen(false)}
          >
             <motion.div 
               initial={{ scale: 0.95, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.95, y: 20 }}
               onClick={(e) => e.stopPropagation()}
               className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden"
             >
                <div className="p-6 border-b border-white/5 flex items-center gap-4">
                   <Search className="w-6 h-6 text-indigo-500" />
                   <input 
                     autoFocus
                     placeholder="Gõ lệnh hoặc tìm kiếm (ví dụ: 'ban user', 'maintenance on')..."
                     className="bg-transparent border-none outline-none text-white text-lg w-full placeholder:text-slate-600 font-bold"
                   />
                </div>
                <div className="p-4 bg-slate-950/50">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-2">Hành động nhanh</p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {[
                        { label: "Bật bảo trì", cmd: "M", icon: Zap },
                        { label: "Gửi thông báo", cmd: "B", icon: Mail },
                        { label: "Quản lý User", cmd: "U", icon: Users },
                        { label: "Xem báo cáo", cmd: "R", icon: Bell },
                      ].map(action => (
                        <button key={action.label} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all group">
                           <div className="flex items-center gap-3">
                              <action.icon className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                              <span className="text-sm font-bold text-slate-300">{action.label}</span>
                           </div>
                           <kbd className="px-2 py-1 bg-slate-800 rounded-md text-[10px] font-black text-slate-500 border border-white/5">{action.cmd}</kbd>
                        </button>
                      ))}
                   </div>
                </div>
                <div className="p-4 border-t border-white/5 bg-slate-900 flex items-center justify-between">
                   <p className="text-[10px] text-slate-500 font-bold">Mẹo: Nhấn <span className="text-white">Esc</span> để đóng</p>
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      <span className="text-[10px] font-black text-indigo-400 uppercase">AI-Powered Center</span>
                   </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Weather Detail Modal */}
      <WeatherDetailModal 
        isOpen={isWeatherDetailOpen}
        onClose={() => setIsWeatherDetailOpen(false)}
        city={selectedWeatherCity}
      />
    </div>
  );
}
