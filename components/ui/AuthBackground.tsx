"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BACKGROUND_IMAGES = [
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80", // Mountains
  "https://images.unsplash.com/photo-1502602861623-289b4e727f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80", // Paris
  "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80", // Tokyo
  "https://images.unsplash.com/photo-1512100356356-de1b8b209d0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80", // Maldives
];

export function AuthBackground() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 5000); // Change image every 5 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black">
      <AnimatePresence mode="popLayout">
        <motion.img
          key={currentIndex}
          src={BACKGROUND_IMAGES[currentIndex]}
          alt="Travel Destination"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 0.8, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-[#020817]/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-l from-[#020817]/60 via-[#020817]/10 to-transparent lg:from-[#020817]/90" />
    </div>
  );
}
