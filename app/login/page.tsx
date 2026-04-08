"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MoveRight, Mail, Lock, Loader2, Eye, EyeOff, MapPin, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { AuthBackground } from "@/components/ui/AuthBackground";

const translations = {
  vi: {
    welcomeTitle: "Chào mừng trở lại",
    welcomeDesc: "Đăng nhập vào tài khoản OptiRoute AI để tiếp tục.",
    emailPlaceholder: "name@example.com",
    pwdPlaceholder: "Mật khẩu",
    remember: "Ghi nhớ đăng nhập",
    forgot: "Quên mật khẩu?",
    signInBtn: "Đăng nhập",
    signingIn: "Đang xử lý...",
    orContinue: "Hoặc tiếp tục với",
    noAccount: "Chưa có tài khoản?",
    signUp: "Đăng ký ngay",
    successMsg: "Đăng nhập thành công! Đang chuyển hướng...",
    invalidMsg: "Email hoặc mật khẩu không chính xác.",
    syncTitle: "Hành trình đồng bộ",
    syncDesc: "Lên kế hoạch thông minh, chia tiền nhanh gọn. Trợ lý du lịch của bạn được đồng bộ trên mọi thiết bị.",
    resetSent: "Mật khẩu mới đã được gửi về email của bạn!",
    regSuccess: "Tạo tài khoản thành công! Vui lòng đăng nhập."
  },
  en: {
    welcomeTitle: "Welcome back",
    welcomeDesc: "Log in to your OptiRoute AI account to continue.",
    emailPlaceholder: "name@example.com",
    pwdPlaceholder: "Password",
    remember: "Remember me",
    forgot: "Forgot password?",
    signInBtn: "Sign in",
    signingIn: "Signing in...",
    orContinue: "Or continue with",
    noAccount: "Don't have an account?",
    signUp: "Sign up",
    successMsg: "Sign in successful! Redirecting...",
    invalidMsg: "Invalid email or password.",
    syncTitle: "Synchronized Journeys",
    syncDesc: "Plan globally, split locally. Your smart travel companion synchronized across all your devices.",
    resetSent: "Recovery instructions have been sent to your email!",
    regSuccess: "Account created successfully! Please sign in."
  }
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLang();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    if (searchParams?.get("registered") === "true") {
      setMessage(t.regSuccess);
    }
    if (searchParams?.get("error")) {
      setError(t.invalidMsg);
    }
  }, [searchParams, lang]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    const res = await signIn("credentials", {
      redirect: false,
      email: formData.email,
      password: formData.password,
    });

    if (res?.error) {
      setIsLoading(false);
      setError(t.invalidMsg);
    } else {
      setIsSuccess(true);
      setMessage(t.successMsg);
      // Wait a moment for the animation before fully redirecting
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1000);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    if (provider === 'google') setIsGoogleLoading(true);
    else setIsFacebookLoading(true);
    
    await signIn(provider, { callbackUrl: "/dashboard" });
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setMessage(t.resetSent);
    setError("");
  };

  return (
    <div className="min-h-screen flex bg-[#020817] font-sans h-full">
      {/* Left Column - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-10 relative">
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[360px] mx-auto space-y-4 relative z-10 py-8"
        >
          <div className="text-left mb-6">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{t.welcomeTitle}</h1>
            <p className="text-gray-400 text-sm">{t.welcomeDesc}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 flex flex-col">
            <AnimatePresence mode="popLayout">
              {message && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }} 
                  animate={{ opacity: 1, height: "auto", y: 0 }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-900/50 rounded-lg flex items-center gap-2 overflow-hidden"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  {message}
                </motion.div>
              )}
              
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }} 
                  animate={{ opacity: 1, height: "auto", y: 0 }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 text-sm text-rose-300 bg-rose-950/40 border border-rose-900/50 rounded-lg flex items-center gap-2 overflow-hidden"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0"></span>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                {/* AutoComplete enabled by NOT setting it to 'off' */}
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-800 rounded-xl leading-5 bg-[#0a1128] text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-all shadow-inner"
                  placeholder={t.emailPlaceholder}
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-800 rounded-xl leading-5 bg-[#0a1128] text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-all shadow-inner"
                  placeholder={t.pwdPlaceholder}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-cyan-400 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-800 rounded bg-[#0a1128]"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400 select-none">
                  {t.remember}
                </label>
              </div>

              <div className="text-sm">
                <button onClick={handleForgotPassword} type="button" className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                  {t.forgot}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || isSuccess}
              className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-lg shadow-cyan-600/20 text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-[#020817] transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {(isLoading || isSuccess) ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 text-white mr-2" />
                  {t.signingIn}
                </>
              ) : (
                <>
                  {t.signInBtn}
                  <MoveRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#020817] text-gray-500">{t.orContinue}</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleOAuthLogin('google')}
                disabled={isGoogleLoading || isFacebookLoading || isSuccess}
                className="w-full inline-flex justify-center py-2 px-4 rounded-xl border border-gray-800 bg-[#0a1128] text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors shadow-sm disabled:opacity-50"
              >
                {isGoogleLoading ? <Loader2 className="animate-spin h-5 w-5 text-cyan-400" /> : (
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                )}
                <span className="ml-2">Google</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleOAuthLogin('facebook')}
                disabled={isGoogleLoading || isFacebookLoading || isSuccess}
                className="w-full inline-flex justify-center py-2 px-4 rounded-xl border border-gray-800 bg-[#0a1128] text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors shadow-sm disabled:opacity-50"
              >
                {isFacebookLoading ? <Loader2 className="animate-spin h-5 w-5 text-cyan-400" /> : (
                  <svg className="w-5 h-5 flex-shrink-0 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="ml-2">Facebook</span>
              </motion.button>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-gray-400">
            {t.noAccount}{" "}
            <Link href="/register" className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
              {t.signUp}
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Column - Artistic Visual */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 1 }}
        className="hidden lg:flex lg:w-1/2 relative bg-[#020817] overflow-hidden justify-center items-center h-full"
      >
        <AuthBackground />
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 right-20 w-96 h-96 bg-emerald-600/20 rounded-full blur-[120px] z-10 pointer-events-none"></div>
        <div className="absolute bottom-1/4 left-20 w-96 h-96 bg-cyan-600/30 rounded-full blur-[120px] z-10 pointer-events-none"></div>
        
        {/* Backdrop Art */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="relative z-10 p-12 text-center max-w-lg"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-emerald-300 mb-8 backdrop-blur-sm shadow-xl shadow-emerald-900/20">
            <MapPin className="h-4 w-4 text-emerald-400" />
            {t.syncTitle}
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            Seamless access to your itineraries.
          </h2>
          <p className="text-lg text-cyan-100/70 leading-relaxed">
            {t.syncDesc}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
