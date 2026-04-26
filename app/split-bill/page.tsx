"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import {
  Users, Plus, Receipt, ArrowRightLeft, X, Trash2, Check,
  QrCode, ChevronDown, CheckCheck, UserPlus, Wallet,
  CreditCard, Banknote, Info, User, ArrowUpRight, ArrowDownRight,
  TrendingUp, Activity, Split, Download, Share2, Maximize2, Search, CheckCircle2,
  Link2, Copy, Loader2, Eye, ShieldCheck, AlertCircle, Image as ImageIcon,
  BellRing, Mail, UtensilsCrossed, Coffee, Car, Bed, Ticket, ShoppingBag, History as LucideHistory
} from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";
import { BankSettingsModal } from "@/components/split-bill/BankSettingsModal";
import { PaymentModal } from "@/components/split-bill/PaymentModal";
import { BankBanner } from "@/components/split-bill/BankBanner";
import { useToast } from "@/components/providers/ToastProvider";

// --- Types ---
interface Member {
  id: string;
  name: string;
  color: string;
  email?: string; // Phase 21: store email for identifying current user
  // DB fields (when in multiplayer mode)
  dbUserId?: string;
  bankCode?: string;    // local-only (singleplayer)
  bankAccount?: string; // local-only (singleplayer)
  bankAccountName?: string; 
  hasBankInDb?: boolean; // true = bank info exists in DB
  isLeader?: boolean;   // true = trip leader
  isMe?: boolean;
  image?: string;
}
interface DB_Settlement {
  id: string;
  payerId: string;
  receiverId: string;
  amount: number;
  status: "PENDING" | "COMPLETED";
  receiptUrl?: string;
  createdAt: string;
}
interface ExpenseShare {
  userId: string;
  amountOwed: number;
  settlementPaid: boolean;
}
interface Expense {
  id: string;
  name: string;
  amount: number;
  paidBy: string; // member id
  participants: string[]; // member ids
  createdAt?: string;    // ISO date string
  synced?: boolean;
  shares?: ExpenseShare[];
}
interface Settlement { from: string; to: string; amount: number; }
interface TripInfo { 
  id: string; 
  title: string; 
  city: string | null; 
  inviteCode: string | null; 
  ownerId?: string; // Phase 21: track owner for UI
}

// --- VietQR Banks ---
const BANKS = [
  // Big 4
  { code: "VCB", name: "Vietcombank" },
  { code: "CTG", name: "VietinBank" },
  { code: "BIDV", name: "BIDV" },
  { code: "VBA", name: "Agribank" },
  // Large Joint Stock
  { code: "MB", name: "MB Bank" },
  { code: "TCB", name: "Techcombank" },
  { code: "ACB", name: "ACB" },
  { code: "VPB", name: "VPBank" },
  { code: "TPB", name: "TPBank" },
  { code: "VIB", name: "VIB" },
  { code: "STB", name: "Sacombank" },
  { code: "HDB", name: "HDBank" },
  { code: "SHB", name: "SHB" },
  { code: "EIB", name: "Eximbank" },
  { code: "MSB", name: "MSB" },
  { code: "OCB", name: "OCB" },
  { code: "SCB", name: "SCB" },
  { code: "LPB", name: "LPBank" },
  // Others / Digital
  { code: "TIMO", name: "Timo" },
  { code: "CAKE", name: "Cake" },
  { code: "TNEX", name: "TNEX" },
  { code: "UOB", name: "UOB" },
  { code: "CBB", name: "CBBank" },
  { code: "WVN", name: "Woori" },
  { code: "SGB", name: "Saigonbank" },
  { code: "BAB", name: "Bac A Bank" },
  { code: "BVB", name: "BaoViet Bank" },
  { code: "NAB", name: "Nam A Bank" },
  { code: "OJB", name: "OceanBank" },
  { code: "PGB", name: "PGBank" },
  { code: "SEAB", name: "SeABank" },
  { code: "VAB", name: "VietA Bank" },
  { code: "VCCB", name: "Viet Capital" },
];

const MEMBER_COLORS = [
  "bg-indigo-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-purple-500", "bg-orange-500"
];

const getStableColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
};

// --- Settle Up Algorithm (Minimum transactions) ---
function calculateSettlements(members: Member[], expenses: Expense[]): Settlement[] {
  const balance: Record<string, number> = {};
  members.forEach(m => balance[m.id] = 0);

  expenses.forEach(exp => {
    if (!balance.hasOwnProperty(exp.paidBy)) return;
    const share = exp.amount / exp.participants.length;
    exp.participants.forEach(pid => {
      if (balance.hasOwnProperty(pid)) balance[pid] -= share;
    });
    balance[exp.paidBy] += exp.amount;
  });

  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  Object.entries(balance).forEach(([id, amt]) => {
    if (amt > 0.01) creditors.push({ id, amount: amt });
    else if (amt < -0.01) debtors.push({ id, amount: -amt });
  });

  const settlements: Settlement[] = [];
  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const amount = Math.min(credit.amount, debt.amount);
    settlements.push({ from: debt.id, to: credit.id, amount: Math.round(amount) });
    credit.amount -= amount;
    debt.amount -= amount;
    if (credit.amount < 0.01) ci++;
    if (debt.amount < 0.01) di++;
  }
  return settlements;
}

// Phase 23: Balance with DB Settlements - Refactored for overpayment accuracy
function calculateNetSettlements(members: Member[], expenses: Expense[], dbSettlements: DB_Settlement[]): Settlement[] {
  const balance: Record<string, number> = {};
  members.forEach(m => balance[m.id] = 0);

  // 1. Calculate base balances from expenses
  expenses.forEach(exp => {
    if (!balance.hasOwnProperty(exp.paidBy)) return;
    const share = exp.amount / (exp.participants.length || 1);
    exp.participants.forEach(pid => {
      if (balance.hasOwnProperty(pid)) balance[pid] -= share;
    });
    balance[exp.paidBy] += exp.amount;
  });

  // 2. Adjust balances with COMPLETED settlements (the "Reality" check)
  dbSettlements.forEach(s => {
    if (s.status === "COMPLETED") {
      if (balance.hasOwnProperty(s.payerId)) balance[s.payerId] += s.amount;
      if (balance.hasOwnProperty(s.receiverId)) balance[s.receiverId] -= s.amount;
    }
  });

  // 3. Solve for minimum transactions using Net Balances
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  Object.entries(balance).forEach(([id, amt]) => {
    if (amt > 0.01) creditors.push({ id, amount: amt });
    else if (amt < -0.01) debtors.push({ id, amount: -amt });
  });

  const settlements: Settlement[] = [];
  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const amount = Math.min(credit.amount, debt.amount);
    settlements.push({ from: debt.id, to: credit.id, amount: Math.round(amount) });
    credit.amount -= amount;
    debt.amount -= amount;
    if (credit.amount < 0.01) ci++;
    if (debt.amount < 0.01) di++;
  }
  return settlements;
}

// --- Animated Counter ---
function AnimatedNumber({ value }: { value: number }) {
  return <span className="tabular-nums">{value.toLocaleString()}</span>;
}

// --- Modals & Helpers migrated to separate components ---

// --- Helper functions ---
const getStandardColor = (index: number) => {
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4", "#a855f7", "#f97316"];
  return colors[index % colors.length];
};

// --- Main Component logic moved to SplitBillContent for Suspense handle ---
function SplitBillContent() {
  const { lang } = useLang();
  const router = useRouter();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const tripIdFromUrl = searchParams.get("tripId");
  
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<"expenses" | "settle">("expenses");

  // Auto-switch tab and scroll to settlement if param exists
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "settle") {
      setActiveTab("settle");
      // Give time for the tab to render before scrolling
      setTimeout(() => {
        const element = document.getElementById("settlement-section");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 500);
    }
  }, [searchParams]);

  const [showExpForm, setShowExpForm] = useState(false);
  const [customConfirm, setCustomConfirm] = useState<{title?: string, message: string, onConfirm: () => void} | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [expForm, setExpForm] = useState<Omit<Expense, "id">>(({ name: "", amount: 0, paidBy: "", participants: [] }));
  const [qrTarget, setQrTarget] = useState<Settlement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fintech Audit & UI Context
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [reminding, setReminding] = useState<string | null>(null); // from-to key
  const [notReceiving, setNotReceiving] = useState<string | null>(null); // debtor-trip key
  
  // Multiplayer state
  const [activeTrip, setActiveTrip] = useState<TripInfo | null>(null);
  const [myTrips, setMyTrips] = useState<TripInfo[]>([]);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [expSearch, setExpSearch] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [initialSyncDone, setInitialSyncDone] = useState(false); // Persistence guard

  // Banking & Smart Settlements
  const [dbSettlements, setDbSettlements] = useState<DB_Settlement[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [viewingSettlement, setViewingSettlement] = useState<{ receiver: Member; amount: number } | null>(null);
  const [meBankMissing, setMeBankMissing] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null); // settlementId
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null); // receiptUrl
  const [recentlyCompletedIds, setRecentlyCompletedIds] = useState<string[]>([]); // For temporary history visibility

  // ─── Load trips from DB ─────────────────────────────
  useEffect(() => {
    if (!session?.user) return;
    const fetchTripsAndProfile = async () => {
      try {
        // Fetch trips
        const tripRes = await fetch("/api/trips");
        const trips = await tripRes.json();
        if (Array.isArray(trips)) setMyTrips(trips);

        // Fetch profile for lastActiveTripId
        const profileRes = await fetch("/api/user/profile");
        const profile = await profileRes.json();

        if (Array.isArray(trips)) {
          // Persistence: Restore last active trip if not already set by URL
          if (!tripIdFromUrl) {
            const dbLastTripId = profile.lastActiveTripId;
            const storageLastTripId = localStorage.getItem("optiroute_last_trip_id");
            const targetId = dbLastTripId || storageLastTripId;

            if (targetId) {
              const found = trips.find(t => t.id === targetId);
              if (found) handleSelectTrip(found, true);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setInitialSyncDone(true);
      }
    };
    fetchTripsAndProfile();
  }, [session]);

  // ─── Handle tripId from URL (after joining via invite) ─
  useEffect(() => {
    if (!tripIdFromUrl || myTrips.length === 0) return;
    const found = myTrips.find(t => t.id === tripIdFromUrl);
    if (found) handleSelectTrip(found);
  }, [tripIdFromUrl, myTrips]);

  // ─── Save active trip for persistence ───────────────
  useEffect(() => {
    if (activeTrip?.id) {
      localStorage.setItem("optiroute_last_trip_id", activeTrip.id);
    } else if (initialSyncDone && !isMultiplayer) {
      // ONLY remove if we have finished checking the DB and are truly in personal mode
      localStorage.removeItem("optiroute_last_trip_id");
    }
  }, [activeTrip, isMultiplayer, initialSyncDone]);

  // ─── Load trip data from DB ──────────────────────────
  const handleSelectTrip = useCallback(async (trip: TripInfo, isQuiet: boolean = false) => {
    if (!isQuiet) {
      setLoadingTrip(true);
      // Clear previous trip data immediately to avoid "ghost" data
      setMembers([]);
      setExpenses([]);
      setDbSettlements([]);
    }
    setActiveTrip(trip);
    setIsMultiplayer(true);
    
    // Sync to URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("tripId", trip.id);
    router.replace(`/split-bill?${params.toString()}`);
    
    // Sync to DB profile
    fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastActiveTripId: trip.id })
    }).catch(console.error);

    try {
      // Load members from DB
      const membersRes = await fetch(`/api/trips/${trip.id}/members`);
      const membersData = await membersRes.json();
      if (Array.isArray(membersData)) {
        const mapped: Member[] = membersData.map((gm: any, i: number) => {
          const isMe = gm.user.email === session?.user?.email;
          return {
            id: gm.userId,
            dbUserId: gm.userId,
            name: gm.user.name || gm.user.email,
            email: gm.user.email, 
            color: getStableColor(gm.userId),
            hasBankInDb: !!(gm.user.bankCode && gm.user.bankAccountNumber),
            bankCode: gm.user.bankCode,
            bankAccount: gm.user.bankAccountNumber,
            bankAccountName: gm.user.bankAccountName,
            isLeader: gm.role === "LEADER" || gm.userId === trip.ownerId,
            isMe,
            image: gm.user.image,
          };
        });
        setMembers(mapped);
        
        // Contextual trigger: Check if 'me' has bank info
        const me = mapped.find(m => m.isMe);
        setMeBankMissing(!me?.hasBankInDb);
      }

      // Load settlements from DB
      const settleRes = await fetch(`/api/trips/${trip.id}/settlements`);
      const settleData = await settleRes.json();
      if (Array.isArray(settleData)) setDbSettlements(settleData);

      // Load expenses from DB
      const expRes = await fetch(`/api/trips/${trip.id}/expenses`);
      const expData = await expRes.json();
      if (Array.isArray(expData)) {
        const mapped: Expense[] = expData.map((e: any) => ({
          id: e.id,
          name: e.title,
          amount: e.totalAmount,
          paidBy: e.payerId,
          participants: e.shares?.map((s: any) => s.userId) || [],
          createdAt: e.createdAt,
          shares: e.shares?.map((s: any) => ({
            userId: s.userId,
            amountOwed: s.amountOwed,
            settlementPaid: s.settlementPaid
          })),
          synced: true
        }));
        setExpenses(mapped);
      }
    } finally {
      if (!isQuiet) setLoadingTrip(false);
      setIsLoaded(true);
    }
  }, [session?.user?.email]);

  // Polling for real-time updates (10s)
  useEffect(() => {
    if (!activeTrip) return;
    
    // Initial fetch handled by other logic
    const pollInterval = setInterval(() => {
      // Re-fetch trip data quietly (true = isQuiet)
      handleSelectTrip(activeTrip, true);
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [activeTrip, handleSelectTrip]);

  const handleJoinByCode = async () => {
    if (!inviteCodeInput || inviteCodeInput.length < 5) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/join/${inviteCodeInput}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Join failed");

      // Success!
      setJoinSuccess(`Bạn đã tham gia nhóm ${data.tripTitle}`);
      setInviteCodeInput("");
      
      // Refresh list and select new trip
      const r = await fetch("/api/trips");
      const trips = await r.json();
      if (Array.isArray(trips)) {
        setMyTrips(trips);
        const joined = trips.find(t => t.id === data.tripId);
        if (joined) handleSelectTrip(joined);
      }
      
      setTimeout(() => setJoinSuccess(null), 4000);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setJoining(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!activeTrip) return;
    try {
      const res = await fetch(`/api/trips/${activeTrip.id}/invite`, { method: "POST" });
      const data = await res.json();
      if (data.inviteCode) {
        setActiveTrip(prev => prev ? { ...prev, inviteCode: data.inviteCode } : prev);
        navigator.clipboard.writeText(data.inviteUrl);
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2500);
      }
    } catch (e) { console.error(e); }
  };

  // ─── Singleplayer: localStorage fallback ─────────────
  useEffect(() => {
    if (isMultiplayer) return; // Skip if in multiplayer mode
    
    // Clear states before loading personal data to ensure isolation
    setMembers([]);
    setExpenses([]);
    
    try {
      const savedMembers = localStorage.getItem("optiroute_sb_members");
      const savedExpenses = localStorage.getItem("optiroute_sb_expenses");
      let parsedMembers: Member[] = savedMembers ? JSON.parse(savedMembers) : [];
      let parsedExpenses = savedExpenses ? JSON.parse(savedExpenses) : [];

      if (parsedMembers.length === 0) {
        parsedMembers = [{ id: "me", name: lang === "vi" ? "Bạn" : "You", color: MEMBER_COLORS[0] }];
      }
      setMembers(parsedMembers);
      setExpenses(parsedExpenses);
    } catch (e) {} finally { setIsLoaded(true); }
  }, [lang, isMultiplayer]);

  useEffect(() => {
    if (isLoaded && !isMultiplayer) {
      localStorage.setItem("optiroute_sb_members", JSON.stringify(members));
      localStorage.setItem("optiroute_sb_expenses", JSON.stringify(expenses));
    }
  }, [members, expenses, isLoaded, isMultiplayer]);

  const addMember = async () => {
    const name = memberInput.trim();
    if (!name) return;

    if (isMultiplayer && activeTrip) {
      try {
        const res = await fetch(`/api/trips/${activeTrip.id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: name })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          if (res.status === 404) {
            showToast(lang === "vi" ? "Nick này không tồn tại nên không thêm được" : "User not found, could not add", "error");
          } else if (res.status === 403) {
            showToast(lang === "vi" ? "Chỉ trưởng nhóm mới được thêm thành viên" : "Only leader can add members", "error");
          } else {
            showToast(data.error || "Error adding member", "error");
          }
          return;
        }

        // Success: Refresh trip data to get updated member list
        handleSelectTrip(activeTrip, true);
        showToast(lang === "vi" ? `Đã thêm ${data.user?.name || name} vào nhóm!` : `Added ${data.user?.name || name} to trip!`, "success");
        setMemberInput("");
      } catch (e) {
        console.error(e);
        showToast(lang === "vi" ? "Lỗi kết nối khi thêm thành viên" : "Connection error adding member", "error");
      }
    } else {
      // Offline mode
      if (members.find(m => m.name.toLowerCase() === name.toLowerCase())) {
        showToast(lang === "vi" ? "Tên này đã có trong danh sách" : "Name already exists", "error");
        return;
      }
      setMembers(prev => [...prev, { id: crypto.randomUUID(), name, color: MEMBER_COLORS[prev.length % MEMBER_COLORS.length] }]);
      showToast(lang === "vi" ? "Đã thêm (Lưu tạm trên máy bạn)" : "Added (Saved locally)", "success");
      setMemberInput("");
    }
  };

  const handleSaveBank = (memberId: string, bankCode: string, bankAccount: string) => {
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, bankCode, bankAccount } : m));
  };

  const removeMember = async (id: string) => {
    if (id === "me") return;
    
    if (isMultiplayer && activeTrip) {
      try {
        const res = await fetch(`/api/trips/${activeTrip.id}/members?userId=${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json();
          showToast(data.error || "Lỗi khi xóa thành viên", "error");
          return;
        }
        showToast(lang === "vi" ? "Đã xóa thành viên khỏi nhóm" : "Member removed from group", "success");
      } catch (e) {
        console.error(e);
        showToast(lang === "vi" ? "Lỗi kết nối" : "Connection error", "error");
        return;
      }
    }

    setMembers(prev => prev.filter(m => m.id !== id));
    setExpenses(prev => prev
      .filter(e => e.paidBy !== id)
      .map(e => ({ ...e, participants: e.participants.filter(p => p !== id) }))
      .filter(e => e.participants.length > 0)
    );
  };

  const handleOpenExpForm = () => {
    if (members.length > 0) {
      setAmountInput("");
      const defaultPayerId = members.find(m => m.id === "me")?.id || members[0]?.id;
      setExpForm({ name: "", amount: 0, paidBy: defaultPayerId, participants: members.map(m => m.id) });
      setShowExpForm(true);
    }
  };

  const handleAmountFocus = () => {
    const raw = amountInput.replace(/\D/g, '');
    setAmountInput(raw);
  };

  const handleAmountBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 15);
    if (!raw) {
      setAmountInput('');
      setExpForm(p => ({ ...p, amount: 0 }));
      return;
    }
    const sep = lang === 'vi' ? '.' : ',';
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    setAmountInput(formatted);
    setExpForm(p => ({ ...p, amount: parseInt(raw) }));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 15);
    setAmountInput(raw);
    setExpForm(p => ({ ...p, amount: raw ? parseInt(raw) : 0 }));
  };

  const addExpense = async () => {
    if (!expForm.name || expForm.amount <= 0 || !expForm.paidBy || expForm.participants.length === 0) return;
    
    if (isMultiplayer && activeTrip) {
      // DB mode: POST to API
      try {
        const res = await fetch(`/api/trips/${activeTrip.id}/expenses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: expForm.name,
            totalAmount: expForm.amount,
            payerId: expForm.paidBy,
            participantIds: expForm.participants,
          }),
        });
        if (!res.ok) throw new Error("Failed to add expense");
        const saved = await res.json();
        const mapped: Expense = {
          id: saved.id,
          name: saved.title,
          amount: saved.totalAmount,
          paidBy: saved.payerId,
          participants: saved.shares.map((s: any) => s.userId),
          shares: saved.shares.map((s: any) => ({
            userId: s.userId,
            amountOwed: s.amountOwed,
            settlementPaid: s.settlementPaid
          })),
          synced: true,
        };
        setExpenses(prev => [mapped, ...prev]);
      } catch (e) {
        console.error("Failed to add expense", e);
        return;
      }
    } else {
      // Local mode
      const newExp: Expense = {
        id: crypto.randomUUID(),
        name: expForm.name,
        amount: expForm.amount,
        paidBy: expForm.paidBy,
        participants: expForm.participants
      };
      setExpenses(prev => [...prev, newExp]);
    }
    setShowExpForm(false);
  };

  const confirmRemoveExpense = async (id: string, reason: string) => {
    if (deleting) return;
    setDeleting(true);
    try {
      if (isMultiplayer && activeTrip) {
        await fetch(`/api/trips/${activeTrip.id}/expenses/${id}`, { 
          method: "DELETE",
          body: JSON.stringify({ reason })
        });
      }
      setExpenses(prev => prev.filter(e => e.id !== id));
      setShowDeleteModal(false);
      setExpenseToDelete(null);
      setDeleteReason("");
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const handleNotReceived = async (debtorId: string, amount: number, settlementId: string) => {
    if (!activeTrip) return;
    const key = `${debtorId}-${activeTrip.id}`;
    setNotReceiving(key);
    try {
      // 1. Send notification
      await fetch(`/api/trips/${activeTrip.id}/notifications/not-received`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debtorId, amount }),
      });
      
      // 2. Delete the pending settlement to reset logic
      const delRes = await fetch(`/api/trips/${activeTrip.id}/settlements/${settlementId}`, {
        method: "DELETE",
      });

      if (delRes.ok) {
        setDbSettlements(prev => prev.filter(s => s.id !== settlementId));
        showToast(lang === "vi" ? "Đã gửi thông báo nhắc nhở & Hủy yêu cầu cũ!" : "Reminder sent & Old request cancelled!", "success");
      }
    } catch (e) {
      console.error(e);
      showToast(lang === "vi" ? "Lỗi khi xử lý" : "Error processing request", "error");
    } finally {
      setNotReceiving(null);
    }
  };

  const remindPayment = async (debtorId: string, amount: number) => {
    if (!activeTrip) return;
    const key = `${debtorId}-${activeTrip.id}`;
    if (reminding === key) return;
    setReminding(key);
    try {
      await fetch(`/api/trips/${activeTrip.id}/notifications/remind`, {
        method: "POST",
        body: JSON.stringify({ debtorId, amount })
      });
      const member = members.find(m => m.id === debtorId);
      showToast(lang === "vi" ? `Đã gửi nhắc nợ cho ${member?.name || "thành viên"}` : `Reminder sent to ${member?.name || "member"}`, "success");
    } catch (e) {
      console.error(e);
      showToast(lang === "vi" ? "Lỗi khi gửi nhắc nợ" : "Failed to send reminder", "error");
    } finally {
      setReminding(null);
    }
  };

  const handleRequestBankInfo = async (targetId: string) => {
    if (!activeTrip) return;
    setReminding(`request-${targetId}`);
    try {
      const res = await fetch(`/api/trips/${activeTrip.id}/notifications/request-bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetId })
      });

      if (!res.ok) throw new Error("Failed to send request");

      const member = members.find(m => m.id === targetId);
      showToast(lang === "vi" ? `Đã gửi yêu cầu cập nhật STK cho ${member?.name}` : `Sent bank info request to ${member?.name}`, "success");
    } catch (e) {
      console.error(e);
      showToast(lang === "vi" ? "Lỗi khi gửi yêu cầu" : "Failed to send request", "error");
    } finally {
      setReminding(null);
    }
  };
  const toggleParticipant = (memberId: string) => {
    setExpForm(prev => ({
      ...prev, participants: prev.participants.includes(memberId)
        ? prev.participants.filter(p => p !== memberId)
        : [...prev.participants, memberId]
    }));
  };
  
  const handleConfirmSettlement = async (settlementId: string) => {
    if (!activeTrip) return;
    try {
      const res = await fetch(`/api/trips/${activeTrip.id}/settlements/${settlementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (!res.ok) throw new Error("Failed to confirm settlement");
      
      const updated = await res.json();
      setDbSettlements(prev => prev.map(s => s.id === updated.id ? updated : s));
      
      // Tier 3: Cập nhật trạng thái 'Đã thanh toán' cho các khoản nợ của người trả
      setExpenses(prev => prev.map(exp => ({
        ...exp,
        shares: exp.shares?.map(s => s.userId === updated.payerId ? { ...s, settlementPaid: true } : s)
      })));
      
      // Auto-hide succesful history items after 10s
      setRecentlyCompletedIds(prev => [...prev, updated.id]);
      setTimeout(() => {
        setRecentlyCompletedIds(prev => prev.filter(id => id !== updated.id));
      }, 10000);
      
      const payer = members.find(m => m.id === updated.payerId);
      showToast(lang === "vi" 
        ? `Đã xác nhận thanh toán từ ${payer?.name}. Tuyệt vời!` 
        : `Confirmed payment from ${payer?.name}. Great!`, "success");
    } catch (e) {
      console.error(e);
      showToast(lang === "vi" ? "Lỗi khi xác nhận thanh toán" : "Error confirming payment", "error");
    }
  };

  const handleReportPayment = async (receiptUrl: string, receiverId: string, amount: number) => {
    if (!activeTrip) return;
    try {
      const res = await fetch(`/api/trips/${activeTrip.id}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId, amount, receiptUrl }),
      });
      if (!res.ok) throw new Error("Failed to report payment");
      const newSettle = await res.json();
      setDbSettlements(prev => [newSettle, ...prev]);
      setReportSuccess(newSettle.id);
      
      // Auto-hide success status after 5 seconds to clear UI
      setTimeout(() => {
        setReportSuccess(null);
      }, 5000);
      
      showToast(lang === "vi" ? "Đã gửi báo cáo thanh toán!" : "Payment reported!", "success");
    } catch (e) {
      console.error(e);
      showToast(lang === "vi" ? "Lỗi khi gửi báo cáo" : "Failed to report", "error");
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!activeTrip) return;
    
    setCustomConfirm({
      title: lang === "vi" ? "Hủy báo cáo?" : "Cancel report?",
      message: lang === "vi" ? "Bạn có chắc muốn hủy báo cáo thanh toán này?" : "Cancel this payment report?",
      onConfirm: async () => {
        setCustomConfirm(null);
        try {
          const res = await fetch(`/api/trips/${activeTrip.id}/settlements/${settlementId}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to delete settlement");
          
          setDbSettlements(prev => prev.filter(s => s.id !== settlementId));
          showToast(lang === "vi" ? "Đã hủy báo cáo thanh toán" : "Payment report cancelled", "success");
        } catch (e) {
          console.error(e);
          showToast(lang === "vi" ? "Lỗi khi hủy báo cáo" : "Error cancelling report", "error");
        }
      }
    });
  };

  const totalAmount = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const settlements = useMemo(() => calculateNetSettlements(members, expenses, dbSettlements), [members, expenses, dbSettlements]);
  const getMemberBalance = (memberId: string) => {
    let balance = 0;
    expenses.forEach(exp => {
      if (exp.paidBy === memberId) balance += exp.amount;
      if (exp.participants.includes(memberId)) balance -= exp.amount / exp.participants.length;
    });
    // Phase 23: Balance with DB Settlements (COMPLETED ONLY)
    dbSettlements.forEach(s => {
      if (s.status === "COMPLETED") {
        if (s.payerId === memberId) balance += s.amount;
        if (s.receiverId === memberId) balance -= s.amount;
      }
    });
    return balance;
  };

  const toggleExpensePayment = async (expenseId: string, userId: string, currentStatus: boolean) => {
    if (!isMultiplayer || !activeTrip) return;
    
    // Optimistic UI update
    setExpenses(prev => prev.map(exp => {
      if (exp.id === expenseId && exp.shares) {
        return {
          ...exp,
          shares: exp.shares.map(s => s.userId === userId ? { ...s, settlementPaid: !currentStatus } : s)
        };
      }
      return exp;
    }));

    try {
      const res = await fetch(`/api/expenses/${expenseId}/shares`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, settlementPaid: !currentStatus })
      });
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
    } catch (e) {
      console.error(e);
      showToast(lang === "vi" ? "Lỗi đồng bộ trạng thái" : "Sync failed", "error");
      // Revert if failed
      setExpenses(prev => prev.map(exp => {
        if (exp.id === expenseId && exp.shares) {
          return {
            ...exp,
            shares: exp.shares.map(s => s.userId === userId ? { ...s, settlementPaid: currentStatus } : s)
          };
        }
        return exp;
      }));
    }
  };

  const getMember = (id: string) => members.find(m => m.id === id);
  
  // Fintech Logic: Identify Current User for RBAC & Contextual UI
  const me = members.find(m => m.email === session?.user?.email) || members.find(m => m.id === "me");
  const myId = me?.id || "me";
  const amILeader = me?.isLeader;

  const myBalance = getMemberBalance(myId);
  const youOwe = Math.abs(Math.min(myBalance, 0));
  const owedToYou = Math.max(myBalance, 0);

  const filteredExpenses = useMemo(() => {
    if (!expSearch) return expenses;
    const s = expSearch.toLowerCase();
    return expenses.filter(e => 
      e.name.toLowerCase().includes(s) || 
      (e.createdAt && new Date(e.createdAt).toLocaleDateString("vi-VN").includes(s))
    );
  }, [expenses, expSearch]);

  const chartData = useMemo(() => {
    return members.map((m, i) => {
      const spent = expenses.filter(e => e.paidBy === m.id).reduce((s, e) => s + e.amount, 0);
      return { name: m.name, value: spent, fill: getStandardColor(i) };
    }).filter(d => d.value > 0);
  }, [members, expenses]);

  const getExpenseIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("ăn") || n.includes("uống") || n.includes("phở") || n.includes("cơm") || n.includes("bún")) return <UtensilsCrossed className="w-4 h-4" />;
    if (n.includes("cafe") || n.includes("cà phê") || n.includes("nước") || n.includes("trà")) return <Coffee className="w-4 h-4" />;
    if (n.includes("xe") || n.includes("đi lại") || n.includes("taxi") || n.includes("xăng") || n.includes("grab")) return <Car className="w-4 h-4" />;
    if (n.includes("khách sạn") || n.includes("ngủ") || n.includes("homestay") || n.includes("ks")) return <Bed className="w-4 h-4" />;
    if (n.includes("vé") || n.includes("tham quan") || n.includes("tour")) return <Ticket className="w-4 h-4" />;
    if (n.includes("mua") || n.includes("quà") || n.includes("siêu thị") || n.includes("shoppe")) return <ShoppingBag className="w-4 h-4" />;
    if (n.includes("thuốc") || n.includes("y tế")) return <Activity className="w-4 h-4" />;
    return <Banknote className="w-4 h-4" />;
  };

  if (!isLoaded) return <div className="min-h-screen bg-[#020817]" />;

  return (
    <div className="min-h-screen bg-[#020817] pt-[64px] pb-16 px-4 font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
      <div className="absolute top-40 right-[-10%] w-80 h-80 bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-5xl mx-auto py-6">
          {isMultiplayer && meBankMissing && (
            <BankBanner onAction={() => setShowBankModal(true)} />
          )}

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/5">
              <Split className="w-6 h-6 text-indigo-400" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {lang === "vi" ? "Chia tiền nhóm" : "Split Bill"}
              </h1>
              <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                {isMultiplayer && activeTrip
                  ? <span className="text-indigo-300 font-bold">{activeTrip.title} {activeTrip.city ? `• ${activeTrip.city}` : ""}</span>
                  : (lang === "vi" ? "Quản lý chi tiêu minh bạch, sòng phẳng." : "Transparent group expense management.")}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ─── Trip Selector Panel (Multiplayer) ─── */}
        {session?.user && (
          <div className="space-y-4 mb-8">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="flex flex-col lg:flex-row gap-3"
            >
              {/* Trip Dropdown */}
              <div className="relative flex-1 bg-[#0a1128] border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-inner group">
                <Users className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <div className="flex-1 relative h-full flex items-center">
                  <select
                    value={activeTrip?.id || ""}
                    onChange={e => {
                      const t = myTrips.find(t => t.id === e.target.value);
                      if (t) handleSelectTrip(t);
                      else { 
                        setIsMultiplayer(false); 
                        setActiveTrip(null); 
                        setExpenses([]); 
                        setMembers([{ id: "me", name: lang === "vi" ? "Bạn" : "You", color: MEMBER_COLORS[0] }]); 
                        localStorage.removeItem("optiroute_last_trip_id"); // Explicit manual clear
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">— Chế độ cá nhân (Offline) —</option>
                    {myTrips.map(t => (
                      <option key={t.id} value={t.id} className="bg-slate-900 font-bold">{t.title}{t.city ? ` • ${t.city}` : ""}</option>
                    ))}
                  </select>
                  <span className="text-white text-sm font-bold truncate">
                    {activeTrip ? `${activeTrip.title}${activeTrip.city ? ` • ${activeTrip.city}` : ""}` : (lang === "vi" ? "Chế độ cá nhân (Offline)" : "Personal Mode (Offline)")}
                  </span>
                </div>

                {loadingTrip ? (
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
                ) : (
                   <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                )}
                {isMultiplayer && !loadingTrip && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full font-black uppercase tracking-[0.2em] flex-shrink-0">
                    LIVE
                  </span>
                )}
              </div>

              {/* Join by Code Input */}
              <div className="flex-1 bg-white/[0.03] border border-dashed border-white/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <input 
                  type="text"
                  value={inviteCodeInput}
                  onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
                  placeholder={lang === "vi" ? "Nhập mã tham gia..." : "Enter invite code..."}
                  className="flex-1 bg-transparent text-white text-sm font-medium focus:outline-none"
                />
                <button 
                  onClick={handleJoinByCode}
                  disabled={joining || !inviteCodeInput}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {joining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  {lang === "vi" ? "Tham gia" : "Join"}
                </button>
              </div>
            </motion.div>

            {/* Onboarding / Empty State Hint */}
            {!isMultiplayer && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-indigo-600/5 border border-white/5 rounded-[2.5rem] p-8 text-center relative overflow-hidden group mb-8 backdrop-blur-sm"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Users className="w-24 h-24 text-indigo-400 rotate-12" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">{lang === "vi" ? "Chưa có hành trình nhóm?" : "No Group Trips Yet?"}</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed font-medium">
                  {lang === "vi" 
                    ? "Hãy bắt đầu bằng cách tạo một chuyến đi mới trên Dashboard hoặc nhập mã mời để cùng bạn bè quản lý chi tiêu sòng phẳng, minh bạch." 
                    : "Start by creating a new trip on the Dashboard or enter an invite code to manage expenses fairly with your friends."}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                   <motion.button 
                     whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                     onClick={() => router.push('/dashboard')}
                     className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 group/btn"
                   >
                     <Plus className="w-4 h-4 animate-pulse group-hover/btn:scale-125 transition-transform" />
                     {lang === "vi" ? "Tạo hành trình ngay" : "Create Trip Now"}
                   </motion.button>
                   <div className="px-8 py-3.5 bg-white/5 border border-white/10 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                     <UserPlus className="w-4 h-4 text-indigo-400" />
                     {lang === "vi" ? "Sử dụng mã mời bên trên" : "Use Invite Code Above"}
                   </div>
                </div>
              </motion.div>
            )}

            {/* Invite Sharing Panel (Only show if Multiplayer) */}
            <AnimatePresence>
              {isMultiplayer && activeTrip && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 bg-gradient-to-r from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                        <Link2 className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">Mời bạn bè</p>
                        <p className="text-xs text-slate-500 font-medium">Chia sẻ mã hoặc link để cùng theo dõi chi tiêu</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {activeTrip.inviteCode ? (
                        <>
                          {/* Copy Code Button */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase ml-1">Mã tham gia</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(activeTrip.inviteCode || "");
                                setCodeCopied(true);
                                setTimeout(() => setCodeCopied(false), 2000);
                              }}
                              className="bg-slate-900 border border-white/10 hover:border-indigo-500/50 px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all group"
                            >
                              <code className="text-lg font-black text-indigo-400 font-mono tracking-tighter">
                                {activeTrip.inviteCode}
                              </code>
                              {codeCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-600 group-hover:text-white" />}
                            </button>
                          </div>

                          {/* Copy Link Button */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase ml-1">Link mời nhanh</span>
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/join/${activeTrip.inviteCode}`;
                                navigator.clipboard.writeText(url);
                                setInviteCopied(true);
                                setTimeout(() => setInviteCopied(false), 2000);
                              }}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl flex items-center gap-3 transition-all shadow-lg shadow-indigo-600/20"
                            >
                              <span className="text-xs font-black uppercase tracking-widest">Sao chép Link</span>
                              {inviteCopied ? <CheckCircle2 className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </>
                      ) : (
                        <button onClick={handleGenerateInvite} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                          Tạo mã mời ngay
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Toast */}
            <AnimatePresence>
               {joinSuccess && (
                 <motion.div
                   initial={{ opacity: 0, scale: 0.9, y: 10 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.9, y: 10 }}
                   className="flex items-center gap-3 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl shadow-emerald-500/20 font-bold text-sm"
                 >
                   <CheckCircle2 className="w-5 h-5" />
                   {joinSuccess}
                 </motion.div>
               )}
            </AnimatePresence>
          </div>
        )}


        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="md:col-span-2 bg-gradient-to-br from-indigo-900/40 via-slate-900 to-[#0a1128] border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl"
          >
            <div className="absolute -top-24 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex flex-col sm:flex-row justify-between gap-8 relative z-10">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-indigo-300" />
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-300/80">Tổng chi phí nhóm</p>
                  </div>
                  {!isMultiplayer && (
                    <button 
                      onClick={() => {
                          setCustomConfirm({
                             title: lang === "vi" ? "Xóa dữ liệu Offline?" : "Clear Offline Data?",
                             message: lang === "vi" ? "Bạn có chắc muốn xóa sạch dữ liệu Chế độ cá nhân (Offline)? Bạn không thể hoàn tác hành động này." : "Are you sure you want to clear Personal Mode (Offline) data? This cannot be undone.",
                             onConfirm: () => {
                                localStorage.removeItem("optiroute_sb_members");
                                localStorage.removeItem("optiroute_sb_expenses");
                                setMembers([{ id: "me", name: lang === "vi" ? "Bạn" : "You", color: MEMBER_COLORS[0] }]);
                                setExpenses([]);
                                setCustomConfirm(null);
                                showToast(lang === "vi" ? "Đã dọn dẹp bộ nhớ thiết bị" : "Personal data reset", "success");
                             }
                          });
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-all text-xs font-black uppercase tracking-widest cursor-pointer"
                      title={lang === "vi" ? "Xóa bộ nhớ tạm" : "Reset Data"}
                    >
                       <Trash2 className="w-3 h-3" />
                       {lang === "vi" ? "Làm mới" : "Reset"}
                    </button>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    <AnimatedNumber value={totalAmount} />
                  </h2>
                  <span className="text-sm font-bold text-slate-400">₫</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 bg-black/20 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ArrowDownRight className="w-4 h-4 text-rose-400" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lang === "vi" ? "Bạn cần trả" : "You owe"}</p>
                    </div>
                    <p className="text-lg font-bold text-rose-400 tabular-nums">
                      {youOwe > 0 ? "-" : ""}{youOwe.toLocaleString()} <span className="text-xs">₫</span>
                    </p>
                  </div>
                  <div className="flex-1 bg-black/20 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lang === "vi" ? "Nhận lại" : "Owed to you"}</p>
                    </div>
                    <p className="text-lg font-bold text-emerald-400 tabular-nums">
                      {owedToYou > 0 ? "+" : ""}{owedToYou.toLocaleString()} <span className="text-xs">₫</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
            className="bg-[#0a1128] border border-white/10 rounded-3xl p-5 flex flex-col relative"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{lang === "vi" ? "Tỷ lệ chi trả" : "Overview"}</h3>
            </div>
            <div className="flex-1 min-h-[160px] relative">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} innerRadius={50} outerRadius={70} paddingAngle={5} stroke="none" dataKey="value">
                      {chartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: any) => [`${Number(value).toLocaleString()} ₫`, '']}
                      contentStyle={{ backgroundColor: '#020817', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-600">Chưa có dữ liệu</div>}
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0a1128] border border-white/5 rounded-3xl overflow-hidden shadow-lg">
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-bold text-white tracking-wide">{lang === "vi" ? "Thành viên" : "Party"}</h2>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full">{members.length}</span>
              </div>
              <div className="p-4 bg-slate-900/50">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      value={memberInput} onChange={e => setMemberInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addMember()}
                      placeholder={lang === "vi" ? "Nhập ID (#...) hoặc Email..." : "Enter ID (#...) or Email..."}
                      className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/30 font-medium"
                    />
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  </div>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={addMember} className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl"><Plus className="w-4 h-4" /></motion.button>
                </div>
              </div>
              <div className="px-4 pb-4 space-y-1 mt-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                {members.map(member => {
                  const balance = getMemberBalance(member.id);
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${member.color} flex items-center justify-center text-white text-sm font-black overflow-hidden shadow-sm`}>
                          {member.image ? (
                            <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            member.id === "me" ? <User className="w-5 h-5" /> : member.name[0].toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <p className="text-sm font-bold text-white">{member.name}</p>
                             {isMultiplayer && (member.isLeader) && (
                               <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">
                                 {lang === "vi" ? "Trưởng nhóm" : "Leader"}
                               </span>
                             )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500 font-medium font-mono uppercase truncate opacity-50">
                              ID: {member.id.substring(0, 8)}...
                            </span>
                            <p className={`text-xs font-bold ${balance >= 0 ? "text-emerald-400/80" : "text-rose-400/80"}`}>
                              {balance >= 0 ? "+" : ""}{Math.round(balance).toLocaleString()} ₫
                            </p>
                          </div>
                        </div>
                      </div>
                      {member.id !== myId && (!isMultiplayer || amILeader) && (
                        <button 
                          onClick={() => {
                            setCustomConfirm({
                              title: lang === "vi" ? "Xóa thành viên?" : "Remove member?",
                              message: lang === "vi" ? `Bạn chắc chắn muốn xóa ${member.name} khỏi nhóm chia tiền này?` : `Remove ${member.name} from group?`,
                              onConfirm: () => { 
                                removeMember(member.id); 
                                setCustomConfirm(null); 
                              }
                            });
                          }} 
                          className="text-slate-500 hover:text-rose-400 p-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

<div className="lg:col-span-8 flex flex-col">
            <div className="flex bg-[#0a1128] border border-white/5 p-1 rounded-2xl w-full sm:w-fit mb-6">
              {(["expenses", "settle"] as const).map(tab => (
                <button
                  key={tab} 
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === "settle") {
                      setTimeout(() => {
                        document.getElementById("settlement-section")?.scrollIntoView({ behavior: "smooth" });
                      }, 100);
                    }
                  }}
                  className="relative px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors z-10"
                  style={{ color: activeTab === tab ? '#fff' : '#64748b' }}
                >
                  {tab === "expenses" ? (lang === "vi" ? "Chi phí" : "Expenses") : (lang === "vi" ? "Thanh toán" : "Settle")}
                  {activeTab === tab && <motion.div layoutId="splitTab" className="absolute inset-0 bg-indigo-600 rounded-xl -z-10 shadow-md" />}
                </button>
              ))}
            </div>

            <div className="flex-1 bg-[#0a1128] border border-white/5 rounded-3xl overflow-hidden shadow-lg flex flex-col relative">
              {activeTab === "expenses" && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 flex flex-col overflow-hidden">

                  <AnimatePresence>
                    {showExpForm && (
                      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowExpForm(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                          className="relative w-full max-w-lg bg-[#0a1128] border border-white/10 rounded-[24px] shadow-2xl flex flex-col my-auto"
                        >
                          <div className="p-3.5 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                              <Receipt className="w-4 h-4 text-indigo-400" />
                              {lang === "vi" ? "Thêm khoản chi" : "Add Expense"}
                            </h3>
                            <button onClick={() => setShowExpForm(false)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-slate-400"><X className="w-4 h-4" /></button>
                          </div>
                          <div className="p-4 space-y-4 flex-1">
                            <div className="grid grid-cols-12 gap-3">
                              <div className="col-span-12 sm:col-span-7">
                                <label className="text-[10px] font-black uppercase text-indigo-400 mb-1 flex items-center gap-1.5"><Receipt className="w-2.5 h-2.5" /> {lang === "vi" ? "Nội dung" : "Detail"}</label>
                                <input value={expForm.name} onChange={e => setExpForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white text-xs" placeholder={lang === "vi" ? "VD: Ăn sáng..." : "e.g. Breakfast..."} />
                              </div>
                              <div className="col-span-12 sm:col-span-5">
                                <label className="text-[10px] font-black uppercase text-indigo-400 mb-1 flex items-center gap-1.5"><Wallet className="w-2.5 h-2.5" /> {lang === "vi" ? "Số tiền" : "Amount"}</label>
                                <div className="relative">
                                  <input type="text" inputMode="numeric" value={amountInput} onFocus={handleAmountFocus} onBlur={handleAmountBlur} onChange={handleAmountChange} className="w-full pl-3 pr-10 py-2 bg-slate-900 border border-white/10 rounded-xl text-white font-black text-sm text-right" placeholder="0" />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-[9px] pointer-events-none">{lang === "vi" ? "VND" : "USD"}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase text-indigo-400 mb-1.5 flex items-center gap-1.5"><User className="w-2.5 h-2.5" /> {lang === "vi" ? "Người trả" : "Payer"}</label>
                              <div className="flex flex-wrap gap-1.5">
                                {members.map(m => (
                                  <button key={m.id} onClick={() => setExpForm(p => ({ ...p, paidBy: m.id }))} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${expForm.paidBy === m.id ? "bg-indigo-600 border-indigo-400 text-white" : "bg-slate-900 border-white/5 text-slate-400"}`}>
                                    <div className={`w-3.5 h-3.5 rounded-full ${m.color} flex items-center justify-center text-[7px] text-white`}>{m.id === "me" ? <User className="w-2 h-2" /> : m.name[0].toUpperCase()}</div>
                                    <span className="truncate max-w-[80px]">{m.name}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-black uppercase text-indigo-400 flex items-center gap-1.5"><Users className="w-2.5 h-2.5" /> {lang === "vi" ? "Chia cho" : "Share with"}</label>
                                <button onClick={() => setExpForm(p => ({ ...p, participants: p.participants.length === members.length ? [] : members.map(m => m.id) }))} className="text-[8px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase">{expForm.participants.length === members.length ? "Bỏ hết" : "Tất cả"}</button>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                {members.map(m => (
                                  <button key={m.id} onClick={() => toggleParticipant(m.id)} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${expForm.participants.includes(m.id) ? "bg-indigo-600/10 border-indigo-500/40 text-indigo-300" : "bg-slate-900 border-white/5 text-slate-500"}`}>
                                    <span className="truncate pr-1">{m.name}</span>
                                    {expForm.participants.includes(m.id) && <CheckCheck className="w-3 h-3 text-indigo-400" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {expForm.amount > 0 && expForm.paidBy && expForm.participants.length > 0 && (() => {
                              const payer = getMember(expForm.paidBy);
                              const perPerson = Math.round(expForm.amount / expForm.participants.length);
                              const isPayingForOthers = !expForm.participants.includes(expForm.paidBy);
                              return (
                                <div className={`rounded-xl p-2.5 border ${isPayingForOthers ? "border-amber-500/20 bg-amber-500/5" : "bg-indigo-500/5 border-indigo-500/20"}`}>
                                  <div className="flex items-start gap-2">
                                    <Info className={`w-3.5 h-3.5 mt-0.5 ${isPayingForOthers ? "text-amber-400" : "text-indigo-400"}`} />
                                    <div>
                                      {isPayingForOthers && <p className="text-amber-300 font-black text-[8px] uppercase tracking-widest mb-0.5">⚠️ Chế độ: Trả hộ</p>}
                                      <p className="text-[11px] font-medium leading-tight text-white/80">
                                        <strong className="text-white">{payer?.name}</strong> {isPayingForOthers ? "trả hộ" : "trả"} <strong>{expForm.amount.toLocaleString()}đ</strong>.{" "}
                                        {expForm.participants.length > 1 ? <>Chia {expForm.participants.length} người, mỗi người <strong>{perPerson.toLocaleString()}đ</strong>.</> : <><strong>{getMember(expForm.participants[0])?.name}</strong> chịu toàn bộ.</>}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                            <button onClick={addExpense} disabled={!expForm.name || !expForm.amount || !expForm.paidBy || expForm.participants.length === 0} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-30 shadow-lg">Xác nhận lưu</button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  <div className="px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                        <LucideHistory className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white leading-none mb-1">{lang === "vi" ? "Lịch sử chi tiêu" : "Expense History"}</h3>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{expenses.length} {lang === "vi" ? "khoản chi" : "items"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-1 sm:justify-end">
                      <div className="relative group/search flex-1 max-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within/search:text-indigo-400 transition-colors" />
                        <input 
                          type="text" 
                          value={expSearch}
                          onChange={e => setExpSearch(e.target.value)}
                          placeholder={lang === "vi" ? "Tìm kiếm nội dung, ngày..." : "Search expenses..."}
                          className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-[11px] text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
                        />
                      </div>

                      <button onClick={() => setShowExpForm(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2.5 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5 transition-all group">
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                        {lang === "vi" ? "Thêm mới" : "Add New"}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto px-4 py-3 space-y-2 relative custom-scrollbar bg-slate-950/20">
                    {filteredExpenses.length === 0 ? (
                      <div className="py-20 flex flex-col items-center justify-center opacity-30">
                        <Search className="w-10 h-10 mb-2 text-slate-500" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">{lang === "vi" ? "Không tìm thấy kết quả" : "No matches found"}</p>
                      </div>
                    ) : 
                      filteredExpenses.map(exp => {
                        const payer = getMember(exp.paidBy);
                        // Permission check: in offline mode anyone can delete, in multiplayer only owner or payer
                        const canDelete = !isMultiplayer || amILeader || exp.paidBy === myId;
                        
                        return (
                          <div key={exp.id} className="group flex items-center justify-between p-3 bg-black/30 border border-white/5 rounded-2xl hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] transition-all shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-2xl ${payer?.color || "bg-slate-700"} flex items-center justify-center text-white shadow-lg relative group-hover:scale-105 transition-transform`}>
                                {getExpenseIcon(exp.name)}
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0f172a] overflow-hidden bg-slate-800">
                                  {payer?.image ? (
                                    <img src={payer.image} className="w-full h-full object-cover" alt="" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] font-black">{payer?.name[0].toUpperCase()}</div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">{exp.name}</p>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                  <p className="text-[10px] text-slate-500 font-medium">{payer?.name} trả • Chia {exp.participants.length}</p>
                                  {exp.createdAt && (
                                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded italic">
                                      {new Date(exp.createdAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                                    </p>
                                  )}
                                  
                                  {/* Trạng thái thanh toán thông minh (Smart Status) */}
                                  {(() => {
                                    const isPayer = exp.paidBy === myId;
                                    const myShare = exp.shares?.find(s => s.userId === myId);
                                    
                                    // Kiểm tra xem tất cả những người khác đã trả cho mình chưa (nếu mình là người chi)
                                    const othersUnpaid = (exp.shares?.filter(s => s.userId !== myId && !s.settlementPaid).length || 0) > 0;

                                    if (isPayer) {
                                       if (othersUnpaid) {
                                          return (
                                            <div className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm border bg-amber-500/10 text-amber-400 border-amber-500/20">
                                              <div className="w-1 h-1 rounded-full bg-amber-400 animate-bounce" />
                                              {lang === "vi" ? "Chờ nhận tiền" : "Waiting for return"}
                                            </div>
                                          );
                                       }
                                    } else {
                                       if (myShare && !myShare.settlementPaid) {
                                          return (
                                            <div className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm border bg-rose-500/10 text-rose-400 border-rose-500/20">
                                              <div className="w-1 h-1 rounded-full bg-rose-400" />
                                              {lang === "vi" ? "Chưa thanh toán" : "Unpaid"}
                                            </div>
                                          );
                                       }
                                    }
                                    
                                    // Mặc định là đã xong
                                    return (
                                      <div className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                        <div className="w-1 h-1 rounded-full bg-emerald-400" />
                                        {lang === "vi" ? "Đã thanh toán" : "Paid"}
                                      </div>
                                    );
                                  })()}
                                </div>
                                
                                {/* Chi tiết từng người đã trả hay chưa */}
                                {isMultiplayer && exp.shares && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {exp.shares.map(s => {
                                      const member = getMember(s.userId);
                                      if (!member) return null;
                                      const isMeShare = s.userId === myId;
                                      const isPayer = exp.paidBy === myId;
                                      const canToggle = isPayer || amILeader || isMeShare;
                                      
                                      return (
                                        <button 
                                          key={s.userId}
                                          onClick={() => canToggle && toggleExpensePayment(exp.id, s.userId, s.settlementPaid)}
                                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold border transition-all ${
                                            s.settlementPaid 
                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                            : "bg-slate-800 border-white/5 text-slate-500"
                                          } ${canToggle ? "hover:scale-105 hover:border-indigo-500/50" : "cursor-default opacity-80"}`}
                                          title={canToggle ? (lang === "vi" ? "Nhấn để đổi trạng thái" : "Click to toggle") : ""}
                                        >
                                          {member.name}
                                          {s.settlementPaid ? <Check className="w-2 h-2" /> : <div className="w-1 h-1 rounded-full bg-slate-600" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="text-base font-black text-rose-400">{exp.amount.toLocaleString()} ₫</p>
                              {canDelete && (
                                <button 
                                  onClick={() => {
                                    setExpenseToDelete(exp);
                                    setShowDeleteModal(true);
                                  }} 
                                  className="p-1.5 text-slate-500 hover:text-rose-400 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              </div>
            )}

              {activeTab === "settle" && (
                <motion.div 
                  id="settlement-section"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="flex flex-col h-full bg-slate-900/20"
                >
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white">Hoàn tiền</h2>
                      <p className="text-xs text-slate-500 mt-1">Đường đi ngắn nhất để thanh toán nợ</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {settlements.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center opacity-40 mt-10">
                        <CheckCheck className="w-16 h-16 text-emerald-400 mb-4" />
                        <h3 className="text-lg font-bold text-white">Tuyệt vời!</h3>
                        <p className="text-sm text-slate-400">Mọi thứ đã được thanh toán sòng phẳng.</p>
                      </div>
                    ) : (
                      settlements.map((s, i) => {
                        const fromMember = getMember(s.from);
                        const toMember = getMember(s.to);
                        return (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            key={`${s.from}-${s.to}`} 
                            className="bg-black/40 border border-white/5 hover:border-indigo-500/20 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                              {/* Visual connection with light animation */}
                              <div className="flex items-center relative self-center sm:self-auto">
                                <div className={`w-12 h-12 rounded-full ${fromMember?.color || "bg-slate-800"} flex items-center justify-center text-sm font-black text-white z-10 shadow-lg border-4 border-[#0a1128]`}>
                                  {fromMember?.name[0].toUpperCase()}
                                </div>
                                
                                <div className="w-16 sm:w-12 h-1.5 bg-slate-800/50 flex relative items-center overflow-hidden rounded-full mx-[-6px]">
                                  <motion.div 
                                    initial={{ x: "-100%" }} animate={{ x: "200%" }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                    className="w-1/2 h-full bg-indigo-400 blur-[2px] rounded-full"
                                  />
                                </div>
                                
                                <div className={`w-12 h-12 rounded-full ${toMember?.color || "bg-indigo-900"} flex items-center justify-center text-sm font-black text-white z-10 shadow-lg border-4 border-[#0a1128] ring-2 ring-indigo-500/20`}>
                                  {toMember?.name[0].toUpperCase()}
                                </div>
                              </div>

                              <div className="text-center sm:text-left">
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">
                                  <strong className="text-rose-400">{fromMember?.name}</strong> chuyển cho <strong className="text-emerald-400">{toMember?.name}</strong>
                                </p>
                                <p className="text-2xl font-black text-white leading-none tracking-tight">
                                  {s.amount.toLocaleString()} <span className="text-base text-slate-500 font-bold ml-0.5">₫</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Phase 23: Strict Role-Based Settlement Controls */}
                              {s.from === myId ? (
                                // I am the debtor (I owe money) -> I can report payment
                                toMember?.hasBankInDb ? (
                                  <div className="flex flex-col items-end gap-1.5">
                                    {dbSettlements.some(ds => ds.payerId === myId && ds.receiverId === s.to && ds.status === "PENDING") ? (
                                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-black uppercase tracking-widest cursor-default">
                                        <CheckCheck className="w-3.5 h-3.5" />
                                        <span>Đang chờ duyệt</span>
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => setViewingSettlement({ receiver: toMember, amount: s.amount })}
                                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all"
                                        >
                                          <QrCode className="w-3.5 h-3.5" />
                                          <span>Thanh toán</span>
                                        </button>
                                        <span className="text-[9px] font-bold text-rose-500/50 uppercase tracking-tighter mr-1">Chưa thanh toán</span>
                                      </>
                                    )}
                                  </div>

                                ) : (
                                  <button
                                    onClick={() => handleRequestBankInfo(s.to)}
                                    disabled={reminding === `request-${s.to}`}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                  >
                                    {reminding === `request-${s.to}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                                    <span>Yêu cầu STK</span>
                                  </button>
                                )
                              ) : s.to === myId ? (
                                // I am the creditor (I am owed money) -> I can confirm receipt
                                (() => {
                                  const pendingSettle = dbSettlements.find(ds => ds.payerId === s.from && ds.receiverId === myId && ds.status === "PENDING");
                                  if (pendingSettle) {
                                    return (
                                      <div className="flex flex-col sm:flex-row items-center gap-2">
                                        <button
                                          onClick={() => handleConfirmSettlement(pendingSettle.id)}
                                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all"
                                        >
                                          <ShieldCheck className="w-3.5 h-3.5" />
                                          <span>Xác nhận đã nhận</span>
                                        </button>
                                        <button
                                          onClick={() => handleNotReceived(s.from, s.amount, pendingSettle.id)}
                                          disabled={notReceiving === `${s.from}-${activeTrip?.id}`}
                                          className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-600 hover:text-white text-amber-500 border border-amber-500/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all group"
                                        >
                                          {notReceiving === `${s.from}-${activeTrip?.id}` ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <BellRing className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                                          )}
                                          <span>Chưa nhận được</span>
                                        </button>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="flex items-center gap-2">
                                      <div className="px-3 py-2 bg-slate-800/40 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-white/5 whitespace-nowrap">
                                        Đang chờ trả
                                      </div>
                                      {isMultiplayer && (
                                        <button
                                          onClick={() => remindPayment(s.from, s.amount)}
                                          disabled={reminding === `${s.from}-${activeTrip?.id}`}
                                          title={lang === "vi" ? "Gửi nhắc nhở" : "Send reminder"}
                                          className="flex items-center justify-center p-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg border border-indigo-500/20 transition-all group shadow-lg shadow-indigo-600/10"
                                        >
                                          {reminding === `${s.from}-${activeTrip?.id}` ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <BellRing className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()
                              ) : (
                                // Neither debtor nor creditor for this specific settlement
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    )}

                    {/* Payment History & Pending Status */}
                    {isMultiplayer && dbSettlements.length > 0 && (
                      <div className="mt-8 pt-8 border-t border-white/5">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                           <Activity className="w-3.5 h-3.5 text-indigo-500" />
                           Lịch sử thanh toán
                        </h3>
                        <div className="space-y-3">
                          {dbSettlements.slice(0, 10).map((ps) => {
                            const pUser = getMember(ps.payerId);
                            const rUser = getMember(ps.receiverId);
                            const isMeReceiver = ps.receiverId === myId;
                            const isCompleted = ps.status === "COMPLETED";
                            const isRecentlyDone = recentlyCompletedIds.includes(ps.id);

                            // Auto-hide old completed settlements to clear UI clutter as per user request
                            if (isCompleted && !isRecentlyDone) return null;
                            
                            const timeStr = ps.createdAt ? new Date(ps.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                            const dateStr = ps.createdAt ? new Date(ps.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' }) : "";

                            return (
                              <div key={ps.id} className={`border rounded-2xl p-4 flex items-center justify-between group transition-all hover:bg-white/[0.02] ${isCompleted ? "bg-emerald-500/5 border-emerald-500/10" : "bg-amber-500/5 border-amber-500/10"}`}>
                                <div className="flex items-center gap-3">
                                   <div className="relative">
                                      <div className={`w-10 h-10 rounded-full ${pUser?.color || "bg-slate-700"} flex items-center justify-center text-[10px] font-black text-white shadow-inner`}>
                                        {pUser?.name[0].toUpperCase()}
                                      </div>
                                      <div className={`absolute -bottom-1 -right-1 rounded-full p-1 border-2 border-[#0a1128] ${isCompleted ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}>
                                         {isCompleted ? <Check className="w-2 h-2 text-white" /> : <ArrowUpRight className="w-2 h-2 text-white" />}
                                      </div>
                                   </div>
                                   <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold text-white leading-none">
                                          {pUser?.name} đã chuyển cho {rUser?.name}
                                        </p>
                                        <span className="text-[9px] font-bold text-slate-500 uppercase">{timeStr} • {dateStr}</span>
                                      </div>
                                      <p className={`text-lg font-black tabular-nums mt-1 ${isCompleted ? "text-emerald-400" : "text-amber-400"}`}>
                                        {ps.amount.toLocaleString()} ₫
                                      </p>
                                   </div>
                                </div>

                                <div className="flex items-center gap-4 min-w-[140px] justify-end">
                                   {isCompleted ? (
                                      <div className="flex flex-col items-end">
                                         <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Đã thanh toán</span>
                                         </div>
                                      </div>
                                   ) : (
                                     <div className="flex items-center gap-3">
                                        {ps.payerId === myId && (
                                           <button 
                                             onClick={() => handleDeleteSettlement(ps.id)}
                                             className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20"
                                             title="Hủy yêu cầu"
                                           >
                                             <X className="w-4 h-4" />
                                           </button>
                                        )}
                                        {isMeReceiver ? (
                                           <button 
                                            onClick={() => handleConfirmSettlement(ps.id)}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20"
                                           >
                                              Xác nhận
                                           </button>
                                        ) : (
                                          <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                              Đang chờ duyệt
                                            </span>
                                          </div>
                                        )}
                                     </div>
                                   )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {qrTarget && (
          <PaymentModal 
            isOpen={!!qrTarget}
            receiver={members.find(m => m.id === qrTarget.to) || { id: qrTarget.to, name: "?" }}
            amount={qrTarget.amount}
            tripId={activeTrip?.id || ""}
            onClose={() => setQrTarget(null)}
            onSuccess={(newSettle: DB_Settlement) => {
              setDbSettlements(prev => [newSettle, ...prev]);
              setQrTarget(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Receipt Viewer Modal */}
      <AnimatePresence>
        {viewingReceipt && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6"
            onClick={() => setViewingReceipt(null)}
          >
            <button className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
               <X className="w-8 h-8" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-xl w-full"
              onClick={e => e.stopPropagation()}
            >
               <h3 className="text-center text-white font-black uppercase tracking-[0.3em] mb-6">Biên lai thanh toán</h3>
               <div className="bg-white p-2 rounded-3xl shadow-[0_0_100px_rgba(99,102,241,0.5)]">
                  <img src={viewingReceipt} alt="Receipt" className="w-full rounded-2xl" />
               </div>
               <p className="text-center text-slate-500 text-xs mt-6 font-medium italic">Vui lòng kiểm tra kỹ số tiền và nội dung trước khi xác nhận.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && expenseToDelete && (
          <DeleteReasonModal 
            expense={expenseToDelete}
            reason={deleteReason}
            setReason={setDeleteReason}
            loading={deleting}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={(r) => confirmRemoveExpense(expenseToDelete.id, r)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBankModal && (
          <BankSettingsModal 
            isOpen={showBankModal} 
            onClose={() => setShowBankModal(false)}
            onSuccess={() => {
              setMeBankMissing(false); // Immediate UI sync
              if (activeTrip) handleSelectTrip(activeTrip, true);
            }}
          />
        )}
        {viewingSettlement && (
          <PaymentModal
            isOpen={!!viewingSettlement}
            onClose={() => setViewingSettlement(null)}
            receiver={viewingSettlement.receiver}
            amount={viewingSettlement.amount}
            tripId={activeTrip?.id || ""}
            onSuccess={(newSettle: DB_Settlement) => {
              setDbSettlements(prev => [newSettle, ...prev]);
              setViewingSettlement(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {customConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setCustomConfirm(null)} />
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-sm bg-[#0a1128] border border-white/10 rounded-[28px] shadow-2xl overflow-hidden p-6"
             >
               <h3 className="text-xl font-black text-white text-center mb-2">{customConfirm.title || "Xác nhận"}</h3>
               <p className="text-slate-400 text-sm text-center mb-6 px-2 leading-relaxed">{customConfirm.message}</p>
               
               <div className="flex gap-3">
                 <button 
                   onClick={() => setCustomConfirm(null)} 
                   className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-white/5 hover:text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-colors"
                 >
                   Hủy
                 </button>
                 <button 
                   onClick={customConfirm.onConfirm}
                   className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-900/20 transition-all"
                 >
                   Tiếp tục
                 </button>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Main Page wrapper with Suspense (required for useSearchParams in App Router)
export default function SplitBillPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse text-sm uppercase tracking-widest">Đang tải dữ liệu...</p>
        </div>
      </div>
    }>
      <SplitBillContent />
    </Suspense>
  );
}

// --- Delete Reason Modal ---
function DeleteReasonModal({ 
  expense, 
  onClose, 
  onConfirm, 
  loading, 
  reason, 
  setReason 
}: { 
  expense: Expense; 
  onClose: () => void; 
  onConfirm: (r: string) => void; 
  loading: boolean;
  reason: string;
  setReason: (r: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => !loading && onClose()} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-sm bg-[#0a1128] border border-white/10 rounded-[28px] shadow-2xl overflow-hidden p-6"
      >
        <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
          <Trash2 className="w-8 h-8 text-rose-500" />
        </div>
        <h3 className="text-xl font-black text-white text-center mb-1">Xác nhận xóa?</h3>
        <p className="text-slate-400 text-sm text-center mb-6 px-4 leading-relaxed">Khoản chi <strong className="text-white">"{expense.name}"</strong> sẽ bị gỡ bỏ vĩnh viễn và thông báo cho mọi người.</p>
        
        <div className="space-y-2 mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 px-1 mb-2">Lý do xóa (Audit Log)</p>
          {[
            "Nhập sai số tiền/thông tin",
            "Giao dịch bị trùng lặp",
            "Đã thanh toán bằng tiền mặt",
            "Dịch vụ bị hủy/hoàn trả",
            "Lý do khác"
          ].map(r => (
            <button 
              key={r}
              onClick={() => setReason(r)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-bold transition-all ${reason === r ? "bg-indigo-600 border-indigo-400 text-white shadow-lg" : "bg-slate-900 border-white/5 text-slate-500 hover:bg-white/5"}`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button 
            disabled={loading}
            onClick={onClose} 
            className="flex-1 py-3 text-slate-500 hover:text-white font-bold text-xs uppercase transition-colors"
          >
            Hủy
          </button>
          <button 
            disabled={!reason || loading}
            onClick={() => onConfirm(reason)}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-900/20 disabled:opacity-20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận xóa"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
