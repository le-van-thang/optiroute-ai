"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { 
  Users, Search, MessageSquare, Send, 
  MoreVertical, CheckCheck, Loader2, User, 
  Bell, Check, Copy,
  Smile, Image as ImageIcon, Mic, Trash2, Trash, X, Reply, AlertTriangle, Play, Pause,
  UserMinus, Ban, Paperclip, UserPlus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { pusherClient } from "@/lib/pusher";
import { useToast } from "@/components/providers/ToastProvider";

const POPULAR_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍", "🔥", "✨", "🙌", "🎉", "✅", "❌", "🤔", "👀", "🚀", "💡", "💯", "🙏", "💪", "🌈", "⭐", "📍", "🔔", "🎁"];
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface SocialUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "USER" | "ADMIN";
  acceptMessages: boolean;
  friendStatus: "NONE" | "OUTGOING" | "INCOMING" | "FRIEND";
  friendRequestId?: string | null;
  lastActiveAt?: string | null;
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
    role?: "USER" | "ADMIN";
    friendStatus?: "NONE" | "OUTGOING" | "INCOMING" | "FRIEND";
    friendRequestId?: string | null;
    lastActiveAt?: string | null;
  };
  lastMessage: string;
  lastMessageTime: string;
}

export default function SocialHub() {
  const { data: session } = useSession();
  const { t } = useLang();
  const { showToast } = useToast();
  
  // State
  const [activeTab, setActiveTab ] = useState<"chat" | "find">("chat");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<SocialUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [isMsgSearching, setIsMsgSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SocialUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  
  // Media States
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedPreviews, setAttachedPreviews] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportPreview, setReportPreview] = useState<string | null>(null);
  const [reportDescription, setReportDescription] = useState("");
  const [activeSidebarMenu, setActiveSidebarMenu] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // UI States
  const [isMenuOpen, setIsMenuOpen] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  // Thay thế window.confirm() bằng React modal — giống Zalo/Messenger
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    icon: string;
    iconColor: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  // Ref to track selectedUser inside Pusher closure (avoids stale state)
  const selectedUserRef = useRef<SocialUser | null>(null);
  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);


  useEffect(() => {
    fetchConversations();
    
    if (!pusherClient) return;

    // CRITICAL FIX: Server triggers `private-user-*` but client must subscribe to same channel name
    const channelName = `private-user-${session?.user?.id}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("new-message", (data: Message & { conversationId?: string }) => {
      // Use ref to avoid stale closure issue with selectedUser state
      const currentSelectedUser = selectedUserRef.current;
      if (currentSelectedUser?.id === data.senderId || currentSelectedUser?.id === data.sender?.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
      fetchConversations(); // Refresh conversation list for lastMessage update
    });

    channel.bind("notification-update", () => {
      fetchConversations();
    });

    channel.bind("friend-request-accepted", () => {
      fetchConversations();
    });

    channel.bind("message-deleted", (data: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== data.messageId));
    });

    return () => {
      if (pusherClient) pusherClient.unsubscribe(channelName);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // === HEARTBEAT: Cập nhật Online Status mỗi 30 giây (giống Zalo/Mess) ===
  useEffect(() => {
    if (!session?.user?.id) return;

    const sendHeartbeat = () => fetch("/api/user/heartbeat", { method: "PATCH" }).catch(() => {});
    
    sendHeartbeat(); // Gửi ngay khi vào trang
    const heartbeatInterval = setInterval(sendHeartbeat, 30_000); // Mỗi 30 giây

    // Dừng heartbeat khi tab bị ẩn, tiếp tục khi tab active trở lại
    const handleVisibility = () => {
      if (document.visibilityState === "visible") sendHeartbeat();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [session?.user?.id]);

  // === PRESENCE SYNC: Làm mới danh sách bạn bè mỗi 60 giây để cập nhật presence ===
  useEffect(() => {
    if (!session?.user?.id) return;
    const presenceInterval = setInterval(fetchConversations, 60_000);
    return () => clearInterval(presenceInterval);
  }, [session?.user?.id]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/social/conversations");
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) { 
      console.error(err);
      setConversations([]);
    }
  };

  const fetchMessages = async (userId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/messages?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data);
    } catch (err) { console.error(err); }
    setIsLoadingMessages(false);
  };

  const sendMessage = async (e: any) => {
    e.preventDefault();
    const chatText = newMessage.trim();
    if (!chatText && attachedFiles.length === 0 && !audioBlob) return;
    setIsSending(true);

    try {
      setNewMessage(""); // Clear early for UX

      // 1. Batch upload and send images
      if (attachedFiles.length > 0) {
        for (let i = 0; i < attachedFiles.length; i++) {
           const uploadData = new FormData();
           uploadData.append("file", attachedFiles[i]);
           uploadData.append("type", "IMAGE");

           const uploadRes = await fetch("/api/chat/upload", { method: "POST", body: uploadData });
           if (uploadRes.ok) {
              const { url } = await uploadRes.json();
              const res = await fetch("/api/chat/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  receiverId: selectedUser!.id,
                  content: i === 0 ? chatText : "", // Text only on first message
                  type: "IMAGE",
                  fileUrl: url,
                  replyToId: i === 0 ? replyingTo?.id : null
                }),
              });
              if (res.ok) {
                const sentMsg = await res.json();
                setMessages(prev => {
                  if (prev.some(m => m.id === sentMsg.id)) return prev;
                  return [...prev, sentMsg];
                });
              }
           }
        }
        setAttachedFiles([]);
        setAttachedPreviews([]);
      } 
      // 2. Handle simple text
      else if (chatText) {
         const res = await fetch("/api/chat/messages", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
             receiverId: selectedUser!.id,
             content: chatText,
             type: "TEXT",
             replyToId: replyingTo?.id
           }),
         });
         if (res.ok) {
            const sentMsg = await res.json();
            setMessages(prev => {
              if (prev.some(m => m.id === sentMsg.id)) return prev;
              return [...prev, sentMsg];
            });
         }
      }
      // 3. Handle Audio
      else if (audioBlob) {
         const uploadData = new FormData();
         uploadData.append("file", audioBlob);
         uploadData.append("type", "AUDIO");
         const uploadRes = await fetch("/api/chat/upload", { method: "POST", body: uploadData });
         if (uploadRes.ok) {
            const { url } = await uploadRes.json();
            const res = await fetch("/api/chat/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                receiverId: selectedUser!.id,
                content: "Đã gửi tin nhắn thoại",
                type: "AUDIO",
                fileUrl: url,
                replyToId: replyingTo?.id
              }),
            });
            if (res.ok) {
               const sentMsg = await res.json();
               setMessages(prev => {
                 if (prev.some(m => m.id === sentMsg.id)) return prev;
                 return [...prev, sentMsg];
               });
            }
         }
         setAudioBlob(null);
      }
      
      setReplyingTo(null);
    } catch (err) { console.error(err); }
    setIsSending(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) { console.error(err); }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => setAttachedPreviews(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
      // Auto focus back to text input for premium UX
      setTimeout(() => textInputRef.current?.focus(), 100);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleReply = (msg: Message) => {
    setReplyingTo(msg);
    textInputRef.current?.focus();
  };

  const confirmDeleteMessage = async (msgId: string, scope: 'me' | 'everyone') => {
    try {
      const res = await fetch(`/api/chat/messages/${msgId}?type=${scope}`, { method: "DELETE" });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== msgId));
        setDeletingMessageId(null);
        showToast("Đã xóa tin nhắn", "success");
      }
    } catch (err) { console.error(err); }
  };
  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setIsSearchingUsers(true);
    try {
      const res = await fetch(`/api/social/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    setIsSearchingUsers(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!value.trim()) { setSearchResults([]); setIsSearchingUsers(false); return; }
    setIsSearchingUsers(true);
    searchDebounceRef.current = setTimeout(() => handleSearchUsers(value), 400);
  };

  const selectChat = (user: any) => {
    setSelectedUser(user);
    setActiveTab("chat");
    fetchMessages(user.id);
  };

  const handleClearHistory = async (userId: string) => {
    setActiveSidebarMenu(null);
    setIsMenuOpen(null);
    setConfirmDialog({
      title: "Xóa lịch sử",
      message: "Toàn bộ tin nhắn sẽ bị xóa phía bạn. Người kia vẫn giữ lịch sử của họ.",
      icon: "🗑️",
      iconColor: "bg-slate-700",
      confirmText: "Xóa lịch sử",
      confirmColor: "bg-slate-600 hover:bg-slate-500",
      onConfirm: async () => {
        setIsClearing(true);
        try {
          const conv = conversations.find(c => c.otherUser?.id === userId);
          if (!conv) { showToast("Không tìm thấy cuộc trò chuyện", "error"); setIsClearing(false); return; }
          const res = await fetch(`/api/chat/conversations/${conv.id}/clear`, { method: "POST" });
          if (res.ok) {
            setMessages([]);
            showToast("Đã xóa lịch sử", "success");
          } else {
            showToast("Xóa thất bại", "error");
          }
        } catch { showToast("Lỗi kết nối", "error"); }
        setIsClearing(false);
      }
    });
  };

  const handleAddFriend = async (userId: string) => {
    try {
      const res = await fetch("/api/social/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: userId })
      });
      if (res.ok) {
        showToast("Đã gửi yêu cầu kết bạn", "success");
        if (searchQuery) handleSearchUsers(searchQuery);
        fetchConversations();
        if (selectedUser?.id === userId) setSelectedUser({ ...selectedUser, friendStatus: "OUTGOING" });
      } else { showToast("Thao tác thất bại", "error"); }
    } catch { showToast("Lỗi kết nối", "error"); }
  };

  const handleAcceptFriend = async (requestId: string) => {
    try {
      const res = await fetch("/api/social/friends", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: "ACCEPTED" })
      });
      if (res.ok) {
        showToast("Đã chấp nhận kết bạn", "success");
        if (searchQuery) handleSearchUsers(searchQuery);
        fetchConversations();
        if (selectedUser) setSelectedUser({ ...selectedUser, friendStatus: "FRIEND" });
      } else { showToast("Thao tác thất bại", "error"); }
    } catch { showToast("Lỗi kết nối", "error"); }
  };

  const handleUnfriend = async (userId: string) => {
    setActiveSidebarMenu(null);
    setConfirmDialog({
      title: selectedUser?.friendStatus === 'OUTGOING' ? "Hủy yêu cầu" : "Hủy kết bạn",
      message: selectedUser?.friendStatus === 'OUTGOING' ? "Bạn muốn hủy yêu cầu kết bạn này?" : "Bạn sẽ không thể nhắn tin với nhau cho đến khi kết bạn lại.",
      icon: "👤",
      iconColor: "bg-slate-700",
      confirmText: selectedUser?.friendStatus === 'OUTGOING' ? "Hủy yêu cầu" : "Hủy kết bạn",
      confirmColor: "bg-slate-600 hover:bg-slate-500",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/social/friends", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetUserId: userId })
          });
          if (res.ok) {
            showToast("Đã thực hiện", "success");
            fetchConversations();
            if (searchQuery) handleSearchUsers(searchQuery);
            if (selectedUser?.id === userId) {
               setSelectedUser({ ...selectedUser, friendStatus: "NONE" });
            }
          } else { showToast("Thao tác thất bại", "error"); }
        } catch { showToast("Lỗi kết nối", "error"); }
      }
    });
  };

  const handleBlock = async (userId: string) => {
    const isBlocked = blockedUsers.has(userId);
    setActiveSidebarMenu(null);
    setConfirmDialog({
      title: isBlocked ? "Hủy chặn" : "Chặn người dùng",
      message: isBlocked
        ? "Người này sẽ có thể tìm và nhắn tin cho bạn trở lại."
        : "Họ sẽ không thể tìm thấy, nhắn tin hay kết bạn với bạn.",
      icon: isBlocked ? "🔓" : "🚫",
      iconColor: isBlocked ? "bg-blue-700" : "bg-red-700",
      confirmText: isBlocked ? "Hủy chặn" : "Chặn",
      confirmColor: isBlocked ? "bg-blue-600 hover:bg-blue-500" : "bg-red-600 hover:bg-red-500",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/social/block", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetUserId: userId })
          });
          if (res.ok) {
            const result = await res.json();
            if (result.status === "BLOCKED") {
              setBlockedUsers(prev => new Set([...prev, userId]));
              showToast("Đã chặn người dùng", "success");
            } else {
              setBlockedUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });
              showToast("Đã hủy chặn", "success");
            }
            fetchConversations();
          } else { showToast("Thao tác thất bại", "error"); }
        } catch { showToast("Lỗi kết nối", "error"); }
      }
    });
  };

  const submitReport = async () => {
    if (!reportReason || !selectedUser || isSubmittingReport) return; // Chặn double-submit
    setIsSubmittingReport(true);
    try {
      const conv = conversations.find(c => c.otherUser?.id === selectedUser.id);
      const res = await fetch("/api/social/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedId: selectedUser.id,
          conversationId: conv?.id ?? null,
          reason: reportReason,
          content: reportDescription || null,
          proofImage: reportPreview ?? null
        })
      });
      if (res.ok) {
        setIsReporting(false);
        setReportPreview(null);
        setReportFile(null);
        setReportReason("");
        setReportDescription("");
        showToast("Báo cáo đã được gửi. Admin sẽ xem xét sớm nhất!", "success");
      } else {
        const err = await res.json();
        showToast(err?.error || "Gửi báo cáo thất bại", "error");
      }
    } catch (err) { console.error(err); showToast("Lỗi kết nối", "error"); }
    finally { setIsSubmittingReport(false); }
  };


  const formatPresence = (lastActive: string | null | undefined) => {
    if (!lastActive) return { isOnline: false, text: "Ngoại tuyến", color: "bg-slate-500" };
    const diff = Date.now() - new Date(lastActive).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    // Heartbeat mỗi 30s → nếu online, lastActiveAt cách đây tối đa ~30-60s → luôn < 2 phút
    if (seconds < 120) return { isOnline: true, text: "TRỰC TUYẾN", color: "bg-emerald-500" };
    if (minutes < 60) return { isOnline: false, text: `Hoạt động ${minutes} phút trước`, color: "bg-slate-600" };
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return { isOnline: false, text: `Hoạt động ${hours} giờ trước`, color: "bg-slate-600" };
    return { isOnline: false, text: `Hoạt động lâu trước`, color: "bg-slate-600" };
  };

  return (
    <div className="h-[calc(100vh-56px)] bg-[#020817] p-4 lg:p-6 lg:pr-24 overflow-hidden flex justify-center">
      <div className="h-full w-full max-w-[1550px] flex bg-slate-900/50 border border-white/5 rounded-[32px] overflow-hidden relative shadow-2xl backdrop-blur-xl">
        {/* Sidebar */}
        <div className="w-[320px] hidden lg:flex flex-col border-r border-white/5 bg-slate-950/40">
          <div className="p-6 pt-10">
            <h2 className="text-xl font-black uppercase text-white flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
              <span>Social Hub</span>
            </h2>
            <div className="mt-6 flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.05]">
              {['chat', 'find'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {tab === 'chat' ? 'Tin nhắn' : 'Khám phá'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {activeTab === "chat" ? (
              (conversations || []).filter(c => c?.otherUser).map((conv) => (
                <div 
                  key={conv.id} 
                  onClick={() => selectChat(conv.otherUser)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectChat(conv.otherUser); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all group ${selectedUser?.id === conv.otherUser?.id ? 'bg-white/10' : 'hover:bg-white/5 focus:bg-white/5 outline-none'}`}
                >
                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-slate-800 overflow-hidden border border-white/5">
                      {conv.otherUser.image ? <img src={conv.otherUser.image} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 m-3 text-slate-600" />}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-slate-900 rounded-full p-0.5 border border-slate-900`}>
                      <div className={`w-full h-full rounded-full ${formatPresence(conv.otherUser.lastActiveAt).color}`} />
                    </div>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{conv.otherUser.name}</h4>
                    <p className="text-[10px] text-slate-500 font-medium truncate uppercase tracking-tight">{formatPresence(conv.otherUser.lastActiveAt).text}</p>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveSidebarMenu(activeSidebarMenu === conv.id ? null : conv.id); }} 
                      className={`p-1.5 rounded-lg transition-all ${activeSidebarMenu === conv.id ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100'}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {activeSidebarMenu === conv.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveSidebarMenu(null); }} />
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50">
                           <button onClick={(e) => { e.stopPropagation(); handleClearHistory(conv.otherUser.id); setActiveSidebarMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                              <Trash2 className="w-4 h-4" /> Xóa lịch sử
                           </button>
                           <button onClick={(e) => { e.stopPropagation(); setActiveSidebarMenu(null); handleUnfriend(conv.otherUser.id); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                              <UserMinus className="w-4 h-4" /> Hủy kết bạn
                           </button>
                           <div className="h-px bg-white/5 my-1" />
                           <button onClick={(e) => { e.stopPropagation(); setActiveSidebarMenu(null); handleBlock(conv.otherUser.id); }} className={`w-full flex items-center gap-3 px-3 py-2.5 text-[11px] rounded-xl transition-all font-bold ${blockedUsers.has(conv.otherUser.id) ? 'text-blue-400 hover:bg-blue-500/10' : 'text-red-400 hover:bg-red-500/10'}`}>
                              <Ban className="w-4 h-4" /> {blockedUsers.has(conv.otherUser.id) ? 'Hủy chặn' : 'Chặn người dùng'}
                           </button>
                           <button onClick={(e) => { e.stopPropagation(); setSelectedUser(conv.otherUser as any); setIsReporting(true); setActiveSidebarMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] text-orange-400 hover:bg-orange-500/10 rounded-xl transition-all font-bold">
                              <AlertTriangle className="w-4 h-4" /> Báo cáo vi phạm
                           </button>
                        </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col h-full">
                {/* Search Input */}
                <div className="p-4 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input 
                      type="text" 
                      placeholder="Tìm bạn bè theo tên..."
                      className="w-full bg-white/[0.06] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.08] transition-all"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      autoComplete="off"
                    />
                    {isSearchingUsers && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-indigo-400" />
                    )}
                  </div>
                </div>

                {/* Results Area */}
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5 custom-scrollbar-hidden">
                  {searchResults.length > 0 ? (
                    searchResults.map(user => (
                      <div 
                        key={user.id} 
                        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/[0.04] transition-all group"
                      >
                        <button onClick={() => selectChat(user)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden border border-white/5 flex-shrink-0 relative">
                            {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 m-3 text-slate-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-white truncate">{user.name}</p>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.email}</p>
                            <p className="text-[9px] text-slate-700 font-mono mt-0.5">#{user.id.slice(0, 8)}</p>
                          </div>
                        </button>
                        {/* Friend Status Action Button - like Zalo Explore */}
                        {user.friendStatus === 'FRIEND' ? (
                          <button onClick={(e) => { e.stopPropagation(); selectChat(user); }} className="flex-shrink-0 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/20 hover:bg-indigo-600/40 transition-all">
                            Nhắn tin
                          </button>
                        ) : user.friendStatus === 'OUTGOING' ? (
                          <button onClick={(e) => { e.stopPropagation(); handleUnfriend(user.id); }} className="flex-shrink-0 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl border border-white/10 transition-all">
                            Hủy yêu cầu
                          </button>
                        ) : user.friendStatus === 'INCOMING' ? (
                          <button onClick={(e) => { e.stopPropagation(); user.friendRequestId && handleAcceptFriend(user.friendRequestId); }} className="flex-shrink-0 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-xl border border-emerald-500/20 transition-all">
                            Chấp nhận
                          </button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); handleAddFriend(user.id); }} className="flex-shrink-0 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-white/5 text-slate-300 rounded-xl border border-white/10 hover:bg-indigo-600/20 hover:text-indigo-400 hover:border-indigo-500/20 transition-all">
                            + Kết bạn
                          </button>
                        )}
                      </div>
                    ))
                  ) : searchQuery && !isSearchingUsers ? (
                    <div className="flex flex-col items-center justify-center py-16 opacity-30">
                       <Users className="w-10 h-10 mb-3" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Không tìm thấy ai</span>
                    </div>
                  ) : !searchQuery ? (
                    <div className="flex flex-col items-center justify-center py-16 opacity-20">
                       <Search className="w-10 h-10 mb-3" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-center px-4 leading-relaxed">Gõ tên để tìm kiếm bạn bè</span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative bg-slate-950/20">
          {!selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <MessageSquare className="w-12 h-12 text-slate-700 mb-4 opacity-20" />
              <h3 className="text-xl font-black uppercase text-white tracking-widest opacity-30">Social Hub</h3>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="p-4 pt-6 px-8 border-b border-white/10 flex items-center justify-between bg-slate-900/40 backdrop-blur-3xl z-20">
                <div className="flex items-center gap-4 text-left">
                   <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden border border-white/10 relative">
                     {selectedUser.image ? <img src={selectedUser.image} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 m-2.5 text-slate-600" />}
                   </div>
                   <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm">{selectedUser.name}</h4>
                      <p className={`text-[9px] font-bold uppercase tracking-widest ${formatPresence(selectedUser.lastActiveAt).isOnline ? 'text-indigo-400' : 'text-slate-500'}`}>{formatPresence(selectedUser.lastActiveAt).text}</p>
                   </div>
                </div>

                <div className="flex items-center gap-2">
                  <AnimatePresence>
                    {isMsgSearching && (
                      <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 220, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="relative">
                               <input 
                                 type="text" 
                                 placeholder="Tìm tin nhắn..." 
                                 className="w-full bg-slate-950/40 !border-0 !ring-0 rounded-full px-4 py-1.5 text-xs text-white outline-none focus:outline-none shadow-none"
                                 value={messageSearchQuery}
                                 onChange={(e) => setMessageSearchQuery(e.target.value)}
                                 autoFocus
                               />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button onClick={() => { setIsMsgSearching(!isMsgSearching); if (isMsgSearching) setMessageSearchQuery(""); }} className={`p-2 rounded-lg transition-all ${isMsgSearching ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                    <Search className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsMenuOpen(isMenuOpen === "header" ? null : "header")} className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  <AnimatePresence>
                    {isMenuOpen === "header" && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-8 top-16 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-1 z-50">
                        <button onClick={() => { setIsMenuOpen(null); handleClearHistory(selectedUser.id); }} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                           <Trash2 className="w-4 h-4" /> Xóa lịch sử
                        </button>
                        <button onClick={() => setIsReporting(true)} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                           <AlertTriangle className="w-4 h-4" /> Báo cáo
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {messages.filter(m => m.content.toLowerCase().includes(messageSearchQuery.toLowerCase())).map((msg) => {
                  const isMine = msg.senderId === session?.user?.id;
                  return (
                    <div key={msg.id} className={`flex items-end gap-3 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {!isMine && (
                         <div className="w-7 h-7 rounded-lg bg-slate-800 overflow-hidden border border-white/5 shrink-0">
                           {msg.sender.image ? <img src={msg.sender.image} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 m-1.5 text-slate-600" />}
                         </div>
                      )}
                      <div className={`max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'} group relative`}>
                        <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all ${isMine ? 'right-full mr-3' : 'left-full ml-3'}`}>
                           <button onClick={() => handleReply(msg)} className="p-1.5 rounded-full bg-slate-900 border border-white/10 text-slate-500 hover:text-white hover:bg-indigo-600"><Reply className="w-3.5 h-3.5" /></button>
                           <button onClick={() => handleCopyMessage(msg.id, msg.content)} className="p-1.5 rounded-full bg-slate-900 border border-white/10 text-slate-500 hover:text-white hover:bg-emerald-600">
                             {copiedMessageId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                           </button>
                           <button onClick={() => setDeletingMessageId(msg.id)} className="p-1.5 rounded-full bg-slate-900 border border-white/10 text-slate-500 hover:text-white hover:bg-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className={`shadow-xl transition-all ${msg.type === 'IMAGE' ? 'p-0 bg-transparent overflow-hidden' : (isMine ? 'px-4 py-2.5 bg-indigo-600 text-white rounded-2xl rounded-br-md' : 'px-4 py-2.5 bg-slate-800 text-slate-100 rounded-2xl rounded-bl-md border border-white/5')}`}>
                           {msg.replyTo && (
                             <div className="mb-2 p-2 rounded-xl bg-black/20 border-l-2 border-indigo-400 text-[10px] opacity-70">
                               <p className="font-bold opacity-60">@{msg.replyTo.sender.name}</p>
                               <p className="truncate">{msg.replyTo.content}</p>
                             </div>
                           )}
                           {msg.type === "TEXT" && <p className="text-[13px]">{msg.content}</p>}
                           {msg.type === "IMAGE" && <img src={msg.fileUrl} onClick={() => setViewImage(msg.fileUrl!)} className={`max-w-full max-h-[300px] object-contain cursor-pointer transition-all hover:brightness-110 ${isMine ? 'rounded-2xl rounded-br-none' : 'rounded-2xl rounded-bl-none'}`} />}
                           {msg.type === "AUDIO" && (
                             <div className="flex items-center gap-3 min-w-[120px]">
                               <button onClick={() => { 
                                  const p = document.getElementById(`audio-${msg.id}`) as any;
                                  if (playingAudioId === msg.id) { p.pause(); setPlayingAudioId(null); }
                                  else { p.play(); setPlayingAudioId(msg.id); p.onended = () => setPlayingAudioId(null); }
                               }} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                 {playingAudioId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                               </button>
                               <div className="flex-1 h-0.5 bg-white/20 rounded-full relative overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: playingAudioId === msg.id ? '100%' : 0 }} className="absolute inset-0 bg-white" /></div>
                               <audio id={`audio-${msg.id}`} src={msg.fileUrl} className="hidden" />
                             </div>
                           )}
                        </div>
                        <span className="text-[8px] text-slate-600 font-bold uppercase mt-1 px-1">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-slate-950/20">
                {blockedUsers.has(selectedUser.id) ? (
                  <div className="flex flex-col items-center justify-center py-6 px-4 text-center bg-slate-900 border border-white/5 rounded-[2rem]">
                    <p className="text-slate-400 text-[11px] mb-3 uppercase tracking-wider font-semibold">Bạn đã chặn người này. Không thể nhắn tin.</p>
                    <button onClick={() => handleBlock(selectedUser.id)} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg">Bỏ chặn</button>
                  </div>
                ) : selectedUser.friendStatus === 'NONE' ? (
                   <div className="flex flex-col items-center justify-center py-6 px-4 text-center bg-slate-900 border border-white/5 rounded-[2rem]">
                    <p className="text-slate-400 text-[11px] mb-3 uppercase tracking-wider font-semibold">Bạn và người này hiện không phải là bạn bè.</p>
                    <button onClick={() => handleAddFriend(selectedUser.id)} className="px-6 py-2.5 bg-indigo-600/20 hover:bg-indigo-500/40 text-indigo-400 border border-indigo-500/20 text-[11px] font-black tracking-widest uppercase rounded-xl transition-all shadow-lg flex items-center gap-2"><UserPlus className="w-4 h-4" /> Kết bạn lại</button>
                  </div>
                ) : selectedUser.friendStatus === 'OUTGOING' ? (
                   <div className="flex flex-col items-center justify-center py-6 px-4 text-center bg-slate-900 border border-white/5 rounded-[2rem]">
                    <p className="text-slate-400 text-[11px] mb-3 uppercase tracking-wider font-semibold">Đã gửi yêu cầu kết bạn. Đang chờ phản hồi.</p>
                    <button onClick={() => handleUnfriend(selectedUser.id)} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[11px] font-black tracking-widest uppercase rounded-xl transition-all shadow-lg">Hủy yêu cầu</button>
                  </div>
                ) : selectedUser.friendStatus === 'INCOMING' ? (
                   <div className="flex flex-col items-center justify-center py-6 px-4 text-center bg-slate-900 border border-white/5 rounded-[2rem]">
                    <p className="text-slate-400 text-[11px] mb-3 uppercase tracking-wider font-semibold">Người này muốn kết bạn với bạn.</p>
                    <button onClick={() => selectedUser.friendRequestId && handleAcceptFriend(selectedUser.friendRequestId)} className="px-6 py-2.5 bg-emerald-600/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/20 text-[11px] font-black tracking-widest uppercase rounded-xl transition-all flex items-center gap-2"><Check className="w-4 h-4" /> Chấp nhận</button>
                  </div>
                ) : (
                  <>
                    <AnimatePresence>
                      {replyingTo && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mb-3 p-3 bg-indigo-500/10 border-l-4 border-indigo-500 rounded-xl flex items-center justify-between">
                           <div className="min-w-0"><p className="text-[10px] font-bold text-indigo-400 uppercase">Trả lời @{replyingTo.sender.name}</p><p className="text-xs text-slate-400 truncate italic">"{replyingTo.content}"</p></div>
                           <button onClick={() => setReplyingTo(null)} className="p-1 text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center gap-3 p-1.5 bg-slate-900 border border-white/5 rounded-full shadow-lg relative">
                      <div className="flex items-center gap-1 pl-2">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:text-white transition-all"><ImageIcon className="w-5 h-5" /></button>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" multiple />
                        <button onClick={isRecording ? stopRecording : startRecording} className={`p-2 transition-all ${isRecording ? 'text-red-500 animate-pulse' : 'text-slate-500 hover:text-white'}`}><Mic className="w-5 h-5" /></button>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {isRecording ? (
                          <div className="flex-1 flex items-center px-4 h-11 bg-red-500/10 rounded-full border border-red-500/20"><span className="text-[10px] font-bold text-red-500 uppercase tracking-widest animate-pulse">Recording...</span><button onClick={stopRecording} className="ml-auto text-xs font-black uppercase text-red-500">Dừng</button></div>
                        ) : audioBlob ? (
                          <div className="flex-1 flex items-center px-4 h-11 bg-indigo-500/10 rounded-full border border-indigo-500/20"><Mic className="w-4 h-4 text-indigo-400 mr-3" /><div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden"><motion.div animate={{ width: '100%' }} transition={{ duration: 1.5, repeat: Infinity }} className="h-full bg-indigo-500" /></div><button onClick={() => setAudioBlob(null)} className="ml-4 text-slate-500 hover:text-red-400"><X className="w-4 h-4" /></button></div>
                        ) : (
                          <form onSubmit={sendMessage} className="flex-1 flex items-center bg-transparent px-4">
                            <AnimatePresence>
                              {attachedPreviews.length > 0 && (
                                <div className="flex items-center gap-2 mr-3 py-1 overflow-x-auto max-w-[200px] custom-scrollbar no-scrollbar">
                                  {attachedPreviews.map((preview, idx) => (
                                    <motion.div key={idx} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative shrink-0">
                                       <img src={preview} className="w-9 h-9 object-cover rounded-lg border border-white/20 shadow-xl" />
                                       <button type="button" onClick={() => { 
                                         setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
                                         setAttachedPreviews(prev => prev.filter((_, i) => i !== idx));
                                       }} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors shadow-lg">
                                         <X className="w-2.5 h-2.5" />
                                       </button>
                                    </motion.div>
                                  ))}
                                </div>
                              )}
                            </AnimatePresence>
                            <input 
                              ref={textInputRef} 
                              type="text" 
                              placeholder="Nhập tin nhắn..." 
                              className="flex-1 bg-transparent !border-0 !ring-0 text-[13px] py-2 text-white placeholder:text-slate-600 font-medium outline-none focus:outline-none shadow-none" 
                              value={newMessage} 
                              onChange={(e) => setNewMessage(e.target.value)} 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  sendMessage(e);
                                }
                              }}
                            />
                            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-slate-500 hover:text-white transition-all"><Smile className="w-5 h-5" /></button>
                            <AnimatePresence>
                              {showEmojiPicker && (
                                <motion.div ref={emojiPickerRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full right-4 mb-4 p-3 bg-slate-900 border border-white/10 rounded-3xl shadow-2xl z-50 w-64">
                                   <div className="grid grid-cols-6 gap-2">
                                      {POPULAR_EMOJIS.map(e => (
                                        <button key={e} type="button" onClick={() => { setNewMessage(p => p + e); setShowEmojiPicker(false); }} className="hover:bg-white/10 p-2 rounded-xl text-xl hover:scale-125 transition-all">{e}</button>
                                      ))}
                                   </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </form>
                        )}
                      </div>

                      <div className="pr-1">
                        <button 
                          type="button"
                          onClick={sendMessage} 
                          disabled={(!newMessage.trim() && attachedFiles.length === 0 && !audioBlob) || isSending} 
                          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${newMessage.trim() || attachedFiles.length > 0 || audioBlob ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
                        >
                          {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Overlay (Global) */}
        <AnimatePresence>
          {deletingMessageId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingMessageId(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-6"><Trash2 className="w-8 h-8" /></div>
                  <h3 className="text-xl font-bold text-white mb-2">Xóa tin nhắn?</h3>
                  <p className="text-slate-400 text-xs mb-8">Hành động này không thể hoàn tác.</p>
                  <div className="space-y-3">
                     {messages.find(m => m.id === deletingMessageId)?.senderId === session?.user?.id && (
                       <button onClick={() => confirmDeleteMessage(deletingMessageId, 'everyone')} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase transition-all shadow-lg shadow-red-900/20">Xóa với mọi người</button>
                     )}
                     <button onClick={() => confirmDeleteMessage(deletingMessageId, 'me')} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-black uppercase transition-all">Xóa phía tôi</button>
                     <button onClick={() => setDeletingMessageId(null)} className="w-full py-4 text-slate-500 hover:text-white text-xs font-black uppercase transition-all">Hủy</button>
                  </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isReporting && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReporting(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#0c1222] border border-white/10 rounded-[28px] overflow-hidden max-w-md w-full max-h-[calc(100vh-130px)] flex flex-col shadow-2xl">
                   {/* Banner Header (Fixed) */}
                   <div className="bg-orange-600/20 px-6 py-5 flex items-center gap-4 border-b border-orange-500/20 shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-600/30">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black uppercase text-white tracking-widest leading-none">Báo cáo vi phạm</h3>
                        <p className="text-[9px] text-orange-400 font-bold uppercase mt-1 tracking-tight">bạn đang báo cáo: <span className="bg-white/10 px-2 py-0.5 rounded ml-1 uppercase">{selectedUser?.name}</span></p>
                      </div>
                   </div>

                   {/* Scrollable Content Area */}
                   <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
                      {/* Reason Selection */}
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">1. Chọn lý do <span className="text-red-500 ml-1">*</span></label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            "Làm phiền / Spam",
                            "Quấy rối / Đe dọa",
                            "Lừa đảo / Chiếm đoạt",
                            "Nội dung phản cảm",
                            "Lý do khác"
                          ].map(r => (
                            <button 
                              key={r} 
                              onClick={() => { setReportReason(r); if (r !== "Lý do khác") setReportDescription(""); }} 
                              className={`p-3.5 rounded-xl text-left border flex items-center justify-between transition-all group ${reportReason === r ? 'bg-orange-600/10 border-orange-600 text-white shadow-inner' : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10'}`}
                            >
                              <span className="text-[11px] font-bold">{r}</span>
                              {reportReason === r && <Check className="w-3 h-3 text-orange-500" />}
                            </button>
                          ))}
                        </div>
                        
                        {reportReason === "Lý do khác" && (
                           <div className="mt-3">
                               <textarea 
                                 placeholder="Vui lòng nhập lý do chi tiết..." 
                                 className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-orange-500 transition-all min-h-[80px]"
                                 value={reportDescription}
                                 onChange={(e) => setReportDescription(e.target.value)}
                               />
                           </div>
                        )}
                      </section>

                      {/* Evidence Section */}
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">2. Kèm bằng chứng</label>
                          <span className="bg-orange-600/10 text-orange-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-orange-500/20 tracking-widest">Khuyến dùng</span>
                        </div>
                        
                        {!reportPreview ? (
                        <button 
                            onClick={() => document.getElementById('report-file')?.click()}
                            className="w-full h-20 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-3 group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-white transition-all"><Paperclip className="w-4 h-4" /></div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tải lên ảnh minh chứng</span>
                          </button>
                        ) : (
                          <div className="relative group">
                            <img src={reportPreview} className="w-full aspect-[21/9] object-cover rounded-2xl border border-white/10 shadow-2xl" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-2xl backdrop-blur-sm">
                              <button onClick={() => { setReportFile(null); setReportPreview(null); }} className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-[9px] font-black uppercase rounded-lg shadow-lg">
                                <Trash2 className="w-3 h-3" /> Xóa ảnh
                              </button>
                            </div>
                          </div>
                        )}
                        <input 
                          type="file" 
                          id="report-file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setReportFile(file);
                              const reader = new FileReader();
                              reader.onloadend = () => setReportPreview(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </section>

                      {/* Warning Box */}
                      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shrink-0 shadow-lg"><AlertTriangle className="w-4 h-4" /></div>
                        <p className="text-[10px] text-red-200/70 font-medium leading-relaxed">Vui lòng chỉ báo cáo khi chắc chắn. Cố tình gửi báo cáo rác có thể dẫn đến việc tài khoản của bạn bị khóa.</p>
                      </div>
                   </div>

                   {/* Sticky Footer (Fixed) */}
                   <div className="px-5 py-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-md flex gap-3 shrink-0">
                      <button onClick={() => { setIsReporting(false); setReportPreview(null); setReportFile(null); setReportReason(""); setReportDescription(""); }} className="flex-1 py-3 rounded-xl bg-white/5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Hủy bỏ</button>
                      <button 
                        onClick={submitReport} 
                        disabled={!reportReason || (reportReason === "Lý do khác" && !reportDescription.trim())} 
                        className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${reportReason && (reportReason !== "Lý do khác" || reportDescription.trim()) ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-xl shadow-red-600/30' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
                      >
                        <Send className="w-3.5 h-3.5" /> Gửi báo cáo
                      </button>
                   </div>
                </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* View Image Modal */}
        <AnimatePresence>
          {viewImage && (
           <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/95 backdrop-blur-xl" onClick={() => setViewImage(null)}>
               <motion.img 
                  initial={{ scale: 0.95, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  src={viewImage} 
                  className="max-w-[75vw] max-h-[75vh] object-contain rounded-2xl" 
               />
               <button className="absolute top-16 right-16 p-5 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-md z-[210] shadow-2xl">
                  <X className="w-6 h-6" />
               </button>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== GLOBAL CONFIRM DIALOG (thay thế window.confirm) ===== */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDialog(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl ${confirmDialog.iconColor} flex items-center justify-center text-3xl mx-auto mb-5 shadow-lg`}>
                {confirmDialog.icon}
              </div>
              {/* Title */}
              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">{confirmDialog.title}</h3>
              {/* Message */}
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">{confirmDialog.message}</p>
              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-3.5 rounded-2xl bg-white/5 text-white text-sm font-bold hover:bg-white/10 transition-all border border-white/5"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    const fn = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    fn();
                  }}
                  className={`flex-1 py-3.5 rounded-2xl text-white text-sm font-black transition-all shadow-lg ${confirmDialog.confirmColor}`}
                >
                  {confirmDialog.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
