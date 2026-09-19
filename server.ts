import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  getPeople, 
  upsertPerson, 
  deletePerson, 
  getTransactions, 
  upsertTransaction, 
  deleteTransaction, 
  getWarehouseItems, 
  upsertWarehouseItem, 
  deleteWarehouseItem, 
  getAppSetting, 
  setAppSetting, 
  getOrCreateUser 
} from './src/db/repository.ts';
import { optionalAuth, requireAuth, AuthRequest } from './src/middleware/auth.ts';

const app = express();
const PORT = 3000;

// Configured allowed domains for Supabase & API connections
const ALLOWED_ORIGINS = [
  'https://ais-dev-piqdbl2n3de2izmd443be4-905748537032.europe-west2.run.app',
  'https://ais-pre-piqdbl2n3de2izmd443be4-905748537032.europe-west2.run.app',
];

// CORS Middleware to allow requests from both domains and localhost
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.run.app') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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

    const modelsToTry = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let scraped: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: model,
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
        if (text) {
          scraped = JSON.parse(text);
          break;
        }
      } catch (err: any) {
        console.warn(`Price fetch with ${model} failed:`, err?.message || err);
      }
    }

    if (!scraped) {
      throw new Error("Could not fetch live prices from Gemini");
    }
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

      const modelsToTry = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];
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

  // API route for Multimodal AI Copper Coil & Pallet Label OCR & Smart Parsing
  app.post('/api/parse-copper-label', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg' } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 is required' });
      }

      // Clean base64 prefix if present (e.g. data:image/png;base64,)
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

      const prompt = `You are an expert industrial copper quality control and warehouse logistics OCR system.
Analyze this photo of an industrial copper label, packaging tag, factory bill, or warehouse pallet receipt.

This copper cargo can be in ANY of the following 3 formats:
1. SPOOL / قرقره مس (LWC / Level Wound Coil on wooden or metal spools or pallets with individual roll weights)
2. STRAIGHT PIPE / شاخه مس (Straight copper tubes/pipes, 6-meter or 3-meter or custom cut, bundled or single)
3. COIL / کلاف مس (Pancake coils, 15-meter or 50-meter rolls, or continuous coils)

CRITICAL EXTRACTION INSTRUCTIONS:
1. Identify Packaging Format (productCategory):
   - "spool" if it is a spool, LWC coil, pallet of rolls, etc.
   - "straight" if it is straight copper pipes/tubes (شاخه / Straight).
   - "coil" if it is pancake coil, 15m coil, 50m coil (کلاف / Pancake).

2. Company / Brand Name:
   - Identify exact manufacturer or brand (e.g. "باهنر" / "Shahid Bahonar", "استریا" / "ASTERIA COPPER", "کاوه" / "Kaveh", "بابک" / "Babak", "قائم" / "Ghaem", "مهر اصل" / "Mehr Asl", "صانع" / "Sane", etc.).

3. Dimensions (Outer Diameter & Wall Thickness):
   - Fractional inch size: "1/4", "5/16", "3/8", "1/2", "5/8", "3/4", "7/8", "1", "1-1/8", "1-3/8", "1-5/8", "2-1/8", etc.
   - Metric diameter in mm: e.g. 6.35, 9.52, 12.70, 15.87, 19.05, 22.22, 28.58, etc.
   - Wall thickness in mm (ضخامت گوشت): e.g. 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 1.00, 1.10, 1.20, etc.

4. Length / Specific packaging type:
   - For coil: 15m or 50m or length in meters.
   - For straight: 6m or 3m or length in meters.
   - For spool: whether it's a pallet or individual spools.

5. Quantity & Weights (اوزان و تعداد):
   - If there is a table of individual roll weights (جدول اوزان رول‌ها/قرقره‌ها), extract each roll net weight (N.W) and gross weight (G.W).
   - Total Net Weight in KG (وزن خالص کل).
   - Total Gross Weight in KG (وزن ناخالص کل).
   - Average or unit weight per piece/roll in KG.
   - Total count of items/coils/pipes (تعداد).

6. Logistics & Document tracking:
   - Batch / Lot No (شماره بچ یا لات)
   - Order / Invoice / Reference No (شماره سفارش یا بارنامه)
   - Pallet No (شماره پالت)
   - Date of production/receipt (تاریخ)

Return strictly a valid JSON object matching the requested schema.`;

      const imagePart = {
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: cleanBase64,
        },
      };

      const textPart = {
        text: prompt,
      };

      const modelsToTry = [
        "gemini-3.8-flash",
        "gemini-flash-latest",
        "gemini-3.1-flash-lite",
        "gemini-3.1-pro-preview"
      ];
      let extractedData: any = null;

      for (const model of modelsToTry) {
        try {
          console.log(`Attempting Gemini Label OCR with model: ${model}`);
          const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  productCategory: { type: Type.STRING, description: "Detected packaging: 'spool' or 'straight' or 'coil'" },
                  companyName: { type: Type.STRING, description: "Brand or manufacturer name e.g. باهنر or ASTERIA COPPER" },
                  productShape: { type: Type.STRING, description: "Shape description e.g. LWC Coil, Pancake, Straight Pipe" },
                  alloyStandard: { type: Type.STRING, description: "Standard e.g. Cu-DHP, SEAMLESS C12200 ASTM B75" },
                  sizeMetric: { type: Type.STRING, description: "Metric dimension e.g. 15.87*0.75" },
                  sizeInch: { type: Type.STRING, description: "Inch diameter e.g. 5/8, 3/8, 1/2" },
                  wallThicknessMm: { type: Type.NUMBER, description: "Wall thickness in mm e.g. 0.75, 0.80" },
                  lengthMeters: { type: Type.NUMBER, description: "Length in meters per coil or pipe" },
                  coilLengthCategory: { type: Type.STRING, description: "Coil length category: '15m' or '50m' or 'custom'" },
                  netWeightPerRoll: { type: Type.NUMBER, description: "Net weight of single roll/unit in KG" },
                  grossWeightPerRoll: { type: Type.NUMBER, description: "Gross weight of single roll/unit in KG" },
                  numberOfCoils: { type: Type.INTEGER, description: "Number of units/coils/pipes" },
                  totalPalletNetWeight: { type: Type.NUMBER, description: "Total Net Weight in KG" },
                  totalPalletGrossWeight: { type: Type.NUMBER, description: "Total Gross Weight in KG" },
                  palletBaseTareWeight: { type: Type.NUMBER, description: "Tare weight of wooden pallet base in KG" },
                  temper: { type: Type.STRING, description: "Temper e.g. Soft, O60, Hard" },
                  mfgDate: { type: Type.STRING, description: "Manufacturing or receipt date" },
                  batchNo: { type: Type.STRING, description: "Batch / Lot number" },
                  palletNo: { type: Type.STRING, description: "Pallet number" },
                  orderNo: { type: Type.STRING, description: "Order / Invoice / Reference number" },
                  individualCoils: {
                    type: Type.ARRAY,
                    description: "List of individual coil weights parsed from table",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        rollNumber: { type: Type.INTEGER },
                        net: { type: Type.NUMBER },
                        gross: { type: Type.NUMBER },
                      }
                    }
                  }
                },
                required: [
                  "companyName", "sizeMetric", "productCategory"
                ]
              }
            }
          });

          if (response && response.text) {
            extractedData = JSON.parse(response.text);
            console.log("Gemini Label OCR succeeded:", extractedData);
            break;
          }
        } catch (modelErr: any) {
          console.warn(`Model ${model} OCR failed:`, modelErr?.message || modelErr);
        }
      }

      if (!extractedData) {
        // Return clear notice so client can use client-side Tesseract OCR on the actual image
        return res.json({
          success: false,
          aiExhausted: true,
          error: 'سهمیه سرویس هوش مصنوعی ابری پر است؛ متن‌خوان داخلی مرورگر (Tesseract) متن تصویر شما را استخراج می‌کند.',
          uploadedImage: `data:${mimeType};base64,${cleanBase64}`
        });
      }

      // Process individual coils table if present
      if (Array.isArray(extractedData.individualCoils) && extractedData.individualCoils.length > 0) {
        const coilWeightsMap: Record<number, { net: number; gross: number; batchNo: string }> = {};
        let sumNet = 0;
        let sumGross = 0;
        extractedData.individualCoils.forEach((c: any, idx: number) => {
          const net = Number(c.net) || (extractedData.netWeightPerRoll || 105.8);
          const gross = Number(c.gross) || (net + 13.2);
          sumNet += net;
          sumGross += gross;
          coilWeightsMap[idx] = {
            net: Number(net.toFixed(1)),
            gross: Number(gross.toFixed(1)),
            batchNo: `${extractedData.batchNo || 'LOT'}-${idx + 1}`
          };
        });
        extractedData.coilWeights = coilWeightsMap;
        if (!extractedData.totalPalletNetWeight && sumNet > 0) {
          extractedData.totalPalletNetWeight = Number(sumNet.toFixed(1));
        }
        if (!extractedData.totalPalletGrossWeight && sumGross > 0) {
          extractedData.totalPalletGrossWeight = Number((sumGross + 35).toFixed(1));
        }
        if (!extractedData.numberOfCoils) {
          extractedData.numberOfCoils = extractedData.individualCoils.length;
        }
      }

      // Ensure pallet weights are logically consistent
      if (!extractedData.totalPalletNetWeight && extractedData.netWeightPerRoll) {
        const coils = extractedData.numberOfCoils || 5;
        extractedData.totalPalletNetWeight = Number((extractedData.netWeightPerRoll * coils).toFixed(1));
      }
      if (!extractedData.totalPalletGrossWeight && extractedData.grossWeightPerRoll) {
        const coils = extractedData.numberOfCoils || 5;
        extractedData.totalPalletGrossWeight = Number((extractedData.grossWeightPerRoll * coils + 35).toFixed(1));
      }

      res.json({
        success: true,
        data: extractedData,
        uploadedImage: `data:${mimeType};base64,${cleanBase64}`
      });
    } catch (err: any) {
      console.error('Error in /api/parse-copper-label:', err);
      res.status(500).json({
        success: false,
        error: err?.message || String(err)
      });
    }
  });

  // --- Database API Endpoints (PostgreSQL via Cloud SQL) ---

  // Health check for DB
  app.get('/api/health/db', async (req, res) => {
    try {
      const usersList = await getPeople();
      res.json({ status: 'ok', database: 'connected', count: usersList.length });
    } catch (err: any) {
      console.error('Database health check failed:', err);
      res.status(500).json({ status: 'error', message: err?.message || String(err) });
    }
  });

  // Supabase connection & domain status
  app.get('/api/supabase/status', async (req, res) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zgymtzwgygycheuwoimu.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpneW10endneWd5Y2hldXdvaW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5OTExNzgsImV4cCI6MjEwMzU2NzE3OH0.pVAVJGWGLgNQQDI5UIEAVTGB4F5VYsJBYyXRQc35txU';
    try {
      const checkRes = await fetch(`${supabaseUrl}/rest/v1/app_settings?select=key&limit=1`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      const status = checkRes.status;
      const body = await checkRes.text();
      res.json({
        configured: true,
        url: supabaseUrl,
        domains: [
          'https://ais-dev-piqdbl2n3de2izmd443be4-905748537032.europe-west2.run.app',
          'https://ais-pre-piqdbl2n3de2izmd443be4-905748537032.europe-west2.run.app'
        ],
        httpStatus: status,
        isExceedEgressQuota: status === 402,
        rawResponse: body
      });
    } catch (err: any) {
      res.json({
        configured: true,
        url: supabaseUrl,
        domains: [
          'https://ais-dev-piqdbl2n3de2izmd443be4-905748537032.europe-west2.run.app',
          'https://ais-pre-piqdbl2n3de2izmd443be4-905748537032.europe-west2.run.app'
        ],
        error: err?.message || String(err)
      });
    }
  });

  // User auth profile sync
  app.post('/api/auth/sync-user', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { uid, email, displayName, photoUrl } = req.body;
      const effectiveUid = req.user?.uid || uid;
      const effectiveEmail = req.user?.email || email;
      if (!effectiveUid || !effectiveEmail) {
        return res.status(400).json({ error: 'UID and Email are required' });
      }
      const user = await getOrCreateUser(effectiveUid, effectiveEmail, displayName, photoUrl);
      res.json({ success: true, user });
    } catch (err: any) {
      console.error('Error syncing user:', err);
      res.status(500).json({ error: err?.message || 'Failed to sync user' });
    }
  });

  // People endpoints
  app.get('/api/people', async (req, res) => {
    try {
      const peopleList = await getPeople();
      res.json(peopleList);
    } catch (err: any) {
      console.error('Error fetching people:', err);
      res.status(500).json({ error: 'Failed to fetch people' });
    }
  });

  app.post('/api/people', async (req, res) => {
    try {
      const person = await upsertPerson(req.body);
      res.json(person);
    } catch (err: any) {
      console.error('Error saving person:', err);
      res.status(500).json({ error: 'Failed to save person' });
    }
  });

  app.delete('/api/people/:id', async (req, res) => {
    try {
      await deletePerson(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error deleting person:', err);
      res.status(500).json({ error: 'Failed to delete person' });
    }
  });

  // Transactions endpoints
  app.get('/api/transactions', async (req, res) => {
    try {
      const trxs = await getTransactions();
      res.json(trxs);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  app.post('/api/transactions', async (req, res) => {
    try {
      const trx = await upsertTransaction(req.body);
      res.json(trx);
    } catch (err: any) {
      console.error('Error saving transaction:', err);
      res.status(500).json({ error: 'Failed to save transaction' });
    }
  });

  app.delete('/api/transactions/:id', async (req, res) => {
    try {
      await deleteTransaction(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      res.status(500).json({ error: 'Failed to delete transaction' });
    }
  });

  // Warehouse items endpoints
  app.get('/api/warehouse-items', async (req, res) => {
    try {
      const items = await getWarehouseItems();
      res.json(items);
    } catch (err: any) {
      console.error('Error fetching warehouse items:', err);
      res.status(500).json({ error: 'Failed to fetch warehouse items' });
    }
  });

  app.post('/api/warehouse-items', async (req, res) => {
    try {
      const item = await upsertWarehouseItem(req.body);
      res.json(item);
    } catch (err: any) {
      console.error('Error saving warehouse item:', err);
      res.status(500).json({ error: 'Failed to save warehouse item' });
    }
  });

  app.delete('/api/warehouse-items/:id', async (req, res) => {
    try {
      await deleteWarehouseItem(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error deleting warehouse item:', err);
      res.status(500).json({ error: 'Failed to delete warehouse item' });
    }
  });

  // Bulk synchronization (syncs all client data to database, and returns latest merged database state)
  app.post('/api/sync/bulk', async (req, res) => {
    try {
      const { people: clientPeople, transactions: clientTransactions, warehouseItems: clientWarehouseItems } = req.body;

      if (Array.isArray(clientPeople) && clientPeople.length > 0) {
        for (const p of clientPeople) {
          if (p && p.id && p.name) {
            await upsertPerson(p);
          }
        }
      }

      if (Array.isArray(clientTransactions) && clientTransactions.length > 0) {
        for (const t of clientTransactions) {
          if (t && t.id && t.personId) {
            await upsertTransaction(t);
          }
        }
      }

      if (Array.isArray(clientWarehouseItems) && clientWarehouseItems.length > 0) {
        for (const w of clientWarehouseItems) {
          if (w && w.id && w.brand) {
            await upsertWarehouseItem(w);
          }
        }
      }

      const [serverPeople, serverTransactions, serverWarehouseItems] = await Promise.all([
        getPeople(),
        getTransactions(),
        getWarehouseItems(),
      ]);

      res.json({
        success: true,
        people: serverPeople,
        transactions: serverTransactions,
        warehouseItems: serverWarehouseItems,
      });
    } catch (err: any) {
      console.error('Error in bulk sync:', err);
      res.status(500).json({ error: 'Bulk sync failed' });
    }
  });

  // App settings endpoints
  app.get('/api/app-settings/:key', async (req, res) => {
    try {
      const value = await getAppSetting(req.params.key);
      res.json({ key: req.params.key, value });
    } catch (err: any) {
      console.error('Error getting app setting:', err);
      res.status(500).json({ error: 'Failed to get app setting' });
    }
  });

  app.post('/api/app-settings/:key', async (req, res) => {
    try {
      const success = await setAppSetting(req.params.key, String(req.body.value || ''));
      res.json({ success });
    } catch (err: any) {
      console.error('Error setting app setting:', err);
      res.status(500).json({ error: 'Failed to set app setting' });
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
