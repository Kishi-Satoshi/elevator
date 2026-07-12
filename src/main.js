import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import gsap from 'gsap';

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

/* 百貨店フロアガイド：到着階ごとに乗場の空気感とアナウンスが変わる */
const FLOOR_GUIDE = [
  null,
  { jp: '化粧品・ラグジュアリー', en: 'Cosmetics & Luxury', wall: 0xf2ead8, floor: 0xd9d2c2, light: 0xffefd0, inten: 1.25 },
  { jp: '婦人服・シューズ', en: "Ladies' Fashion", wall: 0xeadfd2, floor: 0xcdc2b2, light: 0xffe9d8, inten: 1.1 },
  { jp: '紳士服・ビジネス', en: "Men's Fashion", wall: 0x5c6068, floor: 0x44464c, light: 0xe6ecf6, inten: 0.8 },
  { jp: '書籍・文具・カフェ', en: 'Books & Cafe', wall: 0xd9c9a8, floor: 0xa89478, light: 0xffedca, inten: 1.0 },
  { jp: 'レストラン街', en: 'Restaurants', wall: 0x4c4238, floor: 0x3a342c, light: 0xffd9a0, inten: 0.7 },
  { jp: '催事場・イベント', en: 'Event Hall', wall: 0xf2e6d2, floor: 0xdcd0b8, light: 0xfff0c8, inten: 1.35 },
  { jp: 'スカイラウンジ', en: 'Sky Lounge', wall: 0x28303e, floor: 0x20262f, light: 0xffca8c, inten: 0.55 },
  { jp: '屋上庭園・展望', en: 'Rooftop Garden', wall: 0xc4d8e2, floor: 0xb2ab92, light: 0xf2faff, inten: 1.45 },
];

/* 状態 */
const S = {
  type: 'P', cap: 9, wall: 'CP132', floor: 'FQ610', ceil: 'CL2L', panel: 'click',
  door: 'DSUS', frame: 'SUS', kick: 'BLK', view: 'cab', people: 'none',
  handrail: true, mirror: true, style: 'natural', lang: 'ja',
  curFloor: 1, moving: false, doorsOpen: true,
};

/* 設定の保存・復元（URL共有ハッシュ優先） */
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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050608);

let envOK = false;
try {
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  envOK = true;
} catch (e) { console.warn('env fallback', e); }

const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, .03, 60);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .07;
controls.enablePan = false;
controls.minDistance = .18; controls.maxDistance = 1.15;
controls.minPolarAngle = .55; controls.maxPolarAngle = 2.05;
controls.rotateSpeed = .55;

const VIEWCFG = {
  cab: { min: .18, max: 1.15, pMin: .55, pMax: 2.05, pos: [-0.34, 1.5, -0.12], tgt: [0.28, 1.26, 0.62] },
  doll: { min: 1.2, max: 6, pMin: .18, pMax: 1.5, pos: [-2.45, 2.75, 2.55], tgt: [0, 1.05, -0.15] },
};
function resetView(immediate) {
  const c = VIEWCFG.cab;
  if (immediate) { camera.position.set(...c.pos); controls.target.set(...c.tgt); controls.update(); return; }
  flyTo(c.pos, c.tgt, 1.2);
}
resetView(true);

function applyLimits(m) {
  const c = VIEWCFG[m];
  controls.minDistance = c.min; controls.maxDistance = c.max;
  controls.minPolarAngle = c.pMin; controls.maxPolarAngle = c.pMax;
}
function flyTo(pos, tgt, dur = 1.4) {
  gsap.to(camera.position, { x: pos[0], y: pos[1], z: pos[2], duration: dur, ease: 'power3.inOut' });
  gsap.to(controls.target, { x: tgt[0], y: tgt[1], z: tgt[2], duration: dur, ease: 'power3.inOut', onUpdate: () => controls.update() });
}
function setView(mode) {
  S.view = mode; const c = VIEWCFG[mode];
  applyLimits(mode);
  if (mode === 'doll' && S.doorsOpen && !S.moving) doors(false, 1.1); // 俯瞰時は戸閉で模型らしく
  if (cab.userData.hallGroup) cab.userData.hallGroup.visible = (mode === 'cab');
  document.querySelectorAll('.tgl[data-view]').forEach(t => t.classList.toggle('active', t.dataset.view === mode));
  flyTo(c.pos, c.tgt);
}
const ANGLES = {
  front: () => ({ p: [0, 1.48, -dims.D / 2 + .16], t: [0, 1.3, dims.D / 2] }),
  back: () => ({ p: [0, 1.5, dims.D / 2 - .16], t: [0, 1.32, -dims.D / 2] }),
  panel: () => ({ p: [dims.W / 2 - .62, 1.42, -dims.D / 2 + .5], t: [dims.W / 2, 1.42, -dims.D / 2 + .5] }),
  ceil: () => ({ p: [0, 1.15, .12], t: [0, dims.H, 0] }),
  floor: () => ({ p: [0, 1.72, .06], t: [0, 0, .06] }),
};
function goAngle(k) {
  if (S.view !== 'cab') {
    S.view = 'cab'; applyLimits('cab');
    if (cab.userData.hallGroup) cab.userData.hallGroup.visible = true;
    document.querySelectorAll('.tgl[data-view]').forEach(t => t.classList.toggle('active', t.dataset.view === 'cab'));
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
const KEEP_TEX = new Set(); // 使い回すテクスチャ (LCD等)
function disposeObject(root) {
  root.traverse(o => {
    o.geometry?.dispose?.();
    const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    mats.forEach(m => {
      ['map', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'normalMap'].forEach(k => {
        if (m[k] && !KEEP_TEX.has(m[k])) m[k].dispose();
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
   テクスチャ生成（手続き的：木目・ヘアライン・床・液晶・刻印）
===================================================================== */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function woodTex(base) {
  const b = new THREE.Color(base);
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#' + b.getHexString(); g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 2) {
      const v = Math.sin(x * .12) * 8 + Math.sin(x * .043) * 16;
      const a = .05 + .05 * Math.abs(Math.sin(x * .3));
      g.fillStyle = `rgba(60,35,15,${a})`;
      g.fillRect(x, 0, 1.4, h);
      g.fillStyle = `rgba(255,240,220,${a * .5})`;
      g.fillRect(x + 1 + v * .02, 0, .7, h);
    }
    for (let i = 0; i < 5; i++) { // 節・濃淡
      const y = Math.random() * h;
      const grd = g.createLinearGradient(0, y - 40, 0, y + 40);
      grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(.5, 'rgba(70,40,15,.10)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, y - 40, w, 80);
    }
    g.fillStyle = 'rgba(40,22,8,.32)';
    [w / 3, (w / 3) * 2].forEach(x => g.fillRect(x - 1, 0, 2, h)); // パネル目地
  });
}
function hairlineTex() {
  return canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#c9ccd1'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      const v = Math.random() > .5 ? 255 : 30;
      g.fillStyle = `rgba(${v},${v},${v},.055)`; g.fillRect(0, y, w, 1);
    }
  });
}
function steelTex(base) { // 化粧鋼板：微細な縦目+パネル目地
  const b = new THREE.Color(base);
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#' + b.getHexString(); g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 1) {
      const v = Math.random() > .5 ? 255 : 0;
      g.fillStyle = `rgba(${v},${v},${v},.018)`; g.fillRect(x, 0, 1, h);
    }
    g.fillStyle = 'rgba(0,0,0,.22)';
    [w / 3, (w / 3) * 2].forEach(x => g.fillRect(x - 1, 0, 2, h)); // 目地
    g.fillStyle = 'rgba(255,255,255,.07)';
    [w / 3, (w / 3) * 2].forEach(x => g.fillRect(x + 1, 0, 1, h));
  });
}
function tileTex(base) {
  const b = new THREE.Color(base);
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#' + b.getHexString(); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${Math.random() * 255 | 0},${Math.random() * 255 | 0},${Math.random() * 255 | 0},.035)`;
      g.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
    }
    g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 2;
    g.strokeRect(0, 0, w, h); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  });
}
/* ボタン刻印（階数・開閉） */
function btnLabelTex(label, dark) {
  const t = canvasTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = dark ? 'rgba(240,244,248,.92)' : 'rgba(28,30,34,.88)';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (label === 'open' || label === 'close') {
      // 開閉アイコン：中央線 + 三角
      g.strokeStyle = g.fillStyle; g.lineWidth = 5;
      g.beginPath(); g.moveTo(w / 2, 22); g.lineTo(w / 2, h - 22); g.stroke();
      const tri = (x, dir) => {
        g.beginPath();
        g.moveTo(x, h / 2 - 16); g.lineTo(x, h / 2 + 16); g.lineTo(x + 22 * dir, h / 2);
        g.closePath(); g.fill();
      };
      if (label === 'open') { tri(w / 2 - 14, -1); tri(w / 2 + 14, 1); }
      else { tri(w / 2 - 34, 1); tri(w / 2 + 34, -1); }
    } else {
      g.font = '600 64px Inter, sans-serif';
      g.fillText(String(label), w / 2, h / 2 + 2);
    }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
/* 10.1型液晶 */
const lcdCanvas = document.createElement('canvas'); lcdCanvas.width = 256; lcdCanvas.height = 420;
const lcdCtx = lcdCanvas.getContext('2d');
const lcdTex = new THREE.CanvasTexture(lcdCanvas); lcdTex.colorSpace = THREE.SRGBColorSpace;
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
  g.fillText(String(floor), w / 2, 250);
  g.fillStyle = '#6fb8d8'; g.font = '400 17px "Zen Kaku Gothic New",sans-serif';
  g.fillText(floor + '階', w / 2, 294);
  const guide = FLOOR_GUIDE[floor];
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
const lantCanvas = document.createElement('canvas'); lantCanvas.width = 192; lantCanvas.height = 72;
const lantCtx = lantCanvas.getContext('2d');
const lantTex = new THREE.CanvasTexture(lantCanvas); lantTex.colorSpace = THREE.SRGBColorSpace;
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
  g.fillText(String(floor), w / 2, h / 2 + 3);
  lantTex.needsUpdate = true;
}
drawLantern(1, null);

/* =====================================================================
   かご構築
===================================================================== */
const cab = new THREE.Group(); scene.add(cab);
let M = {}, lightsGroup = null, doorL = null, doorR = null, btnMeshes = [], dims = {};

function capScale() { return ({ 6: .96, 7: 1, 9: 1.1, 11: 1.2, 13: 1.3, 15: 1.38 })[S.cap] || 1.1; }

function matFor(opt) {
  if (opt.metal) return new THREE.MeshStandardMaterial({ map: hairlineTex(), color: opt.hex, metalness: .85, roughness: .34, envMapIntensity: envOK ? 1 : 0 });
  if (opt.wood) return new THREE.MeshStandardMaterial({ map: woodTex(opt.hex), metalness: .05, roughness: .55 });
  return new THREE.MeshStandardMaterial({ color: opt.hex, metalness: .12, roughness: .5 });
}
function wallMaterial(opt) {
  if (opt.metal) return new THREE.MeshStandardMaterial({ map: hairlineTex(), color: opt.hex, metalness: .85, roughness: .34, envMapIntensity: envOK ? 1 : 0 });
  if (opt.wood) return new THREE.MeshStandardMaterial({ map: woodTex(opt.hex), metalness: .05, roughness: .58 });
  return new THREE.MeshStandardMaterial({ map: steelTex(opt.hex), metalness: .08, roughness: .74 });
}

function buildCab() {
  clearGroup(cab);
  btnMeshes = [];

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
  M.floor = new THREE.MeshStandardMaterial({ map: tileTex(floorOpt.hex), metalness: .06, roughness: .55 });
  M.floor.map.repeat.set(Math.round(W * 2.4), Math.round(D * 2.4));
  M.ceil = new THREE.MeshStandardMaterial({ color: 0xf2f3f4, metalness: .05, roughness: .9 });
  M.sus = new THREE.MeshStandardMaterial({ map: hairlineTex(), color: 0xc9ccd1, metalness: .9, roughness: .3, envMapIntensity: envOK ? 1.1 : 0 });
  M.dark = new THREE.MeshStandardMaterial({ color: 0x14161a, metalness: .4, roughness: .6 });

  const P = (w, h, mat) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);

  // 床・天井
  const fl = P(W, D, M.floor); fl.rotation.x = -Math.PI / 2; fl.position.y = 0; fl.receiveShadow = true; cab.add(fl);
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
  // 戸当たりゴム
  const seal = new THREE.Mesh(new THREE.BoxGeometry(.012, dh, .04), M.dark); seal.position.set(0, dh / 2, fz + .045); cab.add(seal);
  cab.userData.seal = seal; cab.userData.dw = dw;

  // 幅木
  const kick = new THREE.Mesh(new THREE.BoxGeometry(W, .09, .012), M.kickMat); kick.position.set(0, .045, D / 2 - .008); kick.rotation.y = Math.PI; cab.add(kick);
  const kickL = new THREE.Mesh(new THREE.BoxGeometry(D, .09, .012), M.kickMat); kickL.rotation.y = Math.PI / 2; kickL.position.set(-W / 2 + .008, .045, 0); cab.add(kickL);
  const kickR = kickL.clone(); kickR.position.x = W / 2 - .008; cab.add(kickR);

  // 乗場（ドアの外）— 到着階のフロアテーマで色・光が変わる（俯瞰時は非表示）
  const hallGroup = new THREE.Group(); cab.add(hallGroup); cab.userData.hallGroup = hallGroup;
  const hallWallMat = new THREE.MeshStandardMaterial({ map: steelTex(0xffffff), color: 0x9a9690, roughness: .8, metalness: .05 });
  const hallFloorMat = new THREE.MeshStandardMaterial({ map: tileTex(0xffffff), color: 0x55585d, roughness: .45, metalness: .1 });
  const hallW = P(5, 3, hallWallMat); hallW.position.set(0, 1.5, fz - 2.1); hallGroup.add(hallW);
  const hallSideL = P(2.2, 3, hallWallMat); hallSideL.rotation.y = Math.PI / 2; hallSideL.position.set(-2.5, 1.5, fz - 1.05); hallGroup.add(hallSideL);
  const hallSideR = hallSideL.clone(); hallSideR.rotation.y = -Math.PI / 2; hallSideR.position.x = 2.5; hallGroup.add(hallSideR);
  const hallF = P(5, 2.2, hallFloorMat);
  hallF.rotation.x = -Math.PI / 2; hallF.position.set(0, 0, fz - 1.1); hallGroup.add(hallF);
  const hallC = P(5, 2.2, new THREE.MeshStandardMaterial({ color: 0x35373b, roughness: .9 }));
  hallC.rotation.x = Math.PI / 2; hallC.position.set(0, 2.72, fz - 1.1); hallGroup.add(hallC);
  // 乗場側三方枠(かご枠の外周)
  const hjU = new THREE.Mesh(new THREE.BoxGeometry(dw + .34, .13, .05), M.frame); hjU.position.set(0, dh + .1, fz - .05); hallGroup.add(hjU);
  const hjL = new THREE.Mesh(new THREE.BoxGeometry(.13, dh + .16, .05), M.frame); hjL.position.set(-dw / 2 - .11, (dh + .16) / 2, fz - .05); hallGroup.add(hjL);
  const hjR = hjL.clone(); hjR.position.x = dw / 2 + .11; hallGroup.add(hjR);
  const hl = new THREE.PointLight(0xfff3df, 10, 7, 1.6); hl.position.set(0, 2.45, fz - 1.0); hallGroup.add(hl);
  const hl2 = new THREE.PointLight(0xfff3df, 4, 6, 1.8); hl2.position.set(1.6, 2.45, fz - 1.4); hallGroup.add(hl2);
  cab.userData.hallLight = hl; cab.userData.hallLight2 = hl2;
  cab.userData.hallMats = { wall: hallWallMat, floor: hallFloorMat };
  // ホールランタン（方向 + 階数の発光表示）
  const lant = new THREE.Mesh(new THREE.PlaneGeometry(.3, .11),
    new THREE.MeshBasicMaterial({ map: lantTex }));
  lant.position.set(0, dh + .34, fz - .028); lant.rotation.y = 0; hallGroup.add(lant);
  hallGroup.visible = (S.view === 'cab');

  applyFloorTheme(S.curFloor, true);
  if (S.moving) { hl.intensity = 0; hl2.intensity = 0; } // 走行中の再構築でも乗場は暗いまま
  buildLights();
  buildPanel();
  buildOptions();
  buildPeople();
  applyDoorState(true);
}

/* 到着階のフロアテーマを乗場に反映 */
function applyFloorTheme(floor, immediate) {
  const t = FLOOR_GUIDE[floor];
  const m = cab.userData.hallMats;
  if (!t || !m) return;
  const wallC = new THREE.Color(t.wall), floorC = new THREE.Color(t.floor), lightC = new THREE.Color(t.light);
  const hl = cab.userData.hallLight, hl2 = cab.userData.hallLight2;
  cab.userData.hallInten = t.inten; // 走行後の復帰照度
  if (immediate) {
    m.wall.color.copy(wallC); m.floor.color.copy(floorC);
    hl.color.copy(lightC); hl2.color.copy(lightC);
    hl.intensity = 10 * t.inten; hl2.intensity = 4 * t.inten;
    return;
  }
  const d = 1.0;
  gsap.to(m.wall.color, { r: wallC.r, g: wallC.g, b: wallC.b, duration: d });
  gsap.to(m.floor.color, { r: floorC.r, g: floorC.g, b: floorC.b, duration: d });
  [hl, hl2].forEach(l => gsap.to(l.color, { r: lightC.r, g: lightC.g, b: lightC.b, duration: d }));
}

/* 乗車シミュレーション：人物モデル */
let peopleGroup = null;
function makePerson(h, mat) {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(.088, 18, 14), mat); head.position.y = h - .09; g.add(head);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.125, .46, 6, 14), mat); torso.position.y = h - .52; g.add(torso);
  [-1, 1].forEach(s => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.038, .46, 4, 10), mat);
    arm.position.set(s * .175, h - .56, 0); arm.rotation.z = s * .07; g.add(arm);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.052, .62, 4, 10), mat);
    leg.position.set(s * .072, .42, 0); g.add(leg);
  });
  return g;
}
function makeWheelchair(mat, frameMat) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(.44, .05, .42), frameMat); seat.position.y = .5; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(.44, .42, .05), frameMat); back.position.set(0, .73, .21); g.add(back);
  [-1, 1].forEach(s => {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(.3, .025, 10, 28), frameMat);
    wheel.rotation.y = Math.PI / 2; wheel.position.set(s * .26, .3, .08); g.add(wheel);
    const caster = new THREE.Mesh(new THREE.TorusGeometry(.08, .02, 8, 16), frameMat);
    caster.rotation.y = Math.PI / 2; caster.position.set(s * .2, .08, -.22); g.add(caster);
  });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.125, .4, 6, 14), mat); torso.position.set(0, .86, .1); g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.088, 18, 14), mat); head.position.set(0, 1.24, .1); g.add(head);
  [-1, 1].forEach(s => {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(.05, .3, 4, 10), mat);
    thigh.rotation.x = Math.PI / 2; thigh.position.set(s * .08, .56, -.1); g.add(thigh);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(.045, .32, 4, 10), mat);
    shin.position.set(s * .08, .3, -.26); g.add(shin);
  });
  return g;
}
function buildPeople() {
  if (peopleGroup) { cab.remove(peopleGroup); disposeObject(peopleGroup); }
  peopleGroup = new THREE.Group(); cab.add(peopleGroup);
  if (S.people === 'none') return;
  const { W, D } = dims;
  const mat = new THREE.MeshStandardMaterial({ color: 0xeceff1, roughness: .65, metalness: .02 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x44484e, roughness: .4, metalness: .6 });
  const counts = { few: 2, half: Math.max(2, Math.round(S.cap / 2)), seven: Math.max(3, Math.round(S.cap * .7)), full: S.cap };
  const rx = W / 2 - .32, rzF = -D / 2 + .42, rzB = D / 2 - .34;
  if (S.people === 'wc') {
    const wc = makeWheelchair(mat, frameMat); wc.position.set(-W * .16, 0, -.05); wc.rotation.y = Math.PI; peopleGroup.add(wc);
    const p = makePerson(1.66, mat); p.position.set(W * .26, 0, D * .22); p.rotation.y = Math.PI + .4; peopleGroup.add(p);
    return;
  }
  const n = counts[S.people] || 0;
  const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
  let i = 0; const seed = (k) => { const x = Math.sin(k * 127.1) * 43758.5; return x - Math.floor(x); };
  for (let r = 0; r < rows && i < n; r++) for (let c = 0; c < cols && i < n; c++, i++) {
    const fx = cols === 1 ? .5 : c / (cols - 1), fz = rows === 1 ? .5 : r / (rows - 1);
    const x = -rx + fx * 2 * rx + (seed(i * 3 + 1) - .5) * .1;
    const z = rzF + fz * (rzB - rzF) + (seed(i * 7 + 2) - .5) * .08;
    const h = 1.55 + seed(i * 11 + 3) * .25;
    const p = makePerson(h, mat); p.position.set(x, 0, z);
    p.rotation.y = Math.PI + (seed(i * 13 + 5) - .5) * .9;
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
  } else { // cornice 間接
    const strip = (x, z, w, d) => { const m = emis(w, d, c.color, 3.2); m.position.x = x; m.position.z = z; };
    strip(0, D / 2 - .07, W * .92, .07); strip(0, -D / 2 + .07, W * .92, .07);
    strip(-W / 2 + .07, 0, .07, D * .86); strip(W / 2 - .07, 0, .07, D * .86);
    const p = new THREE.PointLight(c.color, 9, 4.4, 1.7); p.position.set(0, H - .22, 0); lightsGroup.add(p);
    const p2 = new THREE.PointLight(c.color, 5, 3.6, 1.8); p2.position.set(0, H - .5, D * .3); lightsGroup.add(p2);
  }
}

/* 操作盤 */
let panelGroup = null;
function buildPanel() {
  if (panelGroup) { cab.remove(panelGroup); disposeObject(panelGroup); }
  panelGroup = new THREE.Group(); cab.add(panelGroup);
  const { W, D } = dims;
  const p = DATA.panels.find(x => x.id === S.panel);
  const dark = S.panel === 'black';
  const faceMat = dark
    ? new THREE.MeshStandardMaterial({ color: 0x26282c, metalness: .85, roughness: .4 })
    : M.sus;

  const px = W / 2 - .022, pz = -D / 2 + .5;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(.03, 1.46, .3), faceMat);
  plate.position.set(px, 1.32, pz); panelGroup.add(plate);

  // 10.1型 縦型液晶
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(.155, .255),
    new THREE.MeshBasicMaterial({ map: lcdTex }));
  lcd.rotation.y = -Math.PI / 2; lcd.position.set(px - .017, 1.78, pz); panelGroup.add(lcd);

  // ボタン（8フロア + 開/閉）クリック可能・刻印つき
  const mkBtn = (y, z, floor, label) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(.0245, .0245, .006, 28),
      new THREE.MeshStandardMaterial({ color: p.ring, metalness: .7, roughness: .35 }));
    ring.rotation.z = Math.PI / 2; ring.position.set(px - .016, y, z); panelGroup.add(ring);
    const mat = new THREE.MeshStandardMaterial({
      color: p.btn, metalness: S.panel === 'crystal' ? .1 : .6,
      roughness: S.panel === 'crystal' ? .15 : .4, emissive: p.glow, emissiveIntensity: 0,
      transparent: S.panel === 'crystal', opacity: S.panel === 'crystal' ? .92 : 1,
    });
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.019, .019, .01, 28), mat);
    b.rotation.z = Math.PI / 2; b.position.set(px - .019, y, z);
    b.userData = { floor, label }; panelGroup.add(b); btnMeshes.push(b);
    // 刻印
    const engr = new THREE.Mesh(new THREE.PlaneGeometry(.026, .026),
      new THREE.MeshBasicMaterial({ map: btnLabelTex(floor ?? label, dark), transparent: true }));
    engr.rotation.y = -Math.PI / 2; engr.position.set(px - .0252, y, z); panelGroup.add(engr);
    if (S.panel === 'touchless') {
      const halo = new THREE.Mesh(new THREE.RingGeometry(.026, .031, 28),
        new THREE.MeshBasicMaterial({ color: 0x46d3ff, transparent: true, opacity: .7, side: THREE.DoubleSide }));
      halo.rotation.y = -Math.PI / 2; halo.position.set(px - .024, y, z); panelGroup.add(halo);
    }
    return b;
  };
  let i = 0;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
    const f = 8 - i; mkBtn(1.5 - r * .075, pz - .05 + c * .1, f); i++;
  }
  mkBtn(1.14, pz - .05, null, 'open'); mkBtn(1.14, pz + .05, null, 'close');
  highlightFloorBtn();
}
function highlightFloorBtn() {
  btnMeshes.forEach(b => { if (b.userData.floor) b.material.emissiveIntensity = b.userData.floor === S.curFloor ? .9 : 0; });
}

/* 手すり・鏡 */
let optGroup = null;
function buildOptions() {
  if (optGroup) { cab.remove(optGroup); disposeObject(optGroup); }
  optGroup = new THREE.Group(); cab.add(optGroup);
  const { W, D } = dims;
  if (S.handrail) {
    const r = .018, y = .86, railMat = M.sus;
    const mk = (len, x, z, rotY) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16), railMat);
      m.rotation.z = Math.PI / 2; m.rotation.y = rotY; m.position.set(x, y, z); optGroup.add(m);
    };
    mk(W * .86, 0, D / 2 - .06, 0);
    mk(D * .8, -W / 2 + .06, 0, Math.PI / 2);
    mk(D * .8, W / 2 - .06, 0, Math.PI / 2);
    // ブラケット
    [[-W * .35, D / 2 - .06], [W * .35, D / 2 - .06], [-W / 2 + .06, -D * .28], [-W / 2 + .06, D * .28], [W / 2 - .06, -D * .28], [W / 2 - .06, D * .28]]
      .forEach(([x, z]) => {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .05, 10), railMat);
        b.position.set(x, y - .028, z); optGroup.add(b);
      });
  }
  if (S.mirror) {
    const mw = Math.min(.62, dims.W * .42);
    const mir = new Reflector(new THREE.PlaneGeometry(mw, 1.62),
      { clipBias: .003, textureWidth: 512, textureHeight: 1024, color: 0xc8cdd2 });
    mir.position.set(dims.W * .18, 1.18, dims.D / 2 - .012); mir.rotation.y = Math.PI; optGroup.add(mir);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(mw + .03, 1.65, .008), M.sus);
    frame.position.set(dims.W * .18, 1.18, dims.D / 2 - .006); optGroup.add(frame);
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
   音 — 合成チャイム & 音声（実機録音は不使用）
   音声パラメータは提供音源の解析値
   (基本周波数 中央値245Hz=女声 / 発話比率0.62=ゆったり) に基づく近似。
===================================================================== */
let actx = null, humNodes = null;
function audio() { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); return actx; }
function bell(f, dt, dur, vol, a) {
  // ベル質感：基音 + オクターブ + 非整数倍音
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
  if (dir === 'down') { bell(932, 0, .5, .15, a); bell(830, .42, 1.0, .17, a); } // 下り二連音
  else { bell(932, 0, 1.0, .17, a); }                                            // 上り単音
}
function btnBeep() {
  const a = audio(), t = a.currentTime, o = a.createOscillator(), g = a.createGain();
  o.type = 'square'; o.frequency.value = S.panel === 'touchless' ? 1567 : 1244;
  g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.0001, t + .12);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + .13);
}
function tick() { // 階通過音（ごく小さく）
  const a = audio(), t = a.currentTime, o = a.createOscillator(), g = a.createGain();
  o.type = 'sine'; o.frequency.value = 660;
  g.gain.setValueAtTime(.018, t); g.gain.exponentialRampToValueAtTime(.0001, t + .07);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + .08);
}
function humStart() {
  const a = audio(), o = a.createOscillator(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
  // 低域ノイズ（走行音）
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
/* 速度 (0..1) に走行音を追従させる */
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

/* 音声：女声優先・ゆったり（解析値: pitch≒1.14 / rate≒0.88） */
let voiceCache = [];
function refreshVoices() { if (window.speechSynthesis) voiceCache = speechSynthesis.getVoices(); }
if (window.speechSynthesis) {
  refreshVoices();
  speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
}
function speak(ja, en) {
  if (S.lang === 'off' || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(S.lang === 'ja' ? ja : en);
  u.lang = S.lang === 'ja' ? 'ja-JP' : 'en-US'; u.rate = .88; u.pitch = 1.14; u.volume = .9;
  if (!voiceCache.length) refreshVoices();
  const pref = S.lang === 'ja' ? /nanami|kyoko|haruka|o-ren|sayaka|mizuki|female|google 日本語/i : /samantha|jenny|aria|zira|female|google us english/i;
  const v = voiceCache.find(v => v.lang.startsWith(S.lang === 'ja' ? 'ja' : 'en') && pref.test(v.name))
    || voiceCache.find(v => v.lang.startsWith(S.lang === 'ja' ? 'ja' : 'en'));
  if (v) u.voice = v;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

/* =====================================================================
   乗車シーケンス
===================================================================== */
const hudNum = document.getElementById('hudNum'), hudDir = document.getElementById('hudDir'),
  hudDept = document.getElementById('hudDept'), floorHud = document.getElementById('floorHud');
function setHud(f, dir) {
  hudNum.textContent = f;
  hudDir.textContent = dir === 'up' ? '▲ UP' : dir === 'down' ? '▼ DOWN' : '';
  hudDept.textContent = FLOOR_GUIDE[f]?.jp ?? '';
  drawLCD(f, dir);
  drawLantern(f, dir);
}
function arrivalText(f) {
  const g = FLOOR_GUIDE[f];
  const ja = g ? `${f}階、${g.jp}売場でございます` : `${f}階です`;
  const en = g ? `${ordinalEn(f)} floor. ${g.en}.` : `${ordinalEn(f)} floor`;
  return [ja, en];
}
async function ride(target) {
  if (S.moving || target === S.curFloor) return;
  S.moving = true;
  floorHud.classList.add('moving');
  const dir = target > S.curFloor ? 'up' : 'down';
  markFloorBtns(target);
  speak(dir === 'up' ? '上へまいります' : '下へまいります', dir === 'up' ? 'Going up' : 'Going down');
  await new Promise(r => setTimeout(r, 900));
  if (S.doorsOpen) { speak('ドアが閉まります。ご注意ください', 'The doors are closing'); await doors(false, 1.4); }
  await new Promise(r => setTimeout(r, 250));
  humStart();
  cab.userData.hallLight.intensity = 0; cab.userData.hallLight2.intensity = 0; // 走行中：乗場は闇
  applyFloorTheme(target, false); // 走行中に次フロアの空気感へ遷移
  const o = { f: S.curFloor, p: 0 };
  const dist = Math.abs(target - S.curFloor);
  setHud(S.curFloor, dir);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shake = null;
  if (!reduce) {
    shake = gsap.to(camera.position, { y: '+=0.006', duration: .09, yoyo: true, repeat: -1, ease: 'sine.inOut', paused: true });
    gsap.fromTo(renderer, { toneMappingExposure: 1.05 }, { toneMappingExposure: .98, duration: .6, yoyo: true, repeat: 3 });
  }
  const dur = Math.min(1.1 * dist + 0.6, 7);
  await new Promise(res => {
    gsap.to(o, {
      f: target, p: 1, duration: dur, ease: 'power2.inOut',
      onUpdate: () => {
        // S字プロファイル近似の速度 (0..1) — 音と振動を追従させる
        const v = Math.sin(Math.PI * Math.min(1, Math.max(0, o.p)));
        humSet(v);
        if (shake) { if (v > .12 && shake.paused()) shake.play(); shake.timeScale(Math.max(.3, v)); }
        const f = Math.round(o.f);
        if (f !== S.curFloor) { S.curFloor = f; setHud(f, dir); highlightFloorBtn(); tick(); }
      },
      onComplete: res,
    });
  });
  shake?.kill(); gsap.to(camera.position, { y: 1.52, duration: .4 });
  renderer.toneMappingExposure = 1.05;
  humStop();
  chime(dir);
  setHud(target, null);
  S.curFloor = target; highlightFloorBtn(); markFloorBtns(null);
  floorHud.classList.remove('moving');
  const [ja, en] = arrivalText(target);
  speak(ja, en);
  await new Promise(r => setTimeout(r, 900));
  const inten = cab.userData.hallInten ?? 1;
  gsap.to(cab.userData.hallLight, { intensity: 10 * inten, duration: .6 });
  gsap.to(cab.userData.hallLight2, { intensity: 4 * inten, duration: .6 });
  speak('ドアが開きます', 'The doors are opening');
  await doors(true, 1.4);
  S.moving = false;
}
function ordinalEn(n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); }

/* =====================================================================
   レイキャスト（かご内ボタン）
===================================================================== */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let downAt = 0;
renderer.domElement.addEventListener('pointerdown', () => downAt = performance.now());
renderer.domElement.addEventListener('pointerup', e => {
  if (performance.now() - downAt > 240) return; // ドラッグは無視
  ptr.x = (e.clientX / innerWidth) * 2 - 1; ptr.y = -(e.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(btnMeshes, false)[0];
  if (!hit) return;
  btnBeep();
  const u = hit.object.userData;
  gsap.fromTo(hit.object.scale, { x: .85 }, { x: 1, duration: .4, ease: 'back.out(3)' });
  if (u.floor) ride(u.floor);
  else if (u.label === 'open' && !S.moving) { speak('ドアが開きます', 'The doors are opening'); doors(true); }
  else if (u.label === 'close' && !S.moving) { speak('ドアが閉まります。ご注意ください', 'The doors are closing'); doors(false); }
});
renderer.domElement.addEventListener('pointermove', e => {
  ptr.x = (e.clientX / innerWidth) * 2 - 1; ptr.y = -(e.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(ptr, camera);
  renderer.domElement.style.cursor = ray.intersectObjects(btnMeshes, false).length ? 'pointer' : 'grab';
});

/* =====================================================================
   UI 構築
===================================================================== */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
function toast(msg) {
  const t = $('#toast'); t.textContent = msg;
  gsap.fromTo(t, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: .35, onComplete: () => gsap.to(t, { opacity: 0, delay: 1.6, duration: .5 }) });
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
  swatches('wallSw', DATA.walls, 'wall', () => rebuildSoft());
  swatches('floorSw', DATA.floors, 'floor', () => rebuildSoft());
  swatches('doorSw', DATA.doors, 'door', () => rebuildSoft());
  swatches('frameSw', DATA.frames, 'frame', () => rebuildSoft());
  swatches('kickSw', DATA.kicks, 'kick', () => rebuildSoft());
  lists('ceilList', DATA.ceilings, 'ceil', () => buildLights());
  lists('panelList', DATA.panels, 'panel', () => buildPanel());
}
function rebuildSoft() { buildCab(); }

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
  b.onclick = () => { btnBeep(); ride(f); };
  b.dataset.f = f; fbWrap.appendChild(b);
}
function markFloorBtns(target) {
  $$('#floorBtns .fb').forEach(b => b.classList.toggle('now', Number(b.dataset.f) === (target ?? S.curFloor)));
}
markFloorBtns(null);

$('#btnDoor').onclick = () => {
  if (S.moving) return;
  if (S.doorsOpen) { speak('ドアが閉まります。ご注意ください', 'The doors are closing'); doors(false); }
  else { speak('ドアが開きます', 'The doors are opening'); doors(true); }
};
$('#btnView').onclick = () => setView(S.view);

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
    ['音声案内', S.lang === 'off' ? 'OFF' : S.lang === 'ja' ? '日本語' : 'English'],
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
   イントロ
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

gsap.from('#intro .inner > *', { opacity: 0, y: 18, duration: .9, stagger: .08, ease: 'power3.out', delay: .15 });

$('#startBtn').onclick = () => {
  audio(); refreshVoices();
  buildCab(); updateSpec(); refreshSwUI(); setHud(1, null);
  const gl = $('#gateL'), gr = $('#gateR');
  gl.style.display = gr.style.display = 'block';
  const tl = gsap.timeline();
  tl.to('#intro .inner', { opacity: 0, y: -24, duration: .55, ease: 'power2.in' })
    .set('#intro', { display: 'none' })
    .add(() => {
      chime('up'); speak('ドアが開きます', 'The doors are opening');
      doors(true, 0.01);
      camera.position.set(0, 1.5, -2.35); controls.target.set(0, 1.42, 0); controls.update();
    })
    .to([gl, gr], { xPercent: i => i === 0 ? -101 : 101, duration: 1.7, ease: 'power4.inOut' }, '+=.15')
    .to(camera.position, { x: -0.34, y: 1.5, z: -0.12, duration: 2.6, ease: 'power3.inOut' }, '<.35')
    .to(controls.target, { x: 0.28, y: 1.26, z: 0.62, duration: 2.6, ease: 'power3.inOut', onUpdate: () => controls.update() }, '<')
    .to('#panel', { opacity: 1, duration: .7 }, '<1.4')
    .to('#floorHud', { opacity: 1, duration: .7 }, '<')
    .fromTo('#hint', { opacity: 0 }, { opacity: 1, duration: .6, onComplete: () => gsap.to('#hint', { opacity: 0, delay: 3, duration: 1 }) }, '<.3')
    .set([gl, gr], { display: 'none' });
};

/* =====================================================================
   ループ
===================================================================== */
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
buildCab(); /* 初期表示（イントロ背後でレンダリング開始）*/
setHud(1, null);
updateSpec(); refreshSwUI();
