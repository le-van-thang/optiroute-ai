"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  BarChart3, Users, Bell, Settings, ShieldAlert, 
  ChevronRight, LogOut, Home, Loader2, Sparkles
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { pusherClient } from "@/lib/pusher";
import { useToast } from "@/components/providers/ToastProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [newReportAlert, setNewReportAlert] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>("OptiAdmin");

  const [isValidated, setIsValidated] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    
    // Kiểm tra chuyên sâu từ Database để đảm bảo tính dứt điểm và hỗ trợ thăng chức instant
    const verifyRole = async () => {
      try {
        const res = await fetch("/api/auth/verify-role");
        if (res.ok) {
          const data = await res.json();
          if (data.role === "ADMIN") {
            setIsValidated(true);
          } else {
            // Nếu Database báo không phải ADMIN, đẩy ra ngoài ngay
            setIsValidated(false);
            router.push("/");
          }
        } else {
          setIsValidated(false);
          router.push("/");
        }
      } catch (err) {
        console.error("Role verification failed:", err);
        setIsValidated(false);
        router.push("/");
      }
    };

    const fetchSiteName = async () => {
      try {
        const res = await fetch("/api/system/status");
        if (res.ok) {
          const data = await res.json();
          if (data.siteName) setSiteName(data.siteName);
        }
      } catch (err) {}
    };

    verifyRole();
    fetchSiteName();
  }, [session, status, router]);

  // Heartbeat để cập nhật trạng thái Online cho Admin
  useEffect(() => {
    if (!session) return;
    
    const triggerHeartbeat = async () => {
      try {
        await fetch("/api/user/heartbeat", { method: "PATCH" });
      } catch (err) {}
    };

    triggerHeartbeat(); 
    const heartbeatInterval = setInterval(triggerHeartbeat, 60000); 
    
    return () => clearInterval(heartbeatInterval);
  }, [session]);

  // Lắng nghe báo cáo Real-time
  useEffect(() => {
    const client = pusherClient; // Tham chiếu cục bộ để tránh lỗi null trong cleanup
    if (!client) return;

    const channel = client.subscribe("admin-channel");
    const handleNewReport = (data: { message: string }) => {
      setNewReportAlert(data.message);
      setTimeout(() => setNewReportAlert(null), 10000);
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3");
        audio.play();
      } catch (e) {}
    };

    channel.bind("new-report", handleNewReport);

    return () => {
      client.unsubscribe("admin-channel");
    };
  }, []);

  if (status === "loading" || isValidated === null) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/50 animate-pulse">
            Đang xác thực quyền hạn...
          </p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: "dashboard", label: "Tổng quan", icon: BarChart3, path: "/admin" },
    { id: "users", label: "Người dùng", icon: Users, path: "/admin/users" },
    { id: "reports", label: "Báo cáo", icon: Bell, path: "/admin/reports" },
    { id: "settings", label: "Cài đặt", icon: Settings, path: "/admin/settings" },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex overflow-hidden font-sans">
      
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? "280px" : "80px" }}
        className="bg-slate-900/40 backdrop-blur-3xl border-r border-white/5 flex flex-col relative z-50 shrink-0"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {isSidebarOpen && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-black uppercase tracking-tighter text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400"
            >
              {siteName}
            </motion.span>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.id} href={item.path}>
                <div className={`
                  flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group
                  ${isActive 
                    ? 'bg-indigo-600/90 text-white shadow-xl shadow-indigo-600/10' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5'}
                `}>
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'group-hover:text-indigo-400'}`} />
                  {isSidebarOpen && <span className="text-[11px] font-black uppercase tracking-wider">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={() => router.push("/dashboard")}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-500 hover:text-white hover:bg-white/5 transition-all group"
          >
            <Home className="w-5 h-5 group-hover:text-amber-400" />
            {isSidebarOpen && <span className="text-[11px] font-black uppercase tracking-wider">Bảng điều khiển</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden overflow-y-auto custom-scrollbar relative">
        {/* Topbar */}
        <header className="h-20 border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl flex items-center justify-between px-8 shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               className="p-2 hover:bg-white/5 rounded-lg transition-all"
             >
               <ChevronRight className={`w-5 h-5 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
             </button>
             <div>
               <h1 className="text-[13px] font-black uppercase tracking-widest text-slate-400">
                 {menuItems.find(m => m.path === pathname)?.label || "Quản trị"}
               </h1>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
                <p className="text-xs font-black uppercase text-white leading-none mb-1">{session?.user?.name || "Admin"}</p>
                <p className="text-[9px] font-black uppercase text-indigo-400 tracking-widest">Hệ thống Quản trị</p>
             </div>
             <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 overflow-hidden">
                {session?.user?.image ? (
                  <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-indigo-500">
                    {session?.user?.name?.[0] || "A"}
                  </div>
                )}
             </div>
          </div>
        </header>

        <section className="p-8 pb-12 w-full max-w-7xl mx-auto">
          {children}
        </section>

        {/* Global Red Alert Toast for Reports */}
        <AnimatePresence>
          {newReportAlert && (
            <motion.div
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              className="fixed bottom-10 right-10 z-[100] p-6 bg-rose-600 text-white rounded-[32px] shadow-[0_20px_50px_rgba(225,29,72,0.4)] border border-rose-400/30 backdrop-blur-xl flex flex-col gap-4 max-w-sm"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center animate-pulse">
                   <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Cảnh báo khẩn cấp</p>
                  <p className="text-sm font-black uppercase">{newReportAlert}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setNewReportAlert(null);
                    router.push("/admin/reports");
                  }}
                  className="flex-1 py-3 bg-white text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:scale-105 transition-all"
                >
                  Xử lý ngay
                </button>
                <button 
                  onClick={() => setNewReportAlert(null)}
                  className="px-4 py-3 bg-rose-700/50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all"
                >
                  X
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
