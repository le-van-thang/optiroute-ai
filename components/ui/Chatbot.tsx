"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Loader2, Sparkles, ImagePlus, Mic, Plus, LogIn, History, ChevronLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useSession } from "next-auth/react";
import { useLang } from "@/components/providers/LangProvider";
import { findGuestAnswer, GUEST_SUGGESTIONS } from "@/lib/guestFAQ";
import Link from "next/link";
import Image from "next/image";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Message {
  role: "bot" | "user";
  text: string;
  image?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  vi: {
    title: "AI Trợ lý",
    subtitle: "Trực tuyến",
    welcomeAuth: (name: string) => `👋 Chào **${name}**! Mình là quản gia ảo của OptiRoute. Hỏi mình về chuyến đi hay chi tiêu của bạn nhé!`,
    welcomeGuest: "👋 Xin chào! Mình là **OptiRoute Concierge** — trợ lý AI của trang web. Mình có thể giúp gì cho bạn?",
    placeholder: "Hỏi mình bất cứ điều gì...",
    newChat: "Chat mới",
    history: "Lịch sử",
    back: "Quay lại",
    noHistory: "Chưa có lịch sử chat.",
    guestMode: "Chế độ khách",
  },
  en: {
    title: "AI Concierge",
    subtitle: "Online",
    welcomeAuth: (name: string) => `👋 Hello **${name}**! I'm your OptiRoute Concierge. Ask me anything about your trips or expenses!`,
    welcomeGuest: "👋 Hello! I'm **OptiRoute Concierge** — the AI assistant for this website. How can I help you?",
    placeholder: "Ask me anything...",
    newChat: "New Chat",
    history: "History",
    back: "Back",
    noHistory: "No chat history yet.",
    guestMode: "Guest Mode",
  }
};

// ─── Auth Quick Prompts ────────────────────────────────────────────────────────
const AUTH_PROMPTS = [
  "💰 Tổng chi tiêu của tôi?",
  "✈️ Gợi ý lịch trình Đà Lạt 3 ngày",
  "📸 Phân tích hoá đơn này",
  "📊 Chi tiêu tháng này bao nhiêu?",
];

// ─── Chat Storage Helpers ─────────────────────────────────────────────────────
const STORAGE_KEY = "optiroute_chat_history";

function loadHistory(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    return parsed.map((s) => ({ ...s, createdAt: new Date(s.createdAt) }));
  } catch { return []; }
}

function saveHistory(sessions: ChatSession[], isAuth: boolean) {
  if (typeof window === "undefined" || !isAuth) return;
  
  // Professional Rule: Only save sessions that belong to an AUTH user 
  // and HAVE at least one user message
  const validSessions = sessions.filter(s => s.messages.some(m => m.role === "user"));

  const trimmed = validSessions.slice(-20).map(s => ({
    ...s,
    messages: s.messages.slice(-50)
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function getSessionTitle(messages: Message[]): string {
  const firstUser = messages.find(m => m.role === "user");
  if (!firstUser) return "Cuộc trò chuyện mới";
  return firstUser.text.slice(0, 40) + (firstUser.text.length > 40 ? "..." : "");
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function Chatbot() {
  const { data: session, status } = useSession();
  const { lang } = useLang();
  const t = T[lang];
  const isAuth = !!session;

  // ── State
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Active session messages
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = useMemo(() => activeSession?.messages ?? [], [activeSession]);

  // ── Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // ── Initialize sessions (Guests always reset, Auth users load history)
  useEffect(() => {
    if (isAuth) {
      const stored = loadHistory();
      if (stored.length > 0) {
        setSessions(stored);
        setActiveSessionId(stored[stored.length - 1].id);
      } else {
        createNewSession();
      }
    } else {
      // Guest mode: Always a clean slate
      createNewSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  // ── Persist sessions (Strictly only for Auth users)
  useEffect(() => {
    if (sessions.length > 0 && isAuth) {
       saveHistory(sessions, isAuth);
    }
  }, [sessions, isAuth]);

  // ── Welcome message text
  const welcomeText = isAuth
    ? t.welcomeAuth(session?.user?.name || "bạn")
    : t.welcomeGuest;

  // ── Create a new session
  const createNewSession = useCallback(() => {
    const id = generateId();
    const newSession: ChatSession = {
      id,
      title: "Cuộc trò chuyện mới",
      messages: [{ role: "bot", text: isAuth ? t.welcomeAuth(session?.user?.name || "bạn") : t.welcomeGuest }],
      createdAt: new Date(),
    };
    setSessions(prev => {
      const updated = [...prev, newSession];
      // Note: saveHistory is now handled by the useEffect for cleaner logic
      return updated;
    });
    setActiveSessionId(id);
    setView("chat");
  }, [isAuth, session?.user?.name, t]);

  // ── Auto-reset chat on Login
  useEffect(() => {
    if (status === "authenticated") {
      // Check if the current session is a guest session (started with guest welcome)
      const isGuestSession = activeSession?.messages[0]?.text === T[lang].welcomeGuest;
      if (isGuestSession) {
        createNewSession();
      }
    }
  }, [status, lang, createNewSession, activeSession?.messages]);

  // ── Append message to active session
  const appendMessage = useCallback((msg: Message) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      const updated = { ...s, messages: [...s.messages, msg] };
      // Update title from first user message
      if (msg.role === "user" && s.title === "Cuộc trò chuyện mới") {
        updated.title = getSessionTitle([msg]);
      }
      return updated;
    }));
  }, [activeSessionId]);

  // ── File upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Vui lòng chỉ chọn hình ảnh."); return; }
    const reader = new FileReader();
    reader.onload = (evt) => setSelectedImage(evt.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Send message
  const handleSend = async (e?: React.FormEvent, presetMsg?: string) => {
    if (e) e.preventDefault();
    const userMessage = presetMsg || input.trim();
    if (!userMessage && !selectedImage) return;

    const imgToSend = selectedImage;
    appendMessage({ role: "user", text: userMessage, image: imgToSend || undefined });
    setInput("");
    setSelectedImage(null);
    setIsTyping(true);

    try {
      if (!isAuth) {
        // ── GUEST MODE: Local FAQ (zero token)
        await new Promise(r => setTimeout(r, 600)); // Simulate thinking
        const answer = findGuestAnswer(userMessage);
        appendMessage({ role: "bot", text: answer });
      } else {
        // ── AUTH MODE: Real Gemini API
        // Context Awareness: Get current itinerary and province from storage
        const currentProvince = localStorage.getItem("optiroute_selected_province");
        const currentItin = sessionStorage.getItem("optiroute_current_itinerary");

        // Gemini history MUST alternate: user -> model ...
        const rawHistory = messages.filter((m: Message) => m.text !== welcomeText && m.role);
        const firstUserIdx = rawHistory.findIndex((m: Message) => m.role === "user");
        const historyPayload = firstUserIdx !== -1 
          ? rawHistory.slice(firstUserIdx).map((m: Message) => ({ 
              role: m.role === "bot" ? "model" : "user", 
              parts: [{ text: m.text }]
            }))
          : [];

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message: userMessage, 
            history: historyPayload, 
            image: imgToSend,
            context: {
              province: currentProvince,
              itinerary: currentItin ? JSON.parse(currentItin) : null
            }
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Lỗi AI");
        appendMessage({ role: "bot", text: data.reply });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      appendMessage({ role: "bot", text: `⚠️ Hệ thống gặp lỗi: ${msg}` });
    } finally {
      setIsTyping(false);
    }
  };

  // ── Voice Input (Web Speech API)
  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert(lang === "vi" ? "Trình duyệt của bạn không hỗ trợ nhận diện giọng nói." : "Your browser does not support voice recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === "vi" ? "vi-VN" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? " " : "") + transcript);
    };

    recognition.onerror = (event: { error: string }) => {
      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
      if (event.error === "not-allowed") {
        alert(lang === "vi" ? "Vui lòng cho phép truy cập Micro để sử dụng tính năng này." : "Please allow microphone access to use this feature.");
      }
    };

    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  if (status === "loading") return null;

  const quickPrompts = isAuth ? AUTH_PROMPTS : GUEST_SUGGESTIONS;

  // ── Shared UI: Chat bubble button
  return (
    <>
      {/* Floating Button */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${isOpen ? "opacity-0 pointer-events-none scale-75" : "opacity-100 scale-100"}`}>
        <motion.div animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 bg-cyan-400 rounded-full blur-xl" />
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} className="absolute inset-0 bg-indigo-500 rounded-full blur-lg" />
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="relative p-4 bg-gradient-to-br from-cyan-500 to-indigo-600 text-white rounded-full shadow-[0_0_30px_rgba(34,211,238,0.6)] border border-cyan-300/30 overflow-hidden flex items-center justify-center group"
        >
          <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-150 transition-transform duration-500 rounded-full" />
          <Sparkles className="w-6 h-6 animate-pulse" />
        </motion.button>
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-4rem)] bg-[#0a1128]/95 backdrop-blur-xl border border-cyan-500/20 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(34,211,238,0.1)] flex flex-col overflow-hidden ring-1 ring-white/5"
          >
            {/* ── Header ── */}
            <motion.div layout="position" className="bg-gradient-to-r from-[#0f1b40]/80 to-[#0a1128]/80 p-5 flex items-center justify-between border-b border-white/5 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0a1128] rounded-full" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base leading-tight flex items-center gap-2">
                    {t.title}
                    {isAuth ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500 text-white uppercase tracking-wider">Vision</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white uppercase tracking-wider">{t.guestMode}</span>
                    )}
                  </h3>
                  <p className="text-xs text-cyan-400 mt-0.5">{t.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* History button (auth only) */}
                {isAuth && (
                  <button
                    onClick={() => setView(v => v === "history" ? "chat" : "history")}
                    title={t.history}
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                  >
                    {view === "history" ? <ChevronLeft className="w-4 h-4" /> : <History className="w-4 h-4" />}
                  </button>
                )}
                {/* New Chat button */}
                <button
                  onClick={createNewSession}
                  title={t.newChat}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>

            {/* ── History View ── */}
            <AnimatePresence mode="wait">
              {view === "history" ? (
                <motion.div key="history" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="flex-1 overflow-y-auto p-3 space-y-2">
                  <p className="text-xs text-gray-500 px-1 mb-3">Lịch sử cuộc trò chuyện</p>
                  {sessions.length <= 1 ? (
                    <p className="text-center text-gray-500 text-sm mt-10">{t.noHistory}</p>
                  ) : (
                    [...sessions].reverse().map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setActiveSessionId(s.id); setView("chat"); }}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${s.id === activeSessionId ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border-white/5 bg-white/3 text-gray-400 hover:bg-white/5 hover:text-white"}`}
                      >
                        <p className="text-sm font-medium truncate">{s.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {s.messages.length - 1} tin nhắn • {new Date(s.createdAt).toLocaleDateString("vi-VN")}
                        </p>
                      </button>
                    ))
                  )}
                </motion.div>
              ) : (
                <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
                  {/* ── Messages ── */}
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5 scroll-smooth custom-scrollbar">
                    {messages.map((msg: Message, idx: number) => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, y: 15, scale: 0.9 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        key={`${activeSessionId}-${idx}`} 
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                          <div className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full mt-1 ${msg.role === "user" ? "bg-indigo-600" : "bg-cyan-700/50 border border-cyan-500/30"}`}>
                            {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-cyan-200" />}
                          </div>
                          <div className={`text-sm py-2.5 px-4 rounded-2xl leading-relaxed prose prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 max-w-full overflow-hidden ${msg.role === "user" ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm shadow-md" : "bg-[#131e42] border border-white/5 text-gray-200 rounded-tl-sm shadow-md"}`}>
                            {msg.image && (
                              <div className="mb-2 rounded-lg overflow-hidden border border-white/20 relative h-[150px] w-full">
                                <Image 
                                  src={msg.image} 
                                  alt="attachment" 
                                  fill 
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            )}
                            {msg.role === "user" ? msg.text : <ReactMarkdown>{msg.text}</ReactMarkdown>}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {/* Typing Indicator */}
                    {isTyping && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="flex gap-3 max-w-[85%]">
                          <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full mt-1 bg-cyan-700/50 border border-cyan-500/30">
                            <Bot className="w-4 h-4 text-cyan-200" />
                          </div>
                          <div className="bg-slate-900 border border-border py-3 px-4 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                            <motion.div className="w-1.5 h-1.5 bg-slate-500 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} />
                            <motion.div className="w-1.5 h-1.5 bg-slate-500 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} />
                            <motion.div className="w-1.5 h-1.5 bg-slate-500 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Suggestion Pills */}
                    {messages.length === 1 && !isTyping && (
                      <motion.div 
                        layout
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="flex flex-wrap gap-2 mt-4 justify-end pt-2"
                      >
                        {quickPrompts.map((p, i) => (
                          <motion.button
                            layout
                            key={i}
                            whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSend(undefined, p)}
                            className="px-4 py-2 bg-slate-900 border border-border rounded-full text-xs text-slate-400 transition-all font-medium shadow-sm"
                          >
                            {p}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {/* Guest Login CTA */}
                  {!isAuth && (
                    <div className="px-4 py-2 bg-slate-900 border-t border-border flex items-center justify-between gap-2 shrink-0">
                      <p className="text-[10px] text-slate-500 font-medium">Đăng nhập để dùng AI với dữ liệu của bạn</p>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Link
                          href="/login"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background text-[10px] font-black rounded-lg transition-opacity shrink-0"
                        >
                          <LogIn className="w-3 h-3" />
                          Đăng nhập
                        </Link>
                      </motion.div>
                    </div>
                  )}

            {/* Floating Image Preview - Compact & Professional */}
            <AnimatePresence>
              {selectedImage && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, y: 10 }} 
                  animate={{ opacity: 1, scale: 1, y: 0 }} 
                  exit={{ opacity: 0, scale: 0.8, y: 10 }} 
                  className="absolute bottom-20 left-4 z-20"
                >
                  <div className="relative p-1 bg-[#131e42]/90 border border-cyan-500/40 rounded-xl shadow-2xl backdrop-blur-md">
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                      <Image 
                        src={selectedImage} 
                        alt="Preview" 
                        fill 
                        className="object-cover" 
                        unoptimized
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setSelectedImage(null)} 
                      className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 shadow-lg hover:bg-rose-600 transition-colors"
                    >
                       <X className="w-3 h-3" />
                    </button>
                    <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none rounded-lg animate-pulse" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

                  {/* Hidden File Input */}
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />

                  {/* ── Input ── */}
                  <form onSubmit={(e) => handleSend(e)} className="p-4 bg-slate-950 border-t border-border shrink-0">
                    <div className="relative flex items-center bg-slate-900 border border-border rounded-2xl p-1 focus-within:ring-1 focus-within:ring-slate-500/50 shadow-inner overflow-hidden transition-all">
                      <div className="flex items-center space-x-1 pl-1">
                        {isAuth && (
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            type="button" 
                            onClick={() => fileInputRef.current?.click()} 
                            className="p-2 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                          >
                            <ImagePlus className="w-4 h-4" />
                          </motion.button>
                        )}
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          type="button" 
                          onClick={startVoiceInput} 
                          className={`p-2 rounded-full transition-all flex-shrink-0 relative ${isListening ? "text-rose-500 bg-rose-500/10" : "text-slate-500 hover:text-slate-300"}`}
                        >
                          <Mic className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`} />
                        </motion.button>
                      </div>
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t.placeholder}
                        className="flex-1 bg-transparent py-2.5 px-2 text-sm text-foreground placeholder:text-slate-600 focus:outline-none min-w-0"
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={(!input.trim() && !selectedImage) || isTyping}
                        className="p-2.5 mr-1 bg-foreground text-background rounded-xl disabled:opacity-40 transition-all flex-shrink-0"
                      >
                        {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
