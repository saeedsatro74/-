import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  ShieldAlert, 
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

interface FactoryResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => Promise<void>;
  userRole?: 'admin' | 'staff' | 'client';
}

export const FactoryResetModal: React.FC<FactoryResetModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
  userRole = 'admin',
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Strict role check: Only admin can reset factory
  if (userRole !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/75 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-md p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-stone-900">دسترسی غیرمجاز</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            قابلیت «حذف کارخانه و صفر کردن داده‌ها» تنها اختصاص به حساب کاربری مدیرعامل دارد.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-stone-900 text-white font-semibold rounded-xl text-xs hover:bg-stone-800 transition-colors cursor-pointer"
          >
            متوجه شدم
          </button>
        </div>
      </div>
    );
  }

  const REQUIRED_WORD = 'حذف کارخانه';
  const isConfirmed = confirmText.trim() === REQUIRED_WORD;

  const handleExecuteReset = async () => {
    if (!isConfirmed) return;
    setIsDeleting(true);
    setErrorMsg('');
    try {
      await onConfirmReset();
      setConfirmText('');
      onClose();
    } catch (err) {
      console.error('Error during factory reset:', err);
      setErrorMsg('خطا در پاکسازی کامل اطلاعات دیتابیس. لطفا مجددا تلاش کنید.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header - Danger Styled */}
        <div className="p-4 sm:p-5 bg-rose-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight">بازنشانی به تنظیمات کارخانه (حذف کلی)</h3>
              <p className="text-xs text-rose-100 mt-0.5">صفر کردن کامل دیتابیس و حذف تمامی اطلاعات</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-rose-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Warning Box */}
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-rose-900 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-bold text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>هشدار بسیار مهم: این عملیات غیرقابل بازگشت است!</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-rose-800 pr-1 leading-relaxed">
              <li>تمامی <b>اشخاص و طرف‌های حساب</b> کلا حذف می‌شوند.</li>
              <li>تمامی <b>تراکنش‌های مالی، خرید، فروش، واریز و برداشت</b> کلا پاک می‌گردند.</li>
              <li>تمامی <b>مانده حساب‌های ریالی و کیف‌های مس مشتریان</b> صفر مطلق می‌شوند.</li>
              <li>داده‌ها هم از حافظه محلی و هم از <b>دیتابیس ابری (Supabase)</b> کاملاً حذف خواهند شد.</li>
            </ul>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-100 border border-rose-300 text-rose-900 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Type to Confirm */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-stone-800">
              جهت تأیید نهایی، عبارت <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-black">حذف کارخانه</span> را در کادر زیر تایپ فرمایید:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="عبارت 'حذف کارخانه' را وارد کنید..."
              disabled={isDeleting}
              className="w-full px-4 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all text-center font-bold text-rose-900 placeholder:font-normal placeholder:text-stone-400"
            />
          </div>

        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl transition-colors cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleExecuteReset}
            disabled={!isConfirmed || isDeleting}
            className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
              isConfirmed && !isDeleting
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 ring-2 ring-rose-500/30'
                : 'bg-stone-300 text-stone-500 cursor-not-allowed border border-stone-300'
            }`}
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>در حال پاکسازی کامل اطلاعات...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>تأیید و حذف کامل کارخانه (صفر کردن داده‌ها)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
