"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface MaintenanceWrapperProps {
  children: React.ReactNode;
  adminRole: string;
}

export function MaintenanceWrapper({ children, adminRole }: MaintenanceWrapperProps) {
  const { data: session, status } = useSession();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/system/status");
        if (res.ok) {
          const data = await res.json();
          setIsMaintenance(data.maintenanceMode);
        }
      } catch (err) {
        console.error("Failed to check system status", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [pathname]);

  // Phase 26: Chỉnh chu - Loại bỏ màn hình chờ (Spinner) gây kẹt khi nhấn Back trình duyệt.
  // Chúng ta sẽ cho phép trang render ngay lập tức và chỉ redirect nếu thực sự đang bảo trì.


  // Nếu đang bảo trì, và không phải Admin, và không phải trang bảo trì/home
  const isAdmin = session?.user?.role === adminRole;
  const isExcludedPage = 
    pathname === "/maintenance" || 
    pathname === "/" || 
    pathname === "/login" || 
    pathname === "/register" || 
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin");

  useEffect(() => {
    if (isMaintenance && !isAdmin && !isExcludedPage) {
      router.push("/maintenance");
    }
  }, [isMaintenance, isAdmin, isExcludedPage, router]);

  if (isMaintenance && !isAdmin && !isExcludedPage) {
    return null;
  }

  return <>{children}</>;
}
