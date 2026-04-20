"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Khi pathname hoặc searchParams thay đổi, kích hoạt hiệu ứng chạy thanh progress
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 800);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return (
    <AnimatePresence>
      {isAnimating && (
        <motion.div
          initial={{ width: "0%", opacity: 1 }}
          animate={{ width: "90%", opacity: 1 }}
          exit={{ width: "100%", opacity: 0 }}
          transition={{ 
            width: { duration: 0.5, ease: "easeOut" },
            opacity: { duration: 0.3, delay: 0.2 }
          }}
          className="fixed top-0 left-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 z-[9999] shadow-[0_0_10px_rgba(99,102,241,0.5)]"
        />
      )}
    </AnimatePresence>
  );
}
