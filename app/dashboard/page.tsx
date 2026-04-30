"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { Map, Plane, Wallet, Sparkles, Clock, ArrowRight, MapPin, Plus, Loader2, X, Search, Trash2, ChevronRight, Tag, TrendingUp, AlertCircle, Bike } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchPromptChips } from "@/components/itinerary/SearchPromptChips";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

import { useToast } from "@/components/providers/ToastProvider";
import { PremiumModal } from "@/components/ui/PremiumModal";
import { WeatherDetailModal } from "@/components/weather/WeatherDetailModal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function DashboardPage() {
  const { lang, t } = useLang();
  const { data: session } = useSession();
  const dashT = t.dashboard;
  const commonT = t.common;
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [error, setError] = useState("");
  const { showToast } = useToast();
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; tripId: string | null }>({
    isOpen: false,
    tripId: null,
  });

  const { data: trips, mutate: mutateTrips, isLoading: isTripsLoading } = useSWR("/api/trips", fetcher);
  const { data: expenses, isLoading: isExpensesLoading } = useSWR("/api/expenses", fetcher);

  const [dynamicCity, setDynamicCity] = useState("Hà Nội");
  
  // Premium Weather Widget State
  const [dashboardWeather, setDashboardWeather] = useState<any>(null);
  const [weatherTargetCity, setWeatherTargetCity] = useState("");
  const [isWeatherDestination, setIsWeatherDestination] = useState(false);
  const [isWeatherPreview, setIsWeatherPreview] = useState(false); // true when previewing typed search
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [userGpsLocation, setUserGpsLocation] = useState<{ city: string; lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'pending' | 'resolved' | 'error'>('pending');
  
  // Weather Detail Modal
  const [isWeatherDetailOpen, setIsWeatherDetailOpen] = useState(false);

  const fetchWeatherForCity = async (city: string, isPreview = false, isDestination = false) => {
    if (!city || !process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) return;
    setIsFetchingWeather(true);
    try {
      const geoRes = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(city)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&limit=1&country=vn`);
      const geoData = await geoRes.json();
      if (geoData.features && geoData.features.length > 0) {
        const lat = geoData.features[0].center[1];
        const lng = geoData.features[0].center[0];
        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&timezone=Asia/Bangkok`);
        const wData = await wRes.json();
        setDashboardWeather(wData.current);
        setWeatherTargetCity(city);
        setIsWeatherDestination(isDestination);
        setIsWeatherPreview(isPreview);
      }
    } catch (err) {
      console.error("Dashboard weather fetch failed", err);
    } finally {
      setIsFetchingWeather(false);
    }
  };

  useEffect(() => {
    // Phase 1: Try GPS Geolocation for a truly personalized experience
    if ("geolocation" in navigator) {
      // Set a fallback timeout in case GPS prompt is ignored
      const fallbackTimer = setTimeout(() => {
        setGpsStatus(prev => prev === 'pending' ? 'error' : prev);
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(fallbackTimer);
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&types=place&limit=1`);
            const data = await res.json();
            if (data.features?.[0]) {
              const cityName = data.features[0].text;
              setUserGpsLocation({ city: cityName, lat: latitude, lng: longitude });
            }
          } catch (err) {
            console.error("GPS Reverse Geocoding failed", err);
          } finally {
            setGpsStatus('resolved');
          }
        },
        () => {
          clearTimeout(fallbackTimer);
          setGpsStatus('error');
        },
        { timeout: 5000 }
      );
    } else {
      setGpsStatus('error');
    }
  }, []);

  useEffect(() => {
    // Priority Resolution
    if (prompt.trim()) return;

    // Wait until we have a definitive answer from both trips API and GPS
    if (isTripsLoading || gpsStatus === 'pending') return;

    // Priority 1: User's Actual GPS Location (Local Weather)
    if (userGpsLocation) {
      fetchWeatherForCity(userGpsLocation.city, false, false);
    } 
    // Priority 2: Upcoming Trip Destination
    else if (trips && trips.length > 0 && trips[0].city) {
      fetchWeatherForCity(trips[0].city, false, true);
    } 
    // Final Fallback
    else {
      fetchWeatherForCity("Hà Nội", false, false);
    }
  }, [trips, userGpsLocation, isTripsLoading, gpsStatus, prompt]);

  // Live weather preview when user types in search box (debounced 800ms)
  useEffect(() => {
    if (!prompt.trim() || prompt.trim().length < 3) {
      // If search cleared, revert back
      if (!isWeatherPreview) return;
      
      if (userGpsLocation) {
        fetchWeatherForCity(userGpsLocation.city, false, false);
      } else if (trips && trips.length > 0 && trips[0].city) {
        fetchWeatherForCity(trips[0].city, false, true);
      } else {
        fetchWeatherForCity("Hà Nội", false, false);
      }
      return;
    }
    const debounce = setTimeout(() => {
      // Extract location name from prompt: take first meaningful noun phrase
      const locationMatch = prompt.match(/([\p{L}\s]+?)(?:\s+\d+\s*(?:ngày|day|đêm|night))?$/iu);
      const searchCity = locationMatch?.[1]?.trim() || prompt.trim();
      fetchWeatherForCity(searchCity, true, false);
    }, 800);
    return () => clearTimeout(debounce);
  }, [prompt]);

  const COLORS = ['#22d3ee', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
  
  const chartData = expenses && expenses.length > 0 ? expenses.map((exp: any) => ({
    name: exp.title,
    value: exp.totalAmount
  })) : [];

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) {
      setError(lang === "vi" ? "Vui lòng cho tôi biết ý tưởng chuyến đi của bạn!" : "Please tell me about your trip idea!");
      return;
    }
    
    setIsSubmitting(true);
    setError("");

    try {
      // Step 1: AI Parsing of the prompt
      setSubmittingStep(lang === "vi" ? "AI đang dịch ý tưởng của bạn..." : "AI is translating your vision...");
      const parseRes = await fetch("/api/trips/ai-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, lang }),
      });
      
      if (!parseRes.ok) throw new Error("AI parsing failed");
      const aiData = await parseRes.json();

      // Step 2: Create the trip with enriched data
      setSubmittingStep(lang === "vi" ? "Đang chuẩn bị cẩm nang điểm đến..." : "Preparing destination guide...");
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: aiData.title,
          city: aiData.city,
          intent: aiData.intent,
          cityWiki: aiData.wiki,
          estimatedBudget: aiData.estimatedBudgetPerDay * aiData.days,
          // Calculate start/end dates based on suggested days
          startDate: new Date(),
          endDate: new Date(Date.now() + aiData.days * 24 * 60 * 60 * 1000)
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create trip");
      }

      const newTrip = await res.json();
      await mutateTrips();
      setIsModalOpen(false);
      setAiPrompt("");
      showToast(lang === "vi" ? "AI đã sẵn sàng hành trình cho bạn!" : "AI has prepared your itinerary!", "success");
      
      // Auto-redirect to the itinerary page
      router.push(`/itinerary?tripId=${newTrip.id}`);
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirm = (e: React.MouseEvent, tripId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, tripId });
  };

  const handleDeleteTrip = async () => {
    if (!deleteConfirm.tripId) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${deleteConfirm.tripId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete trip");
      await mutateTrips();
      showToast(lang === "vi" ? "Đã xóa chuyến đi thành công" : "Trip deleted successfully", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
      setDeleteConfirm({ isOpen: false, tripId: null });
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-purple-500/5 blur-[100px] rounded-full" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-black text-foreground tracking-tight">{dashT.welcome}</h1>
          <p className="text-slate-500 font-medium mt-1 mb-8">
            {dashT.subtitle} <span className="text-indigo-400">{session?.user?.name || commonT.explorer}</span>
          </p>

          <div className="max-w-3xl">
            <div className="relative group mb-4">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (prompt.trim()) router.push(`/itinerary?q=${encodeURIComponent(prompt)}`);
                  }
                }}
                placeholder={lang === "vi" ? "Bạn muốn đi đâu tiếp theo?" : "Where to go next?"}
                className="relative w-full pl-5 pr-14 py-4 bg-slate-900/80 border border-white/10 rounded-2xl text-sm placeholder:text-slate-500 focus:bg-slate-900 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-2xl text-white"
              />
              <button
                disabled={!prompt.trim()}
                onClick={() => {
                  if (prompt.trim()) router.push(`/itinerary?q=${encodeURIComponent(prompt)}`);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg disabled:opacity-30 disabled:scale-100 transition-all flex items-center justify-center hover:bg-indigo-500 hover:shadow-indigo-500/25 active:scale-95"
              >
                <Search className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>
            <SearchPromptChips 
              onSelect={(text) => router.push(`/itinerary?q=${encodeURIComponent(text)}`)} 
            />
          </div>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Upcoming Trips Panel */}
          <motion.div variants={itemVariants} className="lg:col-span-2 bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2 mb-1">
                  <Plane className="w-4 h-4" />
                  {dashT.upcomingTrips}
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{trips?.length || 0} {lang === "vi" ? "Hành trình" : "Trips"}</p>
              </div>
              <div className="flex items-center gap-3">
                <motion.button 
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(79, 70, 229, 1)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <Plus className="w-4 h-4" strokeWidth={3} />
                  {lang === "vi" ? "Tạo chuyến đi" : "Add Trip"}
                </motion.button>
              </div>
            </div>
            
            {isTripsLoading ? (
              <div className="p-6 flex justify-center items-center h-40">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
              </div>
            ) : trips && trips.length > 0 ? (
               <div className="p-6 grid grid-cols-1 gap-6">
                 {trips.map((trip: any) => (
                   <motion.div 
                     whileHover={{ y: -6, scale: 1.01 }}
                     key={trip.id} 
                     className="relative bg-slate-950/60 border border-white/5 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-8 transition-all group cursor-pointer overflow-hidden backdrop-blur-xl shadow-2xl"
                   >
                     {/* Neon Glow Border Effect */}
                     <div className="absolute inset-0 border border-white/10 rounded-[2.5rem] group-hover:border-indigo-500/50 transition-all duration-500" />
                     <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500/20 via-transparent to-cyan-500/20 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />

                     {/* Ambient Mesh Background */}
                     <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/3 opacity-0 group-hover:opacity-100 transition-all duration-700" />

                     {/* Route Visualization */}
                     <div className="flex-1 w-full flex items-center justify-between gap-4 max-w-sm relative z-10">
                       <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-lg group-hover:bg-indigo-500/10 group-hover:border-indigo-500/40 group-hover:shadow-indigo-500/20 transition-all duration-300">
                            <MapPin className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                          </div>
                          <span className="text-[10px] font-black text-slate-600 mt-2 uppercase tracking-tighter">{lang === "vi" ? "Khởi hành" : "Depart"}</span>
                       </div>
                       
                       <div className="flex-1 flex flex-col items-center justify-center relative px-4">
                          <div className="w-full h-8 flex items-center relative overflow-hidden">
                            <div className="absolute left-1 right-1 h-[2px] bg-gradient-to-r from-indigo-500/20 via-indigo-500/40 to-cyan-500/20 rounded-full" />
                            <motion.div
                              animate={{ x: ["-15%", "95%"] }}
                              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                              className="absolute inset-0 flex items-center gap-1">
                               {[1, 2, 3].map((i) => (
                                 <ChevronRight key={i} className="w-3 h-3 text-cyan-400 opacity-40" strokeWidth={4} />
                               ))}
                               <Bike className="w-5 h-5 text-cyan-400 fill-cyan-400/20 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                            </motion.div>
                          </div>
                         <span className="text-[11px] font-bold text-indigo-400/80 mt-3 flex items-center gap-1.5 uppercase tracking-wide">
                           <Sparkles className="w-3 h-3" />
                           {lang === "vi" ? "Đang phượt" : "Phượt Core"}
                         </span>
                       </div>

                       <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-lg group-hover:bg-cyan-500/10 group-hover:border-cyan-500/40 group-hover:shadow-cyan-500/20 transition-all duration-300">
                            <MapPin className="w-5 h-5 text-cyan-400" />
                          </div>
                          <span className="text-[10px] font-black text-white mt-2 uppercase tracking-tighter truncate max-w-[100px] text-center">{trip.city || "Unknown"}</span>
                       </div>
                     </div>

                     {/* Trip Info Details */}
                     <div className="flex-1 w-full relative z-10">
                       <div className="flex items-center gap-2 mb-1">
                         <h3 className="text-lg font-black text-white tracking-tight leading-none">{trip.title}</h3>
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                       </div>
                       <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                         <Clock className="w-3 h-3" />
                         {new Date(trip.createdAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                       </p>
                     </div>

                     <div className="flex items-center gap-3 relative z-10">
                       <motion.button
                          whileHover={{ scale: 1.1, backgroundColor: 'rgba(244, 63, 94, 0.1)' }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => openDeleteConfirm(e, trip.id)}
                          className="p-3 rounded-2xl bg-white/5 border border-white/5 text-slate-500 hover:text-rose-400 transition-all"
                       >
                          <Trash2 className="w-5 h-5" />
                       </motion.button>
                       <Link href={`/itinerary?tripId=${trip.id}`} className="p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all">
                          <ChevronRight className="w-6 h-6" strokeWidth={3} />
                       </Link>
                     </div>
                   </motion.div>
                 ))}
               </div>
            ) : (
              <div className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                  <Map className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-400 mb-4">{dashT.noTrips}</p>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20"
                >
                  {dashT.createTrip}
                </motion.button>
              </div>
            )}
          </motion.div>

          {/* Right Column: AI, Weather & Expenses */}
          <div className="flex flex-col gap-6 h-fit self-start w-full lg:-mt-[120px] relative z-20">
            
            {/* Premium Interactive Weather Environment */}
            {dashboardWeather && (
              <motion.div 
                variants={itemVariants} 
                onClick={() => setIsWeatherDetailOpen(true)}
                className="relative rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] group h-[250px] cursor-pointer hover:scale-[1.02] transition-transform"
              >
                {/* Subdued Premium Weather Background */}
                <div className={`absolute inset-0 transition-colors duration-1000 ${
                  dashboardWeather.weather_code <= 3 
                    ? (dashboardWeather.is_day === 1 
                        ? 'bg-gradient-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0284c7]' // iOS Light Blue Day
                        : 'bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#1e3a8a]') // Pro Navy Night
                    : (dashboardWeather.weather_code >= 51 && dashboardWeather.weather_code <= 67) || (dashboardWeather.weather_code >= 80 && dashboardWeather.weather_code <= 82)
                      ? 'bg-gradient-to-br from-[#475569] via-[#1e293b] to-[#0f172a]' // Gloomy/Rainy
                      : 'bg-gradient-to-br from-[#1e1b4b] to-[#020617]' // Stormy
                }`} />
                
                {/* Animated Particles / Ambient Glow */}
                <div className="absolute inset-0 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay" />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/20 blur-[80px] rounded-full group-hover:scale-150 transition-transform duration-700" />
                
                <div className="relative h-full p-8 flex flex-col justify-between z-10 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-1 text-white/90 drop-shadow-md">
                        <MapPin className="w-4 h-4" />
                        {weatherTargetCity}
                        {isFetchingWeather && <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
                      </h2>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                        {isWeatherPreview
                          ? (lang === "vi" ? "🔍 Xem trước thời tiết" : "🔍 Weather Preview")
                          : isWeatherDestination
                          ? (lang === "vi" ? "Dự báo điểm đến sắp tới" : "Destination Forecast")
                          : (lang === "vi" ? "Thời tiết tại vị trí của bạn" : "Local Weather")}
                      </p>
                    </div>
                    
                    {/* Floating Giant Icon */}
                    <motion.div 
                      animate={{ y: [0, -10, 0] }} 
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                      className="text-7xl filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
                    >
                      {dashboardWeather.weather_code === 0 ? "☀️" : 
                       dashboardWeather.weather_code <= 3 ? "⛅" : 
                       (dashboardWeather.weather_code === 45 || dashboardWeather.weather_code === 48) ? "🌫️" :
                       (dashboardWeather.weather_code >= 51 && dashboardWeather.weather_code <= 67) ? "🌧️" :
                       (dashboardWeather.weather_code >= 71 && dashboardWeather.weather_code <= 77) ? "❄️" :
                       (dashboardWeather.weather_code >= 80 && dashboardWeather.weather_code <= 82) ? "🌧️" :
                       (dashboardWeather.weather_code >= 95 && dashboardWeather.weather_code <= 99) ? "⛈️" : "☁️"}
                    </motion.div>
                  </div>
                  
                  <div className="flex items-end justify-between w-full">
                    <div className="flex items-end gap-3">
                      <h3 className="text-7xl font-black tracking-tighter drop-shadow-lg leading-none">{Math.round(dashboardWeather.temperature_2m)}°</h3>
                      <div className="pb-2">
                        <span className="text-sm font-bold text-white/80 drop-shadow">Cảm giác {Math.round(dashboardWeather.temperature_2m + 1)}°</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 backdrop-blur-md bg-black/20 p-3 rounded-2xl border border-white/10">
                      <div className="text-center">
                         <p className="text-[9px] font-black uppercase text-white/60 mb-0.5">Độ ẩm</p>
                         <p className="text-sm font-bold">{dashboardWeather.relative_humidity_2m}%</p>
                      </div>
                      <div className="w-px bg-white/20" />
                      <div className="text-center">
                         <p className="text-[9px] font-black uppercase text-white/60 mb-0.5">Gió</p>
                         <p className="text-sm font-bold">{dashboardWeather.wind_speed_10m} km/h</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Expense Analytics */}
            <motion.div variants={itemVariants} className="bg-slate-900/40 border border-border rounded-[2.5rem] overflow-hidden shadow-soft relative flex flex-col min-h-[250px]">
              <div className="p-6 border-b border-border">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  {dashT.expenseAnalytics}
                </h2>
              </div>
              <div className="flex-1 p-4 relative">
                {isExpensesLoading && !expenses ? (
                  <div className="absolute inset-0 flex justify-center items-center">
                    <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                    <PieChart>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#020817', borderColor: '#ffffff20', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: any) => `${Number(value).toLocaleString()} VND`}
                      />
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-slate-900/50 to-indigo-950/20 backdrop-blur-sm rounded-2xl border border-indigo-500/10 m-4">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                      <Wallet className="w-8 h-8 text-indigo-400 opacity-80" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-white/80 mb-2">Chưa có dữ liệu chi tiêu</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed max-w-[200px]">Hãy thêm khoản chi phí đầu tiên trong Hành trình để AI bắt đầu phân tích biểu đồ tài chính cho bạn.</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Recent Expenses */}
            <motion.div variants={itemVariants} className="bg-slate-900/40 border border-border rounded-[2.5rem] overflow-hidden shadow-soft">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-3">
                  <Wallet className="w-4 h-4 text-indigo-400" />
                  {dashT.recentExpenses}
                </h2>
                <Link href="/split-bill" className="text-slate-500 hover:text-foreground transition-all">
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              
              {isExpensesLoading && !expenses ? (
                <div className="p-6 flex justify-center items-center h-full">
                  <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                </div>
              ) : expenses && expenses.length > 0 ? (
                <div className="flex flex-col dividing-y divide-white/5">
                  {expenses.slice(0, 3).map((exp: any) => (
                    <div key={exp.id} className="p-5 flex justify-between items-center hover:bg-slate-950/40 transition-colors border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-bold text-foreground">{exp.title}</p>
                        <p className="text-[10px] text-slate-500 font-mono tracking-tighter mt-0.5">{new Date(exp.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm font-black text-indigo-400">{exp.totalAmount.toLocaleString()} VND</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 flex flex-col items-center justify-center min-h-[180px] bg-slate-900/20 m-4 rounded-2xl border border-dashed border-slate-700">
                  <div className="flex gap-2 mb-4 opacity-30">
                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse delay-75"></div>
                    <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse delay-150"></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Lịch sử trống</p>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Create Trip Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#020817]/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-lg bg-[#0a1128]/90 border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(79,70,229,0.2)] overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Top Accent Bar */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-500" />
              
              <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center relative shrink-0">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white mb-1">{dashT.createTripTitle}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                    {lang === "vi" ? "Bắt đầu hành trình mới cùng AI" : "Start your AI voyage"}
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-2.5 rounded-2xl bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateTrip} className="flex flex-col min-h-0 overflow-hidden">
                <div className="p-8 space-y-6 overflow-y-auto">
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      className="text-xs text-rose-400 bg-rose-400/5 p-4 rounded-2xl border border-rose-400/10 font-bold flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </motion.p>
                  )}
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 ml-1 flex items-center gap-2">
                         <Sparkles className="w-3.5 h-3.5" />
                         {lang === "vi" ? "Ý tưởng hành trình" : "Voyage Vision"}
                      </label>
                      <div className="relative group/input">
                        <textarea 
                          autoFocus required 
                          value={aiPrompt} 
                          onChange={e => setAiPrompt(e.target.value)} 
                          rows={3}
                          placeholder={lang === "vi" ? "Ví dụ: Đi phượt khám phá Hà Giang 3 ngày, Nghỉ dưỡng ở Đà Lạt cùng người yêu, hay Food tour Sài Gòn..." : "E.g. 3-day adventure in Ha Giang, Relaxing in Da Lat, or Saigon Food Tour..."} 
                          className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 rounded-[1.5rem] text-white focus:bg-slate-950 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 focus:outline-none transition-all placeholder:text-slate-700 text-sm font-medium shadow-inner resize-none leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-[9px] font-bold text-slate-600 uppercase pt-2 pr-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                      {lang === "vi" ? "Cảm hứng:" : "Ideas:"}
                      </span>
                      {[
                        { label: "Phượt Hà Giang", prompt: "Đi phượt khám phá Hà Giang 3 ngày" },
                        { label: "Nghỉ dưỡng Đà Lạt", prompt: "Chuyến nghỉ dưỡng lãng mạn tại Đà Lạt" },
                        { label: "Foodtour Sài Gòn", prompt: "Hành trình Foodtour Sài Gòn 1 ngày ăn sập quận 1" },
                        { label: "Camping Phú Quốc", prompt: "Cắm trại và ngắm hoàng hôn tại Phú Quốc" }
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setAiPrompt(item.prompt)}
                          className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border bg-white/[0.03] border-white/[0.05] text-slate-600 hover:text-slate-400 hover:bg-white/[0.08]"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5 mt-4 pt-4">
                      <span className="text-[9px] font-bold text-indigo-400/60 uppercase pt-2 pr-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {lang === "vi" ? "Phong cách:" : "Style:"}
                      </span>
                      {[
                        { icon: "👨‍👩‍👧‍👦", vi: "Gia đình", en: "Family" },
                        { icon: "🎒", vi: "Bụi", en: "Adventure" },
                        { icon: "🍱", vi: "Ẩm thực", en: "Foodie" },
                        { icon: "💏", vi: "Lãng mạn", en: "Romantic" },
                        { icon: "🧘", vi: "Nghỉ dưỡng", en: "Relax" },
                        { icon: "🏰", vi: "Văn hóa", en: "Culture" }
                      ].map((style) => (
                        <button
                          key={style.vi}
                          type="button"
                          onClick={() => {
                            const suffix = lang === "vi" ? ` mang phong cách ${style.vi}` : ` with a ${style.en} style`;
                            if (!aiPrompt.includes(suffix)) {
                              setAiPrompt(prev => prev + suffix);
                            }
                          }}
                          className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] font-bold text-indigo-300 hover:bg-indigo-500/20 transition-all flex items-center gap-1"
                        >
                          <span>{style.icon}</span>
                          <span>{lang === "vi" ? style.vi : style.en}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-8 py-6 border-t border-white/5 bg-slate-950/40 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {lang === "vi" ? "Hủy bỏ" : "Go Back"}
                  </button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmitting} 
                    type="submit" 
                    className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-xs font-black uppercase tracking-[0.2em] rounded-xl shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden group/save"
                  >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/save:translate-y-0 transition-transform duration-300" />
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="relative z-10">{submittingStep}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 fill-white/20" />
                        <span className="relative z-10">{lang === "vi" ? "Bắt đầu hành trình" : "Launch Voyage"}</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PremiumModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, tripId: null })}
        onConfirm={handleDeleteTrip}
        type="danger"
        loading={isSubmitting}
        title={lang === "vi" ? "Xác nhận xóa" : "Confirm Deletion"}
        message={lang === "vi" 
          ? "Bạn có chắc chắn muốn xóa chuyến đi này không? Mọi dữ liệu liên quan sẽ mất sạch và không thể khôi phục." 
          : "Are you sure you want to delete this trip? All related data will be permanently removed and cannot be recovered."}
        confirmText={lang === "vi" ? "Xóa ngay" : "Delete Now"}
      />
      {/* Weather Detail Modal */}
      <WeatherDetailModal 
        isOpen={isWeatherDetailOpen}
        onClose={() => setIsWeatherDetailOpen(false)}
        city={weatherTargetCity}
      />
    </div>
  );
}
