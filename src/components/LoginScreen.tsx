import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict password requirement: milad@68
    if (password.trim() === 'milad@68') {
      localStorage.setItem('waateh_auth_token', 'authenticated_' + Date.now());
      onLoginSuccess();
    } else {
      setError(true);
      setErrorMessage('رمز عبور وارد شده نادرست است. دسترسی به سامانه امکان‌پذیر نمی‌باشد.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 selection:bg-stone-800 selection:text-white">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Card */}
        <div className="bg-stone-900 text-white p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-stone-800 border border-stone-700 text-white mx-auto flex items-center justify-center font-black text-2xl shadow-inner mb-3">
            واته
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">سامانه مدیریت معاملات مس واته</h1>
          <p className="text-xs text-stone-400 mt-1.5">حسابداری اختصاصی، انبار و کاردکس مس (Waateh)</p>
          
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-stone-800/80 rounded-full border border-stone-700 text-[11px] text-stone-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>بخش محرمانه و محافظت‌شده</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2">
              رمز عبور ورود به سامانه
            </label>
            
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="رمز عبور را وارد کنید..."
                autoFocus
                className={`w-full pr-10 pl-10 py-3 text-sm rounded-xl border bg-stone-50 text-stone-900 focus:outline-none focus:bg-white transition-all font-mono ${
                  error 
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' 
                    : 'border-stone-300 focus:border-stone-800 focus:ring-2 focus:ring-stone-200'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-stone-400 hover:text-stone-700 cursor-pointer"
                title={showPassword ? 'مخفی کردن' : 'نمایش رمز'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-stone-900 hover:bg-stone-800 active:bg-black text-white font-bold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <span>ورود امن به سامانه</span>
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <p className="text-[11px] text-stone-400">
              دسترسی به اطلاعات صرفاً برای مدیریت مجاز امکان‌پذیر است.
            </p>
          </div>
        </form>

      </div>
    </div>
  );
};
