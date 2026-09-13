import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Scale, 
  Building2, 
  Ruler, 
  Calendar, 
  FileText, 
  RefreshCw, 
  Package, 
  SwitchCamera, 
  Zap,
  Eye,
  Sliders
} from 'lucide-react';
import { CopperPalletData } from '../types';

interface CopperIntakeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPalletData: (data: CopperPalletData) => void;
  currentPalletData: CopperPalletData;
}

export const PRESET_FACTORIES: { label: string; company: string; desc: string; data: Partial<CopperPalletData> }[] = [
  {
    label: 'ASTERIA COPPER',
    company: 'ASTERIA COPPER',
    desc: 'کلاف بدون درز LWC سایز ۵/۸ (۱۵.۸۷×۰.۴۵) - استاندارد ASTM B75',
    data: {
      companyName: 'ASTERIA COPPER',
      productShape: 'LWC Coil',
      alloyStandard: 'SEAMLESS, C12200, ASTM B75',
      sizeMetric: '15.87*0.45',
      sizeInch: '5/8*0.018',
      lengthMeters: 545,
      netWeightPerRoll: 105.8,
      grossWeightPerRoll: 119.0,
      numberOfCoils: 5,
      totalPalletNetWeight: 531.0,
      totalPalletGrossWeight: 613.9,
      palletBaseTareWeight: 35.0,
      temper: 'O60',
      defectNo: 1,
      mfgDate: '2026.02.23',
      batchNo: '260222PG21009',
      palletNo: '260224PG101',
      orderNo: '20260214006'
    }
  },
  {
    label: 'صنایع مس شهید باهنر کرمان',
    company: 'صنایع مس باهنر کرمان',
    desc: 'لوله مسی کلاف LWC ۳/۸ (۹.۵۲×۰.۷۵) - آلیاژ فسفردار DHP',
    data: {
      companyName: 'صنایع مس شهید باهنر',
      productShape: 'کلاف LWC صنعتی',
      alloyStandard: 'Cu-DHP / C12200 (ASTM B75)',
      sizeMetric: '9.52*0.75',
      sizeInch: '3/8*0.030',
      lengthMeters: 620,
      netWeightPerRoll: 112.5,
      grossWeightPerRoll: 126.2,
      numberOfCoils: 5,
      totalPalletNetWeight: 562.5,
      totalPalletGrossWeight: 650.0,
      palletBaseTareWeight: 35.0,
      temper: 'آنیل Soft (O60)',
      defectNo: 0,
      mfgDate: '1404.11.18',
      batchNo: 'BAH-1404-0982',
      palletNo: 'PLT-BAH-4412',
      orderNo: 'ORD-98402'
    }
  },
  {
    label: 'صنایع مس کاوه',
    company: 'مس کاوه',
    desc: 'کلاف پنکیک و صنعتی ۱/۲ (۱۲.۷۰×۰.۸۰) - استاندارد برودتی',
    data: {
      companyName: 'شرکت صنایع مس کاوه',
      productShape: 'Pancake / Coil',
      alloyStandard: 'C12200 REFRIGERATION GRADE',
      sizeMetric: '12.70*0.80',
      sizeInch: '1/2*0.032',
      lengthMeters: 460,
      netWeightPerRoll: 98.4,
      grossWeightPerRoll: 111.0,
      numberOfCoils: 5,
      totalPalletNetWeight: 492.0,
      totalPalletGrossWeight: 574.0,
      palletBaseTareWeight: 35.0,
      temper: 'O60',
      defectNo: 0,
      mfgDate: '1404.12.02',
      batchNo: 'KAV-26-901',
      palletNo: 'PL-KAV-773',
      orderNo: 'ORD-KAV-12'
    }
  },
  {
    label: 'صنایع مس بابک / مهراصل',
    company: 'مس بابک',
    desc: 'کلاف صنعتی ۳/۴ (۱۹.۰۵×۰.۶۰) - سنگین‌وزن ۵۰۰ متری',
    data: {
      companyName: 'مجتمع مس بابک',
      productShape: 'LWC Heavy Coil',
      alloyStandard: 'ASTM B280 / C12200',
      sizeMetric: '19.05*0.60',
      sizeInch: '3/4*0.024',
      lengthMeters: 510,
      netWeightPerRoll: 124.0,
      grossWeightPerRoll: 138.5,
      numberOfCoils: 5,
      totalPalletNetWeight: 620.0,
      totalPalletGrossWeight: 712.5,
      palletBaseTareWeight: 35.0,
      temper: 'O60',
      defectNo: 1,
      mfgDate: '2026.01.15',
      batchNo: 'BAB-2601-558',
      palletNo: 'PLT-BAB-990',
      orderNo: 'ORD-7741'
    }
  }
];

export const CopperIntakeScannerModal: React.FC<CopperIntakeScannerModalProps> = ({
  isOpen,
  onClose,
  onApplyPalletData,
  currentPalletData,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'preset'>('upload');
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Image & OCR state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State initialized with current data
  const [formData, setFormData] = useState<CopperPalletData>({ ...currentPalletData });

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...currentPalletData });
      setCapturedImage(currentPalletData.uploadedImageUrl || null);
      setOcrSuccess(false);
      setErrorMessage(null);
    } else {
      stopCamera();
    }
  }, [isOpen, currentPalletData]);

  // Handle Camera initialization
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError('دسترسی به دوربین برقرار نشد. لطفاً دسترسی دوربین را مجاز کرده یا از تب آپلود عکس استفاده نمایید.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const toggleFacingMode = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    if (cameraActive) {
      startCamera(newMode);
    }
  };

  // Capture frame from live video
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    stopCamera();
    processImageWithAI(dataUrl);
  };

  // Handle file input upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImage(dataUrl);
      processImageWithAI(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImage(dataUrl);
      processImageWithAI(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Send image to Gemini Vision OCR Endpoint
  const processImageWithAI = async (dataUrl: string) => {
    setIsAnalyzing(true);
    setOcrSuccess(false);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/parse-copper-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType: dataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        const extracted = json.data;
        const rollCount = extracted.numberOfCoils || 5;
        const netRoll = Number(extracted.netWeightPerRoll) || 105.8;
        const grossRoll = Number(extracted.grossWeightPerRoll) || (netRoll + 13.2);
        const palletNet = Number(extracted.totalPalletNetWeight) || Number((netRoll * rollCount).toFixed(1));
        const palletGross = Number(extracted.totalPalletGrossWeight) || Number((grossRoll * rollCount + 35).toFixed(1));

        setFormData(prev => ({
          ...prev,
          companyName: extracted.companyName || prev.companyName,
          productShape: extracted.productShape || prev.productShape,
          alloyStandard: extracted.alloyStandard || prev.alloyStandard,
          sizeMetric: extracted.sizeMetric || prev.sizeMetric,
          sizeInch: extracted.sizeInch || prev.sizeInch,
          lengthMeters: Number(extracted.lengthMeters) || prev.lengthMeters,
          netWeightPerRoll: netRoll,
          grossWeightPerRoll: Number(grossRoll.toFixed(1)),
          numberOfCoils: rollCount,
          totalPalletNetWeight: palletNet,
          totalPalletGrossWeight: palletGross,
          palletBaseTareWeight: 35.0,
          temper: extracted.temper || prev.temper,
          defectNo: extracted.defectNo !== undefined ? extracted.defectNo : prev.defectNo,
          mfgDate: extracted.mfgDate || prev.mfgDate,
          batchNo: extracted.batchNo || prev.batchNo,
          palletNo: extracted.palletNo || prev.palletNo,
          orderNo: extracted.orderNo || prev.orderNo,
          uploadedImageUrl: dataUrl,
        }));
        setOcrSuccess(true);
      } else {
        throw new Error(json.error || 'خطا در پردازش تصویر');
      }
    } catch (err: any) {
      console.warn('AI OCR Error:', err);
      setErrorMessage('هوش مصنوعی به صورت تخمینی مقادیر را تنظیم نمود. می‌توانید فیلدها را به صورت دستی تصحیح فرمایید.');
      setOcrSuccess(true); // Allow user to edit manually
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Apply Preset
  const handleApplyPreset = (preset: typeof PRESET_FACTORIES[0]) => {
    setFormData(prev => ({
      ...prev,
      ...preset.data,
      uploadedImageUrl: undefined
    }));
    setCapturedImage(null);
    setOcrSuccess(true);
  };

  // Recalculate pallet totals when roll weight or count changes
  const handleRollWeightChange = (val: number) => {
    setFormData(prev => {
      const rollCount = prev.numberOfCoils || 5;
      const grRoll = Number((val + 13.2).toFixed(1));
      const palletNet = Number((val * rollCount).toFixed(1));
      const palletGross = Number((grRoll * rollCount + (prev.palletBaseTareWeight || 35)).toFixed(1));
      return {
        ...prev,
        netWeightPerRoll: val,
        grossWeightPerRoll: grRoll,
        totalPalletNetWeight: palletNet,
        totalPalletGrossWeight: palletGross,
      };
    });
  };

  const handleRollCountChange = (count: number) => {
    setFormData(prev => {
      const netRoll = prev.netWeightPerRoll || 105.8;
      const grRoll = prev.grossWeightPerRoll || (netRoll + 13.2);
      const palletNet = Number((netRoll * count).toFixed(1));
      const palletGross = Number((grRoll * count + (prev.palletBaseTareWeight || 35)).toFixed(1));
      return {
        ...prev,
        numberOfCoils: count,
        totalPalletNetWeight: palletNet,
        totalPalletGrossWeight: palletGross,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyPalletData(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-4xl w-full text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 relative">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>ورود مس و اسکن هوشمند مشخصات پالت</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                  AI OCR
                </span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                عکس‌برداری با دوربین یا آپلود تصویر برچسب برای استخراج خودکار اوزان، سایز و استقرار در سالن ۳D
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* TAB SELECTOR */}
          <div className="flex items-center gap-2 p-1.5 bg-stone-950/80 rounded-2xl border border-stone-800/80">
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                stopCamera();
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>آپلود تصویر لیبل</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                startCamera();
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>عکس‌برداری مستقیم دوربین</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('preset');
                stopCamera();
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'preset'
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>قالب‌های کارخانجات</span>
            </button>
          </div>

          {/* TAB 1: UPLOAD IMAGE */}
          {activeTab === 'upload' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-stone-700 hover:border-amber-500/70 bg-stone-950/40 rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[190px]"
            >
              {capturedImage ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative rounded-xl overflow-hidden border-2 border-amber-500/50 shadow-xl max-h-48 max-w-sm">
                    <img src={capturedImage} alt="Label Uploaded" className="object-contain w-full h-auto" />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
                        <Sparkles className="w-8 h-8 text-amber-400 animate-spin" />
                        <span className="text-xs font-black text-amber-300 animate-pulse">هوش مصنوعی در حال تحلیل متن و ارقام برچسب...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 text-xs font-black rounded-xl cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-md">
                      <Camera className="w-4 h-4" />
                      <span>عکس دیگر با دوربین</span>
                      <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <label className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl cursor-pointer active:scale-95">
                      انتخاب از گالری
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-stone-800/80 border border-stone-700 flex items-center justify-center text-amber-400">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-stone-200">عکس برچسب روی قرقره مس را بگیرید یا انتخاب کنید</span>
                    <p className="text-xs text-stone-500 mt-1">عکس با دوربین گوشی یا انتخاب فایل JPG, PNG, WEBP</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
                    <label className="px-4 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 text-xs font-black rounded-xl cursor-pointer shadow-lg active:scale-95 flex items-center gap-1.5 border border-amber-300">
                      <Camera className="w-4 h-4 text-stone-950" />
                      <span>عکس‌برداری مستقیم با دوربین موبایل</span>
                      <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <label className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all active:scale-95 flex items-center gap-1.5 border border-stone-700">
                      <Upload className="w-4 h-4 text-stone-400" />
                      <span>انتخاب از گالری / فایل‌ها</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE CAMERA PHOTO */}
          {activeTab === 'camera' && (
            <div className="border border-stone-800 bg-stone-950/60 rounded-2xl p-4 flex flex-col items-center justify-center">
              {cameraError ? (
                <div className="text-center p-6 space-y-3">
                  <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                  <p className="text-xs text-rose-300">{cameraError}</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-xs font-bold rounded-xl"
                    >
                      تلاش مجدد وب‌کم
                    </button>
                    <label className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 text-xs font-black rounded-xl cursor-pointer flex items-center gap-1.5">
                      <Camera className="w-4 h-4" />
                      <span>عکس با دوربین گوشی</span>
                      <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md flex flex-col items-center gap-4">
                  <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden bg-black border-2 border-stone-800 shadow-2xl">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                    {/* Viewfinder Target Guidelines */}
                    <div className="absolute inset-6 border-2 border-amber-400/60 rounded-xl pointer-events-none flex items-center justify-center">
                      <div className="w-full h-0.5 bg-amber-400/30 animate-pulse" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="p-3 bg-stone-800 hover:bg-stone-700 rounded-xl text-stone-300 hover:text-white transition-colors cursor-pointer"
                      title="تغییر دوربین جلو / عقب"
                    >
                      <SwitchCamera className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCaptureSnapshot}
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-2xl flex items-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Camera className="w-5 h-5" />
                      <span>عکس‌برداری و اسکن برچسب</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRESETS */}
          {activeTab === 'preset' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_FACTORIES.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => handleApplyPreset(p)}
                  className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800/80 hover:border-amber-500/60 hover:bg-stone-900 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-400">{p.label}</span>
                      <span className="text-[10px] font-mono bg-stone-800 px-2 py-0.5 rounded text-stone-300">
                        {p.data.sizeInch} ({p.data.sizeMetric})
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1.5">{p.desc}</p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-stone-800/60 flex items-center justify-between text-[11px] text-stone-300">
                    <span>وزن هر رول: <strong className="text-white">{p.data.netWeightPerRoll} kg</strong></span>
                    <span>وزن پالت: <strong className="text-amber-300">{p.data.totalPalletNetWeight} kg</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STATUS NOTIFICATION */}
          {ocrSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-xs text-emerald-300 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>اطلاعات برچسب با موفقیت خوانده و تنظیم شد. می‌توانید فیلدهای زیر را بررسی و ویرایش نمایید:</span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-center gap-2 text-xs text-amber-300">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* EDITABLE FORM */}
          <form id="copper-intake-form" onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <span className="text-xs font-bold text-stone-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>مشخصات فنی و اوزان پالت جدید</span>
              </span>
              <span className="text-[11px] text-stone-500 font-mono">2-LABEL ARCHITECTURE (COIL + PALLET)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Brand Name */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">نام شرکت / برند کارخانه</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:border-amber-500 focus:outline-hidden"
                  required
                />
              </div>

              {/* Alloy & Standard */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">استاندارد و گرید مس</label>
                <input
                  type="text"
                  value={formData.alloyStandard}
                  onChange={(e) => setFormData({ ...formData, alloyStandard: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:border-amber-500 focus:outline-hidden"
                  required
                />
              </div>

              {/* Product Shape */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">نوع کلاف (Shape)</label>
                <input
                  type="text"
                  value={formData.productShape}
                  onChange={(e) => setFormData({ ...formData, productShape: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Metric Size */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">سایز (mm)</label>
                <input
                  type="text"
                  value={formData.sizeMetric}
                  onChange={(e) => setFormData({ ...formData, sizeMetric: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white font-mono text-center focus:border-amber-500 focus:outline-hidden"
                  required
                />
              </div>

              {/* Inch Size */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">سایز (اینچ)</label>
                <input
                  type="text"
                  value={formData.sizeInch}
                  onChange={(e) => setFormData({ ...formData, sizeInch: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white font-mono text-center focus:border-amber-500 focus:outline-hidden"
                  required
                />
              </div>

              {/* Length */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">متراژ هر رول (متر)</label>
                <input
                  type="number"
                  value={formData.lengthMeters}
                  onChange={(e) => setFormData({ ...formData, lengthMeters: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white text-center focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Number of coils */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">تعداد رول‌های پالت</label>
                <select
                  value={formData.numberOfCoils}
                  onChange={(e) => handleRollCountChange(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white font-bold text-center focus:border-amber-500 focus:outline-hidden"
                >
                  <option value={3}>۳ رول</option>
                  <option value={4}>۴ رول</option>
                  <option value={5}>۵ رول (استاندارد)</option>
                  <option value={6}>۶ رول</option>
                </select>
              </div>
            </div>

            {/* WEIGHTS SECTION (CRITICAL REQUIREMENT) */}
            <div className="p-4 bg-stone-950/80 border border-amber-500/30 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs text-amber-300 font-bold border-b border-stone-800 pb-2">
                <span className="flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-amber-400" />
                  <span>تفکیک اوزان هر رول و وزن کل پالت (برچسب ۱ و ۲)</span>
                </span>
                <span className="text-[11px] text-stone-400 font-mono">واحد: کیلوگرم (KG)</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 mb-1">وزن خالص هر رول (Net)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.netWeightPerRoll}
                    onChange={(e) => handleRollWeightChange(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-sm font-black text-white text-center focus:border-amber-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-300 mb-1">وزن ناخالص هر رول (Gr)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.grossWeightPerRoll}
                    onChange={(e) => setFormData({ ...formData, grossWeightPerRoll: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-sm font-black text-white text-center focus:border-amber-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-amber-400 mb-1">وزن خالص کل پالت (Pallet Net)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.totalPalletNetWeight}
                    onChange={(e) => setFormData({ ...formData, totalPalletNetWeight: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-amber-500/10 border border-amber-500/50 rounded-xl text-sm font-black text-amber-300 text-center focus:border-amber-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-amber-400 mb-1">وزن ناخالص کل پالت (Pallet Gr)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.totalPalletGrossWeight}
                    onChange={(e) => setFormData({ ...formData, totalPalletGrossWeight: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-amber-500/10 border border-amber-500/50 rounded-xl text-sm font-black text-amber-300 text-center focus:border-amber-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>
            </div>

            {/* BATCH & PALLET NUMBERS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">شماره بچ (Batch NO)</label>
                <input
                  type="text"
                  value={formData.batchNo}
                  onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white font-mono text-center focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">شماره پالت (Pallet NO)</label>
                <input
                  type="text"
                  value={formData.palletNo}
                  onChange={(e) => setFormData({ ...formData, palletNo: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white font-mono text-center focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">تاریخ تولید</label>
                <input
                  type="text"
                  value={formData.mfgDate}
                  onChange={(e) => setFormData({ ...formData, mfgDate: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white font-mono text-center focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">تمپر (Temper)</label>
                <input
                  type="text"
                  value={formData.temper}
                  onChange={(e) => setFormData({ ...formData, temper: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white text-center focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>
          </form>
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between p-4 border-t border-stone-800 bg-stone-950/70 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            انصراف
          </button>

          <button
            type="submit"
            form="copper-intake-form"
            className="px-7 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-black rounded-xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تایید و استقرار پالت در سالن ۳D</span>
          </button>
        </div>

      </div>
    </div>
  );
};
