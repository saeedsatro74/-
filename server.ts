import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI SDK server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Cache for live prices
let cachedPrices: any = null;
let lastFetchTime = 0;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes cache to avoid rate limit but keep it fresh

// Realistic fallback prices in clean Tomans using USD = 210,000 Tomans (2,100,000 Rials)
const DEFAULT_PRICES = {
  dollarFree: 210000, // 210,000 Toman per USD
  dollarExchange: 168000, // Nima USD in Toman (approx 80% of free dollar)
  tether: 211000, // Tether USDT in Toman (usually close to free dollar)
  lmeUSD: 9350, // LME copper price in USD per metric ton
  cathodeRefined: 2159850, // Calculated: (9350 * 210000 * 1.1) / 1000 = 2,159,850 Toman/Kg
  cathodeLeaching: 2051850, // Leaching copper (approx 95% of cathode)
  wireRodMilli: 2267840, // Wire rod (approx 105% of cathode)
  depositCertificate: 2159850, // Same as cathode
  scrapRedCable: 1943860, // Toman per Kg (approx 90% of cathode)
  scrapBlackCable: 1900660, // Toman per Kg (approx 88% of cathode)
  scrapTelecom: 1814270, // Toman per Kg (approx 84% of cathode)
  scrapCopperPipe: 1879070, // Toman per Kg (CRITICAL FOR USER, approx 87% of cathode)
  scrapMelting: 1771070, // Toman per Kg (approx 82% of cathode)
  lastUpdated: new Date().toISOString(),
  isLive: false
};

// Search-grounded live price fetcher
async function fetchPricesWithGemini(bypassCache = false) {
  const now = Date.now();
  if (!bypassCache && cachedPrices && (now - lastFetchTime < CACHE_TTL)) {
    return cachedPrices;
  }

  try {
    const prompt = `Search the web for the absolute latest, live, real-time prices (as of today, late 2025/2026 or current date) for:
1. Copper price on London Metal Exchange (LME) or COMEX in USD per metric ton.
2. USD/Toman (IRR) free market exchange rate (Tether USDT in Toman or physical free market USD/Toman) in Iran from reliable sources (like TradingView, bonbast, tgju, etc.).

Make sure that:
- dollarFree is the real free market dollar price in TOMAN (e.g. 210000 or current rate).
- lmeUSD is the copper price per metric ton in USD (e.g. 9300 to 10500).

Return strictly a valid JSON object matching the requested schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dollarFree: { type: Type.NUMBER, description: "USD/Toman real free market exchange rate in Iran (e.g. 210000)" },
            lmeUSD: { type: Type.NUMBER, description: "London Metal Exchange (LME) Copper Price in USD per metric ton (e.g. 9350)" }
          },
          required: [
            "dollarFree", "lmeUSD"
          ]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    const scraped = JSON.parse(text);
    const dollarFree = Math.round(scraped.dollarFree || 210000);
    const lmeUSD = Math.round(scraped.lmeUSD || 9350);

    // Derive all prices mathematically exactly like how Nabze Mes and other industry sites calculate them
    const cathodeRefined = Math.round((lmeUSD * dollarFree * 1.1) / 1000); // Standard bourse formula with 1.1 multiplier
    
    const prices = {
      dollarFree,
      lmeUSD,
      dollarExchange: Math.round(dollarFree * 0.8), // Approx Nima rate
      tether: Math.round(dollarFree * 1.005), // Close to free market dollar
      cathodeRefined,
      cathodeLeaching: Math.round(cathodeRefined * 0.95),
      wireRodMilli: Math.round(cathodeRefined * 1.05),
      depositCertificate: cathodeRefined,
      scrapRedCable: Math.round(cathodeRefined * 0.90),
      scrapBlackCable: Math.round(cathodeRefined * 0.88),
      scrapTelecom: Math.round(cathodeRefined * 0.84),
      scrapCopperPipe: Math.round(cathodeRefined * 0.87), // CRITICAL FOR USER (87% of Cathode)
      scrapMelting: Math.round(cathodeRefined * 0.82),
      lastUpdated: new Date().toISOString(),
      isLive: true
    };

    cachedPrices = prices;
    lastFetchTime = now;
    return prices;
  } catch (err) {
    console.error('Gemini price fetching error (using fallbacks):', err);
    if (cachedPrices) {
      return cachedPrices;
    }
    return {
      ...DEFAULT_PRICES,
      lastUpdated: new Date().toISOString(),
      isLive: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

async function startServer() {
  // API route to get live prices
  app.get('/api/prices/live', async (req, res) => {
    const bypassCache = req.query.bypassCache === 'true';
    const prices = await fetchPricesWithGemini(bypassCache);
    res.json(prices);
  });

  // API route for AI Smart Business Analysis & Interactive Chat
  app.post('/api/gemini/analyze', async (req, res) => {
    try {
      const { messages, overallStats, peopleCount, activeStockPeople, companyStock, livePrices } = req.body;
      
      const systemInstruction = `You are the lead AI Senior Commodity Strategist for "واته" (Waateh Copper Trading Company).
Your goal is to answer questions about the copper market, LME rates, free-market USD/Toman exchange rates, and company ledger data.

CURRENT REAL-TIME CONTEXT:
- Dollar Free Market Rate: ${livePrices?.dollarFree ? livePrices.dollarFree.toLocaleString() : '210,000'} Toman
- LME Copper Price per Ton (USD): ${livePrices?.lmeUSD ? livePrices.lmeUSD.toLocaleString() : '9,350'} USD
- Calculated Cathode Base Price: ${livePrices?.cathodeRefined ? livePrices.cathodeRefined.toLocaleString() : '2,159,850'} Toman/Kg
- Calculated Scrap Copper Pipe: ${livePrices?.scrapCopperPipe ? livePrices.scrapCopperPipe.toLocaleString() : '1,879,070'} Toman/Kg
- Total Cash Balance in Vaults: ${overallStats?.totalCashBalance ? overallStats.totalCashBalance.toLocaleString() : '0'} Toman
- Total Client-Owned Copper Reserves: ${overallStats?.totalCopperStockKg ? overallStats.totalCopperStockKg.toLocaleString() : '0'} Kg
- Company's Own Available Physical Copper Ingot Reserve: ${companyStock !== undefined ? companyStock : '2,000'} Kg

CRITICAL INSTUCTIONS:
1. ALWAYS respond in Persian (FA) with an executive, professional, and HIGHLY CONCISE tone. Avoid unnecessary long introductions or generic corporate essays. Answer directly.
2. If asked about rates, prices of specific items (e.g. 3/8 copper pipe / لوله مسی ۳/۸), or foreign exchange, give exact short answers.
3. If the user tells you a rate or price is wrong (e.g. "نرخ دلار اشتباهه، امروز فلان قدره"), accept their correction gracefully, use their provided value for any calculations, and explain the impact on cathode/scrap rates accordingly.
4. If search grounding is used, you can cite specific links. Keep the analysis straightforward.`;

      // Build contents array for Gemini
      const formattedContents = (messages || []).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // If contents is empty, populate with a default analysis request
      if (formattedContents.length === 0) {
        formattedContents.push({
          role: 'user',
          parts: [{ text: 'سلام. لطفا یک گزارش تحلیل بسیار خلاصه از وضعیت کلی قیمت مس جهانی، نرخ دلار آزاد و وضعیت موجودی کاتد شرکت برای من ارائه بده.' }]
        });
      }

      const modelsToTry = ["gemini-3.7-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.5-pro"];
      let responseText = "";
      let groundingSources: { title: string, url: string }[] = [];

      for (const model of modelsToTry) {
        try {
          console.log(`Attempting Gemini chat with model: ${model}`);
          const response = await ai.models.generateContent({
            model: model,
            contents: formattedContents,
            config: {
              systemInstruction: systemInstruction,
              tools: [{ googleSearch: {} }],
            }
          });
          
          if (response && response.text) {
            responseText = response.text;
            
            // Extract search grounding chunks
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            const seenUrls = new Set<string>();
            for (const chunk of chunks) {
              if (chunk.web && chunk.web.uri) {
                const url = chunk.web.uri;
                if (!seenUrls.has(url)) {
                  seenUrls.add(url);
                  groundingSources.push({
                    title: chunk.web.title || url,
                    url: url
                  });
                }
              }
            }
            console.log(`Chat generation succeeded with model ${model}. Extracted ${groundingSources.length} sources.`);
            break;
          }
        } catch (err: any) {
          console.warn(`Model ${model} with Google Search failed: ${err?.message || err}. Trying without search tool...`);
          try {
            const responseNoTools = await ai.models.generateContent({
              model: model,
              contents: formattedContents,
              config: {
                systemInstruction: systemInstruction
              }
            });
            if (responseNoTools && responseNoTools.text) {
              responseText = responseNoTools.text;
              console.log(`Chat generation succeeded without search tools using ${model}`);
              break;
            }
          } catch (retryErr: any) {
            console.warn(`Model ${model} without tools failed:`, retryErr?.message || retryErr);
          }
        }
      }

      if (responseText) {
        return res.json({ analysis: responseText, sources: groundingSources });
      }

      // Dynamic local fallback ONLY if all Gemini API endpoints completely fail (quota exhaustion)
      console.warn("All Gemini models failed. Generating a highly custom, concise local response.");
      
      const lastUserMessage = messages && messages.length > 0 ? messages[messages.length - 1].content : '';
      let localResponse = `سلام و احترام. در حال حاضر به دلیل محدودیت‌های ترافیکی سرورهای گوگل، نتوانستم به صورت زنده وب‌سایت‌های مرجع را جستجو کنم. 

بر اساس آخرین ترازنامه و نرخ‌های ثبت‌شده سیستم:
- نرخ دلار آزاد: **${(livePrices?.dollarFree || 210000).toLocaleString()} تومان**
- نرخ پایه مس جهانی (LME): **$${(livePrices?.lmeUSD || 9350).toLocaleString()}**
- نرخ پایه کاتد مس: **${(livePrices?.cathodeRefined || 2159850).toLocaleString()} تومان/کیلوگرم**
- قیمت تقریبی لوله مسی ۳/۸: حدود **${(livePrices?.scrapCopperPipe || 1879070).toLocaleString()} تومان** برای هر کیلوگرم برآورد می‌شود.

موجودی شمش مس شرکت **${(companyStock || 2000).toLocaleString()} کیلوگرم** است.
در صورت لزوم، لطفاً نرخ مورد نظر خود را مجدداً تصحیح بفرمایید تا محاسبات را متناسب با آن به‌روزرسانی کنم.`;

      // Simple keywords responses to make it feel smart even in fallback
      if (lastUserMessage.includes('دلار') && (lastUserMessage.includes('تومن') || lastUserMessage.includes('هزار') || lastUserMessage.includes('تومان'))) {
        const matches = lastUserMessage.match(/(\d+[\d,]*)/);
        if (matches) {
          const newDollar = parseInt(matches[0].replace(/,/g, ''));
          const calculatedCathode = Math.round((livePrices?.lmeUSD || 9350) * 1.1 * newDollar / 1000);
          localResponse = `بله متوجه شدم. بر اساس اصلاحیه شما، دلار را **${newDollar.toLocaleString()} تومان** در نظر می‌گیریم. 
با نرخ جهانی مس $${(livePrices?.lmeUSD || 9350).toLocaleString()}، قیمت تخمینی جدید به شرح زیر محاسبه می‌شود:
- قیمت جدید کاتد مبنا: **${calculatedCathode.toLocaleString()} تومان/کیلوگرم**
- قیمت لوله مسی ۳/۸ (تخمینی): **${Math.round(calculatedCathode * 0.87).toLocaleString()} تومان/کیلوگرم**`;
        }
      }

      return res.json({ analysis: localResponse, sources: [] });
    } catch (err) {
      console.error('Gemini analysis error:', err);
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
