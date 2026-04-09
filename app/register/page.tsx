"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoveRight, Mail, Lock, User, Loader2, Eye, EyeOff, Compass, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { AuthBackground } from "@/components/ui/AuthBackground";
import { useToast } from "@/components/providers/ToastProvider";

const translations = {
  vi: {
    title: "Tạo tài khoản",
    desc: "Nhập thông tin của bạn bên dưới để đăng ký tài khoản.",
    namePlaceholder: "Họ và tên",
    emailPlaceholder: "name@example.com",
    pwdPlaceholder: "Tạo mật khẩu",
    pwdConfirmPlaceholder: "Xác nhận mật khẩu",
    submitBtn: "Tạo tài khoản",
    processing: "Đang xử lý...",
    haveAccount: "Đã có tài khoản?",
    signIn: "Đăng nhập",
    successMsg: "Đăng ký thành công! Đang chuyển trang...",
    syncTitle: "Lịch trình thông minh",
    syncDesc: "Tham gia cùng hàng ngàn du khách sử dụng hệ thống lên lộ trình và chia tiền thế hệ mới.",
    syncSubtitle: "Thiết kế chuyến đi hoàn hảo với AI.",
    errLength: "Mật khẩu phải có ít nhất 6 ký tự",
    errMatch: "Mật khẩu xác nhận không khớp"
  },
  en: {
    title: "Create an account",
    desc: "Enter your details below to create your account.",
    namePlaceholder: "Full Name",
    emailPlaceholder: "name@example.com",
    pwdPlaceholder: "Create a password",
    pwdConfirmPlaceholder: "Confirm password",
    submitBtn: "Create account",
    processing: "Creating account...",
    haveAccount: "Already have an account?",
    signIn: "Sign in",
    successMsg: "Registration successful! Redirecting...",
    syncTitle: "Intelligent Planning",
    syncDesc: "Join thousands of travelers using next-generation routing and expense tracking.",
    syncSubtitle: "Design your perfect journey with AI.",
    errLength: "Password must be at least 6 characters",
    errMatch: "Passwords do not match"
  }
};

export default function RegisterPage() {
  const router = useRouter();
  const { lang } = useLang();
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { showToast } = useToast();

  const t = translations[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password.length < 6) {
      showToast(t.errLength, "error");
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast(t.errMatch, "error");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setIsSuccess(true);
      showToast(t.successMsg, "success");
      setTimeout(() => {
        router.push("/login?registered=true");
      }, 1000);
    } catch (err: any) {
      showToast(err.message, "error");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#020817] font-sans h-full">
      {/* Left Column - Artistic Visual */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 1 }}
        className="hidden lg:flex lg:w-1/2 relative bg-[#020817] overflow-hidden justify-center items-center h-screen border-r border-white/5"
      >
        <AuthBackground />

        {/* Glow Effects */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-600/30 rounded-full blur-[120px] z-10 pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-600/30 rounded-full blur-[120px] z-10 pointer-events-none"></div>
        
        {/* Backdrop Art (Grid/Mock UI) */}
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
          className="relative z-20 p-12 text-center max-w-lg"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-emerald-300 mb-8 backdrop-blur-sm shadow-xl shadow-emerald-900/20">
            <Compass className="h-4 w-4 text-emerald-400" />
            {t.syncTitle}
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            {t.syncSubtitle}
          </h2>
          <p className="text-lg text-cyan-100/70 leading-relaxed">
            {t.syncDesc}
          </p>
        </motion.div>
      </motion.div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-10 relative overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[360px] mx-auto space-y-4 relative z-10 py-8"
        >
          <div className="text-left mb-6">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{t.title}</h1>
            <p className="text-gray-400 text-sm">{t.desc}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 flex flex-col">
            {/* Local alerts removed in favor of global Toasts */}

            <div className="space-y-3">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-800 rounded-xl leading-5 bg-[#0a1128] text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-all shadow-inner"
                  placeholder={t.namePlaceholder}
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
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

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors opacity-70" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-800 rounded-xl leading-5 bg-[#0a1128] text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-all shadow-inner"
                  placeholder={t.pwdConfirmPlaceholder}
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || isSuccess}
              className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-lg shadow-cyan-600/20 text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-[#020817] transition-all disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
            >
              {(isLoading || isSuccess) ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 text-white mr-2" />
                  {t.processing}
                </>
              ) : (
                <>
                  {t.submitBtn}
                  <MoveRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-400">
            {t.haveAccount}{" "}
            <Link href="/login" className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
              {t.signIn}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
