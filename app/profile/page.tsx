"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Mail, Fingerprint, Calendar, ShieldCheck, 
  MapPin, Globe, Award, Camera, Edit3, X, Check,
  Smartphone, Laptop, Clock, History, ChevronRight, ChevronDown,
  TrendingUp, Dna, Rocket, Gift, Star, Zap, Info, Search, PhoneCall,
  Sparkles, ShoppingBag, Trophy, Medal, Crown, Loader2, Package, Tag, Palette
} from "lucide-react";
import { useLang } from "@/components/providers/LangProvider";
import { redirect } from "next/navigation";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer 
} from "recharts";
import confetti from "canvas-confetti";

const VIETNAM_PROVINCES = [
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre", "Bình Định",
  "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk",
  "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội",
  "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang",
  "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An",
  "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh",
  "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế",
  "Tiền Giang", "TP Hồ Chí Minh", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
];

const POPULAR_COUNTRIES = [
  "Việt Nam", "Singapore", "Thái Lan", "Hàn Quốc", "Nhật Bản", "Mỹ", "Anh", "Pháp", "Đức", "Úc", "Canada"
];

const ALL_LOCATIONS = [...new Set([...POPULAR_COUNTRIES, ...VIETNAM_PROVINCES])];

// --- Marketplace Config ---
const MARKET_ITEMS = [
  { 
    id: "ai_turbo", 
    name: "AI Turbo Seat", 
    cost: 100, 
    description: "Tăng tốc độ tính toán lịch trình lên gấp 2 lần.", 
    icon: Zap,
    color: "text-blue-400",
    bg: "bg-blue-500/10"
  },
  { 
    id: "pro_theme", 
    name: "Giao diện PRO", 
    cost: 200, 
    description: "Mở khóa bộ màu sắc Dark-Gold sang trọng cho toàn ứng dụng.", 
    icon: Palette,
    color: "text-purple-400",
    bg: "bg-purple-500/10"
  },
  { 
    id: "voucher_hotel", 
    name: "Voucher Khách sạn", 
    cost: 500, 
    description: "Giảm 10% khi đặt phòng trên các hệ thống đối tác.", 
    icon: Tag,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10"
  }
];

// --- Ranking Config ---
const RANKS = [
  { name: "Khám phá", min: 0, color: "from-slate-400 to-slate-600", badge: "Explorer", trophy: Award },
  { name: "Lữ hành", min: 3, color: "from-emerald-400 to-emerald-600", badge: "Traveler", trophy: Medal },
  { name: "Chuyên gia", min: 8, color: "from-indigo-400 to-indigo-600", badge: "PRO", trophy: Trophy },
  { name: "Tinh hoa", min: 15, color: "from-amber-400 to-amber-600", badge: "ELITE", trophy: Crown },
];

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const { lang, t } = useLang();

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingCountry, setIsEditingCountry] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [searchTermLocation, setSearchTermLocation] = useState("");
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showDetails, setShowDetails] = useState<"trips" | "groups" | null>(null);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null);
  const [temp2FAMethod, setTemp2FAMethod] = useState<"EMAIL" | "SMS">("EMAIL");
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [errorOTP, setErrorOTP] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);


  // --- Mock Travel DNA Data ---
  const dnaData = [
    { subject: "Khám phá", A: 120, fullMark: 150 },
    { subject: "Ẩm thực", A: 98, fullMark: 150 },
    { subject: "Tiết kiệm", A: 86, fullMark: 150 },
    { subject: "Văn hóa", A: 99, fullMark: 150 },
    { subject: "Linh hoạt", A: 85, fullMark: 150 },
    { subject: "Mạo hiểm", A: 65, fullMark: 150 },
  ];

  // --- Mock Login History ---
  const loginHistory = [
    { id: 1, device: "iPhone 15 Pro", location: "Đà Nẵng, VN", time: "Hôm nay, 08:45", icon: Smartphone },
    { id: 2, device: "MacBook Pro M2", location: "Đà Nẵng, VN", time: "Hôm qua, 21:30", icon: Laptop },
    { id: 3, device: "Chrome / Windows", location: "Hà Nội, VN", time: "16 thg 4, 14:20", icon: Laptop },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
    if (session?.user && !profileData) {
      fetchProfile();
    }
  }, [status, session, profileData]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
        setNewName(data.name || "");
        setNewPhone(data.phone || "");
        setNewCountry(data.country || "Việt Nam");
        setTemp2FAMethod(data.twoFactorMethod || "EMAIL");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item: typeof MARKET_ITEMS[0]) => {
    if ((profileData?.points || 0) < item.cost) {
      setPurchaseStatus("Bạn không đủ OptiCoins!");
      setTimeout(() => setPurchaseStatus(null), 3000);
      return;
    }

    setIsPurchasing(true);
    try {
      const res = await fetch("/api/user/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, cost: item.cost })
      });

      if (res.ok) {
        const data = await res.json();
        setProfileData((prev: any) => ({ 
          ...prev, 
          points: data.points, 
          inventory: data.inventory 
        }));
        
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#6366f1", "#a855f7", "#ec4899", "#10b981"]
        });

        setPurchaseStatus(`Đã sở hữu ${item.name}!`);
        setTimeout(() => setPurchaseStatus(null), 3000);
      } else {
        const err = await res.json();
        setPurchaseStatus(err.error || "Giao dịch thất bại");
        setTimeout(() => setPurchaseStatus(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleUpdateProfile = async (field: string, value: any) => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.requiresVerification) {
          setIsVerifyingOTP(true);
          return;
        }

        setProfileData((prev: any) => ({ ...prev, ...data }));
        await updateSession({
          user: {
            ...session?.user,
            ...data
          }
        });
        if (field === "name") setIsEditingName(false);
        if (field === "phone") setIsEditingPhone(false);
        if (field === "country") setIsEditingCountry(false);
      } else {
        throw new Error(data.error || "Cập nhật thất bại");
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      setErrorOTP("Vui lòng nhập đủ 6 chữ số");
      return;
    }

    try {
      const res = await fetch("/api/user/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otpCode })
      });
      const data = await res.json();

      if (res.ok) {
        setProfileData((prev: any) => ({ ...prev, ...data.user }));
        setIsVerifyingOTP(false);
        setOtpCode("");
        setErrorOTP(null);
        setShowTwoFactorSetup(false);
        
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        setErrorOTP(data.error);
      }
    } catch (err) {
      setErrorOTP("Có lỗi xảy ra, vui lòng thử lại");
    }
  };


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreviewUrl = URL.createObjectURL(file);
    setProfileData((prev: any) => ({ ...prev, image: localPreviewUrl }));
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.secure_url) {
          setProfileData((prev: any) => ({ ...prev, image: data.secure_url }));
          await handleUpdateProfile("image", data.secure_url);
        }
      } else {
        setProfileData((prev: any) => ({ ...prev, image: profileData?.image || session?.user?.image }));
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setProfileData((prev: any) => ({ ...prev, image: profileData?.image || session?.user?.image }));
    } finally {
      setIsUploading(false);
      setTimeout(() => URL.revokeObjectURL(localPreviewUrl), 1000);
    }
  };

  const tripsCount = profileData?.trips?.length || 0;
  const groupsCount = profileData?.groupMembers?.length || 0;
  const totalTrips = tripsCount + groupsCount;

  const currentRank = [...RANKS].reverse().find(r => totalTrips >= r.min) || RANKS[0];
  const nextRank = RANKS[RANKS.indexOf(currentRank) + 1];
  const progress = nextRank 
    ? ((totalTrips - currentRank.min) / (nextRank.min - currentRank.min)) * 100 
    : 100;

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#0a1128] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
            Sẵn sàng thám hiểm...
          </p>
        </div>
      </div>
    );
  }

  const user = profileData || session?.user;

  return (
    <div className="min-h-screen bg-[#0a1128] pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-8 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl relative group z-20">
            <div className="absolute inset-0 rounded-[40px] overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 p-8 opacity-10 blur-sm group-hover:blur-none group-hover:opacity-30 transition-all duration-1000">
                 <Rocket className="w-64 h-64 text-indigo-500 -rotate-45" />
              </div>
            </div>

            <div className="relative z-10">
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-[40px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 overflow-hidden relative">
                {user?.image ? (
                   <img src={user.image} alt="Avatar" className="w-full h-full object-cover px-0 py-0" />
                ) : (
                   <User className="w-16 h-16 md:w-24 md:h-24 text-white" />
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  </div>
                )}

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            </div>

            <div className="flex-1 text-center md:text-left relative z-10">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                <span className={`bg-gradient-to-r ${currentRank.color} text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2`}>
                  {currentRank.trophy && <currentRank.trophy className="w-3.5 h-3.5" />}
                  Hạng {currentRank.name}
                </span>
                <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  Đã xác minh
                </span>
              </div>

              <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                {isEditingName ? (
                   <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdateProfile("name", newName)}
                        className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white font-black text-2xl md:text-3xl outline-none focus:border-indigo-500 transition-all w-full max-w-xs" 
                      />
                      <button 
                        onClick={() => handleUpdateProfile("name", newName)} 
                        className="p-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-110 active:scale-95"
                      >
                        <Check className="w-6 h-6 stroke-[3]" />
                      </button>
                      <button onClick={() => setIsEditingName(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400"><X className="w-6 h-6" /></button>
                   </div>
                ) : (
                  <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight flex items-center gap-4">
                    {user?.name}
                    <Edit3 onClick={() => setIsEditingName(true)} className="w-5 h-5 opacity-0 group-hover:opacity-40 hover:opacity-100 cursor-pointer transition-all" />
                  </h1>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8 text-slate-400">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-medium">{user?.email}</span>
                </div>
                <div className="flex items-center gap-2 relative">
                  <PhoneCall className="w-4 h-4 text-indigo-500" />
                  {isEditingPhone ? (
                     <div className="flex items-center gap-2">
                        <input 
                           type="text" 
                           value={newPhone} 
                           onChange={(e) => setNewPhone(e.target.value)}
                           onKeyDown={(e) => e.key === "Enter" && handleUpdateProfile("phone", newPhone)}
                           className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-xs text-white outline-none w-32 focus:border-indigo-500" 
                           autoFocus 
                        />
                        <div className="flex gap-1">
                           <button 
                             onClick={() => handleUpdateProfile("phone", newPhone)} 
                             className="p-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-110"
                           >
                             <Check className="w-3.5 h-3.5 stroke-[3]" />
                           </button>
                           <button 
                             onClick={() => setIsEditingPhone(false)}
                             className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500"
                           >
                             <X className="w-3.5 h-3.5" />
                           </button>
                        </div>
                     </div>
                  ) : (
                    <span onClick={() => setIsEditingPhone(true)} className="text-sm font-medium hover:text-white cursor-pointer transition-colors underline decoration-dotted underline-offset-4 decoration-indigo-500/50">{user?.phone || "Chưa cập nhật SĐT"}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 relative" ref={locationDropdownRef}>
                  <Globe className="w-4 h-4 text-indigo-500" />
                  <div 
                    onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                    className="text-sm font-medium hover:text-white cursor-pointer transition-colors underline decoration-dotted underline-offset-4 decoration-indigo-500/50 flex items-center gap-1.5"
                  >
                    {user?.country || "Việt Nam"}
                    <ChevronDown className={`w-3 h-3 transition-transform ${isLocationDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  <AnimatePresence>
                    {isLocationDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-0 mt-3 w-64 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="p-3 border-b border-white/5 bg-white/[0.02]">
                          <div className="relative flex items-center">
                            <Search className="absolute left-3 w-4 h-4 text-slate-500" />
                            <input 
                              type="text" 
                              placeholder="Tìm kiếm vị trí..."
                              autoFocus
                              value={searchTermLocation}
                              onChange={(e) => setSearchTermLocation(e.target.value)}
                              className="w-full bg-slate-900 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                          {ALL_LOCATIONS.filter(loc => loc.toLowerCase().includes(searchTermLocation.toLowerCase())).length > 0 ? (
                            ALL_LOCATIONS.filter(loc => loc.toLowerCase().includes(searchTermLocation.toLowerCase())).map((loc) => (
                              <button
                                key={loc}
                                onClick={() => {
                                  handleUpdateProfile("country", loc);
                                  setIsLocationDropdownOpen(false);
                                  setSearchTermLocation("");
                                }}
                                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between hover:bg-white/5 ${user?.country === loc ? 'text-indigo-400 font-bold bg-indigo-500/10' : 'text-slate-400 hover:text-white'}`}
                              >
                                {loc}
                                {user?.country === loc && <Check className="w-3.5 h-3.5" />}
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                               Không tìm thấy kết quả
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* Core Stats Section */}
          <div className="bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] rounded-[40px] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
             <div className="flex flex-col lg:flex-row gap-12 items-center relative z-10">
                <div className="flex-1 w-full">
                   <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-white text-xl font-black uppercase tracking-tight flex items-center gap-3">
                           Tiến trình thăng hạng
                           <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">Đã hoàn thành <span className="text-white font-bold">{totalTrips} chuyến đi</span> từ lúc bắt đầu</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Tiếp theo</p>
                         <p className="text-indigo-400 font-black uppercase tracking-tighter">{nextRank?.name || "MAX"}</p>
                      </div>
                   </div>

                   <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className={`h-full rounded-full bg-gradient-to-r ${currentRank.color} shadow-[0_0_20px_rgba(99,102,241,0.5)]`}
                      />
                   </div>
                   
                   <div className="flex justify-between mt-3 px-1 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      <span>{currentRank.name} ({currentRank.min})</span>
                      {nextRank && <span>Còn {nextRank.min - totalTrips} chuyến nữa</span>}
                      {nextRank && <span>{nextRank.name} ({nextRank.min})</span>}
                   </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 w-full lg:w-auto">
                   <motion.div whileHover={{ y: -5 }} onClick={() => setShowDetails("trips")} className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:border-indigo-500/30 cursor-pointer transition-all min-w-[140px]">
                      <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Chuyến đi</p>
                      <p className="text-4xl font-black text-white">{tripsCount}</p>
                      <div className="flex items-center gap-1 mt-2 text-indigo-400 text-[10px] font-bold">Xem chi tiết <ChevronRight className="w-3 h-3" /></div>
                   </motion.div>
                   <motion.div whileHover={{ y: -5 }} onClick={() => setShowDetails("groups")} className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:border-emerald-500/30 cursor-pointer transition-all min-w-[140px]">
                      <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Nhóm</p>
                      <p className="text-4xl font-black text-white">{groupsCount}</p>
                      <div className="flex items-center gap-1 mt-2 text-emerald-400 text-[10px] font-bold">Xem chi tiết <ChevronRight className="w-3 h-3" /></div>
                   </motion.div>
                   <div className="hidden lg:block bg-indigo-500 p-6 rounded-3xl border border-white/10 shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
                       <Sparkles className="absolute top-2 right-2 w-12 h-12 text-white/20 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                       <p className="text-white/60 text-[10px] font-black uppercase mb-1">Ví OptiCoins</p>
                       <p className="text-3xl font-black text-white">{profileData?.points || 0} <span className="text-sm">Xu</span></p>
                       <p className="text-[10px] text-white/80 font-bold mt-2">Dùng để mua vật phẩm</p>
                    </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-1">
                <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-[32px] p-8 h-full">
                   <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Star className="w-5 h-5 text-amber-500 fill-amber-500" /></div>
                      <h3 className="text-white text-sm font-black uppercase tracking-tight">Đặc quyền & Quà tặng</h3>
                   </div>
                   <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-white/5 border border-indigo-500/20 flex gap-4 items-center">
                         <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shrink-0"><Zap className="w-5 h-5 text-white" /></div>
                         <div>
                            <p className="text-xs font-black text-white">X2 Tốc độ AI</p>
                            <p className="text-[10px] text-slate-500">Lập kế hoạch trong 2 giây</p>
                         </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-4 items-center opacity-50 grayscale">
                         <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0"><Gift className="w-5 h-5 text-white" /></div>
                         <div>
                            <p className="text-xs font-black text-white">Voucher khách sạn</p>
                            <p className="text-[10px] text-slate-500">Mở khóa ở mức {RANKS[3].name}</p>
                         </div>
                      </div>
                   </div>
                   <button onClick={() => setShowMarket(true)} className="w-full mt-8 py-4 rounded-2xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20">
                      Ghé thăm cửa hàng
                   </button>
                </div>
             </div>

             <div className="lg:col-span-2">
                <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-[32px] p-8 grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                   <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={dnaData}>
                          <PolarGrid stroke="#ffffff10" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                          <Radar name="User" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="flex flex-col justify-center gap-6">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center"><Dna className="w-6 h-6 text-indigo-500" /></div>
                         <div><h4 className="text-white font-black uppercase tracking-tight">Cấu trúc DNA</h4><p className="text-indigo-400 text-xs font-bold uppercase tracking-widest">Nhà thám hiểm linh hoạt</p></div>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed text-left">Hệ thống AI phân tích các chuyến đi của bạn để xác định sở thích. Hiện tại, bạn có bộ chỉ số cao nhất ở <span className="text-white font-bold">Khám phá</span> và <span className="text-white font-bold">Văn hóa</span>.</p>
                      <div className="bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/10 flex gap-3 items-start">
                         <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" /><p className="text-[10px] text-slate-500 leading-relaxed font-medium">Bản đồ DNA giúp chúng tôi gợi ý các lịch trình tour phù hợp hơn với cá tính của bạn.</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-slate-950/50 backdrop-blur-md border border-white/5 rounded-[40px] p-10">
             <div className="flex items-center gap-4 mb-8">
               <div className="w-2 h-8 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
               <h2 className="text-xl font-black text-white uppercase tracking-tight text-left">Hệ thống bảo vệ</h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-6 rounded-3xl bg-white/[0.04] border border-white/10 transition-all group hover:bg-white/[0.06]">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Fingerprint className="w-6 h-6" /></div>
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-bold text-white">Định danh hệ thống</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate mb-1">{user?.id}</p>
                        <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">
                          Gia nhập: {user?.createdAt ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(user.createdAt)) : "01/04/2026"}
                        </p>
                      </div>
                   </div>
                </div>
                <div className="flex items-center justify-between p-6 rounded-3xl bg-white/[0.02] border border-white/5 transition-all">
                   <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${user?.twoFactorEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-slate-500'}`}><ShieldCheck className="w-6 h-6" /></div>
                      <div className="text-left"><p className="text-sm font-bold text-white">Xác thực 2 yếu tố</p><p className="text-xs text-slate-500">Mã qua SMS/Email</p></div>
                   </div>
                   <button onClick={() => setShowTwoFactorSetup(true)} className={`relative w-14 h-8 rounded-full transition-all duration-300 ${user?.twoFactorEnabled ? 'bg-emerald-600' : 'bg-slate-800'}`}><motion.div animate={{ x: user?.twoFactorEnabled ? 28 : 4 }} className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg" /></button>
                </div>
                <div className="flex items-center justify-between p-6 rounded-3xl bg-white/[0.02] border border-white/5 transition-all">
                   <div className="flex items-center gap-4 text-left">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 text-slate-500 flex items-center justify-center"><History className="w-6 h-6" /></div>
                      <div><p className="text-sm font-bold text-white">Lịch sử đăng nhập</p><p className="text-xs text-slate-500">Truy cập lần cuối: 08:45</p></div>
                   </div>
                   <button onClick={() => setShowHistory(true)} className="px-6 py-2.5 rounded-2xl bg-white/5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10 flex items-center gap-2">Xem <ChevronRight className="w-3 h-3" /></button>
                </div>
             </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showDetails && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDetails(null)} 
               className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120]" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[40px] z-[121] shadow-2xl p-8 max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-8">
                 <div className="text-left"><h2 className="text-2xl font-black text-white uppercase tracking-tight">{showDetails === "trips" ? "Chuyến đi của tôi" : "Nhóm đã tham gia"}</h2><p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{showDetails === "trips" ? tripsCount : groupsCount} mục được tìm thấy</p></div>
                 <button onClick={() => setShowDetails(null)} className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all"><X className="w-6 h-6" /></button>
              </div>
              <div className="overflow-y-auto pr-2 space-y-4 custom-scrollbar text-left">
                 {(showDetails === "trips" ? profileData?.trips : profileData?.groupMembers)?.map((item: any) => {
                    const data = showDetails === "trips" ? item : item.trip;
                    return (
                       <div key={item.id} className="p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-all flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform"><Rocket className="w-6 h-6" /></div>
                             <div><h4 className="text-sm font-black text-white">{data.title}</h4><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{data.city || "Chưa xác định"} • {new Date(data.createdAt).toLocaleDateString()}</p></div>
                          </div>
                          <button className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Chi tiết</button>
                       </div>
                    );
                 })}
                 {((showDetails === "trips" ? tripsCount : groupsCount) === 0) && (
                    <div className="text-center py-12"><Rocket className="w-16 h-16 text-slate-800 mx-auto mb-4" /><p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Không có dữ liệu nào</p></div>
                 )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistory(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-slate-950 border-l border-white/10 z-[101] shadow-2xl p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-10">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center"><History className="w-6 h-6 text-indigo-400" /></div>
                    <div className="text-left"><h2 className="text-xl font-black text-white uppercase tracking-tight">Lịch sử</h2><p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">3 thiết bị hoạt động</p></div>
                 </div>
                 <button onClick={() => setShowHistory(false)} className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all"><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-6 text-left">
                 {loginHistory.map((item) => (
                    <div key={item.id} className="p-5 rounded-[24px] bg-white/[0.03] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                       <div className="flex items-center gap-4"><item.icon className="w-5 h-5 text-slate-500 group-hover:text-indigo-400" /><div><p className="text-xs font-black text-white">{item.device}</p><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{item.location} • {item.time}</p></div></div>
                    </div>
                 ))}
              </div>
              <button className="mt-auto w-full py-4 rounded-2xl bg-rose-500/10 text-rose-500 font-black uppercase text-[10px] tracking-[0.2em] border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all">Đăng xuất tất cả</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTwoFactorSetup && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTwoFactorSetup(false)} 
               className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120]" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
               className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[40px] z-[121] shadow-2xl p-8 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><ShieldCheck className="w-6 h-6" /></div><h3 className="text-xl font-black text-white uppercase tracking-tight">Thiết lập 2FA</h3></div>
                 <button onClick={() => setShowTwoFactorSetup(false)} className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all"><X className="w-6 h-6" /></button>
              </div>
              <div className="flex p-1.5 bg-white/5 rounded-2xl mb-8">
                 <button onClick={() => { setTemp2FAMethod("EMAIL"); setIsVerifyingOTP(false); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${temp2FAMethod === "EMAIL" ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white'}`}>Email</button>
                 <button onClick={() => { setTemp2FAMethod("SMS"); setIsVerifyingOTP(false); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${temp2FAMethod === "SMS" ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white'}`}>SMS</button>
              </div>

              {isVerifyingOTP ? (
                 <div className="space-y-6 text-center">
                    <div className="flex flex-col items-center">
                       <p className="text-sm text-indigo-400 font-black uppercase tracking-widest mb-2">Nhập mã xác thực</p>
                       <p className="text-xs text-slate-500 mb-6">Chúng tôi đã gửi mã 6 chữ số tới {temp2FAMethod === "EMAIL" ? user?.email : user?.phone}</p>
                       <div className="relative group w-full max-w-[240px]">
                          <input 
                            type="text" 
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                            placeholder="••••••"
                            className="w-full bg-white/5 border-2 border-white/10 rounded-[20px] px-4 py-5 text-center text-3xl font-black tracking-[0.5em] text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                          />
                          <div className="absolute inset-0 rounded-[20px] pointer-events-none border border-indigo-500/20 group-hover:border-indigo-500/40 transition-all shadow-[0_0_20px_rgba(99,102,241,0.1)]" />
                       </div>
                    </div>
                    
                    {errorOTP && <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest animate-bounce">{errorOTP}</p>}
                    
                    <button 
                      onClick={handleVerifyOTP}
                      className="w-full py-4 rounded-3xl bg-indigo-500 text-white font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3"
                    >
                      Xác nhận kích hoạt
                      <Check className="w-4 h-4" />
                    </button>
                    
                    <button 
                       onClick={() => setIsVerifyingOTP(false)}
                       className="text-[10px] text-slate-500 font-black uppercase tracking-widest hover:text-white transition-colors"
                    >
                       Quay lại / Đổi phương thức
                    </button>
                 </div>
              ) : temp2FAMethod === "SMS" ? (
                 <div className="space-y-6 text-left">
                    {!user?.phone ? (
                       <>
                          <p className="text-sm text-slate-400 leading-relaxed">Bạn cần cập nhật số điện thoại trước khi kích hoạt bảo mật qua SMS.</p>
                          <div className="space-y-2">
                             <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest pl-2">Số điện thoại</label>
                             <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="09xx xxx xxx" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500" />
                          </div>
                          <button onClick={() => handleUpdateProfile("phone", newPhone)} className="w-full py-4 rounded-3xl bg-indigo-500 text-white font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-500/20">Cập nhật & Tiếp tục</button>
                       </>
                    ) : (
                       <>
                          <div className="p-4 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex gap-4 items-center">
                             <PhoneCall className="w-5 h-5 text-emerald-500" />
                             <p className="text-xs text-white">Mã sẽ gửi tới: <span className="font-bold">{user.phone}</span></p>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed font-medium">Bạn sẽ cần nhập mã từ SMS mỗi lần đăng nhập để đảm bảo an toàn.</p>
                          <button onClick={async () => { await handleUpdateProfile("twoFactorEnabled", !user.twoFactorEnabled); if (user.twoFactorEnabled) setShowTwoFactorSetup(false); }} className={`w-full py-4 rounded-3xl font-black uppercase tracking-widest transition-all shadow-xl ${user.twoFactorEnabled ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}>
                             {user.twoFactorEnabled ? 'Tắt 2FA' : 'Kích hoạt ngay'}
                          </button>
                       </>
                    )}
                 </div>
              ) : (
                 <div className="space-y-6 text-left">
                    <div className="p-4 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex gap-4 items-center">
                       <Mail className="w-5 h-5 text-indigo-400" />
                       <p className="text-xs text-white">Mã sẽ gửi tới: <span className="font-bold">{user?.email}</span></p>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed font-medium">Bảo mật qua Email là phương thức phổ biến và an toàn nhất hiện nay.</p>
                    <button onClick={async () => { await handleUpdateProfile("twoFactorEnabled", !user?.twoFactorEnabled); if (user?.twoFactorEnabled) setShowTwoFactorSetup(false); }} className={`w-full py-4 rounded-3xl font-black uppercase tracking-widest transition-all shadow-xl ${user?.twoFactorEnabled ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-indigo-500 text-white shadow-indigo-500/20'}`}>
                       {user?.twoFactorEnabled ? 'Tắt 2FA' : 'Kích hoạt ngay'}
                    </button>
                 </div>
              )}

            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMarket && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMarket(false)} className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200]" />
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-[#0a1128] border-t border-white/10 rounded-t-[48px] z-[201] shadow-2xl p-8 lg:p-12 overflow-y-auto">
              <div className="max-w-4xl mx-auto text-left">
                <div className="flex items-center justify-between mb-12">
                   <div className="flex items-center gap-4"><div className="w-16 h-16 rounded-[24px] bg-indigo-500/10 flex items-center justify-center"><ShoppingBag className="w-8 h-8 text-indigo-500" /></div><div><h2 className="text-3xl font-black text-white uppercase tracking-tight">Cửa hàng vật phẩm</h2><p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Dùng OptiCoins để nâng cấp trải nghiệm</p></div></div>
                   <div className="flex flex-col items-end"><p className="text-indigo-400 text-xs font-black uppercase tracking-[0.2em] mb-1">Số dư hiện tại</p><p className="text-4xl font-black text-white">{profileData?.points || 0} <span className="text-sm">Xu</span></p></div>
                </div>
                {purchaseStatus && (<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-8 p-4 rounded-2xl bg-indigo-500/20 border border-indigo-500 text-indigo-400 text-center text-sm font-black uppercase tracking-widest">{purchaseStatus}</motion.div>)}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {MARKET_ITEMS.map((item) => {
                     const isOwned = profileData?.inventory?.includes?.(item.id);
                     return (
                       <div key={item.id} className="bg-white/[0.03] border border-white/10 rounded-[32px] p-6 group hover:border-indigo-500/30 transition-all flex flex-col">
                          <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center mb-6`}><item.icon className={`w-7 h-7 ${item.color}`} /></div>
                          <h4 className="text-white font-black text-lg mb-2">{item.name}</h4><p className="text-slate-500 text-xs font-bold leading-relaxed mb-8 flex-1">{item.description}</p>
                          <button disabled={isPurchasing || isOwned} onClick={() => handlePurchase(item)} className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${isOwned ? "bg-emerald-500/10 text-emerald-400 cursor-default" : "bg-white text-black hover:bg-white/90 active:scale-95"}`}>{isOwned ? "Đã sở hữu" : isPurchasing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `${item.cost} OptiCoins`}</button>
                       </div>
                     );
                   })}
                </div>
                <div className="mt-12 p-8 rounded-[32px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                   <div className="flex items-center gap-4"><Package className="w-8 h-8 text-indigo-400" /><div><h5 className="text-white font-black uppercase text-sm">Cần thêm OptiCoins?</h5><p className="text-slate-500 text-xs font-bold">Hoàn thành các chuyến đi để tích lũy thêm điểm thưởng.</p></div></div>
                   <button onClick={() => setShowMarket(false)} className="px-8 py-3 bg-white/5 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all">Đóng cửa hàng</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
