import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, TrendingUp, Info } from 'lucide-react';

interface CopperChartViewProps {
  onBack: () => void;
  userRole?: 'admin' | 'staff' | 'client';
}

interface SymbolOption {
  id: string;
  name: string;
  symbol: string;
  description: string;
}

const SYMBOL_OPTIONS: SymbolOption[] = [
  {
    id: 'capitalcom',
    name: 'قرارداد آتی مس (CFD)',
    symbol: 'CAPITALCOM:COPPER',
    description: 'تحت قرارداد آتی COMEX (توصیه شده - بدون تحریم یا لایسنس)',
  },
  {
    id: 'oanda',
    name: 'اسپات جهانی مس (XCU/USD)',
    symbol: 'OANDA:XCUUSD',
    description: 'بر اساس ارزش لحظه‌ای مس بازار فارکس و CFD',
  },
  {
    id: 'forexcom',
    name: 'شاخص مس آمریکا (Forex.com)',
    symbol: 'FOREXCOM:COPPERS',
    description: 'نرخ لحظه‌ای مس آمریکا جهت مقایسه و تحلیل تکنیکال',
  }
];

export const CopperChartView: React.FC<CopperChartViewProps> = ({ onBack, userRole }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedOption, setSelectedOption] = useState<SymbolOption>(SYMBOL_OPTIONS[0]);

  useEffect(() => {
    const scriptId = 'tradingview-widget-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initWidget = () => {
      if (containerRef.current && (window as any).TradingView) {
        // Clear container and append the widget container div
        containerRef.current.innerHTML = '<div id="tv-advanced-chart" style="width:100%;height:100%" />';
        try {
          new (window as any).TradingView.widget({
            autosize: true,
            symbol: selectedOption.symbol,
            interval: "D",
            timezone: "Asia/Tehran",
            theme: "light",
            style: "1",
            locale: "fa",
            enable_publishing: false,
            hide_side_toolbar: false,
            allow_symbol_change: true,
            container_id: "tv-advanced-chart",
            studies: [
              "RSI@tv-basicstudies",
              "MASimple@tv-basicstudies"
            ],
            show_popup_button: true,
            popup_width: "1000",
            popup_height: "650",
            support_host: "https://www.tradingview.com"
          });
        } catch (e) {
          console.error("TradingView widget init error:", e);
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://s3.tradingview.com/tv.js';
      script.type = 'text/javascript';
      script.async = true;
      script.onload = initWidget;
      document.head.appendChild(script);
    } else {
      if ((window as any).TradingView) {
        initWidget();
      } else {
        script.onload = initWidget;
      }
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [selectedOption]);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-[780px] w-full animate-in fade-in duration-200">
      {/* View Header */}
      <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-stone-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900">قیمت جهانی مس</h2>
            <p className="text-xs text-stone-500 font-mono tracking-wide">
              Copper Futures - {selectedOption.symbol} ({selectedOption.name})
            </p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-stone-700 bg-white hover:bg-stone-100 active:bg-stone-200 border border-stone-300 rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به داشبورد</span>
        </button>
      </div>

      {/* Symbol Switcher / Multi-source selector */}
      <div className="bg-stone-100/60 p-3 sm:px-5 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {SYMBOL_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedOption(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedOption.id === opt.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
              }`}
            >
              {opt.name}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-stone-500 font-medium">
          <span className="text-amber-800 font-bold">منبع فعال: </span>
          <span>{selectedOption.description}</span>
        </div>
      </div>

      {/* Widget Container */}
      <div className="flex-1 w-full bg-stone-50 p-2 sm:p-4 min-h-0 relative flex flex-col">
        <div className="flex-1 w-full rounded-xl border border-stone-200 overflow-hidden bg-white shadow-xs relative">
          <div ref={containerRef} className="w-full h-full absolute inset-0">
            <div className="w-full h-full flex items-center justify-center text-stone-500 text-xs">
              <div className="text-center space-y-2">
                <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p>در حال بارگذاری چارت زنده قیمت جهانی مس در TradingView...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Informative notice */}
        <div className="mt-3 p-3 bg-stone-100 border border-stone-200 rounded-xl flex items-start gap-2.5 text-[11px] text-stone-600 leading-relaxed">
          <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
          <div>
            <strong>دلیل تغییر نماد خام COMEX:</strong> بورس شیکاگو (COMEX) نمایش مستقیم و خام نماد <strong>HG1!</strong> را در وب‌سایت‌های ثالث به لایسنس پولی و احراز هویت سنگین منوط کرده است. به همین علت، برای حفظ پایداری و عدم نمایش خطای لایسنس، از نمادهای معادل قرارداد مابه‌التفاوت (CFD) رسمی مانند <strong>{selectedOption.symbol}</strong> استفاده کرده‌ایم که قیمت را بدون هیچ تأخیر یا اشتراکی و به طور رایگان و تعاملی نمایش می‌دهد.
          </div>
        </div>
      </div>
    </div>
  );
};
