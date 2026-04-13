"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/components/providers/LangProvider";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import {
  Users, Plus, Receipt, ArrowRightLeft, X, Trash2,
  QrCode, ChevronDown, CheckCheck, UserPlus, Wallet,
  CreditCard, Banknote, Info, User, ArrowUpRight, ArrowDownRight,
  TrendingUp, Activity, Split, Download, Share2, Maximize2, Search, CheckCircle2
} from "lucide-react";

// --- Types ---
interface Member {
  id: string;
  name: string;
  color: string;
  bankCode?: string;
  bankAccount?: string;
}
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

// --- Animated Counter ---
function AnimatedNumber({ value }: { value: number }) {
  return <span className="tabular-nums">{value.toLocaleString()}</span>;
}

// --- VietQR Modal ---
function VietQRModal({
  settlement, members, onClose, onSaveBank, onConfirmSettle
}: {
  settlement: Settlement;
  members: Member[];
  onClose: () => void;
  onSaveBank: (memberId: string, bankCode: string, bankAccount: string) => void;
  onConfirmSettle: (s: Settlement) => void;
}) {
  const toMemberObj = members.find(m => m.id === settlement.to);
  const fromMemberObj = members.find(m => m.id === settlement.from);
  
  const [bank, setBank] = useState("MB");
  const [account, setAccount] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [searchBankQuery, setSearchBankQuery] = useState("");
  const [saveDefault, setSaveDefault] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);

  useEffect(() => setImgError(false), [bank, account]);

  const filteredBanks = useMemo(() => {
    if (!searchBankQuery) return BANKS;
    return BANKS.filter(b => b.name.toLowerCase().includes(searchBankQuery.toLowerCase()) || b.code.toLowerCase().includes(searchBankQuery.toLowerCase()));
  }, [searchBankQuery]);

  const fromMemberName = fromMemberObj?.name || "?";
  const toMemberName = toMemberObj?.name || "?";
  const amount = settlement.amount;
  const addInfo = encodeURIComponent(`Chuyen tien du lich cho ${toMemberName}`);
  
  const activeBankRaw = toMemberObj?.bankCode || bank;
  const activeBank = activeBankRaw === "LPB" ? "970449" : activeBankRaw; // Fix for VietQR LPBank shortname routing
  const activeAccount = toMemberObj?.bankAccount || account;
  const qrUrl = `https://img.vietqr.io/image/${activeBank}-${activeAccount}-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${encodeURIComponent(toMemberName)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-[24px] shadow-2xl overflow-hidden"
      >
        {successAnim ? (
           <div className="flex flex-col items-center justify-center text-center py-20 px-8">
              <motion.div
                 initial={{ scale: 0, opacity: 0, rotate: -180 }}
                 animate={{ scale: 1, opacity: 1, rotate: 0 }}
                 transition={{ type: "spring", stiffness: 200, damping: 15 }}
                 className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-500/20"
              >
                 <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </motion.div>
              <motion.h3 initial={{y: 10, opacity: 0}} animate={{y: 0, opacity: 1}} transition={{delay: 0.2}} className="text-2xl font-black text-white mb-2 tracking-tight">Thanh toán hoàn tất!</motion.h3>
              <motion.p initial={{y: 10, opacity: 0}} animate={{y: 0, opacity: 1}} transition={{delay: 0.3}} className="text-slate-400 text-sm font-medium">Hệ thống đang tự động cấn trừ công nợ.</motion.p>
           </div>
        ) : (
          <>
            <div className="py-4 px-5 border-b border-white/10 flex justify-between items-center bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <QrCode className="w-3.5 h-3.5 text-indigo-400" strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">Thanh toán VietQR</h3>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-full">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              <div className="flex items-center justify-between bg-[#0a1128] border border-indigo-500/10 rounded-xl p-2.5">
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Người chuyển</p>
                  <p className="text-sm font-bold text-white">{fromMemberName}</p>
                </div>
            <ArrowRightLeft className="w-4 h-4 text-indigo-400/50 flex-shrink-0 mx-2" strokeWidth={2} />
            <div className="text-right">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Người nhận</p>
              <p className="text-sm font-bold text-white">{toMemberName}</p>
            </div>
          </div>

          <div className="text-center py-1">
            <p className="text-3xl font-black text-indigo-400 tabular-nums tracking-tight">
              {amount.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5 tracking-widest uppercase">VND</p>
          </div>

          {toMemberObj?.bankAccount ? (
            <div className="bg-[#0a1128] border border-emerald-500/20 rounded-2xl p-4 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-3">
                 <button onClick={() => {
                   onSaveBank(settlement.to, "", ""); // Reset to allow editing
                 }} className="text-[9px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-rose-500/20 px-2 py-1.5 rounded-lg hidden group-hover:block transition-all">Sửa tài khoản</button>
               </div>
               <div className="flex items-center gap-3 mb-2.5">
                 <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center">
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                 </div>
                 <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Tài khoản chính thức</p>
               </div>
               <p className="text-xl font-black text-white px-1 tracking-tight">{toMemberObj.bankAccount}</p>
               <p className="text-sm font-medium text-slate-400 px-1 mt-0.5">{BANKS.find(b=>b.code === toMemberObj.bankCode)?.name}</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-200/90 font-medium leading-relaxed">
                 <Info className="w-4 h-4 text-amber-400 inline-block mr-1.5 -mt-0.5" />
                 <strong>{toMemberName}</strong> chưa có tài khoản. Hãy kiểm tra và nhập cẩn thận để tránh chuyển nhầm nhé.
              </div>
              <div className="space-y-2.5">
                <div className="relative">
                  <button
                    onClick={() => setShowBankDropdown(!showBankDropdown)}
                    className="w-full flex items-center justify-between pl-10 pr-3.5 py-2.5 bg-[#0a1128] border border-white/5 hover:border-indigo-500/40 rounded-xl transition-all h-[42px]"
                  >
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Banknote className="w-4 h-4 text-indigo-400/50" />
                    </div>
                    <span className="text-white text-sm font-medium">
                      {BANKS.find(b => b.code === bank)?.name} <span className="text-slate-400 text-xs ml-1 font-normal">({bank})</span>
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showBankDropdown ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {showBankDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.98 }} transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 bg-[#0a1128] border border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[280px]"
                      >
                        <div className="p-2 border-b border-white/5 sticky top-0 bg-[#0a1128]/95 backdrop-blur-md z-10">
                           <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                <Search className="w-3.5 h-3.5 text-slate-500" />
                             </div>
                             <input 
                               autoFocus
                               className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-white/5 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                               placeholder="Tìm tên hoặc mã ngân hàng..."
                               value={searchBankQuery}
                               onChange={e => setSearchBankQuery(e.target.value)}
                             />
                           </div>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar p-1 z-0">
                          {filteredBanks.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-4">Không tìm thấy ngân hàng</p>
                          ) : (
                            filteredBanks.map(b => (
                              <button
                                key={b.code}
                                onClick={() => { setBank(b.code); setShowBankDropdown(false); setShowQR(false); setSearchBankQuery(''); }}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${b.code === bank ? "bg-indigo-600/20 text-indigo-300" : "text-white hover:bg-slate-800"}`}
                              >
                                <span>{b.name}</span>
                                <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-slate-400 font-bold">{b.code}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <CreditCard className="w-4 h-4 text-indigo-400/50" />
                  </div>
                  <input
                    value={account}
                    onChange={e => { setAccount(e.target.value); setShowQR(false); }}
                    placeholder={`Số tài khoản của ${toMemberName}`}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0a1128] border border-white/5 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 px-1 py-1 cursor-pointer group mt-1.5 w-fit">
                 <input type="checkbox" checked={saveDefault} onChange={e => setSaveDefault(e.target.checked)} className="w-4 h-4 rounded border-indigo-500/30 bg-slate-900/50 text-indigo-600 focus:ring-offset-0 focus:ring-0 transition-all cursor-pointer" />
                 <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors select-none">
                    Lưu làm tài khoản mặc định cho <strong className="text-indigo-300">{toMemberName}</strong>
                 </span>
              </label>
            </div>
          )}

          {!showQR && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              disabled={!toMemberObj?.bankAccount && !account.trim()}
              onClick={() => {
                if (!toMemberObj?.bankAccount && saveDefault && settlement.to) {
                  onSaveBank(settlement.to, bank, account);
                }
                setShowQR(true);
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 mt-4"
            >
              <QrCode className="w-5 h-5" strokeWidth={2} />
              <span>{toMemberObj?.bankAccount ? "Mở mã QR An toàn" : "Tiếp tục tạo mã"}</span>
            </motion.button>
          )}

          <AnimatePresence>
            {showQR && activeAccount && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 flex flex-col items-center">
                  <div 
                    onClick={() => !imgError && setIsFullscreen(true)}
                    className={`relative bg-white rounded-2xl p-2.5 shadow-2xl ring-4 ring-indigo-500/20 mt-2 mb-4 transition-transform ${!imgError ? "cursor-pointer group hover:scale-105" : ""}`}
                  >
                    {!imgError ? (
                      <img src={qrUrl} alt="VietQR" className="w-[140px] h-[140px] object-contain block" onError={() => setImgError(true)} />
                    ) : (
                      <div className="w-[140px] h-[140px] flex flex-col items-center justify-center text-center p-2">
                         <Info className="w-6 h-6 text-amber-500 mb-1.5" />
                         <p className="text-[10px] text-slate-500 font-bold leading-tight">Mã QR bị từ chối do sai định dạng STK của ngân hàng.</p>
                      </div>
                    )}
                    {!imgError && (
                      <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center backdrop-blur-[2px]">
                         <Maximize2 className="w-8 h-8 text-white drop-shadow-md" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>

                  {imgError ? (
                    <div className="flex w-full gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(activeAccount); }}
                        className="flex-1 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Copy STK
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(amount.toString()); }}
                        className="flex-1 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        Copy Số tiền
                      </button>
                    </div>
                  ) : (
                    <div className="flex w-full gap-3">
                      <a 
                        href={qrUrl} download={`qr_${toMemberName}.png`}
                        className="flex-1 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Tải Mã
                      </a>
                      <button 
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({ title: `Thanh toán cho ${toMemberName}`, url: qrUrl });
                          }
                        }}
                        className="flex-1 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Chia sẻ
                      </button>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-white/5 w-full">
                    <button
                       onClick={() => {
                         setSuccessAnim(true);
                         setTimeout(() => {
                           onConfirmSettle(settlement);
                           onClose();
                         }, 2300);
                       }}
                       className="w-full py-3.5 bg-[#0a1128] hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/30 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 group"
                    >
                       <CheckCircle2 className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                       Xác nhận đã chuyển khoản
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </>
    )}
  </motion.div>

      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center p-6"
            onClick={() => setIsFullscreen(false)}
          >
            <button 
              onClick={() => setIsFullscreen(false)} 
              className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: "spring", damping: 20 }}
              className="bg-white p-6 rounded-[32px] shadow-[0_0_80px_rgba(99,102,241,0.4)]"
              onClick={e => e.stopPropagation()}
            >
              <img src={qrUrl} alt="VietQR Zoom" className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] object-contain" />
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center px-2">
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Người nhận</p>
                    <p className="text-xl font-black text-slate-800">{toMemberName}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Số tiền</p>
                    <p className="text-xl font-black text-indigo-600 tabular-nums">{amount.toLocaleString()} ₫</p>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Helper functions ---
const getStandardColor = (index: number) => {
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4", "#a855f7", "#f97316"];
  return colors[index % colors.length];
};

export default function SplitBillPage() {
  const { lang } = useLang();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<"expenses" | "settle">("expenses");
  const [showExpForm, setShowExpForm] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [expForm, setExpForm] = useState<Omit<Expense, "id">>({ name: "", amount: 0, paidBy: "", participants: [] });
  const [qrTarget, setQrTarget] = useState<Settlement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
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
  }, [lang]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("optiroute_sb_members", JSON.stringify(members));
      localStorage.setItem("optiroute_sb_expenses", JSON.stringify(expenses));
    }
  }, [members, expenses, isLoaded]);

  const addMember = () => {
    const name = memberInput.trim();
    if (!name || members.find(m => m.name.toLowerCase() === name.toLowerCase())) return;
    setMembers(prev => [...prev, { id: crypto.randomUUID(), name, color: MEMBER_COLORS[prev.length % MEMBER_COLORS.length] }]);
    setMemberInput("");
  };

  const handleSaveBank = (memberId: string, bankCode: string, bankAccount: string) => {
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, bankCode, bankAccount } : m));
  };

  const removeMember = (id: string) => {
    if (id === "me") return;
    setMembers(prev => prev.filter(m => m.id !== id));
    setExpenses(prev => prev
      .filter(e => e.paidBy !== id)
      .map(e => ({ ...e, participants: e.participants.filter(p => p !== id) }))
      .filter(e => e.participants.length > 0)
    );
  };

  useEffect(() => {
    if (showExpForm) {
      setAmountInput("");
      setExpForm({ name: "", amount: 0, paidBy: "me", participants: members.map(m => m.id) });
    }
  }, [showExpForm, members]);

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

  const addExpense = () => {
    if (!expForm.name || expForm.amount <= 0 || !expForm.paidBy || expForm.participants.length === 0) return;
    const newExp: Expense = {
      id: crypto.randomUUID(),
      name: expForm.name,
      amount: expForm.amount,
      paidBy: expForm.paidBy,
      participants: expForm.participants
    };
    setExpenses(prev => [...prev, newExp]);
    setShowExpForm(false);
  };

  const removeExpense = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));
  const toggleParticipant = (memberId: string) => {
    setExpForm(prev => ({
      ...prev, participants: prev.participants.includes(memberId)
        ? prev.participants.filter(p => p !== memberId)
        : [...prev.participants, memberId]
    }));
  };

  const totalAmount = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const settlements = useMemo(() => calculateSettlements(members, expenses), [members, expenses]);
  const getMemberBalance = (memberId: string) => {
    let balance = 0;
    expenses.forEach(exp => {
      if (exp.paidBy === memberId) balance += exp.amount;
      if (exp.participants.includes(memberId)) balance -= exp.amount / exp.participants.length;
    });
    return balance;
  };

  const getMember = (id: string) => members.find(m => m.id === id);
  const myBalance = getMemberBalance("me");
  const youOwe = Math.abs(Math.min(myBalance, 0));
  const owedToYou = Math.max(myBalance, 0);

  const chartData = useMemo(() => {
    return members.map((m, i) => {
      const spent = expenses.filter(e => e.paidBy === m.id).reduce((s, e) => s + e.amount, 0);
      return { name: m.name, value: spent, fill: getStandardColor(i) };
    }).filter(d => d.value > 0);
  }, [members, expenses]);

  if (!isLoaded) return <div className="min-h-screen bg-[#020817]" />;

  return (
    <div className="min-h-screen bg-[#020817] pt-[64px] pb-16 px-4 font-sans">
      <div className="max-w-5xl mx-auto py-6">
        
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
                {lang === "vi" ? "Quản lý chi tiêu minh bạch, sòng phẳng." : "Transparent group expense management."}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="md:col-span-2 bg-gradient-to-br from-indigo-900/40 via-slate-900 to-[#0a1128] border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl"
          >
            <div className="absolute -top-24 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex flex-col sm:flex-row justify-between gap-8 relative z-10">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-indigo-300" />
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-300/80">Tổng chi phí nhóm</p>
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
                      {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
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
                      placeholder={lang === "vi" ? "Thêm bạn..." : "Add..."}
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
                        <div className={`w-10 h-10 rounded-full ${member.color} flex items-center justify-center text-white text-sm font-black`}>
                          {member.id === "me" ? <User className="w-5 h-5" /> : member.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{member.name}</p>
                          <p className={`text-xs font-bold mt-0.5 ${balance >= 0 ? "text-emerald-400/80" : "text-rose-400/80"}`}>
                            {balance >= 0 ? "+" : ""}{Math.round(balance).toLocaleString()} ₫
                          </p>
                        </div>
                      </div>
                      {member.id !== "me" && <button onClick={() => removeMember(member.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-2"><Trash2 className="w-4 h-4" /></button>}
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
                  key={tab} onClick={() => setActiveTab(tab)}
                  className="relative px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors z-10"
                  style={{ color: activeTab === tab ? '#fff' : '#64748b' }}
                >
                  {tab === "expenses" ? (lang === "vi" ? "Chi phí" : "Expenses") : (lang === "vi" ? "Thanh toán" : "Settle")}
                  {activeTab === tab && <motion.div layoutId="splitTab" className="absolute inset-0 bg-indigo-600 rounded-xl -z-10 shadow-md" />}
                </button>
              ))}
            </div>

            <div className="flex-1 bg-[#0a1128] border border-white/5 rounded-3xl overflow-hidden flex flex-col relative min-h-[500px]">
              {activeTab === "expenses" && (
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/30">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Receipt className="w-5 h-5 text-indigo-400" /> Lịch sử chi tiêu</h2>
                    {members.length >= 2 && <button onClick={() => setShowExpForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold"><Plus className="w-4 h-4" /> Thêm mới</button>}
                  </div>

                  <AnimatePresence>
                    {showExpForm && (
                      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto">
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

                  <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 relative">
                    {expenses.length === 0 ? <div className="h-full flex flex-col items-center justify-center opacity-40"><Banknote className="w-12 h-12 mb-2" /><p className="text-xs">Chưa có chi tiêu</p></div> : 
                      expenses.map(exp => {
                        const payer = getMember(exp.paidBy);
                        return (
                          <div key={exp.id} className="group flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl ${payer?.color || "bg-slate-700"} flex items-center justify-center text-white text-xs font-black shadow-lg`}>{payer?.name[0].toUpperCase()}</div>
                              <div><p className="font-bold text-white text-sm">{exp.name}</p><p className="text-[10px] text-slate-500">{payer?.name} trả • Chia {exp.participants.length}</p></div>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="text-base font-black text-rose-400">{exp.amount.toLocaleString()} ₫</p>
                              <button onClick={() => removeExpense(exp.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              )}

              {activeTab === "settle" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full bg-slate-900/20">
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
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                            key={i} 
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

                            <motion.button 
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => setQrTarget(s)} 
                              className="w-full sm:w-auto px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2.5 transition-all font-bold tracking-wide"
                            >
                              <QrCode className="w-5 h-5" /> 
                              <span>Tạo QR</span>
                            </motion.button>
                          </motion.div>
                        );
                      })
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
          <VietQRModal 
            settlement={qrTarget} 
            members={members} 
            onClose={() => setQrTarget(null)} 
            onSaveBank={handleSaveBank} 
            onConfirmSettle={(s) => {
               setExpenses(prev => [...prev, {
                 id: crypto.randomUUID(),
                 name: `💸 Thanh toán dư nợ cho ${members.find(m => m.id === s.to)?.name || "Người nhận"}`,
                 amount: s.amount,
                 paidBy: s.from,
                 participants: [s.to]
               }]);
               
               try {
                 const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                 const osc = ctx.createOscillator();
                 const gain = ctx.createGain();
                 osc.connect(gain);
                 gain.connect(ctx.destination);
                 osc.type = 'sine';
                 osc.frequency.setValueAtTime(800, ctx.currentTime);
                 osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.15);
                 gain.gain.setValueAtTime(0, ctx.currentTime);
                 gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
                 gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
                 osc.start(); osc.stop(ctx.currentTime + 0.5);
               } catch(e) { console.error("Audio block", e); }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
