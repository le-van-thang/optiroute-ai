"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { 
  Users, Search, UserPlus, MessageSquare, Send, 
  MoreVertical, CheckCheck, Loader2, User, UserCheck, 
  UserMinus, Bell, Inbox, Sparkles, Fingerprint, Mail, Clock, Check, Copy,
  Smile, Image as ImageIcon, Mic, Paperclip, Trash2, Trash, X, Download, Reply
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { pusherClient } from "@/lib/pusher";

interface SocialUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "USER" | "ADMIN";
  acceptMessages: boolean;
  friendStatus: "NONE" | "OUTGOING" | "INCOMING" | "FRIEND";
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  type: "TEXT" | "IMAGE" | "AUDIO";
  fileUrl?: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    image: string | null;
  };
  replyTo?: {
    content: string;
    sender: {
      name: string;
    }
  };
}

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
    image: string | null;
    email: string;
  };
  lastMessage: string;
  lastMessageTime: string;
}

interface FriendRequest {
  id: string;
  sender: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  createdAt: string;
}

export default function SocialHub() {
  const { data: session } = useSession();
  const { lang } = useLang();
  
  // State
  const [activeTab, setActiveTab ] = useState<"chat" | "search" | "requests">("chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SocialUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  
  const handleCopyId = (userId: string, idToCopy: string) => {
    const idString = `#${idToCopy.slice(-6).toUpperCase()}`;
    navigator.clipboard.writeText(idString);
    setCopiedUserId(userId);
    setTimeout(() => setCopiedUserId(null), 2000);
  };
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [selectedUser, setSelectedUser] = useState<SocialUser | any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Security States
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isClearing, setIsClearing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState<string | null>(null);
  const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState<string | null>(null);

  // Media States
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const sidebarMenuRef = useRef<HTMLDivElement>(null);

  const [viewImage, setViewImage] = useState<string | null>(null);
  
  // --- Pusher Setup ---
  useEffect(() => {
    // Click outside handler
    const handleClickOutside = (e: MouseEvent) => {
       if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) setIsMenuOpen(null);
       if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
       if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(e.target as Node)) setIsSidebarMenuOpen(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = pusherClient?.subscribe(`private-user-${session.user.id}`);

    if (!channel) return;

    // Nhận tin nhắn mới
    channel.bind("new-message", (data: Message & { conversationId: string }) => {
      if (selectedUser?.id === data.senderId) {
        setMessages((prev) => [...prev, data]);
      }
      fetchConversations();
    });

    // Nhận lời mời kết bạn mới
    channel.bind("friend-request", () => {
        fetchRequests();
    });

    // Được đồng ý kết bạn
    channel.bind("friend-request-accepted", (data: any) => {
        fetchRequests();
        fetchConversations();
        if (searchQuery) performSearch(searchQuery);
    });

    // Bị từ chối kết bạn
    channel.bind("friend-request-rejected", (data: any) => {
        fetchRequests();
        if (searchQuery) performSearch(searchQuery);
    });

    // Bị hủy kết bạn
    channel.bind("friend-request-cancelled", (data: any) => {
        fetchRequests();
        fetchConversations();
        if (searchQuery) performSearch(searchQuery);
        if (selectedUser?.id === data.friendId) {
          setSelectedUser(null);
        }
    });

    // Tin nhắn bị xóa
    channel.bind("message-deleted", (data: { messageId: string }) => {
        setMessages(prev => prev.filter(m => m.id !== data.messageId));
        fetchConversations();
    });

    return () => {
      pusherClient?.unsubscribe(`private-user-${session.user.id}`);
      channel.unbind_all();
    };
  }, [session?.user?.id, selectedUser?.id, searchQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Data Fetching ---
  const fetchConversations = async () => {
    const res = await fetch("/api/social/conversations");
    if (res.ok) setConversations(await res.json());
  };

  const fetchRequests = async () => {
    const res = await fetch("/api/social/friends/requests");
    if (res.ok) setIncomingRequests(await res.json());
  };

  const fetchMessages = async (userId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/messages?userId=${userId}`);
      if (res.ok) setMessages(await res.json());
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchConversations();
      fetchRequests();
    }
  }, [session]);

  // --- Handlers ---
  const performSearch = async (q: string) => {
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/social/search?query=${encodeURIComponent(q)}`);
      if (res.ok) setSearchResults(await res.json());
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const handleFriendAction = async (userId: string, action: "SEND" | "ACCEPT" | "REJECT", requestId?: string) => {
    let method = action === "SEND" ? "POST" : "PATCH";
    let body: any = { status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED" };
    
    if (action === "SEND") {
      body = { receiverId: userId };
    } else {
      body = { requestId, status: body.status };
    }

    try {
      const res = await fetch("/api/social/friends", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        if (searchQuery) performSearch(searchQuery);
        fetchRequests();
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      const url = URL.createObjectURL(file);
      setAttachedPreview(url);
    }
  };

  const cancelAttachment = () => {
    setAttachedFile(null);
    setAttachedPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
        setAudioBlob(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleReply = (message: any) => {
    setReplyingTo(message);
    textInputRef.current?.focus();
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    // show a small notification or just rely on the user seeing it works
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/chat/messages/${messageId}`, { method: "DELETE" });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        fetchConversations();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachedFile && !audioBlob) || !selectedUser || isSending) return;

    setIsSending(true);
    try {
      let fileUrl = "";
      let type: "TEXT" | "IMAGE" | "AUDIO" = "TEXT";

      // 1. Nếu có file đính kèm hoặc audio, upload trước
      if (attachedFile || audioBlob) {
        const formData = new FormData();
        formData.append("file", attachedFile || audioBlob!);
        formData.append("type", attachedFile ? "IMAGE" : "AUDIO");

        const uploadRes = await fetch("/api/chat/upload", {
          method: "POST",
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          fileUrl = uploadData.url;
          type = uploadData.type;
        }
      }

      // 2. Gửi tin nhắn
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          receiverId: selectedUser.id, 
          content: newMessage || (type === "IMAGE" ? "Đã gửi một ảnh" : "Đã gửi một tin nhắn thoại"),
          type,
          fileUrl,
          replyToId: replyingTo?.id
        })
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setNewMessage("");
        setReplyingTo(null);
        cancelAttachment();
        setAudioBlob(null);
        fetchConversations();
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = async (userId: string) => {
    if (!selectedUser) return;
    setIsClearing(true);
    try {
      const conv = conversations.find(c => c.otherUser.id === userId);
      if (!conv) return;
      const res = await fetch(`/api/chat/conversations/${conv.id}/clear`, { method: "POST" });
      if (res.ok) {
        setMessages([]);
        setIsMenuOpen(null);
      }
    } finally {
      setIsClearing(false);
    }
  };

  const handleBlockUser = async (targetUserId: string) => {
    const res = await fetch("/api/social/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId })
    });
    if (res.ok) {
      setIsMenuOpen(null);
      setSelectedUser(null);
      fetchConversations();
      if (searchQuery) performSearch(searchQuery);
    }
  };

  const submitReport = async () => {
    if (!selectedUser || !reportReason) return;
    const res = await fetch("/api/social/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        reportedId: selectedUser.id, 
        reason: reportReason,
        conversationId: conversations.find(c => c.otherUser.id === selectedUser.id)?.id
      })
    });
    if (res.ok) {
      setIsReporting(false);
      setReportReason("");
      setIsMenuOpen(null);
    }
  };

  const handleUnfriend = async (targetUserId: string, alsoClear: boolean = false) => {
    const res = await fetch("/api/social/friends", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId })
    });
    if (res.ok) {
      if (alsoClear) {
        const conv = conversations.find(c => c.otherUser.id === targetUserId);
        if (conv) await fetch(`/api/chat/conversations/${conv.id}/clear`, { method: "POST" });
      }
      setIsMenuOpen(null);
      setIsSidebarMenuOpen(null);
      setSelectedUser(null);
      fetchConversations();
      if (searchQuery) performSearch(searchQuery);
    }
  };

  const selectChat = (user: any) => {
    setSelectedUser(user);
    setActiveTab("chat");
    fetchMessages(user.id);
  };

  const shortId = (id?: string) => id?.length ? `#${id.slice(-6).toUpperCase()}` : "";

  return (
    <div className="pt-24 pb-8 min-h-screen bg-[#020617] text-slate-200 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full flex flex-col lg:flex-row gap-0 h-[80vh] bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[32px] overflow-hidden shadow-2xl shadow-black/50">
        
        {/* Sidebar */}
        <div className="w-full lg:w-80 flex flex-col border-r border-white/5 bg-slate-900/20">
          <div className="p-5 border-b border-white/5">
            <h2 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2.5 text-white/90">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Social Hub
            </h2>
            <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
              {[
                { id: "chat", icon: MessageSquare, label: "Chat" },
                { id: "search", icon: Search, label: "Tìm" },
                { id: "requests", icon: Bell, label: incomingRequests.length > 0 ? `${incomingRequests.length}` : "" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-indigo-600/90 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <tab.icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            <AnimatePresence mode="wait">
              {activeTab === "chat" && (
                <motion.div key="chat" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-1">
                  {conversations.length === 0 ? (
                    <div className="py-20 text-center text-slate-500 px-6">
                       <Inbox className="w-12 h-12 mx-auto mb-4 opacity-20" />
                       <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">Bạn chưa có cuộc trò chuyện nào. Hãy tìm bạn để bắt đầu nhé!</p>
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <div key={conv.id} className="relative group/sidebar-item px-2">
                        <button
                          onClick={() => selectChat(conv.otherUser)}
                          className={`w-full flex items-center gap-4 p-4 rounded-[24px] transition-all relative overflow-hidden ${selectedUser?.id === conv.otherUser.id ? 'bg-indigo-600/20 border border-indigo-500/20' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 overflow-hidden shrink-0 border border-white/5 flex items-center justify-center relative">
                            {conv.otherUser.image ? <img src={conv.otherUser.image} alt="" className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-indigo-400/50" />}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0f172a] rounded-full" />
                          </div>
                          <div className="flex-1 text-left min-w-0 pr-6">
                            <div className="flex justify-between items-start mb-0.5">
                              <p className="text-sm font-black text-white/90 truncate">{conv.otherUser.name}</p>
                              <span className="text-[9px] text-slate-500 font-bold uppercase">{new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate font-medium">
                              {conv.lastMessage.length > 30 ? conv.lastMessage.substring(0, 30) + "..." : conv.lastMessage}
                            </p>
                          </div>
                        </button>
                        
                        {/* 3-dots Menu for Sidebar */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/sidebar-item:opacity-100 transition-all z-10">
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setIsSidebarMenuOpen(isSidebarMenuOpen === conv.id ? null : conv.id);
                             }}
                             className={`p-2 rounded-xl transition-all ${isSidebarMenuOpen === conv.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                           >
                             <MoreVertical className="w-4 h-4" />
                           </button>
                           
                           <AnimatePresence>
                             {isSidebarMenuOpen === conv.id && (
                               <motion.div 
                                 ref={sidebarMenuRef}
                                 initial={{ opacity: 0, scale: 0.95 }}
                                 animate={{ opacity: 1, scale: 1 }}
                                 exit={{ opacity: 0, scale: 0.95 }}
                                 className="absolute right-12 top-2 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 backdrop-blur-3xl ring-1 ring-white/5"
                               >
                                 <button onClick={() => { handleClearHistory(conv.otherUser.id); setIsSidebarMenuOpen(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                                    <Trash className="w-3.5 h-3.5" />
                                    Xóa lịch sử
                                 </button>
                                 <button onClick={() => { handleUnfriend(conv.otherUser.id); setIsSidebarMenuOpen(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                                    <UserMinus className="w-3.5 h-3.5" />
                                    Hủy kết bạn
                                 </button>
                                 <div className="h-px bg-white/5 my-1" />
                                 <button onClick={() => { handleUnfriend(conv.otherUser.id, true); setIsSidebarMenuOpen(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Xóa triệt để
                                 </button>
                               </motion.div>
                             )}
                           </AnimatePresence>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === "search" && (
                <motion.div key="search" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-2 space-y-4">
                  <form onSubmit={handleSearch} className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                    <input type="text" placeholder="Tìm theo Tên, Email hoặc ID..." className="w-full bg-black/40 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500 font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />}
                  </form>
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div key={user.id} className="p-4 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-between hover:bg-white/[0.06] transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 shrink-0 overflow-hidden relative">
                             {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 m-2.5 text-slate-600" />}
                             {user.role === "ADMIN" && (
                               <div className="absolute inset-0 border-2 border-orange-500/50 rounded-xl pointer-events-none" />
                             )}
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black truncate">{user.name}</p>
                              {user.role === "ADMIN" && (
                                <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-orange-600 to-amber-500 text-[7px] font-black text-white uppercase tracking-tighter shadow-lg shadow-orange-500/20">
                                  QUẢN TRỊ VIÊN
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 opacity-60">
                               <span className="text-[9px] font-black uppercase text-indigo-300">{shortId(user.id)}</span>
                               <div className="relative">
                                 <button 
                                   onClick={() => handleCopyId(user.id, user.id)}
                                   className={`p-1 transition-all ${copiedUserId === user.id ? 'text-emerald-400 bg-emerald-400/10 rounded-md' : 'hover:text-white'}`}
                                   title="Sao chép ID"
                                 >
                                   {copiedUserId === user.id ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                                 </button>
                                 <AnimatePresence>
                                   {copiedUserId === user.id && (
                                     <motion.span 
                                       initial={{ opacity: 0, y: 5 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       exit={{ opacity: 0 }}
                                       className="absolute -top-6 left-1/2 -translate-x-1/2 text-[7px] font-black uppercase text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full border border-emerald-400/20 whitespace-nowrap shadow-xl"
                                     >
                                       Copied!
                                     </motion.span>
                                   )}
                                 </AnimatePresence>
                               </div>
                               <span className="text-[9px] font-bold truncate lowercase">{user.email}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!user.acceptMessages && user.role === "ADMIN" ? (
                            <div className="px-3 py-2 rounded-xl bg-slate-800/50 text-slate-500 text-[8px] font-black uppercase tracking-widest border border-white/5">
                              Đang bận
                            </div>
                          ) : (
                            <>
                              {user.friendStatus === "NONE" && <button onClick={() => handleFriendAction(user.id, "SEND")} className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all"><UserPlus className="w-4 h-4" /></button>}
                              {user.friendStatus === "OUTGOING" && <div className="p-2.5 rounded-xl bg-slate-800 text-slate-400"><Clock className="w-4 h-4" /></div>}
                              {user.friendStatus === "FRIEND" && <button onClick={() => selectChat(user)} className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all"><MessageSquare className="w-4 h-4" /></button>}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "requests" && (
                <motion.div key="requests" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-2 space-y-2">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest px-3 py-1">Lời mời đến</p>
                  {incomingRequests.length === 0 ? (
                    <div className="py-16 text-center text-slate-600"><Inbox className="w-8 h-8 mx-auto mb-3 opacity-10" /><p className="text-[9px] uppercase font-black">Không có lời mời</p></div>
                  ) : (
                    incomingRequests.map((req) => (
                      <div key={req.id} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-slate-800 overflow-hidden border border-white/5">
                             {req.sender.image ? <img src={req.sender.image} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 m-2.5 text-slate-600" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black truncate text-white/90">{req.sender.name}</p>
                            <p className="text-[8px] font-bold text-indigo-400/70">{shortId(req.sender.id)}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                           <button 
                             onClick={() => handleFriendAction(req.sender.id, "ACCEPT", req.id)} 
                             className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                             title="Đồng ý"
                           >
                             <Check className="w-3.5 h-3.5" />
                           </button>
                           <button 
                             onClick={() => handleFriendAction(req.sender.id, "REJECT", req.id)} 
                             className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                             title="Từ chối"
                           >
                             <UserMinus className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="p-4 bg-black/40 border-t border-white/5 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center overflow-hidden border border-indigo-500/30">
                {session?.user?.image ? <img src={session.user.image} alt="" /> : <User className="w-4 h-4" />}
             </div>
             <div className="flex-1 text-left"><p className="text-[10px] font-black uppercase text-white leading-none mb-0.5">{session?.user?.name}</p><p className="text-[8px] font-mono text-indigo-400 font-black tracking-widest">TRỰC TUYẾN</p></div>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-slate-900/10 relative">
          <AnimatePresence mode="wait">
            {!selectedUser ? (
              <motion.div key="placeholder" className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gradient-to-b from-transparent to-black/5">
                 <div className="w-20 h-20 rounded-[28px] bg-slate-800/50 flex items-center justify-center mb-6 relative border border-white/5">
                    <MessageSquare className="w-8 h-8 text-slate-600" />
                 </div>
                 <h3 className="text-xl font-black text-white/80 mb-3 uppercase tracking-tight text-[#f8fafc]">Social Hub</h3>
                 <p className="text-slate-600 text-[10px] max-w-[240px] font-bold uppercase tracking-widest leading-relaxed">Chọn một cuộc trò chuyện hoặc tìm bạn mới để bắt đầu.</p>
              </motion.div>
            ) : (
              <motion.div key="chat-active" className="flex-1 flex flex-col h-full">
                <div className="p-4 px-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                   <div className="flex items-center gap-4 text-left">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden border border-white/5 relative">
                        {selectedUser.image ? <img src={selectedUser.image} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 m-2.5 text-slate-700" />}
                        {selectedUser.role === "ADMIN" && (
                          <div className="absolute inset-0 border-2 border-orange-500/50 rounded-xl pointer-events-none" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-black text-white text-sm leading-none">{selectedUser.name}</h4>
                          {selectedUser.role === "ADMIN" && (
                             <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-orange-600 to-amber-500 text-[7px] font-black text-white uppercase tracking-tighter">
                               QUẢN TRỊ VIÊN
                             </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${!selectedUser.acceptMessages && selectedUser.role === "ADMIN" ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                            {!selectedUser.acceptMessages && selectedUser.role === "ADMIN" ? "Đang treo máy" : "Trực tuyến"}
                          </span>
                        </div>
                      </div>
                   </div>
                   
                   {/* Action Menu Header */}
                   <div className="relative">
                     <button 
                       onClick={() => setIsMenuOpen(isMenuOpen === selectedUser.id ? null : selectedUser.id)}
                       className="p-2 hover:bg-white/5 rounded-lg transition-all text-slate-500 hover:text-white"
                     >
                       <MoreVertical className="w-5 h-5" />
                     </button>
                     <AnimatePresence>
                       {isMenuOpen === selectedUser.id && (
                         <motion.div 
                           ref={headerMenuRef}
                           initial={{ opacity: 0, y: 10, scale: 0.95 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           exit={{ opacity: 0, y: 10, scale: 0.95 }}
                           className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 backdrop-blur-3xl"
                         >
                           <button onClick={() => handleClearHistory(selectedUser.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                              <Loader2 className={`w-3.5 h-3.5 ${isClearing ? 'animate-spin' : 'hidden'}`} />
                              <Sparkles className={`w-3.5 h-3.5 ${isClearing ? 'hidden' : ''}`} />
                              Xóa lịch sử
                           </button>
                           <button onClick={() => handleUnfriend(selectedUser.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                              <UserMinus className="w-3.5 h-3.5" />
                              Hủy kết bạn
                           </button>
                           <div className="h-px bg-white/5 my-1" />
                           <button onClick={() => handleBlockUser(selectedUser.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-all">
                              <Fingerprint className="w-3.5 h-3.5" />
                              Chặn người dùng
                           </button>
                           <button onClick={() => setIsReporting(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase text-orange-400/70 hover:text-orange-400 hover:bg-orange-400/10 transition-all">
                              <Bell className="w-3.5 h-3.5" />
                              Báo cáo vi phạm
                           </button>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>
                </div>
                
                {/* Lightbox Modal */}
                <AnimatePresence>
                   {viewImage && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setViewImage(null)}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-10"
                      >
                        <div className="absolute top-6 right-6 flex items-center gap-4 z-10">
                          <a 
                            href={viewImage} 
                            download 
                            onClick={(e) => e.stopPropagation()}
                            className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md border border-white/10"
                            title="Tải ảnh"
                          >
                            <Download className="w-5 h-5" />
                          </a>
                          <button 
                            onClick={() => setViewImage(null)}
                            className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md border border-white/10"
                          >
                            <X className="w-6 h-6" />
                          </button>
                        </div>
                        
                        <motion.img 
                          initial={{ scale: 0.9, opacity: 0, y: 20 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ scale: 0.9, opacity: 0, y: 20 }}
                          src={viewImage}
                          className="max-w-full max-h-[90vh] rounded-2xl shadow-[0_0_100px_rgba(79,70,229,0.3)] object-contain border border-white/10"
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/5 backdrop-blur-md px-8 py-4 rounded-full border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl">
                           Nhấn vào vùng trống để quay lại
                        </div>
                      </motion.div>
                   )}
                </AnimatePresence>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-slate-900/5">
                    {isLoadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                         <MessageSquare className="w-16 h-16 mb-4" />
                         <p className="text-xs font-black uppercase tracking-widest text-white">Bắt đầu cuộc trò chuyện</p>
                      </div>
                    ) : messages.map((msg, idx) => {
                        const isMine = msg.senderId === session?.user?.id;
                        const showAvatar = !isMine && (idx === 0 || messages[idx-1].senderId !== msg.senderId);
                        
                        return (
                          <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                             {!isMine && (
                               <div className="w-7 h-7 rounded-full bg-slate-800 overflow-hidden shrink-0 border border-white/5">
                                 {showAvatar ? (
                                   msg.sender.image ? <img src={msg.sender.image} alt="" className="w-full h-full object-cover" /> : <User className="w-3.5 h-3.5 m-1.5 text-slate-600" />
                                 ) : null}
                               </div>
                             )}
                               <div className={`max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'} relative group`}>
                                   {/* Message Action Menu (Reply, Copy, Delete) */}
                                   <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 z-10 ${isMine ? 'right-full mr-3' : 'left-full ml-3'}`}>
                                      <button onClick={() => handleReply(msg)} className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 transition-all border border-white/5" title="Trả lời"><Reply className="w-3 h-3" /></button>
                                      <button onClick={() => handleCopy(msg.content)} className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-all border border-white/5" title="Sao chép"><Copy className="w-3 h-3" /></button>
                                      {isMine && (
                                        <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-all border border-white/5" title="Xóa"><Trash className="w-3 h-3" /></button>
                                      )}
                                   </div>

                                   <div className={`px-4 py-2.5 shadow-2xl transition-all hover:scale-[1.01] ${
                                     isMine 
                                       ? 'bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 text-white rounded-[22px] rounded-br-[4px] shadow-blue-500/20' 
                                       : 'bg-white/10 text-white rounded-[22px] rounded-bl-[4px] border border-white/10 backdrop-blur-md'
                                   }`}>
                                      {/* Replying context indicator */}
                                      {msg.replyTo && (
                                        <div className="mb-2 p-2 rounded-xl bg-black/20 border-l-2 border-indigo-400 text-[10px] opacity-70 flex flex-col gap-0.5 max-w-full overflow-hidden">
                                           <span className="font-black uppercase">@{msg.replyTo.sender.name}</span>
                                           <p className="truncate italic">{msg.replyTo.content}</p>
                                        </div>
                                      )}

                                      {msg.type === "TEXT" && <p className="text-[13px] font-semibold leading-relaxed">{msg.content}</p>}
                                      
                                      {msg.type === "IMAGE" && (
                                        <div 
                                          className="rounded-xl overflow-hidden cursor-pointer group/img-msg relative"
                                          onClick={() => setViewImage(msg.fileUrl!)}
                                        >
                                          <img src={msg.fileUrl} alt="Sent image" className="max-w-full max-h-[300px] object-cover transition-transform group-hover/img-msg:scale-110" />
                                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img-msg:opacity-100 transition-opacity flex items-center justify-center">
                                             <div className="bg-white/10 backdrop-blur-md p-2 rounded-full border border-white/20">
                                                <Search className="w-5 h-5 text-white" />
                                             </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {msg.type === "AUDIO" && (
                                        <div className="flex items-center gap-3 py-1">
                                          <div className={`p-2 rounded-full ${isMine ? 'bg-white/20' : 'bg-indigo-600/20'}`}>
                                            <Mic className={`w-4 h-4 ${isMine ? 'text-white' : 'text-indigo-400'}`} />
                                          </div>
                                          <audio controls src={msg.fileUrl} className="h-8 max-w-[180px] brightness-110" />
                                        </div>
                                      )}
                                   </div>
                                <span className={`text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1.5 px-1 ${isMine ? 'text-right' : 'text-left'}`}>
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                             </div>
                          </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                 </div>

                 <div className="p-4 bg-slate-900/30">
                    <AnimatePresence>
                      {replyingTo && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 flex items-center gap-3 bg-indigo-500/10 p-3 rounded-2xl border-l-4 border-indigo-500 overflow-hidden">
                           <div className="flex-1 min-w-0">
                              <span className="text-[9px] font-black uppercase text-indigo-400 block mb-0.5">Đang trả lời @{replyingTo.sender.name}</span>
                              <p className="text-xs text-slate-400 truncate italic">"{replyingTo.content}"</p>
                           </div>
                           <button onClick={() => setReplyingTo(null)} className="p-1 text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                        </motion.div>
                      )}
                      {attachedPreview && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mb-4 relative inline-block group/preview">
                           <img 
                             src={attachedPreview} 
                             alt="Preview" 
                             onClick={() => setViewImage(attachedPreview)}
                             className="w-20 h-20 object-cover rounded-2xl border-2 border-indigo-500 shadow-2xl cursor-pointer hover:brightness-90 transition-all" 
                           />
                           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 pointer-events-none transition-opacity">
                              <Search className="w-5 h-5 text-white shadow-xl" />
                           </div>
                           <button onClick={cancelAttachment} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all z-10">
                             <X className="w-3.5 h-3.5" />
                           </button>
                        </motion.div>
                      )}
                      {audioBlob && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mb-4 flex items-center justify-between bg-indigo-600/10 p-4 rounded-3xl border border-indigo-600/20 shadow-2xl backdrop-blur-md">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-indigo-600/20 rounded-full flex items-center justify-center animate-pulse">
                                 <Mic className="w-5 h-5 text-indigo-400" />
                              </div>
                              <div>
                                 <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block mb-0.5">Audio đã ghi xong</span>
                                 <span className="text-[9px] text-slate-500 font-bold">Sẵn sàng gửi bản ghi âm này</span>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <button onClick={() => setAudioBlob(null)} className="p-3 text-slate-400 hover:text-red-400 transition-all ring-1 ring-white/5 rounded-full hover:bg-white/5"><X className="w-5 h-5" /></button>
                              <button onClick={() => sendMessage(new Event('submit') as any)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-black text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 active:scale-95">Gửi ngay</button>
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {selectedUser.role === "ADMIN" && !selectedUser.acceptMessages ? (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 text-center">
                         <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest leading-relaxed">
                           Quản trị viên hiện đang bận và không nhận tin nhắn mới.
                         </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                         <div className="flex items-center gap-1 pr-2 border-r border-white/5">
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                            <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-500 hover:text-indigo-400 hover:bg-white/5 rounded-full transition-all" title="Gửi ảnh">
                               <ImageIcon className="w-5 h-5" />
                            </button>
                            <button 
                              type="button"
                              onMouseDown={startRecording}
                              onMouseUp={stopRecording}
                              onTouchStart={startRecording}
                              onTouchEnd={stopRecording}
                              className={`p-2.5 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse scale-110' : 'text-slate-400 hover:text-indigo-400 hover:bg-white/10'}`} 
                              title="Giữ để ghi âm"
                            >
                               <Mic className="w-5 h-5" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              className={`p-2.5 rounded-full transition-all ${showEmojiPicker ? 'bg-indigo-600/30 text-indigo-400' : 'text-slate-400 hover:text-indigo-400 hover:bg-white/10'}`} 
                              title="Emoji"
                            >
                               <Smile className="w-5 h-5" />
                            </button>
                            <AnimatePresence>
                               {showEmojiPicker && (
                                 <motion.div 
                                   ref={emojiPickerRef}
                                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                   animate={{ opacity: 1, y: 0, scale: 1 }}
                                   exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                   className="absolute bottom-20 left-4 bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl p-4 z-50 grid grid-cols-6 gap-2 backdrop-blur-3xl"
                                 >
                                    {["❤️", "😂", "😮", "😢", "😡", "👍", "🔥", "🙏", "✅", "🎉", "✨", "🙌", "😊", "🤩", "🤔", "🤫", "🥳", "😇"].map(emoji => (
                                      <button 
                                        type="button"
                                        key={emoji} 
                                        onClick={() => { 
                                          setNewMessage(prev => prev + emoji); 
                                          setShowEmojiPicker(false);
                                          setTimeout(() => textInputRef.current?.focus(), 50);
                                        }}
                                        className="w-10 h-10 flex items-center justify-center text-xl hover:bg-white/10 rounded-2xl transition-all"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                 </motion.div>
                               )}
                            </AnimatePresence>
                         </div>
                         
                         <form onSubmit={sendMessage} className="flex-1 flex gap-3 items-center bg-white/5 border border-white/10 rounded-[28px] p-1.5 pl-4 focus-within:bg-white/[0.08] focus-within:border-indigo-500/30 transition-all shadow-inner mr-16 ring-0 outline-none">
                            <input 
                              ref={textInputRef}
                              type="text" 
                              placeholder={isRecording ? "Đang ghi âm..." : "Nhập tin nhắn..."} 
                              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-semibold py-2.5 text-white placeholder:text-slate-500 outline-none" 
                              value={newMessage} 
                              onChange={(e) => setNewMessage(e.target.value)} 
                              disabled={isSending || isRecording} 
                            />
                            <button 
                              type="submit" 
                              disabled={(!newMessage.trim() && !attachedFile && !audioBlob) || isSending} 
                              className={`p-3 rounded-full transition-all ${
                                (newMessage.trim() || attachedFile || audioBlob) && !isSending 
                                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95' 
                                  : 'bg-white/5 text-slate-600'
                              }`}
                            >
                              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                         </form>
                      </div>
                    )}
                 </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Report Modal */}
          <AnimatePresence>
            {isReporting && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReporting(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                 <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5">
                       <h3 className="text-lg font-black uppercase text-white tracking-tight">Báo cáo vi phạm</h3>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Gửi thông tin để Admin xử lý</p>
                    </div>
                    <div className="p-6 space-y-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 px-1">Lý do báo cáo</label>
                          <select 
                            value={reportReason} 
                            onChange={(e) => setReportReason(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-orange-500"
                          >
                             <option value="">-- Chọn lý do --</option>
                             <option value="SPAM">Làm phiền / Spam</option>
                             <option value="HARASSMENT">Quấy rối / Đe dọa</option>
                             <option value="INAPPROPRIATE">Nội dung không phù hợp</option>
                             <option value="OTHER">Lý do khác</option>
                          </select>
                       </div>
                       <div className="flex gap-3">
                          <button onClick={() => setIsReporting(false)} className="flex-1 py-3 rounded-xl bg-white/5 text-[10px] font-black uppercase text-slate-400 hover:bg-white/10 transition-all">Hủy</button>
                          <button 
                            onClick={submitReport} 
                            disabled={!reportReason}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${reportReason ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-white/5 text-slate-700 cursor-not-allowed'}`}
                          >Gửi báo cáo</button>
                       </div>
                    </div>
                 </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
