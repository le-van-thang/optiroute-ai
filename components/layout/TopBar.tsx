"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, User, LogOut, Settings, ChevronDown, Landmark, Mail,
  CheckCircle2, Trash2, CreditCard, Users, LayoutDashboard,
  Check, Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { BankSettingsModal } from "@/components/split-bill/BankSettingsModal";
import { pusherClient } from "@/lib/pusher";

interface NotificationData {
  id: string;
  message: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export function TopBar() {
  const { data: session, status, update } = useSession();
  const pathname = usePathname();
  const { lang, setLang, t } = useLang();
  const { showToast } = useToast();
  const navT = t.navbar;

  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [verifiedRole, setVerifiedRole] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const shortId = (id?: string) => (!id ? "" : `#${id.slice(-6).toUpperCase()}`);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(shortId(id));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Page title from pathname
  useEffect(() => {
    const map: Record<string, string> = {
      "/dashboard": navT.dashboard,
      "/itinerary": navT.itinerary,
      "/journal": navT.journal,
      "/social": lang === "vi" ? "Kết nối" : "Social",
      "/split-bill": navT.splitBill,
      "/profile": navT.profile,
      "/settings": navT.settings,
    };
    const key = Object.keys(map).find((k) => pathname?.startsWith(k));
    setPageTitle(key ? map[key] : "");
  }, [pathname, lang]);

  // Fetch verified role & support email
  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchRole = async () => {
      try {
        const res = await fetch("/api/auth/verify-role");
        if (res.ok) {
          const data = await res.json();
          setVerifiedRole(data.role);
          if (data.role !== session.user.role) {
            await update({ ...session, user: { ...session.user, role: data.role } });
          }
        }
      } catch {}
    };
    fetchRole();

    const client = pusherClient;
    if (client) {
      const channel = client.subscribe(`private-user-${session.user.id}`);
      channel.bind("role-updated", async (data: { role: string }) => {
        setVerifiedRole(data.role);
        await update({ ...session, user: { ...session.user, role: data.role } });
        window.location.reload();
      });
      return () => client.unsubscribe(`private-user-${session.user.id}`);
    }
  }, [session?.user?.id]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) setShowUserDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Notifications
  const fetchNotifications = async () => {
    if (!session?.user) return;
    try {
      const res = await fetch("/api/notifications").catch(() => null);
      if (res?.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  };

  useEffect(() => {
    if (!session?.user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    const client = pusherClient;
    if (client) {
      const channel = client.subscribe("global-notifications");
      channel.bind("new-broadcast", (data: any) => {
        fetchNotifications();
        showToast(data.message, "info");
      });
      return () => client.unsubscribe("global-notifications");
    }
  }, [session?.user?.id]);

  // Heartbeat
  useEffect(() => {
    if (!session?.user?.email) return;
    const beat = async () => {
      if (document.visibilityState !== "visible") return;
      try { await fetch("/api/user/heartbeat", { method: "PATCH" }); } catch {}
    };
    beat();
    const iv = setInterval(beat, 60000);
    document.addEventListener("visibilitychange", beat);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", beat); };
  }, [session]);

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const res = await fetch("/api/notifications", { method: "PATCH" });
      if (res.ok) { setUnreadCount(0); setNotifications((p) => p.map((n) => ({ ...n, isRead: true }))); }
    } catch {}
  };

  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotifications((p) => p.filter((n) => n.id !== id));
        setUnreadCount((prev) => {
          const d = notifications.find((n) => n.id === id);
          return d && !d.isRead ? Math.max(0, prev - 1) : prev;
        });
      }
    } catch {}
  };

  const handleFriendAction = async (requestId: string, action: "ACCEPTED" | "REJECTED", e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      const res = await fetch("/api/social/friends", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: action }),
      });
      if (res.ok) fetchNotifications();
    } catch {}
  };

  return (
    <>
      <header className="fixed top-0 right-0 left-0 h-14 z-40 flex items-center justify-between px-4 bg-[#020817]/80 backdrop-blur-md border-b border-white/[0.06]">
        {/* Page Title */}
        <div
          style={{
            paddingLeft: "var(--sidebar-w, 220px)",
            transition: "padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={pageTitle}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="text-sm font-black text-white/70 uppercase tracking-widest"
            >
              {pageTitle}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Lang Toggle */}
          <button
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            {lang === "vi" ? (
              <>
                <svg className="w-4 h-3 rounded-sm" viewBox="0 0 300 200"><rect width="300" height="200" fill="#da251d"/><polygon fill="#ffcd00" points="150,40 179,130 102,74 198,74 121,130"/></svg>
                <span className="text-[11px] font-bold text-white/70">VI</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-3 rounded-sm" viewBox="0 0 300 200"><rect width="300" height="200" fill="#bf0a30"/><rect width="300" height="15.3" y="15.3" fill="#fff"/><rect width="300" height="15.3" y="46.1" fill="#fff"/><rect width="300" height="15.3" y="76.9" fill="#fff"/><rect width="300" height="15.3" y="107.6" fill="#fff"/><rect width="300" height="15.3" y="138.4" fill="#fff"/><rect width="300" height="15.3" y="169.2" fill="#fff"/><rect width="120" height="107.6" fill="#002868"/></svg>
                <span className="text-[11px] font-bold text-white/70">EN</span>
              </>
            )}
          </button>

          {/* Admin Badge */}
          {session && verifiedRole === "ADMIN" && (
            <Link href="/admin" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg text-xs font-black uppercase tracking-widest border border-rose-500/20 transition-all">
              <LayoutDashboard className="w-3.5 h-3.5" />
              Admin
            </Link>
          )}

          {/* Notifications */}
          {session && (
            <div className="relative" ref={dropdownRef}>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-xl transition-all ${showNotifications ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/[0.06]"}`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 rounded-full border-2 border-[#020817] flex items-center justify-center text-[8px] font-black text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </motion.button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.93 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.93 }}
                    transition={{ type: "spring", damping: 22, stiffness: 320 }}
                    className="absolute right-0 mt-3 w-96 bg-slate-950/90 backdrop-blur-3xl border border-white/10 rounded-[24px] shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-transparent">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">Thông báo</h3>
                      </div>
                      {unreadCount > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); markAllAsRead(); }} className="text-[10px] font-black text-indigo-400 hover:text-white flex items-center gap-1.5 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 hover:bg-indigo-600 transition-all uppercase tracking-widest">
                          <CheckCircle2 className="w-3 h-3" /> Đọc tất cả
                        </button>
                      )}
                    </div>
                    <div className="max-h-[380px] overflow-y-auto py-2">
                      {notifications.length === 0 ? (
                        <div className="py-14 text-center">
                          <Bell className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                          <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">Không có thông báo mới</p>
                        </div>
                      ) : (
                        <div className="flex flex-col px-2">
                          {notifications.map((notif) => {
                            const isPayment = notif.message.toLowerCase().includes("thanh toán") || notif.message.toLowerCase().includes("trả nợ");
                            const isBankReq = notif.message.toLowerCase().includes("stk") || notif.message.toLowerCase().includes("ngân hàng");
                            const isFriendReq = notif.link?.startsWith("friend-request:");
                            const [, reqId] = isFriendReq && notif.link ? notif.link.split(":") : [];
                            return (
                              <div key={notif.id} className="relative group/item mb-1">
                                <Link
                                  href={isFriendReq ? "#" : (notif.link || "#")}
                                  onClick={() => { if (!isFriendReq) setShowNotifications(false); }}
                                  className={`block p-3 rounded-2xl transition-all ${!notif.isRead ? "bg-white/[0.03] hover:bg-white/[0.06]" : "opacity-60 hover:opacity-100 hover:bg-white/5"}`}
                                >
                                  {!notif.isRead && <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-indigo-500 rounded-r-full" />}
                                  <div className="flex gap-3 pr-8">
                                    <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${isPayment ? "bg-emerald-500/10 text-emerald-400" : isBankReq ? "bg-amber-500/10 text-amber-400" : isFriendReq ? "bg-blue-500/10 text-blue-400" : "bg-indigo-500/10 text-indigo-400"}`}>
                                      {isPayment ? <Landmark className="w-4 h-4" /> : isBankReq ? <CreditCard className="w-4 h-4" /> : isFriendReq ? <Users className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs leading-relaxed ${!notif.isRead ? "text-white font-bold" : "text-slate-400"}`}>{notif.message}</p>
                                      <span className="text-[9px] text-slate-600 font-bold">{new Date(notif.createdAt).toLocaleString(lang === "vi" ? "vi-VN" : "en-US")}</span>
                                      {isFriendReq && reqId && (
                                        <div className="flex gap-2 mt-2">
                                          <button onClick={(e) => handleFriendAction(reqId, "ACCEPTED", e)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-colors">Chấp nhận</button>
                                          <button onClick={(e) => handleFriendAction(reqId, "REJECTED", e)} className="px-3 py-1 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg border border-white/5 transition-colors hover:bg-slate-700">Từ chối</button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </Link>
                                <button onClick={(e) => { e.preventDefault(); deleteNotification(notif.id); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-rose-500/10 text-rose-500 opacity-0 group-hover/item:opacity-100 hover:bg-rose-500 hover:text-white transition-all">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* User Dropdown */}
          {status === "loading" ? (
            <div className="h-8 w-20 bg-white/10 animate-pulse rounded-lg" />
          ) : session ? (
            <div className="relative" ref={userDropdownRef}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className={`flex items-center gap-2.5 pl-2.5 pr-2 py-1.5 rounded-full border transition-all ${showUserDropdown ? "bg-indigo-500/20 border-indigo-500/40" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
              >
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[11px] font-bold text-white leading-none">{session.user?.name}</span>
                  <span className="text-[9px] font-black text-indigo-400/80 uppercase tracking-tight">{shortId(session.user?.id)}</span>
                </div>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden shadow-md">
                  {session.user?.image ? <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-3.5 h-3.5 text-white" />}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showUserDropdown ? "rotate-180" : ""}`} />
              </motion.button>

              <AnimatePresence>
                {showUserDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2.5 w-60 bg-[#0a1128]/95 backdrop-blur-3xl border border-white/10 rounded-[20px] shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-white/5 bg-gradient-to-br from-indigo-500/[0.07] to-transparent">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden shadow-md shrink-0">
                          {session.user?.image ? <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate">{session.user?.name}</p>
                          <p className="text-[9px] text-slate-500 truncate">{session.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-white/[0.03] rounded-lg px-2.5 py-1.5 border border-white/5">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">User ID</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono text-indigo-400 font-bold">{shortId(session.user?.id)}</span>
                          <button onClick={() => handleCopyId(session.user.id)} className={`transition-all ${copiedId ? "text-emerald-400" : "text-slate-600 hover:text-white"}`}>
                            {copiedId ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                      {[
                        { href: "/profile", icon: User, label: navT.profile, color: "indigo" },
                        { href: "/settings", icon: Settings, label: navT.settings, color: "slate" },
                      ].map(({ href, icon: Icon, label, color }) => (
                        <Link key={href} href={href} onClick={() => setShowUserDropdown(false)}>
                          <div className={`flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all group`}>
                            <div className={`w-7 h-7 rounded-lg bg-${color}-500/10 flex items-center justify-center group-hover:bg-${color}-500 group-hover:text-white transition-all`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[11px] font-bold">{label}</span>
                          </div>
                        </Link>
                      ))}
                      <button onClick={() => { setShowUserDropdown(false); setShowBankModal(true); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all group">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                          <Landmark className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-bold">{navT.bankInfo}</span>
                      </button>
                    </div>

                    <div className="mx-2 mb-2 p-2.5 bg-indigo-500/[0.04] rounded-xl border border-indigo-500/10 flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0"><Mail className="w-3 h-3" /></div>
                      <div className="min-w-0">
                        <p className="text-[7px] font-black text-indigo-400/60 uppercase tracking-widest">Hỗ trợ 24/7</p>
                        <p className="text-[9px] font-black text-white truncate">support@optiroute.ai</p>
                      </div>
                    </div>

                    <div className="p-1.5 border-t border-white/5">
                      <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-all group">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all">
                          <LogOut className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-bold">{navT.logout}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-white px-3 py-1.5 transition-colors">{navT.signIn}</Link>
              <Link href="/register" className="text-sm font-black bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-xl transition-colors shadow-lg">{navT.getStarted}</Link>
            </div>
          )}
        </div>
      </header>

      <BankSettingsModal isOpen={showBankModal} onClose={() => setShowBankModal(false)} />
    </>
  );
}
