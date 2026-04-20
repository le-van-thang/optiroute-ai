"use client";

import { useEffect, useState } from "react";
import { 
  Users, Search, Shield, User as UserIcon, 
  Map as TripIcon, AlertCircle, MoreHorizontal, 
  CheckCircle2, XCircle, Loader2, Ban, Clock, Calendar, Check, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/providers/ToastProvider";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  image: string | null;
  createdAt: string;
  _count: {
    trips: number;
    reportsReceived: number;
  };
}

export default function AdminUsers() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserData[]>([]);
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [banningUser, setBanningUser] = useState<UserData | null>(null);
  const [banDuration, setBanDuration] = useState("3_DAYS");
  const [banReason, setBanReason] = useState("");
  const [isBanning, setIsBanning] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  const fetchUsers = async (q: string = "") => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users?query=${encodeURIComponent(q)}`);
      if (res.ok) setUsers(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(searchQuery);
  }, []);

  const toggleRole = async (userId: string, currentRole: string) => {
    setIsUpdating(userId);
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole })
      });
      if (res.ok) fetchUsers(searchQuery);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleBanUser = async () => {
    if (!banningUser || !banReason.trim()) return;
    setIsBanning(true);
    try {
      const res = await fetch("/api/admin/users/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: banningUser.id, type: banDuration, reason: banReason })
      });
      if (res.ok) {
        setBanningUser(null);
        setBanReason("");
        setBanDuration("3_DAYS");
        fetchUsers(searchQuery);
        showToast("Khóa tài khoản thành công!", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Có lỗi xảy ra khi khóa tài khoản.", "error");
      }
    } finally {
      setIsBanning(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingUser || !deleteReason.trim()) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deletingUser.id, reason: deleteReason })
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== deletingUser.id));
        setDeletingUser(null);
        setDeleteReason("");
        showToast("Xóa tài khoản vĩnh viễn thành công!", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Có lỗi xảy ra khi xóa tài khoản.", "error");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <AnimatePresence>
        {deletingUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-red-950/20 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border-2 border-red-500/20 rounded-[32px] p-8 shadow-2xl relative"
            >
              <div className="flex flex-col items-center text-center">
                 <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                    <XCircle className="w-10 h-10 text-red-500" />
                 </div>
                 
                 <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Xóa Vĩnh Viễn</h3>
                 <p className="text-slate-400 font-medium text-sm mb-8">
                    Hành động này sẽ xóa hoàn toàn tài khoản <span className="text-white font-black">{deletingUser.name}</span> và mọi dữ liệu liên quan. <span className="text-red-400 font-bold italic">Không thể hoàn tác!</span>
                 </p>

                 <div className="w-full space-y-4 mb-8">
                   <div className="text-left">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Lý do xóa vĩnh viễn (BẮT BUỘC)</label>
                     <textarea 
                        className="w-full h-24 bg-red-500/5 border border-red-500/10 rounded-2xl p-4 text-sm mt-2 focus:outline-none focus:border-red-500 transition-all resize-none text-white font-bold"
                        placeholder="Nhập lý do tại đây..."
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                     />
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 w-full">
                    <button 
                       onClick={() => setDeletingUser(null)}
                       disabled={isDeleting}
                       className="py-4 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-wider text-xs hover:bg-slate-700 transition-all"
                    >
                       Hủy bỏ
                    </button>
                    <button 
                       onClick={handleDeleteAccount}
                       disabled={isDeleting || !deleteReason.trim()}
                       className="py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-wider text-xs transition-all shadow-xl shadow-red-600/30 flex items-center justify-center gap-2"
                    >
                       {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "XÓA NGAY"}
                    </button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        {banningUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[32px] p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setBanningUser(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4 mb-8">
                 <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <Ban className="w-7 h-7 text-red-500" />
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-white uppercase tracking-tight">Kỷ luật tài khoản</h3>
                   <p className="text-red-400 font-medium text-sm">Khóa truy cập của {banningUser.name}</p>
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Thời hạn cấm</label>
                   <div className="grid grid-cols-2 gap-3">
                     {[
                       { id: "3_DAYS", label: "3 Ngày", icon: Clock },
                       { id: "1_WEEK", label: "1 Tuần", icon: Calendar },
                       { id: "1_MONTH", label: "1 Tháng", icon: Calendar },
                       { id: "1_YEAR", label: "1 Năm", icon: Calendar },
                       { id: "PERMANENT", label: "Vĩnh Viễn", icon: AlertCircle }
                     ].map(t => (
                       <button
                         key={t.id}
                         onClick={() => setBanDuration(t.id)}
                         className={`flex items-center gap-3 p-3 rounded-xl border transition-all col-span-1 ${t.id === 'PERMANENT' ? 'col-span-2' : ''} ${banDuration === t.id ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-white/5'}`}
                       >
                         <t.icon className="w-4 h-4" />
                         <span className="font-bold text-sm uppercase">{t.label}</span>
                         {banDuration === t.id && <Check className="w-4 h-4 ml-auto" />}
                       </button>
                     ))}
                   </div>
                 </div>

                 <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lý do cấm (Người dùng sẽ nhìn thấy)</label>
                   <textarea 
                     className="w-full h-24 bg-slate-800/50 border border-white/5 rounded-xl p-4 text-sm focus:outline-none focus:border-red-500 transition-all resize-none text-white font-medium"
                     placeholder="Ví dụ: Lừa đảo tiền hóa đơn Split-bill..."
                     value={banReason}
                     onChange={(e) => setBanReason(e.target.value)}
                   />
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button onClick={() => setBanningUser(null)} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-bold uppercase tracking-wider text-sm hover:bg-slate-700 transition-all">
                       Hủy
                    </button>
                    <button 
                      onClick={handleBanUser} 
                      disabled={isBanning || !banReason.trim()}
                      className="flex-1 py-4 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold uppercase tracking-wider text-sm transition-all shadow-lg shadow-red-600/20"
                    >
                       {isBanning ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ban Người Dùng"}
                    </button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Quản lý Người dùng</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Kiểm soát {users.length} tài khoản trong hệ thống.</p>
        </div>
        
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-500 transition-all" />
          <input 
            type="text" 
            placeholder="Tìm theo Tên, Email hoặc ID..." 
            className="w-full bg-slate-900/40 border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-indigo-500 transition-all font-medium text-white shadow-xl"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              fetchUsers(e.target.value);
            }}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/20 border border-white/5 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl transition-all">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">Người dùng</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">Vai trò</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Hoạt động</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Báo cáo</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">Ngày tham gia</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                   <td colSpan={6} className="px-6 py-20 text-center">
                      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto opacity-50" />
                   </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-bold uppercase text-[10px] tracking-widest">Không tìm thấy người dùng nào.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <motion.tr 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    key={user.id} 
                    className="group hover:bg-white/[0.02] transition-all"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 overflow-hidden shrink-0">
                          {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-indigo-500 text-xs">{user.name?.[0]}</div>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white truncate leading-none mb-1">{user.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold tracking-tight truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'ADMIN' ? (
                        <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)] flex items-center gap-2 w-fit">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          ADMIN
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] bg-slate-800/50 text-slate-400 border border-white/5 flex items-center gap-2 w-fit">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          USER
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex flex-col items-center gap-0.5">
                          <span className="text-sm font-black text-white">{user._count.trips}</span>
                          <span className="text-[8px] font-black text-slate-600 uppercase">Chuyến đi</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       {user._count.reportsReceived > 0 ? (
                         <div className="flex items-center justify-center gap-1.5 text-orange-400">
                            <AlertCircle className="w-3 h-3" />
                            <span className="text-xs font-black">{user._count.reportsReceived}</span>
                         </div>
                       ) : (
                         <span className="text-xs font-bold text-slate-600">-</span>
                       )}
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-xs font-bold text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => toggleRole(user.id, user.role)}
                            disabled={isUpdating === user.id || session?.user?.id === user.id}
                            className={`p-2 rounded-xl transition-all border border-white/5 ${session?.user?.id === user.id ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50' : (user.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-600 hover:text-white' : 'bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white')}`}
                            title={session?.user?.id === user.id ? "Không thể tự thay đổi quyền của chính mình" : (user.role === 'ADMIN' ? "Hạ cấp xuống USER" : "Nâng cấp lên ADMIN")}
                          >
                            {isUpdating === user.id && isUpdating !== 'DELETE' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                          </button>
                          
                          <button 
                            onClick={() => setBanningUser(user)}
                            disabled={isUpdating === user.id || session?.user?.id === user.id || user.role === 'ADMIN'}
                            className={`p-2 rounded-xl border transition-all ${session?.user?.id === user.id || user.role === 'ADMIN' ? 'bg-slate-800 text-slate-500 border-white/5 cursor-not-allowed opacity-50' : 'bg-red-600/10 text-red-500 border-red-500/10 hover:bg-red-600 hover:text-white'}`}
                            title={session?.user?.id === user.id ? "Bạn không thể khóa chính mình" : (user.role === 'ADMIN' ? "Hãy hạ cấp mục tiêu xuống USER trước" : "Xóa / Khóa tài khoản")}
                          >
                             <Ban className="w-4 h-4" />
                          </button>
                          
                          <button 
                            onClick={() => setDeletingUser(user)}
                            disabled={isUpdating === user.id || session?.user?.id === user.id || user.role === 'ADMIN'}
                            className={`p-2 rounded-xl transition-all border ${session?.user?.id === user.id || user.role === 'ADMIN' ? 'bg-slate-800 text-slate-500 border-white/5 cursor-not-allowed opacity-50' : 'bg-red-600/10 text-red-500 border-red-500/10 hover:bg-red-600 hover:text-white disabled:opacity-50'}`}
                            title={session?.user?.id === user.id ? "Không thể xóa chính mình" : (user.role === 'ADMIN' ? "Hãy hạ cấp mục tiêu xuống USER trước" : "Xóa tài khoản vĩnh viễn")}
                          >
                             <XCircle className="w-4 h-4" />
                          </button>
                       </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
