"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Mail, Loader2, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, Send } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/providers/ToastProvider";
import { AuthBackground } from "@/components/ui/AuthBackground";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams?.get("email") || "";
  const { showToast } = useToast();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (!email) {
      router.push("/register");
    }
  }, [email, router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleChange = (index: number, value: string) => {
    // Handle paste logic
    if (value.length > 1) {
      const pastedData = value.slice(0, 6).split("");
      const newCode = [...code];
      pastedData.forEach((char, i) => {
        if (index + i < 6 && /^\d$/.test(char)) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);
      // Focus the next empty input or the last one
      const nextIdx = Math.min(index + pastedData.length, 5);
      document.getElementById(`otp-${nextIdx}`)?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto focus next input with a slight delay to ensure state update
    if (value && index < 5) {
      setTimeout(() => {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }, 10);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otp = code.join("");
    if (otp.length !== 6) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsSuccess(true);
        showToast("Xác thực email thành công!", "success");
        setTimeout(() => {
          router.push("/login?verified=true");
        }, 2000);
      } else {
        setError(data.error || "Mã xác thực không đúng");
        showToast(data.error || "Mã xác thực không đúng", "error");
      }
    } catch (error) {
      setError("Đã có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    
    setIsResending(true);
    try {
      const res = await fetch("/api/register/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        showToast("Mã mới đã được gửi vào email!", "success");
        setResendCountdown(60);
      } else {
        const data = await res.json();
        showToast(data.error || "Không thể gửi lại mã", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối", "error");
    } finally {
      setIsResending(false);
    }
  };

  // If all digits are entered, auto-verify
  useEffect(() => {
    if (code.every(digit => digit !== "") && !isLoading && !isSuccess) {
      handleVerify();
    }
  }, [code]);

  const sentRef = useRef(false);

  // Initial auto-resend if coming from login with 'resend' flag
  useEffect(() => {
    const resend = searchParams?.get("resend");
    if (resend === "true" && email && !isResending && resendCountdown === 0 && !sentRef.current) {
      sentRef.current = true;
      handleResend();
      
      // Clean up URL to prevent resend on refresh
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("resend");
      const newPath = newParams.toString() 
        ? `/register/verify?${newParams.toString()}` 
        : '/register/verify';
      window.history.replaceState(null, '', newPath);
    }
  }, [searchParams, email]);

  return (
    <div className="min-h-screen flex bg-[#020817] font-sans h-full relative overflow-hidden">
      <AuthBackground />
      
      {/* Glow Effects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full h-screen flex items-center justify-center px-4 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[440px]"
        >
          <div className="bg-[#0a1128]/80 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 md:p-10 shadow-[0_0_80px_rgba(0,0,0,0.5)] relative overflow-hidden">
            
            {/* Animated subtle border glow */}
            <motion.div 
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 border border-cyan-500/10 rounded-[40px] pointer-events-none"
            />

            <Link href="/register" className="inline-flex items-center text-sm text-gray-500 hover:text-white transition-colors mb-8 group">
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Quay lại đăng ký
            </Link>

            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan-500/10 border border-cyan-500/20 rounded-3xl mb-6 relative">
                <Mail className="w-10 h-10 text-cyan-400" />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0, 0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-cyan-400/20 rounded-3xl"
                />
              </div>
              <h1 className="text-3xl font-black text-white mb-3 tracking-tight">Xác thực Email</h1>
              <p className="text-gray-400 text-sm leading-relaxed px-4">
                Chúng tôi đã gửi mã OTP 6 chữ số đến <span className="text-cyan-400 font-bold">{email}</span>. Vui lòng kiểm tra hộp thư đến.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-8">
              <div className="flex justify-between gap-2 sm:gap-3">
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`w-full h-14 sm:h-16 text-center text-2xl font-black rounded-2xl border transition-all outline-none
                      ${error ? 'border-red-500/50 bg-red-500/5 text-red-400' : 'border-white/10 bg-white/5 text-white focus:border-cyan-500/50 focus:bg-cyan-500/5 focus:ring-4 focus:ring-cyan-500/10'}
                    `}
                    disabled={isLoading || isSuccess}
                  />
                ))}
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 text-red-400 text-sm"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {isSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-2"
                  >
                    <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="text-emerald-400 font-bold">Xác thực thành công!</p>
                  </motion.div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading || code.some(d => !d)}
                    className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold flex items-center justify-center transition-all shadow-xl shadow-cyan-900/40"
                  >
                    {isLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 mr-2" />
                        Xác nhận mã OTP
                      </>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCountdown > 0 || isResending || isLoading}
                  className="text-sm font-medium text-gray-500 hover:text-cyan-400 transition-colors disabled:opacity-50 inline-flex items-center"
                >
                  {resendCountdown > 0 ? (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Gửi lại mã sau {resendCountdown}s
                    </>
                  ) : (
                    <>
                      <RefreshCw className={`w-4 h-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
                      {isResending ? 'Đang gửi...' : 'Không nhận được mã? Gửi lại ngay'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          
          <p className="text-center mt-8 text-gray-500 text-sm">
            Bằng cách xác thực, bạn đồng ý với{" "}
            <Link href="/terms" className="text-white hover:text-cyan-400 underline underline-offset-4">Điều khoản dịch vụ</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020817] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
