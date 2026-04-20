"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MoveRight, Lock, Loader2, Compass, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { AuthBackground } from "@/components/ui/AuthBackground";
import { useToast } from "@/components/providers/ToastProvider";
import confetti from "canvas-confetti";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const { lang, t } = useLang();
  const authT = t.auth;
  const { showToast } = useToast();

  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      showToast(authT.invalidToken, "error");
      router.push("/login");
    }
  }, [token, router, authT.invalidToken, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      showToast(authT.errLength, "error");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast(authT.errMatch, "error");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: formData.password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setIsSuccess(true);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#0891b2", "#10b981", "#ffffff"]
      });
      showToast(authT.resetSuccess, "success");
      
      setTimeout(() => {
        router.push("/login?reset=true");
      }, 3000);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }} 
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-[360px] mx-auto space-y-4 relative z-10 py-8"
    >
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div
            key="reset-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="text-left">
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{authT.newPwdTitle}</h1>
              <p className="text-gray-400 text-sm leading-relaxed">{authT.newPwdDesc}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                {/* Password Input */}
                <div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`block w-full pl-10 pr-10 py-2.5 border rounded-xl leading-5 bg-[#0a1128] text-gray-300 placeholder-gray-500 focus:outline-none sm:text-sm transition-all shadow-inner ${
                        formData.password.length > 0 && formData.password.length < 6
                          ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                          : "border-gray-800 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      }`}
                      placeholder={authT.pwdPlaceholder}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-cyan-400 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {formData.password.length > 0 && formData.password.length < 6 && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-red-400 text-xs ml-1 mt-1.5 font-medium flex items-center"
                      >
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {authT.errLength}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Confirm Password Input */}
                <div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors opacity-70" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className={`block w-full pl-10 pr-10 py-2.5 border rounded-xl leading-5 bg-[#0a1128] text-gray-300 placeholder-gray-500 focus:outline-none sm:text-sm transition-all shadow-inner ${
                        formData.confirmPassword.length > 0 && formData.confirmPassword !== formData.password
                          ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                          : "border-gray-800 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      }`}
                      placeholder={authT.pwdConfirmPlaceholder}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-cyan-400 transition-colors focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {formData.confirmPassword.length > 0 && formData.confirmPassword !== formData.password && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-red-400 text-xs ml-1 mt-1.5 font-medium flex items-center"
                      >
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {authT.errMatch}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
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
                    {authT.resetBtn}
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
              <h2 className="text-2xl font-bold text-white">{authT.resetSuccess}</h2>
              <p className="text-gray-400 text-sm leading-relaxed px-4">
                Mật khẩu của bạn đã được khôi phục. Đang chuyển về trang đăng nhập...
              </p>
            </div>
            <div className="pt-4 flex justify-center">
               <Loader2 className="animate-spin h-6 w-6 text-cyan-400" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  const { lang, t } = useLang();
  const authT = t.auth;

  return (
    <div className="min-h-screen flex bg-[#020817] font-sans h-full">
      {/* Left Column - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-10 relative overflow-y-auto">
        <Suspense fallback={<Loader2 className="animate-spin h-8 w-8 text-cyan-500" />}>
          <ResetPasswordForm />
        </Suspense>
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
