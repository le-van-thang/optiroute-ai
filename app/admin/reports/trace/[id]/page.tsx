"use client";

import { useEffect, useState, use } from "react";
import { 
  ChevronLeft, MessageSquare, Clock, Shield, 
  Search, AlertCircle, User as UserIcon, Loader2,
  Terminal, Hash, ShieldCheck, Mail
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface MessageData {
  id: string;
  content: string;
  type: string;
  fileUrl: string | null;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: string;
  };
}

export default function ConversationTrace({ params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = use(params);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrace = async () => {
      try {
        const res = await fetch(`/api/admin/reports/trace?conversationId=${conversationId}`);
        if (!res.ok) throw new Error("Không thể tải dữ liệu hội thoại");
        const data = await res.json();
        setMessages(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrace();
  }, [conversationId]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin opacity-50" />
        <p className="text-slate-500 font-black uppercase text-xs tracking-widest animate-pulse">Đang giải mã dữ liệu hội thoại...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-4">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white uppercase mb-2">Lỗi Truy Vết</h3>
          <p className="text-slate-500 font-medium">{error}</p>
        </div>
        <Link href="/admin/reports" className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase text-xs transition-all border border-white/5">
          Quay lại Báo cáo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
            <Link href="/admin/reports" className="p-3 rounded-2xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
               <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
               <div className="flex items-center gap-2 mb-1">
                  <Terminal className="w-4 h-4 text-indigo-500" />
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Truy vết Pháp chứng Hội thoại</h2>
               </div>
               <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <Hash className="w-3 h-3" />
                  ID: {conversationId}
               </p>
            </div>
         </div>
         
         <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
               <ShieldCheck className="w-4 h-4 text-emerald-500" />
               <span className="text-[10px] font-black text-emerald-500 uppercase">Dữ liệu được bảo mật</span>
            </div>
         </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {[
            { label: "Tổng số tin nhắn", value: messages.length, icon: MessageSquare, color: "text-indigo-500" },
            { label: "Thời gian bắt đầu", value: new Date(messages[0]?.createdAt).toLocaleDateString(), icon: Clock, color: "text-amber-500" },
            { label: "Số người tham gia", value: new Set(messages.map(m => m.sender.id)).size, icon: UserIcon, color: "text-rose-500" }
         ].map((stat, i) => (
            <div key={i} className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex items-center gap-4">
               <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
               </div>
               <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                  <p className="text-lg font-black text-white">{stat.value}</p>
               </div>
            </div>
         ))}
      </div>

      {/* Conversation Thread */}
      <div className="bg-slate-900/40 border border-white/5 rounded-[40px] overflow-hidden shadow-2xl backdrop-blur-3xl">
         <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Dòng thời gian tin nhắn</h3>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
               <span className="text-[9px] font-bold text-slate-400 uppercase">Nghi vấn vi phạm được lưu lại</span>
            </div>
         </div>
         
         <div className="p-8 space-y-12">
            {messages.map((msg, idx) => (
               <motion.div 
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: idx * 0.05 }}
                 key={msg.id} 
                 className="relative group"
               >
                  {/* Joiner Line */}
                  {idx !== messages.length - 1 && (
                     <div className="absolute left-6 top-12 bottom-[-48px] w-px bg-white/5 group-hover:bg-indigo-500/20 transition-colors" />
                  )}
                  
                  <div className="flex gap-6">
                     <div className="shrink-0 relative">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800 border-2 border-white/5 overflow-hidden group-hover:border-indigo-500/50 transition-all shadow-xl">
                           {msg.sender.image ? (
                              <img src={msg.sender.image} alt="" className="w-full h-full object-cover" />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center font-black text-indigo-500 text-sm">
                                 {msg.sender.name?.[0]}
                              </div>
                           )}
                        </div>
                        {msg.sender.role === 'ADMIN' && (
                           <div className="absolute -bottom-1 -right-1 bg-amber-500 p-1 rounded-lg border-2 border-slate-900 shadow-lg" title="Quản trị viên">
                              <Shield className="w-2 h-2 text-white" />
                           </div>
                        )}
                     </div>
                     
                     <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-4 mb-2">
                           <div className="flex items-center gap-3">
                              <span className="text-sm font-black text-white">{msg.sender.name}</span>
                              <span className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 transition-colors cursor-default underline decoration-indigo-500/30 underline-offset-4 flex items-center gap-1 group/email">
                                 <Mail className="w-2.5 h-2.5 opacity-50 group-hover/email:opacity-100 transition-opacity" />
                                 {msg.sender.email}
                              </span>
                           </div>
                           <span className="text-[9px] font-bold text-slate-600 bg-white/5 px-2 py-1 rounded-lg">
                              {new Date(msg.createdAt).toLocaleString()}
                           </span>
                        </div>
                        
                        <div className="p-5 bg-white/[0.03] rounded-3xl rounded-tl-none border border-white/5 hover:border-white/10 transition-all group-hover:bg-white/[0.05]">
                           {msg.type === 'TEXT' ? (
                              <p className="text-sm text-slate-200 leading-relaxed font-medium selection:bg-indigo-500 selection:text-white">
                                 {msg.content}
                              </p>
                           ) : msg.type === 'IMAGE' ? (
                              <div className="space-y-3">
                                 <img src={msg.fileUrl || ''} alt="Attachment" className="max-w-md rounded-2xl border border-white/10 shadow-2xl" />
                                 {msg.content && <p className="text-xs text-slate-400 italic">"{msg.content}"</p>}
                              </div>
                           ) : (
                              <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5 italic text-slate-500 text-xs">
                                 <AlertCircle className="w-4 h-4" />
                                 {msg.type} Attachment (Chỉ hỗ trợ xem trên client gốc)
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               </motion.div>
            ))}
            
            <div className="pt-8 border-t border-white/5 text-center">
               <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                  <Search className="w-3 h-3" /> 
                  KẾT THÚC BẢN GHI TRUY VẾT
                  <Search className="w-3 h-3" />
               </p>
            </div>
         </div>
      </div>

    </div>
  );
}
