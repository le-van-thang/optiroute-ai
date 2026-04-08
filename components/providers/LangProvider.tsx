"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Lang = "vi" | "en";

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("vi");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("optiroute-lang");
    if (saved === "en" || saved === "vi") {
      setLangState(saved);
    }
    setMounted(true);
  }, []);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("optiroute-lang", newLang);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const context = useContext(LangContext);
  if (context === undefined) {
    // Return default if used outside provider or during SSR
    return { lang: "vi" as Lang, setLang: () => {} };
  }
  return context;
}
