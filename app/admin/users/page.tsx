"use client";

import { useEffect, useState } from "react";
import { 
  Users, Search, Shield, User as UserIcon, 
  Map as TripIcon, AlertCircle, MoreHorizontal, 
  CheckCircle2, XCircle, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

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
    fetchUsers();
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
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
                            disabled={isUpdating === user.id}
                            className={`p-2 rounded-xl transition-all border border-white/5 ${user.role === 'ADMIN' ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white'}`}
                            title={user.role === 'ADMIN' ? "Hạ cấp xuống USER" : "Nâng cấp lên ADMIN"}
                          >
                            {isUpdating === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                          </button>
                          <button className="p-2 rounded-xl bg-red-600/10 text-red-500 border border-red-500/10 hover:bg-red-600 hover:text-white transition-all">
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
