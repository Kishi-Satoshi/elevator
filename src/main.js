import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import gsap from 'gsap';
import {
  initVoxel, buildFloorVoxels, enterFPMode, exitFPMode, relockFP,
  isFPActive, updateVoxel, voxelPointerAction, voxelTextures, voxelTexSet,
  shellTexturesFor, makeBlockPerson, makeBlockWheelchair,
  fieldSky, getDayInfo, setVoxelLight, dropInTop,
} from './voxel.js';

/* =====================================================================
   機種データ（AXIEZ-LINKs：カタログ参考の近似値）
===================================================================== */
const DATA = {
  label: 'AXIEZ-LINKs',
  walls: [
    { id: 'LA04', n: 'パウダリーホワイト LA04', hex: 0xf2efe9, css: '#f2efe9', cat: '化粧鋼板' },
    { id: 'LA05', n: 'サンディーベージュ LA05', hex: 0xe6dcc8, css: '#e6dcc8', cat: '化粧鋼板' },
    { id: 'LA06', n: 'テクスチュアドグレー LA06', hex: 0xbdb9b2, css: '#bdb9b2', cat: '化粧鋼板' },
    { id: 'CP132', n: 'フレッシュオーク CP132', hex: 0xcaa674, css: '#caa674', wood: true, cat: '化粧鋼板' },
    { id: 'WQ110', n: 'クリームベージュ WQ110', hex: 0xddd0b8, css: '#ddd0b8', cat: 'プレミアムウォール（有償）' },
    { id: 'WQ120', n: 'チェスナットブラウン WQ120', hex: 0x5e3d28, css: '#5e3d28', wood: true, cat: 'プレミアムウォール（有償）' },
    { id: 'SUS', n: 'ステンレス ヘアライン', hex: 0xc8cbd0, css: 'linear-gradient(180deg,#d8dbdf,#aeb2b8)', metal: true, cat: 'ステンレス（有償）' },
    { id: 'BKSUS', n: 'ブラックステンレス', hex: 0x3b3e43, css: 'linear-gradient(180deg,#4a4d52,#2b2e33)', metal: true, cat: 'ステンレス（有償）' },
  ],
  floors: [
    { cat: '樹脂タイル', id: 'TD01', n: '樹脂タイル ライトグレー TD01', hex: 0xcfd0cf, css: '#cfd0cf' },
    { cat: '樹脂タイル', id: 'TD05', n: '樹脂タイル ベージュ TD05', hex: 0xd8c9ac, css: '#d8c9ac' },
    { cat: '樹脂タイル', id: 'TD07', n: '樹脂タイル ブラウン TD07', hex: 0x7c5a3c, css: '#7c5a3c' },
    { cat: 'プレミアムフロア（有償）', id: 'FQ610', n: 'プレミアム アッシュグレー FQ610', hex: 0x97938d, css: '#97938d' },
    { cat: 'プレミアムフロア（有償）', id: 'FQ620', n: 'プレミアム アーバンブラック FQ620', hex: 0x3a3735, css: '#3a3735' },
    { cat: 'プレミアムフロア（有償）', id: 'FQ630', n: 'プレミアム テラコッタ FQ630', hex: 0xa8623f, css: '#a8623f' },
  ],
  ceilings: [
    { id: 'CL1', n: 'CL1 フラット照明', sub: '白色・全面発光', color: 0xffffff, type: 'flat' },
    { id: 'CL2W', n: 'CL2 ダウンライト', sub: '白色', color: 0xf2f8ff, type: 'down' },
    { id: 'CL2L', n: 'CL2 ダウンライト', sub: '電球色', color: 0xffe7c6, type: 'down' },
    { id: 'DL6', n: 'DL6 コーニス照明', sub: '電球色・間接光', color: 0xffead2, type: 'cornice' },
  ],
  panels: [
    { id: 'click', n: 'ステンレスクリックボタン', sub: '基本', btn: 0xd6d9dd, ring: 0x8a8f96, glow: 0xff9a2e },
    { id: 'crystal', n: 'クリスタルボタン', sub: '有償', btn: 0xeef3f8, ring: 0xbfd2e2, glow: 0xffb84d },
    { id: 'black', n: 'ブラックステンレス', sub: '有償', btn: 0x34373c, ring: 0x202327, glow: 0xff8a1e },
    { id: 'touchless', n: 'タッチレスボタン', sub: '非接触・有償', btn: 0xd6d9dd, ring: 0x36c6ee, glow: 0x46d3ff },
  ],
  caps: {
    P: [{ n: 7, kg: 450 }, { n: 9, kg: 600 }, { n: 11, kg: 750 }, { n: 13, kg: 900 }, { n: 15, kg: 1000 }],
    R: [{ n: 6, kg: 450 }, { n: 9, kg: 600 }, { n: 13, kg: 900 }, { n: 15, kg: 1000 }],
  },
  doors: [
    { id: 'DSUS', n: 'ステンレス ヘアライン', hex: 0xc8cbd0, metal: true, css: 'linear-gradient(180deg,#d8dbdf,#aeb2b8)' },
    { id: 'DBK', n: 'ブラックステンレス', hex: 0x3b3e43, metal: true, css: 'linear-gradient(180deg,#4a4d52,#2b2e33)' },
    { id: 'DWH', n: '鋼板塗装 ホワイト', hex: 0xf0efeb, css: '#f0efeb' },
    { id: 'DBE', n: '鋼板塗装 ベージュ', hex: 0xd9cdb6, css: '#d9cdb6' },
    { id: 'DOK', n: '木目 オーク', hex: 0xb98f5e, wood: true, css: '#b98f5e' },
    { id: 'DWN', n: '木目 ウォルナット', hex: 0x6a4a33, wood: true, css: '#6a4a33' },
  ],
  frames: [
    { id: 'SUS', n: 'ステンレス ヘアライン', hex: 0xc8cbd0, metal: true, css: 'linear-gradient(180deg,#d8dbdf,#aeb2b8)' },
    { id: 'BK', n: 'ブラックステンレス', hex: 0x2b2e33, metal: true, css: 'linear-gradient(180deg,#3a3d42,#1f2226)' },
    { id: 'CG', n: 'シャンパンゴールド', hex: 0xcdb286, metal: true, css: 'linear-gradient(180deg,#dcc79e,#b89a68)' },
  ],
  kicks: [
    { id: 'BLK', n: 'ブラック', hex: 0x17191d, css: '#17191d' },
    { id: 'KSUS', n: 'ステンレス', hex: 0xc8cbd0, metal: true, css: 'linear-gradient(180deg,#d8dbdf,#aeb2b8)' },
  ],
  styles: [
    { id: 'luxury', n: 'LUXURY', d: '豊かな面質と間接光がつくる上質', wall: 'WQ120', floor: 'FQ620', ceil: 'DL6', panel: 'crystal', door: 'DBK', frame: 'BK' },
    { id: 'natural', n: 'NATURAL', d: '木の材質感を生かした自然体', wall: 'CP132', floor: 'FQ610', ceil: 'CL2L', panel: 'click', door: 'DSUS', frame: 'SUS' },
    { id: 'comfort', n: 'COMFORT', d: '明るい天井とやわらかな温度感', wall: 'LA05', floor: 'TD05', ceil: 'CL1', panel: 'click', door: 'DWH', frame: 'SUS' },
    { id: 'modern', n: 'MODERN', d: 'ノイズのない都会的なライン', wall: 'LA06', floor: 'FQ630', ceil: 'CL2W', panel: 'black', door: 'DBK', frame: 'BK' },
  ],
  ann: {
    ja: [['上昇', '上へまいります'], ['下降', '下へまいります'], ['戸閉', 'ドアが閉まります。ご注意ください'], ['戸開', 'ドアが開きます'], ['満員', '次のエレベーターをご利用ください']],
    en: [['Up', 'Going up'], ['Down', 'Going down'], ['Closing', 'The doors are closing'], ['Opening', 'The doors are opening'], ['Full', 'Please wait for the next elevator']],
  },
};

/* 百貨店フロアガイド：到着階ごとに乗場の空気感・売場・アナウンスが変わる */
const FLOOR_GUIDE = [
  null,
  { jp: '化粧品・ラグジュアリー', en: 'Cosmetics & Luxury', wall: 0xf2ead8, floor: 0xd9d2c2, light: 0xffefd0, inten: 1.25, accent: 0xc9a44c, arch: 'counters' },
  { jp: '婦人服・シューズ', en: "Ladies' Fashion", wall: 0xeadfd2, floor: 0xcdc2b2, light: 0xffe9d8, inten: 1.1, accent: 0xc98a96, arch: 'racks' },
  { jp: '紳士服・ビジネス', en: "Men's Fashion", wall: 0x5c6068, floor: 0x44464c, light: 0xe6ecf6, inten: 0.85, accent: 0x33507a, arch: 'racks' },
  { jp: '書籍・文具・カフェ', en: 'Books & Cafe', wall: 0xd9c9a8, floor: 0xa89478, light: 0xffedca, inten: 1.0, accent: 0x4a6741, arch: 'shelves' },
  { jp: 'レストラン街', en: 'Restaurants', wall: 0x4c4238, floor: 0x3a342c, light: 0xffd9a0, inten: 0.7, accent: 0x28405c, arch: 'tables' },
  { jp: '催事場・イベント', en: 'Event Hall', wall: 0xf2e6d2, floor: 0xdcd0b8, light: 0xfff0c8, inten: 1.35, accent: 0xc83c3c, arch: 'plaza' },
  { jp: 'スカイラウンジ', en: 'Sky Lounge', wall: 0x28303e, floor: 0x20262f, light: 0xffca8c, inten: 0.55, accent: 0xe8a84c, arch: 'living' },
  { jp: '屋上庭園・展望', en: 'Rooftop Garden', wall: 0xc4d8e2, floor: 0xb2ab92, light: 0xf2faff, inten: 1.45, accent: 0x5a9a4c, arch: 'garden' },
];
/* 地下フロア (床を掘り抜くと降りられる)。0=B1, -1=B2, -2=B3 */
const MIN_FLOOR = -2;
const BASEMENT_GUIDE = {
  0:  { jp: '食品・デパ地下', en: 'Food Hall (B1)', wall: 0x2a2620, floor: 0x22201c, light: 0xffdca0, inten: .6, accent: 0xc8a860, arch: 'basement' },
  '-1': { jp: '駐車場', en: 'Parking (B2)', wall: 0x24262a, floor: 0x1c1e22, light: 0xcfe0ff, inten: .5, accent: 0x8890a0, arch: 'basement' },
  '-2': { jp: '機械室・倉庫', en: 'Machine Room (B3)', wall: 0x1e2024, floor: 0x181a1e, light: 0xa8e0ff, inten: .45, accent: 0x6a7280, arch: 'basement' },
};
function floorGuide(f) { return f >= 1 ? FLOOR_GUIDE[f] : BASEMENT_GUIDE[f]; }
function floorLabel(f) { return f >= 1 ? String(f) : 'B' + (1 - f); }      // 0→B1, -1→B2, -2→B3
function floorSign(f) { return f >= 1 ? `${f}F` : floorLabel(f); }
function isBasement(f) { return f <= 0; }

/* 状態 */
const S = {
  type: 'P', cap: 9, wall: 'CP132', floor: 'FQ610', ceil: 'CL2L', panel: 'click',
  door: 'DSUS', frame: 'SUS', kick: 'BLK', view: 'cab', people: 'none',
  handrail: true, mirror: true, style: 'natural', lang: 'ja',
  curFloor: 1, moving: false, doorsOpen: true, pending: null, started: false,
};

const STORE_KEY = 'axiez-experience-v1';
function saveState() {
  try {
    const { type, cap, wall, floor, ceil, panel, door, frame, kick, handrail, mirror, style, lang } = S;
    localStorage.setItem(STORE_KEY, JSON.stringify({ type, cap, wall, floor, ceil, panel, door, frame, kick, handrail, mirror, style, lang }));
  } catch { /* ignore */ }
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) Object.assign(S, JSON.parse(raw));
  } catch { /* ignore */ }
}

/* =====================================================================
   THREE 基盤
===================================================================== */
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050608);
scene.fog = new THREE.Fog(0x9ccdf0, 26, 78); // フィールドの奥行き感 (かご内には届かない距離)

let envOK = false;
try {
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  envOK = true;
} catch (e) { console.warn('env fallback', e); }

const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, .03, 80);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .07;
controls.enablePan = false;
controls.rotateSpeed = .55;

/* 視点モード: cab(かご内) / walk(フロア回遊) / doll(俯瞰) */
const VIEW_LIMITS = {
  cab: { min: .18, max: 1.15, pMin: .55, pMax: 2.05, pan: false },
  walk: { min: .3, max: 7.5, pMin: .3, pMax: 1.72, pan: true },
  doll: { min: 1.2, max: 9, pMin: .18, pMax: 1.5, pan: false },
};
function viewPose(mode) {
  const fz = -dims.D / 2;
  if (mode === 'walk') return { pos: [0.4, 1.62, fz - 0.7], tgt: [0, 1.25, fz - 3.4] };
  if (mode === 'doll') return { pos: [-3.2, 3.2, 3.1], tgt: [0, 1.05, -0.6] };
  // かご内: 扉(-Z)側を向いて立つ。左後方に構えて右前の操作盤(COP)も画面に収める
  return { pos: [-dims.W * 0.22, 1.52, dims.D / 2 - 0.28], tgt: [dims.W * 0.3, 1.3, fz] };
}
function applyLimits(m) {
  const c = VIEW_LIMITS[m];
  controls.minDistance = c.min; controls.maxDistance = c.max;
  controls.minPolarAngle = c.pMin; controls.maxPolarAngle = c.pMax;
  controls.enablePan = c.pan;
}
function flyTo(pos, tgt, dur = 1.4) {
  gsap.to(camera.position, { x: pos[0], y: pos[1], z: pos[2], duration: dur, ease: 'power3.inOut' });
  gsap.to(controls.target, { x: tgt[0], y: tgt[1], z: tgt[2], duration: dur, ease: 'power3.inOut', onUpdate: () => { if (!isFPActive()) controls.update(); } });
}
function resetView(immediate) {
  const p = viewPose(S.view);
  if (immediate) { camera.position.set(...p.pos); controls.target.set(...p.tgt); controls.update(); return; }
  flyTo(p.pos, p.tgt, 1.2);
}

function setView(mode) {
  if (mode === 'walk') { enterFloor(); return; }
  clearDepartTimer();
  exitFPMode();
  S.view = mode;
  applyLimits(mode);
  if (mode === 'doll' && S.doorsOpen && !S.moving) doors(false, 1.1); // 俯瞰時は戸閉で模型らしく
  if (cab.userData.hallGroup) cab.userData.hallGroup.visible = (mode !== 'doll');
  syncViewToggles();
  const p = viewPose(mode);
  flyTo(p.pos, p.tgt);
  updateFloorBtnLabel();
}
function syncViewToggles() {
  document.querySelectorAll('.tgl[data-view]').forEach(t => t.classList.toggle('active', t.dataset.view === S.view));
}
const ANGLES = {
  front: () => ({ p: [0, 1.48, -dims.D / 2 + .16], t: [0, 1.3, dims.D / 2] }),
  back: () => ({ p: [0, 1.5, dims.D / 2 - .16], t: [0, 1.32, -dims.D / 2] }),
  panel: () => { const px = cab.userData.panelX ?? dims.W * .4; return { p: [px * .35, 1.44, -dims.D / 2 + .9], t: [px, 1.32, -dims.D / 2] }; },
  ceil: () => ({ p: [0, 1.15, .12], t: [0, dims.H, 0] }),
  floor: () => ({ p: [0, 1.72, .06], t: [0, 0, .06] }),
};
function goAngle(k) {
  if (S.view !== 'cab') {
    clearDepartTimer();
    exitFPMode();
    S.view = 'cab'; applyLimits('cab');
    if (cab.userData.hallGroup) cab.userData.hallGroup.visible = true;
    syncViewToggles(); updateFloorBtnLabel();
  }
  const a = ANGLES[k]();
  flyTo(a.p, a.t, 1.3);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* =====================================================================
   リソース破棄 — 再構築時のGPUメモリリークを防ぐ
===================================================================== */
const KEEP_TEX = new Set();
function disposeObject(root) {
  root.traverse(o => {
    if (o.userData?.shared) return; // ボクセル等の共有ジオメトリ/マテリアルは破棄しない
    o.geometry?.dispose?.();
    const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    mats.forEach(m => {
      ['map', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'normalMap', 'bumpMap'].forEach(k => {
        if (m[k] && !KEEP_TEX.has(m[k]) && !voxelTexSet.has(m[k])) m[k].dispose();
      });
      m.dispose();
    });
    o.dispose?.(); // Reflector等
  });
}
function clearGroup(g) {
  while (g.children.length) { const o = g.children.pop(); disposeObject(o); }
}

/* =====================================================================
   テクスチャ生成（手続き的：木目・ヘアライン・床・液晶・刻印・サイン）
===================================================================== */
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy?.() ?? 4;
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = MAX_ANISO; // 浅い角度でも滲まない (高解像度化)
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function woodTex(base) {
  const b = new THREE.Color(base);
  return canvasTex(512, 1024, (g, w, h) => {
    g.fillStyle = '#' + b.getHexString(); g.fillRect(0, 0, w, h);
    // 細かな木目 (1px単位のストローク + うねり)
    for (let x = 0; x < w; x += 1) {
      const v = Math.sin(x * .06) * 8 + Math.sin(x * .021) * 18;
      const a = .04 + .045 * Math.abs(Math.sin(x * .15 + v * .05));
      g.fillStyle = `rgba(60,35,15,${a})`;
      g.fillRect(x, 0, 1, h);
      if (x % 3 === 0) { g.fillStyle = `rgba(255,240,220,${a * .5})`; g.fillRect(x + 1, 0, .6, h); }
    }
    // 節・板の陰影
    for (let i = 0; i < 8; i++) {
      const y = Math.random() * h;
      const grd = g.createLinearGradient(0, y - 60, 0, y + 60);
      grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(.5, 'rgba(70,40,15,.10)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, y - 60, w, 120);
    }
    g.fillStyle = 'rgba(40,22,8,.32)';
    [w / 3, (w / 3) * 2].forEach(x => g.fillRect(x - 1.5, 0, 3, h));
    g.fillStyle = 'rgba(255,245,230,.1)';
    [w / 3, (w / 3) * 2].forEach(x => g.fillRect(x + 1.8, 0, 1.2, h));
  });
}
function hairlineTex() {
  return canvasTex(256, 1024, (g, w, h) => {
    g.fillStyle = '#c9ccd1'; g.fillRect(0, 0, w, h);
    // ヘアライン: 1px毎に濃淡ゆらぎ + 時々深いスジ
    for (let y = 0; y < h; y++) {
      const v = Math.random() > .5 ? 255 : 30;
      g.fillStyle = `rgba(${v},${v},${v},${.03 + Math.random() * .04})`;
      g.fillRect(0, y, w, 1);
      if (Math.random() < .015) {
        g.fillStyle = 'rgba(20,22,26,.12)'; g.fillRect(0, y, w, 1);
        g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, y + 1, w, 1);
      }
    }
  });
}
function steelTex(base) {
  const b = new THREE.Color(base);
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#' + b.getHexString(); g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 1) {
      const v = Math.random() > .5 ? 255 : 0;
      g.fillStyle = `rgba(${v},${v},${v},${.012 + Math.random() * .012})`; g.fillRect(x, 0, 1, h);
    }
    // パネル継ぎ目 (陰影つき)
    g.fillStyle = 'rgba(0,0,0,.24)';
    [w / 3, (w / 3) * 2].forEach(x => g.fillRect(x - 2, 0, 4, h));
    g.fillStyle = 'rgba(255,255,255,.08)';
    [w / 3, (w / 3) * 2].forEach(x => g.fillRect(x + 2, 0, 2, h));
  });
}
function tileTex(base) {
  const b = new THREE.Color(base);
  const l = b.clone().multiplyScalar(1.06), d2 = b.clone().multiplyScalar(.92);
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#' + b.getHexString(); g.fillRect(0, 0, w, h);
    // 石目のまだら (2スケールのノイズ)
    for (let i = 0; i < 9000; i++) {
      const c = Math.random() > .5 ? l : d2;
      g.fillStyle = `rgba(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0},${.05 + Math.random() * .05})`;
      g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    // かすかな大理石ヴェイン
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) {
      g.beginPath();
      let x = Math.random() * w, y = 0;
      g.moveTo(x, y);
      while (y < h) { x += (Math.random() - .5) * 46; y += 18 + Math.random() * 26; g.lineTo(x, y); }
      g.stroke();
    }
    // 目地 (立体感のあるグルーヴ)
    g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, w - 3, h - 3);
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(w / 2 + 2.5, 0); g.lineTo(w / 2 + 2.5, h); g.moveTo(0, h / 2 + 2.5); g.lineTo(w, h / 2 + 2.5); g.stroke();
  });
}
/* ボタン刻印（階数・開閉・上下矢印） */
function btnLabelTex(label, dark) {
  const t = canvasTex(256, 256, (g) => {
    g.scale(2, 2); // 2倍解像度で精細な刻印に
    const w = 128, h = 128;
    g.clearRect(0, 0, w, h);
    g.fillStyle = dark ? 'rgba(240,244,248,.92)' : 'rgba(28,30,34,.88)';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const tri = (x, y, dir, size = 22) => {
      g.beginPath();
      if (dir === 'l' || dir === 'r') {
        g.moveTo(x, y - 16); g.lineTo(x, y + 16); g.lineTo(x + size * (dir === 'r' ? 1 : -1), y);
      } else {
        g.moveTo(x - 18, y + (dir === 'u' ? 12 : -12)); g.lineTo(x + 18, y + (dir === 'u' ? 12 : -12)); g.lineTo(x, y + (dir === 'u' ? -14 : 14));
      }
      g.closePath(); g.fill();
    };
    if (label === 'open' || label === 'close') {
      g.strokeStyle = g.fillStyle; g.lineWidth = 5;
      g.beginPath(); g.moveTo(w / 2, 22); g.lineTo(w / 2, h - 22); g.stroke();
      if (label === 'open') { tri(w / 2 - 14, h / 2, 'l'); tri(w / 2 + 14, h / 2, 'r'); }
      else { tri(w / 2 - 34, h / 2, 'r'); tri(w / 2 + 34, h / 2, 'l'); }
    } else if (label === 'up' || label === 'down') {
      tri(w / 2, h / 2, label === 'up' ? 'u' : 'd', 26);
    } else {
      g.font = '600 68px Inter, sans-serif';
      g.fillText(String(label), w / 2, h / 2 + 2);
    }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
/* 10.1型液晶 (2倍解像度で描画) */
const lcdCanvas = document.createElement('canvas'); lcdCanvas.width = 512; lcdCanvas.height = 840;
const lcdCtx = lcdCanvas.getContext('2d');
lcdCtx.scale(2, 2);
const lcdTex = new THREE.CanvasTexture(lcdCanvas); lcdTex.colorSpace = THREE.SRGBColorSpace;
lcdTex.anisotropy = MAX_ANISO;
KEEP_TEX.add(lcdTex);
function drawLCD(floor, dir) {
  const g = lcdCtx, w = 256, h = 420;
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#06121d'); grd.addColorStop(1, '#0a2235');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(120,210,255,.10)'; g.fillRect(0, 0, w, 86);
  g.fillStyle = '#9fdcff'; g.font = '300 30px Inter,sans-serif'; g.textAlign = 'center';
  g.fillText(dir === 'up' ? '▲' : dir === 'down' ? '▼' : '■', w / 2, 56);
  g.fillStyle = '#eaf7ff'; g.font = '200 140px Inter,sans-serif';
  g.fillText(floorLabel(floor), w / 2, 250);
  g.fillStyle = '#6fb8d8'; g.font = '400 17px "Zen Kaku Gothic New",sans-serif';
  g.fillText(floor >= 1 ? floor + '階' : '地下' + (1 - floor) + '階', w / 2, 294);
  const guide = floorGuide(floor);
  if (guide) {
    g.fillStyle = '#bfe6f8'; g.font = '400 15px "Zen Kaku Gothic New",sans-serif';
    g.fillText(guide.jp, w / 2, 330);
  }
  g.strokeStyle = 'rgba(140,220,255,.35)'; g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = 'rgba(160,225,255,.65)'; g.font = '200 12px Inter'; g.fillText('10.1" LCD INDICATOR', w / 2, 396);
  lcdTex.needsUpdate = true;
}
drawLCD(1, null);

/* ホールランタン（方向 + 階数） */
const lantCanvas = document.createElement('canvas'); lantCanvas.width = 384; lantCanvas.height = 144;
const lantCtx = lantCanvas.getContext('2d');
lantCtx.scale(2, 2);
const lantTex = new THREE.CanvasTexture(lantCanvas); lantTex.colorSpace = THREE.SRGBColorSpace;
lantTex.anisotropy = MAX_ANISO;
KEEP_TEX.add(lantTex);
function drawLantern(floor, dir) {
  const g = lantCtx, w = 192, h = 72;
  g.fillStyle = '#101216'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.16)'; g.strokeRect(1, 1, w - 2, h - 2);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = dir === 'up' ? '#ffb43c' : 'rgba(255,255,255,.14)';
  g.font = '300 30px Inter'; g.fillText('▲', w / 2 - 56, h / 2 + 2);
  g.fillStyle = dir === 'down' ? '#ffb43c' : 'rgba(255,255,255,.14)';
  g.fillText('▼', w / 2 + 56, h / 2 + 2);
  g.fillStyle = '#ffb43c'; g.font = '300 44px Inter';
  g.fillText(floorLabel(floor), w / 2, h / 2 + 3);
  lantTex.needsUpdate = true;
}
drawLantern(1, null);

/* フロアサイネージ（乗場の売場案内板） */
const signCanvas = document.createElement('canvas'); signCanvas.width = 1280; signCanvas.height = 400;
const signCtx = signCanvas.getContext('2d');
signCtx.scale(2, 2);
const signTex = new THREE.CanvasTexture(signCanvas); signTex.colorSpace = THREE.SRGBColorSpace;
signTex.anisotropy = MAX_ANISO;
KEEP_TEX.add(signTex);
function drawSign(floor) {
  const t = floorGuide(floor); if (!t) return;
  const g = signCtx, w = 640, h = 200;
  g.fillStyle = '#14161a'; g.fillRect(0, 0, w, h);
  const ac = '#' + new THREE.Color(t.accent).getHexString();
  g.fillStyle = ac; g.fillRect(0, 0, 14, h);
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillStyle = '#f4f5f6'; g.font = '200 96px Inter';
  g.fillText(floorSign(floor), 44, h / 2 - 8);
  g.font = '500 44px "Zen Kaku Gothic New",sans-serif';
  g.fillText(t.jp, 210, h / 2 - 22);
  g.fillStyle = 'rgba(244,245,246,.55)'; g.font = '300 26px Inter';
  g.fillText(t.en, 212, h / 2 + 34);
  signTex.needsUpdate = true;
}
drawSign(1);

/* =====================================================================
   かご + 乗場フロア構築
===================================================================== */
const cab = new THREE.Group(); scene.add(cab);
let M = {}, lightsGroup = null, doorL = null, doorR = null, dims = {};
let btnHits = [];        // レイキャスト対象（不可視の拡大ヒット領域）
let floorBtnMap = {};    // floor -> {btn, ring}
let mirrorGroup = null;  // 後方視点で非表示にする
let hallPropsGroup = null;

function capScale() { return ({ 6: .96, 7: 1, 9: 1.1, 11: 1.2, 13: 1.3, 15: 1.38 })[S.cap] || 1.1; }

function matFor(opt) {
  if (opt.metal) {
    const t = hairlineTex();
    return new THREE.MeshStandardMaterial({ map: t, color: opt.hex, metalness: .88, roughness: .28,
      bumpMap: t, bumpScale: .0016, envMapIntensity: envOK ? 1.15 : 0 });
  }
  if (opt.wood) {
    const t = woodTex(opt.hex);
    return new THREE.MeshStandardMaterial({ map: t, metalness: .05, roughness: .5, bumpMap: t, bumpScale: .002 });
  }
  return new THREE.MeshStandardMaterial({ color: opt.hex, metalness: .12, roughness: .46 });
}
function wallMaterial(opt) {
  if (opt.metal) {
    const t = hairlineTex();
    return new THREE.MeshStandardMaterial({ map: t, color: opt.hex, metalness: .88, roughness: .28,
      bumpMap: t, bumpScale: .0016, envMapIntensity: envOK ? 1.15 : 0 });
  }
  if (opt.wood) {
    const t = woodTex(opt.hex);
    return new THREE.MeshStandardMaterial({ map: t, metalness: .05, roughness: .52, bumpMap: t, bumpScale: .002 });
  }
  const t = steelTex(opt.hex);
  return new THREE.MeshStandardMaterial({ map: t, metalness: .1, roughness: .68, bumpMap: t, bumpScale: .0012 });
}

function buildCab() {
  clearGroup(cab);
  btnHits = []; floorBtnMap = {}; mirrorGroup = null; hallPropsGroup = null;

  const s = capScale();
  const W = 1.45 * s, D = 1.5, H = 2.32;
  dims = { W, D, H };
  const wallOpt = DATA.walls.find(w => w.id === S.wall);
  const floorOpt = DATA.floors.find(f => f.id === S.floor);
  const doorOpt = DATA.doors.find(d => d.id === S.door);
  const frameOpt = DATA.frames.find(f => f.id === S.frame);
  const kickOpt = DATA.kicks.find(k => k.id === S.kick);

  M.wall = wallMaterial(wallOpt);
  M.door = matFor(doorOpt);
  M.frame = matFor(frameOpt);
  M.kickMat = matFor(kickOpt);
  // 床: クリアコートで磨かれた石調 (本物のワックス床の写り込み)
  const floorT = tileTex(floorOpt.hex);
  M.floor = new THREE.MeshPhysicalMaterial({ map: floorT, metalness: .04, roughness: .42,
    clearcoat: .6, clearcoatRoughness: .28, bumpMap: floorT, bumpScale: .0018, envMapIntensity: envOK ? .9 : 0 });
  M.floor.map.repeat.set(Math.round(W * 2.4), Math.round(D * 2.4));
  M.ceil = new THREE.MeshStandardMaterial({ color: 0xf2f3f4, metalness: .05, roughness: .9 });
  const susT = hairlineTex();
  M.sus = new THREE.MeshStandardMaterial({ map: susT, color: 0xc9ccd1, metalness: .92, roughness: .26,
    bumpMap: susT, bumpScale: .0014, envMapIntensity: envOK ? 1.2 : 0 });
  M.dark = new THREE.MeshStandardMaterial({ color: 0x14161a, metalness: .4, roughness: .6 });

  const P = (w, h, mat) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);

  // 床・天井
  const fl = P(W, D, M.floor); fl.rotation.x = -Math.PI / 2; fl.position.y = 0; cab.add(fl);
  const ce = P(W, D, M.ceil); ce.rotation.x = Math.PI / 2; ce.position.y = H; cab.add(ce);

  // 壁（内向き）
  const back = P(W, H, M.wall); back.position.set(0, H / 2, D / 2); back.rotation.y = Math.PI; cab.add(back);
  const left = P(D, H, M.wall); left.position.set(-W / 2, H / 2, 0); left.rotation.y = Math.PI / 2; cab.add(left);
  const right = P(D, H, M.wall); right.position.set(W / 2, H / 2, 0); right.rotation.y = -Math.PI / 2; cab.add(right);

  // 正面（ドア開口）
  const dw = Math.min(.92, W * .62), dh = 2.08;
  const sideW = (W - dw) / 2;
  const fz = -D / 2;
  const fr1 = P(sideW, H, M.wall); fr1.position.set(-(dw / 2 + sideW / 2), H / 2, fz); cab.add(fr1);
  const fr2 = P(sideW, H, M.wall); fr2.position.set((dw / 2 + sideW / 2), H / 2, fz); cab.add(fr2);
  const hd = P(dw, H - dh, M.wall); hd.position.set(0, dh + (H - dh) / 2, fz); cab.add(hd);
  // 三方枠
  const jam = new THREE.Mesh(new THREE.BoxGeometry(dw + .1, .05, .06), M.frame); jam.position.set(0, dh + .02, fz); cab.add(jam);
  const j2 = new THREE.Mesh(new THREE.BoxGeometry(.05, dh, .06), M.frame); j2.position.set(-dw / 2 - .02, dh / 2, fz); cab.add(j2);
  const j3 = j2.clone(); j3.position.x = dw / 2 + .02; cab.add(j3);

  // ドア（中央2枚戸）
  const dGeo = new THREE.BoxGeometry(dw / 2 - .005, dh, .035);
  doorL = new THREE.Mesh(dGeo, M.door); doorL.position.set(-dw / 4, dh / 2, fz + .045); cab.add(doorL);
  doorR = new THREE.Mesh(dGeo, M.door); doorR.position.set(dw / 4, dh / 2, fz + .045); cab.add(doorR);
  doorL.userData.cx = -dw / 4; doorR.userData.cx = dw / 4; doorL.userData.open = -dw / 2 - sideW * .9; doorR.userData.open = dw / 2 + sideW * .9;
  const seal = new THREE.Mesh(new THREE.BoxGeometry(.012, dh, .04), M.dark); seal.position.set(0, dh / 2, fz + .045); cab.add(seal);
  cab.userData.dw = dw; cab.userData.dh = dh;

  // 幅木
  const kick = new THREE.Mesh(new THREE.BoxGeometry(W, .09, .012), M.kickMat); kick.position.set(0, .045, D / 2 - .008); kick.rotation.y = Math.PI; cab.add(kick);
  const kickL = new THREE.Mesh(new THREE.BoxGeometry(D, .09, .012), M.kickMat); kickL.rotation.y = Math.PI / 2; kickL.position.set(-W / 2 + .008, .045, 0); cab.add(kickL);
  const kickR = kickL.clone(); kickR.position.x = W / 2 - .008; cab.add(kickR);

  buildHall(dw, dh, fz);
  applyFloorTheme(S.curFloor, true);
  if (S.moving) { cab.userData.hallLight.intensity = 0; cab.userData.hallLight2.intensity = 0; }
  buildLights();
  buildPanel();
  buildOptions();
  buildPeople();
  applyDoorState(true);
}

/* ─────────── 乗場フロア（回遊可能な売場空間） ─────────── */
const HALL = { w: 10, d: 7.5, h: 3.0 };

function buildHall(dw, dh, fz) {
  const hallGroup = new THREE.Group(); cab.add(hallGroup); cab.userData.hallGroup = hallGroup;
  const { w, d, h } = HALL;
  const P = (pw, ph, mat) => new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat);

  const hallWallMat = new THREE.MeshStandardMaterial({ map: steelTex(0xffffff), color: 0x9a9690, roughness: .8, metalness: .05 });
  const hallFloorMat = new THREE.MeshStandardMaterial({ map: tileTex(0xffffff), color: 0x55585d, roughness: .5, metalness: .08 });
  const hallCeilMat = new THREE.MeshStandardMaterial({ color: 0xe8e6e2, roughness: .92 });
  cab.userData.hallMats = { wall: hallWallMat, floor: hallFloorMat, ceil: hallCeilMat };

  // エレベーター側の壁（ドア開口を避けた2枚 + 上部）— 乗場から見た面。草原でも昇降路の外壁として残す
  const sideWHall = (w - dw) / 2;
  [[-(dw / 2 + sideWHall / 2)], [dw / 2 + sideWHall / 2]].forEach(([x]) => {
    const m = P(sideWHall, h, hallWallMat); m.position.set(x, h / 2, fz - .02); m.rotation.y = Math.PI; hallGroup.add(m);
  });
  const head = P(dw, h - dh, hallWallMat); head.position.set(0, dh + (h - dh) / 2, fz - .02); head.rotation.y = Math.PI; hallGroup.add(head);

  // 室内シェル (床・天井・奥壁・側壁・柱・ダウンライト) — 草原では非表示に切替
  const roomParts = [];
  const hf = P(w, d, hallFloorMat); hf.rotation.x = -Math.PI / 2; hf.position.set(0, .002, fz - d / 2); hallGroup.add(hf); roomParts.push(hf);
  const hc = P(w, d, hallCeilMat); hc.rotation.x = Math.PI / 2; hc.position.set(0, h, fz - d / 2); hallGroup.add(hc); roomParts.push(hc);
  const bw = P(w, h, hallWallMat); bw.position.set(0, h / 2, fz - d); hallGroup.add(bw); roomParts.push(bw);
  const sl = P(d, h, hallWallMat); sl.rotation.y = Math.PI / 2; sl.position.set(-w / 2, h / 2, fz - d / 2); hallGroup.add(sl); roomParts.push(sl);
  const sr = P(d, h, hallWallMat); sr.rotation.y = -Math.PI / 2; sr.position.set(w / 2, h / 2, fz - d / 2); hallGroup.add(sr); roomParts.push(sr);
  const colMat = new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: .7 });
  [[-3.2, -2.2], [3.2, -2.2], [-3.2, -5.2], [3.2, -5.2]].forEach(([x, z]) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(.34, h, .34), colMat);
    c.position.set(x, h / 2, fz + z); hallGroup.add(c); roomParts.push(c);
  });
  const dlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2dc, emissiveIntensity: 2.2 });
  for (const x of [-2.6, 0, 2.6]) for (const z of [-1.6, -3.7, -5.8]) {
    const dsk = new THREE.Mesh(new THREE.CircleGeometry(.13, 20), dlMat);
    dsk.rotation.x = Math.PI / 2; dsk.position.set(x, h - .01, fz + z); hallGroup.add(dsk); roomParts.push(dsk);
  }

  // フィールドの空: 太陽・月・星・雲 (全フロアで表示)
  const plainsParts = [];
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2); sun.position.set(6, 16, fz - 8); hallGroup.add(sun); plainsParts.push(sun);
  const hemi = new THREE.HemisphereLight(0xbfe0ff, 0x4a6a3a, 1.15); hallGroup.add(hemi); plainsParts.push(hemi);
  const sunDisk = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false }));
  sunDisk.position.set(-14, 16, fz - 40); hallGroup.add(sunDisk); plainsParts.push(sunDisk);
  const moonDisk = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ color: 0xe8edf8, fog: false }));
  moonDisk.position.set(14, 16, fz - 40); moonDisk.visible = false; hallGroup.add(moonDisk); plainsParts.push(moonDisk);
  // 星空 (夜のみフェードイン)
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  const srand = mulberry32(9127);
  for (let i = 0; i < 340; i++) {
    const az = srand() * Math.PI * 2, el = srand() * Math.PI * .48 + .05, R = 55;
    starPos.push(Math.cos(az) * Math.cos(el) * R, Math.sin(el) * R + 2, fz - 12 + Math.sin(az) * Math.cos(el) * R);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: .22, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  hallGroup.add(stars); plainsParts.push(stars);
  // 遠景の雲 (板)
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .82 });
  [[-8, 11, -30], [10, 13, -36], [0, 15, -42], [-16, 12, -22]].forEach(([cx, cy, cz]) => {
    const cl = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.8), cloudMat);
    cl.position.set(cx, cy, fz + cz); hallGroup.add(cl); plainsParts.push(cl);
  });

  cab.userData.roomParts = roomParts;
  cab.userData.plainsParts = plainsParts;
  cab.userData.sun = sun; cab.userData.hemi = hemi;
  cab.userData.sunDisk = sunDisk; cab.userData.moonDisk = moonDisk; cab.userData.stars = stars;
  cab.userData.baseSunI = 2.2; cab.userData.baseHemiI = 1.15;
  cab.userData.hallFz = fz;

  // 乗場照明
  const hl = new THREE.PointLight(0xfff3df, 14, 12, 1.5); hl.position.set(0, h - .35, fz - 2.2); hallGroup.add(hl);
  const hl2 = new THREE.PointLight(0xfff3df, 8, 11, 1.6); hl2.position.set(0, h - .4, fz - 5.2); hallGroup.add(hl2);
  cab.userData.hallLight = hl; cab.userData.hallLight2 = hl2;

  // 乗場側三方枠
  const hjU = new THREE.Mesh(new THREE.BoxGeometry(dw + .34, .13, .05), M.frame); hjU.position.set(0, dh + .1, fz - .05); hallGroup.add(hjU);
  const hjL = new THREE.Mesh(new THREE.BoxGeometry(.13, dh + .16, .05), M.frame); hjL.position.set(-dw / 2 - .11, (dh + .16) / 2, fz - .05); hallGroup.add(hjL);
  const hjR = hjL.clone(); hjR.position.x = dw / 2 + .11; hallGroup.add(hjR);

  // ホールランタン
  const lant = new THREE.Mesh(new THREE.PlaneGeometry(.3, .11), new THREE.MeshBasicMaterial({ map: lantTex }));
  lant.position.set(0, dh + .34, fz - .06); lant.rotation.y = Math.PI; hallGroup.add(lant);

  // フロアサイネージ（奥壁）
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .82), new THREE.MeshBasicMaterial({ map: signTex }));
  sign.position.set(0, 2.05, fz - d + .02); hallGroup.add(sign);

  // 乗場呼びボタン（3D・クリック可能）
  const callPlate = new THREE.Mesh(new THREE.BoxGeometry(.14, .42, .025), M.sus);
  callPlate.position.set(dw / 2 + .3, 1.15, fz - .04); hallGroup.add(callPlate);
  const mkCall = (y, dir) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.032, .032, .014, 24),
      new THREE.MeshStandardMaterial({ color: 0xd6d9dd, metalness: .6, roughness: .4, emissive: 0xff9a2e, emissiveIntensity: 0 }));
    b.rotation.x = Math.PI / 2; b.position.set(dw / 2 + .3, y, fz - .062); hallGroup.add(b);
    const engr = new THREE.Mesh(new THREE.PlaneGeometry(.045, .045),
      new THREE.MeshBasicMaterial({ map: btnLabelTex(dir, false), transparent: true }));
    engr.rotation.y = Math.PI; engr.position.set(dw / 2 + .3, y, fz - .071); hallGroup.add(engr);
    const hit = new THREE.Mesh(new THREE.CircleGeometry(.06, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    hit.rotation.y = Math.PI; hit.position.set(dw / 2 + .3, y, fz - .075);
    hit.userData = { hallCall: dir, btn: b };
    hallGroup.add(hit); btnHits.push(hit);
    return b;
  };
  cab.userData.callUp = mkCall(1.24, 'up');
  cab.userData.callDown = mkCall(1.06, 'down');

  // 売場什器（フロアごと）
  hallPropsGroup = new THREE.Group(); hallGroup.add(hallPropsGroup);
  buildHallProps(S.curFloor, fz);

  hallGroup.visible = (S.view !== 'doll');
}

/* 決定的な擬似乱数（同じ階はいつも同じ売場に見える） */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* フロアごとの売場を構築 — ボクセルワールド (voxel.js) が担当。
   什器・人物・装飾はブロック造形になり、一人称モードで壊す/置くができる */
function buildHallProps(floor, fzIn) {
  if (!hallPropsGroup) return;
  clearGroup(hallPropsGroup);
  const t = floorGuide(floor); if (!t) return;
  const fz = fzIn ?? -dims.D / 2;
  buildFloorVoxels(floor, hallPropsGroup, fz, t);
}

/* 到着階のフロアテーマを乗場に反映 */
function applyFloorTheme(floor, immediate) {
  const t = floorGuide(floor);
  const m = cab.userData.hallMats;
  if (!t || !m) return;
  const wallC = new THREE.Color(t.wall), floorC = new THREE.Color(t.floor), lightC = new THREE.Color(t.light);
  const hl = cab.userData.hallLight, hl2 = cab.userData.hallLight2;
  cab.userData.hallInten = t.inten;
  // 地上階は開けたフィールド(空・太陽)。地下は空を隠した暗いフィールド(柱の灯りで探索)
  const basement = isBasement(floor);
  const baseSky = new THREE.Color(basement ? 0x0a0a0e : fieldSky(floor));
  cab.userData.baseSky = baseSky;
  scene.background = baseSky.clone();
  scene.fog?.color.copy(baseSky);
  cab.userData.roomParts?.forEach(o => o.visible = false);
  cab.userData.plainsParts?.forEach(o => o.visible = !basement); // 地下は空・太陽を隠す
  if (!basement) applyDayNight(); // 地上のみ太陽/月/星を同期
  else setVoxelLight(.5);         // 地下はやや暗い一定光
  drawSign(floor);
  buildHallProps(floor);
  // 乗場シェルをフロアに合わせたドット絵テクスチャに切替
  const shell = shellTexturesFor(floor);
  if (m.floor.map !== shell.floorTex) {
    m.floor.map = shell.floorTex; m.floor.map.repeat.set(20, 15); m.floor.needsUpdate = true;
  }
  if (m.wall.map !== shell.wallTex) {
    m.wall.map = shell.wallTex; m.wall.map.repeat.set(20, 6); m.wall.needsUpdate = true;
  }
  if (immediate) {
    m.wall.color.copy(wallC); m.floor.color.copy(floorC);
    hl.color.copy(lightC); hl2.color.copy(lightC);
    hl.intensity = 14 * t.inten; hl2.intensity = 8 * t.inten;
    return;
  }
  const d = 1.0;
  gsap.to(m.wall.color, { r: wallC.r, g: wallC.g, b: wallC.b, duration: d });
  gsap.to(m.floor.color, { r: floorC.r, g: floorC.g, b: floorC.b, duration: d });
  [hl, hl2].forEach(l => gsap.to(l.color, { r: lightC.r, g: lightC.g, b: lightC.b, duration: d }));
}

/* 昼夜サイクルを空・太陽軌道・月・星・フォグ・ブロック明度・時刻HUDへ反映 */
const NIGHT_SKY = new THREE.Color(0x070d24);
const DUSK_TINT = new THREE.Color(0xe8955a);
function applyDayNight() {
  if (isBasement(S.curFloor)) { setVoxelLight(.55); return; } // 地下は昼夜なし・一定光
  const info = getDayInfo();
  const base = cab.userData.baseSky || new THREE.Color(0x9ccdf0);
  // 空: 昼のベース色 ↔ 夜の紺。夕暮れ/夜明けは橙をブレンド
  const lit = Math.max(0, Math.min(1, (info.light - 0.3) / 0.7));
  const sky = NIGHT_SKY.clone().lerp(base, lit);
  const duskness = 1 - Math.abs(lit * 2 - 1); // 遷移帯で最大
  sky.lerp(DUSK_TINT, duskness * .35);
  if (scene.background?.isColor) scene.background.copy(sky); else scene.background = sky.clone();
  if (scene.fog) scene.fog.color.copy(sky);
  // 太陽の軌道 (東→天頂→西) と月 (夜の反対側)
  const fzH = cab.userData.hallFz ?? -dims.D / 2;
  const dayA = Math.max(0, Math.min(1, (info.phase - .12) / (.88 - .12))) * Math.PI;
  const sun = cab.userData.sun, hemi = cab.userData.hemi;
  const sunDisk = cab.userData.sunDisk, moonDisk = cab.userData.moonDisk, stars = cab.userData.stars;
  const sx = Math.cos(dayA) * 34, sy = Math.max(1.5, Math.sin(dayA) * 26);
  if (sunDisk) { sunDisk.position.set(sx, sy, fzH - 42); sunDisk.visible = !info.night; }
  if (sun) { sun.position.set(sx * .5, Math.max(4, sy), fzH - 12); sun.intensity = cab.userData.baseSunI * info.light; }
  if (hemi) hemi.intensity = cab.userData.baseHemiI * (0.35 + info.light * 0.65);
  if (moonDisk) {
    const na = ((info.phase + .5) % 1);
    const ma = Math.max(0, Math.min(1, (na - .12) / (.88 - .12))) * Math.PI;
    moonDisk.position.set(Math.cos(ma) * 30, Math.max(2, Math.sin(ma) * 22), fzH - 42);
    moonDisk.visible = info.night;
  }
  if (stars) stars.material.opacity = (1 - lit) * .95;
  // ブロックのベイク明度 (チャンク全体を一括で暗く/明るく)
  setVoxelLight(.32 + info.light * .68);
  // 時刻HUD
  const clk = document.getElementById('clockLabel');
  if (clk) clk.textContent = (info.night ? '🌙 ' : '☀️ ') + info.label;
}

/* ─────────── かご内の人物（マインクラフト風ブロック体型・voxel.js） ─────────── */
let peopleGroup = null;
function buildPeople() {
  if (peopleGroup) { cab.remove(peopleGroup); disposeObject(peopleGroup); }
  peopleGroup = new THREE.Group(); cab.add(peopleGroup);
  if (S.people === 'none') return;
  const { W, D } = dims;
  const counts = { few: 2, half: Math.max(2, Math.round(S.cap / 2)), seven: Math.max(3, Math.round(S.cap * .7)), full: S.cap };
  const rx = W / 2 - .34, rzF = -D / 2 + .44, rzB = D / 2 - .36;
  const rand = mulberry32(S.cap * 131 + (S.people === 'wc' ? 7 : { few: 1, half: 2, seven: 3, full: 4 }[S.people] || 0));
  // 顔がドア(-Z)側を向くよう rotation.y≈0 で配置
  if (S.people === 'wc') {
    const wc = makeBlockWheelchair(rand); wc.position.set(-W * .16, 0, -.05); wc.rotation.y = .05; peopleGroup.add(wc);
    const p = makeBlockPerson(rand); p.position.set(W * .26, 0, D * .18); p.rotation.y = -.5; peopleGroup.add(p);
    return;
  }
  const n = counts[S.people] || 0;
  const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
  let i = 0;
  for (let r = 0; r < rows && i < n; r++) for (let c = 0; c < cols && i < n; c++, i++) {
    const fx = cols === 1 ? .5 : c / (cols - 1), fzr = rows === 1 ? .5 : r / (rows - 1);
    const x = -rx + fx * 2 * rx + (rand() - .5) * .1;
    const zz = rzF + fzr * (rzB - rzF) + (rand() - .5) * .08;
    const p = makeBlockPerson(rand); p.position.set(x, 0, zz);
    p.rotation.y = (rand() - .5) * .7; // ほぼドア向き
    peopleGroup.add(p);
  }
}

/* 照明 */
function buildLights() {
  if (lightsGroup) { cab.remove(lightsGroup); disposeObject(lightsGroup); }
  lightsGroup = new THREE.Group(); cab.add(lightsGroup);
  const { W, D, H } = dims;
  const c = DATA.ceilings.find(x => x.id === S.ceil);
  const amb = new THREE.AmbientLight(0xffffff, .16); lightsGroup.add(amb);

  const emis = (w, d, color, inten) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: inten, roughness: .4 }));
    m.rotation.x = Math.PI / 2; m.position.y = H - .012; lightsGroup.add(m); return m;
  };

  if (c.type === 'flat') {
    emis(W * .72, D * .6, c.color, 2.4);
    const l = new THREE.PointLight(c.color, 16, 4.5, 1.6); l.position.set(0, H - .25, 0); lightsGroup.add(l);
    const l2 = new THREE.PointLight(c.color, 7, 4, 1.8); l2.position.set(0, H - .3, -D * .25); lightsGroup.add(l2);
  } else if (c.type === 'down') {
    [-.3, 0, .3].forEach(z => {
      const d = new THREE.Mesh(new THREE.CircleGeometry(.055, 24),
        new THREE.MeshStandardMaterial({ emissive: c.color, emissiveIntensity: 3.4, color: 0xffffff }));
      d.rotation.x = Math.PI / 2; d.position.set(0, H - .012, z * D); lightsGroup.add(d);
      const p = new THREE.PointLight(c.color, 9, 3.6, 1.7); p.position.set(0, H - .18, z * D); lightsGroup.add(p);
    });
  } else {
    const strip = (x, z, w, d) => { const m = emis(w, d, c.color, 3.2); m.position.x = x; m.position.z = z; };
    strip(0, D / 2 - .07, W * .92, .07); strip(0, -D / 2 + .07, W * .92, .07);
    strip(-W / 2 + .07, 0, .07, D * .86); strip(W / 2 - .07, 0, .07, D * .86);
    const p = new THREE.PointLight(c.color, 9, 4.4, 1.7); p.position.set(0, H - .22, 0); lightsGroup.add(p);
    const p2 = new THREE.PointLight(c.color, 5, 3.6, 1.8); p2.position.set(0, H - .5, D * .3); lightsGroup.add(p2);
  }
}

/* ─────────── 操作盤（大型ボタン + 刻印 + 押下フィードバック） ─────────── */
let panelGroup = null;
function buildPanel() {
  if (panelGroup) { cab.remove(panelGroup); disposeObject(panelGroup); }
  // 既存のかご内ヒットを除去（乗場呼びは残す）
  btnHits = btnHits.filter(hh => hh.userData.hallCall);
  floorBtnMap = {};
  panelGroup = new THREE.Group(); cab.add(panelGroup);
  const { W, D } = dims;
  const p = DATA.panels.find(x => x.id === S.panel);
  const dark = S.panel === 'black';
  const faceMat = dark
    ? new THREE.MeshStandardMaterial({ color: 0x26282c, metalness: .85, roughness: .4 })
    : M.sus;

  // 操作盤は扉の右横・前面壁 (実機と同じレイアウト)。ボタンは +Z（かご内側）を向く
  const dw = cab.userData.dw ?? Math.min(.92, W * .62);
  const fz = -D / 2;
  const panelX = (dw / 2 + W / 2) / 2;   // 扉右の前面壁セグメント中央
  cab.userData.panelX = panelX;
  // 引き戸の可動面(z≈fz+.0625が最前)より前に薄型パネルを配置し、開でも閉でも
  // 扉に隠れない(表面実装型の操作盤)
  const pz = fz + .085;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(.24, 1.72, .03), faceMat);
  plate.position.set(panelX, 1.32, pz); panelGroup.add(plate);

  // 10.1型 縦型液晶 (+Z を向く)
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(.16, .26),
    new THREE.MeshBasicMaterial({ map: lcdTex }));
  lcd.position.set(panelX, 1.92, pz + .017); panelGroup.add(lcd);

  // 大型ボタン（8フロア + 開/閉） — 円筒軸を Z 方向へ向け、丸ボタンが正面を向く
  const mkBtn = (y, x, floor, label) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(.036, .036, .006, 28),
      new THREE.MeshStandardMaterial({ color: p.ring, metalness: .7, roughness: .35 }));
    ring.rotation.x = Math.PI / 2; ring.position.set(x, y, pz + .016); panelGroup.add(ring);
    const mat = new THREE.MeshStandardMaterial({
      color: p.btn, metalness: S.panel === 'crystal' ? .1 : .6,
      roughness: S.panel === 'crystal' ? .15 : .4, emissive: p.glow, emissiveIntensity: 0,
      transparent: S.panel === 'crystal', opacity: S.panel === 'crystal' ? .92 : 1,
    });
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, .013, 28), mat);
    b.rotation.x = Math.PI / 2; b.position.set(x, y, pz + .021);
    b.userData.restZ = pz + .021;
    panelGroup.add(b);
    const engr = new THREE.Mesh(new THREE.PlaneGeometry(.042, .042),
      new THREE.MeshBasicMaterial({ map: btnLabelTex(floor ?? label, dark), transparent: true }));
    engr.position.set(x, y, pz + .0285); panelGroup.add(engr);
    if (S.panel === 'touchless') {
      const halo = new THREE.Mesh(new THREE.RingGeometry(.038, .044, 28),
        new THREE.MeshBasicMaterial({ color: 0x46d3ff, transparent: true, opacity: .7, side: THREE.DoubleSide }));
      halo.position.set(x, y, pz + .027); panelGroup.add(halo);
    }
    // 拡大ヒット領域（不可視）
    const hit = new THREE.Mesh(new THREE.CircleGeometry(.055, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    hit.position.set(x, y, pz + .04);
    hit.userData = { floor, label, btn: b, ring };
    panelGroup.add(hit); btnHits.push(hit);
    if (floor) floorBtnMap[floor] = { btn: b, ring };
    return b;
  };
  let i = 0;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
    const f = 8 - i; mkBtn(1.68 - r * .12, panelX - .058 + c * .116, f); i++;
  }
  mkBtn(1.14, panelX - .058, null, 'open'); mkBtn(1.14, panelX + .058, null, 'close');
  highlightFloorBtn();
}
/* 登録済み行先は強く点灯・現在階は淡く点灯 */
function highlightFloorBtn() {
  for (const [f, o] of Object.entries(floorBtnMap)) {
    const fl = Number(f);
    const queued = rideQueue.has(fl);
    o.btn.material.emissiveIntensity = queued ? 1.0 : (fl === S.curFloor && !S.moving ? .32 : 0);
  }
}
/* 押下フィードバック：沈み込み + 発光フラッシュ + パルスリング */
function pressFX(u) {
  const b = u.btn;
  if (b && b.userData.restZ !== undefined) {
    gsap.killTweensOf(b.position);
    gsap.fromTo(b.position, { z: b.userData.restZ - .012 }, { z: b.userData.restZ, duration: .45, ease: 'elastic.out(1.2,0.4)' });
    const baseI = b.material.emissiveIntensity;
    gsap.fromTo(b.material, { emissiveIntensity: 1.8 }, { emissiveIntensity: Math.max(baseI, .0), duration: .8, ease: 'power2.out', onComplete: highlightFloorBtn });
  } else if (b && b.material) {
    // 乗場呼びボタン等（沈み込みなし・発光フラッシュのみ）
    const baseI = b.material.emissiveIntensity ?? 0;
    gsap.fromTo(b.material, { emissiveIntensity: 1.8 }, { emissiveIntensity: baseI, duration: .8, ease: 'power2.out' });
  }
  navigator.vibrate?.(18);
}

/* 手すり・鏡 */
let optGroup = null;
function buildOptions() {
  if (optGroup) { cab.remove(optGroup); disposeObject(optGroup); }
  optGroup = new THREE.Group(); cab.add(optGroup);
  mirrorGroup = null;
  const { W, D } = dims;
  if (S.handrail) {
    const r = .018, y = .86, railMat = M.sus;
    const mk = (len, x, z, rotY) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 28), railMat);
      m.rotation.z = Math.PI / 2; m.rotation.y = rotY; m.position.set(x, y, z); optGroup.add(m);
    };
    mk(W * .86, 0, D / 2 - .06, 0);
    mk(D * .8, -W / 2 + .06, 0, Math.PI / 2);
    mk(D * .8, W / 2 - .06, 0, Math.PI / 2);
    [[-W * .35, D / 2 - .06], [W * .35, D / 2 - .06], [-W / 2 + .06, -D * .28], [-W / 2 + .06, D * .28], [W / 2 - .06, -D * .28], [W / 2 - .06, D * .28]]
      .forEach(([x, z]) => {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .05, 16), railMat);
        b.position.set(x, y - .028, z); optGroup.add(b);
      });
  }
  if (S.mirror) {
    mirrorGroup = new THREE.Group(); optGroup.add(mirrorGroup);
    const mw = Math.min(.62, dims.W * .42);
    const mir = new Reflector(new THREE.PlaneGeometry(mw, 1.62),
      { clipBias: .003, textureWidth: 512, textureHeight: 1024, color: 0xc8cdd2 });
    mir.position.set(dims.W * .18, 1.18, dims.D / 2 - .012); mir.rotation.y = Math.PI; mirrorGroup.add(mir);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(mw + .03, 1.65, .008), M.sus);
    frame.position.set(dims.W * .18, 1.18, dims.D / 2 - .006); mirrorGroup.add(frame);
  }
}

/* ドア開閉 */
function applyDoorState(immediate) {
  if (immediate) {
    doorL.position.x = doorL.userData[S.doorsOpen ? 'open' : 'cx'];
    doorR.position.x = doorR.userData[S.doorsOpen ? 'open' : 'cx'];
  }
}
function doors(open, dur = 1.5) {
  return new Promise(res => {
    S.doorsOpen = open;
    gsap.to(doorL.position, { x: open ? doorL.userData.open : doorL.userData.cx, duration: dur, ease: 'power2.inOut' });
    gsap.to(doorR.position, { x: open ? doorR.userData.open : doorR.userData.cx, duration: dur, ease: 'power2.inOut', onComplete: res });
  });
}

/* =====================================================================
   音 — 合成チャイム & 音声
   既定はブラウザ合成音声。public/voice/manifest.json とクリップを
   配置すると、対応キューは自動的にその音声ファイルを再生する。
===================================================================== */
let actx = null, humNodes = null;
function audio() { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); return actx; }
function bell(f, dt, dur, vol, a) {
  [[1, 1], [2, .16], [2.76, .07]].forEach(([ratio, amp]) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.value = f * ratio;
    const t = a.currentTime + dt;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * amp, t + .015);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05);
  });
}
function chime(dir) {
  const a = audio();
  if (dir === 'down') { bell(932, 0, .5, .15, a); bell(830, .42, 1.0, .17, a); }
  else { bell(932, 0, 1.0, .17, a); }
}
/* しっかりした押下音：低域のコツ + 高域のチッ */
function btnBeep() {
  const a = audio(), t = a.currentTime;
  const thump = a.createOscillator(), tg = a.createGain();
  thump.type = 'sine'; thump.frequency.setValueAtTime(190, t); thump.frequency.exponentialRampToValueAtTime(120, t + .07);
  tg.gain.setValueAtTime(.16, t); tg.gain.exponentialRampToValueAtTime(.0001, t + .09);
  thump.connect(tg).connect(a.destination); thump.start(t); thump.stop(t + .1);
  const tick = a.createOscillator(), kg = a.createGain();
  tick.type = 'square'; tick.frequency.value = S.panel === 'touchless' ? 1567 : 1180;
  kg.gain.setValueAtTime(.07, t + .004); kg.gain.exponentialRampToValueAtTime(.0001, t + .05);
  tick.connect(kg).connect(a.destination); tick.start(t + .004); tick.stop(t + .06);
}
function tickSound() {
  const a = audio(), t = a.currentTime, o = a.createOscillator(), g = a.createGain();
  o.type = 'sine'; o.frequency.value = 660;
  g.gain.setValueAtTime(.018, t); g.gain.exponentialRampToValueAtTime(.0001, t + .07);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + .08);
}
function humStart() {
  const a = audio(), o = a.createOscillator(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
  const len = 2 * a.sampleRate;
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3.5; }
  const ns = a.createBufferSource(); ns.buffer = buf; ns.loop = true;
  const nf = a.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 160;
  const ng = a.createGain(); ng.gain.value = 0;
  ns.connect(nf).connect(ng).connect(a.destination); ns.start();
  o.type = 'triangle'; o.frequency.value = 82; lfo.frequency.value = 5.2; lg.gain.value = 5;
  lfo.connect(lg).connect(o.frequency);
  g.gain.value = 0; o.connect(g).connect(a.destination); o.start(); lfo.start();
  humNodes = { o, g, lfo, ns, ng, nf };
}
function humSet(v) {
  if (!humNodes || !actx) return;
  const t = actx.currentTime;
  humNodes.g.gain.setTargetAtTime(.012 + v * .03, t, .08);
  humNodes.o.frequency.setTargetAtTime(74 + v * 22, t, .1);
  humNodes.ng.gain.setTargetAtTime(v * .06, t, .08);
  humNodes.nf.frequency.setTargetAtTime(140 + v * 380, t, .1);
}
function humStop() {
  if (!humNodes) return; const { o, g, lfo, ns, ng } = humNodes; humNodes = null;
  gsap.to(g.gain, { value: 0, duration: .8 });
  gsap.to(ng.gain, { value: 0, duration: .8, onComplete: () => { o.stop(); lfo.stop(); ns.stop(); } });
}

/* 録音クリップ（任意）: public/voice/manifest.json
   例 {"up":"up.mp3","down":"down.mp3","close":"close.mp3","open":"open.mp3","arrive":"arrive.mp3"} */
const BASE = import.meta.env.BASE_URL ?? '/';
let voiceClips = null;
fetch(BASE + 'voice/manifest.json')
  .then(r => (r.ok ? r.json() : null))
  .then(m => { if (m) { voiceClips = m; console.info('voice clips loaded', m); } })
  .catch(() => { /* クリップ未配置なら合成音声 */ });
let clipAudio = null;
function playClip(file) {
  try {
    if (clipAudio) { clipAudio.pause(); }
    clipAudio = new Audio(BASE + 'voice/' + file);
    clipAudio.volume = .95;
    clipAudio.play();
    return true;
  } catch { return false; }
}

/* 合成音声：自然さ優先
   実車音源の解析から「落ち着いた話速・柔らかな声質」が特徴。
   不自然さの原因になるピッチシフトは行わず、自然系ボイスを優先する。 */
let voiceCache = [];
function refreshVoices() { if (window.speechSynthesis) voiceCache = speechSynthesis.getVoices(); }
if (window.speechSynthesis) {
  refreshVoices();
  speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
}
const JA_PREF = [/google 日本語/i, /nanami/i, /kyoko/i, /o-?ren/i, /haruka/i, /sayaka/i, /mizuki/i, /female/i];
const EN_PREF = [/samantha/i, /jenny/i, /aria/i, /google us english/i, /zira/i, /female/i];
function pickVoice(langPrefix, prefs) {
  const cand = voiceCache.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
  for (const re of prefs) { const hit = cand.find(v => re.test(v.name)); if (hit) return hit; }
  return cand[0] || null;
}
function speak(ja, en) {
  if (S.lang === 'off' || !window.speechSynthesis) return;
  const text = S.lang === 'ja' ? ja : en;
  if (!voiceCache.length) refreshVoices();
  speechSynthesis.cancel();
  // 句点で区切って発話すると間が生まれ、機械的な一本調子を避けられる
  const parts = text.split('。').filter(Boolean);
  parts.forEach((pt, i) => {
    const u = new SpeechSynthesisUtterance(pt + (i < parts.length - 1 ? '。' : ''));
    u.lang = S.lang === 'ja' ? 'ja-JP' : 'en-US';
    u.rate = .94; u.pitch = 1.02; u.volume = .95;
    const v = S.lang === 'ja' ? pickVoice('ja', JA_PREF) : pickVoice('en', EN_PREF);
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  });
}
/* キュー再生：録音クリップがあれば実音声、なければ合成 */
function cue(name, ja, en) {
  if (S.lang === 'off') return;
  if (S.lang === 'ja' && voiceClips?.[name] && playClip(voiceClips[name])) return;
  speak(ja, en);
}

/* =====================================================================
   乗車シーケンス + 乗場呼び
===================================================================== */
const hudNum = document.getElementById('hudNum'), hudDir = document.getElementById('hudDir'),
  hudDept = document.getElementById('hudDept'), floorHud = document.getElementById('floorHud');
function setHud(f, dir) {
  hudNum.textContent = floorLabel(f);
  hudDir.textContent = dir === 'up' ? '▲ UP' : dir === 'down' ? '▼ DOWN' : '';
  hudDept.textContent = floorGuide(f)?.jp ?? '';
  drawLCD(f, dir);
  drawLantern(f, dir);
}
function arrivalText(f) {
  const g = floorGuide(f);
  const fname = f >= 1 ? `${f}階` : `地下${1 - f}階`;
  const ja = g ? `${fname}、${g.jp}でございます` : `${fname}です`;
  const en = g ? `${g.en}.` : `Floor ${floorLabel(f)}`;
  return [ja, en];
}
/* ── 行先キュー式エレベーター (走行中の途中階も登録・停車できる SCAN 方式) ── */
const rideQueue = new Set();   // 登録された行先フロア
let riding = false;            // ドライブループ稼働中か
let carPos = 1;                // 連続フロア位置
let carDir = 0;                // 走行方向 (1:上 / -1:下 / 0:停止)
let carVel = 0;                // フロア/秒
const CAR_CRUISE = 1.5, CAR_ACCEL = 1.7;

/* 行先を登録 (走行中でも受け付ける) */
function ride(target) {
  if (S.view === 'walk') { toast('かごに戻ってから行先を選んでください'); return; }
  if (target === S.curFloor && !S.moving) {
    if (!S.doorsOpen) { cue('open', 'ドアが開きます', 'The doors are opening'); doors(true); }
    return;
  }
  rideQueue.add(target);
  highlightFloorBtn(); markFloorBtns();
  if (!riding) driveLoop();
}

/* 現在位置・進行方向から次に停まる階を選ぶ (SCAN: 進行方向優先) */
function pickNextStop() {
  const arr = [...rideQueue];
  if (!arr.length) return null;
  const up = () => arr.filter(f => f > carPos + 1e-3).sort((a, b) => a - b)[0];
  const down = () => arr.filter(f => f < carPos - 1e-3).sort((a, b) => b - a)[0];
  const nearest = () => arr.slice().sort((a, b) => Math.abs(a - carPos) - Math.abs(b - carPos))[0];
  if (carDir >= 0) return up() ?? down() ?? nearest();
  return down() ?? up() ?? nearest();
}

/* 1区間の走行 (加減速つき)。毎フレーム getStop() を呼ぶので、途中でより近い階が
   登録されると自動で手前に再ターゲットして停車する */
function driveLeg(getStop) {
  return new Promise(resolve => {
    let last = performance.now();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let shake = null, expo = null;
    if (!reduce) {
      shake = gsap.to(camera.position, { y: '+=0.006', duration: .09, yoyo: true, repeat: -1, ease: 'sine.inOut', paused: true });
      expo = gsap.fromTo(renderer, { toneMappingExposure: 1.05 }, { toneMappingExposure: .99, duration: .8, yoyo: true, repeat: -1 });
    }
    const cleanup = () => { shake?.kill(); expo?.kill(); renderer.toneMappingExposure = 1.05; };
    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, .05); last = now;
      const stop = getStop();
      if (stop == null) { cleanup(); resolve(null); return; }
      const sign = stop > carPos ? 1 : -1;
      carDir = sign;
      const remaining = Math.abs(stop - carPos);
      // スナップ到着 (減速で漸近して停まりきらないのを防ぐ)
      let arrived = remaining <= 0.04;
      // 停止に必要な速度上限 + 最低速度 (確実に停止階へ到達する)
      const vMax = Math.max(0.3, Math.min(CAR_CRUISE, Math.sqrt(2 * CAR_ACCEL * remaining)));
      if (carVel < vMax) carVel = Math.min(vMax, carVel + CAR_ACCEL * dt);
      else carVel = Math.max(vMax, carVel - CAR_ACCEL * 2 * dt);
      carPos += sign * carVel * dt;
      if ((sign > 0 && carPos >= stop) || (sign < 0 && carPos <= stop)) arrived = true;
      if (arrived) {
        carPos = stop; carVel = 0;
        const f = Math.round(carPos);
        if (f !== S.curFloor) { S.curFloor = f; setHud(f, null); tickSound(); }
        cleanup();
        resolve(stop); return;
      }
      const f = Math.round(carPos);
      if (f !== S.curFloor) { S.curFloor = f; setHud(f, carDir > 0 ? 'up' : 'down'); tickSound(); }
      const v = Math.min(1, carVel / CAR_CRUISE);
      humSet(v);
      if (shake) { if (v > .12 && shake.paused()) shake.play(); shake.timeScale(Math.max(.3, v)); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/* キューが尽きるまで停車→開閉を繰り返すメインループ (単一稼働) */
async function driveLoop() {
  riding = true;
  S.moving = true;
  clearDepartTimer();
  floorHud.classList.add('moving');
  carPos = S.curFloor; carVel = 0;
  while (rideQueue.size) {
    const stop = pickNextStop();
    if (stop == null) break;
    carDir = stop > carPos ? 1 : (stop < carPos ? -1 : (carDir || 1));
    const dir = carDir > 0 ? 'up' : 'down';
    highlightFloorBtn(); markFloorBtns();
    cue(dir, dir === 'up' ? '上へまいります' : '下へまいります', dir === 'up' ? 'Going up' : 'Going down');
    await new Promise(r => setTimeout(r, 650));
    if (S.doorsOpen) { cue('close', 'ドアが閉まります。ご注意ください', 'The doors are closing'); await doors(false, 1.4); }
    await new Promise(r => setTimeout(r, 200));
    humStart();
    cab.userData.hallLight.intensity = 0; cab.userData.hallLight2.intensity = 0;
    setHud(Math.round(carPos), dir);
    // 走行 (途中でより近い階が登録されたら pickNextStop が再ターゲット)
    const reached = await driveLeg(pickNextStop);
    humStop();
    const arrived = reached ?? Math.round(carPos);
    rideQueue.delete(arrived);
    S.curFloor = arrived;
    setHud(arrived, null);
    applyFloorTheme(arrived, false); // 什器・空気感を到着階へ (ドアが閉じている間に入替)
    chime(carDir > 0 ? 'up' : 'down');
    highlightFloorBtn(); markFloorBtns();
    const [ja, en] = arrivalText(arrived);
    if (voiceClips?.arrive && S.lang === 'ja') playClip(voiceClips.arrive);
    else speak(ja, en);
    await new Promise(r => setTimeout(r, 800));
    const inten = cab.userData.hallInten ?? 1;
    gsap.to(cab.userData.hallLight, { intensity: 14 * inten, duration: .6 });
    gsap.to(cab.userData.hallLight2, { intensity: 8 * inten, duration: .6 });
    cue('open', 'ドアが開きます', 'The doors are opening');
    await doors(true, 1.4);
    if (rideQueue.size) await new Promise(r => setTimeout(r, 1100)); // 次区間まで小休止
  }
  S.moving = false; riding = false; carDir = 0; carVel = 0;
  floorHud.classList.remove('moving');
  highlightFloorBtn(); markFloorBtns();
  if (S.view === 'walk') armDepartTimer();
}
function ordinalEn(n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); }

/* ── フロア回遊 & 乗場呼び ── */
let departTimer = 0;
function clearDepartTimer() { if (departTimer) { clearTimeout(departTimer); departTimer = 0; } }
function armDepartTimer() {
  clearDepartTimer();
  // フロア散策中はしばらくするとエレベーターが出発する（呼びボタンで戻ってくる）
  departTimer = setTimeout(() => {
    if (S.view === 'walk' && S.doorsOpen && !S.moving) {
      doors(false, 1.4);
      toast('エレベーターは他の階へ向かいました ─ 呼びボタンでお呼びください');
    }
  }, 9000);
}
const hasPointerLock = 'pointerLockElement' in document;
async function enterFloor() {
  if (S.moving) { toast('走行中です'); return; }
  if (S.view === 'walk') return;
  if (!S.doorsOpen) { cue('open', 'ドアが開きます', 'The doors are opening'); await doors(true, 1.2); }
  S.view = 'walk';
  cab.userData.hallGroup.visible = true;
  syncViewToggles(); updateFloorBtnLabel();
  if (hasPointerLock && !isTouchDevice()) {
    // 一人称探索: 操作説明オーバーレイ → クリックでポインタロック開始
    document.getElementById('fpTitle').textContent = `${floorSign(S.curFloor)} ─ ${floorGuide(S.curFloor)?.jp ?? ''}`;
    document.getElementById('fpOverlay').style.display = 'flex';
  } else {
    // フォールバック (タッチ端末): 従来のオービット回遊。タップで破壊できる
    applyLimits('walk');
    const p = viewPose('walk');
    flyTo(p.pos, p.tgt, 1.8);
    toast('タップでブロックをこわせます (一人称モードはPCで)');
    armDepartTimer();
  }
}
function isTouchDevice() { return matchMedia('(pointer: coarse)').matches; }
/* 床を掘り抜いて1階下(地下含む)へ落下 (探索中)。降りられたら true */
let descending = false;
function descendFloor() {
  if (descending || S.view !== 'walk' || S.curFloor <= MIN_FLOOR) return false;
  descending = true;
  S.curFloor -= 1;
  applyFloorTheme(S.curFloor, true); // 下の階のフィールド/地下を再構築
  drawSign(S.curFloor); updateFloorBtnLabel();
  dropInTop();                        // 掘った穴の真下・上空から着地
  toast(`▼ 掘り抜いて ${floorLabel(S.curFloor)} へ降りた`);
  navigator.vibrate?.(40);
  setTimeout(() => { descending = false; }, 400);
  return true;
}
async function returnToCab() {
  if (S.view !== 'walk') return;
  clearDepartTimer();
  exitFPMode();
  if (!S.doorsOpen) {
    await hallCall();
  }
  S.view = 'cab';
  applyLimits('cab');
  syncViewToggles(); updateFloorBtnLabel();
  const p = viewPose('cab');
  flyTo(p.pos, p.tgt, 1.8);
}
let calling = false;
async function hallCall() {
  if (S.moving || calling) return;
  if (S.doorsOpen) { toast('エレベーターは到着しています'); return; }
  calling = true;
  const lamp = cab.userData.callUp;
  if (lamp) gsap.fromTo(lamp.material, { emissiveIntensity: 1.2 }, { emissiveIntensity: 0, duration: 2.2, ease: 'power2.out' });
  drawLantern(S.curFloor, 'up');
  await new Promise(r => setTimeout(r, 1400));
  chime('up');
  drawLantern(S.curFloor, null);
  await doors(true, 1.4);
  toast('エレベーターが到着しました');
  calling = false;
  if (S.view === 'walk') armDepartTimer();
}
function updateFloorBtnLabel() {
  const b = document.getElementById('btnFloor');
  if (b) b.textContent = S.view === 'walk' ? 'かごに戻る' : 'フロアに出る';
}

/* =====================================================================
   レイキャスト（かご内ボタン + 乗場呼びボタン）
===================================================================== */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let downAt = 0, hovered = null;
renderer.domElement.addEventListener('pointerdown', () => downAt = performance.now());
renderer.domElement.addEventListener('pointerup', e => {
  if (isFPActive()) return; // 一人称中は voxel.js が処理
  if (performance.now() - downAt > 240) return;
  ptr.x = (e.clientX / innerWidth) * 2 - 1; ptr.y = -(e.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(btnHits, false)[0];
  if (hit) {
    const u = hit.object.userData;
    btnBeep();
    pressFX(u);
    if (u.hallCall) { hallCall(); return; }
    if (u.floor) { toast(`${u.floor}F を登録しました`); ride(u.floor); }
    else if (u.label === 'open' && !S.moving) { cue('open', 'ドアが開きます', 'The doors are opening'); doors(true); }
    else if (u.label === 'close' && !S.moving) { cue('close', 'ドアが閉まります。ご注意ください', 'The doors are closing'); doors(false); }
    return;
  }
  // フォールバック回遊中: タップ/クリックでブロック破壊
  if (S.view === 'walk') voxelPointerAction(ray, true);
});
renderer.domElement.addEventListener('pointermove', e => {
  if (isFPActive()) return;
  ptr.x = (e.clientX / innerWidth) * 2 - 1; ptr.y = -(e.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(btnHits, false)[0] || null;
  if (hovered !== hit?.object) {
    if (hovered?.userData.btn) highlightFloorBtn();
    hovered = hit?.object ?? null;
    if (hovered?.userData.btn) {
      const b = hovered.userData.btn;
      b.material.emissiveIntensity = Math.max(b.material.emissiveIntensity, .35);
    }
  }
  renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
});

/* =====================================================================
   UI 構築
===================================================================== */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
function toast(msg) {
  const t = $('#toast'); t.textContent = msg;
  gsap.fromTo(t, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: .35, onComplete: () => gsap.to(t, { opacity: 0, delay: 2.0, duration: .5 }) });
}

/* アコーディオン */
$$('.sec').forEach(sec => {
  const body = sec.querySelector('.body');
  if (sec.classList.contains('open')) gsap.set(body, { height: 'auto' });
  sec.querySelector('.head').addEventListener('click', () => {
    const open = sec.classList.contains('open');
    if (open) { gsap.to(body, { height: 0, duration: .45, ease: 'power3.inOut' }); sec.classList.remove('open'); }
    else {
      sec.classList.add('open');
      gsap.fromTo(body, { height: 0 }, { height: 'auto', duration: .5, ease: 'power3.inOut' });
      gsap.fromTo(sec.querySelectorAll('.inner > *'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .4, stagger: .04, delay: .1 });
    }
  });
});

/* スウォッチ生成 */
function swatches(elId, list, key, cb) {
  const el = document.getElementById(elId); el.innerHTML = '';
  const cats = [...new Set(list.map(o => o.cat || ''))];
  cats.forEach(cat => {
    if (cat) { const h = document.createElement('div'); h.className = 'swhead'; h.textContent = cat; el.appendChild(h); }
    const grid = document.createElement('div'); grid.className = 'swgrid'; el.appendChild(grid);
    list.filter(o => (o.cat || '') === cat).forEach(o => {
      const d = document.createElement('div'); d.className = 'sw' + (S[key] === o.id ? ' active' : '');
      d.innerHTML = `<div class="c" style="background:${o.css}"></div><div class="n">${o.n}</div>`;
      d.onclick = () => { S[key] = o.id; $$('#' + elId + ' .sw').forEach(x => x.classList.remove('active')); d.classList.add('active'); cb(); updateSpec(); };
      grid.appendChild(d);
    });
  });
}
function lists(elId, list, key, cb) {
  const el = document.getElementById(elId); el.innerHTML = '';
  list.forEach(o => {
    const d = document.createElement('div'); d.className = 'opt' + (S[key] === o.id ? ' active' : '');
    d.innerHTML = `<span>${o.n} <small>${o.sub || ''}</small></span><span class="dot"></span>`;
    d.onclick = () => { S[key] = o.id; $$('#' + elId + ' .opt').forEach(x => x.classList.remove('active')); d.classList.add('active'); cb(); updateSpec(); };
    el.appendChild(d);
  });
}
function refreshSwUI() {
  swatches('wallSw', DATA.walls, 'wall', () => buildCab());
  swatches('floorSw', DATA.floors, 'floor', () => buildCab());
  swatches('doorSw', DATA.doors, 'door', () => buildCab());
  swatches('frameSw', DATA.frames, 'frame', () => buildCab());
  swatches('kickSw', DATA.kicks, 'kick', () => buildCab());
  lists('ceilList', DATA.ceilings, 'ceil', () => buildLights());
  lists('panelList', DATA.panels, 'panel', () => buildPanel());
}

/* スタイルカード */
const styleWrap = $('#styleCards');
DATA.styles.forEach(st => {
  const d = document.createElement('div'); d.className = 'stylecard' + (S.style === st.id ? ' active' : '');
  d.innerHTML = `<div class="bar"></div><h4>${st.n}</h4><p>${st.d}</p>`;
  d.onclick = () => {
    S.style = st.id; Object.assign(S, { wall: st.wall, floor: st.floor, ceil: st.ceil, panel: st.panel, door: st.door, frame: st.frame });
    $$('#styleCards .stylecard').forEach(x => x.classList.remove('active')); d.classList.add('active');
    buildCab(); refreshSwUI(); updateSpec();
    gsap.fromTo(renderer, { toneMappingExposure: 1.5 }, { toneMappingExposure: 1.05, duration: 1.1, ease: 'power2.out' });
  };
  styleWrap.appendChild(d);
});

/* フロアボタン（UI側）— 売場名つき */
const fbWrap = $('#floorBtns');
for (let f = 8; f >= 1; f--) {
  const b = document.createElement('button'); b.className = 'fb';
  b.innerHTML = `${f}<small>${FLOOR_GUIDE[f]?.jp.split('・')[0] ?? ''}</small>`;
  b.onclick = () => { btnBeep(); toast(`${f}F を登録しました`); ride(f); };
  b.dataset.f = f; fbWrap.appendChild(b);
}
function markFloorBtns() {
  $$('#floorBtns .fb').forEach(b => {
    const f = Number(b.dataset.f);
    b.classList.toggle('now', rideQueue.has(f) || (rideQueue.size === 0 && f === S.curFloor));
  });
}
markFloorBtns();

$('#btnDoor').onclick = () => {
  if (S.moving) return;
  if (S.doorsOpen) { cue('close', 'ドアが閉まります。ご注意ください', 'The doors are closing'); doors(false); }
  else { cue('open', 'ドアが開きます', 'The doors are opening'); doors(true); }
};
$('#btnView').onclick = () => { const p = viewPose(S.view); flyTo(p.pos, p.tgt, 1.2); };
$('#btnFloor').onclick = () => { if (S.view === 'walk') returnToCab(); else enterFloor(); };

/* 言語 */
$$('.tgl[data-lang]').forEach(t => t.onclick = () => {
  $$('.tgl[data-lang]').forEach(x => x.classList.remove('active')); t.classList.add('active');
  S.lang = t.dataset.lang; updateSpec(); saveState();
  if (S.lang !== 'off') speak('音声案内をご利用いただけます', 'Voice guidance is available');
});

/* アナウンス一覧 */
function buildAnn() {
  const el = $('#annList'); el.innerHTML = '';
  const list = DATA.ann[S.lang === 'en' ? 'en' : 'ja'];
  list.forEach(([t, s]) => {
    const d = document.createElement('div'); d.className = 'a'; d.textContent = `${t} ── ${s}`;
    d.onclick = () => speak(s, s); el.appendChild(d);
  });
}
buildAnn();
$$('.tgl[data-lang]').forEach(t => t.addEventListener('click', buildAnn));

/* オプション */
$$('.tgl[data-hr]').forEach(t => t.onclick = () => {
  $$('.tgl[data-hr]').forEach(x => x.classList.remove('active'));
  t.classList.add('active'); S.handrail = t.dataset.hr === '1'; buildOptions(); updateSpec();
});
$$('.tgl[data-mr]').forEach(t => t.onclick = () => {
  $$('.tgl[data-mr]').forEach(x => x.classList.remove('active'));
  t.classList.add('active'); S.mirror = t.dataset.mr === '1'; buildOptions(); updateSpec();
});

/* 視点切替・プリセットアングル */
$$('.tgl[data-view]').forEach(t => t.onclick = () => setView(t.dataset.view));
$$('[data-ang]').forEach(b => b.onclick = () => goAngle(b.dataset.ang));

/* 乗車シミュレーション(人物配置) */
$$('.tgl[data-ppl]').forEach(t => t.onclick = () => {
  $$('.tgl[data-ppl]').forEach(x => x.classList.remove('active')); t.classList.add('active');
  S.people = t.dataset.ppl; buildPeople(); updateSpec();
});

/* 仕様 */
function updateSpec() {
  const find = (l, id) => l.find(x => x.id === id)?.n || '-';
  const cap = DATA.caps[S.type].find(c => c.n === S.cap);
  $('#capLabel').textContent = `${S.type === 'P' ? '乗用 P' : '住宅用 R'} ・ ${S.cap}名`;
  const rows = [
    ['機種', 'AXIEZ-LINKs（参考）'], ['タイプ', S.type === 'P' ? 'P 乗用' : 'R 住宅用'],
    ['定員 / 積載', `${S.cap}名 / ${cap.kg}kg`],
    ['スタイル', DATA.styles.find(s => s.id === S.style)?.n || '-'],
    ['壁・側板', find(DATA.walls, S.wall)], ['床', find(DATA.floors, S.floor)],
    ['天井・照明', find(DATA.ceilings, S.ceil)], ['操作盤', find(DATA.panels, S.panel)],
    ['かごドア', find(DATA.doors, S.door)], ['三方枠', find(DATA.frames, S.frame)], ['幅木', find(DATA.kicks, S.kick)],
    ['手すり', S.handrail ? 'あり（三方）' : 'なし'], ['鏡', S.mirror ? 'あり' : 'なし'],
    ['音声案内', S.lang === 'off' ? 'OFF' : S.lang === 'ja' ? (voiceClips ? '日本語（録音クリップ）' : '日本語（合成）') : 'English'],
  ];
  $('#specList').innerHTML = rows.map(([k, v]) => `<div class="r"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('');
  saveState();
}

/* 共有URL */
$('#btnShare').onclick = async () => {
  const o = { t: S.type, c: S.cap, w: S.wall, f: S.floor, ce: S.ceil, p: S.panel, h: +S.handrail, m: +S.mirror, s: S.style, dr: S.door, fm: S.frame, kk: S.kick };
  const url = location.origin + location.pathname + '#' + btoa(encodeURIComponent(JSON.stringify(o)));
  try { await navigator.clipboard.writeText(url); toast('共有URLをコピーしました'); }
  catch { toast('コピーできませんでした'); }
};
function loadHash() {
  if (!location.hash) return;
  try {
    const o = JSON.parse(decodeURIComponent(atob(location.hash.slice(1))));
    Object.assign(S, { type: o.t, cap: o.c, wall: o.w, floor: o.f, ceil: o.ce, panel: o.p, handrail: !!o.h, mirror: !!o.m, style: o.s, door: o.dr || S.door, frame: o.fm || S.frame, kick: o.kk || S.kick });
  } catch { /* ignore */ }
}

/* モバイルシート */
$('#panelTab').onclick = () => $('#panel').classList.toggle('openSheet');

/* =====================================================================
   イントロ / ホーム
===================================================================== */
const capWrap = $('#capChips');
function renderCaps() {
  capWrap.innerHTML = '';
  DATA.caps[S.type].forEach(c => {
    const b = document.createElement('button'); b.className = 'cap' + (S.cap === c.n ? ' active' : '');
    b.innerHTML = `${c.n}<span>名 / ${c.kg}kg</span>`;
    b.onclick = () => { S.cap = c.n; $$('.cap').forEach(x => x.classList.remove('active')); b.classList.add('active'); };
    capWrap.appendChild(b);
  });
  if (!DATA.caps[S.type].some(c => c.n === S.cap)) S.cap = DATA.caps[S.type][1]?.n || DATA.caps[S.type][0].n;
}
loadState();
loadHash();
renderCaps();
$$('.tc').forEach(t => {
  t.classList.toggle('active', t.dataset.type === S.type);
  t.onclick = () => {
    $$('.tc').forEach(x => x.classList.remove('active')); t.classList.add('active');
    S.type = t.dataset.type; renderCaps();
  };
});

/* イントロのフェードはCSSアニメ（index.html）— 再表示時はアニメを再トリガー */
function replayIntroAnim() {
  $$('#intro .inner > *').forEach(el => {
    el.style.animation = 'none';
    void el.offsetWidth; // reflow でアニメ再起動
    el.style.animation = '';
  });
}

$('#startBtn').onclick = () => {
  audio(); refreshVoices();
  buildCab(); updateSpec(); refreshSwUI(); setHud(S.curFloor, null);
  S.started = true;
  $('#homeBtn').style.display = 'block';
  const gl = $('#gateL'), gr = $('#gateR');
  gl.style.display = gr.style.display = 'block';
  const tl = gsap.timeline();
  tl.to('#intro .inner', { opacity: 0, y: -24, duration: .55, ease: 'power2.in' })
    .set('#intro', { display: 'none' })
    .add(() => {
      chime('up'); cue('open', 'ドアが開きます', 'The doors are opening');
      doors(true, 0.01);
      camera.position.set(0, 1.5, -2.35); controls.target.set(0, 1.42, 0); controls.update();
    })
    .to([gl, gr], { xPercent: i => i === 0 ? -101 : 101, duration: 1.7, ease: 'power4.inOut' }, '+=.15')
    // かごへ入り、扉(前面右の操作盤)側を向いて落ち着く
    .to(camera.position, { x: -dims.W * 0.22, y: 1.52, z: dims.D / 2 - 0.28, duration: 2.6, ease: 'power3.inOut' }, '<.35')
    .to(controls.target, { x: dims.W * 0.3, y: 1.3, z: -dims.D / 2, duration: 2.6, ease: 'power3.inOut', onUpdate: () => controls.update() }, '<')
    .to('#panel', { opacity: 1, duration: .7 }, '<1.4')
    .to('#floorHud', { opacity: 1, duration: .7 }, '<')
    .fromTo('#hint', { opacity: 0 }, { opacity: 1, duration: .6, onComplete: () => gsap.to('#hint', { opacity: 0, delay: 3, duration: 1 }) }, '<.3')
    .set([gl, gr], { display: 'none' })
    // 乗車後は扉を閉じる（実機同様）。閉じると扉横の操作盤(COP)がはっきり見える
    .call(() => { cue('close', 'ドアが閉まります。ご注意ください', 'The doors are closing'); doors(false, 1.3); }, null, '+=.6');
};

/* ホームへ戻る */
$('#homeBtn').onclick = () => {
  clearDepartTimer();
  exitFPMode();
  speechSynthesis?.cancel();
  if (clipAudio) clipAudio.pause();
  S.view = 'cab'; S.doorsOpen = true; rideQueue.clear();
  applyLimits('cab');
  syncViewToggles(); updateFloorBtnLabel();
  resetView(true);
  gsap.set(['#panel', '#floorHud'], { opacity: 0 });
  $('#homeBtn').style.display = 'none';
  const intro = $('#intro');
  intro.style.display = 'flex';
  gsap.set('#intro .inner', { opacity: 1, y: 0 });
  replayIntroAnim();
};

/* =====================================================================
   ループ + ボクセル初期化
===================================================================== */
initVoxel({
  scene, camera, renderer, controls,
  callbacks: {
    audio,
    toast,
    isDoorsOpen: () => S.doorsOpen,
    getDoorWidth: () => cab.userData.dw ?? .92,
    getBtnHits: () => btnHits,
    onHallCall: () => hallCall(),
    onEnterCab: () => { returnToCab(); },
    onRespawn: () => { returnToCab(); toast('やり直し ─ かごに戻りました'); },
    onDescend: () => descendFloor(),
  },
});
voxelTextures.forEach(t => KEEP_TEX.add(t));

/* 一人称オーバーレイ */
document.getElementById('fpResume').onclick = () => {
  document.getElementById('fpOverlay').style.display = 'none';
  if (isFPActive()) relockFP();
  else enterFPMode();
  armDepartTimer(); // 探索を始めてからエレベーターは出発する
};
document.getElementById('fpReturn').onclick = () => {
  document.getElementById('fpOverlay').style.display = 'none';
  returnToCab();
};

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), .1);
  if (!isFPActive()) controls.update();
  // 鏡: 後方(背面壁の外側)から見るときは非表示にして視認性を確保
  if (mirrorGroup) mirrorGroup.visible = camera.position.z < dims.D / 2 - 0.02;
  updateVoxel(dt, S.view === 'walk', clock.elapsedTime);
  if (S.view === 'walk' && isFPActive()) applyDayNight();
  renderer.render(scene, camera);
});
buildCab();
setHud(1, null);
updateSpec(); refreshSwUI(); updateFloorBtnLabel();

