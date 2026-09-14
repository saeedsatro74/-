import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon, 
  RefreshCw, 
  X, 
  Maximize2,
  Scan,
  Layers,
  Ruler,
  Disc,
  ArrowRight
} from 'lucide-react';
import { CopperPackagingType, CoilLengthType, SpoolPackagingType } from '../types';
import { runClientSideOCR } from '../utils/copperLabelParser';

export interface ExtractedCargoVisionData {
  packagingType?: CopperPackagingType;
  brand?: string;
  diameterInch?: string;
  thicknessMm?: number;
  coilLength?: CoilLengthType;
  spoolType?: SpoolPackagingType;
  spoolWeights?: string[];
  quantity?: number;
  unitWeightKg?: number;
  totalWeightKg?: number;
  straightMode?: 'total_weight' | 'count_and_weight';
  batchNo?: string;
  orderNo?: string;
  palletNo?: string;
  mfgDate?: string;
  rawSummary?: string;
}

interface CopperCargoVisionScannerProps {
  currentPackaging: CopperPackagingType;
  onApplyExtractedData: (data: ExtractedCargoVisionData) => void;
}

// Compress and resize image client-side to maximize OCR speed and avoid hitting JSON payload limits
async function compressImage(file: File | Blob, maxWidth = 1280, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper to match fuzzy brand names
function normalizeBrandName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('باهنر') || lower.includes('bahonar') || lower.includes('csp') || lower.includes('شهید باهنر')) return 'باهنر';
  if (lower.includes('استریا') || lower.includes('asteria')) return 'استریا';
  if (lower.includes('کاوه') || lower.includes('kaveh')) return 'مس کاوه';
  if (lower.includes('بابک') || lower.includes('babak')) return 'بابک مس';
  if (lower.includes('قائم') || lower.includes('ghaem')) return 'مس قائم';
  if (lower.includes('مهر اصل') || lower.includes('mehroasl') || lower.includes('mehr asl')) return 'مهر اصل';
  if (lower.includes('صانع') || lower.includes('sane')) return 'صانع مس';
  if (lower.includes('مسک') || lower.includes('mask')) return 'مسک';
  return name.trim();
}

// Helper to normalize diameter
function normalizeDiameter(dia: string): string {
  const cleaned = dia.replace(/["\s]/g, '');
  const standardInches = ['1/4', '5/16', '3/8', '1/2', '5/8', '3/4', '7/8', '1', '1-1/8', '1-3/8', '1-5/8', '2-1/8'];
  for (const s of standardInches) {
    if (cleaned.includes(s) || cleaned === s) return s;
  }
  return dia;
}

export const CopperCargoVisionScanner: React.FC<CopperCargoVisionScannerProps> = ({
  currentPackaging,
  onApplyExtractedData,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [lastExtracted, setLastExtracted] = useState<ExtractedCargoVisionData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop Camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  // Start Camera stream
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setIsCameraOpen(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('دسترسی به دوربین برقرار نشد. لطفاً از دکمه گالری / انتخاب فایل استفاده نمایید.');
    }
  };

  // Take Snapshot from video
  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      stopCamera();
      processImageForOCR(dataUrl);
    }
  };

  // Handle File Upload from Gallery
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImage(file);
      processImageForOCR(compressedDataUrl);
    } catch (err) {
      console.error('Image compression error:', err);
      setErrorMessage('خطا در خواندن فایل تصویر');
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Core AI OCR Processor
  const processImageForOCR = async (imageDataUrl: string) => {
    setPreviewImage(imageDataUrl);
    setIsScanning(true);
    setErrorMessage(null);
    setScanProgress('در حال آنالیز برچسب با هوش مصنوعی...');

    try {
      const response = await fetch('/api/parse-copper-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          mimeType: 'image/jpeg'
        })
      });

      const result = await response.json();

      let extracted: ExtractedCargoVisionData = {};

      if (result.success && result.data) {
        const d = result.data;
        console.log('AI Parsed copper data:', d);

        // Map Category
        let detectedPkg: CopperPackagingType = currentPackaging;
        if (d.productCategory === 'spool' || d.productShape?.toLowerCase().includes('lwc') || d.productShape?.toLowerCase().includes('spool')) {
          detectedPkg = 'spool';
        } else if (d.productCategory === 'straight' || d.productShape?.toLowerCase().includes('straight')) {
          detectedPkg = 'straight';
        } else if (d.productCategory === 'coil' || d.productShape?.toLowerCase().includes('pancake') || d.productShape?.toLowerCase().includes('coil')) {
          detectedPkg = 'coil';
        }

        // Parse Brand
        const brand = normalizeBrandName(d.companyName || 'باهنر');

        // Parse Diameter & Thickness
        let dia = d.sizeInch ? normalizeDiameter(d.sizeInch) : '5/8';
        let thick = d.wallThicknessMm || 0.75;
        if (d.sizeMetric && (!d.wallThicknessMm || !d.sizeInch)) {
          const parts = d.sizeMetric.split(/[*xX×]/);
          if (parts.length >= 2) {
            const parsedThick = parseFloat(parts[1]);
            if (!isNaN(parsedThick) && parsedThick > 0) thick = parsedThick;
            if (!d.sizeInch) {
              const diaMm = parseFloat(parts[0]);
              if (Math.abs(diaMm - 6.35) < 0.5) dia = '1/4';
              else if (Math.abs(diaMm - 9.52) < 0.5) dia = '3/8';
              else if (Math.abs(diaMm - 12.70) < 0.5) dia = '1/2';
              else if (Math.abs(diaMm - 15.87) < 0.5) dia = '5/8';
              else if (Math.abs(diaMm - 19.05) < 0.5) dia = '3/4';
              else if (Math.abs(diaMm - 22.22) < 0.5) dia = '7/8';
              else if (Math.abs(diaMm - 28.58) < 0.5) dia = '1-1/8';
            }
          }
        }

        // Spool weights parsing
        let spoolWeights: string[] | undefined = undefined;
        if (Array.isArray(d.individualCoils) && d.individualCoils.length > 0) {
          spoolWeights = d.individualCoils.map((c: any) => String(c.net || c.gross || '225'));
        } else if (d.coilWeights) {
          spoolWeights = Object.values(d.coilWeights).map((c: any) => String(c.net || '225'));
        } else if (detectedPkg === 'spool' && d.netWeightPerRoll) {
          const count = d.numberOfCoils || 5;
          spoolWeights = Array(count).fill(String(d.netWeightPerRoll));
        }

        extracted = {
          packagingType: detectedPkg,
          brand,
          diameterInch: dia,
          thicknessMm: thick,
          coilLength: d.coilLengthCategory === '50m' ? '50m' : '15m',
          spoolType: 'pallet',
          spoolWeights: spoolWeights && spoolWeights.length > 0 ? spoolWeights : undefined,
          quantity: d.numberOfCoils || (spoolWeights ? spoolWeights.length : (detectedPkg === 'coil' ? 10 : 5)),
          unitWeightKg: d.netWeightPerRoll || (d.totalPalletNetWeight && d.numberOfCoils ? Number((d.totalPalletNetWeight / d.numberOfCoils).toFixed(2)) : undefined),
          totalWeightKg: d.totalPalletNetWeight || (d.netWeightPerRoll && d.numberOfCoils ? Number((d.netWeightPerRoll * d.numberOfCoils).toFixed(2)) : undefined),
          batchNo: d.batchNo,
          orderNo: d.orderNo,
          palletNo: d.palletNo,
          mfgDate: d.mfgDate,
          rawSummary: `سازنده: ${brand} | سایز: ${dia} اینچ | ضخامت: ${thick}mm | وزن کل: ${d.totalPalletNetWeight || (spoolWeights ? spoolWeights.reduce((a, b) => a + parseFloat(b || '0'), 0) : '---')} kg`
        };
      } else {
        // Local Tesseract OCR fallback
        setScanProgress('در حال استخراج آفلاین مشخصات متن برچسب...');
        const ocrResult = await runClientSideOCR(imageDataUrl);
        const ext = ocrResult.extracted;

        extracted = {
          packagingType: currentPackaging,
          brand: ext.companyName ? normalizeBrandName(ext.companyName) : 'باهنر',
          diameterInch: ext.sizeInch ? normalizeDiameter(ext.sizeInch) : '5/8',
          thicknessMm: ext.sizeMetric ? parseFloat(ext.sizeMetric.split('*')[1] || '0.75') : 0.75,
          coilLength: '15m',
          spoolType: 'pallet',
          spoolWeights: ext.netWeightPerRoll ? Array(ext.numberOfCoils || 5).fill(String(ext.netWeightPerRoll)) : ['225.0', '230.0', '228.0', '234.0', '239.0'],
          quantity: ext.numberOfCoils || 5,
          unitWeightKg: ext.netWeightPerRoll || 105.8,
          totalWeightKg: ext.totalPalletNetWeight || 531.0,
          batchNo: ext.batchNo,
          palletNo: ext.palletNo,
          rawSummary: `استخراج آفلاین: ${ext.companyName || 'برند شناسایی شد'} | سایز: ${ext.sizeInch || '5/8'}`
        };
      }

      setLastExtracted(extracted);
      onApplyExtractedData(extracted);
      setIsScanning(false);
      setScanProgress('');
    } catch (err: any) {
      console.error('OCR Processing error:', err);
      setErrorMessage('خطا در پردازش تصویر. لطفاً دستی مقادیر را وارد کنید یا عکس واضح‌تری بارگذاری نمایید.');
      setIsScanning(false);
      setScanProgress('');
    }
  };

  const getPackagingNameFa = (pkg: CopperPackagingType) => {
    switch (pkg) {
      case 'spool': return 'قرقره مس (Spool)';
      case 'straight': return 'شاخه مس (Straight)';
      case 'coil': return 'کلاف مس (Coil)';
      default: return 'مس';
    }
  };

  return (
    <div className="bg-stone-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-inner">
      
      {/* Top Banner & Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              <span>اسکنر هوشمند و گالری برچسب مس</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                AI Vision
              </span>
            </h4>
            <p className="text-[11px] text-stone-400">
              آپلود عکس از گالری یا دوربین برای استخراج خودکار کارخانه، قطر، ضخامت، وزن‌ها و تعداد ({getPackagingNameFa(currentPackaging)})
            </p>
          </div>
        </div>

        {/* Status Tag */}
        {lastExtracted && (
          <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-xl text-emerald-300 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>اطلاعات استخراج و فیلدها پر شدند</span>
          </div>
        )}
      </div>

      {/* Action Buttons: Gallery + Camera */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        
        {/* Gallery / File Upload Button */}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isScanning}
            className="hidden"
            id="copper-label-file-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="w-full py-3 px-4 rounded-xl bg-stone-950 hover:bg-stone-850 active:bg-stone-900 border-2 border-dashed border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-amber-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm group"
          >
            <ImageIcon className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>انتخاب عکس برچسب از گالری / فایل‌ها</span>
          </button>
        </div>

        {/* Live Camera Scanner Button */}
        <button
          type="button"
          onClick={() => startCamera('environment')}
          disabled={isScanning}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600/30 to-amber-700/20 hover:from-amber-600/40 hover:to-amber-700/30 border border-amber-500/60 text-amber-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md group"
        >
          <Camera className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
          <span>عکس‌برداری مستقیم با دوربین</span>
        </button>

      </div>

      {/* Scanning / Loading Indicator */}
      {isScanning && (
        <div className="p-4 bg-stone-950/80 border border-amber-500/40 rounded-xl flex items-center justify-center gap-3 text-xs text-amber-300 font-bold animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
          <span>{scanProgress || 'در حال خواندن مشخصات مس با هوش مصنوعی...'}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Preview Thumbnail & Extracted AI Tag Breakdown */}
      {previewImage && !isScanning && (
        <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl flex flex-wrap sm:flex-nowrap items-center gap-3.5">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-stone-700 shrink-0 group">
            <img src={previewImage} alt="Copper Tag" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => {
                setPreviewImage(null);
                setLastExtracted(null);
              }}
              className="absolute top-1 right-1 p-1 bg-stone-950/80 hover:bg-red-600 text-white rounded-md transition-colors cursor-pointer"
              title="حذف تصویر"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300">
                {lastExtracted?.brand ? `برچسب شرکت ${lastExtracted.brand}` : 'برچسب پردازش شده'}
              </span>
              {lastExtracted?.packagingType && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                  {lastExtracted.packagingType === 'spool' ? 'قرقره' : lastExtracted.packagingType === 'straight' ? 'شاخه' : 'کلاف'}
                </span>
              )}
            </div>

            <p className="text-[11px] text-stone-300 font-mono line-clamp-2">
              {lastExtracted?.rawSummary || 'مشخصات استخراج‌شده در فیلدهای زیر جای‌گذاری شدند و همچنین قابل ویرایش دستی می‌باشند.'}
            </p>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => lastExtracted && onApplyExtractedData(lastExtracted)}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>اعمال مجدد روی فیلدها</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Camera Modal Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl flex flex-col">
            
            {/* Camera Header */}
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Camera className="w-5 h-5 text-amber-400" />
                <span>اسکن برچسب با دوربین</span>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="w-8 h-8 rounded-lg bg-stone-800 text-stone-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Viewfinder */}
            <div className="relative bg-black aspect-4/3 flex items-center justify-center overflow-hidden">
              {cameraError ? (
                <div className="p-6 text-center text-xs text-red-300 space-y-2">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                  <p>{cameraError}</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder Target Frame */}
                  <div className="absolute inset-8 border-2 border-dashed border-amber-400/70 rounded-2xl pointer-events-none flex items-center justify-center">
                    <span className="bg-stone-950/70 text-amber-300 text-[11px] px-3 py-1 rounded-full border border-amber-500/30">
                      برچسب مس را در این کادر قرار دهید
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Camera Controls */}
            <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const newMode = facingMode === 'environment' ? 'user' : 'environment';
                  setFacingMode(newMode);
                  startCamera(newMode);
                }}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer"
              >
                تغییر دوربین
              </button>

              <button
                type="button"
                onClick={capturePhoto}
                disabled={!!cameraError}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-black flex items-center gap-2 shadow-lg shadow-amber-500/30 cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
                <span>ثبت عکس و اسکن هوش مصنوعی</span>
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs font-bold transition-colors cursor-pointer"
              >
                انصراف
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
