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

  if (isLoading && status === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#020617]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin opacity-50" />
      </div>
    );
  }

  // Nếu đang bảo trì, và không phải Admin, và không phải trang bảo trì/home
  const isAdmin = session?.user?.role === adminRole;
  const isExcludedPage = pathname === "/maintenance" || pathname === "/" || pathname.startsWith("/admin");

  if (isMaintenance && !isAdmin && !isExcludedPage) {
    router.push("/maintenance");
    return null;
  }

  return <>{children}</>;
}
