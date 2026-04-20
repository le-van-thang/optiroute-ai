"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Settings, User, Bell, Shield, Landmark, 
  Languages, Moon, Smartphone, HelpCircle, 
  ChevronRight, CreditCard, Lock
} from "lucide-react";
import { useLang } from "@/components/providers/LangProvider";
import { BankSettingsModal } from "@/components/split-bill/BankSettingsModal";
import { ChangePasswordModal } from "@/components/settings/ChangePasswordModal";
import { PrivacyModal } from "@/components/settings/PrivacyModal";
import { NotificationsModal } from "@/components/settings/NotificationsModal";
import { TransactionHistoryModal } from "@/components/settings/TransactionHistoryModal";
import { useToast } from "@/components/providers/ToastProvider";
import Link from "next/link";

interface SettingsItem {
  icon: any;
  label: string;
  desc: string;
  link?: string;
  action?: () => void;
  color: string;
}

interface SettingsCategory {
  id: string;
  title: string;
  items: SettingsItem[];
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { lang, setLang } = useLang();
  const { showToast } = useToast();
  
  const [showBankModal, setShowBankModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  const categories: SettingsCategory[] = [
    {
      id: "account",
      title: "Tài khoản",
      items: [
        { 
           icon: User, 
           label: "Thông tin cá nhân", 
           desc: "Quản lý tên, email và định danh",
           link: "/profile",
           color: "bg-indigo-500"
        },
        { 
           icon: Lock, 
           label: "Mật khẩu", 
           desc: "Thay đổi mật khẩu đăng nhập",
           action: () => setShowPasswordModal(true),
           color: "bg-purple-500"
        },
        { 
           icon: Shield, 
           label: "Quyền riêng tư", 
           desc: "Quản lý dữ liệu và bảo mật",
           action: () => setShowPrivacyModal(true),
           color: "bg-blue-500"
        }
      ]
    },
    {
      id: "finance",
      title: "Tài chính & Thanh toán",
      items: [
        { 
           icon: Landmark, 
           label: "Thông tin thụ hưởng", 
           desc: "Tài khoản ngân hàng nhận tiền chia bill",
           action: () => setShowBankModal(true),
           color: "bg-emerald-500"
        },
        { 
           icon: CreditCard, 
           label: "Lịch sử giao dịch", 
           desc: "Xem lại các khoản đã thanh toán",
           action: () => setShowTransactionModal(true),
           color: "bg-amber-500"
        }
      ]
    },
    {
      id: "preferences",
      title: "Tùy chọn ứng dụng",
      items: [
        { 
           icon: Languages, 
           label: "Ngôn ngữ", 
           desc: lang === "vi" ? "Tiếng Việt" : "English",
           action: () => setLang(lang === "vi" ? "en" : "vi"),
           color: "bg-rose-500"
        },
        { 
           icon: Moon, 
           label: "Giao diện", 
           desc: "Chế độ tối (Mặc định)",
           action: () => showToast("OptiRoute AI hiển thị tốt nhất trên nền tối. Chế độ sáng đang được ẩn đi.", "info"),
           color: "bg-slate-700"
        },
        { 
           icon: Bell, 
           label: "Thông báo", 
           desc: "Cài đặt âm thanh và đẩy tin",
           action: () => setShowNotificationModal(true),
           color: "bg-cyan-500"
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a1128] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-2">
             <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
               <Settings className="w-6 h-6 text-indigo-500" />
             </div>
             <h1 className="text-3xl font-black text-white tracking-tight uppercase">Cài đặt</h1>
          </div>
          <p className="text-slate-400 font-medium">Cấu hình trải nghiệm OptiRoute AI theo ý bạn.</p>
        </header>

        <div className="space-y-12">
          {categories.map((category) => (
            <section key={category.id}>
              <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 pl-4 border-l-2 border-indigo-500/30">
                {category.title}
              </h2>
              
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden">
                {category.items.map((item, index) => {
                  const Content = (
                    <div className="flex items-center justify-between p-6 hover:bg-white/5 transition-all text-left">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shadow-lg shadow-black/20`}>
                           <item.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white leading-none mb-1">{item.label}</p>
                          <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </div>
                  );

                  return (
                    <div key={index} className={index !== 0 ? "border-t border-white/5" : ""}>
                      {item.link ? (
                        <Link href={item.link} className="block">{Content}</Link>
                      ) : (
                        <button className="w-full" onClick={item.action}>{Content}</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-16 pt-8 border-t border-white/5 text-center">
           <div className="flex flex-col items-center gap-4">
             <div className="flex items-center gap-2">
               <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0a1128] bg-slate-800 flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
               </div>
               <span className="text-xs font-bold text-slate-500">Phiên bản 2.4.0 (Stable)</span>
             </div>
             <p className="text-[10px] text-slate-700 font-black uppercase tracking-widest flex items-center gap-2">
                <HelpCircle className="w-3 h-3" />
                Cần hỗ trợ? Liên hệ đội ngũ kỹ thuật
             </p>
           </div>
        </footer>
      </div>

      <BankSettingsModal 
        isOpen={showBankModal} 
        onClose={() => setShowBankModal(false)} 
      />
      <ChangePasswordModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
      <PrivacyModal 
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
      <NotificationsModal 
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
      <TransactionHistoryModal 
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
      />
    </div>
  );
}
