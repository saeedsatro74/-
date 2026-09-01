import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowLeft, Send, Check, AlertCircle, FileText, TrendingUp, Cpu, RefreshCw, MessageSquare, ExternalLink } from 'lucide-react';
import Markdown from 'react-markdown';
import { OverallStats } from '../types';
import { formatToman } from '../utils/formatters';

interface AiAnalysisViewProps {
  onBack: () => void;
  overallStats: Partial<OverallStats>;
  peopleCount: number;
  activeStockPeople: number;
  companyStock: number;
  livePrices: any;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; url: string }[];
}

export const AiAnalysisView: React.FC<AiAnalysisViewProps> = ({
  onBack,
  overallStats,
  peopleCount,
  activeStockPeople,
  companyStock,
  livePrices,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [localLivePrices, setLocalLivePrices] = useState<any>(livePrices);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested prompt templates for quick user interactions
  const quickPrompts = [
    { label: 'قیمت لوله مسی ۳/۸', query: 'قیمت لوله مسی ۳/۸ امروز در بازار حدوداً چقدر است؟' },
    { label: 'تحلیل مس لندن و دلار', query: 'یک تحلیل خلاصه از مس لندن (LME) و تراز دلار آزاد امروز بده.' },
    { label: 'تراز انبار فیزیکی', query: 'وضعیت موجودی فیزیکی انبار شرکت را تحلیل کن.' },
  ];

  const fetchLivePricesIfNeeded = async () => {
    let currentPrices = localLivePrices || livePrices;
    if (!currentPrices) {
      try {
        const res = await fetch('/api/prices/live');
        if (res.ok) {
          const data = await res.json();
          setLocalLivePrices(data);
          return data;
        }
      } catch (e) {
        console.error('Failed to fetch live prices inside analysis view', e);
      }
    }
    return currentPrices;
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputValue;
    if (!textToSend.trim() || isLoading) return;

    // Reset error state
    setError(null);
    
    // Add user message to screen
    const userMessage: Message = { role: 'user', content: textToSend };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    if (!customText) setInputValue('');
    setIsLoading(true);

    try {
      const currentPrices = await fetchLivePricesIfNeeded();
      
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          overallStats,
          peopleCount,
          activeStockPeople,
          companyStock,
          livePrices: currentPrices,
        }),
      });

      if (!response.ok) {
        let serverErrorMsg = '';
        try {
          const errData = await response.json();
          serverErrorMsg = errData?.error || errData?.message || '';
        } catch (_) {}
        throw new Error(serverErrorMsg || 'سیستم هوش مصنوعی موقتاً پاسخ نداد. لطفاً لحظاتی دیگر تلاش کنید.');
      }

      const data = await response.json();
      if (data.analysis) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.analysis, sources: data.sources || [] }
        ]);
      } else {
        throw new Error('پاسخ نامعتبر از سرور هوش مصنوعی دریافت شد.');
      }
    } catch (err: any) {
      console.error('AI Chat Error:', err);
      setError(err?.message || 'برقراری ارتباط با جمنای با خطا مواجه شد.');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger initial greeting/summary automatically on mount
  useEffect(() => {
    const initChat = async () => {
      setIsLoading(true);
      try {
        const currentPrices = await fetchLivePricesIfNeeded();
        const response = await fetch('/api/gemini/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [], // Empty starts default analysis
            overallStats,
            peopleCount,
            activeStockPeople,
            companyStock,
            livePrices: currentPrices,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.analysis) {
            setMessages([
              { 
                role: 'assistant', 
                content: data.analysis, 
                sources: data.sources || [] 
              }
            ]);
          }
        } else {
          throw new Error('عدم موفقیت در دریافت تحلیل اولیه');
        }
      } catch (e) {
        // Fallback message so UI never looks empty or broken
        setMessages([
          {
            role: 'assistant',
            content: 'سلام! من دستیار هوشمند و ارشد تحلیل بازار و ترازنامه‌های "واته" هستم.\n\nمن آماده پاسخگویی به سوالات شما درباره روند نوسانات مس جهانی (LME)، قیمت محصولات از جمله **لوله مسی ۳/۸**، تحلیل تراز ریالی و وضعیت موجودی کاتد شرکت هستم. همچنین هر زمان تراز یا قیمتی نیاز به تغییر داشت، کافی است در همینجا با من چت کنید و اصلاح کنید!\n\nلطفاً سوال خود را بپرسید یا از دکمه‌های راهنمای زیر استفاده کنید.'
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    initChat();
  }, []);

  // Auto-scroll to bottom of messages container
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="space-y-6 flex flex-col min-h-[600px]" id="ai-analysis-root" dir="rtl">
      
      {/* Header and Back Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-stone-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500/15 p-1.5 rounded-lg border border-amber-500/30">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <h2 className="text-lg font-black tracking-tight text-stone-100">تحلیل و گفتگوی هوشمند با جمنای (Gemini Chat)</h2>
          </div>
          <p className="text-xs text-stone-300">
            بررسی نوسان مس جهانی، قیمت لوله مسی و محصولات فیزیکی با قابلیت پرسش و پاسخ تعاملی و اصلاح دستی داده‌ها
          </p>
        </div>
        
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setIsLoading(true);
              handleSendMessage('یک تحلیل جدید و خلاصه از آخرین وضعیت قیمت‌ها بده.');
            }}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-xl border border-stone-700 transition-all cursor-pointer disabled:opacity-50"
            title="شروع مجدد گفتگو"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>شروع مجدد تحلیل</span>
          </button>
          
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>بازگشت</span>
          </button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col flex-grow overflow-hidden min-h-[500px]">
        
        {/* Top Chat Status Indicator */}
        <div className="bg-stone-50 border-b border-stone-200 px-4 py-3 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-stone-600">
              دستیار هوشمند فعال (مجهز به جستجوی زنده وب بورس فلزات لندن)
            </span>
          </div>
          <span className="text-[10px] bg-stone-200/75 text-stone-700 px-2.5 py-0.5 rounded-full font-mono font-bold">RTL Chat Mode</span>
        </div>

        {/* Message History area */}
        <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-4 max-h-[500px] min-h-[350px] bg-stone-50/50">
          
          {messages.length === 0 && isLoading && (
            <div className="py-24 flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-12 h-12 rounded-full border-4 border-amber-500/20 animate-ping"></div>
                <div className="w-10 h-10 rounded-full border-4 border-amber-600 border-t-transparent animate-spin"></div>
                <Sparkles className="w-4 h-4 text-amber-500 absolute" />
              </div>
              <div className="space-y-1 mt-2 max-w-sm">
                <h4 className="text-xs font-bold text-stone-800 animate-pulse">جمنای در حال تحلیل و راه‌اندازی میز کار است...</h4>
                <p className="text-[10px] text-stone-400 leading-relaxed">
                  بررسی نوسان مس جهانی، استخراج مستندات و محاسبه نسبت‌های تراز مالی
                </p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div 
              key={index}
              className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
            >
              {/* Avatar Indicator */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                message.role === 'user' 
                  ? 'bg-stone-800 text-white border-stone-900' 
                  : 'bg-amber-100 text-amber-700 border-amber-200'
              }`}>
                {message.role === 'user' ? (
                  <MessageSquare className="w-3.5 h-3.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
              </div>

              {/* Message Bubble */}
              <div className="space-y-2">
                <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-stone-800 text-stone-100 rounded-tr-none shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-800 rounded-tl-none shadow-xs'
                }`}>
                  <div className="markdown-body space-y-2 prose max-w-none text-justify">
                    <Markdown>{message.content}</Markdown>
                  </div>
                </div>

                {/* Grounding Sources Links (If exists for Assistant) */}
                {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                  <div className="bg-stone-100/80 border border-stone-200/60 rounded-xl p-3 space-y-1.5 max-w-lg shadow-2xs">
                    <span className="block text-[10px] font-bold text-stone-500">🔗 منابع و سایت‌های مرجع مورد استفاده در این تحلیل:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {message.sources.map((src, sIdx) => (
                        <a 
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-lg px-2 py-1 text-[9px] font-medium text-stone-600 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-2.5 h-2.5 text-stone-400" />
                          <span className="max-w-[140px] truncate">{src.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && messages.length > 0 && (
            <div className="flex gap-3 max-w-[80%] ml-auto items-center">
              <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              </div>
              <div className="bg-white border border-stone-200 px-4 py-3 rounded-2xl rounded-tl-none text-xs text-stone-500 animate-pulse flex items-center gap-2">
                <span>جمنای در حال پاسخگویی است...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 max-w-[80%] mx-auto">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="block text-xs font-bold text-red-800">خطا در پردازش پیام</span>
                <p className="text-[11px] text-red-600 leading-relaxed">{error}</p>
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="mt-2 text-[10px] font-black text-red-800 hover:underline cursor-pointer"
                >
                  تلاش مجدد ارسال پیام
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Suggetion Buttons (Quick templates) */}
        <div className="p-3 border-t border-stone-200/70 bg-stone-50/50 flex flex-wrap gap-2 items-center justify-start">
          <span className="text-[10px] font-bold text-stone-400">سوالات پیشنهادی:</span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendMessage(qp.query)}
              className="inline-flex items-center bg-white hover:bg-stone-100 border border-stone-200 rounded-full px-3 py-1 text-[11px] text-stone-700 font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Input Text Form area */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-4 border-t border-stone-200 bg-white flex gap-2 items-center"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            placeholder={isLoading ? 'لطفا تا دریافت پاسخ منتظر بمانید...' : 'سوال خود را بپرسید یا تصحیح کنید... (مثلاً: قیمت لوله مسی ۳/۸ امروز چنده؟ یا قیمت دلار را ۶۸,۰۰۰ تومن حساب کن)'}
            className="flex-grow bg-stone-100 text-xs sm:text-sm text-stone-800 rounded-xl px-4 py-3 border border-stone-200 focus:outline-none focus:border-amber-500 focus:bg-white transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="inline-flex items-center justify-center p-3 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            title="ارسال پیام"
          >
            <Send className="w-4 h-4 transform rotate-180" />
          </button>
        </form>

      </div>

      {/* Statistical Context Meta Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="ai-stats-context-cards">
        <div className="bg-stone-50 rounded-xl border border-stone-200 p-3.5 flex items-center gap-3">
          <div className="bg-stone-100 p-2 rounded-lg text-stone-700 border border-stone-200/50">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[10px] text-stone-400 font-bold">بستر هوش مصنوعی:</span>
            <span className="text-xs font-bold text-stone-800">Gemini Active Engine</span>
          </div>
        </div>

        <div className="bg-stone-50 rounded-xl border border-stone-200 p-3.5 flex items-center gap-3">
          <div className="bg-amber-50 p-2 rounded-lg text-amber-700 border border-amber-200/50">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[10px] text-stone-400 font-bold">ارزش کل دارایی‌ها:</span>
            <span className="text-xs font-black text-stone-800 font-mono">
              {formatToman(overallStats?.totalAssetValue || 0)} <span className="text-[9px] font-normal text-stone-500">تومان</span>
            </span>
          </div>
        </div>

        <div className="bg-stone-50 rounded-xl border border-stone-200 p-3.5 flex items-center gap-3">
          <div className="bg-emerald-50 p-2 rounded-lg text-emerald-700 border border-emerald-200/50">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[10px] text-stone-400 font-bold">آخرین نرخ کاتد بورس کالا:</span>
            <span className="text-xs font-black text-stone-800 font-mono">
              {formatToman(localLivePrices?.cathodeRefined || livePrices?.cathodeRefined || 2159850)} <span className="text-[9px] font-normal text-stone-500">تومان/کیلو</span>
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
