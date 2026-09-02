import React, { useState } from 'react';
import { 
  ShoppingBag, 
  TrendingUp, 
  Calculator,
  UserPlus, 
  Calendar,
  Layers,
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
  Sparkles
} from 'lucide-react';
import { getPersianFullDate } from '../utils/persianDate';
import { formatNumber, formatWeight } from '../utils/formatters';

interface HeaderProps {
  onAddPerson: () => void;
  onAddDeposit: () => void;
  onAddWithdrawal: () => void;
  onAddPurchase: () => void;
  onAddSale: () => void;
  onOpenMarketPrice: () => void;
  onOpenCopperChart: () => void;
  onOpenAiAnalysis?: () => void;
  activeView?: 'dashboard' | 'copper-chart' | 'ai-analysis';
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
  userRole?: 'admin' | 'staff' | 'client';
  currentUsername?: string;
  onOpenEditCompanyStock?: () => void;
  isPersonSelected?: boolean;
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
}) => {
  const persianDate = getPersianFullDate();
  const buyRate = marketBuyPrice || marketPrice;
  const sellRate = marketSellPrice || Math.max(0, buyRate - 150000);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <header className="bg-white border-b border-stone-200 lg:sticky lg:top-0 z-30 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 gap-3">
          
          {/* Logo and App Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center font-black tracking-wider text-base shadow-sm">
                واته
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                    پلتفرم مس واته
                  </h1>
                  
                  {/* Role Badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    userRole === 'admin'
                      ? 'bg-stone-100 text-stone-900 border-stone-200'
                      : 'bg-stone-100 text-stone-700 border-stone-200'
                  }`}>
                    {userRole === 'admin' ? 'مدیرعامل' : 'مشتری'}
                  </span>                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span>{persianDate}</span>
                  <span className="text-stone-300">•</span>
                  <span>انبار شرکت: {userRole === 'admin' ? (
                    <button
                      type="button"
                      onClick={onOpenEditCompanyStock}
                      className="font-bold text-stone-800 hover:text-stone-900 hover:underline cursor-pointer focus:outline-hidden"
                      title="کلیک کنید جهت ویرایش یا شارژ موجودی انبار شرکت"
                    >
                      {formatWeight(companyCopperStockKg)}
                    </button>
                  ) : (
                    <b className="font-bold text-stone-800">{formatWeight(companyCopperStockKg)}</b>
                  )}</span>
                  <span className="text-stone-300">•</span>
                  <span>مس کل مشتریان: <b className="font-semibold text-stone-800">{formatWeight(totalStockKg)}</b></span>
                </div>
              </div>
            </div>

            {/* Mobile Data & Approvals Buttons */}
            {!isPersonSelected && (
              <div className="lg:hidden flex items-center gap-1.5">
                {onChangePassword && (
                  <button
                    type="button"
                    onClick={onChangePassword}
                    className="p-1.5 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-200 cursor-pointer"
                    title={userRole === 'admin' ? 'تغییر رمز مدیرعامل' : 'تغییر رمز عبور'}
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                )}
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => setShowLogoutModal(true)}
                    className="p-1.5 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-200 cursor-pointer"
                    title="خروج و قفل سامانه"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
                {userRole === 'admin' && onOpenApprovalsModal && (
                  <button
                    type="button"
                    onClick={onOpenApprovalsModal}
                    className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-1 cursor-pointer ${
                      pendingApprovalsCount > 0
                        ? 'bg-stone-900 text-white border-stone-900 animate-pulse'
                        : 'bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                    title="کارتابل تأییدات مدیرعامل"
                  >
                    <ShieldCheck className="w-4 h-4 text-stone-500" />
                    {pendingApprovalsCount > 0 && (
                      <span className="bg-stone-900 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                        {pendingApprovalsCount}
                      </span>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenCopperChart}
                  className={`p-1.5 border rounded-lg cursor-pointer flex items-center justify-center ${
                    activeView === 'copper-chart'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                      : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                  }`}
                  title="مشاهده چارت زنده قیمت جهانی مس"
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
                {onOpenAiAnalysis && (
                  <button
                    type="button"
                    onClick={onOpenAiAnalysis}
                    className={`p-1.5 border rounded-lg cursor-pointer flex items-center justify-center ${
                      activeView === 'ai-analysis'
                        ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                        : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                    }`}
                    title="مشاهده تحلیل هوشمند جمنای"
                  >
                    <Sparkles className="w-4 h-4 text-stone-500" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenMarketPrice}
                  className="px-2.5 py-1.5 text-stone-800 bg-stone-100 border border-stone-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="تنظیم نرخ مس"
                >
                  <Tag className="w-3.5 h-3.5 text-stone-600" />
                  <span>نرخ</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Action Toolbar */}
          {!isPersonSelected && (
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Global Copper Chart Button */}
              <button
                id="btn-copper-chart-header"
                type="button"
                onClick={onOpenCopperChart}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-lg border transition-all cursor-pointer shadow-xs ${
                  activeView === 'copper-chart'
                    ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                    : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
                }`}
                title="مشاهده چارت زنده قیمت جهانی مس در TradingView"
              >
                <TrendingUp className="w-4 h-4" />
                <span>چارت جهانی مس</span>
              </button>

              {/* AI Smart Analysis Button */}
              {onOpenAiAnalysis && (
                <button
                  id="btn-ai-analysis-header"
                  type="button"
                  onClick={onOpenAiAnalysis}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-lg border transition-all cursor-pointer shadow-xs ${
                    activeView === 'ai-analysis'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                      : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
                  }`}
                  title="مشاهده تحلیل هوشمند بازار مس با هوش مصنوعی جمنای"
                >
                  <Sparkles className="w-4 h-4 text-stone-500" />
                  <span>تحلیل هوشمند جمنای</span>
                </button>
              )}


              {/* CEO Approvals Portal Button - ONLY visible to CEO (admin) */}
              {userRole === 'admin' && onOpenApprovalsModal && (
                <button
                  id="btn-approvals-header"
                  type="button"
                  onClick={onOpenApprovalsModal}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-lg border transition-all cursor-pointer shadow-xs ${
                    pendingApprovalsCount > 0
                      ? 'bg-stone-900 text-white border-stone-900 ring-2 ring-stone-400/40 animate-pulse'
                      : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
                  }`}
                  title="کارتابل تأییدات و بررسی معاملات مس توسط مدیرعامل"
                >
                  <ShieldCheck className="w-4 h-4 text-stone-600" />
                  <span>تأییدات مدیرعامل</span>
                  {pendingApprovalsCount > 0 && (
                    <span className="bg-stone-900 text-white text-xs px-2 py-0.5 rounded-full font-mono font-black mr-0.5">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </button>
              )}

              {/* CEO Bank Credentials Edit Button */}
              {userRole === 'admin' && onOpenBankModal && (
                <button
                  type="button"
                  onClick={onOpenBankModal}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg transition-colors cursor-pointer"
                  title="ویرایش شماره شبا و شماره کارت شرکت توسط مدیرعامل"
                >
                  <CreditCard className="w-4 h-4 text-stone-500" />
                  <span>حساب بانکی شرکت</span>
                </button>
              )}

              {/* Factory Reset Button - ONLY for CEO / Admin */}
              {userRole === 'admin' && onOpenFactoryReset && (
                <button
                  id="btn-factory-reset-header"
                  type="button"
                  onClick={onOpenFactoryReset}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-stone-500 hover:text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg transition-colors cursor-pointer"
                  title="حذف کلی، صفر کردن حساب‌ها و بازنشانی به حالت کارخانه (ویژه مدیرعامل)"
                >
                  <Trash2 className="w-4 h-4 text-stone-400" />
                  <span>حذف کارخانه</span>
                </button>
              )}
              {onOpenChequesModal && (
                <button
                  id="btn-cheques-header"
                  type="button"
                  onClick={onOpenChequesModal}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg border transition-colors cursor-pointer ${
                    pendingChequesCount > 0
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
                  }`}
                  title="مدیریت چک‌های صیادی و وضعیت پاس شدن"
                >
                  <CreditCard className="w-4 h-4 text-stone-500" />
                  <span>چک‌ها</span>
                  {pendingChequesCount > 0 && (
                    <span className="bg-stone-900 text-white text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {pendingChequesCount}
                    </span>
                  )}
                </button>
              )}

              {/* Market Price Widget */}
              <div 
                onClick={onOpenMarketPrice}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg cursor-pointer transition-colors"
                title="برای تغییر قیمت‌های مرجع خرید و فروش کلیک کنید"
              >
                <Tag className="w-3.5 h-3.5 text-stone-400" />
                <div className="text-xs flex items-center gap-1.5">
                  <span className="text-stone-500">خرید:</span>
                  <span className="font-bold text-stone-900 font-mono">{formatNumber(buyRate)}</span>
                  <span className="text-stone-300">|</span>
                  <span className="text-stone-500">فروش:</span>
                  <span className="font-bold text-stone-900 font-mono">{formatNumber(sellRate)}</span>
                  <span className="text-[11px] text-stone-400 mr-0.5">تومان</span>
                </div>
                <Edit2 className="w-3 h-3 text-stone-400 mr-0.5" />
              </div>

              {/* Add Person Button */}
              <button
                id="btn-add-person-header"
                type="button"
                onClick={onAddPerson}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                title="افزودن طرف حساب جدید"
              >
                <UserPlus className="w-4 h-4" />
                <span>شخص جدید</span>
              </button>

              {/* Change Password Button */}
              {onChangePassword && (
                <button
                  id="btn-change-password"
                  type="button"
                  onClick={onChangePassword}
                  className="hidden lg:flex p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors cursor-pointer"
                  title={userRole === 'admin' ? 'تغییر رمز عبور مدیرعامل' : 'تغییر رمز عبور'}
                >
                  <KeyRound className="w-4 h-4" />
                </button>
              )}

              {/* Logout / Lock Button */}
              {onLogout && (
                <button
                  id="btn-logout"
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="p-2 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-stone-200 transition-colors cursor-pointer"
                  title="قفل و خروج از سامانه"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}

            </div>
          )}
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
