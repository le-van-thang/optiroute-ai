"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Settings, Shield, Monitor, Bell, 
  Save, AlertTriangle, CheckCircle2, 
  UserPlus, Globe, Mail, Loader2, Sparkles,
  Info, UserCheck, MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SystemConfig {
  siteName: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  supportEmail: string;
  adminNotifications: boolean;
}

export default function AdminSettings() {
  const { data: session } = useSession();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [acceptMessages, setAcceptMessages] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (data.siteName) document.title = `Admin | ${data.siteName}`;
      }

      // Fetch privacy settings
      const privacyRes = await fetch("/api/admin/settings/privacy");
      if (privacyRes.ok) {
        const privacyData = await privacyRes.json();
        setAcceptMessages(privacyData.acceptMessages);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      // Save system config
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });

      // Save privacy config
      const privacyRes = await fetch("/api/admin/settings/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptMessages })
      });

      if (res.ok && privacyRes.ok) {
        setShowSuccess(true);
        if (config.siteName) document.title = `Admin | ${config.siteName}`;
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="py-20 text-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto opacity-50" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Trung tâm Cấu hình</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
            Quản lý vận hành toàn cục của hệ thống <span className="text-indigo-400">{config?.siteName}</span>.
          </p>
        </div>
        
        {/* Nút lưu luôn hiển thị nổi bật ở góc */}
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className={`group flex items-center gap-3 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-2xl relative overflow-hidden ${
            isSaving 
              ? 'bg-slate-800 text-slate-500' 
              : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 shadow-indigo-600/20'
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
          )}
          {isSaving ? "Đang lưu..." : "Lưu tất cả cấu hình"}
        </button>
      </div>

      {/* Success Popup */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-10 right-10 z-50 p-6 bg-emerald-500 text-white rounded-[24px] shadow-2xl shadow-emerald-500/30 flex items-center gap-4"
          >
            <div className="p-2 bg-white/20 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest">Thành công!</p>
              <p className="text-[10px] font-bold opacity-90 uppercase">Các thay đổi đã được áp dụng vào hệ thống.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Section: System Identity */}
        <section className="space-y-4">
          <div className="ml-2 flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-indigo-500" />
             </div>
             <h3 className="text-xs font-black uppercase text-slate-300 tracking-[0.2em]">Thông tin nhận diện</h3>
          </div>
          
          <div className="p-10 bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[40px] space-y-8 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -mr-32 -mt-32" />
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                       Tên trang web
                       <span className="p-1 bg-white/5 rounded-md" title="Tên hiển thị trên trình duyệt và thanh điều hướng">
                          <Info className="w-3 h-3" />
                       </span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ví dụ: OptiRoute AI"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                      value={config?.siteName || ""}
                      onChange={(e) => setConfig(prev => prev ? {...prev, siteName: e.target.value} : null)}
                    />
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                         Email hỗ trợ kĩ thuật
                         <span className="p-1 bg-white/5 rounded-md" title="Email mà khách hàng sẽ thấy để liên hệ hỗ trợ">
                            <Info className="w-3 h-3" />
                         </span>
                      </label>
                      {session?.user?.email && (
                        <button 
                          onClick={() => setConfig(prev => prev ? {...prev, supportEmail: session.user.email!} : null)}
                          className="text-[9px] font-black uppercase text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors bg-indigo-500/5 px-2 py-1 rounded-lg border border-indigo-500/10"
                        >
                          <UserCheck className="w-3 h-3" />
                          Dùng Email của tôi
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="email" 
                        placeholder="support@yourdomain.com"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-16 pr-6 py-4 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                        value={config?.supportEmail || ""}
                        onChange={(e) => setConfig(prev => prev ? {...prev, supportEmail: e.target.value} : null)}
                      />
                    </div>
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider px-1">Lưu ý: Bạn nên nhập Email thật của mình để khách hàng nhắn tin.</p>
                </div>
             </div>
          </div>
        </section>

        {/* Section: Operations */}
        <section className="space-y-4">
          <div className="ml-2 flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Monitor className="w-4 h-4 text-emerald-500" />
             </div>
             <h3 className="text-xs font-black uppercase text-slate-300 tracking-[0.2em]">Cấu hình vận hành</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             
             {/* Maintenance Mode */}
             <div 
               onClick={() => setConfig(prev => prev ? {...prev, maintenanceMode: !prev.maintenanceMode} : null)}
               className={`p-10 bg-slate-900/40 border transition-all rounded-[40px] flex flex-col justify-between gap-10 cursor-pointer group ${
                 config?.maintenanceMode 
                   ? 'border-orange-500/30 bg-orange-500/[0.03] ring-1 ring-orange-500/20' 
                   : 'border-white/5 hover:border-white/20'
               }`}
             >
                <div className="flex justify-between items-start">
                  <div className={`p-4 rounded-2xl transition-colors ${config?.maintenanceMode ? 'bg-orange-500/20' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                    <AlertTriangle className={`w-8 h-8 ${config?.maintenanceMode ? 'text-orange-500' : 'text-slate-500'}`} />
                  </div>
                  <div className={`w-16 h-9 rounded-full relative transition-all duration-300 shadow-inner ${config?.maintenanceMode ? 'bg-orange-500 shadow-orange-950/20' : 'bg-slate-800'}`}>
                    <motion.div 
                      layout
                      initial={false}
                      animate={{ x: config?.maintenanceMode ? 32 : 4 }}
                      className="absolute top-1 w-7 h-7 bg-white rounded-full shadow-xl" 
                    />
                  </div>
                </div>
                <div>
                   <h4 className="text-lg font-black text-white uppercase tracking-tight mb-2">Chế độ bảo trì</h4>
                   <p className="text-[11px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest">Tạm dừng dịch vụ để nâng cấp. Chỉ Admin mới vào được Dashboard.</p>
                </div>
             </div>

             {/* Registration Control */}
             <div 
               onClick={() => setConfig(prev => prev ? {...prev, allowRegistration: !prev.allowRegistration} : null)}
               className={`p-10 bg-slate-900/40 border transition-all rounded-[40px] flex flex-col justify-between gap-10 cursor-pointer group ${
                 config?.allowRegistration 
                   ? 'border-emerald-500/30 bg-emerald-500/[0.03] ring-1 ring-emerald-500/20' 
                   : 'border-white/5 opacity-70 grayscale hover:grayscale-0 transition-all'
               }`}
             >
                <div className="flex justify-between items-start">
                  <div className={`p-4 rounded-2xl transition-colors ${config?.allowRegistration ? 'bg-emerald-500/20' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                    <UserPlus className={`w-8 h-8 ${config?.allowRegistration ? 'text-emerald-500' : 'text-slate-500'}`} />
                  </div>
                  <div className={`w-16 h-9 rounded-full relative transition-all duration-300 shadow-inner ${config?.allowRegistration ? 'bg-emerald-500 shadow-emerald-950/20' : 'bg-slate-800'}`}>
                    <motion.div 
                      layout
                      initial={false}
                      animate={{ x: config?.allowRegistration ? 32 : 4 }}
                      className="absolute top-1 w-7 h-7 bg-white rounded-full shadow-xl" 
                    />
                  </div>
                </div>
                <div>
                   <h4 className="text-lg font-black text-white uppercase tracking-tight mb-2">Đăng ký thành viên</h4>
                   <p className="text-[11px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest">Cho phép người dùng mới tạo tài khoản. Tắt để hạn chế số thành viên mới.</p>
                </div>
             </div>
          </div>
        </section>

        {/* Section: Communications */}
        <section className="space-y-4">
          <div className="ml-2 flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-purple-500" />
             </div>
             <h3 className="text-xs font-black uppercase text-slate-300 tracking-[0.2em]">Bảo mật & Cảnh báo</h3>
          </div>
          
          <div 
            onClick={() => setConfig(prev => prev ? {...prev, adminNotifications: !prev.adminNotifications} : null)}
            className={`p-10 bg-slate-900/40 backdrop-blur-3xl border rounded-[40px] flex items-center justify-between cursor-pointer group transition-all ${
              config?.adminNotifications ? 'border-purple-500/30 bg-purple-500/[0.03]' : 'border-white/5'
            }`}
          >
             <div className="flex items-center gap-8">
                <div className={`p-4 rounded-2xl transition-colors ${config?.adminNotifications ? 'bg-purple-500/20' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                   <Shield className={`w-8 h-8 ${config?.adminNotifications ? 'text-purple-500' : 'text-slate-500'}`} />
                </div>
                <div>
                   <h4 className="text-lg font-black text-white uppercase tracking-tight mb-1">Báo cáo vi phạm (Red Alert)</h4>
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-widest max-w-sm">Hệ thống sẽ gửi thông báo khẩn cấp cho Admin khi có người dùng bị báo cáo (Report).</p>
                </div>
             </div>
             <div className={`w-16 h-9 rounded-full relative transition-all duration-300 shadow-inner ${config?.adminNotifications ? 'bg-purple-600 shadow-purple-900/20' : 'bg-slate-800'}`}>
                <motion.div 
                  layout
                  initial={false}
                  animate={{ x: config?.adminNotifications ? 32 : 4 }}
                  className="absolute top-1 w-7 h-7 bg-white rounded-full shadow-xl" 
                />
              </div>
          </div>
        </section>
        
        {/* Section: Admin Privacy */}
        <section className="space-y-4">
          <div className="ml-2 flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-orange-500" />
             </div>
             <h3 className="text-xs font-black uppercase text-slate-300 tracking-[0.2em]">Quyền riêng tư & Giao tiếp</h3>
          </div>
          
          <div 
            onClick={() => setAcceptMessages(!acceptMessages)}
            className={`p-10 bg-slate-900/40 backdrop-blur-3xl border rounded-[40px] flex items-center justify-between cursor-pointer group transition-all ${
              acceptMessages ? 'border-orange-500/30 bg-orange-500/[0.03]' : 'border-white/5 opacity-80'
            }`}
          >
             <div className="flex items-center gap-8">
                <div className={`p-4 rounded-2xl transition-colors ${acceptMessages ? 'bg-orange-500/20' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                   <MessageSquare className={`w-8 h-8 ${acceptMessages ? 'text-orange-500' : 'text-slate-500'}`} />
                </div>
                <div>
                   <h4 className="text-lg font-black text-white uppercase tracking-tight mb-1">Tiếp nhận tin nhắn người dùng</h4>
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-widest max-w-sm">
                     {acceptMessages 
                       ? "BẠN ĐANG Ở CHẾ ĐỘ TIẾP DÂN. Người dùng có thể tìm thấy và gửi tin nhắn hỗ trợ cho bạn."
                       : "CHẾ ĐỘ KHÔNG LÀM PHIỀN. Nút nhắn tin sẽ bị khóa và người dùng không thể gửi tin mới cho bạn."}
                   </p>
                </div>
             </div>
             <div className={`w-16 h-9 rounded-full relative transition-all duration-300 shadow-inner ${acceptMessages ? 'bg-orange-600 shadow-orange-900/20' : 'bg-slate-800'}`}>
                <motion.div 
                  layout
                  initial={false}
                  animate={{ x: acceptMessages ? 32 : 4 }}
                  className="absolute top-1 w-7 h-7 bg-white rounded-full shadow-xl" 
                />
              </div>
          </div>
        </section>

      </div>

      {/* Footer Info */}
      <div className="p-12 text-center border-t border-white/5 mt-16 relative overflow-hidden bg-slate-900/20 rounded-[40px]">
        <Sparkles className="w-10 h-10 text-indigo-500/20 mx-auto mb-6" />
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-2">Hệ Thống Quản Trị Cấp Cao</p>
        <p className="text-[9px] font-bold text-slate-700 uppercase tracking-[0.2em]">Phiên bản 1.0.4 - Tự động đồng bộ thời gian thực</p>
      </div>

    </div>
  );
}
