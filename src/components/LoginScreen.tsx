import React, { useState } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowLeft, 
  AlertCircle, 
  User, 
  Briefcase, 
  Phone,
  KeyRound,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { Person, AuthSession, UserRole } from '../types';
import { getStoredPeople, getStoredAdminPassword, getStoredStaffPassword, getClientPassword } from '../utils/storage';

interface LoginScreenProps {
  people?: Person[];
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ people = [], onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'management' | 'client'>('client');

  // Management Form State
  const [mgmtRole, setMgmtRole] = useState<'admin' | 'staff'>('admin');
  const [mgmtPassword, setMgmtPassword] = useState('');
  const [showMgmtPassword, setShowMgmtPassword] = useState(false);
  const [mgmtError, setMgmtError] = useState('');

  // Client Form State
  const [clientPhone, setClientPhone] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [showClientPassword, setShowClientPassword] = useState(false);
  const [clientError, setClientError] = useState('');

  // Handle Management Login
  const handleMgmtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMgmtError('');

    const cleanPass = mgmtPassword.trim();

    if (mgmtRole === 'admin') {
      // CEO / Admin password
      const storedAdminPass = getStoredAdminPassword();
      if (cleanPass === storedAdminPass) {
        const session: AuthSession = {
          role: 'admin',
          username: 'مدیرعامل',
          loginAt: new Date().toISOString(),
        };
        sessionStorage.setItem('waateh_auth_session', JSON.stringify(session));
        sessionStorage.setItem('waateh_auth_token', 'authenticated_' + Date.now());
        localStorage.removeItem('waateh_auth_session');
        localStorage.removeItem('waateh_auth_token');
        onLoginSuccess(session);
      } else {
        setMgmtError('رمز عبور مدیرعامل نادرست است.');
      }
    } else {
      // Staff / Accountant password
      const storedStaffPass = getStoredStaffPassword();
      if (cleanPass === storedStaffPass) {
        const session: AuthSession = {
          role: 'staff',
          username: 'حسابدار مس',
          loginAt: new Date().toISOString(),
        };
        sessionStorage.setItem('waateh_auth_session', JSON.stringify(session));
        sessionStorage.setItem('waateh_auth_token', 'authenticated_' + Date.now());
        localStorage.removeItem('waateh_auth_session');
        localStorage.removeItem('waateh_auth_token');
        onLoginSuccess(session);
      } else {
        setMgmtError('رمز عبور حسابدار مس نادرست است.');
      }
    }
  };

  // Handle Client Login
  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError('');

    const cleanPhone = clientPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      setClientError('لطفاً شماره موبایل خود را وارد کنید.');
      return;
    }

    // Find person by phone (from prop or localStorage)
    const storedPeople = getStoredPeople();
    const allPeople = (people && people.length > 0) ? people : storedPeople;
    const matchedPerson = allPeople.find((p) => {
      if (!p.phone) return false;
      const pClean = p.phone.replace(/\D/g, '');
      return pClean.endsWith(cleanPhone) || cleanPhone.endsWith(pClean);
    });

    if (!matchedPerson) {
      setClientError('حسابی با این شماره موبایل در سامانه مس واته یافت نشد.');
      return;
    }

    const customPass = matchedPerson.password || getClientPassword(matchedPerson.id);
    const inputPass = clientPassword.trim();

    let isAuthorized = false;
    if (customPass) {
      // Custom password set -> ONLY custom password matches!
      isAuthorized = inputPass === customPass.trim();
    } else {
      // Default password -> 1234 OR last 4 digits of phone
      const pClean = matchedPerson.phone ? matchedPerson.phone.replace(/\D/g, '') : '';
      const last4 = pClean.length >= 4 ? pClean.slice(-4) : null;
      isAuthorized = inputPass === '1234' || (last4 !== null && inputPass === last4);
    }
    
    if (isAuthorized) {
      const session: AuthSession = {
        role: 'client',
        personId: matchedPerson.id,
        username: matchedPerson.name,
        loginAt: new Date().toISOString(),
      };
      sessionStorage.setItem('waateh_auth_session', JSON.stringify(session));
      sessionStorage.setItem('waateh_auth_token', 'authenticated_' + Date.now());
      localStorage.removeItem('waateh_auth_session');
      localStorage.removeItem('waateh_auth_token');
      onLoginSuccess(session);
    } else {
      setClientError('رمز عبور اختصاصی وارد شده نادرست است.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-3 sm:p-4 selection:bg-stone-800 selection:text-white">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Branding Banner */}
        <div className="bg-stone-900 text-white p-6 text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-stone-800 border border-stone-700 text-white mx-auto flex items-center justify-center font-black text-xl shadow-inner mb-2.5">
            واته
          </div>
          <h1 className="text-xl font-bold tracking-tight">سامانه معاملات مس واته</h1>
          <p className="text-xs text-stone-400 mt-1">مدیریت کیف پول، معاملات مس و پورتال مشتریان</p>
        </div>

        {/* Role Switch Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('management')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'management'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>ورود مدیریت</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('client')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'client'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200/50'
            }`}
          >
            <User className="w-4 h-4 text-emerald-600" />
            <span>پورتال مشتریان (طرف حساب)</span>
          </button>
        </div>

        {/* Tab 1: Management / CEO Login */}
        {activeTab === 'management' && (
          <form onSubmit={handleMgmtSubmit} className="p-6 space-y-4">
            
            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                رمز عبور مدیرعامل
              </label>
              
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showMgmtPassword ? 'text' : 'password'}
                  value={mgmtPassword}
                  onChange={(e) => {
                    setMgmtPassword(e.target.value);
                    if (mgmtError) setMgmtError('');
                  }}
                  placeholder="رمز عبور مدیرعامل..."
                  autoFocus
                  className={`w-full pr-10 pl-10 py-3 text-sm rounded-xl border bg-stone-50 text-stone-900 focus:outline-none focus:bg-white transition-all font-mono ${
                    mgmtError 
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' 
                      : 'border-stone-300 focus:border-stone-800 focus:ring-2 focus:ring-stone-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowMgmtPassword(!showMgmtPassword)}
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  {showMgmtPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {mgmtError && (
                <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{mgmtError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 active:bg-black text-white font-bold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <span>ورود به عنوان {mgmtRole === 'admin' ? 'مدیرعامل' : 'حسابدار مس'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Tab 2: Client Portal Login */}
        {activeTab === 'client' && (
          <form onSubmit={handleClientSubmit} className="p-6 space-y-4">
            
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <b>پورتال اختصاصی طرف‌حساب‌ها:</b>
                <div className="text-[11px] text-emerald-800 mt-0.5">
                  فقط موجودی مس، کیف پول ریالی، کاردکس و فاکتورهای حساب شخصی شما نمایش داده می‌شود.
                </div>
              </div>
            </div>

            {/* Client Phone Number */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                شماره موبایل ثبت شده
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  dir="ltr"
                  value={clientPhone}
                  onChange={(e) => {
                    setClientPhone(e.target.value);
                    if (clientError) setClientError('');
                  }}
                  placeholder="0912..."
                  autoFocus
                  className="w-full pr-10 pl-3 py-2.5 text-sm rounded-xl border border-stone-300 bg-stone-50 text-stone-900 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all font-mono"
                />
              </div>
            </div>

            {/* Client Password / PIN */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-stone-700">
                  رمز عبور اختصاصی
                </label>
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showClientPassword ? 'text' : 'password'}
                  value={clientPassword}
                  onChange={(e) => {
                    setClientPassword(e.target.value);
                    if (clientError) setClientError('');
                  }}
                  placeholder="رمز عبور..."
                  className={`w-full pr-10 pl-10 py-2.5 text-sm rounded-xl border bg-stone-50 text-stone-900 focus:outline-none focus:bg-white transition-all font-mono ${
                    clientError 
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' 
                      : 'border-stone-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowClientPassword(!showClientPassword)}
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  {showClientPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {clientError && (
                <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{clientError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <span>ورود به حساب شخصی مشتری</span>
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <p className="text-[11px] text-stone-400">
                در صورت فراموشی رمز یا عدم دسترسی، با مدیریت تماس بگیرید.
              </p>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
