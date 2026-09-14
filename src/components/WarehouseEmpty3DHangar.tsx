import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { 
  X,
  Package,
  MinusCircle,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  FileText,
  Camera,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Boxes,
  ArrowRight,
  Warehouse,
  Building2,
  Factory,
  Lock,
  Unlock,
  Navigation
} from 'lucide-react';
import { CopperPalletData } from '../types';
import { CopperIntakeScannerModal, PRESET_FACTORIES } from './CopperIntakeScannerModal';

export interface CopperBrandZone {
  id: 'bahonar' | 'asteria' | 'ghaem' | 'babak' | 'mehrasl';
  nameFa: string;
  nameEn: string;
  tagline: string;
  zoneCode: string;
  color: string;
  secondaryColor: string;
  accentBg: string;
  boardX: number;
  boardY: number;
  boardZ: number;
  floorBayX: number;
  floorBayZ: number;
  standard: string;
  alloy: string;
  defaultData: CopperPalletData;
}

export const BRAND_ZONES: CopperBrandZone[] = [
  {
    id: 'bahonar',
    nameFa: 'صنایع مس شهید باهنر',
    nameEn: 'BAHONAR COPPER INDUSTRIES',
    tagline: 'بزرگترین تولیدکننده مقاطع و لوله‌های مسی ایران',
    zoneCode: 'BAY-01',
    color: '#f59e0b',
    secondaryColor: '#d97706',
    accentBg: 'rgba(245, 158, 11, 0.18)',
    boardX: -9.2,
    boardY: 3.6,
    boardZ: -21.75,
    floorBayX: -9.2,
    floorBayZ: -15.5,
    standard: 'ASTM B75 / Cu-DHP',
    alloy: 'C12200 فسفردار صنعتی',
    defaultData: {
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
    id: 'asteria',
    nameFa: 'مس آستریا',
    nameEn: 'ASTERIA COPPER CO.',
    tagline: 'لوله‌های بدون درز برودتی و تهویه مطبوع',
    zoneCode: 'BAY-02',
    color: '#06b6d4',
    secondaryColor: '#0891b2',
    accentBg: 'rgba(6, 182, 212, 0.18)',
    boardX: -4.6,
    boardY: 3.6,
    boardZ: -21.75,
    floorBayX: -4.6,
    floorBayZ: -15.5,
    standard: 'SEAMLESS ASTM B75',
    alloy: 'C12200 Refrigeration',
    defaultData: {
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
    id: 'ghaem',
    nameFa: 'صنایع مس قائم',
    nameEn: 'GHAEM COPPER GROUP',
    tagline: 'تولید تخصصی کلاف و لوله‌های سرمایشی ACR',
    zoneCode: 'BAY-03',
    color: '#10b981',
    secondaryColor: '#059669',
    accentBg: 'rgba(16, 185, 129, 0.18)',
    boardX: 0,
    boardY: 4.8,
    boardZ: -21.75,
    floorBayX: 0,
    floorBayZ: -15.5,
    standard: 'ASTM B280 / ACR Grade',
    alloy: 'Cu-DHP / C12200',
    defaultData: {
      companyName: 'صنایع مس قائم',
      productShape: 'کلاف LWC استاندارد',
      alloyStandard: 'C12200 REFRIGERATION GRADE ASTM B280',
      sizeMetric: '12.70*0.80',
      sizeInch: '1/2*0.032',
      lengthMeters: 480,
      netWeightPerRoll: 104.2,
      grossWeightPerRoll: 117.5,
      numberOfCoils: 5,
      totalPalletNetWeight: 521.0,
      totalPalletGrossWeight: 607.5,
      palletBaseTareWeight: 35.0,
      temper: 'O60 Soft',
      defectNo: 0,
      mfgDate: '1404.12.10',
      batchNo: 'GHM-1404-771',
      palletNo: 'PLT-GHM-882',
      orderNo: 'ORD-GHM-55'
    }
  },
  {
    id: 'babak',
    nameFa: 'مجتمع صنایع مس بابک',
    nameEn: 'BABAK COPPER COMPLEX',
    tagline: 'کلاف‌های سنگین وزن صنعتی و عمرانی ۵۰۰ متری',
    zoneCode: 'BAY-04',
    color: '#f43f5e',
    secondaryColor: '#e11d48',
    accentBg: 'rgba(244, 63, 94, 0.18)',
    boardX: 4.6,
    boardY: 3.6,
    boardZ: -21.75,
    floorBayX: 4.6,
    floorBayZ: -15.5,
    standard: 'ASTM B280 / Heavy Duty',
    alloy: 'C12200 Seamless',
    defaultData: {
      companyName: 'مجتمع صنایع مس بابک',
      productShape: 'کلاف LWC سنگین صنعتی',
      alloyStandard: 'ASTM B280 / C12200 Heavy Coil',
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
      mfgDate: '2026.01.20',
      batchNo: 'BAB-2601-884',
      palletNo: 'PLT-BAB-990',
      orderNo: 'ORD-BAB-1404'
    }
  },
  {
    id: 'mehrasl',
    nameFa: 'صنایع برودتی و مس مهر اصل',
    nameEn: 'MEHR ASL COPPER & HVAC',
    tagline: 'تجهیزات تهویه مطبوع، لوله‌های صنعتی و کلاف مس',
    zoneCode: 'BAY-05',
    color: '#8b5cf6',
    secondaryColor: '#7c3aed',
    accentBg: 'rgba(139, 92, 246, 0.18)',
    boardX: 9.2,
    boardY: 3.6,
    boardZ: -21.75,
    floorBayX: 9.2,
    floorBayZ: -15.5,
    standard: 'ASTM B280 / ACR Ref',
    alloy: 'Cu-DHP C12200 Industrial Grade',
    defaultData: {
      companyName: 'صنایع برودتی و مس مهر اصل',
      productShape: 'کلاف مسی سرمایشی برودتی LWC',
      alloyStandard: 'Cu-DHP C12200 Industrial Grade',
      sizeMetric: '15.87*0.75',
      sizeInch: '5/8*0.030',
      lengthMeters: 530,
      netWeightPerRoll: 118.0,
      grossWeightPerRoll: 131.5,
      numberOfCoils: 5,
      totalPalletNetWeight: 590.0,
      totalPalletGrossWeight: 677.5,
      palletBaseTareWeight: 35.0,
      temper: 'O60 Soft Annealed',
      defectNo: 0,
      mfgDate: '1404.11.29',
      batchNo: 'MAS-1404-339',
      palletNo: 'PLT-MAS-1204',
      orderNo: 'ORD-MAS-991'
    }
  }
];

interface WarehouseEmpty3DHangarProps {
  onBackTo2D?: () => void;
  onClose?: () => void;
  onOpenWarehouse2DPanel?: () => void;
  warehouseItemsCount?: number;
}

interface SpoolState {
  id: number;
  onPallet: boolean;
  isSealed: boolean;
  posX: number;
  posZ: number;
  netWeight?: number;
  grossWeight?: number;
  batchNo?: string;
  photoUrl?: string;
}

const DEFAULT_PALLET_DATA: CopperPalletData = {
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
};

export const WarehouseEmpty3DHangar: React.FC<WarehouseEmpty3DHangarProps> = ({ 
  onBackTo2D, 
  onClose,
  onOpenWarehouse2DPanel,
  warehouseItemsCount
}) => {
  const handleExit = onClose || onBackTo2D;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Active Brand Zone State
  const [activeBrandId, setActiveBrandId] = useState<'bahonar' | 'asteria' | 'ghaem' | 'babak' | 'mehrasl'>('asteria');

  // Brand Objects in 3D scene (for raycasting and highlights)
  const brandBoardMeshes = useRef<{ [key: string]: THREE.Mesh }>({});
  const brandBayMeshes = useRef<{ [key: string]: THREE.Mesh }>({});

  // Pallet Specifications State
  const [palletData, setPalletData] = useState<CopperPalletData>(DEFAULT_PALLET_DATA);
  const palletDataRef = useRef<CopperPalletData>(palletData);
  palletDataRef.current = palletData;

  // Pallet 3D Object & Position
  const palletGroupRef = useRef<THREE.Group | null>(null);
  const palletZoneRef = useRef<THREE.Mesh | null>(null);
  const palletPos = useRef<{ x: number; z: number }>({ x: 0, z: -2 });

  // 5 Spools State
  const [spools, setSpools] = useState<SpoolState[]>([
    { id: 0, onPallet: true, isSealed: true, posX: 0, posZ: -2, netWeight: 105.8, grossWeight: 119.0, batchNo: '260222PG21001' },
    { id: 1, onPallet: true, isSealed: true, posX: 0, posZ: -2, netWeight: 106.4, grossWeight: 119.6, batchNo: '260222PG21002' },
    { id: 2, onPallet: true, isSealed: true, posX: 0, posZ: -2, netWeight: 105.2, grossWeight: 118.4, batchNo: '260222PG21003' },
    { id: 3, onPallet: true, isSealed: true, posX: 0, posZ: -2, netWeight: 106.0, grossWeight: 119.2, batchNo: '260222PG21004' },
    { id: 4, onPallet: true, isSealed: true, posX: 0, posZ: -2, netWeight: 105.6, grossWeight: 118.8, batchNo: '260222PG21005' },
  ]);
  const spoolsRef = useRef<SpoolState[]>(spools);
  spoolsRef.current = spools;

  // 3D references
  const spool3DGroups = useRef<{ [id: number]: THREE.Group }>({});
  const spoolTeflonWraps = useRef<{ [id: number]: THREE.Group }>({});
  const spoolCoilLabelMeshes = useRef<{ [id: number]: THREE.Mesh }>({});
  const palletMasterLabelMesh = useRef<THREE.Mesh | null>(null);
  const topCardboardCapRef = useRef<THREE.Mesh | null>(null);

  // Pallet Lock State (When locked, clicking zones or dragging will not move the pallet)
  const [isPalletLocked, setIsPalletLocked] = useState<boolean>(true);
  const isPalletLockedRef = useRef<boolean>(true);
  isPalletLockedRef.current = isPalletLocked;
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Dragging & Camera Controls
  const activeDraggedSpoolId = useRef<number | null>(null);
  const [selectedSpoolId, setSelectedSpoolId] = useState<number | null>(null);
  const isDraggingPallet = useRef(false);
  const isDraggingCamera = useRef(false);
  const isPanning = useRef(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const previousMousePosition = useRef({ x: 0, y: 0 });

  // Camera Orbit Parameters
  const cameraTarget = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.25, -2));
  const cameraSpherical = useRef({ radius: 6.8, theta: 0.35, phi: Math.PI / 2.6 });

  // Mobile Multi-touch & Pinch-to-Zoom Refs
  const touchStartDist = useRef<number | null>(null);
  const touchStartRadius = useRef<number>(6.8);
  const touchStartMid = useRef<{ x: number; y: number } | null>(null);
  const isPinchZooming = useRef<boolean>(false);
  const [isWeightBadgeExpanded, setIsWeightBadgeExpanded] = useState<boolean>(false);

  // Modals & Info Cards
  const [showInfoCard, setShowInfoCard] = useState<boolean>(false);
  const [showHdLabelModal, setShowHdLabelModal] = useState<boolean>(false);
  const [hdLabelTab, setHdLabelTab] = useState<'coil' | 'pallet' | 'photo'>('coil');
  const [showIntakeModal, setShowIntakeModal] = useState<boolean>(false);
  const clickStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const clickedHitType = useRef<'pallet' | 'spool' | null>(null);

  // Keyboard navigation
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Spool dimensions
  const spoolRadius = 0.52;
  const spoolHeight = 0.28;
  const spoolFlangeRadius = 0.54;
  const spoolFlangeThick = 0.012;
  const totalSpoolHeight = spoolHeight + spoolFlangeThick * 2; // 0.304m
  const palletTopSurfaceY = 0.13;

  // Dynamic Live Weights Calculation
  const coilsOnPallet = useMemo(() => spools.filter(s => s.onPallet), [spools]);
  const countOnPallet = coilsOnPallet.length;
  const countOffPallet = spools.length - countOnPallet;

  const currentPalletNetWeight = useMemo(() => {
    return Number(coilsOnPallet.reduce((sum, s) => sum + (s.netWeight || palletData.netWeightPerRoll), 0).toFixed(1));
  }, [coilsOnPallet, palletData.netWeightPerRoll]);

  const currentPalletGrossWeight = useMemo(() => {
    return Number((coilsOnPallet.reduce((sum, s) => sum + (s.grossWeight || palletData.grossWeightPerRoll), 0) + (palletData.palletBaseTareWeight || 35)).toFixed(1));
  }, [coilsOnPallet, palletData.grossWeightPerRoll, palletData.palletBaseTareWeight]);

  // Update Camera Matrix Position
  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = cameraSpherical.current;
    const target = cameraTarget.current;

    const calcY = target.y + radius * Math.cos(phi);
    const finalY = Math.max(0.04, calcY);

    cameraRef.current.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = finalY;
    cameraRef.current.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(target);
  }, []);

  // Global ESC Key Listener
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showHdLabelModal) {
          setShowHdLabelModal(false);
        } else if (showIntakeModal) {
          setShowIntakeModal(false);
        } else if (handleExit) {
          handleExit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, [handleExit, showHdLabelModal, showIntakeModal]);

  // =========================================================================
  // LABEL 1: HIGH RESOLUTION INDIVIDUAL COIL SPECIFICATION LABEL TEXTURE
  // =========================================================================
  const createCoilLabelTexture = useCallback((coilIndex: number, spool: SpoolState | undefined, pData: CopperPalletData) => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // If THIS INDIVIDUAL SPOOL has an uploaded photo, render it on this spool ONLY!
    const specificPhoto = spool?.photoUrl;
    if (specificPhoto) {
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = 16;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const imgAspect = img.width / img.height;
        const canvasAspect = canvas.width / canvas.height;
        let drawW = canvas.width;
        let drawH = canvas.height;
        let drawX = 0;
        let drawY = 0;

        if (imgAspect > canvasAspect) {
          drawW = canvas.width;
          drawH = canvas.width / imgAspect;
          drawY = (canvas.height - drawH) / 2;
        } else {
          drawH = canvas.height;
          drawW = canvas.height * imgAspect;
          drawX = (canvas.width - drawW) / 2;
        }

        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // Neat industrial label border
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 14;
        ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

        tex.needsUpdate = true;
      };
      img.src = specificPhoto;
      return tex;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.lineWidth = 3;
    ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

    // BRAND LOGO SECTION
    const logoX = 230;
    const logoY = 640;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(logoX, logoY - 140, 155, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(logoX, logoY - 260);
    ctx.lineTo(logoX + 66, logoY - 60);
    ctx.lineTo(logoX + 34, logoY - 60);
    ctx.lineTo(logoX + 16, logoY - 105);
    ctx.lineTo(logoX - 16, logoY - 105);
    ctx.lineTo(logoX - 34, logoY - 60);
    ctx.lineTo(logoX - 66, logoY - 60);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = '900 56px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    const brandDisplay = pData.companyName.length > 18 ? pData.companyName.substring(0, 18) : pData.companyName;
    ctx.fillText(brandDisplay, logoX, logoY + 30);

    ctx.font = 'bold 28px Arial, Helvetica, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(pData.productShape || 'LWC COPPER COIL', logoX, logoY + 80);

    // SPECIFICATION TABLE
    const tableX = 470;
    const tableY = 40;
    const tableW = 1530;
    const tableH = 1320;

    const headerH = 125;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(tableX, tableY, tableW, headerH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pData.alloyStandard || 'SEAMLESS, C12200, ASTM B75', tableX + tableW / 2, tableY + headerH / 2);

    const rowCount = 9;
    const rowH = (tableH - headerH) / rowCount;
    const col1W = 220;
    const col2W = 320;
    const col3W = tableW - col1W - col2W;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4.5;
    ctx.strokeRect(tableX, tableY, tableW, tableH);

    for (let r = 0; r <= rowCount; r++) {
      ctx.beginPath();
      ctx.moveTo(tableX, tableY + headerH + r * rowH);
      ctx.lineTo(tableX + tableW, tableY + headerH + r * rowH);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(tableX + col1W, tableY + headerH);
    ctx.lineTo(tableX + col1W, tableY + headerH + 2 * rowH);
    ctx.moveTo(tableX + col1W, tableY + headerH + 3 * rowH);
    ctx.lineTo(tableX + col1W, tableY + headerH + 5 * rowH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tableX + col1W + col2W, tableY + headerH);
    ctx.lineTo(tableX + col1W + col2W, tableY + tableH);
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. SIZE
    ctx.font = '900 46px Arial, Helvetica, sans-serif';
    ctx.fillText('Size', tableX + col1W / 2, tableY + headerH + rowH);
    ctx.font = 'bold 38px Arial, Helvetica, sans-serif';
    ctx.fillText('(mm)', tableX + col1W + col2W / 2, tableY + headerH + rowH * 0.5);
    ctx.fillText('(in)', tableX + col1W + col2W / 2, tableY + headerH + rowH * 1.5);
    ctx.font = '900 54px Arial, Helvetica, sans-serif';
    ctx.fillText(pData.sizeMetric || '15.87*0.45', tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 0.5);
    ctx.fillText(pData.sizeInch || '5/8*0.018', tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 1.5);

    // 2. LENGTH
    ctx.font = '900 44px Arial, Helvetica, sans-serif';
    ctx.fillText('Length(m)', tableX + (col1W + col2W) / 2, tableY + headerH + rowH * 2.5);
    ctx.font = '900 54px Arial, Helvetica, sans-serif';
    ctx.fillText(`${pData.lengthMeters || 545}`, tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 2.5);

    // 3. WEIGHT
    const coilNet = spool?.netWeight || pData.coilWeights?.[coilIndex - 1]?.net || pData.netWeightPerRoll || 105.8;
    const coilGross = spool?.grossWeight || pData.coilWeights?.[coilIndex - 1]?.gross || (coilNet + 13.2);

    ctx.font = '900 46px Arial, Helvetica, sans-serif';
    ctx.fillText('Wt.', tableX + col1W / 2, tableY + headerH + rowH * 4);
    ctx.font = 'bold 38px Arial, Helvetica, sans-serif';
    ctx.fillText('Net (kg)', tableX + col1W + col2W / 2, tableY + headerH + rowH * 3.5);
    ctx.fillText('Gr. (kg)', tableX + col1W + col2W / 2, tableY + headerH + rowH * 4.5);
    ctx.font = '900 56px Arial, Helvetica, sans-serif';
    ctx.fillText(`${coilNet.toFixed(1)}`, tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 3.5);
    ctx.fillText(`${coilGross.toFixed(1)}`, tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 4.5);

    // 4. TEMPER
    ctx.font = '900 44px Arial, Helvetica, sans-serif';
    ctx.fillText('Temper', tableX + (col1W + col2W) / 2, tableY + headerH + rowH * 5.5);
    ctx.font = '900 54px Arial, Helvetica, sans-serif';
    ctx.fillText(pData.temper || 'O60', tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 5.5);

    // 5. DEFECT NO.
    ctx.font = '900 44px Arial, Helvetica, sans-serif';
    ctx.fillText('Defect NO.', tableX + (col1W + col2W) / 2, tableY + headerH + rowH * 6.5);
    ctx.font = '900 54px Arial, Helvetica, sans-serif';
    ctx.fillText(`${pData.defectNo !== undefined ? pData.defectNo : 1}`, tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 6.5);

    // 6. MFG. DATE
    ctx.font = '900 44px Arial, Helvetica, sans-serif';
    ctx.fillText('Mfg. Date', tableX + (col1W + col2W) / 2, tableY + headerH + rowH * 7.5);
    ctx.font = '900 52px Arial, Helvetica, sans-serif';
    ctx.fillText(pData.mfgDate || '2026.02.23', tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 7.5);

    // 7. BATCH NO.
    ctx.font = '900 44px Arial, Helvetica, sans-serif';
    ctx.fillText('Batch NO.', tableX + (col1W + col2W) / 2, tableY + headerH + rowH * 8.5);
    ctx.font = '900 52px Arial, Helvetica, sans-serif';
    const coilBatch = spool?.batchNo || pData.coilWeights?.[coilIndex - 1]?.batchNo || `${pData.batchNo || '260222PG2100'}${coilIndex}`;
    ctx.fillText(coilBatch, tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 8.5);

    // QC Stamp
    ctx.save();
    ctx.translate(tableX + col1W + col2W + col3W / 2 + 130, tableY + headerH + rowH * 6.6);
    ctx.rotate(-0.08);
    ctx.strokeStyle = 'rgba(29, 78, 216, 0.85)';
    ctx.fillStyle = 'rgba(29, 78, 216, 0.85)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 115, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 100, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QC PASSED', 0, -45);
    ctx.font = '900 38px Arial, sans-serif';
    ctx.fillText('APPROVED', 0, 8);
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText(pData.palletNo || 'PLT-101', 0, 52);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    tex.needsUpdate = true;
    return tex;
  }, []);

  // =========================================================================
  // LABEL 2: MASTER PALLET PACKING LIST & TOTAL WEIGHT LABEL TEXTURE
  // =========================================================================
  const createPalletMasterLabelTexture = useCallback((pData: CopperPalletData) => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 16;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(20, 20, canvas.width - 40, 140);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 58px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MASTER PALLET PACKING LIST / برچسب پالت', canvas.width / 2, 90);

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 46px Arial, Helvetica, sans-serif';
    ctx.fillText(`${pData.companyName} • ${pData.alloyStandard}`, canvas.width / 2, 220);

    const boxY = 280;
    const boxH = 500;
    ctx.fillStyle = '#022c22';
    ctx.fillRect(60, boxY, canvas.width - 120, boxH);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 6;
    ctx.strokeRect(60, boxY, canvas.width - 120, boxH);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 36px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TOTAL PALLET NET WEIGHT (وزن کل خالص پالت):', 100, boxY + 70);
    ctx.fillText('TOTAL PALLET GROSS WEIGHT (وزن کل ناخالص پالت):', 100, boxY + 230);
    ctx.fillText('COILS ON PALLET (تعداد کلاف):', 100, boxY + 390);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 84px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${pData.totalPalletNetWeight.toFixed(1)} KG`, canvas.width - 120, boxY + 75);
    ctx.fillText(`${pData.totalPalletGrossWeight.toFixed(1)} KG`, canvas.width - 120, boxY + 235);
    ctx.fillText(`${pData.numberOfCoils} ROLLS / کلاف`, canvas.width - 120, boxY + 395);

    const gridY = 820;
    const gridH = 480;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(60, gridY, canvas.width - 120, gridH);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 42px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'left';

    const row1Y = gridY + 80;
    const row2Y = gridY + 200;
    const row3Y = gridY + 320;
    const row4Y = gridY + 440;

    ctx.fillText(`SIZE: ${pData.sizeMetric} mm (${pData.sizeInch}")`, 90, row1Y);
    ctx.fillText(`LENGTH PER COIL: ${pData.lengthMeters} m`, 1050, row1Y);

    ctx.fillText(`PALLET NO: ${pData.palletNo}`, 90, row2Y);
    ctx.fillText(`ORDER NO: ${pData.orderNo}`, 1050, row2Y);

    ctx.fillText(`BATCH NO: ${pData.batchNo}`, 90, row3Y);
    ctx.fillText(`MFG DATE: ${pData.mfgDate}`, 1050, row3Y);

    ctx.fillText(`TARE WEIGHT: ${pData.palletBaseTareWeight} KG (PALLET WOOD)`, 90, row4Y);
    ctx.fillText(`TEMPER: ${pData.temper}`, 1050, row4Y);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Create High-Resolution 3D Billboard Canvas Texture for each Brand Signboard
  const createBrandBillboardTexture = useCallback((brand: CopperBrandZone) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // 1. Dark Carbon Industrial Background
    const bgGrad = ctx.createLinearGradient(0, 0, 1024, 600);
    bgGrad.addColorStop(0, '#0a0f1d');
    bgGrad.addColorStop(0.5, '#111827');
    bgGrad.addColorStop(1, '#0b1120');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 600);

    // Subtle diamond mesh pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1024; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 600);
      ctx.stroke();
    }
    for (let y = 0; y < 600; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // 2. Glowing Outer Brand Border
    ctx.strokeStyle = brand.color;
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 1004, 580);

    // Inner thin border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 22, 980, 556);

    // Hazard Stripes on left and right margins
    for (let y = 30; y < 570; y += 36) {
      ctx.fillStyle = brand.color;
      ctx.fillRect(26, y, 16, 18);
      ctx.fillRect(982, y, 16, 18);
    }

    // 3. Top Header Bar: Zone Code & Factory Tag
    ctx.fillStyle = brand.color;
    ctx.fillRect(50, 32, 924, 60);

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 28px "Vazirmatn", "IRANSans", Tahoma, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⚡ بارانداز تخصصی لوله و کلاف مس • ${brand.zoneCode}`, 950, 62);

    ctx.font = '900 22px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`ZONE ${brand.zoneCode}`, 70, 62);

    // 4. Large Bold Persian Brand Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px "Vazirmatn", "IRANSans", Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = brand.color;
    ctx.shadowBlur = 15;
    ctx.fillText(brand.nameFa, 512, 175);
    ctx.shadowBlur = 0;

    // 5. English Brand Name
    ctx.fillStyle = brand.color;
    ctx.font = '800 28px Arial, Helvetica, sans-serif';
    ctx.fillText(brand.nameEn, 512, 235);

    // Tagline
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 22px "Vazirmatn", "IRANSans", Tahoma, sans-serif';
    ctx.fillText(brand.tagline, 512, 280);

    // 6. Technical Specifications Cards Grid
    const cardY = 325;
    const cardH = 135;
    const cardW = 280;

    // Card 1: Alloy & Standard
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(70, cardY, cardW, cardH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = brand.color;
    ctx.font = '700 17px "Vazirmatn", Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('استاندارد و گرید آلیاژ', 70 + cardW / 2, cardY + 32);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 19px Arial, sans-serif';
    ctx.fillText(brand.standard, 70 + cardW / 2, cardY + 68);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 16px "Vazirmatn", Tahoma, sans-serif';
    ctx.fillText(brand.alloy, 70 + cardW / 2, cardY + 104);

    // Card 2: Application / Temper
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(372, cardY, cardW, cardH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = brand.color;
    ctx.font = '700 17px "Vazirmatn", Tahoma, sans-serif';
    ctx.fillText('کاربری و فرم محصول', 372 + cardW / 2, cardY + 32);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 20px "Vazirmatn", Tahoma, sans-serif';
    ctx.fillText('کلاف LWC صنعتی', 372 + cardW / 2, cardY + 68);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 16px "Vazirmatn", Tahoma, sans-serif';
    ctx.fillText('سرمایشی، برودتی و تهویه', 372 + cardW / 2, cardY + 104);

    // Card 3: Logistics & Staging Capacity
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(674, cardY, cardW, cardH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = brand.color;
    ctx.font = '700 17px "Vazirmatn", Tahoma, sans-serif';
    ctx.fillText('ظرفیت بارانداز زون', 674 + cardW / 2, cardY + 32);

    ctx.fillStyle = '#10b981';
    ctx.font = '900 22px Arial, sans-serif';
    ctx.fillText('5,000 KG MAX', 674 + cardW / 2, cardY + 68);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 16px "Vazirmatn", Tahoma, sans-serif';
    ctx.fillText('پالت‌های استاندارد یورو', 674 + cardW / 2, cardY + 104);

    // 7. Interactive Footer CTA
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = brand.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(70, 485, 884, 75, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(110, 522, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 23px "Vazirmatn", "IRANSans", Tahoma, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`محل استقرار و چیدمان پالت‌های مس ${brand.nameFa}`, 920, 522);

    ctx.fillStyle = brand.color;
    ctx.font = '700 18px "Vazirmatn", Tahoma, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('جهت انتقال و چیدمان پالت کلیک کنید 👈', 140, 522);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Create High-Resolution 3D Floor Bay Canvas Texture for each Brand
  const createBrandFloorBayTexture = useCallback((brand: CopperBrandZone) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // Dark sleek industrial pad for high contrast against concrete floor
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 1024, 1024);

    // Glowing vibrant brand border
    ctx.strokeStyle = brand.color;
    ctx.lineWidth = 16;
    ctx.strokeRect(12, 12, 1000, 1000);

    // Inner subtle background glow
    ctx.fillStyle = brand.accentBg || 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(30, 30, 964, 964);

    // Pallet Target Footprint (dashed box)
    ctx.strokeStyle = brand.color;
    ctx.lineWidth = 8;
    ctx.setLineDash([24, 16]);
    ctx.strokeRect(180, 180, 664, 664);
    ctx.setLineDash([]);

    // Corner alignment brackets
    const cSize = 90;
    const cThick = 18;
    ctx.fillStyle = brand.color;
    ctx.fillRect(160, 160, cSize, cThick);
    ctx.fillRect(160, 160, cThick, cSize);
    ctx.fillRect(864 - cSize, 160, cSize, cThick);
    ctx.fillRect(864 - cThick, 160, cThick, cSize);
    ctx.fillRect(160, 864 - cThick, cSize, cThick);
    ctx.fillRect(160, 864 - cSize, cThick, cSize);
    ctx.fillRect(864 - cSize, 864 - cThick, cSize, cThick);
    ctx.fillRect(864 - cThick, 864 - cSize, cThick, cSize);

    // Floor Text
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px "Vazirmatn", "IRANSans", Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`بارانداز پالت مس ${brand.nameFa}`, 512, 360);

    ctx.fillStyle = brand.color;
    ctx.font = '800 40px Arial, Helvetica, sans-serif';
    ctx.fillText(`${brand.nameEn} • ${brand.zoneCode}`, 512, 450);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 28px Arial, sans-serif';
    ctx.fillText(`STANDARD: ${brand.standard}`, 512, 530);
    ctx.fillText(`ALLOY: ${brand.alloy}`, 512, 580);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Create Grand Master Wall Banner for the entire warehouse
  const createMasterWallBannerTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // Clean modern deep navy header background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 2048, 256);

    // Sleek border
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 2028, 236);

    // Persian Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px "Vazirmatn", "IRANSans", Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('انبار تخصصی و بارانداز مرکزی لوله‌های مسی • تفکیک و چیدمان برندهای باهنر، آستریا، قائم، بابک، مهر اصل', 1024, 88);

    // English Brands List
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 28px Arial, Helvetica, sans-serif';
    ctx.fillText('BAHONAR  •  ASTERIA  •  GHAEM  •  BABAK  •  MEHR ASL  —  COPPER COIL PALLET DEPOT', 1024, 165);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Helper to build a complete 3D Spool group with meshes, winding, seals, labels, and hitboxes
  const buildSingleSpoolGroup = useCallback((i: number, pData: CopperPalletData) => {
    const singleSpoolGroup = new THREE.Group();
    singleSpoolGroup.name = `SPOOL_GROUP_${i}`;
    (singleSpoolGroup as any).spoolId = i;

    const cardboardMat = new THREE.MeshStandardMaterial({
      color: '#785434',
      roughness: 0.92,
      metalness: 0.04,
    });
    const innerCoreMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.85,
    });
    const rawCopperMat = new THREE.MeshStandardMaterial({
      color: '#d97706',
      roughness: 0.28,
      metalness: 0.88,
    });
    const copperGrooveMat = new THREE.MeshStandardMaterial({
      color: '#b45309',
      roughness: 0.35,
      metalness: 0.88,
    });
    const teflonMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.25,
      metalness: 0.05,
    });
    const teflonFilmMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.1,
      transmission: 0.75,
      opacity: 0.75,
      transparent: true,
      ior: 1.45,
    });

    // Bottom flange disc
    const bottomDiscGeo = new THREE.CylinderGeometry(spoolFlangeRadius, spoolFlangeRadius, spoolFlangeThick, 36);
    const bottomDisc = new THREE.Mesh(bottomDiscGeo, cardboardMat);
    bottomDisc.position.set(0, -spoolHeight / 2 - spoolFlangeThick / 2, 0);
    bottomDisc.castShadow = true;
    bottomDisc.receiveShadow = true;
    singleSpoolGroup.add(bottomDisc);

    // Inner Core Tube
    const innerCoreGeo = new THREE.CylinderGeometry(0.22, 0.22, spoolHeight, 28);
    const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    singleSpoolGroup.add(innerCore);

    // Raw Copper Wound Cylinder
    const rawCopperGeo = new THREE.CylinderGeometry(spoolRadius, spoolRadius, spoolHeight, 36, 12);
    const rawCopperMesh = new THREE.Mesh(rawCopperGeo, rawCopperMat);
    rawCopperMesh.castShadow = true;
    rawCopperMesh.receiveShadow = true;
    singleSpoolGroup.add(rawCopperMesh);

    // Copper Tube Windings
    for (let r = -5; r <= 5; r++) {
      const ringGeo = new THREE.TorusGeometry(spoolRadius + 0.002, 0.013, 10, 36);
      const ring = new THREE.Mesh(ringGeo, copperGrooveMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, r * (spoolHeight / 12), 0);
      singleSpoolGroup.add(ring);
    }

    // Top flange disc
    const topDiscGeo = new THREE.CylinderGeometry(spoolFlangeRadius, spoolFlangeRadius, spoolFlangeThick, 36);
    const topDisc = new THREE.Mesh(topDiscGeo, cardboardMat);
    topDisc.position.set(0, spoolHeight / 2 + spoolFlangeThick / 2, 0);
    topDisc.castShadow = true;
    topDisc.receiveShadow = true;
    singleSpoolGroup.add(topDisc);

    // TEFLON SEAL WRAPPER GROUP
    const teflonWrapGroup = new THREE.Group();
    teflonWrapGroup.name = `TEFLON_WRAP_${i}`;

    const teflonBandGeo = new THREE.CylinderGeometry(
      spoolRadius + 0.006,
      spoolRadius + 0.006,
      spoolHeight - 0.008,
      36,
      1,
      false
    );
    const teflonBandMesh = new THREE.Mesh(teflonBandGeo, teflonMat);
    teflonBandMesh.castShadow = true;
    teflonWrapGroup.add(teflonBandMesh);

    const teflonEdgeMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.4,
    });
    [-spoolHeight / 2 + 0.015, spoolHeight / 2 - 0.015].forEach(yPos => {
      const edgeRingGeo = new THREE.TorusGeometry(spoolFlangeRadius - 0.01, 0.015, 8, 36);
      const edgeRing = new THREE.Mesh(edgeRingGeo, teflonEdgeMat);
      edgeRing.rotation.x = Math.PI / 2;
      edgeRing.position.set(0, yPos, 0);
      teflonWrapGroup.add(edgeRing);
    });

    const outerFoilGeo = new THREE.CylinderGeometry(spoolFlangeRadius + 0.008, spoolFlangeRadius + 0.008, totalSpoolHeight, 36);
    const outerFoilMesh = new THREE.Mesh(outerFoilGeo, teflonFilmMat);
    teflonWrapGroup.add(outerFoilMesh);

    singleSpoolGroup.add(teflonWrapGroup);
    spoolTeflonWraps.current[i] = teflonWrapGroup;

    // SINGLE REALISTIC COIL SPECIFICATION LABEL (ONE SINGLE LABEL PER SPOOL)
    const currentSpool = spoolsRef.current.find(s => s.id === i);
    const coilLabelTexture = createCoilLabelTexture(i + 1, currentSpool, pData);
    const label1Mat = new THREE.MeshBasicMaterial({
      map: coilLabelTexture,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });

    // Realistic curved label on outer rim facing DIRECTLY FORWARD (+Z towards user camera)
    const labelArcWidth = 1.15;
    const label1Geo = new THREE.CylinderGeometry(
      spoolFlangeRadius + 0.007,
      spoolFlangeRadius + 0.007,
      0.21,
      36,
      1,
      true,
      -labelArcWidth / 2,
      labelArcWidth
    );
    const coilLabelMesh = new THREE.Mesh(label1Geo, label1Mat);
    coilLabelMesh.name = `SPOOL_LABEL_${i}`;
    coilLabelMesh.renderOrder = 30;
    singleSpoolGroup.add(coilLabelMesh);
    spoolCoilLabelMeshes.current[i] = coilLabelMesh;

    // Interactive Hitbox
    const spoolHitBoxGeo = new THREE.CylinderGeometry(spoolFlangeRadius + 0.08, spoolFlangeRadius + 0.08, totalSpoolHeight + 0.05, 16);
    const spoolHitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
    const spoolHitBox = new THREE.Mesh(spoolHitBoxGeo, spoolHitBoxMat);
    spoolHitBox.name = `SPOOL_HITBOX_${i}`;
    (spoolHitBox as any).spoolId = i;
    singleSpoolGroup.add(spoolHitBox);

    spool3DGroups.current[i] = singleSpoolGroup;
    return singleSpoolGroup;
  }, [createCoilLabelTexture, spoolFlangeRadius, spoolFlangeThick, spoolHeight, spoolRadius, totalSpoolHeight]);

  // Sync and dynamically instantiate / position all 3D Spools
  const update3DSpoolTransforms = useCallback(() => {
    const currentSpools = spoolsRef.current;
    let stackIndex = 0;

    // 1. Remove 3D groups of spools that no longer exist
    const currentIds = new Set(currentSpools.map(s => s.id));
    Object.keys(spool3DGroups.current).forEach(idStr => {
      const idNum = Number(idStr);
      if (!currentIds.has(idNum)) {
        const group = spool3DGroups.current[idNum];
        if (group && sceneRef.current) {
          sceneRef.current.remove(group);
        }
        delete spool3DGroups.current[idNum];
        delete spoolTeflonWraps.current[idNum];
        delete spoolCoilLabelMeshes.current[idNum];
      }
    });

    // 2. Position or create each spool
    currentSpools.forEach((s) => {
      let group = spool3DGroups.current[s.id];
      if (!group && sceneRef.current) {
        group = buildSingleSpoolGroup(s.id, palletDataRef.current);
        sceneRef.current.add(group);
      }
      if (!group) return;

      const teflonWrap = spoolTeflonWraps.current[s.id];
      if (s.onPallet) {
        const targetY = palletTopSurfaceY + (stackIndex + 0.5) * totalSpoolHeight;
        group.position.set(palletPos.current.x, targetY, palletPos.current.z);
        group.rotation.set(0, 0, 0);
        stackIndex++;
      } else {
        const floorY = totalSpoolHeight / 2 + 0.005;
        group.position.set(s.posX, floorY, s.posZ);
        group.rotation.set(0, 0, 0);
      }

      if (teflonWrap) {
        teflonWrap.visible = s.isSealed;
      }
    });

    if (topCardboardCapRef.current) {
      if (stackIndex > 0) {
        topCardboardCapRef.current.visible = true;
        const topOfStackY = palletTopSurfaceY + stackIndex * totalSpoolHeight;
        topCardboardCapRef.current.position.set(palletPos.current.x, topOfStackY + 0.0075, palletPos.current.z);
      } else {
        topCardboardCapRef.current.visible = false;
      }
    }
  }, [buildSingleSpoolGroup, palletTopSurfaceY, totalSpoolHeight]);

  useEffect(() => {
    update3DSpoolTransforms();
  }, [spools, update3DSpoolTransforms]);

  // Refresh a single spool's label texture
  const refreshSpoolLabelTexture = useCallback((spoolId: number) => {
    const currentData = palletDataRef.current;
    const spool = spoolsRef.current.find(s => s.id === spoolId);
    const coilMesh = spoolCoilLabelMeshes.current[spoolId];
    if (coilMesh && coilMesh.material) {
      const newCoilTex = createCoilLabelTexture(spoolId + 1, spool, currentData);
      (coilMesh.material as THREE.MeshBasicMaterial).map = newCoilTex;
      (coilMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
    }
  }, [createCoilLabelTexture]);

  // Refresh all label textures individually per spool
  const refreshAllLabelTextures = useCallback(() => {
    const currentData = palletDataRef.current;
    const currentSpools = spoolsRef.current;

    // Each spool receives its own individual label texture
    Object.keys(spoolCoilLabelMeshes.current).forEach((key) => {
      const i = Number(key);
      const coilMesh = spoolCoilLabelMeshes.current[i];
      if (coilMesh && coilMesh.material) {
        const spool = currentSpools.find(s => s.id === i);
        const newCoilTex = createCoilLabelTexture(i + 1, spool, currentData);
        (coilMesh.material as THREE.MeshBasicMaterial).map = newCoilTex;
        (coilMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
      }
    });

    // Master pallet label on wooden pallet
    if (palletMasterLabelMesh.current && palletMasterLabelMesh.current.material) {
      const pltTex = createPalletMasterLabelTexture(currentData);
      (palletMasterLabelMesh.current.material as THREE.MeshBasicMaterial).map = pltTex;
      (palletMasterLabelMesh.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
    }
  }, [createCoilLabelTexture, createPalletMasterLabelTexture]);

  const handleApplyNewPalletData = (newData: CopperPalletData) => {
    setPalletData(newData);
    palletDataRef.current = newData;

    const rollCount = Math.max(1, Math.min(5, newData.numberOfCoils || 5));
    const newSpoolList: SpoolState[] = [];

    // Calculate individual roll weight based on totalPalletNetWeight
    const calculatedNet = newData.totalPalletNetWeight && rollCount > 0 
      ? Number((newData.totalPalletNetWeight / rollCount).toFixed(1))
      : (newData.netWeightPerRoll || 105.8);
    const calculatedGross = Number((calculatedNet + 13.2).toFixed(1));

    // Stacks on the pallet
    for (let i = 0; i < rollCount; i++) {
      const net = newData.coilWeights?.[i]?.net || calculatedNet;
      const gr = newData.coilWeights?.[i]?.gross || (net + 13.2);
      newSpoolList.push({
        id: i,
        onPallet: true,
        isSealed: true,
        posX: palletPos.current.x,
        posZ: palletPos.current.z,
        netWeight: Number(net.toFixed(1)),
        grossWeight: Number(gr.toFixed(1)),
        batchNo: `${newData.batchNo || '260222PG'}-${i + 1}`,
      });
    }

    // Explicit user request: "توی سالن هم یه قرقره اضافه بشه"
    // Add a separated spool on the salon floor with the exact new label photo visible!
    const floorSpoolId = rollCount;
    const floorSpoolX = palletPos.current.x - 1.6;
    const floorSpoolZ = palletPos.current.z + 1.15;

    newSpoolList.push({
      id: floorSpoolId,
      onPallet: false,
      isSealed: false, // Unsealed so copper and label with user photo are immediately visible!
      posX: floorSpoolX,
      posZ: floorSpoolZ,
      netWeight: calculatedNet,
      grossWeight: calculatedGross,
      batchNo: `${newData.batchNo || '260222PG'}-${floorSpoolId + 1}`,
      photoUrl: newData.uploadedImageUrl, // ONLY this spool gets this photo!
    });

    setSpools(newSpoolList);
    spoolsRef.current = newSpoolList;
    setSelectedSpoolId(floorSpoolId);

    // Toast notification for user confirmation
    const toastTxt = `کلاف جدید مس شرکت ${newData.companyName} با سایز ${newData.sizeMetric} (${newData.sizeInch || ''}) و وزن کل ${newData.totalPalletNetWeight} kg با تصویر برچسب اختصاصی در سالن ثبت شد.`;
    setNotificationToast(toastTxt);
    setTimeout(() => setNotificationToast(null), 8000);

    setTimeout(() => {
      update3DSpoolTransforms();
      refreshAllLabelTextures();

      // Orient camera directly at the new floor spool at eye level facing its label
      cameraTarget.current.set(floorSpoolX, totalSpoolHeight / 2, floorSpoolZ);
      cameraSpherical.current = {
        radius: 1.45,
        theta: 1.15,
        phi: Math.PI / 2.02,
      };
      updateCameraPosition();
      setShowInfoCard(true);
    }, 80);
  };

  // Upload or replace photo specifically for an individual spool
  const handleUploadForSpool = (spoolId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSpools(prev => {
        const next = prev.map(s => s.id === spoolId ? { ...s, photoUrl: dataUrl } : s);
        spoolsRef.current = next;
        return next;
      });
      setTimeout(() => {
        refreshSpoolLabelTexture(spoolId);
      }, 60);
      setNotificationToast(`تصویر برچسب قرقره شماره ${spoolId + 1} با موفقیت ثبت شد و منحصراً روی همین قرقره اعمال گردید.`);
      setTimeout(() => setNotificationToast(null), 6000);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Remove photo from specific spool and return to crisp factory vector label
  const handleRemoveSpoolPhoto = (spoolId: number) => {
    setSpools(prev => {
      const next = prev.map(s => s.id === spoolId ? { ...s, photoUrl: undefined } : s);
      spoolsRef.current = next;
      return next;
    });
    setTimeout(() => {
      refreshSpoolLabelTexture(spoolId);
    }, 60);
    setNotificationToast(`عکس اختصاصی قرقره شماره ${spoolId + 1} برداشته شد و برچسب استاندارد فعال گردید.`);
    setTimeout(() => setNotificationToast(null), 5000);
  };

  // =========================================================================
  // 3D SCENE & COMPLETE INDUSTRIAL HANGAR (سوله صنعتی)
  // =========================================================================
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#334155');
    scene.fog = new THREE.FogExp2('#334155', 0.012);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 120);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;

    // 4. Natural Realistic Lighting System
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.85);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight('#e2e8f0', '#1e293b', 0.75);
    scene.add(hemiLight);

    // Main directional sunlight through high windows/skylights
    const mainSun = new THREE.DirectionalLight('#fffbeb', 1.85);
    mainSun.position.set(14, 20, 10);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    mainSun.shadow.camera.near = 0.5;
    mainSun.shadow.camera.far = 50;
    mainSun.shadow.camera.left = -18;
    mainSun.shadow.camera.right = 18;
    mainSun.shadow.camera.top = 18;
    mainSun.shadow.camera.bottom = -18;
    mainSun.shadow.bias = -0.0003;
    scene.add(mainSun);

    const fillLight = new THREE.DirectionalLight('#94a3b8', 0.8);
    fillLight.position.set(-14, 15, -8);
    scene.add(fillLight);

    // Front soft focus spot on copper pallet
    const frontSoftSpot = new THREE.SpotLight('#ffffff', 1.8, 25, Math.PI / 3.2, 0.35);
    frontSoftSpot.position.set(0, 7.5, 5);
    frontSoftSpot.target.position.set(0, 1.2, -2);
    scene.add(frontSoftSpot);
    scene.add(frontSoftSpot.target);

    // -------------------------------------------------------------
    // 5. REALISTIC NATURAL INDUSTRIAL HANGAR ARCHITECTURE
    // -------------------------------------------------------------
    const hangarWidth = 28;
    const hangarLength = 44;
    const eavesHeight = 6.8;
    const apexHeight = 9.8;

    // A. Realistic Industrial Polished Concrete Epoxy Floor
    const floorGeo = new THREE.PlaneGeometry(hangarWidth + 4, hangarLength + 4, 32, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#27303f',
      roughness: 0.38,
      metalness: 0.28,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Subtle Clean Pallet Shadow / Ring Base
    const zoneGeo = new THREE.RingGeometry(0.85, 0.95, 48);
    const zoneMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
    zoneMesh.rotation.x = -Math.PI / 2;
    zoneMesh.position.set(palletPos.current.x, 0.006, palletPos.current.z);
    scene.add(zoneMesh);
    palletZoneRef.current = zoneMesh;

    // Realistic Materials for Structure
    const steelColumnMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.45,
      metalness: 0.75,
    });

    const steelTrussMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.5,
      metalness: 0.7,
    });

    const wallPanelMat = new THREE.MeshStandardMaterial({
      color: '#64748b',
      roughness: 0.65,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      roughness: 0.7,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });

    const skylightMat = new THREE.MeshPhysicalMaterial({
      color: '#e2e8f0',
      roughness: 0.15,
      transmission: 0.85,
      transparent: true,
      opacity: 0.8,
      ior: 1.5,
    });

    // B. Industrial Steel I-Beam Columns (ستون‌های فولادی تیره و مشخص)
    const columnZPositions = [-20, -10, 0, 10, 20];
    columnZPositions.forEach(zPos => {
      [-hangarWidth / 2, hangarWidth / 2].forEach(xPos => {
        const columnGroup = new THREE.Group();
        columnGroup.position.set(xPos, 0, zPos);

        const webGeo = new THREE.BoxGeometry(0.14, eavesHeight, 0.48);
        const web = new THREE.Mesh(webGeo, steelColumnMat);
        web.position.y = eavesHeight / 2;
        web.castShadow = true;
        web.receiveShadow = true;
        columnGroup.add(web);

        [-0.08, 0.08].forEach(fx => {
          const flangeGeo = new THREE.BoxGeometry(0.028, eavesHeight, 0.52);
          const flange = new THREE.Mesh(flangeGeo, steelColumnMat);
          flange.position.set(fx, eavesHeight / 2, 0);
          flange.castShadow = true;
          columnGroup.add(flange);
        });

        scene.add(columnGroup);
      });
    });

    // C. Roof Steel Trusses & Girders (خرپاهای فلزی کاملاً مشخص و سه‌بعدی سقف)
    columnZPositions.forEach(zPos => {
      const trussGroup = new THREE.Group();
      trussGroup.position.set(0, 0, zPos);

      const bottomBeamGeo = new THREE.BoxGeometry(hangarWidth, 0.24, 0.22);
      const bottomBeam = new THREE.Mesh(bottomBeamGeo, steelTrussMat);
      bottomBeam.position.y = eavesHeight;
      bottomBeam.castShadow = true;
      trussGroup.add(bottomBeam);

      const rafterHalfWidth = hangarWidth / 2;
      const rafterHeightDiff = apexHeight - eavesHeight;
      const rafterLength = Math.hypot(rafterHalfWidth, rafterHeightDiff);
      const rafterAngle = Math.atan2(rafterHeightDiff, rafterHalfWidth);

      const leftRafterGeo = new THREE.BoxGeometry(rafterLength, 0.26, 0.22);
      const leftRafter = new THREE.Mesh(leftRafterGeo, steelTrussMat);
      leftRafter.position.set(-rafterHalfWidth / 2, (eavesHeight + apexHeight) / 2, 0);
      leftRafter.rotation.z = rafterAngle;
      leftRafter.castShadow = true;
      trussGroup.add(leftRafter);

      const rightRafter = new THREE.Mesh(leftRafterGeo, steelTrussMat);
      rightRafter.position.set(rafterHalfWidth / 2, (eavesHeight + apexHeight) / 2, 0);
      rightRafter.rotation.z = -rafterAngle;
      rightRafter.castShadow = true;
      trussGroup.add(rightRafter);

      const numStruts = 6;
      for (let s = 1; s <= numStruts; s++) {
        const sx = -rafterHalfWidth + (s * hangarWidth) / (numStruts + 1);
        const distFromCenter = Math.abs(sx);
        const topY = apexHeight - (distFromCenter / rafterHalfWidth) * rafterHeightDiff;
        const strutH = topY - eavesHeight;
        const strutGeo = new THREE.CylinderGeometry(0.05, 0.05, strutH, 12);
        const strut = new THREE.Mesh(strutGeo, steelTrussMat);
        strut.position.set(sx, eavesHeight + strutH / 2, 0);
        strut.castShadow = true;
        trussGroup.add(strut);
      }

      scene.add(trussGroup);
    });

    // Longitudinal Roof Purlins
    [-11, -7, -3, 0, 3, 7, 11].forEach(px => {
      const distFromCenter = Math.abs(px);
      const py = apexHeight - (distFromCenter / (hangarWidth / 2)) * (apexHeight - eavesHeight);
      const purlinGeo = new THREE.BoxGeometry(0.14, 0.14, hangarLength);
      const purlin = new THREE.Mesh(purlinGeo, steelTrussMat);
      purlin.position.set(px, py + 0.08, 0);
      scene.add(purlin);
    });

    // D. Roof Panels & Skylights
    const roofHalfWidth = hangarWidth / 2;
    const roofSlopeLen = Math.hypot(roofHalfWidth, apexHeight - eavesHeight);
    const roofAngle = Math.atan2(apexHeight - eavesHeight, roofHalfWidth);

    const leftRoofGeo = new THREE.PlaneGeometry(roofSlopeLen, hangarLength);
    const leftRoof = new THREE.Mesh(leftRoofGeo, roofMat);
    leftRoof.position.set(-roofHalfWidth / 2, (eavesHeight + apexHeight) / 2 + 0.16, 0);
    leftRoof.rotation.x = Math.PI / 2;
    leftRoof.rotation.y = -roofAngle;
    scene.add(leftRoof);

    const rightRoofGeo = new THREE.PlaneGeometry(roofSlopeLen, hangarLength);
    const rightRoof = new THREE.Mesh(rightRoofGeo, roofMat);
    rightRoof.position.set(roofHalfWidth / 2, (eavesHeight + apexHeight) / 2 + 0.16, 0);
    rightRoof.rotation.x = Math.PI / 2;
    rightRoof.rotation.y = roofAngle;
    scene.add(rightRoof);

    const skylightGeo = new THREE.PlaneGeometry(2.4, hangarLength - 2);
    const skylight = new THREE.Mesh(skylightGeo, skylightMat);
    skylight.position.set(0, apexHeight + 0.22, 0);
    skylight.rotation.x = Math.PI / 2;
    scene.add(skylight);

    // E. Walls & Industrial Shutter Door
    const leftWallGeo = new THREE.PlaneGeometry(hangarLength, eavesHeight);
    const leftWall = new THREE.Mesh(leftWallGeo, wallPanelMat);
    leftWall.position.set(-hangarWidth / 2, eavesHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(leftWallGeo, wallPanelMat);
    rightWall.position.set(hangarWidth / 2, eavesHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    const backWallGroup = new THREE.Group();
    backWallGroup.position.set(0, 0, -hangarLength / 2);

    const backWallGeo = new THREE.PlaneGeometry(hangarWidth, eavesHeight);
    const backWall = new THREE.Mesh(backWallGeo, wallPanelMat);
    backWall.position.y = eavesHeight / 2;
    backWall.receiveShadow = true;
    backWallGroup.add(backWall);

    const doorW = 7.5;
    const doorH = 5.2;
    const doorGeo = new THREE.BoxGeometry(doorW, doorH, 0.12);
    const doorMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.5,
      metalness: 0.65,
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, doorH / 2, 0.08);
    door.castShadow = true;
    backWallGroup.add(door);

    for (let sl = 0.4; sl < doorH; sl += 0.35) {
      const slatGeo = new THREE.BoxGeometry(doorW - 0.1, 0.02, 0.14);
      const slatMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.8 });
      const slat = new THREE.Mesh(slatGeo, slatMat);
      slat.position.set(0, sl, 0.09);
      backWallGroup.add(slat);
    }
    scene.add(backWallGroup);

    // =============================================================
    // BRAND BILLBOARDS & STAGING BAYS ON FRONT WALL & FLOOR
    // =============================================================
    
    // 1. Grand Master Wall Header
    const masterBannerTex = createMasterWallBannerTexture();
    const masterBannerGeo = new THREE.PlaneGeometry(24, 1.25);
    const masterBannerMat = new THREE.MeshBasicMaterial({
      map: masterBannerTex,
      side: THREE.FrontSide
    });
    const masterBannerMesh = new THREE.Mesh(masterBannerGeo, masterBannerMat);
    masterBannerMesh.position.set(0, 6.25, -hangarLength / 2 + 0.12);
    scene.add(masterBannerMesh);

    const masterFrameGeo = new THREE.BoxGeometry(24.2, 1.35, 0.06);
    const masterFrameMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.7, metalness: 0.8 });
    const masterFrame = new THREE.Mesh(masterFrameGeo, masterFrameMat);
    masterFrame.position.set(0, 6.25, -hangarLength / 2 + 0.08);
    scene.add(masterFrame);

    // 2. The 5 Major Brand Billboards on the Front Wall (باهنر، آستریا، قائم، بابک، مهراصل)
    BRAND_ZONES.forEach((brand) => {
      const boardGroup = new THREE.Group();
      boardGroup.position.set(brand.boardX, brand.boardY, brand.boardZ);

      const boardWidth = brand.id === 'ghaem' ? 4.4 : 4.0;
      const boardHeight = brand.id === 'ghaem' ? 2.3 : 2.4;
      const boardDepth = 0.08;

      // Outer Heavy Dark Frame
      const frameGeo = new THREE.BoxGeometry(boardWidth + 0.16, boardHeight + 0.16, boardDepth);
      const frameMat = new THREE.MeshStandardMaterial({
        color: '#0f172a',
        roughness: 0.4,
        metalness: 0.8,
      });
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.castShadow = true;
      boardGroup.add(frameMesh);

      // Brand Accent Bezel
      const accentGeo = new THREE.BoxGeometry(boardWidth + 0.06, boardHeight + 0.06, boardDepth + 0.01);
      const accentMat = new THREE.MeshStandardMaterial({
        color: brand.color,
        roughness: 0.35,
        metalness: 0.7,
      });
      const accentMesh = new THREE.Mesh(accentGeo, accentMat);
      boardGroup.add(accentMesh);

      // Signboard Canvas Texture Plane
      const signTex = createBrandBillboardTexture(brand);
      const signGeo = new THREE.PlaneGeometry(boardWidth, boardHeight);
      const signMat = new THREE.MeshBasicMaterial({
        map: signTex,
        side: THREE.FrontSide,
      });
      const signMesh = new THREE.Mesh(signGeo, signMat);
      signMesh.position.z = boardDepth / 2 + 0.015;
      signMesh.name = `BRAND_BOARD_${brand.id}`;
      (signMesh as any).brandId = brand.id;
      boardGroup.add(signMesh);
      brandBoardMeshes.current[brand.id] = signMesh;

      scene.add(boardGroup);

      // 3. Dedicated High-Contrast Floor Staging Bay for this brand
      const bayGroup = new THREE.Group();
      bayGroup.position.set(brand.floorBayX, 0, brand.floorBayZ);

      const baySize = 3.2;
      const bayTex = createBrandFloorBayTexture(brand);
      const bayGeo = new THREE.PlaneGeometry(baySize, baySize);
      const bayMat = new THREE.MeshBasicMaterial({
        map: bayTex,
        transparent: true,
        opacity: 0.98,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      });
      const bayMesh = new THREE.Mesh(bayGeo, bayMat);
      bayMesh.rotation.x = -Math.PI / 2;
      bayMesh.position.y = 0.005;
      bayMesh.name = `BRAND_BAY_${brand.id}`;
      (bayMesh as any).brandId = brand.id;
      bayGroup.add(bayMesh);
      brandBayMeshes.current[brand.id] = bayMesh;

      scene.add(bayGroup);
    });
    
    // -------------------------------------------------------------
    // 6. REALISTIC EURO WOODEN PALLET (پالت چوبی کلاف‌های مس)
    // -------------------------------------------------------------
    const palletGroup = new THREE.Group();
    palletGroup.position.set(palletPos.current.x, 0, palletPos.current.z);

    const woodMat = new THREE.MeshStandardMaterial({
      color: '#b5835a',
      roughness: 0.88,
      metalness: 0.05,
    });

    const palletWidth = 1.25;
    const palletLength = 1.25;

    // 3 bottom skids
    [-0.52, 0, 0.52].forEach((xOffset) => {
      const bottomSkidGeo = new THREE.BoxGeometry(0.12, 0.024, palletLength);
      const bottomSkid = new THREE.Mesh(bottomSkidGeo, woodMat);
      bottomSkid.position.set(xOffset, 0.012, 0);
      bottomSkid.castShadow = true;
      bottomSkid.receiveShadow = true;
      palletGroup.add(bottomSkid);

      [-0.52, 0, 0.52].forEach((zOffset) => {
        const blockGeo = new THREE.BoxGeometry(0.12, 0.075, 0.12);
        const block = new THREE.Mesh(blockGeo, woodMat);
        block.position.set(xOffset, 0.024 + 0.0375, zOffset);
        block.castShadow = true;
        block.receiveShadow = true;
        palletGroup.add(block);
      });
    });

    // 7 Top Deck Planks
    const numTopPlanks = 7;
    const plankWidth = 0.135;
    const plankThick = 0.022;
    const spacing = (palletLength - numTopPlanks * plankWidth) / (numTopPlanks - 1);

    for (let p = 0; p < numTopPlanks; p++) {
      const zPos = -palletLength / 2 + plankWidth / 2 + p * (plankWidth + spacing);
      const plankGeo = new THREE.BoxGeometry(palletWidth, plankThick, plankWidth);
      const plank = new THREE.Mesh(plankGeo, woodMat);
      plank.position.set(0, 0.024 + 0.075 + plankThick / 2, zPos);
      plank.castShadow = true;
      plank.receiveShadow = true;
      palletGroup.add(plank);
    }

    // Interactive Hitbox for Pallet
    const palletHitBoxGeo = new THREE.BoxGeometry(palletWidth + 0.1, 0.22, palletLength + 0.1);
    const palletHitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
    const palletHitBox = new THREE.Mesh(palletHitBoxGeo, palletHitBoxMat);
    palletHitBox.position.set(0, 0.11, 0);
    palletHitBox.name = 'PALLET_HITBOX';
    palletGroup.add(palletHitBox);

    // Master Pallet Packing List sticker on the front runner of the wooden pallet
    const palletMasterTex = createPalletMasterLabelTexture(palletDataRef.current);
    const pltLabelMat = new THREE.MeshBasicMaterial({
      map: palletMasterTex,
      side: THREE.DoubleSide,
    });
    const pltLabelGeo = new THREE.PlaneGeometry(0.28, 0.14);
    const pltLabelMesh = new THREE.Mesh(pltLabelGeo, pltLabelMat);
    pltLabelMesh.position.set(0, 0.08, palletLength / 2 + 0.003);
    pltLabelMesh.name = 'PALLET_MASTER_LABEL_MESH';
    palletGroup.add(pltLabelMesh);
    palletMasterLabelMesh.current = pltLabelMesh;

    scene.add(palletGroup);
    palletGroupRef.current = palletGroup;

    // -------------------------------------------------------------
    // 7. MATERIALS & 5 COPPER SPOOLS (کلاف‌ها و قرقره‌های مس)
    // -------------------------------------------------------------
    const rawCopperMat = new THREE.MeshStandardMaterial({
      color: '#d97706',
      roughness: 0.28,
      metalness: 0.92,
    });

    const copperGrooveMat = new THREE.MeshStandardMaterial({
      color: '#b45309',
      roughness: 0.32,
      metalness: 0.88,
    });

    const cardboardMat = new THREE.MeshStandardMaterial({
      color: '#785434',
      roughness: 0.92,
      metalness: 0.04,
    });

    const innerCoreMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.85,
    });

    const teflonMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.25,
      metalness: 0.05,
    });

    const teflonFilmMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.1,
      transmission: 0.75,
      opacity: 0.75,
      transparent: true,
      ior: 1.45,
    });

    const initialPalletMasterTex = createPalletMasterLabelTexture(palletDataRef.current);

    spoolsRef.current.forEach((s) => {
      const singleSpoolGroup = buildSingleSpoolGroup(s.id, palletDataRef.current);
      scene.add(singleSpoolGroup);
    });

    // Top protective cardboard cap
    const topCapGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.015, 36);
    const topCap = new THREE.Mesh(topCapGeo, cardboardMat);
    topCap.position.set(palletPos.current.x, palletTopSurfaceY + 5 * totalSpoolHeight + 0.0075, palletPos.current.z);
    topCap.castShadow = true;
    scene.add(topCap);
    topCardboardCapRef.current = topCap;

    update3DSpoolTransforms();

    // -------------------------------------------------------------
    // 8. ANIMATION LOOP & KEYBOARD CONTROLS
    // -------------------------------------------------------------
    let lastTime = performance.now();

    const animate = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (cameraRef.current && !isDraggingPallet.current && activeDraggedSpoolId.current === null) {
        // Orbit WASD / Arrow Keys Smooth Navigation
        const speed = 7.5 * delta;
        const forward = new THREE.Vector3();
        cameraRef.current.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(cameraRef.current.up, forward).normalize();

        const moveVec = new THREE.Vector3();
        if (keysPressed.current['w'] || keysPressed.current['arrowup']) moveVec.add(forward);
        if (keysPressed.current['s'] || keysPressed.current['arrowdown']) moveVec.sub(forward);
        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) moveVec.add(right);
        if (keysPressed.current['d'] || keysPressed.current['arrowright']) moveVec.sub(right);

        if (moveVec.lengthSq() > 0) {
          moveVec.normalize().multiplyScalar(speed);
          cameraTarget.current.add(moveVec);
          updateCameraPosition();
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Initial Camera Setup
    updateCameraPosition();

    // Native Wheel Event Handler for Direct, Fast & Predictable Smooth Zooming
    const canvasEl = canvasRef.current;
    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 30;
      else if (e.deltaMode === 2) delta *= 300;

      // Smooth & responsive forward / backward zooming across the entire hangar
      const clampedDelta = Math.max(-180, Math.min(180, delta));

      if (cameraRef.current) {
        const forward = new THREE.Vector3();
        cameraRef.current.getWorldDirection(forward);

        if (clampedDelta < 0) {
          // Scrolling forward: Zoom in / move forward towards whatever user is looking at
          const forwardDist = Math.abs(clampedDelta) * 0.022;
          cameraTarget.current.addScaledVector(forward, forwardDist);
          // Also tighten radius smoothly
          cameraSpherical.current.radius = Math.max(0.8, cameraSpherical.current.radius * 0.94);
        } else {
          // Scrolling backward: Zoom out / move backward
          const backDist = Math.abs(clampedDelta) * 0.022;
          cameraTarget.current.addScaledVector(forward, -backDist);
          // Expand radius smoothly
          cameraSpherical.current.radius = Math.min(14, cameraSpherical.current.radius * 1.06);
        }

        // Clamp target inside warehouse boundaries
        cameraTarget.current.x = Math.max(-28, Math.min(28, cameraTarget.current.x));
        cameraTarget.current.y = Math.max(0.3, Math.min(12, cameraTarget.current.y));
        cameraTarget.current.z = Math.max(-24, Math.min(24, cameraTarget.current.z));

        updateCameraPosition();
      }
    };

    // Native Touch Event Handlers for Mobile Pinch-to-Zoom (Spread = Zoom In, Pinch = Zoom Out)
    const handleNativeTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
        isPinchZooming.current = true;
        isDraggingCamera.current = false;
        isPanning.current = false;
        activeDraggedSpoolId.current = null;
        isDraggingPallet.current = false;

        const t0 = e.touches[0];
        const t1 = e.touches[1];
        touchStartDist.current = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      } else if (e.touches.length === 1) {
        isPinchZooming.current = false;
        touchStartDist.current = null;
        previousMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleNativeTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 && touchStartDist.current !== null && cameraRef.current) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const currentDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        const distDiff = currentDist - touchStartDist.current;
        touchStartDist.current = currentDist;

        const forward = new THREE.Vector3();
        cameraRef.current.getWorldDirection(forward);

        // Spread fingers = move forward into view, pinch = move backward
        const step = distDiff * 0.035;
        cameraTarget.current.addScaledVector(forward, step);
        cameraTarget.current.x = Math.max(-28, Math.min(28, cameraTarget.current.x));
        cameraTarget.current.y = Math.max(0.3, Math.min(12, cameraTarget.current.y));
        cameraTarget.current.z = Math.max(-24, Math.min(24, cameraTarget.current.z));

        if (distDiff > 0) {
          cameraSpherical.current.radius = Math.max(0.8, cameraSpherical.current.radius * 0.96);
        } else {
          cameraSpherical.current.radius = Math.min(14, cameraSpherical.current.radius * 1.04);
        }

        updateCameraPosition();
      }
    };

    const handleNativeTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPinchZooming.current = false;
        touchStartDist.current = null;
      }
    };

    canvasEl.addEventListener('wheel', handleNativeWheel, { passive: false });
    canvasEl.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
    canvasEl.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    canvasEl.addEventListener('touchend', handleNativeTouchEnd, { passive: false });
    canvasEl.addEventListener('touchcancel', handleNativeTouchEnd, { passive: false });

    // Window Resize Handling
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      canvasEl.removeEventListener('wheel', handleNativeWheel);
      canvasEl.removeEventListener('touchstart', handleNativeTouchStart);
      canvasEl.removeEventListener('touchmove', handleNativeTouchMove);
      canvasEl.removeEventListener('touchend', handleNativeTouchEnd);
      canvasEl.removeEventListener('touchcancel', handleNativeTouchEnd);
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [createCoilLabelTexture, createPalletMasterLabelTexture, update3DSpoolTransforms, updateCameraPosition]);

  // Keyboard navigation listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Raycasting helper
  const checkIntersections = (clientX: number, clientY: number) => {
    if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return null;

    const rect = canvasRef.current.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), cameraRef.current);

    const hitObjects: THREE.Object3D[] = [];

    Object.values(spool3DGroups.current).forEach(g => {
      const hitBox = g.getObjectByName(`SPOOL_HITBOX_${(g as any).spoolId}`);
      if (hitBox) hitObjects.push(hitBox);
    });

    if (palletGroupRef.current) {
      const pBox = palletGroupRef.current.getObjectByName('PALLET_HITBOX');
      if (pBox) hitObjects.push(pBox);
    }

    Object.values(brandBoardMeshes.current).forEach(mesh => {
      if (mesh) hitObjects.push(mesh);
    });

    Object.values(brandBayMeshes.current).forEach(mesh => {
      if (mesh) hitObjects.push(mesh);
    });

    const intersects = raycaster.intersectObjects(hitObjects, false);

    if (intersects.length > 0) {
      const firstHit = intersects[0];
      const hitName = firstHit.object.name;

      const hitOnFloor = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane.current, hitOnFloor);

      if (hitName.startsWith('SPOOL_HITBOX_')) {
        const spoolId = (firstHit.object as any).spoolId as number;
        return { type: 'spool' as const, spoolId, point: firstHit.point, hitOnFloor };
      }
      if (hitName === 'PALLET_HITBOX') {
        return { type: 'pallet' as const, point: firstHit.point, hitOnFloor };
      }
      if (hitName.startsWith('BRAND_BOARD_') || hitName.startsWith('BRAND_BAY_')) {
        const brandId = (firstHit.object as any).brandId as 'bahonar' | 'asteria' | 'ghaem' | 'babak' | 'mehrasl';
        return { type: 'brand' as const, brandId, point: firstHit.point, hitOnFloor };
      }
    }

    return null;
  };

  // Double Click: Unstack to floor or Restack to pallet
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = checkIntersections(e.clientX, e.clientY);
    if (!hit || hit.type !== 'spool' || hit.spoolId === undefined) return;

    const targetSpoolId = hit.spoolId;
    setSelectedSpoolId(targetSpoolId);
    const currentSpool = spoolsRef.current.find(s => s.id === targetSpoolId);
    if (!currentSpool) return;

    if (currentSpool.onPallet) {
      const separatedCount = spoolsRef.current.filter(s => !s.onPallet).length;
      const angle = (separatedCount * (Math.PI / 3)) + 0.4;
      const dist = 1.95;
      const targetFloorX = palletPos.current.x + Math.cos(angle) * dist;
      const targetFloorZ = palletPos.current.z + Math.sin(angle) * dist;

      setSpools(prev => prev.map(s => s.id === targetSpoolId ? {
        ...s,
        onPallet: false,
        isSealed: false,
        posX: targetFloorX,
        posZ: targetFloorZ,
      } : s));
    } else {
      setSpools(prev => prev.map(s => s.id === targetSpoolId ? {
        ...s,
        onPallet: true,
        isSealed: true,
        posX: palletPos.current.x,
        posZ: palletPos.current.z,
      } : s));
    }
  };

  // Select and Stack Pallet in a Brand Zone
  const handleSelectBrandZone = useCallback((brandId: 'bahonar' | 'asteria' | 'ghaem' | 'babak' | 'mehrasl') => {
    const targetBrand = BRAND_ZONES.find(b => b.id === brandId);
    if (!targetBrand) return;

    setActiveBrandId(brandId);

    // 1. Move Pallet Position to target Brand Floor Bay
    const targetX = targetBrand.floorBayX;
    const targetZ = targetBrand.floorBayZ;

    palletPos.current.x = targetX;
    palletPos.current.z = targetZ;

    if (palletGroupRef.current) {
      palletGroupRef.current.position.set(targetX, 0, targetZ);
    }
    if (palletZoneRef.current) {
      palletZoneRef.current.position.set(targetX, 0.006, targetZ);
    }

    // 2. Reposition all spools
    setSpools(prev => {
      const updated = prev.map((s, idx) => {
        if (s.onPallet) {
          return {
            ...s,
            posX: targetX,
            posZ: targetZ,
            batchNo: `${targetBrand.defaultData.batchNo || 'BATCH'}-${idx + 1}`
          };
        } else {
          const angle = (idx * (Math.PI / 3)) + 0.4;
          const dist = 1.95;
          return {
            ...s,
            posX: targetX + Math.cos(angle) * dist,
            posZ: targetZ + Math.sin(angle) * dist,
            batchNo: `${targetBrand.defaultData.batchNo || 'BATCH'}-${idx + 1}`
          };
        }
      });
      spoolsRef.current = updated;
      return updated;
    });

    // 3. Apply Brand Specifications & Factory Data
    setPalletData(targetBrand.defaultData);
    palletDataRef.current = targetBrand.defaultData;

    // 4. Update 3D transforms & label textures
    setTimeout(() => {
      update3DSpoolTransforms();
      refreshAllLabelTextures();

      // 5. Glide camera to focus on this brand bay and billboard
      cameraTarget.current.set(targetX, 1.6, targetZ);
      cameraSpherical.current = {
        radius: 6.2,
        theta: 0.18,
        phi: Math.PI / 2.55,
      };
      updateCameraPosition();
    }, 60);

    setNotificationToast(`پالت مس با موفقیت در زون تابلوی "${targetBrand.nameFa}" (${targetBrand.zoneCode}) چیده شد.`);
    setTimeout(() => setNotificationToast(null), 6000);
  }, [update3DSpoolTransforms, refreshAllLabelTextures, updateCameraPosition]);

  // Wide Overview of all Wall Billboards
  const handleOverviewWallView = useCallback(() => {
    cameraTarget.current.set(0, 3.8, -16.5);
    cameraSpherical.current = {
      radius: 14.8,
      theta: 0.02,
      phi: Math.PI / 2.38,
    };
    updateCameraPosition();
    setNotificationToast('نمای کلی سالن و تابلوهای دیواری برندهای مس (باهنر، آستریا، قائم، بابک، مهر اصل)');
    setTimeout(() => setNotificationToast(null), 5000);
  }, [updateCameraPosition]);

  // Pointer Down (Mouse & Touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPinchZooming.current) return;
    if (e.pointerType !== 'touch') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
    clickStartPos.current = { x: e.clientX, y: e.clientY };

    // Right Click OR Shift + Left Click OR Middle Click = PAN
    if (e.button === 2 || (e.button === 0 && e.shiftKey) || e.button === 1) {
      isPanning.current = true;
      return;
    }

    // Left Click
    if (e.button === 0) {
      const hit = checkIntersections(e.clientX, e.clientY);
      clickedHitType.current = hit ? (hit.type === 'brand' ? 'pallet' : hit.type) : null;

      if (hit?.type === 'brand' && hit.brandId) {
        if (!isPalletLockedRef.current) {
          handleSelectBrandZone(hit.brandId);
        } else {
          const brand = BRAND_ZONES.find(b => b.id === hit.brandId);
          if (brand) {
            setNotificationToast(`تابلوی برند: ${brand.nameFa} (${brand.zoneCode}) - موقعیت پالت قفل است.`);
            setTimeout(() => setNotificationToast(null), 3500);
          }
        }
        return;
      }

      if (hit?.type === 'spool' && hit.spoolId !== undefined) {
        const spoolId = hit.spoolId;
        setSelectedSpoolId(spoolId);
        const currentSpool = spoolsRef.current.find(s => s.id === spoolId);

        if (currentSpool && !currentSpool.onPallet) {
          activeDraggedSpoolId.current = spoolId;
          dragOffset.current.set(
            currentSpool.posX - hit.hitOnFloor.x,
            0,
            currentSpool.posZ - hit.hitOnFloor.z
          );
          return;
        }

        isDraggingCamera.current = true;
        return;
      }

      if (hit?.type === 'pallet') {
        setSelectedSpoolId(null);
        if (!isPalletLockedRef.current) {
          isDraggingPallet.current = true;
          dragOffset.current.set(
            palletPos.current.x - hit.hitOnFloor.x,
            0,
            palletPos.current.z - hit.hitOnFloor.z
          );
          return;
        }
        isDraggingCamera.current = true;
        return;
      }

      isDraggingCamera.current = true;
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPinchZooming.current) return;
    // 1. Dragging separated Spool
    if (activeDraggedSpoolId.current !== null && cameraRef.current && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), cameraRef.current);

      const hitOnFloor = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(dragPlane.current, hitOnFloor)) {
        const newX = Math.max(-12, Math.min(12, hitOnFloor.x + dragOffset.current.x));
        const newZ = Math.max(-20, Math.min(18, hitOnFloor.z + dragOffset.current.z));

        const spoolId = activeDraggedSpoolId.current;
        const group = spool3DGroups.current[spoolId];
        if (group) {
          group.position.set(newX, totalSpoolHeight / 2 + 0.005, newZ);
        }

        setSpools(prev => prev.map(s => s.id === spoolId ? {
          ...s,
          posX: newX,
          posZ: newZ,
        } : s));
      }
      return;
    }

    // 2. Dragging wooden Pallet
    if (isDraggingPallet.current && cameraRef.current && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), cameraRef.current);

      const hitOnFloor = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(dragPlane.current, hitOnFloor)) {
        const newX = Math.max(-12, Math.min(12, hitOnFloor.x + dragOffset.current.x));
        const newZ = Math.max(-20, Math.min(18, hitOnFloor.z + dragOffset.current.z));

        palletPos.current = { x: newX, z: newZ };

        if (palletGroupRef.current) {
          palletGroupRef.current.position.set(newX, 0, newZ);
        }
        if (palletZoneRef.current) {
          palletZoneRef.current.position.set(newX, 0.006, newZ);
        }

        update3DSpoolTransforms();
      }
      return;
    }

    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };

    // 3. Pan Camera (Right click or Shift+drag or Middle click)
    if (isPanning.current && cameraRef.current) {
      const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraRef.current.quaternion);
      const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraRef.current.quaternion);

      const panSpeed = 0.0035 * Math.max(0.7, cameraSpherical.current.radius);
      cameraTarget.current.addScaledVector(camRight, -deltaX * panSpeed);
      cameraTarget.current.addScaledVector(camUp, deltaY * panSpeed);
      cameraTarget.current.y = Math.max(0.06, cameraTarget.current.y);
      updateCameraPosition();
      return;
    }

    // 4. Orbit Camera (allows horizontal side-view of floor spools)
    if (isDraggingCamera.current && cameraRef.current) {
      cameraSpherical.current.theta -= deltaX * 0.0065;
      // Allow phi up to Math.PI * 0.505 (horizontal level)
      cameraSpherical.current.phi = Math.max(0.02, Math.min(Math.PI * 0.505, cameraSpherical.current.phi - deltaY * 0.0065));
      updateCameraPosition();
      return;
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPinchZooming.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (activeDraggedSpoolId.current !== null) {
      const spoolId = activeDraggedSpoolId.current;
      const currentSpool = spoolsRef.current.find(s => s.id === spoolId);

      if (currentSpool) {
        const distToPallet = Math.hypot(currentSpool.posX - palletPos.current.x, currentSpool.posZ - palletPos.current.z);
        if (distToPallet < 1.1) {
          setSpools(prev => prev.map(s => s.id === spoolId ? {
            ...s,
            onPallet: true,
            isSealed: true,
            posX: palletPos.current.x,
            posZ: palletPos.current.z,
          } : s));
        }
      }
    }

    const distMoved = Math.hypot(e.clientX - clickStartPos.current.x, e.clientY - clickStartPos.current.y);
    if (distMoved < 6 && clickedHitType.current !== null) {
      setShowInfoCard(prev => !prev);
    }

    activeDraggedSpoolId.current = null;
    isDraggingPallet.current = false;
    isDraggingCamera.current = false;
    isPanning.current = false;
  };

  // Camera Presets & Zoom Buttons
  const handleZoomIn = () => {
    cameraSpherical.current.radius = Math.max(0.35, cameraSpherical.current.radius * 0.8);
    updateCameraPosition();
  };

  const handleZoomOut = () => {
    cameraSpherical.current.radius = Math.min(35, cameraSpherical.current.radius * 1.25);
    updateCameraPosition();
  };

  const handleResetView = () => {
    cameraTarget.current.set(0, 1.25, -2);
    cameraSpherical.current = { radius: 6.8, theta: 0.35, phi: Math.PI / 2.6 };
    updateCameraPosition();
  };

  const handleTopView = () => {
    cameraTarget.current.set(palletPos.current.x, 0, palletPos.current.z);
    cameraSpherical.current = { radius: 7.5, theta: 0, phi: 0.05 };
    updateCameraPosition();
  };

  const handleZoomToLabel = () => {
    cameraTarget.current.set(palletPos.current.x, palletTopSurfaceY + 2.5 * totalSpoolHeight, palletPos.current.z);
    cameraSpherical.current = {
      radius: 1.55,
      theta: 1.15,
      phi: Math.PI / 2.05,
    };
    updateCameraPosition();
  };

  // Dedicated Horizontal Eye-Level View for Floor Spool (دید کاملاً افقی و نزدیک برچسب کلاف روی زمین)
  const handleFocusFloorSpool = () => {
    const floorSpools = spoolsRef.current.filter(s => !s.onPallet);
    const target = floorSpools.length > 0 ? floorSpools[0] : spoolsRef.current[0];
    if (!target) return;

    const targetY = target.onPallet
      ? palletTopSurfaceY + 0.5 * totalSpoolHeight
      : totalSpoolHeight / 2;

    cameraTarget.current.set(target.posX, targetY, target.posZ);
    cameraSpherical.current = {
      radius: 1.35,
      theta: 1.15, // Completely horizontal eye-level directly facing the coil label!
      phi: Math.PI / 2.005,
    };
    updateCameraPosition();
  };

  // Unstack top spool button
  const handleUnstackTopSpool = () => {
    const stacked = spoolsRef.current.filter(s => s.onPallet);
    if (stacked.length === 0) return;

    const topSpool = stacked[stacked.length - 1];
    const separatedCount = spoolsRef.current.filter(s => !s.onPallet).length;
    const angle = (separatedCount * (Math.PI / 3)) + 0.4;
    const dist = 1.95;

    setSpools(prev => prev.map(s => s.id === topSpool.id ? {
      ...s,
      onPallet: false,
      isSealed: false,
      posX: palletPos.current.x + Math.cos(angle) * dist,
      posZ: palletPos.current.z + Math.sin(angle) * dist,
    } : s));
  };

  // Restack all spools button
  const handleRestackAllSpools = () => {
    setSpools(prev => prev.map(s => ({
      ...s,
      onPallet: true,
      isSealed: true,
      posX: palletPos.current.x,
      posZ: palletPos.current.z,
    })));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col overflow-hidden font-sans select-none" dir="rtl">
      
      {/* 3D CANVAS VIEWPORT CONTAINER */}
      <div ref={containerRef} className="relative flex-1 w-full h-full overflow-hidden bg-slate-100 cursor-grab active:cursor-grabbing">
        <canvas
          ref={canvasRef}
          onDoubleClick={handleDoubleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full block touch-none outline-hidden"
        />

        {/* TOP ACTION BAR - RESPONSIVE MOBILE & DESKTOP */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-30 pointer-events-auto">
          
          {/* MOBILE TOP BAR (sm:hidden) */}
          <div className="flex sm:hidden items-center justify-between gap-1.5 bg-stone-900/95 border border-stone-800/90 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-1">
              {handleExit && (
                <button
                  type="button"
                  onClick={handleExit}
                  className="px-2.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                  title="خروج"
                >
                  <X className="w-4 h-4 text-stone-400" />
                  <span>خروج</span>
                </button>
              )}

              {onOpenWarehouse2DPanel && (
                <button
                  type="button"
                  onClick={onOpenWarehouse2DPanel}
                  className="px-2.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-black rounded-xl text-xs flex items-center gap-1 shadow-xl transition-all cursor-pointer active:scale-95 border border-blue-400/60 shrink-0"
                  title="صفحات مدیریت و کاردکس انبار"
                >
                  <Boxes className="w-3.5 h-3.5 text-blue-100" />
                  <span>مدیریت انبار</span>
                  {warehouseItemsCount !== undefined && warehouseItemsCount > 0 && (
                    <span className="bg-blue-950 text-blue-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                      {warehouseItemsCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Copper Intake Button */}
              <button
                type="button"
                onClick={() => setShowIntakeModal(true)}
                className="px-2.5 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-stone-950 font-black rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 shadow-lg shadow-amber-500/25 border border-amber-300 shrink-0"
                title="ورود مس و اسکن عکس لیبل"
              >
                <Camera className="w-3.5 h-3.5 text-stone-950 shrink-0" />
                <span>ورود مس</span>
              </button>

              {/* Pallet Lock Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsPalletLocked(prev => {
                    const next = !prev;
                    isPalletLockedRef.current = next;
                    setNotificationToast(next ? "🔒 پالت در زون قفل شد." : "🔓 قفل پالت باز شد (امکان جابه‌جایی فعال است).");
                    setTimeout(() => setNotificationToast(null), 3500);
                    return next;
                  });
                }}
                className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95 border ${
                  isPalletLocked
                    ? "bg-stone-800 text-amber-300 border-amber-500/40"
                    : "bg-amber-500 text-stone-950 border-amber-300 shadow-md"
                }`}
                title={isPalletLocked ? "پالت قفل است و جابه‌جا نمی‌شود" : "پالت متحرک است"}
              >
                {isPalletLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-stone-950" />}
              </button>
            </div>
          </div>

          {/* DESKTOP TOP BAR (hidden sm:flex) */}
          <div className="hidden sm:flex items-center justify-between">
            {/* Exit 3D Viewport & 2D Warehouse Pages Buttons */}
            <div className="flex items-center gap-2">
              {handleExit && (
                <button
                  type="button"
                  onClick={handleExit}
                  className="px-4 py-2 bg-stone-900/90 hover:bg-stone-800 text-stone-200 hover:text-white border border-stone-700/80 rounded-2xl text-xs font-black flex items-center gap-2 shadow-2xl backdrop-blur-md transition-all cursor-pointer active:scale-95"
                  title="خروج و بازگشت به پنل مدیریت"
                >
                  <X className="w-4 h-4 text-stone-400" />
                  <span>خروج</span>
                </button>
              )}

              {/* DEDICATED BUTTON TO OPEN 2D WAREHOUSE MANAGEMENT PAGES */}
              {onOpenWarehouse2DPanel && (
                <button
                  type="button"
                  onClick={onOpenWarehouse2DPanel}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl text-xs flex items-center gap-2 shadow-2xl backdrop-blur-md transition-all cursor-pointer active:scale-95 border border-blue-400/60 shadow-blue-950/50 group"
                  title="مشاهده صفحات مدیریت انبارداری مس، موجودی زنده، کاردکس بارنامه‌ها و ورود/خروج مس"
                >
                  <Boxes className="w-4 h-4 text-blue-200 group-hover:scale-110 transition-transform" />
                  <span>صفحات مدیریت و کاردکس انبار</span>
                  {warehouseItemsCount !== undefined && warehouseItemsCount > 0 && (
                    <span className="bg-blue-950/90 text-blue-200 font-mono text-[10px] px-2 py-0.5 rounded-full border border-blue-400/30">
                      {warehouseItemsCount} سند
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Essential Controls: Copper Intake + Pallet Lock */}
            <div className="flex items-center gap-2 bg-stone-900/90 border border-stone-800 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md">
              {/* COPPER INTAKE & OCR SCANNER BUTTON */}
              <button
                type="button"
                onClick={() => setShowIntakeModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-lg shadow-amber-500/20 border border-amber-400"
                title="ورود مس و اسکن هوشمند عکس لیبل با دوربین یا آپلود"
              >
                <Camera className="w-4 h-4 text-stone-950" />
                <span>ورود مس و اسکن لیبل</span>
              </button>

              {/* PALLET POSITION LOCK / UNLOCK TOGGLE BUTTON */}
              <button
                type="button"
                onClick={() => {
                  setIsPalletLocked(prev => {
                    const next = !prev;
                    isPalletLockedRef.current = next;
                    setNotificationToast(next ? "🔒 موقعیت پالت در زون قفل شد." : "🔓 قفل موقعیت پالت باز شد (امکان جابه‌جایی فعال است).");
                    setTimeout(() => setNotificationToast(null), 3500);
                    return next;
                  });
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border ${
                  isPalletLocked
                    ? "bg-stone-800/90 text-amber-300 border-amber-500/40 hover:bg-stone-750 shadow-inner"
                    : "bg-amber-500 text-stone-950 border-amber-300 shadow-lg shadow-amber-500/30 font-black"
                }`}
                title={isPalletLocked ? "پالت قفل است و با کلیک روی زون‌ها جابه‌جا نمی‌شود" : "پالت متحرک است"}
              >
                {isPalletLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-stone-950" />}
                <span>{isPalletLocked ? "پالت قفل است" : "پالت متحرک"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* NOTIFICATION CONFIRMATION TOAST */}
        {notificationToast && (
          <div className="absolute top-20 left-4 right-4 sm:left-auto sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-40 bg-stone-900/95 border-2 border-amber-400 text-amber-200 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-bold text-center flex items-center justify-center gap-2 max-w-xl animate-in fade-in zoom-in-95">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{notificationToast}</span>
          </div>
        )}

        {/* COMPACT PALLET & SPOOL INFO CARD */}
        {showInfoCard && (
          <div className="absolute bottom-6 right-6 z-40 w-80 bg-stone-900/95 border border-amber-500/50 rounded-2xl p-4 shadow-[0_15px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl select-none text-right animate-in fade-in zoom-in-95 duration-150">
            {(() => {
              const selectedSpool = selectedSpoolId !== null ? spools.find(s => s.id === selectedSpoolId) : null;
              if (selectedSpool) {
                return (
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-stone-800">
                      <button
                        type="button"
                        onClick={() => setShowInfoCard(false)}
                        className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                        title="بستن"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-300">
                          قرقره مس شماره {selectedSpool.id + 1}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {selectedSpool.onPallet ? 'روی پالت' : 'در سالن'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-stone-950/70 border border-stone-800/60">
                        <span className="font-mono font-black text-amber-300 text-xs">
                          {palletData.sizeInch} ({palletData.sizeMetric} mm)
                        </span>
                        <span className="font-medium text-stone-400 text-[11px]">سایز کلاف:</span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-stone-950/70 border border-stone-800/60">
                        <span className="font-mono font-black text-emerald-300 text-xs">
                          {selectedSpool.netWeight} kg
                        </span>
                        <span className="font-medium text-stone-400 text-[11px]">وزن خالص این قرقره:</span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-stone-950/70 border border-stone-800/60">
                        <span className="font-mono font-bold text-stone-300 text-xs">
                          {selectedSpool.grossWeight} kg
                        </span>
                        <span className="font-medium text-stone-400 text-[11px]">وزن ناخالص:</span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-stone-950/70 border border-stone-800/60">
                        <span className="font-mono text-stone-300 text-[11px]">{selectedSpool.batchNo}</span>
                        <span className="font-medium text-stone-400 text-[11px]">شماره بچ:</span>
                      </div>

                      {/* PHOTO SPECIFIC TO THIS SINGLE SPOOL */}
                      <div className="mt-2.5 pt-2 border-t border-stone-800">
                        {selectedSpool.photoUrl ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <button
                                type="button"
                                onClick={() => handleRemoveSpoolPhoto(selectedSpool.id)}
                                className="text-red-400 hover:text-red-300 text-[10px] underline cursor-pointer"
                              >
                                حذف عکس این قرقره
                              </button>
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                برچسب با عکس اختصاصی
                              </span>
                            </div>
                            <div className="w-full h-20 rounded-xl overflow-hidden border border-emerald-500/40 relative bg-stone-950">
                              <img
                                src={selectedSpool.photoUrl}
                                alt={`برچسب قرقره ${selectedSpool.id + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-stone-400 mb-1 flex items-center justify-between">
                            <span className="text-[10px] text-amber-400/80">برچسب وکتور استاندارد</span>
                            <span className="text-[10px] text-stone-500">بدون عکس اختصاصی</span>
                          </div>
                        )}

                        <label className="mt-2 w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow">
                          <Camera className="w-3.5 h-3.5" />
                          <span>{selectedSpool.photoUrl ? 'تغییر عکس همین قرقره' : 'افزودن عکس برای همین قرقره'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadForSpool(selectedSpool.id, e)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedSpoolId(null)}
                        className="w-full mt-1 py-1 text-[11px] font-bold text-stone-400 hover:text-stone-200 transition-colors cursor-pointer text-center"
                      >
                        نمایش اطلاعات کلی پالت ←
                      </button>
                    </div>
                  </div>
                );
              }

              // PALLET MASTER SUMMARY
              return (
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-stone-800">
                    <button
                      type="button"
                      onClick={() => setShowInfoCard(false)}
                      className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                      title="بستن"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-300">{palletData.companyName}</span>
                      <span className="p-1 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                        <Package className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-stone-950/70 border border-stone-800/60">
                      <span className="font-mono font-black text-amber-300 text-xs">
                        {palletData.sizeInch} ({palletData.sizeMetric} mm)
                      </span>
                      <span className="font-medium text-stone-400 text-[11px]">سایز:</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-stone-950/70 border border-stone-800/60">
                      <span className="font-mono font-black text-emerald-300 text-xs">
                        {palletData.netWeightPerRoll} kg
                      </span>
                      <span className="font-medium text-stone-400 text-[11px]">میانگین هر کلاف:</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-stone-950/70 border border-stone-800/60">
                      <span className="font-mono font-bold text-amber-200 text-xs">
                        {currentPalletNetWeight.toFixed(1)} kg ({countOnPallet} از {spools.length})
                      </span>
                      <span className="font-medium text-stone-400 text-[11px]">وزن زنده پالت:</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-stone-950/70 border border-stone-800/60">
                      <span className="font-mono text-stone-300 text-[11px]">{palletData.batchNo}</span>
                      <span className="font-medium text-stone-400 text-[11px]">شماره بچ:</span>
                    </div>

                    <div className="text-[10px] text-amber-300/80 pt-1 text-center">
                      روی هر قرقره کلیک کنید تا عکس و اطلاعات اختصاصی آن را ببینید یا تغییر دهید.
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* HIGH DEFINITION LABEL INSPECTOR MODAL */}
        {showHdLabelModal && (
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-3xl w-full text-stone-900 shadow-2xl border-4 border-stone-900 animate-in zoom-in-95 duration-150 relative select-text max-h-[92vh] overflow-y-auto">
              
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowHdLabelModal(false)}
                className="absolute top-4 left-4 p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-black transition-colors cursor-pointer"
                title="بستن پنجره"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-between pb-3 border-b-2 border-stone-900 pr-2">
                <span className="text-xs font-bold text-stone-500 font-mono">HD COPPER SPECIFICATION VIEWER</span>
                <span className="text-sm font-black text-stone-900">مشاهده برچسب‌های صنعتی پالت مس</span>
              </div>

              {/* TAB SELECTOR */}
              <div className="mt-3 flex items-center gap-2 p-1 bg-stone-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setHdLabelTab('coil')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    hdLabelTab === 'coil'
                      ? 'bg-stone-900 text-white shadow-md'
                      : 'text-stone-600 hover:text-black hover:bg-stone-200'
                  }`}
                >
                  برچسب کلاف (Coil Label)
                </button>
                <button
                  type="button"
                  onClick={() => setHdLabelTab('pallet')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    hdLabelTab === 'pallet'
                      ? 'bg-stone-900 text-white shadow-md'
                      : 'text-stone-600 hover:text-black hover:bg-stone-200'
                  }`}
                >
                  برچسب جامع پالت (Master Pallet Label)
                </button>
                {Boolean(spools.find(s => s.id === selectedSpoolId)?.photoUrl || palletData.uploadedImageUrl) && (
                  <button
                    type="button"
                    onClick={() => setHdLabelTab('photo')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      hdLabelTab === 'photo'
                        ? 'bg-stone-900 text-white shadow-md'
                        : 'text-stone-600 hover:text-black hover:bg-stone-200'
                    }`}
                  >
                    {spools.find(s => s.id === selectedSpoolId)?.photoUrl
                      ? `عکس برچسب قرقره ${(selectedSpoolId ?? 0) + 1}`
                      : 'عکس برچسب بارگذاری‌شده'}
                  </button>
                )}
              </div>

              {/* TAB CONTENT: COIL LABEL */}
              {hdLabelTab === 'coil' && (
                <div className="mt-4 border-2 border-stone-900 p-4 rounded-2xl bg-white shadow-inner">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-36 text-center border-b sm:border-b-0 sm:border-l-2 border-stone-900 pb-3 sm:pb-0 sm:pl-3">
                      <div className="w-20 h-20 mx-auto rounded-full border-4 border-stone-900 flex items-center justify-center font-black text-3xl text-amber-700 mb-2">
                        Cu
                      </div>
                      <div className="font-black text-sm text-stone-900 uppercase">{palletData.companyName}</div>
                      <div className="text-[10px] text-stone-500 font-bold">{palletData.productShape}</div>
                    </div>

                    <div className="flex-1 w-full space-y-2">
                      <div className="bg-stone-900 text-white text-center py-1.5 px-3 rounded-lg font-black text-xs">
                        {palletData.alloyStandard}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-stone-50 border border-stone-300 rounded-lg">
                          <span className="text-[10px] text-stone-500 block">سایز کلاف:</span>
                          <span className="font-mono font-black text-stone-900">{palletData.sizeMetric} mm ({palletData.sizeInch}")</span>
                        </div>
                        <div className="p-2 bg-stone-50 border border-stone-300 rounded-lg">
                          <span className="text-[10px] text-stone-500 block">طول کلاف:</span>
                          <span className="font-mono font-black text-stone-900">{palletData.lengthMeters} m</span>
                        </div>
                        <div className="p-2 bg-stone-50 border border-stone-300 rounded-lg">
                          <span className="text-[10px] text-stone-500 block">وزن خالص کلاف:</span>
                          <span className="font-mono font-black text-emerald-700">{palletData.netWeightPerRoll} kg</span>
                        </div>
                        <div className="p-2 bg-stone-50 border border-stone-300 rounded-lg">
                          <span className="text-[10px] text-stone-500 block">وزن ناخالص کلاف:</span>
                          <span className="font-mono font-black text-stone-900">{palletData.grossWeightPerRoll} kg</span>
                        </div>
                        <div className="p-2 bg-stone-50 border border-stone-300 rounded-lg">
                          <span className="text-[10px] text-stone-500 block">شماره بچ (Batch):</span>
                          <span className="font-mono font-bold text-stone-900">{palletData.batchNo}</span>
                        </div>
                        <div className="p-2 bg-stone-50 border border-stone-300 rounded-lg">
                          <span className="text-[10px] text-stone-500 block">تاریخ تولید:</span>
                          <span className="font-mono font-bold text-stone-900">{palletData.mfgDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: PALLET MASTER LABEL */}
              {hdLabelTab === 'pallet' && (
                <div className="mt-4 border-2 border-amber-600 p-4 rounded-2xl bg-amber-50/50 shadow-inner">
                  <div className="bg-stone-900 text-amber-400 text-center py-2 px-3 rounded-xl font-black text-sm mb-3">
                    MASTER PALLET PACKING LIST / برچسب پالت
                  </div>

                  <div className="bg-emerald-950 text-white p-3.5 rounded-2xl border-2 border-emerald-500 mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-emerald-400 text-xs font-bold">وزن کل خالص پالت (NET WT):</div>
                      <div className="text-2xl font-black font-mono text-emerald-300">{palletData.totalPalletNetWeight} KG</div>
                    </div>
                    <div className="text-left">
                      <div className="text-emerald-400 text-xs font-bold">وزن کل ناخالص پالت (GROSS WT):</div>
                      <div className="text-2xl font-black font-mono text-white">{palletData.totalPalletGrossWeight} KG</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-white border border-stone-300 rounded-lg">
                      <span className="text-[10px] text-stone-500 block">تعداد کلاف روی پالت:</span>
                      <span className="font-black text-stone-900">{palletData.numberOfCoils} کلاف (Rolls)</span>
                    </div>
                    <div className="p-2 bg-white border border-stone-300 rounded-lg">
                      <span className="text-[10px] text-stone-500 block">وزن کفی چوبی پالت:</span>
                      <span className="font-black text-stone-900">{palletData.palletBaseTareWeight} kg</span>
                    </div>
                    <div className="p-2 bg-white border border-stone-300 rounded-lg">
                      <span className="text-[10px] text-stone-500 block">شماره پالت:</span>
                      <span className="font-mono font-black text-stone-900">{palletData.palletNo}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: SCANNED PHOTO */}
              {hdLabelTab === 'photo' && Boolean(spools.find(s => s.id === selectedSpoolId)?.photoUrl || palletData.uploadedImageUrl) && (
                <div className="mt-4 border-2 border-stone-900 p-2 rounded-2xl bg-stone-100 flex items-center justify-center max-h-[60vh] overflow-hidden">
                  <img
                    src={spools.find(s => s.id === selectedSpoolId)?.photoUrl || palletData.uploadedImageUrl}
                    alt="Scanned Copper Label"
                    className="max-h-[55vh] object-contain rounded-xl shadow-lg"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* COPPER INTAKE SCANNER MODAL (PHOTO / CAMERA / OCR) */}
        {showIntakeModal && (
          <CopperIntakeScannerModal
            isOpen={showIntakeModal}
            onClose={() => setShowIntakeModal(false)}
            onApplyPalletData={handleApplyNewPalletData}
            currentPalletData={palletData}
          />
        )}

      </div>
    </div>
  );
};
