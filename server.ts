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
Analyze this photo of an industrial copper coil label or pallet master packing list label (e.g., ASTERIA COPPER, Shahid Bahonar Kerman, Kaveh Copper, Babak, etc.).

CRITICAL INSTRUCTIONS:
1. Search the ENTIRE image carefully from top to bottom.
2. Company / Brand Name: Identify the exact manufacturer (e.g., "ASTERIA COPPER", "صنایع مس شهید باهنر کرمان", "مس کاوه", "بابک مس", etc.).
3. Dimensions (Outer Diameter & Wall Thickness):
   - Metric size in mm (e.g. "15.87*0.45", "9.52*0.75", "12.70*0.80", "19.05*0.60").
   - Inch size (e.g. "5/8*0.018", "3/8*0.030", "1/2*0.032", "3/4*0.024").
4. Product Type & Alloy:
   - Product shape (e.g. "LWC Coil", "Pancake", "Straight").
   - Alloy standard (e.g. "SEAMLESS, C12200, ASTM B75", "Cu-DHP / C12200").
   - Temper (e.g. "O60", "Soft / آنیل", "Half Hard").
5. CRITICAL - THE ROLLS & WEIGHTS TABLE (PACKING LIST / جدول مشخصات و اوزان رول‌ها):
   - Look carefully at the lower section or bottom half of the image for the table of individual roll weights!
   - Extract individual roll weights: Net Weight (N.W) and Gross Weight (G.W) for each coil/spool.
   - Net Weight per roll (N.W in KG, e.g. 105.8).
   - Gross Weight per roll (G.W in KG, e.g. 119.0).
   - Total Pallet Net Weight (TOTAL N.W in KG, e.g. 531.0 - do NOT confuse with alloy standard C12200 or batch numbers!).
   - Total Pallet Gross Weight (TOTAL G.W in KG, e.g. 613.9).
   - Number of coils/rolls (e.g. 5 or 6).
   - Pallet tare weight (TARE WT, e.g. 35.0 kg).
6. Production and Tracking details:
   - Batch / Lot number (BATCH NO / LOT NO)
   - Pallet number (PALLET NO)
   - Order number (ORDER NO / P.O. NO)
   - Manufacturing / Inspection Date (MFG DATE / DATE)

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
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-3.8-flash",
        "gemini-flash-latest"
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
                  companyName: { type: Type.STRING, description: "Brand or manufacturer name e.g. ASTERIA COPPER" },
                  productShape: { type: Type.STRING, description: "Shape e.g. LWC Coil, Pancake, Straight" },
                  alloyStandard: { type: Type.STRING, description: "Standard e.g. SEAMLESS C12200 ASTM B75" },
                  sizeMetric: { type: Type.STRING, description: "Metric dimension e.g. 15.87*0.45" },
                  sizeInch: { type: Type.STRING, description: "Inch dimension e.g. 5/8*0.018" },
                  lengthMeters: { type: Type.NUMBER, description: "Length in meters per coil" },
                  netWeightPerRoll: { type: Type.NUMBER, description: "Net weight of single roll in KG" },
                  grossWeightPerRoll: { type: Type.NUMBER, description: "Gross weight of single roll in KG" },
                  numberOfCoils: { type: Type.INTEGER, description: "Number of coils on pallet (count of rows in table)" },
                  totalPalletNetWeight: { type: Type.NUMBER, description: "Total Net Weight of full pallet in KG" },
                  totalPalletGrossWeight: { type: Type.NUMBER, description: "Total Gross Weight of full pallet in KG" },
                  palletBaseTareWeight: { type: Type.NUMBER, description: "Tare weight of wooden pallet base in KG" },
                  temper: { type: Type.STRING, description: "Temper e.g. O60" },
                  defectNo: { type: Type.INTEGER, description: "Defect count" },
                  mfgDate: { type: Type.STRING, description: "Manufacturing date" },
                  batchNo: { type: Type.STRING, description: "Batch number" },
                  palletNo: { type: Type.STRING, description: "Pallet number" },
                  orderNo: { type: Type.STRING, description: "Order number" },
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
                  "companyName", "sizeMetric", "netWeightPerRoll", "totalPalletNetWeight", "numberOfCoils"
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
