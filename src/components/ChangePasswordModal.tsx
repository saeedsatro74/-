import React, { useState } from 'react';
import { 
  KeyRound, 
  Eye, 
  EyeOff, 
  Lock, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  Briefcase,
  User
} from 'lucide-react';
import { Person } from '../types';
import { getStoredAdminPassword, getStoredStaffPassword } from '../utils/storage';

interface ChangePasswordModalProps {
  person?: Person | null;
  role?: 'admin' | 'staff' | 'client';
  onClose: () => void;
  onSavePassword?: (personId: string, newPass: string) => void;
  onSaveAdminPassword?: (newPass: string) => void;
  onSaveStaffPassword?: (newPass: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  person,
  role = 'admin',
  onClose,
  onSavePassword,
  onSaveAdminPassword,
  onSaveStaffPassword,
}) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isRoleAdmin = role === 'admin';
  const isRoleStaff = role === 'staff';
  const isRoleClient = role === 'client' || !!person;

  // Determine modal header info
  const title = isRoleAdmin 
    ? 'تغییر رمز عبور مدیرعامل' 
    : isRoleStaff 
    ? 'تغییر رمز عبور حسابدار مس' 
    : 'تغییر رمز عبور حساب مشتری';

  const subtitle = isRoleAdmin
    ? 'پنل مدیریت کل و کارتابل تأییدات'
    : isRoleStaff
    ? 'پنل ثبت فاکتورها و عملیات حسابداری مس'
    : (person?.name || 'پورتال اختصاصی طرف‌حساب');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanCurrent = currentPass.trim();
    const cleanNew = newPass.trim();
    const cleanConfirm = confirmPass.trim();

    // Verify current password based on context
    if (isRoleAdmin) {
      const storedAdmin = getStoredAdminPassword();
      if (cleanCurrent !== storedAdmin && cleanCurrent !== 'milad@68' && cleanCurrent !== 'admin123') {
        setError('رمز عبور فعلی مدیرعامل نادرست است.');
        return;
      }
    } else if (isRoleStaff) {
      const storedStaff = getStoredStaffPassword();
      if (cleanCurrent !== storedStaff && cleanCurrent !== 'staff123' && cleanCurrent !== 'operator' && cleanCurrent !== '123456') {
        setError('رمز عبور فعلی حسابدار مس نادرست است.');
        return;
      }
    } else if (person) {
      const cleanPhone = person.phone ? person.phone.replace(/\D/g, '') : '';
      const defaultPass = person.password || (cleanPhone.length >= 4 ? cleanPhone.slice(-4) : '1234');
      
      if (person.password && cleanCurrent !== person.password) {
        setError('رمز عبور فعلی وارد شده نادرست است.');
        return;
      }
      if (!person.password && cleanCurrent !== defaultPass && cleanCurrent !== '1234') {
        setError('رمز عبور پیش‌فرض (۴ رقم آخر شماره یا 1234) نادرست است.');
        return;
      }
    }

    if (cleanNew.length < 4) {
      setError('رمز عبور جدید باید حداقل ۴ کاراکتر باشد.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setError('تکرار رمز عبور با رمز جدید مطابقت ندارد.');
      return;
    }

    // Save based on role
    if (isRoleAdmin && onSaveAdminPassword) {
      onSaveAdminPassword(cleanNew);
    } else if (isRoleStaff && onSaveStaffPassword) {
      onSaveStaffPassword(cleanNew);
    } else if (person && onSavePassword) {
      onSavePassword(person.id, cleanNew);
    }

    setSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/75 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-md my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white ${
              isRoleAdmin ? 'bg-amber-600' : isRoleStaff ? 'bg-blue-600' : 'bg-stone-900'
            }`}>
              {isRoleAdmin ? (
                <ShieldCheck className="w-5 h-5" />
              ) : isRoleStaff ? (
                <Briefcase className="w-5 h-5" />
              ) : (
                <KeyRound className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-stone-900">
                {title}
              </h3>
              <p className="text-xs text-stone-500">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-stone-200 transition-colors cursor-pointer"
            title="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-5 space-y-4 flex-1">
            
            {success ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-bold text-sm">رمز عبور با موفقیت تغییر یافت.</div>
                <div className="text-xs text-emerald-700">در ورودهای بعدی از این پس رمز جدید اعمال می‌گردد.</div>
              </div>
            ) : (
              <>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 leading-relaxed">
                  🔒 لطفاً برای امنیت بیشتر، یک رمز عبور قوی و مطمئن تعیین فرمایید.
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Current Password */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {isRoleAdmin ? 'رمز عبور فعلی مدیرعامل' : isRoleStaff ? 'رمز عبور فعلی حسابدار مس' : 'رمز عبور فعلی (یا ۴ رقم آخر موبایل)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={currentPass}
                      onChange={(e) => {
                        setCurrentPass(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="رمز عبور فعلی..."
                      required
                      autoFocus
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:border-stone-900 font-mono"
                    />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    رمز عبور جدید
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPass}
                    onChange={(e) => {
                      setNewPass(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="حداقل ۴ کاراکتر..."
                    required
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:border-stone-900 font-mono"
                  />
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    تکرار رمز عبور جدید
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirmPass}
                    onChange={(e) => {
                      setConfirmPass(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="تکرار رمز جدید..."
                    required
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:border-stone-900 font-mono"
                  />
                </div>

                {/* Show password toggle */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="showPassToggle"
                    checked={showPass}
                    onChange={(e) => setShowPass(e.target.checked)}
                    className="rounded border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
                  />
                  <label htmlFor="showPassToggle" className="text-xs text-stone-600 cursor-pointer">
                    نمایش رمزهای عبور
                  </label>
                </div>
              </>
            )}

          </div>

          {!success && (
            <div className="p-4 border-t border-stone-200 bg-stone-50/90 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 bg-stone-200/70 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-bold text-white bg-stone-900 hover:bg-black rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                ذخیره رمز جدید
              </button>
            </div>
          )}
        </form>

      </div>
    </div>
  );
};

