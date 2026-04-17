"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapIcon, Receipt, Route, LayoutDashboard, LogOut, User, Bell, Camera, CheckCircle2, Landmark, CreditCard, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { BankSettingsModal } from "@/components/split-bill/BankSettingsModal";

interface NotificationData {
  id: string;
  message: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { lang, setLang, t } = useLang();
  
  const navT = t.navbar;

  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Poll notifications
  useEffect(() => {
    if (!session?.user) return;
    
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [session]);

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const res = await fetch("/api/notifications", { method: "PATCH" });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        // Recalculate unread count if needed
        setUnreadCount(prev => {
          const deletedNotif = notifications.find(n => n.id === id);
          return (deletedNotif && !deletedNotif.isRead) ? Math.max(0, prev - 1) : prev;
        });
      }
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  const isActive = (path: string) => pathname?.startsWith(path);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo Section */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <MapIcon className="h-6 w-6 text-white" />
            </div>
            <Link href="/" className="font-bold text-xl tracking-tight text-white flex items-center gap-1">
              OptiRoute <span className="text-indigo-400">AI</span>
            </Link>
          </div>

          {/* Center Navigation - only visible correctly on larger screens */}
          <div className="hidden md:flex flex-1 justify-center items-center space-x-1">
            {session && (
              <>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/dashboard"
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive("/dashboard")
                        ? "bg-white/10 text-white"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {navT.dashboard}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/itinerary"
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive("/itinerary")
                        ? "bg-white/10 text-white"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Route className="h-4 w-4" />
                    {navT.itinerary}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/journal"
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive("/journal")
                        ? "bg-white/10 text-white"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Camera className="h-4 w-4" />
                    {navT.journal}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/split-bill"
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive("/split-bill")
                        ? "bg-white/10 text-white"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Receipt className="h-4 w-4" />
                    {navT.splitBill}
                  </Link>
                </motion.div>
              </>
            )}
          </div>

          {/* Admin & Auth Section */}
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <button 
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
              className="hidden sm:flex items-center justify-center h-8 px-2.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              title={navT.langTitle}
            >
              {lang === "vi" ? (
                <div className="flex items-center gap-1.5">
                  <svg className="w-[18px] h-[13px] rounded-[2px]" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
                    <rect width="300" height="200" fill="#da251d"/>
                    <polygon fill="#ffcd00" points="150,40 179,130 102,74 198,74 121,130"/>
                  </svg>
                  <span className="text-xs font-semibold tracking-wide">VI</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <svg className="w-[18px] h-[13px] rounded-[2px]" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
                    <rect width="300" height="200" fill="#bf0a30"/>
                    <rect width="300" height="15.3" y="15.3" fill="#fff"/><rect width="300" height="15.3" y="46.1" fill="#fff"/>
                    <rect width="300" height="15.3" y="76.9" fill="#fff"/><rect width="300" height="15.3" y="107.6" fill="#fff"/>
                    <rect width="300" height="15.3" y="138.4" fill="#fff"/><rect width="300" height="15.3" y="169.2" fill="#fff"/>
                    <rect width="120" height="107.6" fill="#002868"/>
                  </svg>
                  <span className="text-xs font-semibold tracking-wide">EN</span>
                </div>
              )}
            </button>

            {/* Notification Icon & Dropdown */}
            {session && (
              <div className="relative" ref={dropdownRef}>
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: [0, -10, 10, -10, 0] }} 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative cursor-pointer p-2 rounded-xl transition-all duration-300 ${showNotifications ? 'bg-indigo-600 shadow-lg shadow-indigo-600/40 text-white' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 rounded-full border-2 border-[#0a1128] flex items-center justify-center text-[8px] font-black text-white shadow-lg shadow-rose-500/50">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </motion.div>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.92, filter: "blur(10px)" }}
                      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: 15, scale: 0.92, filter: "blur(10px)" }}
                      transition={{ type: "spring", damping: 20, stiffness: 300 }}
                      className="absolute right-0 mt-4 w-96 bg-slate-950/80 backdrop-blur-3xl border border-white/10 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50 origin-top-right"
                    >
                      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-transparent">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <Bell className="w-4 h-4 text-indigo-400" />
                          </div>
                          <h3 className="text-sm font-black text-white tracking-tight uppercase">
                            Thông báo
                          </h3>
                        </div>
                        {unreadCount > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                            className="text-[10px] font-black text-indigo-400 hover:text-white flex items-center gap-1.5 transition-all bg-indigo-500/10 px-3 py-1.5 rounded-full uppercase tracking-widest border border-indigo-500/20 hover:bg-indigo-600 hover:border-indigo-500"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Đọc tất cả
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-[420px] overflow-y-auto custom-scrollbar py-2">
                        {notifications.length === 0 ? (
                          <div className="py-16 px-8 text-center flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                               <Bell className="w-8 h-8 text-slate-700" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                               Không có thông báo mới nào dành cho bạn
                            </p>
                          </div>
                        ) : (
                          <motion.div 
                            initial="hidden"
                            animate="show"
                            variants={{
                              hidden: { opacity: 0 },
                              show: {
                                opacity: 1,
                                transition: { staggerChildren: 0.08 }
                              }
                            }}
                            className="flex flex-col px-2"
                          >
                            {notifications.map((notif) => {
                              const isPayment = notif.message.toLowerCase().includes("thanh toán") || notif.message.toLowerCase().includes("trả nợ");
                              const isBankReq = notif.message.toLowerCase().includes("stk") || notif.message.toLowerCase().includes("ngân hàng");
                              
                              return (
                                <motion.div
                                  variants={{
                                    hidden: { opacity: 0, x: -10 },
                                    show: { opacity: 1, x: 0 }
                                  }}
                                  key={notif.id}
                                >
                                  <div className="relative group/item mb-1">
                                    <Link 
                                      href={(() => {
                                        if (!notif.link) return "#";
                                        const isPayMsg = notif.message?.toLowerCase().includes("thanh toán") || notif.message?.toLowerCase().includes("trả nợ");
                                        if (isPayMsg && !notif.link.includes("tab=settle")) {
                                          const separator = notif.link.includes("?") ? "&" : "?";
                                          return `${notif.link}${separator}tab=settle#settlement-section`;
                                        }
                                        return notif.link;
                                      })()} 
                                      onClick={(e) => {
                                        setShowNotifications(false);
                                        // If already on split-bill, the Link might not trigger the useEffect unless we force a refresh or use state
                                        // But searchParams change should trigger it.
                                      }}
                                      className={`group block p-4 rounded-2xl transition-all relative overflow-hidden ${!notif.isRead ? 'bg-white/[0.03] hover:bg-white/[0.06]' : 'opacity-60 hover:opacity-100 hover:bg-white/5'}`}
                                    >
                                      {!notif.isRead && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                                      )}
                                      <div className="flex gap-4 pr-8">
                                        <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${
                                          isPayment ? 'bg-emerald-500/10 text-emerald-400' : 
                                          isBankReq ? 'bg-amber-500/10 text-amber-400' : 
                                          'bg-indigo-500/10 text-indigo-400'
                                        }`}>
                                          {isPayment ? <Landmark className="w-5 h-5" /> : 
                                           isBankReq ? <CreditCard className="w-5 h-5" /> : 
                                           <Bell className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 space-y-1.5 min-w-0">
                                          <p className={`text-xs leading-relaxed ${!notif.isRead ? 'text-white font-bold' : 'text-slate-400 font-medium'}`}>
                                            {notif.message}
                                          </p>
                                          <div className="flex items-center gap-2">
                                             <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">
                                                {new Date(notif.createdAt).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                             </span>
                                             <span className="w-1 h-1 rounded-full bg-slate-700" />
                                             <span className="text-[9px] text-slate-500 font-bold">
                                                {new Date(notif.createdAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}
                                             </span>
                                          </div>
                                        </div>
                                      </div>
                                    </Link>
                                    
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        deleteNotification(notif.id);
                                      }}
                                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-rose-500/10 text-rose-500 opacity-0 group-hover/item:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                                      title="Xóa thông báo"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        )}
                      </div>
                      
                      <div className="p-4 bg-slate-900/30 border-t border-white/5 text-center">
                         <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Hệ thống thông báo thực tế ảo</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {status === "loading" ? (
              <div className="h-8 w-24 bg-white/10 animate-pulse rounded-md"></div>
            ) : session ? (
              <div className="flex items-center gap-3">
                {session.user?.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 rounded-md text-sm font-medium transition-colors border border-rose-500/20"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {navT.admin}
                  </Link>
                )}
                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-300 pl-2 border-l border-white/10 group relative">
                  <div className="h-8 w-8 rounded-full bg-indigo-900/50 flex items-center justify-center border border-indigo-500/30 group-hover:bg-indigo-500/10 transition-colors">
                    <User className="h-4 w-4 text-indigo-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium truncate max-w-[100px] leading-tight">{session.user?.name || navT.user}</span>
                    <button 
                      onClick={() => setShowBankModal(true)}
                      className="text-[9px] font-black uppercase text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                    >
                      <Landmark className="w-2.5 h-2.5" />
                      {lang === "vi" ? "STK nhận tiền" : "Receiving Info"}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-md transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  {navT.logout}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-gray-300 hover:text-white px-3 py-2 transition-colors"
                  >
                    {navT.signIn}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/register"
                    className="text-sm font-medium bg-foreground text-background px-4 py-2 rounded-md transition-colors shadow-soft"
                  >
                    {navT.getStarted}
                  </Link>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>

      <BankSettingsModal 
        isOpen={showBankModal} 
        onClose={() => setShowBankModal(false)} 
      />
    </nav>
  );
}
