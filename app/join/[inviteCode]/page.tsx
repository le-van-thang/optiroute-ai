"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, MapPin, ArrowRight, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { useSession } from "next-auth/react";

interface TripInfo {
  tripId: string;
  title: string;
  city: string | null;
  ownerName: string | null;
  memberCount: number;
}

export default function JoinPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const router = useRouter();

  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status: sessionStatus } = useSession();
  const [hasAutoAttempted, setHasAutoAttempted] = useState(false);

  useEffect(() => {
    if (!inviteCode) return;
    fetch(`/api/join/${inviteCode}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d.error || "Mã mời không hợp lệ");
        }
        return r.json();
      })
      .then((data) => setTripInfo(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [inviteCode]);

  // Auto-join if session is active
  useEffect(() => {
    if (sessionStatus === "authenticated" && tripInfo && !joined && !joining && !error && !hasAutoAttempted) {
      setHasAutoAttempted(true);
      handleJoin();
    }
  }, [sessionStatus, tripInfo, joined, joining, error, hasAutoAttempted]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch(`/api/join/${inviteCode}`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?next=/join/${inviteCode}`);
          return;
        }
        throw new Error(data.error || "Tham gia thất bại");
      }

      setJoined(true);
      setTimeout(() => {
        router.push(`/split-bill?tripId=${data.tripId}`);
      }, 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {loading && (
          <div className="flex flex-col items-center gap-4 text-center py-20">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
            <p className="text-slate-400 text-sm">Đang tải thông tin chuyến đi...</p>
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Không thể tham gia</h2>
            <p className="text-rose-300 text-sm">{error}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {joined ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0a1128] border border-emerald-500/20 rounded-3xl p-10 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-500/20"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </motion.div>
              <h2 className="text-2xl font-black text-white mb-2">Tham gia thành công!</h2>
              <p className="text-slate-400 text-sm">Đang chuyển đến trang chia tiền...</p>
            </motion.div>
          ) : tripInfo ? (
            <motion.div
              key="trip-info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#0a1128] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 bg-gradient-to-br from-indigo-900/40 to-transparent border-b border-white/5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-xs text-indigo-300/70 font-bold uppercase tracking-widest">
                    Lời mời tham gia nhóm
                  </p>
                </div>
                <h1 className="text-2xl font-black text-white mt-3 tracking-tight">
                  {tripInfo.title}
                </h1>
                {tripInfo.city && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <p className="text-sm text-slate-400">{tripInfo.city}</p>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <p className="text-sm text-slate-400">Tổ chức bởi</p>
                  <p className="text-sm font-bold text-white">{tripInfo.ownerName || "Không rõ"}</p>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <p className="text-sm text-slate-400">Thành viên hiện tại</p>
                  <p className="text-sm font-bold text-indigo-300">{tripInfo.memberCount} người</p>
                </div>
                <div className="flex items-center justify-between py-3">
                  <p className="text-sm text-slate-400">Mã mời</p>
                  <code className="text-xs bg-slate-800 text-indigo-300 px-3 py-1 rounded-lg font-mono font-bold tracking-wider">
                    {inviteCode}
                  </code>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 disabled:opacity-70 transition-all"
                >
                  {joining ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang xin vào nhóm...
                    </>
                  ) : (
                    <>
                      Tham gia chuyến đi
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>

                <p className="text-center text-[11px] text-slate-600 mt-2">
                  Bạn sẽ được thêm vào nhóm chia tiền của chuyến này
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
