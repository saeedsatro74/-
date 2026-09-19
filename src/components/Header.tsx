import React, { useState } from 'react';
import { 
  ShoppingBag, 
  TrendingUp, 
  Calculator,
  UserPlus, 
  Calendar,
  Layers,
  Boxes,
  ArrowDownLeft,
  Tag,
  Edit2,
  LogOut,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  X,
  KeyRound,
  Trash2,
  Sparkles,
  Plus,
  RefreshCw,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  BookOpen,
  Clock,
  Cloud,
  CloudOff
} from 'lucide-react';
import { soundManager } from '../utils/soundNotifications';
import { useLivePersianClock } from '../utils/persianDate';
import { formatNumber, formatWeight } from '../utils/formatters';
import { WATTEH_LOGO } from '../assets/branding';

interface HeaderProps {
  onAddPerson: () => void;
  onAddDeposit: () => void;
  onAddWithdrawal: () => void;
  onAddPurchase: () => void;
  onAddSale: () => void;
  onOpenMarketPrice: () => void;
  onOpenCopperChart: () => void;
  onOpenAiAnalysis?: () => void;
  onOpenWarehouse?: () => void;
  onClearPerson?: () => void;
  activeView?: 'dashboard' | 'copper-chart' | 'ai-analysis' | 'warehouse';
  onOpenFactoryReset?: () => void;
  onOpenApprovalsModal?: () => void;
  pendingApprovalsCount?: number;
  onOpenBankModal?: () => void;
  onOpenChequesModal?: () => void;
  pendingChequesCount?: number;
  onChangePassword?: () => void;
  onLogout?: () => void;
  totalStockKg: number;
  companyCopperStockKg: number;
  totalCash: number;
  marketPrice: number;
  marketBuyPrice?: number;
  marketSellPrice?: number;
  isCloudConnected?: boolean;
  isSyncing?: boolean;
  userRole?: 'admin' | 'staff' | 'client' | 'warehouse';
  currentUsername?: string;
  onOpenEditCompanyStock?: () => void;
  isPersonSelected?: boolean;
  onRefreshData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onAddPerson,
  onAddDeposit,
  onAddWithdrawal,
  onAddPurchase,
  onAddSale,
  onOpenMarketPrice,
  onOpenCopperChart,
  onOpenAiAnalysis,
  onOpenWarehouse,
  onClearPerson,
  activeView = 'dashboard',
  onOpenFactoryReset,
  onOpenApprovalsModal,
  pendingApprovalsCount = 0,
  onOpenBankModal,
  onOpenChequesModal,
  pendingChequesCount = 0,
  onChangePassword,
  onLogout,
  totalStockKg,
  companyCopperStockKg,
  marketPrice,
  marketBuyPrice,
  marketSellPrice,
  isCloudConnected = true,
  isSyncing = false,
  userRole = 'admin',
  currentUsername,
  onOpenEditCompanyStock,
  isPersonSelected = false,
  onRefreshData,
}) => {
  const { date: liveDate, time: liveTime } = useLivePersianClock();
  const buyRate = marketBuyPrice || marketPrice;
  const sellRate = marketSellPrice || Math.max(0, buyRate - 150000);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleToggleSound = () => {
    soundManager.unlockAudioContext();
    if (!soundEnabled) {
      soundManager.playNewRequestAlert();
    }
    setSoundEnabled(!soundEnabled);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-2xs no-print dir-rtl">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Right Section: Logo, Cathode Rate, Navigation Tabs, Header Search */}
          <div className="flex items-center gap-4 flex-1 overflow-x-auto no-scrollbar py-1">
            
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 text-white flex items-center justify-center font-black shadow-xs">
                <Boxes className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black text-stone-900 tracking-tight leading-none">واته</span>
                <span className="text-[10px] text-stone-500 font-bold leading-tight mt-0.5">سامانه معاملات مس</span>
              </div>
            </div>

            {/* Cathode Rate Pill */}
            <div 
              onClick={(userRole === 'admin' || userRole === 'staff') ? onOpenMarketPrice : undefined}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1 bg-sky-50 border border-sky-100 rounded-xl text-xs font-bold text-sky-900 shrink-0 ${
                (userRole === 'admin' || userRole === 'staff') ? 'cursor-pointer hover:bg-sky-100/70' : ''
              }`}
              title="تنظیم نرخ مرجع مس"
            >
              <span className="text-sky-700 font-medium">نرخ مس کاتد:</span>
              <span className="font-mono font-black text-sky-950">{formatNumber(buyRate)}</span>
              <span className="text-[10px] text-sky-600 font-normal">ت</span>
            </div>

            {/* Navigation Menu Tabs */}
            <nav className="hidden lg:flex items-center gap-1.5 shrink-0 font-bold text-xs text-stone-600">
              <button
                type="button"
                onClick={() => {
                  if (onClearPerson) onClearPerson();
                }}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeView === 'dashboard' && !isPersonSelected
                    ? 'text-amber-950 bg-amber-100/90 font-black border-b-2 border-amber-700 shadow-xs ring-2 ring-amber-500/20'
                    : 'hover:text-stone-900 hover:bg-stone-100/80 text-stone-600'
                }`}
              >
                داشبورد
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearPerson) onClearPerson();
                  if (onOpenWarehouse) onOpenWarehouse();
                }}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeView === 'warehouse' && !isPersonSelected
                    ? 'text-amber-950 bg-amber-100/90 font-black border-b-2 border-amber-700 shadow-xs ring-2 ring-amber-500/20'
                    : 'hover:text-stone-900 hover:bg-stone-100/80 text-stone-600'
                }`}
              >
                انبار مس
              </button>
              <button
                type="button"
                onClick={onAddSale}
                className="px-3.5 py-1.5 rounded-xl hover:text-stone-900 hover:bg-stone-100/80 transition-all cursor-pointer text-stone-600"
              >
                معاملات
              </button>
              <button
                type="button"
                onClick={() => {}}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  isPersonSelected
                    ? 'text-amber-950 bg-amber-100/90 font-black border-b-2 border-amber-700 shadow-xs ring-2 ring-amber-500/20'
                    : 'hover:text-stone-900 hover:bg-stone-100/80 text-stone-600'
                }`}
              >
                طرف‌های حساب
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearPerson) onClearPerson();
                  if (onOpenAiAnalysis) onOpenAiAnalysis();
                }}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  (activeView === 'ai-analysis' || activeView === 'copper-chart') && !isPersonSelected
                    ? 'text-amber-950 bg-amber-100/90 font-black border-b-2 border-amber-700 shadow-xs ring-2 ring-amber-500/20'
                    : 'hover:text-stone-900 hover:bg-stone-100/80 text-stone-600'
                }`}
              >
                گزارش‌ها
              </button>
            </nav>

            {/* Top Header Search Input */}
            <div className="relative hidden xl:block w-56 shrink-0">
              <input
                type="text"
                placeholder="جستجوی حواله، پارت، مشتری..."
                className="w-full pl-3 pr-8 py-1.5 text-xs bg-stone-100/80 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs">🔍</span>
            </div>

          </div>

          {/* Left Section: Notifications & User Profile */}
          <div className="flex items-center gap-3 shrink-0">
            
            {/* Notification Bell */}
            <div className="relative cursor-pointer p-1.5 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors" onClick={onOpenApprovalsModal}>
              <span className="text-base">🔔</span>
              {pendingApprovalsCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white"></span>
              )}
            </div>

            {/* User Profile Info */}
            <div className="flex items-center gap-2.5 pl-1 border-l border-stone-200">
              <div className="w-8 h-8 rounded-full bg-amber-800 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                👤
              </div>
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-stone-900 leading-tight">
                  {currentUsername || 'صنایع مس پارس'}
                </span>
                <span className="text-[10px] text-stone-500 font-medium leading-tight">
                  {userRole === 'admin' ? 'واحد بازرگانی' : userRole === 'warehouse' ? 'انبارداری' : 'مشتری'}
                </span>
              </div>
            </div>

            {/* Action Tools (Refresh & Logout) */}
            <div className="flex items-center gap-1.5">
              {onRefreshData && (
                <button
                  type="button"
                  onClick={onRefreshData}
                  className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 cursor-pointer"
                  title="بروزرسانی"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="p-1.5 text-stone-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 cursor-pointer"
                  title="خروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Custom In-App Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/75 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>خروج از سامانه معاملات</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شده و صفحه سامانه قفل شود؟
              </p>
              <p className="text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                🔒 جهت ورود مجدد به سامانه، باید رمز عبور مدیریت، پرسنل یا شماره طرف‌حساب را وارد فرمایید.
              </p>
            </div>

            <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-200/80 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>بله، خارج شو</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
