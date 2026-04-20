"use client";

import { useState } from "react";
import Link from "next/link";
import { MoveRight, Mail, Loader2, Compass, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useLang } from "@/components/providers/LangProvider";
import { AuthBackground } from "@/components/ui/AuthBackground";
import { useToast } from "@/components/providers/ToastProvider";

export default function ForgotPasswordPage() {
  const { lang, t } = useLang();
  const authT = t.auth;
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error("Failed to send reset link");

      setIsSuccess(true);
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#0891b2", "#ffffff"]
      });
      showToast(authT.resetLinkSent, "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#020817] font-sans h-full">
      {/* Left Column - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-10 relative overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[360px] mx-auto space-y-4 relative z-10 py-8"
        >
          <Link 
            href="/login" 
            className="inline-flex items-center text-sm text-gray-500 hover:text-cyan-400 transition-colors mb-4 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            {authT.backToLogin}
          </Link>

          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div
                key="request-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="text-left">
                  <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{authT.forgotTitle}</h1>
                  <p className="text-gray-400 text-sm leading-relaxed">{authT.forgotDesc}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-800 rounded-xl leading-5 bg-[#0a1128] text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-all shadow-inner"
                      placeholder={authT.emailPlaceholder}
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-lg shadow-cyan-600/20 text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-[#020817] transition-all disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin h-5 w-5 text-white" />
                    ) : (
                      <>
                        {authT.sendResetLink}
                        <MoveRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-8"
              >
                <div className="flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">{authT.resetLinkSent}</h2>
                  <p className="text-gray-400 text-sm leading-relaxed px-4">
                    {authT.checkEmailDesc}
                  </p>
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Link 
                    href="/login"
                    className="inline-flex items-center text-cyan-400 font-semibold hover:text-cyan-300 transition-colors"
                  >
                    {authT.backToLogin}
                    <MoveRight className="ml-2 h-4 w-4" />
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Right Column - Artistic Visual */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 1 }}
        className="hidden lg:flex lg:w-1/2 relative bg-[#020817] overflow-hidden justify-center items-center h-screen border-l border-white/5"
      >
        <AuthBackground />
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 right-20 w-96 h-96 bg-emerald-600/20 rounded-full blur-[120px] z-10 pointer-events-none"></div>
        <div className="absolute bottom-1/4 left-20 w-96 h-96 bg-cyan-600/30 rounded-full blur-[120px] z-10 pointer-events-none"></div>
        
        {/* Backdrop Art */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ 
            y: [0, -10, 0], 
            opacity: 1 
          }}
          transition={{ 
            opacity: { duration: 0.7, delay: 0.3 },
            y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
          className="relative z-10 p-12 text-center max-w-lg"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-emerald-300 mb-8 backdrop-blur-sm shadow-xl shadow-emerald-900/20">
            <Compass className="h-4 w-4 text-emerald-400" />
            {authT.syncTitle}
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            {authT.syncSubtitle}
          </h2>
          <p className="text-lg text-cyan-100/70 leading-relaxed">
            {authT.syncDesc}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
