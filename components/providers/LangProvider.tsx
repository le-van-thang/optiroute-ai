"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Lang } from "@/lib/translations";

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: typeof translations.vi;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("vi");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("optiroute-lang");
    if (saved === "en" || saved === "vi") {
      setLangState(prev => prev !== (saved as Lang) ? (saved as Lang) : prev);
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
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const context = useContext(LangContext);
  if (context === undefined) {
    // Return default if used outside provider or during SSR
    return { lang: "vi" as Lang, setLang: () => {}, t: translations.vi };
  }
  return context;
}
