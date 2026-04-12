"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import {
  Users, Plus, Receipt, ArrowRightLeft, X, Trash2,
  QrCode, ChevronDown, CheckCheck, UserPlus, Wallet,
  CreditCard, Banknote, Info, User
} from "lucide-react";

// --- Types ---
interface Member { id: string; name: string; color: string; }
interface Expense {
  id: string;
  name: string;
  amount: number;
  paidBy: string; // member id
  participants: string[]; // member ids
}
interface Settlement { from: string; to: string; amount: number; }

// --- VietQR Banks ---
const BANKS = [
  { code: "MB", name: "MB Bank" },
  { code: "VCB", name: "Vietcombank" },
  { code: "ACB", name: "ACB" },
  { code: "TCB", name: "Techcombank" },
  { code: "VIB", name: "VIB" },
  { code: "BIDV", name: "BIDV" },
  { code: "VPB", name: "VPBank" },
  { code: "TPB", name: "TPBank" },
  { code: "STB", name: "Sacombank" },
  { code: "CAKE", name: "CAKE" },
  { code: "TIMO", name: "Timo" },
  { code: "MSB", name: "MSB" },
  { code: "HDB", name: "HDBank" },
  { code: "OCB", name: "OCB" },
  { code: "SHB", name: "SHB" },
];

const MEMBER_COLORS = [
  "bg-indigo-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-purple-500", "bg-orange-500"
];

// --- Settle Up Algorithm (Minimum transactions) ---
function calculateSettlements(members: Member[], expenses: Expense[]): Settlement[] {
  const balance: Record<string, number> = {};
  members.forEach(m => balance[m.id] = 0);

  expenses.forEach(exp => {
    if (!balance.hasOwnProperty(exp.paidBy)) return;
    const share = exp.amount / exp.participants.length;
    exp.participants.forEach(pid => {
      if (balance.hasOwnProperty(pid)) {
        balance[pid] -= share;
      }
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

// --- VietQR Modal ---
function VietQRModal({
  settlement, members, onClose
}: {
  settlement: Settlement;
  members: Member[];
  onClose: () => void;
}) {
  const [bank, setBank] = useState("MB");
  const [account, setAccount] = useState("");
  const [showQR, setShowQR] = useState(false);

  const fromMember = members.find(m => m.id === settlement.from)?.name || "?";
  const toMember = members.find(m => m.id === settlement.to)?.name || "?";
  const amount = settlement.amount;
  const addInfo = encodeURIComponent(`Chuyen tien du lich cho ${toMember}`);
  const qrUrl = `https://img.vietqr.io/image/${bank}-${account}-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${encodeURIComponent(toMember)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-sm bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950/60">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-400" strokeWidth={2} />
            <h3 className="text-sm font-black text-white tracking-wide">VietQR</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Summary */}
          <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 rounded-2xl px-5 py-4">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Người chuyển</p>
              <p className="text-sm font-bold text-white">{fromMember}</p>
            </div>
            <ArrowRightLeft className="w-4 h-4 text-indigo-400 flex-shrink-0" strokeWidth={2} />
            <div className="text-right">
              <p className="text-xs text-slate-400 mb-0.5">Người nhận</p>
              <p className="text-sm font-bold text-white">{toMember}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-indigo-400">{amount.toLocaleString()}</p>
            <p className="text-xs text-slate-500 font-bold mt-1">VND</p>
          </div>

          {/* Bank selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Banknote className="w-3 h-3" strokeWidth={2} /> Ngân hàng nhận
            </label>
            <div className="relative">
              <select
                value={bank}
                onChange={e => { setBank(e.target.value); setShowQR(false); }}
                className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white text-sm appearance-none focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all pr-10"
              >
                {BANKS.map(b => <option key={b.code} value={b.code}>{b.name} ({b.code})</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" strokeWidth={2} />
            </div>
          </div>

          {/* Account number */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <CreditCard className="w-3 h-3" strokeWidth={2} /> Số tài khoản của {toMember}
            </label>
            <input
              value={account}
              onChange={e => { setAccount(e.target.value); setShowQR(false); }}
              placeholder="VD: 0987654321"
              className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all"
            />
          </div>

          {/* Generate button */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            disabled={!account.trim()}
            onClick={() => setShowQR(true)}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-black tracking-wide shadow-xl shadow-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <QrCode className="w-4 h-4" strokeWidth={2} />
            Tạo mã QR
          </motion.button>

          {/* QR Code Display */}
          <AnimatePresence>
            {showQR && account && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4 bg-slate-950/40 p-5 rounded-3xl border border-white/5"
              >
                <div className="bg-white rounded-2xl p-3 shadow-2xl ring-4 ring-indigo-500/10">
                  <img
                    src={qrUrl}
                    alt={`VietQR - ${toMember}`}
                    className="w-52 h-52 object-contain"
                  />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Thanh toán nhanh</p>
                  <p className="text-xs text-slate-400">
                    Sử dụng <span className="text-white font-bold tracking-tight">VietQR</span> để chuyển khoản an toàn
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// --- Main Component ---
export default function SplitBillPage() {
  const { lang } = useLang();

  // State
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [memberInput, setMemberInput] = useState("");
  const [activeTab, setActiveTab] = useState<"expenses" | "settle">("expenses");
  const [qrTarget, setQrTarget] = useState<Settlement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from external storage
  useEffect(() => {
    try {
      const savedMembers = localStorage.getItem("optiroute_sb_members");
      const savedExpenses = localStorage.getItem("optiroute_sb_expenses");
      let parsedMembers: Member[] = savedMembers ? JSON.parse(savedMembers) : [];
      let parsedExpenses = savedExpenses ? JSON.parse(savedExpenses) : [];

      // Logic: Mandatory "You" as first member if empty
      if (parsedMembers.length === 0) {
        parsedMembers = [{
          id: "me",
          name: lang === "vi" ? "Bạn (Me)" : "You",
          color: MEMBER_COLORS[0]
        }];
      }

      setMembers(parsedMembers);
      setExpenses(parsedExpenses);
    } catch (e) {
      console.error("Failed to load generic split-bill local storage", e);
    } finally {
      setIsLoaded(true);
    }
  }, [lang]);

  // Save to external storage upon changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("optiroute_sb_members", JSON.stringify(members));
      localStorage.setItem("optiroute_sb_expenses", JSON.stringify(expenses));
    }
  }, [members, expenses, isLoaded]);

  // Expense form state
  const [expForm, setExpForm] = useState({
    name: "", amount: "", paidBy: "", participants: [] as string[]
  });
  const [showExpForm, setShowExpForm] = useState(false);

  // --- Actions ---
  const addMember = () => {
    const name = memberInput.trim();
    if (!name || members.find(m => m.name.toLowerCase() === name.toLowerCase())) return;
    setMembers(prev => [...prev, {
      id: crypto.randomUUID(),
      name,
      color: MEMBER_COLORS[prev.length % MEMBER_COLORS.length]
    }]);
    setMemberInput("");
  };

  const removeMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    setExpenses(prev => prev.filter(e => e.paidBy !== id && e.participants.includes(id) ? {
      ...e, participants: e.participants.filter(p => p !== id)
    } : e).filter(e => e.paidBy !== id));
  };

  const addExpense = () => {
    const amount = parseFloat(expForm.amount);
    if (!expForm.name || isNaN(amount) || amount <= 0 || !expForm.paidBy || expForm.participants.length === 0) return;
    setExpenses(prev => [...prev, {
      id: crypto.randomUUID(),
      name: expForm.name,
      amount,
      paidBy: expForm.paidBy,
      participants: expForm.participants
    }]);
    setExpForm({ name: "", amount: "", paidBy: "", participants: [] });
    setShowExpForm(false);
  };

  const removeExpense = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));

  const toggleParticipant = (memberId: string) => {
    setExpForm(prev => ({
      ...prev,
      participants: prev.participants.includes(memberId)
        ? prev.participants.filter(p => p !== memberId)
        : [...prev.participants, memberId]
    }));
  };

  // --- Computed ---
  const totalAmount = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const settlements = useMemo(() => calculateSettlements(members, expenses), [members, expenses]);

  const getMember = (id: string) => members.find(m => m.id === id);
  const getMemberBalance = (memberId: string) => {
    let balance = 0;
    expenses.forEach(exp => {
      if (exp.paidBy === memberId) balance += exp.amount;
      if (exp.participants.includes(memberId)) balance -= exp.amount / exp.participants.length;
    });
    return balance;
  };

  return (
    <div className="min-h-screen bg-background pt-[72px] pb-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto py-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-indigo-400" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                {lang === "vi" ? "Chia tiền nhóm" : "Group Split Bill"}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {lang === "vi" ? "Tính toán và quyết toán chi phí du lịch" : "Track and settle travel expenses"}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Members */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="lg:col-span-1 space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 border border-white/8 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Tổng chi</p>
                <p className="text-xl font-black text-foreground">{(totalAmount / 1000).toFixed(0)}
                  <span className="text-xs text-slate-500 font-bold ml-1">k</span>
                </p>
              </div>
              <div className="bg-slate-900/50 border border-white/8 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Thành viên</p>
                <p className="text-xl font-black text-foreground">{members.length}</p>
              </div>
            </div>

            {/* Members Panel */}
            <div className="bg-slate-900/50 border border-white/8 rounded-3xl overflow-hidden">
              <div className="p-5 border-b border-white/8 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" strokeWidth={2} />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  {lang === "vi" ? "Thành viên" : "Members"}
                </h2>
              </div>

              {/* Add member input */}
              <div className="p-4 bg-slate-950/20">
                <div className="flex gap-2">
                  <div className="relative flex-1 group">
                    <input
                      value={memberInput}
                      onChange={e => setMemberInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addMember()}
                      placeholder={lang === "vi" ? "Nhập tên bạn đồng hành..." : "Add companion name..."}
                      className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all pl-10"
                    />
                    <UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={addMember}
                    disabled={!memberInput.trim()}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" strokeWidth={3} />
                  </motion.button>
                </div>
              </div>

              {/* Member list */}
              <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
                <AnimatePresence>
                  {members.length === 0 ? (
                    <p className="text-center text-xs text-slate-600 py-4">
                      {lang === "vi" ? "Chưa có thành viên nào" : "No members yet"}
                    </p>
                  ) : (
                    members.map(member => {
                      const balance = getMemberBalance(member.id);
                      return (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="flex items-center justify-between p-3 bg-slate-950/50 border border-white/8 rounded-2xl group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl ${member.color} flex items-center justify-center text-white text-xs font-black shadow-lg overflow-hidden`}>
                              {member.id === "me" ? <User className="w-4 h-4" /> : member.name[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                                {member.name}
                                {member.id === "me" && <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-md border border-indigo-500/30 uppercase tracking-tighter font-black">AI</span>}
                              </p>
                              <p className={`text-[10px] font-bold ${balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {balance >= 0 ? "+" : ""}{Math.round(balance).toLocaleString()} ₫
                              </p>
                            </div>
                          </div>
                          {member.id !== "me" && (
                            <button
                              onClick={() => removeMember(member.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                            </button>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Expenses & Settle */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6">

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-900/60 border border-white/8 rounded-2xl w-fit">
              {(["expenses", "settle"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-slate-500 hover:text-slate-300"
                    }`}
                >
                  {tab === "expenses"
                    ? (lang === "vi" ? "Chi phí" : "Expenses")
                    : (lang === "vi" ? "Quyết toán" : "Settle Up")}
                </button>
              ))}
            </div>

            {/* Expenses Tab */}
            {activeTab === "expenses" && (
              <div className="space-y-4">
                {/* Add Expense Button */}
                {members.length >= 2 && (
                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    onClick={() => setShowExpForm(f => !f)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-400 rounded-2xl text-sm font-bold transition-all"
                  >
                    <Plus className="w-4 h-4" strokeWidth={2} />
                    {lang === "vi" ? "Thêm khoản chi" : "Add Expense"}
                  </motion.button>
                )}

                {/* Add Expense Form */}
                <AnimatePresence>
                  {showExpForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Receipt className="w-3.5 h-3.5 text-indigo-400" strokeWidth={2} />
                            {lang === "vi" ? "Thêm khoản chi" : "New Expense"}
                          </h3>
                          <div className="group relative">
                            <Info className="w-3.5 h-3.5 text-slate-600 hover:text-indigo-400 cursor-help transition-colors" />
                            <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-slate-950 border border-white/10 rounded-xl text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-2xl">
                              {lang === "vi" 
                                ? "Ví dụ: Bạn trả 1tr5, chia cho An, Hoa. Hệ thống tính mỗi người nợ bạn 750k." 
                                : "Example: You pay 1.5M, split for An, Hoa. System calculates each owes you 750k."}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
                              {lang === "vi" ? "Tên khoản chi" : "Description"}
                            </label>
                            <input
                              value={expForm.name}
                              onChange={e => setExpForm(p => ({ ...p, name: e.target.value }))}
                              placeholder={lang === "vi" ? "VD: Tiền phòng khách sạn" : "e.g. Hotel Room"}
                              className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
                              {lang === "vi" ? "Số tiền (₫)" : "Amount (₫)"}
                            </label>
                            <input
                              type="number"
                              value={expForm.amount}
                              onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))}
                              placeholder="1500000"
                              className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
                              {lang === "vi" ? "Người trả" : "Paid By"}
                            </label>
                            <div className="relative">
                              <select
                                value={expForm.paidBy}
                                onChange={e => setExpForm(p => ({ ...p, paidBy: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-indigo-500/50 transition-all"
                              >
                                <option value="">{lang === "vi" ? "Chọn..." : "Select..."}</option>
                                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" strokeWidth={2} />
                            </div>
                          </div>
                        </div>

                        {/* Participants */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                              {lang === "vi" ? "Chia cho" : "Split Between"}
                            </label>
                            <button
                              onClick={() => setExpForm(p => ({
                                ...p,
                                participants: p.participants.length === members.length ? [] : members.map(m => m.id)
                              }))}
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                            >
                              {expForm.participants.length === members.length
                                ? (lang === "vi" ? "Bỏ chọn tất" : "Deselect All")
                                : (lang === "vi" ? "Chọn tất cả" : "Select All")}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {members.map(m => (
                              <button
                                key={m.id}
                                onClick={() => toggleParticipant(m.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${expForm.participants.includes(m.id)
                                  ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                                  : "bg-slate-800/50 border-white/8 text-slate-500 hover:text-slate-300"
                                  }`}
                              >
                                {expForm.participants.includes(m.id) && <CheckCheck className="w-3 h-3" strokeWidth={2.5} />}
                                {m.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => setShowExpForm(false)}
                            className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors"
                          >
                            {lang === "vi" ? "Hủy" : "Cancel"}
                          </button>
                          <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={addExpense}
                            disabled={!expForm.name || !expForm.amount || !expForm.paidBy || expForm.participants.length === 0}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20"
                          >
                            {lang === "vi" ? "Lưu" : "Save"}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Expenses List */}
                <div className="bg-slate-900/50 border border-white/8 rounded-3xl overflow-hidden">
                  <div className="p-5 border-b border-white/8 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-indigo-400" strokeWidth={2} />
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                      {lang === "vi" ? "Danh sách chi phí" : "Expense List"}
                    </h2>
                    <span className="ml-auto text-[10px] font-black text-slate-600 tabular-nums">
                      {expenses.length} {lang === "vi" ? "khoản" : "items"}
                    </span>
                  </div>

                  <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                    <AnimatePresence>
                      {expenses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Receipt className="w-10 h-10 text-slate-700 mb-3" strokeWidth={1.5} />
                          <p className="text-sm text-slate-600">
                            {lang === "vi" ? "Chưa có khoản chi nào" : "No expenses yet"}
                          </p>
                          {members.length < 2 && (
                            <p className="text-xs text-slate-700 mt-1">
                              {lang === "vi" ? "Thêm ít nhất 2 thành viên để bắt đầu" : "Add at least 2 members to start"}
                            </p>
                          )}
                        </div>
                      ) : (
                        expenses.map(exp => {
                          const payer = getMember(exp.paidBy);
                          return (
                            <motion.div
                              key={exp.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              className="flex items-center justify-between px-5 py-4 hover:bg-slate-950/40 transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl ${payer?.color || "bg-slate-700"} flex items-center justify-center text-white text-xs font-black shadow-md`}>
                                  {payer?.name[0].toUpperCase() || "?"}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-white">{exp.name}</p>
                                  <p className="text-[10px] text-slate-500">
                                    {lang === "vi" ? "Trả bởi" : "Paid by"} <span className="text-indigo-400 font-bold">{payer?.name}</span>
                                    {" · "}
                                    {lang === "vi" ? "Chia" : "Split"} {exp.participants.length}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-emerald-400">
                                  {exp.amount.toLocaleString()} ₫
                                </span>
                                <button
                                  onClick={() => removeExpense(exp.id)}
                                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}

            {/* Settle Up Tab */}
            {activeTab === "settle" && (
              <div className="space-y-4">
                <div className="bg-slate-900/50 border border-white/8 rounded-3xl overflow-hidden">
                  <div className="p-5 border-b border-white/8 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-400" strokeWidth={2} />
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                      {lang === "vi" ? "Kết quả quyết toán" : "Settle Up"}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-3 p-3">
                    {settlements.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <CheckCheck className="w-12 h-12 text-emerald-500/30 mb-3" strokeWidth={1.5} />
                        <p className="text-sm font-bold text-slate-400">
                          {expenses.length === 0
                            ? (lang === "vi" ? "Chưa có chi phí nào được ghi nhận" : "No expenses recorded")
                            : (lang === "vi" ? "Tất cả đã huề!" : "All settled up! 🎉")}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {lang === "vi" ? "Không có khoản nợ nào cần thanh toán" : "No outstanding debts"}
                        </p>
                      </div>
                    ) : (
                      settlements.map((s, i) => {
                        const fromMember = getMember(s.from);
                        const toMember = getMember(s.to);
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center justify-between p-5 bg-slate-950/40 border border-white/5 rounded-2xl hover:bg-slate-950/60 transition-all hover:border-indigo-500/20 group"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-2xl ${toMember?.color || "bg-slate-700"} flex items-center justify-center text-white text-xs font-black shadow-lg`}>
                                {toMember?.name[0].toUpperCase() || "?"}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">
                                  <span className="text-rose-400/80 font-medium">{fromMember?.name}</span>
                                  {" "}{lang === "vi" ? "trả cho" : "owes"}{" "}
                                  <span className="text-emerald-400">{toMember?.name}</span>
                                </p>
                                <p className="text-xl font-black text-foreground mt-0.5 tracking-tight">
                                  {s.amount.toLocaleString()}
                                  <span className="text-xs text-slate-500 font-bold ml-1">₫</span>
                                </p>
                              </div>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => setQrTarget(s)}
                              className="flex items-center gap-2 px-4 py-3 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 rounded-xl text-xs font-black transition-all shadow-lg"
                            >
                              <QrCode className="w-3.5 h-3.5" strokeWidth={2.5} />
                              PAY
                            </motion.button>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* VietQR Modal */}
      <AnimatePresence>
        {qrTarget && (
          <VietQRModal
            settlement={qrTarget}
            members={members}
            onClose={() => setQrTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
