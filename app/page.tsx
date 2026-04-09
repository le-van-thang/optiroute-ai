"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Map, Zap, Receipt, Compass, ChevronDown, MoveRight, Globe, Sparkles } from "lucide-react";
import { useRef } from "react";
import { useLang } from "@/components/providers/LangProvider";

const translations = {
  vi: {
    badge: "Trợ lý du lịch AI thế hệ mới",
    title: "Du lịch thông minh cùng",
    subtitle: "Công cụ lập kế hoạch hành trình thông minh và quản lý chi tiêu nhóm. Sử dụng sức mạnh của Gemini AI để điều phối chuyến đi hoàn hảo của bạn.",
    ctaStart: "Bắt đầu ngay",
    ctaSignIn: "Đăng nhập",
    featuresTitle: "Thiết kế chuyến đi hoàn hảo",
    scrollHint: "Khám phá tính năng",
    feature1: {
      title: "Lộ trình Thông minh (TSP)",
      desc: "Công cụ toán học giải quyết bài toán Người bán hàng (TSP) giúp bạn đi nhanh nhất giữa các điểm đến."
    },
    feature2: {
      title: "Chia hóa đơn (Split-Bill)",
      desc: "Thuật toán đồ thị giúp tối giản hóa nợ nhóm, giảm thiểu tối đa số lượng giao dịch cần trả nợ."
    },
    feature3: {
      title: "Bản đồ Tương tác",
      desc: "Tích hợp Leaflet và OpenStreetMap mang lại trải nghiệm bản đồ cao cấp với lộ trình hiển thị thời gian thực."
    },
    ctaFooter: "Sẵn sàng cho chuyến phiêu lưu tiếp theo?",
    ctaJoin: "Tham gia OptiRoute ngay"
  },
  en: {
    badge: "Next-Gen AI Travel Concierge",
    title: "Travel Smarter with",
    subtitle: "The ultimate smart itinerary planner and split-bill ledger. Harness the power of Gemini AI to orchestrate your perfect journey.",
    ctaStart: "Get Started Free",
    ctaSignIn: "Sign In",
    featuresTitle: "Engineering the Perfect Trip",
    scrollHint: "Discover Features",
    feature1: {
      title: "Smart Routes (TSP)",
      desc: "Our mathematical engine solves the complex Traveling Salesperson Problem to ensure you take the fastest route."
    },
    feature2: {
      title: "Split-Bill Ledger",
      desc: "Graph algorithms intelligently simplify group debts locally, minimizing the number of playback transactions."
    },
    feature3: {
      title: "Interactive Maps",
      desc: "Built-in Leaflet and OpenStreetMap integration gives you a premium mapping experience with real-time visualization."
    },
    ctaFooter: "Ready for your next adventure?",
    ctaJoin: "Join OptiRoute today"
  }
};

export default function Home() {
  const { lang } = useLang();
  const t = translations[lang];
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div ref={containerRef} className="flex flex-col min-h-screen bg-[#020817] selection:bg-indigo-500/30">
      {/* Immersive Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8">
        {/* Advanced Background effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px]"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none"></div>
        </div>

        <motion.div 
          style={{ y: y1, opacity }}
          className="relative z-10 flex flex-col items-center text-center max-w-5xl"
        >
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-indigo-300 mb-8 backdrop-blur-md shadow-2xl"
          >
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>{t.badge}</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1]"
          >
            {t.title} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 drop-shadow-sm">
              OptiRoute AI
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl text-lg md:text-xl text-slate-400 font-light mb-10 leading-relaxed"
          >
            {t.subtitle}
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-5 items-center justify-center font-bold"
          >
            <Link
              href="/register"
              className="group relative px-10 py-4 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl font-bold text-lg transition-all shadow-[0_10px_40px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_60px_rgba(79,70,229,0.5)] flex items-center gap-2"
            >
              {t.ctaStart}
              <MoveRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold text-lg transition-all backdrop-blur-xl"
            >
              {t.ctaSignIn}
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500/60 cursor-pointer hover:text-indigo-400 transition-colors z-20"
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
        >
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">{t.scrollHint}</span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-32 relative z-10 bg-[#020817]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-24"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-6">
              {t.featuresTitle}
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto rounded-full"></div>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -10 }}
              className="group p-10 rounded-[2.5rem] bg-indigo-950/20 border border-indigo-500/10 backdrop-blur-md hover:border-indigo-500/30 transition-all duration-500"
            >
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-2xl w-fit mb-8 shadow-xl shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                <Map className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">{t.feature1.title}</h3>
              <p className="text-slate-400 leading-relaxed text-lg">
                {t.feature1.desc}
              </p>
            </motion.div>
            
            {/* Feature 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -10 }}
              className="group p-10 rounded-[2.5rem] bg-purple-950/20 border border-purple-500/10 backdrop-blur-md hover:border-purple-500/30 transition-all duration-500"
            >
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-2xl w-fit mb-8 shadow-xl shadow-purple-500/20 group-hover:scale-110 transition-transform">
                <Receipt className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">{t.feature2.title}</h3>
              <p className="text-slate-400 leading-relaxed text-lg">
                {t.feature2.desc}
              </p>
            </motion.div>
            
            {/* Feature 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -10 }}
              className="group p-10 rounded-[2.5rem] bg-cyan-950/20 border border-cyan-500/10 backdrop-blur-md hover:border-cyan-500/30 transition-all duration-500"
            >
              <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-4 rounded-2xl w-fit mb-8 shadow-xl shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">{t.feature3.title}</h3>
              <p className="text-slate-400 leading-relaxed text-lg">
                {t.feature3.desc}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer / CTA Section */}
      <section className="py-32 relative overflow-hidden bg-[#0a1128] border-t border-white/5">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-black text-white mb-10">
              {t.ctaFooter}
            </h2>
            <Link
              href="/register"
              className="inline-flex px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-xl md:text-2xl transition-all shadow-[0_20px_60px_rgba(79,70,229,0.3)] hover:-translate-y-2"
            >
              {t.ctaJoin}
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
