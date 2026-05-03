"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Chatbot } from "@/components/ui/Chatbot";
import PageTransition from "@/components/providers/PageTransition";
import { MaintenanceWrapper } from "@/components/providers/MaintenanceWrapper";
import { NavProgress } from "@/components/ui/NavProgress";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");
  const isMaintenancePage = pathname === "/maintenance";
  const isAuthPage = ["/login", "/register", "/forgot-password", "/reset-password"].some(
    (p) => pathname.startsWith(p)
  );

  // Ẩn toàn bộ UI điều hướng cho các trang Admin, Bảo trì, Auth và Landing Page
  const hideMainUI = isAdminPage || isMaintenancePage || isAuthPage || pathname === "/";

  return (
    <>
      <NavProgress />
      {!hideMainUI && <Sidebar />}
      {!hideMainUI && <TopBar />}
      <MaintenanceWrapper adminRole="ADMIN">
        <main
          className={hideMainUI ? "min-h-screen flex flex-col" : "min-h-screen pt-14 flex flex-col"}
          style={hideMainUI ? {} : {
            paddingLeft: "var(--sidebar-w, 220px)",
            transition: "padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
          id="main-content"
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </MaintenanceWrapper>
      {!hideMainUI && <Chatbot />}
    </>
  );
}
