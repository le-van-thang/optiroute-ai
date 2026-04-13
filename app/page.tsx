"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Map, Zap, Receipt, Compass, ChevronDown, MoveRight, Globe, Sparkles } from "lucide-react";
import { useRef } from "react";
import { useLang } from "@/components/providers/LangProvider";
import { useRouter } from "next/navigation";

export default function Home() {
  const { lang, t } = useLang();
  const homeT = t.home;
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div ref={containerRef} className="flex flex-col min-h-screen bg-background selection:bg-indigo-500/30">
      {/* Minimalist Hero Section */}
      <section className="relative h-[90vh] flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8">
        {/* Subtle Background effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-slate-600/5 rounded-full blur-[80px]"></div>
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
            <span>{homeT.badge}</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1]"
          >
            {homeT.title} <br />
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
            {homeT.subtitle}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-5 items-center justify-center font-bold"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/register"
                className="group relative px-10 py-4 bg-foreground text-background rounded-2xl font-bold text-lg transition-all shadow-soft flex items-center gap-2"
              >
                {homeT.ctaStart}
                <MoveRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/login"
                className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold text-lg transition-all backdrop-blur-xl"
              >
                {homeT.ctaSignIn}
              </Link>
            </motion.div>
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
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">{homeT.scrollHint}</span>
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
              {homeT.featuresTitle}
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto rounded-full"></div>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="group p-10 rounded-[2rem] bg-slate-900/40 border border-border backdrop-blur-md hover:border-indigo-500/30 transition-all duration-500"
            >
              <div className="bg-slate-900 p-4 rounded-2xl w-fit mb-8 border border-border group-hover:bg-indigo-500/10 transition-colors">
                <Map className="h-8 w-8 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">{homeT.feature1.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm font-medium">
                {homeT.feature1.desc}
              </p>
            </motion.div>
            
            {/* Feature 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="group p-10 rounded-[2rem] bg-slate-900/40 border border-border backdrop-blur-md hover:border-indigo-500/30 transition-all duration-500"
            >
              <div className="bg-slate-900 p-4 rounded-2xl w-fit mb-8 border border-border group-hover:bg-indigo-500/10 transition-colors">
                <Receipt className="h-8 w-8 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">{homeT.feature2.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm font-medium">
                {homeT.feature2.desc}
              </p>
            </motion.div>
            
            {/* Feature 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="group p-10 rounded-[2rem] bg-slate-900/40 border border-border backdrop-blur-md hover:border-indigo-500/30 transition-all duration-500"
            >
              <div className="bg-slate-900 p-4 rounded-2xl w-fit mb-8 border border-border group-hover:bg-indigo-500/10 transition-colors">
                <Globe className="h-8 w-8 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">{homeT.feature3.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm font-medium">
                {homeT.feature3.desc}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer / CTA Section */}
      <section className="py-32 relative overflow-hidden border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-black text-white mb-10">
              {homeT.ctaFooter}
            </h2>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/register"
                className="inline-flex px-12 py-5 bg-foreground text-background rounded-2xl font-black text-xl md:text-2xl transition-all shadow-soft"
              >
                {homeT.ctaJoin}
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
