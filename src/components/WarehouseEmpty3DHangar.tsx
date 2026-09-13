import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
  X,
  GripHorizontal,
  Package,
  Move,
  MinusCircle,
  RotateCcw,
  Sparkles,
  Layers,
  ZoomIn,
  FileText,
  Eye
} from 'lucide-react';

interface WarehouseEmpty3DHangarProps {
  onBackTo2D?: () => void;
  onClose?: () => void;
}

interface SpoolState {
  id: number;
  onPallet: boolean;
  isSealed: boolean; // true = تفلون و سلفون پلمپ دارد, false = باز شده و مس خالص نمایان است
  posX: number;
  posZ: number;
}

export const WarehouseEmpty3DHangar: React.FC<WarehouseEmpty3DHangarProps> = ({ onBackTo2D, onClose }) => {
  const handleExit = onClose || onBackTo2D;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Pallet 3D Object & Position in the Scene
  const palletGroupRef = useRef<THREE.Group | null>(null);
  const palletZoneRef = useRef<THREE.Mesh | null>(null);
  const palletPos = useRef<{ x: number; z: number }>({ x: 0, z: -2 });

  // 5 Spools State (ID: 0 to 4, 0 is bottom spool, 4 is top spool)
  const [spools, setSpools] = useState<SpoolState[]>([
    { id: 0, onPallet: true, isSealed: true, posX: 0, posZ: -2 },
    { id: 1, onPallet: true, isSealed: true, posX: 0, posZ: -2 },
    { id: 2, onPallet: true, isSealed: true, posX: 0, posZ: -2 },
    { id: 3, onPallet: true, isSealed: true, posX: 0, posZ: -2 },
    { id: 4, onPallet: true, isSealed: true, posX: 0, posZ: -2 },
  ]);
  const spoolsRef = useRef<SpoolState[]>(spools);
  spoolsRef.current = spools;

  // 3D references to each spool group in Three.js
  const spool3DGroups = useRef<{ [id: number]: THREE.Group }>({});
  const spoolTeflonWraps = useRef<{ [id: number]: THREE.Group }>({});
  const topCardboardCapRef = useRef<THREE.Mesh | null>(null);

  // Dragging State
  const activeDraggedSpoolId = useRef<number | null>(null);
  const isDraggingPallet = useRef(false);
  const isDraggingCamera = useRef(false);
  const isPanning = useRef(false);
  const isHoveringSpool = useRef<number | null>(null);
  const isHoveringPallet = useRef(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const previousMousePosition = useRef({ x: 0, y: 0 });

  // Camera Orbit State
  const cameraTarget = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.15, -2));
  const cameraSpherical = useRef({ radius: 7.2, theta: 0.38, phi: Math.PI / 2.5 });

  // Info Box Visibility (Hidden by default, opens on clicking pallet/spool)
  const [showInfoCard, setShowInfoCard] = useState<boolean>(false);
  const [showHdLabelModal, setShowHdLabelModal] = useState<boolean>(false);
  const clickStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });


  // Tracking click vs drag
  const clickedHitType = useRef<'pallet' | 'spool' | null>(null);

  // Keyboard controls (WASD / Arrows)
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Spool physical dimensions
  const spoolRadius = 0.52;
  const spoolHeight = 0.28;
  const spoolFlangeRadius = 0.54;
  const spoolFlangeThick = 0.012;
  const totalSpoolHeight = spoolHeight + spoolFlangeThick * 2; // 0.304m
  const palletTopSurfaceY = 0.13; // Height of pallet deck

  // ESC Key Listener to Close
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && handleExit) {
        handleExit();
      }
    };
    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, [handleExit]);

  // Sync 3D Spool Positions & Teflon Visibility when state changes
  const update3DSpoolTransforms = useCallback(() => {
    const currentSpools = spoolsRef.current;
    let stackIndex = 0;

    currentSpools.forEach((s) => {
      const group = spool3DGroups.current[s.id];
      const teflonWrap = spoolTeflonWraps.current[s.id];
      if (!group) return;

      if (s.onPallet) {
        // Stacked on the pallet
        const targetY = palletTopSurfaceY + (stackIndex + 0.5) * totalSpoolHeight;
        group.position.set(palletPos.current.x, targetY, palletPos.current.z);
        stackIndex++;
      } else {
        // Separated on the floor
        const floorY = totalSpoolHeight / 2 + 0.005;
        group.position.set(s.posX, floorY, s.posZ);
      }

      // Teflon wrap visibility: only visible when sealed
      if (teflonWrap) {
        teflonWrap.visible = s.isSealed;
      }
    });

    // Update top cardboard cap position on top of the stack
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

  // 3D Scene Initialization
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. SCENE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0e1217');
    scene.fog = new THREE.FogExp2('#141a22', 0.012);
    sceneRef.current = scene;

    // 2. CAMERA
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.02, 200);
    cameraRef.current = camera;

    const updateCam = () => {
      const sp = cameraSpherical.current;
      const tgt = cameraTarget.current;
      const x = tgt.x + sp.radius * Math.sin(sp.phi) * Math.sin(sp.theta);
      const y = tgt.y + sp.radius * Math.cos(sp.phi);
      const z = tgt.z + sp.radius * Math.sin(sp.phi) * Math.cos(sp.theta);
      camera.position.set(x, Math.max(0.08, y), z);
      camera.lookAt(tgt);
    };
    updateCam();

    // 3. RENDERER
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
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    // 4. LIGHTING SETUP
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.95);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#fff5ea', 2.0);
    sunLight.position.set(12, 22, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 70;
    sunLight.shadow.camera.left = -15;
    sunLight.shadow.camera.right = 15;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // Warm Key Spotlight focused on the pallet
    const copperSpot = new THREE.SpotLight('#ffe0cc', 3.2, 22, Math.PI / 3.5, 0.4, 1.2);
    copperSpot.position.set(2, 7, 2);
    copperSpot.target.position.set(0, 1.0, -2);
    copperSpot.castShadow = true;
    scene.add(copperSpot);
    scene.add(copperSpot.target);

    // Secondary skylight fill
    const skyLight = new THREE.HemisphereLight('#94b8e8', '#384252', 0.65);
    scene.add(skyLight);

    // ==========================================
    // 5. BUILD INDUSTRIAL HANGAR (سوله استاندارد)
    // ==========================================
    const hangarWidth = 20;
    const hangarLength = 44;
    const eavesHeight = 7.0;
    const ridgeHeight = 9.5;

    // Materials
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#474f5a',
      roughness: 0.38,
      metalness: 0.18,
    });

    const wallLowerMat = new THREE.MeshStandardMaterial({
      color: '#d4d9de',
      roughness: 0.65,
    });

    const wallUpperMat = new THREE.MeshStandardMaterial({
      color: '#838e9a',
      roughness: 0.5,
      metalness: 0.15,
    });

    const steelBeamMat = new THREE.MeshStandardMaterial({
      color: '#262a30',
      roughness: 0.5,
      metalness: 0.6,
    });

    const yellowAccentMat = new THREE.MeshStandardMaterial({
      color: '#eab308',
      roughness: 0.3,
    });

    // Concrete polished floor
    const floorGeo = new THREE.PlaneGeometry(hangarWidth, hangarLength);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Yellow safety perimeter ring on floor that moves with the copper pallet
    const yellowLineGeo = new THREE.RingGeometry(0.95, 1.05, 36);
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: '#facc15', side: THREE.DoubleSide });
    const palletZone = new THREE.Mesh(yellowLineGeo, yellowLineMat);
    palletZone.rotation.x = -Math.PI / 2;
    palletZone.position.set(palletPos.current.x, 0.005, palletPos.current.z);
    scene.add(palletZone);
    palletZoneRef.current = palletZone;

    // Hangar Steel Frames (Trusses)
    const baySpacing = 6.0;
    const bayCount = 7;
    for (let i = 0; i <= bayCount; i++) {
      const zPos = -hangarLength / 2 + i * baySpacing;

      // Left column
      const colLGeo = new THREE.BoxGeometry(0.35, eavesHeight, 0.35);
      const colL = new THREE.Mesh(colLGeo, steelBeamMat);
      colL.position.set(-hangarWidth / 2 + 0.175, eavesHeight / 2, zPos);
      colL.castShadow = true;
      colL.receiveShadow = true;
      scene.add(colL);

      // Right column
      const colRGeo = new THREE.BoxGeometry(0.35, eavesHeight, 0.35);
      const colR = new THREE.Mesh(colRGeo, steelBeamMat);
      colR.position.set(hangarWidth / 2 - 0.175, eavesHeight / 2, zPos);
      colR.castShadow = true;
      colR.receiveShadow = true;
      scene.add(colR);

      // Left rafter
      const rafterLen = Math.sqrt(Math.pow(hangarWidth / 2, 2) + Math.pow(ridgeHeight - eavesHeight, 2));
      const rafterAngle = Math.atan2(ridgeHeight - eavesHeight, hangarWidth / 2);
      const rafterLGeo = new THREE.BoxGeometry(rafterLen, 0.25, 0.25);
      const rafterL = new THREE.Mesh(rafterLGeo, steelBeamMat);
      rafterL.position.set(-hangarWidth / 4, (eavesHeight + ridgeHeight) / 2, zPos);
      rafterL.rotation.z = rafterAngle;
      scene.add(rafterL);

      // Right rafter
      const rafterRGeo = new THREE.BoxGeometry(rafterLen, 0.25, 0.25);
      const rafterR = new THREE.Mesh(rafterRGeo, steelBeamMat);
      rafterR.position.set(hangarWidth / 4, (eavesHeight + ridgeHeight) / 2, zPos);
      rafterR.rotation.z = -rafterAngle;
      scene.add(rafterR);
    }

    // Side Walls
    [-hangarWidth / 2, hangarWidth / 2].forEach(xPos => {
      const lowerWallGeo = new THREE.BoxGeometry(0.2, 3.2, hangarLength);
      const lowerWall = new THREE.Mesh(lowerWallGeo, wallLowerMat);
      lowerWall.position.set(xPos, 1.6, 0);
      lowerWall.receiveShadow = true;
      scene.add(lowerWall);

      const upperWallGeo = new THREE.BoxGeometry(0.2, eavesHeight - 3.2, hangarLength);
      const upperWall = new THREE.Mesh(upperWallGeo, wallUpperMat);
      upperWall.position.set(xPos, 3.2 + (eavesHeight - 3.2) / 2, 0);
      scene.add(upperWall);
    });

    // Rear Wall
    const backWallGeo = new THREE.BoxGeometry(hangarWidth, eavesHeight, 0.3);
    const backWall = new THREE.Mesh(backWallGeo, wallLowerMat);
    backWall.position.set(0, eavesHeight / 2, -hangarLength / 2);
    scene.add(backWall);

    // Rear Mezzanine
    const mezZ = -hangarLength / 2 + 4.5;
    const mezHeight = 3.6;
    const mezSlabGeo = new THREE.BoxGeometry(hangarWidth - 0.4, 0.3, 8.0);
    const mezSlab = new THREE.Mesh(mezSlabGeo, floorMat);
    mezSlab.position.set(0, mezHeight, -hangarLength / 2 + 4.0);
    mezSlab.receiveShadow = true;
    scene.add(mezSlab);

    const signGeo = new THREE.BoxGeometry(4.2, 1.1, 0.1);
    const signMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, mezHeight - 0.4, mezZ + 0.12);
    scene.add(sign);

    const logoHexGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 6);
    const logoHex = new THREE.Mesh(logoHexGeo, yellowAccentMat);
    logoHex.position.set(0, mezHeight - 0.4, mezZ + 0.2);
    logoHex.rotation.x = Math.PI / 2;
    scene.add(logoHex);

    // =========================================================================
    // 6. BUILD WOODEN EURO PALLET BASE
    // =========================================================================
    const palletGroup = new THREE.Group();
    palletGroup.position.set(palletPos.current.x, 0, palletPos.current.z);
    palletGroupRef.current = palletGroup;

    const woodMat = new THREE.MeshStandardMaterial({
      color: '#a87e53',
      roughness: 0.85,
      metalness: 0.05,
    });
    const woodDarkMat = new THREE.MeshStandardMaterial({
      color: '#785635',
      roughness: 0.9,
    });

    // 3 bottom runner skids
    [-0.48, 0, 0.48].forEach(x => {
      const skidGeo = new THREE.BoxGeometry(0.12, 0.03, 1.25);
      const skid = new THREE.Mesh(skidGeo, woodDarkMat);
      skid.position.set(x, 0.015, 0);
      skid.castShadow = true;
      skid.receiveShadow = true;
      palletGroup.add(skid);

      // 3 spacer blocks on each runner
      [-0.5, 0, 0.5].forEach(z => {
        const blockGeo = new THREE.BoxGeometry(0.12, 0.07, 0.12);
        const block = new THREE.Mesh(blockGeo, woodDarkMat);
        block.position.set(x, 0.065, z);
        block.castShadow = true;
        block.receiveShadow = true;
        palletGroup.add(block);
      });
    });

    // Top deck wood planks
    const plankCount = 7;
    for (let p = 0; p < plankCount; p++) {
      const zPos = -0.54 + p * (1.08 / (plankCount - 1));
      const plankGeo = new THREE.BoxGeometry(1.2, 0.03, 0.14);
      const plank = new THREE.Mesh(plankGeo, woodMat);
      plank.position.set(0, 0.115, zPos);
      plank.castShadow = true;
      plank.receiveShadow = true;
      palletGroup.add(plank);
    }

    // Pallet Base invisible grab hitbox
    const palletGrabHitBoxGeo = new THREE.BoxGeometry(1.3, 0.16, 1.35);
    const palletGrabHitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
    const palletGrabHitBox = new THREE.Mesh(palletGrabHitBoxGeo, palletGrabHitBoxMat);
    palletGrabHitBox.position.set(0, 0.08, 0);
    palletGrabHitBox.name = 'PALLET_BASE_HITBOX';
    palletGroup.add(palletGrabHitBox);

    scene.add(palletGroup);

    // =========================================================================
    // 7. BUILD 5 INDEPENDENT 3D COPPER SPOOLS WITH TEFLON / RAW COPPER MODES
    // =========================================================================
    
    // Shiny pure metallic copper material for raw coiled copper tubing
    const rawCopperMat = new THREE.MeshStandardMaterial({
      color: '#c95b28',
      roughness: 0.22,
      metalness: 0.95,
      emissive: '#1a0700',
    });

    const copperGrooveMat = new THREE.MeshStandardMaterial({
      color: '#b34719',
      roughness: 0.28,
      metalness: 0.92,
    });

    const cardboardMat = new THREE.MeshStandardMaterial({
      color: '#c29b6b',
      roughness: 0.8,
    });

    const innerCoreMat = new THREE.MeshStandardMaterial({
      color: '#2a2826',
      roughness: 0.7,
    });

    // High-Detail White Teflon / Protective Film Wrap Material (تفلون / سلفون محافظ پلمپ کارخانه)
    const teflonMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.35,
      metalness: 0.05,
    });

    const teflonFilmMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.12,
      metalness: 0.02,
      transmission: 0.65,
      opacity: 0.45,
      transparent: true,
      reflectivity: 0.8,
      clearcoat: 0.9,
    });

    // =========================================================================
    // HIGH-RESOLUTION FACTORY SPECIFICATION LABEL TEXTURES (ASTERIA LWC)
    // =========================================================================

    // Individual Coil Label (Exact 1:1 replica of user's photo 1)
    const createAsteriaCoilLabelTexture = (coilNumber: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 1400;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      // Clean White Label Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 2048, 1400);

      // Label Outer Border
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, 2028, 1380);

      // -------------------------------------------------------------
      // LEFT SECTION: ASTERIA LOGO & BRANDING
      // -------------------------------------------------------------
      const logoX = 235;
      const logoY = 660;

      // Circle stencil
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(logoX, logoY - 140, 100, 0, Math.PI * 2);
      ctx.stroke();

      // 'A' triangular shape inside circle
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(logoX, logoY - 220);
      ctx.lineTo(logoX + 66, logoY - 60);
      ctx.lineTo(logoX + 34, logoY - 60);
      ctx.lineTo(logoX + 16, logoY - 105);
      ctx.lineTo(logoX - 16, logoY - 105);
      ctx.lineTo(logoX - 34, logoY - 60);
      ctx.lineTo(logoX - 66, logoY - 60);
      ctx.closePath();
      ctx.fill();

      // Triangular cut-out
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(logoX, logoY - 175);
      ctx.lineTo(logoX + 12, logoY - 128);
      ctx.lineTo(logoX - 12, logoY - 128);
      ctx.closePath();
      ctx.fill();

      // Brand Name: ASTERIA
      ctx.fillStyle = '#000000';
      ctx.font = '900 62px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ASTERIA', logoX, logoY + 30);

      // Website URL
      ctx.font = 'bold 26px Arial, Helvetica, sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.fillText('www.asteriacopper.com', logoX, logoY + 80);

      // -------------------------------------------------------------
      // RIGHT SECTION: HIGH-CONTRAST SPECIFICATION TABLE
      // -------------------------------------------------------------
      const tableX = 470;
      const tableY = 40;
      const tableW = 1530;
      const tableH = 1320;

      // Header Dark Bar: SEAMLESS, C12200, ASTM B75
      const headerH = 125;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(tableX, tableY, tableW, headerH);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 52px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SEAMLESS, C12200, ASTM B75', tableX + tableW / 2, tableY + headerH / 2);

      // Table grid setup
      const rowCount = 9;
      const rowH = (tableH - headerH) / rowCount;
      const col1W = 210; // Left column (Size, Wt, Temper, etc.)
      const col2W = 320; // Middle column ((mm), (in), Net (kg), etc.)
      const col3W = tableW - col1W - col2W; // Value column

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4.5;

      // Outer table border
      ctx.strokeRect(tableX, tableY, tableW, tableH);

      // Horizontal Row Lines
      for (let r = 0; r <= rowCount; r++) {
        ctx.beginPath();
        ctx.moveTo(tableX, tableY + headerH + r * rowH);
        ctx.lineTo(tableX + tableW, tableY + headerH + r * rowH);
        ctx.stroke();
      }

      // Vertical Dividers
      ctx.beginPath();
      // Divider 1: between col 1 and col 2
      ctx.moveTo(tableX + col1W, tableY + headerH);
      ctx.lineTo(tableX + col1W, tableY + headerH + 2 * rowH); // Size rows
      ctx.moveTo(tableX + col1W, tableY + headerH + 3 * rowH);
      ctx.lineTo(tableX + col1W, tableY + headerH + 5 * rowH); // Wt rows
      ctx.stroke();

      // Divider 2: between col 2 and value col 3
      ctx.beginPath();
      ctx.moveTo(tableX + col1W + col2W, tableY + headerH);
      ctx.lineTo(tableX + col1W + col2W, tableY + tableH);
      ctx.stroke();

      // Divider for single label rows
      [2, 5, 6, 7, 8].forEach(rowIndex => {
        ctx.beginPath();
        ctx.moveTo(tableX + col1W + col2W, tableY + headerH + rowIndex * rowH);
        ctx.lineTo(tableX + col1W + col2W, tableY + headerH + (rowIndex + 1) * rowH);
        ctx.stroke();
      });

      // -------------------------------------------------------------
      // TABLE CONTENT PRINTING
      // -------------------------------------------------------------
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 1. SIZE
      ctx.font = '900 46px Arial, Helvetica, sans-serif';
      ctx.fillText('Size', tableX + col1W / 2, tableY + headerH + rowH);

      ctx.font = 'bold 40px Arial, Helvetica, sans-serif';
      ctx.fillText('(mm)', tableX + col1W + col2W / 2, tableY + headerH + rowH * 0.5);
      ctx.fillText('(in)', tableX + col1W + col2W / 2, tableY + headerH + rowH * 1.5);

      ctx.font = '900 54px Arial, Helvetica, sans-serif';
      ctx.fillText('15.87*0.45', tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 0.5);
      ctx.fillText('5/8*0.018', tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 1.5);

      // 2. LENGTH
      ctx.font = '900 44px Arial, Helvetica, sans-serif';
      ctx.fillText('Length(m)', tableX + (col1W + col2W) / 2, tableY + headerH + rowH * 2.5);
      ctx.font = '900 54px Arial, Helvetica, sans-serif';
      ctx.fillText('545', tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 2.5);

      // 3. WEIGHT
      const coilWeights = [105.8, 106.4, 105.2, 106.0, 105.6];
      const netVal = coilWeights[(coilNumber - 1) % 5];
      const grVal = (netVal + 13.2).toFixed(1);

      ctx.font = '900 46px Arial, Helvetica, sans-serif';
      ctx.fillText('Wt.', tableX + col1W / 2, tableY + headerH + rowH * 4);

      ctx.font = 'bold 40px Arial, Helvetica, sans-serif';
      ctx.fillText('Net (kg)', tableX + col1W + col2W / 2, tableY + headerH + rowH * 3.5);
      ctx.fillText('Gr. (kg)', tableX + col1W + col2W / 2, tableY + headerH + rowH * 4.5);

      ctx.font = '900 54px Arial, Helvetica, sans-serif';
      ctx.fillText(`${netVal}`, tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 3.5);
      ctx.fillText(`${grVal}`, tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 4.5);

      // 4. TEMPER
      ctx.font = '900 44px Arial, Helvetica, sans-serif';
      ctx.fillText('Temper', tableX + (col1W + col2W) / 2, tableY + headerH + rowH * 5.5);
      ctx.font = '900 54px Arial, Helvetica, sans-serif';
      ctx.fillText('O60', tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 5.5);

      // 5. DEFECT NO.
      ctx.font = '900 44px Arial, Helvetica, sans-serif';
      ctx.fillText('Defect NO.', tableX + (col1W + col2W) / 2, tableY + headerH + rowH * 6.5);
      ctx.font = '900 54px Arial, Helvetica, sans-serif';
      ctx.fillText('1', tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 6.5);

      // 6. MFG. DATE
      ctx.font = '900 44px Arial, Helvetica, sans-serif';
      ctx.fillText('Mfg. Date', tableX + (col1W + col2W) / 2, tableY + headerH + rowH * 7.5);
      ctx.font = '900 52px Arial, Helvetica, sans-serif';
      ctx.fillText('2026.02.23', tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 7.5);

      // 7. BATCH NO.
      ctx.font = '900 44px Arial, Helvetica, sans-serif';
      ctx.fillText('Batch NO.', tableX + (col1W + col2W) / 2, tableY + headerH + rowH * 8.5);
      ctx.font = '900 52px Arial, Helvetica, sans-serif';
      ctx.fillText(`260222PG2100${coilNumber}`, tableX + col1W + col2W + col3W / 2, tableY + headerH + rowH * 8.5);

      // -------------------------------------------------------------
      // BLUE INK FACTORY "QC PASS" STAMP
      // -------------------------------------------------------------
      ctx.save();
      ctx.translate(tableX + col1W + col2W + col3W / 2 + 130, tableY + headerH + rowH * 6.6);
      ctx.rotate(-0.1);
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

      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ASTERIA COPPER', 0, -50);
      ctx.font = '900 42px Arial, sans-serif';
      ctx.fillText('QC PASS', 0, 8);
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText('Code 4', 0, 56);
      ctx.restore();

      const tex = new THREE.CanvasTexture(canvas);
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = 16;
      tex.needsUpdate = true;
      return tex;
    };

    // Create 5 individual spool 3D groups in the scene
    for (let i = 0; i < 5; i++) {
      const singleSpoolGroup = new THREE.Group();
      singleSpoolGroup.name = `SPOOL_GROUP_${i}`;
      (singleSpoolGroup as any).spoolId = i;

      // 1. Bottom flange disc
      const bottomDiscGeo = new THREE.CylinderGeometry(spoolFlangeRadius, spoolFlangeRadius, spoolFlangeThick, 36);
      const bottomDisc = new THREE.Mesh(bottomDiscGeo, cardboardMat);
      bottomDisc.position.set(0, -spoolHeight / 2 - spoolFlangeThick / 2, 0);
      bottomDisc.castShadow = true;
      bottomDisc.receiveShadow = true;
      singleSpoolGroup.add(bottomDisc);

      // 2. Inner Core Tube
      const innerCoreGeo = new THREE.CylinderGeometry(0.22, 0.22, spoolHeight, 28);
      const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
      singleSpoolGroup.add(innerCore);

      // 3. Raw Copper Wound Cylinder (سیم‌پیچ لوله مسی براق خالص)
      const rawCopperGeo = new THREE.CylinderGeometry(spoolRadius, spoolRadius, spoolHeight, 36, 12);
      const rawCopperMesh = new THREE.Mesh(rawCopperGeo, rawCopperMat);
      rawCopperMesh.castShadow = true;
      rawCopperMesh.receiveShadow = true;
      singleSpoolGroup.add(rawCopperMesh);

      // 4. Individual Copper Tube Windings (شیارهای واقعی لوله مسی دور قرقره)
      for (let r = -5; r <= 5; r++) {
        const ringGeo = new THREE.TorusGeometry(spoolRadius + 0.002, 0.013, 10, 36);
        const ring = new THREE.Mesh(ringGeo, copperGrooveMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, r * (spoolHeight / 12), 0);
        singleSpoolGroup.add(ring);
      }

      // 5. Top flange disc
      const topDiscGeo = new THREE.CylinderGeometry(spoolFlangeRadius, spoolFlangeRadius, spoolFlangeThick, 36);
      const topDisc = new THREE.Mesh(topDiscGeo, cardboardMat);
      topDisc.position.set(0, spoolHeight / 2 + spoolFlangeThick / 2, 0);
      topDisc.castShadow = true;
      topDisc.receiveShadow = true;
      singleSpoolGroup.add(topDisc);

      // =========================================================================
      // 6. TEFLON & PROTECTIVE SEAL WRAPPER GROUP (پوشش تفلون سفید پلمپ کارخانه)
      // =========================================================================
      const teflonWrapGroup = new THREE.Group();
      teflonWrapGroup.name = `TEFLON_WRAP_${i}`;

      // Solid white teflon protective wrapper band
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

      // Flared shrink wrap edges on top and bottom
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

      // Clear shrink foil outer layer
      const outerFoilGeo = new THREE.CylinderGeometry(spoolFlangeRadius + 0.008, spoolFlangeRadius + 0.008, totalSpoolHeight, 36);
      const outerFoilMesh = new THREE.Mesh(outerFoilGeo, teflonFilmMat);
      teflonWrapGroup.add(outerFoilMesh);

      singleSpoolGroup.add(teflonWrapGroup);
      spoolTeflonWraps.current[i] = teflonWrapGroup;

      // -------------------------------------------------------------
      // 7. HIGH-RESOLUTION ASTERIA LABEL DIRECTLY ON SPOOL FRONT FACE
      // (Positioned facing the front/camera view for clear inspection)
      // -------------------------------------------------------------
      const coilLabelTexture = createAsteriaCoilLabelTexture(i + 1);
      const labelMat = new THREE.MeshBasicMaterial({
        map: coilLabelTexture,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      });
      // Curved label geometry positioned right on the outer face facing front camera
      const labelGeo = new THREE.CylinderGeometry(
        spoolRadius + 0.024,
        spoolRadius + 0.024,
        0.23,
        36,
        1,
        true,
        0.715, // Centered squarely facing front camera
        0.95   // Arc width (~0.5m)
      );
      const coilLabelMesh = new THREE.Mesh(labelGeo, labelMat);
      coilLabelMesh.name = `SPOOL_LABEL_${i}`;
      coilLabelMesh.renderOrder = 20;
      singleSpoolGroup.add(coilLabelMesh);

      // 8. Interactive Invisible Bounding Hitbox for Spool
      const spoolHitBoxGeo = new THREE.CylinderGeometry(spoolFlangeRadius + 0.08, spoolFlangeRadius + 0.08, totalSpoolHeight + 0.05, 16);
      const spoolHitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
      const spoolHitBox = new THREE.Mesh(spoolHitBoxGeo, spoolHitBoxMat);
      spoolHitBox.name = `SPOOL_HITBOX_${i}`;
      (spoolHitBox as any).spoolId = i;
      singleSpoolGroup.add(spoolHitBox);

      scene.add(singleSpoolGroup);
      spool3DGroups.current[i] = singleSpoolGroup;
    }

    // Top protective cardboard cap flush directly on top of the stacked spools
    const topCapGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.015, 36);
    const topCap = new THREE.Mesh(topCapGeo, cardboardMat);
    topCap.position.set(palletPos.current.x, palletTopSurfaceY + 5 * totalSpoolHeight + 0.0075, palletPos.current.z);
    topCap.castShadow = true;
    scene.add(topCap);
    topCardboardCapRef.current = topCap;

    update3DSpoolTransforms();

    // ==========================================
    // 8. ANIMATION RENDER LOOP & 3D PROJECTION
    // ==========================================
    let lastTime = performance.now();

    const animate = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // WASD / Arrow Keys Movement
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
          cameraTarget.current.x = Math.max(-hangarWidth / 2 + 1, Math.min(hangarWidth / 2 - 1, cameraTarget.current.x));
          cameraTarget.current.z = Math.max(-hangarLength / 2 + 2, Math.min(hangarLength / 2 - 2, cameraTarget.current.z));

          updateCam();
        }
      }

      // Update Camera lookAt
      renderer.render(scene, camera);
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const nw = containerRef.current.clientWidth;
      const nh = containerRef.current.clientHeight;
      cameraRef.current.aspect = nw / nh;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(nw, nh);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // Keyboard Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.dispose();
    };
  }, [totalSpoolHeight, update3DSpoolTransforms]);

  // Update camera position helper
  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;
    const sp = cameraSpherical.current;
    const tgt = cameraTarget.current;
    const x = tgt.x + sp.radius * Math.sin(sp.phi) * Math.sin(sp.theta);
    const y = tgt.y + sp.radius * Math.cos(sp.phi);
    const z = tgt.z + sp.radius * Math.sin(sp.phi) * Math.cos(sp.theta);
    camera.position.set(x, Math.max(0.08, y), z);
    camera.lookAt(tgt);
  }, []);

  // Helper: Raycast check for Pallet or Individual Spools
  const checkIntersections = (clientX: number, clientY: number) => {
    if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), cameraRef.current);

    // 1. Check all Spool Hitboxes
    const spoolHitBoxes: THREE.Object3D[] = [];
    Object.values(spool3DGroups.current).forEach((grp) => {
      grp.traverse((child) => {
        if (child.name.startsWith('SPOOL_HITBOX_')) {
          spoolHitBoxes.push(child);
        }
      });
    });

    const spoolIntersects = raycaster.intersectObjects(spoolHitBoxes, false);
    if (spoolIntersects.length > 0) {
      const hitObj = spoolIntersects[0].object;
      const spoolId = (hitObj as any).spoolId as number;
      const hitOnFloor = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane.current, hitOnFloor);
      return { type: 'spool' as const, spoolId, hitOnFloor };
    }

    // 2. Check Pallet Base Hitbox
    if (palletGroupRef.current) {
      const palletIntersects = raycaster.intersectObjects(palletGroupRef.current.children, true);
      if (palletIntersects.length > 0) {
        const hitOnFloor = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane.current, hitOnFloor);
        return { type: 'pallet' as const, hitOnFloor };
      }
    }

    return null;
  };

  // 3D Pointer Down: Dragging Pallet vs Dragging Spool vs Orbiting Camera
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
    clickStartPos.current = { x: e.clientX, y: e.clientY };

    if (e.button === 0) {
      const hit = checkIntersections(e.clientX, e.clientY);
      clickedHitType.current = hit ? hit.type : null;

      if (hit?.type === 'spool' && hit.spoolId !== undefined) {
        const spoolId = hit.spoolId;
        const currentSpool = spoolsRef.current.find(s => s.id === spoolId);

        // ONLY allow dragging if the spool is ALREADY detached and on the floor
        if (currentSpool && !currentSpool.onPallet) {
          activeDraggedSpoolId.current = spoolId;
          dragOffset.current.set(
            currentSpool.posX - hit.hitOnFloor.x,
            0,
            currentSpool.posZ - hit.hitOnFloor.z
          );
          return;
        }

        // Spool is currently on the pallet: do NOT detach on single click or drag!
        // Allow camera orbiting around the pallet instead
        isDraggingCamera.current = true;
        return;
      }

      if (hit?.type === 'pallet') {
        // User clicked on the wooden pallet base: drag the entire pallet
        isDraggingPallet.current = true;
        dragOffset.current.set(
          palletPos.current.x - hit.hitOnFloor.x,
          0,
          palletPos.current.z - hit.hitOnFloor.z
        );
        return;
      }

      // Clicked on empty space: Orbit Camera
      isDraggingCamera.current = true;
    } else if (e.button === 1 || e.button === 2) {
      isPanning.current = true;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // 1. Dragging an individual Spool
    if (activeDraggedSpoolId.current !== null && cameraRef.current && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), cameraRef.current);

      const hitOnFloor = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(dragPlane.current, hitOnFloor)) {
        const newX = Math.max(-8.5, Math.min(8.5, hitOnFloor.x + dragOffset.current.x));
        const newZ = Math.max(-20, Math.min(20, hitOnFloor.z + dragOffset.current.z));

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

    // 2. Dragging the whole wooden Pallet
    if (isDraggingPallet.current && cameraRef.current && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), cameraRef.current);

      const hitOnFloor = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(dragPlane.current, hitOnFloor)) {
        const newX = Math.max(-8.5, Math.min(8.5, hitOnFloor.x + dragOffset.current.x));
        const newZ = Math.max(-20, Math.min(20, hitOnFloor.z + dragOffset.current.z));

        palletPos.current = { x: newX, z: newZ };

        if (palletGroupRef.current) {
          palletGroupRef.current.position.set(newX, 0, newZ);
        }
        if (palletZoneRef.current) {
          palletZoneRef.current.position.set(newX, 0.005, newZ);
        }

        update3DSpoolTransforms();
      }
      return;
    }

    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };

    // 3. Orbit Camera
    if (isDraggingCamera.current && cameraRef.current) {
      cameraSpherical.current.theta -= deltaX * 0.007;
      cameraSpherical.current.phi = Math.max(0.04, Math.min(Math.PI / 2 - 0.02, cameraSpherical.current.phi - deltaY * 0.007));
      updateCameraPosition();
      return;
    }

    // 4. Pan Camera
    if (isPanning.current && cameraRef.current) {
      const forward = new THREE.Vector3();
      cameraRef.current.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(cameraRef.current.up, forward).normalize();

      cameraTarget.current.addScaledVector(right, deltaX * 0.015);
      cameraTarget.current.addScaledVector(forward, deltaY * 0.015);
      updateCameraPosition();
      return;
    }

    // Hover state check
    if (!isDraggingCamera.current && !isPanning.current) {
      const hit = checkIntersections(e.clientX, e.clientY);
      isHoveringSpool.current = hit?.type === 'spool' ? (hit.spoolId ?? null) : null;
      isHoveringPallet.current = hit?.type === 'pallet';
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    // If we just finished dragging a spool, check if dropped back near the pallet
    if (activeDraggedSpoolId.current !== null) {
      const spoolId = activeDraggedSpoolId.current;
      const currentSpool = spoolsRef.current.find(s => s.id === spoolId);

      if (currentSpool) {
        const distToPallet = Math.hypot(currentSpool.posX - palletPos.current.x, currentSpool.posZ - palletPos.current.z);
        // If dropped within 1.1m of the pallet, snap it back onto the pallet!
        if (distToPallet < 1.1) {
          setSpools(prev => prev.map(s => s.id === spoolId ? {
            ...s,
            onPallet: true,
            isSealed: true, // پلمپ مجدد با تفلون
            posX: palletPos.current.x,
            posZ: palletPos.current.z,
          } : s));
        }
      }
    }

    // Check if it was a pure click on pallet/spool (not a drag)
    const distMoved = Math.hypot(e.clientX - clickStartPos.current.x, e.clientY - clickStartPos.current.y);
    if (distMoved < 6 && clickedHitType.current !== null) {
      setShowInfoCard(prev => !prev);
    }

    activeDraggedSpoolId.current = null;
    isDraggingPallet.current = false;
    isDraggingCamera.current = false;
    isPanning.current = false;
  };

  // Zoom directly to mouse cursor point
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), cameraRef.current);

    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();
    const hasIntersection = raycaster.ray.intersectPlane(floorPlane, hitPoint);

    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

    if (hasIntersection) {
      const targetLerpWeight = e.deltaY > 0 ? -0.03 : 0.06;
      cameraTarget.current.lerp(hitPoint, targetLerpWeight);
      cameraTarget.current.x = Math.max(-9.5, Math.min(9.5, cameraTarget.current.x));
      cameraTarget.current.z = Math.max(-21, Math.min(21, cameraTarget.current.z));
    }

    cameraSpherical.current.radius = Math.max(0.35, Math.min(45, cameraSpherical.current.radius * zoomFactor));
    updateCameraPosition();
  };

  // Double click handler: Detach or Restack specific spool on double click!
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = checkIntersections(e.clientX, e.clientY);

    if (hit?.type === 'spool' && hit.spoolId !== undefined) {
      const spoolId = hit.spoolId;
      const currentSpool = spoolsRef.current.find(s => s.id === spoolId);

      if (currentSpool) {
        if (currentSpool.onPallet) {
          // Double-clicked on a spool that is ON the pallet -> Detach it to the floor!
          const offSpools = spoolsRef.current.filter(s => !s.onPallet);
          const offIndex = offSpools.length;
          const targetFloorX = palletPos.current.x + 1.6 + (offIndex % 2) * 1.3;
          const targetFloorZ = palletPos.current.z + Math.floor(offIndex / 2) * 1.3 - 0.5;

          setSpools(prev => prev.map(s => s.id === spoolId ? {
            ...s,
            onPallet: false,
            isSealed: false, // تفلون برداشته شده و مس نمایان می‌شود
            posX: targetFloorX,
            posZ: targetFloorZ,
          } : s));
        } else {
          // Double-clicked on a separated spool on the floor -> Return it back to the pallet!
          setSpools(prev => prev.map(s => s.id === spoolId ? {
            ...s,
            onPallet: true,
            isSealed: true, // پلمپ مجدد با تفلون
            posX: palletPos.current.x,
            posZ: palletPos.current.z,
          } : s));
        }
        return;
      }
    }

    // Double-clicked on empty background: focus camera on pallet/label
    cameraTarget.current.set(palletPos.current.x, palletTopSurfaceY + 2 * totalSpoolHeight, palletPos.current.z);
    cameraSpherical.current.radius = 0.85;
    cameraSpherical.current.phi = Math.PI / 2.05;
    cameraSpherical.current.theta = 0.38;
    updateCameraPosition();
  };

  // Quick close-up zoom to view spool labels at 1:1 scale
  const handleZoomToLabel = () => {
    cameraTarget.current.set(palletPos.current.x, palletTopSurfaceY + 2 * totalSpoolHeight, palletPos.current.z);
    cameraSpherical.current.radius = 0.85;
    cameraSpherical.current.phi = Math.PI / 2.05;
    cameraSpherical.current.theta = 0.38;
    updateCameraPosition();
  };

  // =========================================================================
  // ACTIONS: SPOOL PICK UP / RETURN TO PALLET / SEAL TOGGLE
  // =========================================================================
  
  // Pick up top spool from pallet and place on floor (without teflon)
  const handleUnstackTopSpool = () => {
    const spoolsOnPallet = spools.filter(s => s.onPallet);
    if (spoolsOnPallet.length === 0) return;

    // Pick the highest index spool currently on pallet
    const topSpool = spoolsOnPallet[spoolsOnPallet.length - 1];
    const offIndex = 5 - spoolsOnPallet.length;
    
    // Position beside pallet on floor
    const targetFloorX = palletPos.current.x + 1.6 + (offIndex % 2) * 1.3;
    const targetFloorZ = palletPos.current.z + Math.floor(offIndex / 2) * 1.3 - 0.5;

    setSpools(prev => prev.map(s => s.id === topSpool.id ? {
      ...s,
      onPallet: false,
      isSealed: false, // تفلون برداشته می‌شود و مس خالص نمایان می‌شود
      posX: targetFloorX,
      posZ: targetFloorZ,
    } : s));
  };

  // Return all spools back to pallet and seal them
  const handleRestackAllSpools = () => {
    setSpools(prev => prev.map(s => ({
      ...s,
      onPallet: true,
      isSealed: true, // پلمپ کامل همه قرقره‌ها با تفلون
      posX: palletPos.current.x,
      posZ: palletPos.current.z,
    })));
  };

  const countOnPallet = spools.filter(s => s.onPallet).length;
  const countOffPallet = 5 - countOnPallet;

  return (
    <div className="fixed inset-0 z-[100] bg-stone-950 overflow-hidden flex flex-col w-screen h-screen select-none font-sans">
      
      {/* 3D CANVAS VIEWPORT - 100% IMMERSIVE FULLSCREEN */}
      <div 
        ref={containerRef}
        className="relative w-full h-full flex-1 bg-stone-950 overflow-hidden"
      >
        {/* Canvas Element */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          className={`w-full h-full outline-none block select-none ${
            isHoveringSpool.current !== null || isHoveringPallet.current ? 'cursor-move' : 'cursor-grab active:cursor-grabbing'
          }`}
          style={{ touchAction: 'none' }}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* TOP FLOATING CONTROLS: EXIT & QUICK ACTIONS */}
        <div className="absolute top-5 left-5 z-50 flex items-center gap-3">
          {handleExit && (
            <button
              type="button"
              onClick={handleExit}
              className="px-4 sm:px-5 py-2.5 sm:py-3 bg-rose-600/90 hover:bg-rose-600 text-white rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer border border-rose-500 shadow-2xl backdrop-blur-md flex items-center gap-2 active:scale-95 group"
              title="خروج از فضای ۳ بعدی سوله و بازگشت به انبار (یا فشردن کلید ESC)"
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
              <span>خروج از فضای ۳ بعدی</span>
              <span className="text-[11px] bg-rose-950/70 text-rose-200 px-2 py-0.5 rounded-lg font-mono font-bold">
                ESC
              </span>
            </button>
          )}

          {/* Quick Spool Unstack / Restack / Zoom Buttons */}
          <div className="flex flex-wrap items-center gap-2 bg-stone-900/90 border border-stone-800 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
            {/* Quick Macro Zoom to Label Button */}
            <button
              type="button"
              onClick={handleZoomToLabel}
              className="px-3.5 py-2 bg-blue-600/25 hover:bg-blue-600/40 text-blue-300 border border-blue-500/50 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-lg"
              title="زوم بسیار نزدیک ۳ بعدی روی برچسب قرقره مس"
            >
              <ZoomIn className="w-4 h-4 text-blue-400" />
              <span>زوم روی برچسب</span>
            </button>

            {/* HD Label Inspector Modal Button */}
            <button
              type="button"
              onClick={() => setShowHdLabelModal(true)}
              className="px-3.5 py-2 bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/50 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-lg"
              title="مشاهده نسخه باکیفیت و بزرگ برچسب کارخانه طبق عکس"
            >
              <FileText className="w-4 h-4 text-purple-300" />
              <span>برچسب HD</span>
            </button>

            <button
              type="button"
              onClick={handleUnstackTopSpool}
              disabled={countOnPallet === 0}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                countOnPallet > 0
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 active:scale-95'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-transparent'
              }`}
              title="برداشتن یک قرقره از روی پالت و قرار دادن آن روی زمین"
            >
              <MinusCircle className="w-4 h-4 text-amber-400" />
              <span>برداشتن ۱ قرقره</span>
            </button>

            {countOffPallet > 0 && (
              <button
                type="button"
                onClick={handleRestackAllSpools}
                className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
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

        {/* HIGH DEFINITION VECTOR LABEL MODAL INSPECTOR */}
        {showHdLabelModal && (
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full text-stone-900 shadow-2xl border-4 border-stone-900 animate-in zoom-in-95 duration-150 relative select-text">
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
                <span className="text-xs font-bold text-stone-500 font-mono">SPECIFICATION LABEL (LWC COIL)</span>
                <span className="text-sm font-black text-stone-900">برچسب مشخصات کارخانه‌ای کلاف مس</span>
              </div>

              {/* Exact Asteria Label Layout matching user's photo */}
              <div className="mt-4 border-2 border-stone-900 p-4 bg-white flex flex-col md:flex-row gap-4 items-center">
                {/* Left logo branding */}
                <div className="flex flex-col items-center justify-center p-3 border-b md:border-b-0 md:border-l-2 border-stone-300 w-full md:w-44 text-center">
                  <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center font-black text-2xl">
                    A
                  </div>
                  <span className="font-black text-xl tracking-widest mt-2 text-black">ASTERIA</span>
                  <span className="text-[10px] text-stone-600 font-mono mt-0.5">www.asteriacopper.com</span>
                </div>

                {/* Right Specification Table */}
                <div className="flex-1 w-full overflow-hidden">
                  <div className="bg-slate-900 text-white font-black text-center py-1.5 text-xs tracking-wider">
                    SEAMLESS, C12200, ASTM B75
                  </div>

                  <table className="w-full text-xs text-center border-collapse border border-slate-900 mt-1 font-sans">
                    <tbody>
                      <tr className="border-b border-slate-900">
                        <td rowSpan={2} className="border-r border-slate-900 p-1.5 font-black bg-stone-50 w-20">Size</td>
                        <td className="border-r border-slate-900 p-1 font-bold bg-stone-50 w-16">(mm)</td>
                        <td className="p-1 font-black text-sm">15.87*0.45</td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td className="border-r border-slate-900 p-1 font-bold bg-stone-50">(in)</td>
                        <td className="p-1 font-black text-sm">5/8*0.018</td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td colSpan={2} className="border-r border-slate-900 p-1.5 font-black bg-stone-50">Length(m)</td>
                        <td className="p-1.5 font-black text-sm">545</td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td rowSpan={2} className="border-r border-slate-900 p-1.5 font-black bg-stone-50">Wt.</td>
                        <td className="border-r border-slate-900 p-1 font-bold bg-stone-50">Net (kg)</td>
                        <td className="p-1 font-black text-sm">105.8</td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td className="border-r border-slate-900 p-1 font-bold bg-stone-50">Gr. (kg)</td>
                        <td className="p-1 font-black text-sm">119.0</td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td colSpan={2} className="border-r border-slate-900 p-1.5 font-black bg-stone-50">Temper</td>
                        <td className="p-1.5 font-black text-sm">O60</td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td colSpan={2} className="border-r border-slate-900 p-1.5 font-black bg-stone-50">Defect NO.</td>
                        <td className="p-1.5 font-black text-sm">1</td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td colSpan={2} className="border-r border-slate-900 p-1.5 font-black bg-stone-50">Mfg. Date</td>
                        <td className="p-1.5 font-black text-sm">2026.02.23</td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="border-r border-slate-900 p-1.5 font-black bg-stone-50">Batch NO.</td>
                        <td className="p-1.5 font-black text-sm font-mono text-blue-900">260222PG21009</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer action */}
              <div className="mt-4 flex items-center justify-between text-xs text-stone-500">
                <span className="font-mono">QC Stamp: PASS (Code 4)</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowHdLabelModal(false);
                    handleZoomToLabel();
                  }}
                  className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-xl font-bold transition-all cursor-pointer"
                >
                  مشاهده در فضای ۳ بعدی
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM HELPER HINT BAR */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none hidden sm:block">
          <div className="flex items-center gap-3 px-4 py-2 bg-stone-900/90 border border-stone-800/80 rounded-full shadow-2xl backdrop-blur-md text-[11px] text-stone-300">
            <span className="flex items-center gap-1 text-blue-400 font-bold">
              <span>🖱️ دوبار کلیک روی کلاف:</span>
              <span className="text-stone-300 font-normal">جداسازی / چیدن روی پالت</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-stone-700" />
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <span>🔄 کلیک و کشیدن:</span>
              <span className="text-stone-300 font-normal">چرخش ۳ بعدی</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-stone-700" />
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span>🔍 اسکرول:</span>
              <span className="text-stone-300 font-normal">زوم ماکرو</span>
            </span>
          </div>
        </div>

        {/* COMPACT & MINIMAL PALLET INFO CARD (Hidden by default, shown on pallet click or info toggle) */}
        {showInfoCard && (
          <div
            className="absolute bottom-6 right-6 z-40 w-72 sm:w-80 bg-stone-900/95 border border-amber-500/50 rounded-2xl p-4 shadow-[0_15px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl select-none text-right animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header with Title and Close Button */}
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
                <span className="text-xs font-black text-amber-300">پالت مس کلاف (LWC)</span>
                <span className="p-1 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                  <Package className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Concise Specs Rows */}
            <div className="mt-2.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-stone-950/70 border border-stone-800/60">
                <span className="font-mono font-black text-amber-300 text-xs">3/8" (9.52 mm)</span>
                <span className="font-medium text-stone-400 text-[11px]">قطر:</span>
              </div>

              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-stone-950/70 border border-stone-800/60">
                <span className="font-mono font-black text-emerald-300 text-xs">0.75 mm</span>
                <span className="font-medium text-stone-400 text-[11px]">ضخامت:</span>
              </div>

              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-stone-950/70 border border-stone-800/60">
                <span className="font-bold text-stone-200 text-[11px]">صنایع مس باهنر</span>
                <span className="font-medium text-stone-400 text-[11px]">سازنده:</span>
              </div>

              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-stone-950/70 border border-stone-800/60">
                <span className="font-mono font-bold text-amber-200 text-xs">
                  {countOnPallet} از ۵ کلاف
                  {countOffPallet > 0 && <span className="text-rose-400 text-[10px] mr-1">({countOffPallet} جدا شده)</span>}
                </span>
                <span className="font-medium text-stone-400 text-[11px]">موجودی پالت:</span>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
