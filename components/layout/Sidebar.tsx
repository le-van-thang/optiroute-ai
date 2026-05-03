"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapIcon, LayoutDashboard, Route, Camera, Users, Receipt,
  ChevronLeft, ChevronRight, Map, Sparkles,
} from "lucide-react";
import { useLang } from "@/components/providers/LangProvider";
import { useSession } from "next-auth/react";

const SIDEBAR_EXPANDED_KEY = "sidebar_expanded";

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { lang, t } = useLang();
  const navT = t.navbar;

  const [expanded, setExpanded] = useState(true);
  const [siteName, setSiteName] = useState("OptiRoute AI");

  // Persist sidebar state & sync CSS variable for layout
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_EXPANDED_KEY);
    const isExpanded = stored !== null ? stored === "true" : true;
    setExpanded(isExpanded);
    document.documentElement.style.setProperty("--sidebar-w", isExpanded ? "220px" : "68px");
  }, []);

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(next));
      document.documentElement.style.setProperty("--sidebar-w", next ? "220px" : "68px");
      return next;
    });
  };

  useEffect(() => {
    const fetchSiteName = async () => {
      try {
        const res = await fetch("/api/system/status");
        if (res.ok) {
          const data = await res.json();
          if (data.siteName) setSiteName(data.siteName);
        }
      } catch {}
    };
    fetchSiteName();
  }, []);

  const isActive = (path: string) => pathname?.startsWith(path);

  const navItems = session
    ? [
        { href: "/dashboard", icon: LayoutDashboard, label: navT.dashboard },
        { href: "/itinerary",  icon: Route,           label: navT.itinerary },
        { href: "/journal",    icon: Camera,           label: navT.journal },
        { href: "/social",     icon: Users,            label: lang === "vi" ? "Kết nối" : "Social" },
        { href: "/split-bill", icon: Receipt,          label: navT.splitBill },
      ]
    : [];

  const siteNameParts = siteName.includes(" ") ? siteName.split(" ") : [siteName];

  return (
    <motion.aside
      animate={{ width: expanded ? 220 : 68 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-[#0a0f1e]/95 backdrop-blur-xl border-r border-white/[0.06] shadow-2xl overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
            <MapIcon className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="font-black text-[15px] text-white tracking-tight whitespace-nowrap overflow-hidden"
              >
                {siteNameParts[0]}{" "}
                <span className="text-indigo-400">
                  {siteNameParts.slice(1).join(" ")}
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.97 }}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group ${
                  active
                    ? "bg-indigo-600/20 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                {/* Active indicator */}
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.7)]"
                  />
                )}
                <Icon className={`w-5 h-5 shrink-0 ${active ? "text-indigo-400" : "text-current"}`} />
                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18 }}
                      className="text-[13px] font-bold tracking-wide whitespace-nowrap overflow-hidden"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Tooltip when collapsed */}
                {!expanded && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs font-bold text-white whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-50">
                    {label}
                  </div>
                )}
              </motion.div>
            </Link>
          );
        })}

        {/* Divider + AI Feature Promo */}
        {session && (
          <>
            <div className="my-3 mx-2 h-px bg-white/[0.05]" />
            <Link href="/itinerary">
              <motion.div
                whileHover={{ x: 3 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/[0.08] transition-all"
              >
                <Sparkles className="w-5 h-5 shrink-0" />
                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18 }}
                      className="text-[12px] font-black uppercase tracking-widest whitespace-nowrap overflow-hidden"
                    >
                      {lang === "vi" ? "AI Planner" : "AI Planner"}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!expanded && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs font-bold text-white whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-50">
                    AI Planner
                  </div>
                )}
              </motion.div>
            </Link>
          </>
        )}
      </nav>

      {/* Collapse Toggle Button */}
      <div className="shrink-0 p-3 border-t border-white/[0.06]">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleExpanded}
          className={`flex items-center w-full px-3 py-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all ${expanded ? "justify-between" : "justify-center"}`}
        >
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-black uppercase tracking-widest"
              >
                {lang === "vi" ? "Thu gọn" : "Collapse"}
              </motion.span>
            )}
          </AnimatePresence>
          {expanded ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </motion.button>
      </div>
    </motion.aside>
  );
}
