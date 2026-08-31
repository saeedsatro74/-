import React from 'react';
import { 
  User, 
  Wallet, 
  Layers, 
  FileText, 
  LogOut, 
  KeyRound, 
  TrendingUp, 
  ShoppingBag, 
  ArrowDownLeft, 
  ArrowUpRight,
  Printer,
  ShieldCheck,
  Calendar,
  Phone,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Person, Transaction, PersonWalletSummary, MarketPrices } from '../types';
import { formatToman, formatWeight, formatNumber } from '../utils/formatters';
import { getPersianFullDate } from '../utils/persianDate';

interface ClientPortalViewProps {
  person: Person;
  summary: PersonWalletSummary;
  transactions: Transaction[];
  marketPrices: MarketPrices;
  onChangePassword: () => void;
  onOpenStatement: () => void;
  onViewReceipt: (tx: Transaction) => void;
  onLogout: () => void;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  person,
  summary,
  transactions,
  marketPrices,
  onChangePassword,
  onOpenStatement,
  onViewReceipt,
  onLogout,
}) => {
  const persianDate = getPersianFullDate();
  const buyRate = marketPrices.buyPrice;
  const sellRate = marketPrices.sellPrice;

  // Filter approved vs pending transactions
  const clientTxList = transactions.filter((t) => t.personId === person.id);
  const approvedTxList = clientTxList.filter((t) => (t.approvalStatus || 'approved') === 'approved');
  const pendingTxList = clientTxList.filter((t) => t.approvalStatus === 'pending');

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col text-stone-900 selection:bg-stone-800 selection:text-white">
      
      {/* Client Top Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black tracking-wider text-base shadow-sm">
              واته
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-stone-900">
                  پورتال مشتریان مس واته
                </h1>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                  حساب کاربری شخصی
                </span>
              </div>
              <p className="text-xs text-stone-500">
                خوش آمدید، <b>{person.name}</b> {person.phone && `(${person.phone})`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onChangePassword}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-colors cursor-pointer"
              title="تغییر رمز عبور ورود"
            >
              <KeyRound className="w-4 h-4 text-stone-600" />
              <span className="hidden sm:inline">تغییر رمز عبور</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              title="خروج از حساب"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1">
        
        {/* Date and Rates Info Bar */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Calendar className="w-4 h-4 text-stone-400" />
            <span>امروز: <b>{persianDate}</b></span>
          </div>

          <div className="flex items-center gap-3 text-xs bg-stone-50 border border-stone-200/80 px-3 py-1.5 rounded-xl">
            <span className="text-stone-500">نرخ روز مس در بازار:</span>
            <span className="text-stone-700">خرید: <b className="font-mono text-stone-900">{formatNumber(buyRate)}</b> تومان</span>
            <span className="text-stone-300">|</span>
            <span className="text-stone-700">فروش: <b className="font-mono text-stone-900">{formatNumber(sellRate)}</b> تومان</span>
          </div>

          <button
            type="button"
            onClick={onOpenStatement}
            className="px-3.5 py-1.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs mr-auto sm:mr-0"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>چاپ صورت‌حساب رسمی و کاردکس</span>
          </button>
        </div>

        {/* Big Asset Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Wealth */}
          <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-2xl p-5 shadow-sm space-y-2 border border-stone-700">
            <div className="flex items-center justify-between text-stone-400 text-xs font-semibold">
              <span>ارزش کل دارایی شما</span>
              <Wallet className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-white">
              {formatNumber(summary.totalAssetValue)}
              <span className="text-xs font-normal text-stone-300 mr-1.5">تومان</span>
            </div>
            <p className="text-[11px] text-stone-400 pt-1 border-t border-stone-700">
              مجموع موجودی ریالی + ارزش روز مس
            </p>
          </div>

          {/* Card 2: Copper Stock */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
              <span>موجودی مس در انبار</span>
              <Layers className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-amber-700">
              {formatNumber(summary.copperStockKg, 2)}
              <span className="text-xs font-bold text-stone-600 mr-1.5">کیلوگرم</span>
            </div>
            <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-100 flex items-center justify-between">
              <span>ارزش روز مس:</span>
              <b className="font-mono text-stone-800">{formatNumber(summary.copperMarketValue)} تومان</b>
            </p>
          </div>

          {/* Card 3: Cash Wallet Balance */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
              <span>مانده کیف پول نقدی (ریالی)</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            </div>
            <div className={`text-2xl font-black font-mono tracking-tight ${
              summary.cashBalance >= 0 ? 'text-stone-900' : 'text-rose-600'
            }`}>
              {formatNumber(summary.cashBalance)}
              <span className="text-xs font-bold text-stone-600 mr-1.5">تومان</span>
            </div>
            <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-100">
              {summary.cashBalance >= 0 ? 'مانده مثبت (بستانکار)' : 'مانده منفی (بدهکار)'}
            </p>
          </div>

          {/* Card 4: Profit & Trade Volume */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
              <span>سود محقق شده معاملات</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-emerald-700">
              {formatNumber(summary.realizedProfit)}
              <span className="text-xs font-bold text-stone-600 mr-1.5">تومان</span>
            </div>
            <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-100 flex items-center justify-between">
              <span>کل مس خریداری شده:</span>
              <b className="font-mono text-stone-800">{formatWeight(summary.totalPurchasedKg)}</b>
            </p>
          </div>

        </div>

        {/* Uncleared Cheque Warning */}
        {summary.hasUnclearedCheques && (
          <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-3 text-xs shadow-xs">
            <Clock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-rose-950">
                اطلاعیه مهم: خرید مس جدید برای حساب شما موقتاً مسدود است
              </div>
              <div className="text-rose-800 mt-1 leading-relaxed">
                حساب شما دارای <b>{summary.pendingChequesCount} فقره چک در انتظار پاس شدن</b> به ارزش <b>{formatToman(summary.pendingChequesTotalAmount)}</b> می‌باشد. طبق قوانین سامانه، تا زمان وصول و تسویه نهایی چک‌ها، امکان ثبت فاکتور خرید جدید مس مقدور نمی‌باشد.
              </div>
            </div>
          </div>
        )}

        {/* Pending Approvals Notice if any */}
        {pendingTxList.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-amber-950">
                شما {pendingTxList.length} معامله در انتظار تأیید نهایی مدیرعامل دارید:
              </div>
              <div className="text-xs text-amber-800 mt-1">
                این معاملات توسط مسئول مس ثبت شده و پس از بررسی و مهر مدیرعامل، در مانده موجودی و کاردکس شما قطعی خواهند شد.
              </div>
            </div>
          </div>
        )}

        {/* Transaction History & Receipts Table */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          
          <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-stone-900"></span>
              <h2 className="font-bold text-sm sm:text-base text-stone-900">
                تاریخچه تراکنش‌ها و رسیدهای رسمی شما
              </h2>
            </div>
            <span className="text-xs font-medium text-stone-500">
              مجموع {clientTxList.length} تراکنش ثبت شده
            </span>
          </div>

          {clientTxList.length === 0 ? (
            <div className="p-12 text-center text-stone-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-stone-300" />
              <p className="text-sm font-medium">هیچ تراکنشی در حساب شما ثبت نشده است.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">ردیف</th>
                    <th className="py-3 px-4">تاریخ</th>
                    <th className="py-3 px-4">نوع تراکنش</th>
                    <th className="py-3 px-4">وزن مس</th>
                    <th className="py-3 px-4">قیمت واحد</th>
                    <th className="py-3 px-4">مبلغ کل (تومان)</th>
                    <th className="py-3 px-4">وضعیت سند</th>
                    <th className="py-3 px-4 text-center">رسید معامله</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {clientTxList.map((tx, idx) => {
                    const isPending = tx.approvalStatus === 'pending';
                    const isBuy = tx.type === 'buy';
                    const isSell = tx.type === 'sell';
                    const isDeposit = tx.type === 'deposit';
                    const isWithdrawal = tx.type === 'withdrawal';

                    return (
                      <tr key={tx.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-3.5 px-4 text-stone-400 font-mono">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-mono font-medium text-stone-700">{tx.date}</td>
                        <td className="py-3.5 px-4 font-bold">
                          {isBuy && (
                            <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <ShoppingBag className="w-3 h-3" />
                              خرید مس
                            </span>
                          )}
                          {isSell && (
                            <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <TrendingUp className="w-3 h-3" />
                              فروش مس
                            </span>
                          )}
                          {isDeposit && (
                            <span className="inline-flex items-center gap-1 text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              <ArrowDownLeft className="w-3 h-3" />
                              واریز وجه
                            </span>
                          )}
                          {isWithdrawal && (
                            <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              <ArrowUpRight className="w-3 h-3" />
                              برداشت وجه
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-stone-800">
                          {tx.weightKg ? `${formatNumber(tx.weightKg, 2)} کیلو` : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-stone-600">
                          {tx.unitPrice ? `${formatNumber(tx.unitPrice)} تومان` : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-stone-900 text-sm">
                          {formatNumber(tx.amount)} تومان
                        </td>
                        <td className="py-3.5 px-4">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-semibold text-[11px]">
                              <Clock className="w-3 h-3" />
                              در انتظار تأیید مدیر
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-semibold text-[11px]">
                              <CheckCircle2 className="w-3 h-3" />
                              قطعی و تأیید شده
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {(isBuy || isSell) ? (
                            <button
                              type="button"
                              onClick={() => onViewReceipt(tx)}
                              className="px-2.5 py-1 text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="مشاهده و چاپ رسید رسمی"
                            >
                              <Printer className="w-3 h-3 text-stone-600" />
                              <span>رسید رسمی</span>
                            </button>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </main>

      {/* Client Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 text-center text-xs text-stone-500">
        سامانه امن مدیریت معاملات مس واته • تمامی اطلاعات شما به صورت کدگذاری شده و اختصاصی محافظت می‌شود.
      </footer>

    </div>
  );
};
