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
  Eye
} from 'lucide-react';
import { CopperPalletData } from '../types';
import { CopperIntakeScannerModal, PRESET_FACTORIES } from './CopperIntakeScannerModal';

interface WarehouseEmpty3DHangarProps {
  onBackTo2D?: () => void;
  onClose?: () => void;
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

export const WarehouseEmpty3DHangar: React.FC<WarehouseEmpty3DHangarProps> = ({ onBackTo2D, onClose }) => {
  const handleExit = onClose || onBackTo2D;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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
  const spoolPalletLabelMeshes = useRef<{ [id: number]: THREE.Mesh }>({});
  const topCardboardCapRef = useRef<THREE.Mesh | null>(null);

  // Dragging & Camera Controls
  const activeDraggedSpoolId = useRef<number | null>(null);
  const isDraggingPallet = useRef(false);
  const isDraggingCamera = useRef(false);
  const isPanning = useRef(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const previousMousePosition = useRef({ x: 0, y: 0 });

  // Camera Orbit Parameters
  const cameraTarget = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.25, -2));
  const cameraSpherical = useRef({ radius: 6.8, theta: 0.35, phi: Math.PI / 2.6 });

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

  // Sync 3D Spool Positions
  const update3DSpoolTransforms = useCallback(() => {
    const currentSpools = spoolsRef.current;
    let stackIndex = 0;

    currentSpools.forEach((s) => {
      const group = spool3DGroups.current[s.id];
      const teflonWrap = spoolTeflonWraps.current[s.id];
      if (!group) return;

      if (s.onPallet) {
        const targetY = palletTopSurfaceY + (stackIndex + 0.5) * totalSpoolHeight;
        group.position.set(palletPos.current.x, targetY, palletPos.current.z);
        stackIndex++;
      } else {
        const floorY = totalSpoolHeight / 2 + 0.005;
        group.position.set(s.posX, floorY, s.posZ);
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
  }, [totalSpoolHeight]);

  useEffect(() => {
    update3DSpoolTransforms();
  }, [spools, update3DSpoolTransforms]);

  // =========================================================================
  // LABEL 1: HIGH RESOLUTION INDIVIDUAL COIL SPECIFICATION LABEL TEXTURE
  // =========================================================================
  const createCoilLabelTexture = useCallback((coilIndex: number, pData: CopperPalletData) => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

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
    const coilNet = pData.coilWeights?.[coilIndex - 1]?.net || pData.netWeightPerRoll || 105.8;
    const coilGross = pData.coilWeights?.[coilIndex - 1]?.gross || (coilNet + 13.2);

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
    const coilBatch = pData.coilWeights?.[coilIndex - 1]?.batchNo || `${pData.batchNo || '260222PG2100'}${coilIndex}`;
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

  const refreshAllLabelTextures = useCallback(() => {
    const currentData = palletDataRef.current;
    const palletMasterTex = createPalletMasterLabelTexture(currentData);

    for (let i = 0; i < 5; i++) {
      const coilMesh = spoolCoilLabelMeshes.current[i];
      if (coilMesh && (coilMesh.material as THREE.MeshBasicMaterial)) {
        const newCoilTex = createCoilLabelTexture(i + 1, currentData);
        (coilMesh.material as THREE.MeshBasicMaterial).map = newCoilTex;
        (coilMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
      }

      const pltMesh = spoolPalletLabelMeshes.current[i];
      if (pltMesh && (pltMesh.material as THREE.MeshBasicMaterial)) {
        (pltMesh.material as THREE.MeshBasicMaterial).map = palletMasterTex;
        (pltMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
      }
    }
  }, [createCoilLabelTexture, createPalletMasterLabelTexture]);

  const handleApplyNewPalletData = (newData: CopperPalletData) => {
    setPalletData(newData);
    palletDataRef.current = newData;

    const rollCount = Math.min(5, newData.numberOfCoils || 5);
    const newSpoolList: SpoolState[] = [];

    for (let i = 0; i < rollCount; i++) {
      const net = newData.coilWeights?.[i]?.net || newData.netWeightPerRoll;
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

    setSpools(newSpoolList);
    spoolsRef.current = newSpoolList;

    setTimeout(() => {
      refreshAllLabelTextures();
      update3DSpoolTransforms();
    }, 50);
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
    scene.background = new THREE.Color('#0d1117');
    scene.fog = new THREE.FogExp2('#0d1117', 0.018);
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
    renderer.toneMappingExposure = 1.3;
    rendererRef.current = renderer;

    // 4. Lighting System
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.95);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight('#f1f5f9', '#1e293b', 0.85);
    scene.add(hemiLight);

    const mainSun = new THREE.DirectionalLight('#fffbeb', 2.4);
    mainSun.position.set(10, 18, 8);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    mainSun.shadow.camera.near = 0.5;
    mainSun.shadow.camera.far = 45;
    mainSun.shadow.camera.left = -16;
    mainSun.shadow.camera.right = 16;
    mainSun.shadow.camera.top = 16;
    mainSun.shadow.camera.bottom = -16;
    mainSun.shadow.bias = -0.0003;
    scene.add(mainSun);

    const fillLight = new THREE.DirectionalLight('#93c5fd', 1.0);
    fillLight.position.set(-10, 14, -8);
    scene.add(fillLight);

    // Front soft focus spot on copper pallet
    const frontSoftSpot = new THREE.SpotLight('#ffffff', 2.0, 20, Math.PI / 3.5, 0.4);
    frontSoftSpot.position.set(0, 6.5, 4.5);
    frontSoftSpot.target.position.set(0, 1.2, -2);
    scene.add(frontSoftSpot);
    scene.add(frontSoftSpot.target);

    // -------------------------------------------------------------
    // 5. INDUSTRIAL HANGAR ARCHITECTURAL STRUCTURE (سازه سوله صنعتی)
    // -------------------------------------------------------------
    const hangarWidth = 28; // X: -14 to +14
    const hangarLength = 44; // Z: -24 to +20
    const eavesHeight = 6.8; // ارتفاع پای دیواره‌های کناری سوله
    const apexHeight = 9.8; // ارتفاع نوک سقف سوله

    // A. Epoxy Concrete Floor (کف اپوکسی بتنی سوله)
    const floorGeo = new THREE.PlaneGeometry(hangarWidth + 4, hangarLength + 4, 32, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#1a202c',
      roughness: 0.65,
      metalness: 0.25,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor Logistics Markings Canvas Texture (خط‌کشی‌های صنعتی کف سوله)
    const floorMarkingCanvas = document.createElement('canvas');
    floorMarkingCanvas.width = 2048;
    floorMarkingCanvas.height = 2048;
    const fCtx = floorMarkingCanvas.getContext('2d');
    if (fCtx) {
      fCtx.clearRect(0, 0, 2048, 2048);

      // Yellow Pedestrian / Forklift Boundary Lines
      fCtx.strokeStyle = '#eab308';
      fCtx.lineWidth = 10;
      
      // Main boundary rectangle
      fCtx.strokeRect(100, 100, 1848, 1848);

      // Pallet Storage Bay Zone (Center)
      fCtx.strokeStyle = '#f59e0b';
      fCtx.lineWidth = 14;
      fCtx.strokeRect(700, 800, 648, 648);

      // Walkway Green Stripes
      fCtx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      fCtx.fillRect(150, 150, 300, 1748);
      fCtx.fillRect(1598, 150, 300, 1748);

      // Text Decals on floor
      fCtx.fillStyle = 'rgba(234, 179, 8, 0.85)';
      fCtx.font = '900 48px Arial, sans-serif';
      fCtx.textAlign = 'center';
      fCtx.fillText('ZONE A • COPPER COILS STORAGE', 1024, 750);
      fCtx.fillText('BAY-01 / بارانداز پالت مس', 1024, 1500);

      fCtx.font = 'bold 36px Arial, sans-serif';
      fCtx.fillText('MAX LOAD 5000 KG', 1024, 1560);
    }
    const floorMarkingTex = new THREE.CanvasTexture(floorMarkingCanvas);
    floorMarkingTex.generateMipmaps = true;
    const floorDecalGeo = new THREE.PlaneGeometry(hangarWidth, hangarLength);
    const floorDecalMat = new THREE.MeshBasicMaterial({
      map: floorMarkingTex,
      transparent: true,
      opacity: 0.88,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const floorDecal = new THREE.Mesh(floorDecalGeo, floorDecalMat);
    floorDecal.rotation.x = -Math.PI / 2;
    floorDecal.position.y = 0.003;
    scene.add(floorDecal);

    // Floor Guide Ring around Pallet
    const zoneGeo = new THREE.RingGeometry(0.85, 0.96, 48);
    const zoneMat = new THREE.MeshBasicMaterial({
      color: '#f59e0b',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
    zoneMesh.rotation.x = -Math.PI / 2;
    zoneMesh.position.set(palletPos.current.x, 0.006, palletPos.current.z);
    scene.add(zoneMesh);
    palletZoneRef.current = zoneMesh;

    // Materials for Steel & Hangar Elements
    const steelColumnMat = new THREE.MeshStandardMaterial({
      color: '#2d3748',
      roughness: 0.6,
      metalness: 0.75,
    });

    const steelTrussMat = new THREE.MeshStandardMaterial({
      color: '#3b4252',
      roughness: 0.65,
      metalness: 0.7,
    });

    const craneYellowMat = new THREE.MeshStandardMaterial({
      color: '#eab308',
      roughness: 0.45,
      metalness: 0.6,
    });

    const yellowBollardMat = new THREE.MeshStandardMaterial({
      color: '#facc15',
      roughness: 0.4,
      metalness: 0.3,
    });

    const wallPanelMat = new THREE.MeshStandardMaterial({
      color: '#1e2530',
      roughness: 0.85,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: '#161c24',
      roughness: 0.8,
      metalness: 0.3,
      side: THREE.DoubleSide,
    });

    const skylightMat = new THREE.MeshPhysicalMaterial({
      color: '#e0f2fe',
      roughness: 0.2,
      transmission: 0.85,
      transparent: true,
      opacity: 0.8,
      ior: 1.5,
    });

    // B. Steel Columns & Base Bollards (ستون‌های فولادی I-Beam سوله)
    const columnZPositions = [-20, -10, 0, 10, 20];

    columnZPositions.forEach(zPos => {
      [-hangarWidth / 2, hangarWidth / 2].forEach(xPos => {
        const columnGroup = new THREE.Group();
        columnGroup.position.set(xPos, 0, zPos);

        // I-Beam Web
        const webGeo = new THREE.BoxGeometry(0.12, eavesHeight, 0.45);
        const web = new THREE.Mesh(webGeo, steelColumnMat);
        web.position.y = eavesHeight / 2;
        web.castShadow = true;
        web.receiveShadow = true;
        columnGroup.add(web);

        // I-Beam Flanges (Left & Right plates)
        [-0.07, 0.07].forEach(fx => {
          const flangeGeo = new THREE.BoxGeometry(0.024, eavesHeight, 0.48);
          const flange = new THREE.Mesh(flangeGeo, steelColumnMat);
          flange.position.set(fx, eavesHeight / 2, 0);
          flange.castShadow = true;
          columnGroup.add(flange);
        });

        // Yellow Protective Collision Base Bollard (پایه‌محافظ زرد رنگ ایمنی ستون)
        const bollardGeo = new THREE.BoxGeometry(0.38, 0.85, 0.65);
        const bollard = new THREE.Mesh(bollardGeo, yellowBollardMat);
        bollard.position.y = 0.425;
        bollard.castShadow = true;
        columnGroup.add(bollard);

        // Crane Runway Bracket Corbel on each column (نشیمنگاه ریل جرثقیل)
        const bracketGeo = new THREE.BoxGeometry(0.35, 0.25, 0.45);
        const bracket = new THREE.Mesh(bracketGeo, steelColumnMat);
        const bracketX = xPos > 0 ? -0.22 : 0.22;
        bracket.position.set(bracketX, 5.75, 0);
        columnGroup.add(bracket);

        scene.add(columnGroup);
      });
    });

    // C. Roof Steel Trusses & Girders (خرپاهای فلزی شیب‌دار سقف سوله)
    columnZPositions.forEach(zPos => {
      const trussGroup = new THREE.Group();
      trussGroup.position.set(0, 0, zPos);

      // Bottom Horizontal Tie Beam (تیر افقی زیرین خرپا)
      const bottomBeamGeo = new THREE.BoxGeometry(hangarWidth, 0.2, 0.2);
      const bottomBeam = new THREE.Mesh(bottomBeamGeo, steelTrussMat);
      bottomBeam.position.y = eavesHeight;
      bottomBeam.castShadow = true;
      trussGroup.add(bottomBeam);

      // Left Pitched Rafter (تیر شیب‌دار چپ سقف)
      const rafterHalfWidth = hangarWidth / 2;
      const rafterHeightDiff = apexHeight - eavesHeight;
      const rafterLength = Math.hypot(rafterHalfWidth, rafterHeightDiff);
      const rafterAngle = Math.atan2(rafterHeightDiff, rafterHalfWidth);

      const leftRafterGeo = new THREE.BoxGeometry(rafterLength, 0.22, 0.2);
      const leftRafter = new THREE.Mesh(leftRafterGeo, steelTrussMat);
      leftRafter.position.set(-rafterHalfWidth / 2, (eavesHeight + apexHeight) / 2, 0);
      leftRafter.rotation.z = rafterAngle;
      leftRafter.castShadow = true;
      trussGroup.add(leftRafter);

      // Right Pitched Rafter (تیر شیب‌دار راست سقف)
      const rightRafter = new THREE.Mesh(leftRafterGeo, steelTrussMat);
      rightRafter.position.set(rafterHalfWidth / 2, (eavesHeight + apexHeight) / 2, 0);
      rightRafter.rotation.z = -rafterAngle;
      rightRafter.castShadow = true;
      trussGroup.add(rightRafter);

      // Vertical Kingpost & Web Struts (مهاربندهای شبکه‌ای درون خرپا)
      const numStruts = 6;
      for (let s = 1; s <= numStruts; s++) {
        const sx = -rafterHalfWidth + (s * hangarWidth) / (numStruts + 1);
        const distFromCenter = Math.abs(sx);
        const topY = apexHeight - (distFromCenter / rafterHalfWidth) * rafterHeightDiff;
        const strutH = topY - eavesHeight;

        const strutGeo = new THREE.CylinderGeometry(0.045, 0.045, strutH, 12);
        const strut = new THREE.Mesh(strutGeo, steelTrussMat);
        strut.position.set(sx, eavesHeight + strutH / 2, 0);
        strut.castShadow = true;
        trussGroup.add(strut);
      }

      scene.add(trussGroup);
    });

    // Longitudinal Roof Purlins (قوطی‌ها و لاپه‌های طولی سقف)
    [-11, -7, -3, 0, 3, 7, 11].forEach(px => {
      const distFromCenter = Math.abs(px);
      const py = apexHeight - (distFromCenter / (hangarWidth / 2)) * (apexHeight - eavesHeight);
      const purlinGeo = new THREE.BoxGeometry(0.12, 0.12, hangarLength);
      const purlin = new THREE.Mesh(purlinGeo, steelTrussMat);
      purlin.position.set(px, py + 0.08, 0);
      scene.add(purlin);
    });

    // D. Roof Panels & Skylights (پوشش سقف و نورگیرهای شفاف سقف سوله)
    const roofHalfWidth = hangarWidth / 2;
    const roofSlopeLen = Math.hypot(roofHalfWidth, apexHeight - eavesHeight);
    const roofAngle = Math.atan2(apexHeight - eavesHeight, roofHalfWidth);

    // Left Roof Slope
    const leftRoofGeo = new THREE.PlaneGeometry(roofSlopeLen, hangarLength);
    const leftRoof = new THREE.Mesh(leftRoofGeo, roofMat);
    leftRoof.position.set(-roofHalfWidth / 2, (eavesHeight + apexHeight) / 2 + 0.16, 0);
    leftRoof.rotation.x = Math.PI / 2;
    leftRoof.rotation.y = -roofAngle;
    scene.add(leftRoof);

    // Right Roof Slope
    const rightRoofGeo = new THREE.PlaneGeometry(roofSlopeLen, hangarLength);
    const rightRoof = new THREE.Mesh(rightRoofGeo, roofMat);
    rightRoof.position.set(roofHalfWidth / 2, (eavesHeight + apexHeight) / 2 + 0.16, 0);
    rightRoof.rotation.x = Math.PI / 2;
    rightRoof.rotation.y = roofAngle;
    scene.add(rightRoof);

    // Center Translucent Skylight Ridge (نورگیر سقفی در امتداد سوله)
    const skylightGeo = new THREE.PlaneGeometry(2.4, hangarLength - 2);
    const skylight = new THREE.Mesh(skylightGeo, skylightMat);
    skylight.position.set(0, apexHeight + 0.22, 0);
    skylight.rotation.x = Math.PI / 2;
    scene.add(skylight);

    // E. Walls & Roll-up Sectional Shutter Door (دیوارها و درب بزرگ صنعتی سوله)
    // Left Wall
    const leftWallGeo = new THREE.PlaneGeometry(hangarLength, eavesHeight);
    const leftWall = new THREE.Mesh(leftWallGeo, wallPanelMat);
    leftWall.position.set(-hangarWidth / 2, eavesHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(leftWallGeo, wallPanelMat);
    rightWall.position.set(hangarWidth / 2, eavesHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Back Wall with large Roll-up door
    const backWallGroup = new THREE.Group();
    backWallGroup.position.set(0, 0, -hangarLength / 2);

    const backWallGeo = new THREE.PlaneGeometry(hangarWidth, eavesHeight);
    const backWall = new THREE.Mesh(backWallGeo, wallPanelMat);
    backWall.position.y = eavesHeight / 2;
    backWall.receiveShadow = true;
    backWallGroup.add(backWall);

    // Industrial Roll-up Shutter Door (درب کرکره‌ای بزرگ ورود و خروج تریلی)
    const doorW = 7.5;
    const doorH = 5.2;
    const doorGeo = new THREE.BoxGeometry(doorW, doorH, 0.12);
    const doorMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.55,
      metalness: 0.65,
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, doorH / 2, 0.08);
    door.castShadow = true;
    backWallGroup.add(door);

    // Door Horizontal Slats Lines
    for (let sl = 0.4; sl < doorH; sl += 0.35) {
      const slatGeo = new THREE.BoxGeometry(doorW - 0.1, 0.02, 0.14);
      const slatMat = new THREE.MeshStandardMaterial({ color: '#1e293b' });
      const slat = new THREE.Mesh(slatGeo, slatMat);
      slat.position.set(0, sl, 0.09);
      backWallGroup.add(slat);
    }

    // Door Yellow/Black Hazard Frame (قاب ایمنی زرد و مشکی دور درب)
    const doorFrameGeo = new THREE.BoxGeometry(doorW + 0.6, doorH + 0.3, 0.08);
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: '#eab308' });
    const doorFrame = new THREE.Mesh(doorFrameGeo, doorFrameMat);
    doorFrame.position.set(0, (doorH + 0.3) / 2, 0.04);
    backWallGroup.add(doorFrame);

    scene.add(backWallGroup);

    // F. Heavy Overhead Bridge Crane (پل جرثقیل سقفی زرد رنگ ۱۰ تن)
    const craneGroup = new THREE.Group();
    craneGroup.position.set(0, 5.9, -6);

    // Crane Long Runway Rails along hangar sides (ریل‌های طولی زیر جرثقیل)
    [-hangarWidth / 2 + 0.35, hangarWidth / 2 - 0.35].forEach(rx => {
      const railGeo = new THREE.BoxGeometry(0.18, 0.28, hangarLength);
      const rail = new THREE.Mesh(railGeo, steelColumnMat);
      rail.position.set(rx, 5.9, 0);
      scene.add(rail);
    });

    // Dual Yellow Bridge Box Girders (دو پل موازی زرد رنگ جرثقیل)
    [-0.5, 0.5].forEach(gz => {
      const girderGeo = new THREE.BoxGeometry(hangarWidth - 0.8, 0.65, 0.28);
      const girder = new THREE.Mesh(girderGeo, craneYellowMat);
      girder.position.set(0, 0, gz);
      girder.castShadow = true;
      craneGroup.add(girder);
    });

    // Crane End Carriages (کلگی‌های متحرک انتهای پل)
    [-hangarWidth / 2 + 0.6, hangarWidth / 2 - 0.6].forEach(ex => {
      const endTruckGeo = new THREE.BoxGeometry(0.4, 0.45, 1.8);
      const endTruck = new THREE.Mesh(endTruckGeo, steelColumnMat);
      endTruck.position.set(ex, 0, 0);
      craneGroup.add(endTruck);
    });

    // Hoist Trolley on the Crane (کالسکه متحرک بالابر روی جرثقیل)
    const trolleyGeo = new THREE.BoxGeometry(1.4, 0.5, 1.3);
    const trolleyMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.5,
      metalness: 0.8,
    });
    const trolley = new THREE.Mesh(trolleyGeo, trolleyMat);
    trolley.position.set(0, 0.45, 0);
    craneGroup.add(trolley);

    // Hoist Motor & Cable Drum
    const drumGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.85, 20);
    const drum = new THREE.Mesh(drumGeo, craneYellowMat);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, 0.85, 0);
    craneGroup.add(drum);

    // Steel Wire Rope hanging down
    const cableGeo = new THREE.CylinderGeometry(0.015, 0.015, 2.6, 12);
    const cableMat = new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.9 });
    const cable1 = new THREE.Mesh(cableGeo, cableMat);
    cable1.position.set(-0.15, -1.3, 0);
    craneGroup.add(cable1);
    const cable2 = new THREE.Mesh(cableGeo, cableMat);
    cable2.position.set(0.15, -1.3, 0);
    craneGroup.add(cable2);

    // Industrial Forged Crane Hook (قلاب سنگین جرثقیل صنعتی)
    const hookBlockGeo = new THREE.BoxGeometry(0.5, 0.35, 0.3);
    const hookBlock = new THREE.Mesh(hookBlockGeo, craneYellowMat);
    hookBlock.position.set(0, -2.6, 0);
    craneGroup.add(hookBlock);

    const hookTorusGeo = new THREE.TorusGeometry(0.16, 0.045, 12, 24, Math.PI * 1.5);
    const hookMetalMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.95, roughness: 0.3 });
    const hook = new THREE.Mesh(hookTorusGeo, hookMetalMat);
    hook.rotation.z = Math.PI / 2;
    hook.position.set(0, -2.85, 0);
    craneGroup.add(hook);

    scene.add(craneGroup);

    // G. High-Bay UFO Industrial LED Pendant Luminaires (چراغ‌های صنعتی آویز سقف سوله)
    const lampPositions = [
      { x: -7, z: -15 }, { x: 7, z: -15 },
      { x: -7, z: -5 },  { x: 7, z: -5 },
      { x: -7, z: 5 },   { x: 7, z: 5 },
      { x: -7, z: 15 },  { x: 7, z: 15 }
    ];

    lampPositions.forEach(lp => {
      const lampGroup = new THREE.Group();
      lampGroup.position.set(lp.x, 6.7, lp.z);

      // Hanging Cable
      const cordGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.9, 8);
      const cord = new THREE.Mesh(cordGeo, new THREE.MeshBasicMaterial({ color: '#000000' }));
      cord.position.y = 0.45;
      lampGroup.add(cord);

      // UFO Fixture Body
      const lampBodyGeo = new THREE.CylinderGeometry(0.42, 0.52, 0.15, 24);
      const lampBody = new THREE.Mesh(lampBodyGeo, new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4 }));
      lampGroup.add(lampBody);

      // Glowing LED Lens Disc
      const lensGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.02, 24);
      const lensMat = new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#e0f2fe',
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.position.y = -0.08;
      lampGroup.add(lens);

      // Downward spot illumination
      const downSpot = new THREE.SpotLight('#ffffff', 0.9, 14, Math.PI / 4, 0.5);
      downSpot.position.set(0, -0.1, 0);
      downSpot.target.position.set(0, -6, 0);
      lampGroup.add(downSpot);
      lampGroup.add(downSpot.target);

      scene.add(lampGroup);
    });

    // H. Background Storage Pallet Racks (قفسه‌های راک انبار در انتهای سوله)
    const rackGroup = new THREE.Group();
    rackGroup.position.set(-8, 0, -21);

    const rackOrangeMat = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.5 });
    const rackBlueMat = new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.5 });

    // Upright Frames (ستون‌های آبی راک)
    [-3.5, 0, 3.5].forEach(rx => {
      [-0.5, 0.5].forEach(rz => {
        const uprightGeo = new THREE.BoxGeometry(0.08, 4.5, 0.08);
        const upright = new THREE.Mesh(uprightGeo, rackBlueMat);
        upright.position.set(rx, 2.25, rz);
        rackGroup.add(upright);
      });
    });

    // Horizontal Orange Beams (بازوهای نارنجی راک)
    [1.4, 2.8, 4.2].forEach(by => {
      [-0.45, 0.45].forEach(bz => {
        const beamGeo = new THREE.BoxGeometry(7.2, 0.1, 0.06);
        const beam = new THREE.Mesh(beamGeo, rackOrangeMat);
        beam.position.set(0, by, bz);
        rackGroup.add(beam);
      });
    });

    // Spare wooden pallets on racks
    const spareWoodMat = new THREE.MeshStandardMaterial({ color: '#a16207', roughness: 0.9 });
    [-1.8, 1.8].forEach(px => {
      [1.46, 2.86].forEach(py => {
        const pMeshGeo = new THREE.BoxGeometry(1.2, 0.12, 1.0);
        const pMesh = new THREE.Mesh(pMeshGeo, spareWoodMat);
        pMesh.position.set(px, py + 0.06, 0);
        rackGroup.add(pMesh);

        // Carton boxes on pallets
        const boxGeo = new THREE.BoxGeometry(0.8, 0.6, 0.7);
        const boxMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.95 });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(px, py + 0.45, 0);
        rackGroup.add(box);
      });
    });

    scene.add(rackGroup);

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

    for (let i = 0; i < 5; i++) {
      const singleSpoolGroup = new THREE.Group();
      singleSpoolGroup.name = `SPOOL_GROUP_${i}`;
      (singleSpoolGroup as any).spoolId = i;

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

      // LABEL 1: INDIVIDUAL COIL SPECIFICATION LABEL (FRONT FACE)
      const coilLabelTexture = createCoilLabelTexture(i + 1, palletDataRef.current);
      const label1Mat = new THREE.MeshBasicMaterial({
        map: coilLabelTexture,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      });
      const label1Geo = new THREE.CylinderGeometry(
        spoolRadius + 0.024,
        spoolRadius + 0.024,
        0.23,
        36,
        1,
        true,
        0.715,
        0.95
      );
      const coilLabelMesh = new THREE.Mesh(label1Geo, label1Mat);
      coilLabelMesh.name = `SPOOL_LABEL_1_${i}`;
      coilLabelMesh.renderOrder = 20;
      singleSpoolGroup.add(coilLabelMesh);
      spoolCoilLabelMeshes.current[i] = coilLabelMesh;

      // LABEL 2: MASTER PALLET TOTAL WEIGHT LABEL (SIDE 90 DEG)
      const label2Mat = new THREE.MeshBasicMaterial({
        map: initialPalletMasterTex,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      });
      const label2Geo = new THREE.CylinderGeometry(
        spoolRadius + 0.024,
        spoolRadius + 0.024,
        0.23,
        36,
        1,
        true,
        2.28,
        0.95
      );
      const palletLabelMesh = new THREE.Mesh(label2Geo, label2Mat);
      palletLabelMesh.name = `SPOOL_LABEL_2_${i}`;
      palletLabelMesh.renderOrder = 20;
      singleSpoolGroup.add(palletLabelMesh);
      spoolPalletLabelMeshes.current[i] = palletLabelMesh;

      // Interactive Hitbox
      const spoolHitBoxGeo = new THREE.CylinderGeometry(spoolFlangeRadius + 0.08, spoolFlangeRadius + 0.08, totalSpoolHeight + 0.05, 16);
      const spoolHitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
      const spoolHitBox = new THREE.Mesh(spoolHitBoxGeo, spoolHitBoxMat);
      spoolHitBox.name = `SPOOL_HITBOX_${i}`;
      (spoolHitBox as any).spoolId = i;
      singleSpoolGroup.add(spoolHitBox);

      scene.add(singleSpoolGroup);
      spool3DGroups.current[i] = singleSpoolGroup;
    }

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

      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // WASD / Arrow Keys Smooth Navigation
      if (cameraRef.current && !isDraggingPallet.current && activeDraggedSpoolId.current === null) {
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
      
      // Normalize wheel delta across physical mice, trackpads, and gestures
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 30; // lines
      else if (e.deltaMode === 2) delta *= 300; // pages

      // Fast, responsive exponential zoom factor
      const zoomFactor = delta > 0 ? 1.15 : 0.87;
      const newRadius = cameraSpherical.current.radius * zoomFactor;

      // Allow zooming from 0.35m (extreme close macro view) up to 35m (wide warehouse view)
      cameraSpherical.current.radius = Math.max(0.35, Math.min(35, newRadius));
      updateCameraPosition();
    };

    canvasEl.addEventListener('wheel', handleNativeWheel, { passive: false });

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
    }

    return null;
  };

  // Double Click: Unstack to floor or Restack to pallet
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = checkIntersections(e.clientX, e.clientY);
    if (!hit || hit.type !== 'spool' || hit.spoolId === undefined) return;

    const targetSpoolId = hit.spoolId;
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

  // Pointer Down (Mouse & Touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
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
      clickedHitType.current = hit ? hit.type : null;

      if (hit?.type === 'spool' && hit.spoolId !== undefined) {
        const spoolId = hit.spoolId;
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
        isDraggingPallet.current = true;
        dragOffset.current.set(
          palletPos.current.x - hit.hitOnFloor.x,
          0,
          palletPos.current.z - hit.hitOnFloor.z
        );
        return;
      }

      isDraggingCamera.current = true;
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
      radius: 1.65,
      theta: 0.72,
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
      theta: 0.72,
      phi: Math.PI / 2.005, // Completely horizontal eye-level directly facing the coil label!
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
      <div ref={containerRef} className="relative flex-1 w-full h-full overflow-hidden bg-black cursor-grab active:cursor-grabbing">
        <canvas
          ref={canvasRef}
          onDoubleClick={handleDoubleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full block touch-none outline-hidden"
        />

        {/* TOP ACTION BAR */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto">
          
          {/* Exit 3D Viewport Button */}
          {handleExit && (
            <button
              type="button"
              onClick={handleExit}
              className="px-4 py-2 bg-stone-900/90 hover:bg-stone-800 text-stone-200 hover:text-white border border-stone-700/80 rounded-2xl text-xs font-black flex items-center gap-2 shadow-2xl backdrop-blur-md transition-all cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4 text-stone-400" />
              <span>خروج از فضای ۳ بعدی</span>
            </button>
          )}

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 bg-stone-900/90 border border-stone-800 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md">
            
            {/* COPPER INTAKE & OCR SCANNER BUTTON */}
            <button
              type="button"
              onClick={() => setShowIntakeModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-lg shadow-amber-500/20"
              title="ورود مس و اسکن هوشمند عکس لیبل با دوربین یا آپلود"
            >
              <Camera className="w-4 h-4 text-stone-950" />
              <span>ورود مس و اسکن لیبل</span>
            </button>

            {/* Quick Macro Zoom to Label Button */}
            <button
              type="button"
              onClick={handleZoomToLabel}
              className="px-3 py-2 bg-blue-600/25 hover:bg-blue-600/40 text-blue-300 border border-blue-500/50 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-lg"
              title="زوم بسیار نزدیک ۳ بعدی روی برچسب پالت مس"
            >
              <ZoomIn className="w-4 h-4 text-blue-400" />
              <span>زوم برچسب پالت</span>
            </button>

            {/* Horizontal Eye-Level Floor Spool View Button */}
            <button
              type="button"
              onClick={handleFocusFloorSpool}
              className="px-3 py-2 bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 border border-amber-500/50 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-lg"
              title="دید کاملاً افقی و رو در رو با کلاف مس روی زمین برای خواندن آسان متن برچسب"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>دید افقی کلاف زمین</span>
            </button>

            {/* HD Label Inspector Modal Button */}
            <button
              type="button"
              onClick={() => setShowHdLabelModal(true)}
              className="px-3 py-2 bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/50 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-lg"
              title="مشاهده نسخه باکیفیت برچسب کلاف و برچسب کل پالت"
            >
              <FileText className="w-4 h-4 text-purple-300" />
              <span>برچسب‌های HD</span>
            </button>

            {/* Unstack Spool */}
            <button
              type="button"
              onClick={handleUnstackTopSpool}
              disabled={countOnPallet === 0}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                countOnPallet > 0
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 active:scale-95'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-transparent'
              }`}
              title="برداشتن یک قرقره از روی پالت و قرار دادن آن روی زمین سوله"
            >
              <MinusCircle className="w-4 h-4 text-amber-400" />
              <span>برداشتن ۱ کلاف</span>
            </button>

            {/* Restack Spools */}
            {countOffPallet > 0 && (
              <button
                type="button"
                onClick={handleRestackAllSpools}
                className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="بازگرداندن همه قرقره‌ها روی پالت و پلمپ مجدد با تفلون"
              >
                <RotateCcw className="w-4 h-4 text-emerald-400" />
                <span>بازگرداندن ({countOffPallet})</span>
              </button>
            )}

            {/* Info Toggle Button */}
            <button
              type="button"
              onClick={() => setShowInfoCard(prev => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                showInfoCard
                  ? 'bg-amber-500 text-stone-950 font-black shadow-md'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700/60'
              }`}
              title="مشاهده / بستن مشخصات پالت"
            >
              <Package className="w-4 h-4" />
              <span>مشخصات</span>
            </button>
          </div>
        </div>

        {/* FLOATING CAMERA CONTROL HUD (ZOOM & PRESETS) */}
        <div className="absolute top-20 left-4 z-20 pointer-events-auto flex flex-col gap-1.5 bg-stone-900/90 border border-stone-800 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 bg-stone-800/80 hover:bg-stone-700 text-stone-200 rounded-xl transition-all cursor-pointer active:scale-90"
            title="بزرگ‌نمایی سریع (Zoom In)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 bg-stone-800/80 hover:bg-stone-700 text-stone-200 rounded-xl transition-all cursor-pointer active:scale-90"
            title="کوچک‌نمایی سریع (Zoom Out)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-px bg-stone-800 my-0.5" />
          <button
            type="button"
            onClick={handleFocusFloorSpool}
            className="p-2 bg-stone-800/80 hover:bg-amber-500/20 text-amber-400 rounded-xl transition-all cursor-pointer active:scale-90"
            title="دید افقی و خواندن برچسب کلاف مس روی زمین"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="p-2 bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-amber-400 rounded-xl transition-all cursor-pointer active:scale-90"
            title="دید پیش‌فرض سوله"
          >
            <Compass className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleTopView}
            className="p-2 bg-stone-800/80 hover:bg-stone-700 text-blue-400 rounded-xl transition-all cursor-pointer active:scale-90"
            title="دید از بالا (پلان سوله)"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>

        {/* FLOATING REAL-TIME PALLET LIVE WEIGHT HUD BADGE */}
        <div className="absolute top-20 right-4 z-20 pointer-events-auto max-w-sm">
          <div className="bg-stone-900/90 border border-amber-500/40 rounded-2xl p-3 shadow-2xl backdrop-blur-md space-y-2 text-right">
            <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
              <span className="text-[11px] font-mono text-stone-400">DYNAMIC PALLET WEIGHT</span>
              <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                <span>{palletData.companyName}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-400">وزن زنده خالص پالت:</span>
              <span className="font-mono font-black text-emerald-400 text-sm">
                {currentPalletNetWeight.toFixed(1)} <span className="text-[10px] text-stone-400 font-sans">کیلوگرم</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-400">وضعیت کلاف‌ها:</span>
              <span className="font-bold text-amber-300">
                {countOnPallet} از {spools.length} کلاف روی پالت
              </span>
            </div>

            {countOffPallet > 0 && (
              <div className="p-1.5 bg-rose-950/40 border border-rose-500/30 rounded-xl text-[11px] text-rose-300 flex items-center justify-between">
                <span>کلاف‌های جدا شده از پالت:</span>
                <span className="font-bold font-mono">
                  {countOffPallet} کلاف ({(countOffPallet * palletData.netWeightPerRoll).toFixed(1)} kg)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM HELPER HINT BAR */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none hidden sm:block">
          <div className="flex items-center gap-3 px-4 py-2 bg-stone-900/90 border border-stone-800/80 rounded-full shadow-2xl backdrop-blur-md text-[11px] text-stone-300">
            <span className="flex items-center gap-1 text-blue-400 font-bold">
              <span>🖱️ دوبار کلیک:</span>
              <span className="text-stone-300 font-normal">جداسازی / چیدن کلاف</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-stone-700" />
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <span>🔄 کلیک چپ و کشیدن:</span>
              <span className="text-stone-300 font-normal">چرخش ۳ بعدی</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-stone-700" />
            <span className="flex items-center gap-1 text-purple-400 font-bold">
              <span>↔️ کلیک راست یا Shift:</span>
              <span className="text-stone-300 font-normal">جابه‌جایی دوربین (Pan)</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-stone-700" />
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span>🔍 اسکرول ماوس:</span>
              <span className="text-stone-300 font-normal">زوم نرم و ماکرو</span>
            </span>
          </div>
        </div>

        {/* COMPACT PALLET INFO CARD */}
        {showInfoCard && (
          <div className="absolute bottom-6 right-6 z-40 w-72 sm:w-80 bg-stone-900/95 border border-amber-500/50 rounded-2xl p-4 shadow-[0_15px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl select-none text-right animate-in fade-in zoom-in-95 duration-150">
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
                <span className="font-medium text-stone-400 text-[11px]">وزن هر کلاف:</span>
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
            </div>
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
                {palletData.uploadedImageUrl && (
                  <button
                    type="button"
                    onClick={() => setHdLabelTab('photo')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      hdLabelTab === 'photo'
                        ? 'bg-stone-900 text-white shadow-md'
                        : 'text-stone-600 hover:text-black hover:bg-stone-200'
                    }`}
                  >
                    عکس بارگذاری‌شده
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
              {hdLabelTab === 'photo' && palletData.uploadedImageUrl && (
                <div className="mt-4 border-2 border-stone-900 p-2 rounded-2xl bg-stone-100 flex items-center justify-center max-h-[60vh] overflow-hidden">
                  <img
                    src={palletData.uploadedImageUrl}
                    alt="Scanned Copper Pallet Label"
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
