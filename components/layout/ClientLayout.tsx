"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Chatbot } from "@/components/ui/Chatbot";
import PageTransition from "@/components/providers/PageTransition";
import { MaintenanceWrapper } from "@/components/providers/MaintenanceWrapper";
import { NavProgress } from "@/components/ui/NavProgress";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");
  const isMaintenancePage = pathname === "/maintenance";

  // Nếu là trang Admin hoặc trang Bảo trì, ẩn Navbar và Chatbot chính
  const hideMainUI = isAdminPage || isMaintenancePage;

  return (
    <>
      <NavProgress />
      {!hideMainUI && <Navbar />}
      <MaintenanceWrapper adminRole="ADMIN">
        <main className={`flex-1 ${hideMainUI ? "" : "pt-16"}`}>
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </MaintenanceWrapper>
      {!hideMainUI && <Chatbot />}
    </>
  );
}
