"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapIcon, Receipt, Route, LayoutDashboard, LogOut, User } from "lucide-react";
import { useLang } from "@/components/providers/LangProvider";

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { lang, setLang } = useLang();

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
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive("/dashboard")
                      ? "bg-white/10 text-white"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  href="/itinerary"
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive("/itinerary")
                      ? "bg-white/10 text-white"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Route className="h-4 w-4" />
                  Smart Itinerary
                </Link>
                <Link
                  href="/split-bill"
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive("/split-bill")
                      ? "bg-white/10 text-white"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Receipt className="h-4 w-4" />
                  Split-Bill
                </Link>
              </>
            )}
          </div>

          {/* Admin & Auth Section */}
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <button 
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
              className="hidden sm:flex items-center justify-center h-8 px-2.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              title={lang === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
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
                    Admin
                  </Link>
                )}
                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-300 pl-2 border-l border-white/10">
                  <div className="h-8 w-8 rounded-full bg-indigo-900/50 flex items-center justify-center border border-indigo-500/30">
                    <User className="h-4 w-4 text-indigo-300" />
                  </div>
                  <span className="font-medium truncate max-w-[100px]">{session.user?.name || "User"}</span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-md transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-300 hover:text-white px-3 py-2 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
