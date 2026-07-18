import * as THREE from 'three';
import gsap from 'gsap';

/* =====================================================================
   voxel.js — フロアのボクセルサンドボックス
   ------------------------------------------------------------
   ドアの外に広がる各フロアを、自作ドット絵テクスチャのブロック世界として
   構築する。一人称視点で歩き回り、ブロックを壊す/置く、ブロック人形が
   徘徊する。テクスチャ・造形はすべて本プロジェクトのオリジナル。
   ------------------------------------------------------------
   ワールド座標系: セルサイズ 0.5m。原点はドア中央、-Z 方向へ広がる。
   grid(x,y,z) → world( x*0.5, y*0.5+0.25, fz-0.5 - z*0.5 )
===================================================================== */

const CELL = 0.5;
const GRID_FIELD = { xMin: -16, xMax: 16, zMin: 0, zMax: 28, yMax: 8 };   // 各階の開けたフィールド
const GRID_PLAINS = { xMin: -30, xMax: 30, zMin: 0, zMax: 46, yMax: 10 }; // 最上階の大草原
let GRID = GRID_FIELD;
const PLAINS_FLOOR = 8;
function isPlains(floor) { return floor === PLAINS_FLOOR; }

let ctx = null; // { scene, camera, renderer, controls, callbacks }
let fz = -0.75;

/* ---------------- ドット絵テクスチャ (16x16 自作) ---------------- */
export const voxelTextures = [];
export const voxelTexSet = new Set(); // これに含まれるテクスチャは共有扱いで破棄しない
const texCache = new Map();

function px16(draw) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = false;
  voxelTextures.push(t);
  voxelTexSet.add(t);
  return t;
}

/* ボクセル人形の共有パレット */
const P_SKIN = [0xe8c0a0, 0xdfae86, 0xc99a72, 0xf0d2b6];
const P_HAIR = [0x241d18, 0x3c2e20, 0x554433, 0x6e6e6e, 0x151a20];
const P_TOP = [0x39516e, 0x6e3b45, 0x5e664b, 0x8b8f96, 0xd9d5cc, 0x2c2f36, 0x8a6e4b, 0xc94a55, 0x4a7a58];
const P_BOT = [0x2c2f38, 0x4a4438, 0x6b6f78, 0x3a3f4a, 0x8a8478];

/* 顔テクスチャ: 肌色×表情バリエーションを1度だけ生成してキャッシュ。
   背景は不透明の肌色で塗り (透過させない → 頭が透けない)、その上に表情を描く。 */
const FACE_VARIANTS = 6;
const faceCache = new Map();
function faceTexV(skinHex, idx) {
  idx = ((idx % FACE_VARIANTS) + FACE_VARIANTS) % FACE_VARIANTS;
  const ck = skinHex + '_' + idx;
  if (faceCache.has(ck)) return faceCache.get(ck);
  const skinCss = '#' + new THREE.Color(skinHex).getHexString();
  const t = px16(g => {
    g.fillStyle = skinCss; g.fillRect(0, 0, 16, 16); // 不透明の肌色背景
    const eyeY = 6 + (idx % 2);
    // 目 (白目 + 瞳)
    g.fillStyle = '#f6f4ef'; g.fillRect(4, eyeY, 3, 2); g.fillRect(9, eyeY, 3, 2);
    g.fillStyle = ['#3a2f28', '#2a3550', '#33302a'][idx % 3];
    g.fillRect(5, eyeY, 2, 2); g.fillRect(10, eyeY, 2, 2);
    // 眉
    g.fillStyle = 'rgba(60,45,30,.55)'; g.fillRect(4, eyeY - 2, 3, 1); g.fillRect(9, eyeY - 2, 3, 1);
    // 口
    g.fillStyle = ['#a85a4e', '#8a4a42', '#b06a58'][idx % 3];
    const mw = 3 + (idx % 3);
    g.fillRect(8 - (mw >> 1), 11 + (idx % 2), mw, 1);
    // 頬 (うっすら)
    g.fillStyle = 'rgba(230,150,140,.3)';
    g.fillRect(3, eyeY + 3, 2, 1); g.fillRect(11, eyeY + 3, 2, 1);
  });
  faceCache.set(ck, t);
  return t;
}
function noiseFill(g, palette, rand) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    g.fillStyle = palette[(rand() * palette.length) | 0];
    g.fillRect(x, y, 1, 1);
  }
}
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function tex(id, maker) {
  if (!texCache.has(id)) texCache.set(id, maker());
  return texCache.get(id);
}

const T = {
  stone: () => tex('stone', () => px16(g => noiseFill(g, ['#8a8f94', '#82878c', '#93989d', '#7c8186'], seeded(11)))),
  stonePale: () => tex('stonePale', () => px16(g => noiseFill(g, ['#c9c6c0', '#c2bfb8', '#d1cec8', '#bcb9b2'], seeded(12)))),
  planks: () => tex('planks', () => px16(g => {
    const r = seeded(21);
    const tones = ['#b08a54', '#a67f4b', '#b9925c'];
    for (let row = 0; row < 4; row++) {
      g.fillStyle = tones[row % 3];
      g.fillRect(0, row * 4, 16, 4);
      for (let x = 0; x < 16; x++) if (r() < .22) {
        g.fillStyle = 'rgba(70,45,20,.35)'; g.fillRect(x, row * 4 + 1 + ((r() * 2) | 0), 1, 1);
        g.fillStyle = tones[row % 3];
      }
      g.fillStyle = '#6d5230'; g.fillRect(0, row * 4 + 3, 16, 1);
      const seam = ((row * 7) % 16);
      g.fillRect(seam, row * 4, 1, 4);
    }
  })),
  planksPale: () => tex('planksPale', () => px16(g => {
    const tones = ['#d4bd96', '#cbb48c', '#dcc6a0'];
    for (let row = 0; row < 4; row++) {
      g.fillStyle = tones[row % 3]; g.fillRect(0, row * 4, 16, 4);
      g.fillStyle = '#a5906c'; g.fillRect(0, row * 4 + 3, 16, 1);
      g.fillRect(((row * 5) % 16), row * 4, 1, 4);
    }
  })),
  dirt: () => tex('dirt', () => px16(g => noiseFill(g, ['#7a5a3a', '#6e5034', '#83613f', '#65482e'], seeded(31)))),
  grassTop: () => tex('grassTop', () => px16(g => noiseFill(g, ['#5fa04a', '#549644', '#69aa52', '#4e8c40'], seeded(41)))),
  grassSide: () => tex('grassSide', () => px16(g => {
    noiseFill(g, ['#7a5a3a', '#6e5034', '#83613f'], seeded(42));
    const r = seeded(43);
    for (let x = 0; x < 16; x++) {
      g.fillStyle = ['#5fa04a', '#549644', '#69aa52'][(r() * 3) | 0];
      const d = 3 + ((r() * 2) | 0);
      g.fillRect(x, 0, 1, d);
    }
  })),
  leaves: () => tex('leaves', () => px16(g => noiseFill(g, ['#3e7a34', '#356c2c', '#47883c', '#2e6026', '#529446'], seeded(51)))),
  log: () => tex('log', () => px16(g => {
    const r = seeded(61);
    for (let x = 0; x < 16; x++) {
      g.fillStyle = ['#6b4d2e', '#5f4428', '#755534'][(r() * 3) | 0];
      g.fillRect(x, 0, 1, 16);
    }
    g.fillStyle = 'rgba(40,25,10,.5)';
    [2, 7, 12].forEach(x => g.fillRect(x, 0, 1, 16));
  })),
  brick: () => tex('brick', () => px16(g => {
    g.fillStyle = '#9a4032'; g.fillRect(0, 0, 16, 16);
    const r = seeded(71);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (r() < .2) {
      g.fillStyle = ['#a34a3a', '#8e392c'][(r() * 2) | 0]; g.fillRect(x, y, 1, 1);
    }
    g.fillStyle = '#cfc6bc';
    for (let row = 0; row < 4; row++) {
      g.fillRect(0, row * 4 + 3, 16, 1);
      const off = row % 2 === 0 ? 4 : 10;
      g.fillRect(off, row * 4, 1, 4); g.fillRect((off + 8) % 16, row * 4, 1, 4);
    }
  })),
  glass: () => tex('glass', () => px16(g => {
    g.clearRect(0, 0, 16, 16);
    g.fillStyle = 'rgba(200,228,240,.28)'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = 'rgba(240,250,255,.85)';
    g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
    g.fillStyle = 'rgba(255,255,255,.5)';
    [3, 4, 9].forEach((x, i) => { for (let k = 0; k < 5; k++) g.fillRect(x + k, 10 - i * 3 - k, 1, 1); });
  })),
  glow: () => tex('glow', () => px16(g => noiseFill(g, ['#ffd978', '#ffcf5e', '#ffe49a', '#f7bf4a'], seeded(81)))),
  gold: () => tex('gold', () => px16(g => {
    noiseFill(g, ['#e8c34a', '#dcb63e', '#f2d162'], seeded(91));
    g.fillStyle = '#fff2b0';
    [[3, 3], [11, 6], [6, 12]].forEach(([x, y]) => { g.fillRect(x, y, 2, 1); g.fillRect(x, y - 1, 1, 3); });
  })),
  quartz: () => tex('quartz', () => px16(g => noiseFill(g, ['#f0ede6', '#e9e5dc', '#f6f3ec'], seeded(101)))),
  shelf: () => tex('shelf', () => px16(g => {
    // 本棚: 上下は板、中に背表紙2段
    g.fillStyle = '#a67f4b'; g.fillRect(0, 0, 16, 16);
    const spines = ['#8a3030', '#2f5a8a', '#3f7a38', '#8a6a2c', '#5a3f7a', '#b0703a'];
    const r = seeded(111);
    [2, 9].forEach(top => {
      g.fillStyle = '#3a2a18'; g.fillRect(1, top, 14, 6);
      let x = 1;
      while (x < 15) {
        const w = 1 + ((r() * 2) | 0);
        g.fillStyle = spines[(r() * spines.length) | 0];
        g.fillRect(x, top + (r() < .3 ? 1 : 0), Math.min(w, 15 - x), 6 - (r() < .3 ? 1 : 0));
        x += w;
      }
    });
  })),
  wool: (hex) => tex('wool' + hex, () => px16(g => {
    const c = new THREE.Color(hex);
    const l = c.clone().multiplyScalar(1.12), d = c.clone().multiplyScalar(.88);
    noiseFill(g, ['#' + c.getHexString(), '#' + l.getHexString(), '#' + d.getHexString()], seeded(hex & 0xffff));
  })),
  water: () => tex('water', () => px16(g => noiseFill(g, ['#2f6bd0', '#3576dc', '#2a62c4', '#3e82e6'], seeded(121)))),
  stonePath: () => tex('stonePath', () => px16(g => {
    noiseFill(g, ['#9a968e', '#908c84', '#a4a098'], seeded(131));
    g.fillStyle = 'rgba(0,0,0,.18)';
    g.fillRect(0, 0, 16, 1); g.fillRect(0, 8, 16, 1); g.fillRect(8, 0, 1, 8); g.fillRect(4, 8, 1, 8);
  })),
};

/* ---------------- ブロックレジストリ ---------------- */
const geoBox = new THREE.BoxGeometry(CELL, CELL, CELL);
const matCache = new Map();
function mat(id, opts) {
  if (!matCache.has(id)) {
    const m = new THREE.MeshLambertMaterial(opts);
    matCache.set(id, m);
  }
  return matCache.get(id);
}
function blockMats(type) {
  switch (type) {
    case 'grass': {
      const side = mat('grassSide', { map: T.grassSide() });
      return [side, side, mat('grassTop', { map: T.grassTop() }), mat('dirt', { map: T.dirt() }), side, side];
    }
    case 'shelf': {
      const side = mat('shelfSide', { map: T.shelf() });
      const cap = mat('shelfCap', { map: T.planks() });
      return [side, side, cap, cap, side, side];
    }
    case 'glass': return mat('glass', { map: T.glass(), transparent: true, side: THREE.DoubleSide });
    case 'glow': return mat('glow', { map: T.glow(), emissive: 0xffc85e, emissiveMap: T.glow(), emissiveIntensity: 1.1 });
    case 'stone': return mat('stone', { map: T.stone() });
    case 'planks': return mat('planks', { map: T.planks() });
    case 'log': return mat('log', { map: T.log() });
    case 'leaves': return mat('leaves', { map: T.leaves() });
    case 'brick': return mat('brick', { map: T.brick() });
    case 'gold': return mat('gold', { map: T.gold() });
    case 'quartz': return mat('quartz', { map: T.quartz() });
    case 'water': return mat('water', { map: T.water(), transparent: true, opacity: .82 });
    case 'stonePath': return mat('stonePath', { map: T.stonePath() });
    case 'dirt': return mat('dirt', { map: T.dirt() });
    default:
      if (type.startsWith('wool:')) {
        const hex = parseInt(type.slice(5), 16);
        return mat(type, { map: T.wool(hex) });
      }
      return mat('stone', { map: T.stone() });
  }
}
const AVG_COLOR = {
  stone: 0x8a8f94, planks: 0xb08a54, glass: 0xcfe6f2, glow: 0xffd978, log: 0x6b4d2e,
  leaves: 0x3e7a34, brick: 0x9a4032, gold: 0xe8c34a, quartz: 0xf0ede6, grass: 0x5fa04a, shelf: 0xa67f4b,
  water: 0x3576dc, stonePath: 0x968f86, dirt: 0x6e5034,
};
function avgColor(type) {
  if (type.startsWith('wool:')) return parseInt(type.slice(5), 16);
  return AVG_COLOR[type] ?? 0x999999;
}

/* ホットバー (設置できるブロック) */
export const HOTBAR = [
  { type: 'planks', n: '木の板' },
  { type: 'stone', n: '石' },
  { type: 'glass', n: 'ガラス' },
  { type: 'leaves', n: '葉' },
  { type: 'glow', n: '光源' },
  { type: 'brick', n: 'レンガ' },
  { type: 'gold', n: '金' },
  { type: 'wool:c94a55', n: '赤ウール' },
];
let hotbarIdx = 0;

/* ---------------- ワールド状態 ---------------- */
/* floor -> Map("x,y,z" -> {type}) : セッション中は編集を保持 */
const worldCache = new Map();
let world = null;          // 現在フロアの Map
let blockMeshes = new Map(); // key -> mesh
let voxGroup = null;       // ブロック群 (hallPropsGroup 配下)
let peopleList = [];       // ブロック人形
let particles = [];
let highlight = null;
let curFloor = 1;
let items = [];            // 収集アイテム
const dirtyFloors = new Set(); // プレイヤーが編集した階 (保存対象)

/* ---------------- 拠点セーブ (localStorage) ---------------- */
const SAVE_KEY = 'axiez_base_v2';
let saveTimer = null;
function markDirty(floor) {
  dirtyFloors.add(floor);
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; saveWorld(); }, 600);
}
function saveWorld() {
  try {
    const data = {};
    for (const floor of dirtyFloors) {
      const map = worldCache.get(floor);
      if (!map) continue;
      data[floor] = [...map.entries()].map(([k, v]) => k + '=' + v.type);
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { /* 保存不可でも続行 */ }
}
function loadSavedWorld() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    for (const floor in data) {
      const map = new Map();
      for (const entry of data[floor]) {
        const i = entry.indexOf('=');
        if (i < 0) continue;
        map.set(entry.slice(0, i), { type: entry.slice(i + 1) });
      }
      worldCache.set(Number(floor), map);
      dirtyFloors.add(Number(floor));
    }
  } catch (e) { /* 破損データは無視 */ }
}
function saveBaseManual() {
  for (const f of worldCache.keys()) dirtyFloors.add(f);
  saveWorld();
  ctx?.callbacks?.toast?.('拠点を保存しました 💾');
}

/* ---------------- 昼夜サイクル ---------------- */
/* dayT: 0..1 で1日。0=夜明け,0.25=朝,0.5=正午,0.75=夕方,0.9-1.0/0-0.1=夜 */
const DAY_LENGTH = 150; // 1日=150秒
let dayT = 0.28;        // 開始は朝
let nightSpawnDone = false;
function isNightPhase(tt) { return tt < 0.12 || tt > 0.82; }
export function getDayInfo() {
  const tt = dayT;
  // 明るさ係数 (夜=0.30, 昼=1.0)
  let light;
  const dawn = 0.12, day1 = 0.28, day2 = 0.72, dusk = 0.88;
  if (tt < dawn) light = 0.30;
  else if (tt < day1) light = 0.30 + (tt - dawn) / (day1 - dawn) * 0.70;
  else if (tt < day2) light = 1.0;
  else if (tt < dusk) light = 1.0 - (tt - day2) / (dusk - day2) * 0.70;
  else light = 0.30;
  const night = isNightPhase(tt);
  const hh = Math.floor(((tt * 24) + 6) % 24);
  const mm = Math.floor((((tt * 24) + 6) % 1) * 60);
  return { light, night, label: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, phase: tt };
}

const key = (x, y, z) => `${x},${y},${z}`;
const cellToWorld = (x, y, z) => new THREE.Vector3(x * CELL, y * CELL + CELL / 2, fz - CELL / 2 - z * CELL);
function worldToCell(p) {
  return {
    x: Math.round(p.x / CELL),
    y: Math.floor(p.y / CELL),
    z: Math.round((fz - CELL / 2 - p.z) / CELL),
  };
}
function inGrid(x, y, z) {
  return x >= GRID.xMin && x <= GRID.xMax && z >= GRID.zMin && z <= GRID.zMax && y >= 0 && y <= GRID.yMax;
}

/* ---------------- フロアシーン生成 (すべて自作の組み立て) ---------------- */
function setBlock(map, x, y, z, type) { if (inGrid(x, y, z)) map.set(key(x, y, z), { type }); }
function fill(map, x1, x2, y1, y2, z1, z2, type) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) setBlock(map, x, y, z, type);
}
function counterPrefab(map, x, z, accentWool) {
  fill(map, x - 1, x + 1, 0, 0, z, z, 'quartz');
  fill(map, x - 1, x + 1, 1, 1, z, z, 'glass');
  setBlock(map, x, 1, z, accentWool);
}
function tablePrefab(map, x, z, seatWool) {
  setBlock(map, x, 0, z, 'log');
  setBlock(map, x, 1, z, 'planks');
  setBlock(map, x - 1, 0, z, seatWool); setBlock(map, x + 1, 0, z, seatWool);
}
function treePrefab(map, x, z, h = 3) {
  for (let y = 0; y < h; y++) setBlock(map, x, y, z, 'log');
  fill(map, x - 1, x + 1, h - 1, h, z - 1, z + 1, 'leaves');
  setBlock(map, x, h + 1, z, 'leaves');
}
function lampPrefab(map, x, z) {
  setBlock(map, x, 0, z, 'stone'); setBlock(map, x, 1, z, 'stone'); setBlock(map, x, 2, z, 'glow');
}
function shelfWall(map, x, z, w) {
  for (let i = 0; i < w; i++) { setBlock(map, x + i, 0, z, 'shelf'); setBlock(map, x + i, 1, z, 'shelf'); }
}

/* 最上階: 部屋ではなく開けた大草原フィールド (丘・木立・花畑・池) */
function generatePlains() {
  const map = new Map();
  const G = GRID_PLAINS;
  const rand = seeded(20240808);
  // 芝生の地面を一面に
  fill(map, G.xMin, G.xMax, 0, 0, 1, G.zMax, 'grass');
  // なだらかな丘 (数か所を隆起)
  const hills = [[-16, 12, 5, 2], [14, 20, 6, 3], [-8, 34, 7, 2], [20, 38, 5, 2], [0, 40, 8, 3]];
  for (const [hx, hz, r, hh] of hills) {
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > r) continue;
      const top = Math.max(0, Math.round(hh * (1 - d / r)));
      for (let y = 1; y <= top; y++) setBlock(map, hx + dx, y, hz + dz, y === top ? 'grass' : 'dirt');
    }
  }
  // 木立
  const trees = [[-20, 8], [-12, 16], [-22, 26], [10, 10], [18, 14], [24, 28], [-6, 30], [6, 36], [-18, 40], [16, 42], [2, 22]];
  for (const [tx, tz] of trees) treePrefab(map, tx, tz, 3 + ((rand() * 3) | 0));
  // 花畑 (ウール)
  const flowers = ['c94a55', 'e8c34a', 'd07ab0', 'f0f0f0'];
  for (let i = 0; i < 40; i++) {
    const fx = Math.round((rand() - .5) * (G.xMax * 2 - 4));
    const fz2 = 2 + Math.round(rand() * (G.zMax - 4));
    setBlock(map, fx, 1, fz2, 'wool:' + flowers[(rand() * flowers.length) | 0]);
  }
  // 小さな池 (グラス=水)
  const pond = [-4, 18, 4];
  for (let dx = -pond[2]; dx <= pond[2]; dx++) for (let dz = -pond[2]; dz <= pond[2]; dz++) {
    if (Math.hypot(dx, dz) > pond[2]) continue;
    map.delete(key(pond[0] + dx, 0, pond[1] + dz));
    setBlock(map, pond[0] + dx, 0, pond[1] + dz, 'water');
  }
  // 石畳の小道 (入口からまっすぐ)
  for (let z = 1; z <= 10; z++) { setBlock(map, 0, 0, z, 'stonePath'); setBlock(map, 1, 0, z, 'stonePath'); }
  // 見晴らしの東屋 (板の小屋)
  fill(map, 22, 26, 1, 1, 4, 4, 'planks');
  [[22, 4], [26, 4], [22, 8], [26, 8]].forEach(([px, pz]) => { setBlock(map, px, 1, pz, 'log'); setBlock(map, px, 2, pz, 'log'); });
  fill(map, 22, 26, 3, 3, 4, 8, 'planks');
  return map;
}

/* 各階の特徴を活かした「開けたフィールド」テーマ (床は各階らしい素材で敷き詰め) */
const FIELD_THEME = {
  1: { ground: 'quartz',    edge: 'gold',      sky: 0xf1e9dc }, // 化粧品: 白大理石プラザ
  2: { ground: 'planks',    edge: 'wool:c98a96', sky: 0xf0dbe4 }, // 婦人服: ブティックガーデン
  3: { ground: 'stone',     edge: 'stonePath', sky: 0xc9d2dc }, // 紳士服: 石畳のモール
  4: { ground: 'grass',     edge: 'planks',    sky: 0xbfe3d6 }, // 書籍カフェ: 中庭の書架
  5: { ground: 'brick',     edge: 'stonePath', sky: 0xe6c9a0 }, // レストラン: 温かな中庭
  6: { ground: 'stonePath', edge: 'gold',      sky: 0xd8cbe6 }, // 催事: 開けた広場
  7: { ground: 'stone',     edge: 'quartz',    sky: 0x2a3350 }, // ラウンジ: 夜のテラス
};
export function fieldSky(floor) { return FIELD_THEME[floor]?.sky ?? (floor === 8 ? 0x9ccdf0 : 0x8fb4d6); }

/* 床を一面に敷き、入口から奥へ小道を通す共通ベース */
function fieldBase(map, groundType, edgeType) {
  const G = GRID_FIELD;
  fill(map, G.xMin, G.xMax, 0, 0, 1, G.zMax, groundType);
  // 外周のふち取り
  for (let x = G.xMin; x <= G.xMax; x++) { setBlock(map, x, 0, 1, edgeType); setBlock(map, x, 0, G.zMax, edgeType); }
  for (let z = 1; z <= G.zMax; z++) { setBlock(map, G.xMin, 0, z, edgeType); setBlock(map, G.xMax, 0, z, edgeType); }
  // 入口からの目抜き通り
  for (let z = 1; z <= G.zMax; z++) { setBlock(map, 0, 0, z, 'stonePath'); setBlock(map, -1, 0, z, 'stonePath'); setBlock(map, 1, 0, z, 'stonePath'); }
}

function generateFloor(floor, accentHex) {
  if (isPlains(floor)) return generatePlains();
  const map = new Map();
  const wool = 'wool:' + accentHex.toString(16).padStart(6, '0');
  const th = FIELD_THEME[floor] ?? FIELD_THEME[1];
  fieldBase(map, th.ground, th.edge);

  switch (floor) {
    case 1: // 化粧品: 白大理石プラザ + ガラスカウンター島 + 金の噴水 + 花
      [[-9, 4], [9, 4], [-9, 12], [9, 12], [-6, 20], [6, 20]].forEach(([x, z], i) => counterPrefab(map, x, z, wool));
      // 中央の金の噴水 (水+金)
      fill(map, -2, 2, 0, 0, 14, 18, 'gold');
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) setBlock(map, dx, 0, 16 + dz, 'water');
      setBlock(map, 0, 1, 16, 'water'); setBlock(map, 0, 2, 16, 'glass');
      [[-12, 8], [12, 8], [-12, 22], [12, 22]].forEach(([x, z]) => lampPrefab(map, x, z));
      ['d07ab0', 'f0f0f0', 'e8c34a'].forEach((c, i) => { setBlock(map, -4 + i * 4, 1, 6, 'wool:' + c); setBlock(map, -4 + i * 4, 1, 24, 'wool:' + c); });
      break;
    case 2: // 婦人服: 彩り豊かなブティックの並木ガーデン
      ['c98a96', 'e0d0b8', '8a6e78', 'c94a55', 'd07ab0'].forEach((c, i) => {
        const z = 4 + i * 4;
        fill(map, -11, -8, 0, 1, z, z + 1, 'wool:' + c);
        fill(map, 8, 11, 0, 1, z, z + 1, 'wool:' + c);
      });
      [[-5, 8], [5, 12], [-5, 18], [5, 22]].forEach(([x, z]) => treePrefab(map, x, z, 3));
      counterPrefab(map, 0, 26, wool);
      [[-13, 6], [13, 6], [-13, 24], [13, 24]].forEach(([x, z]) => lampPrefab(map, x, z));
      break;
    case 3: // 紳士服: 石畳のモール + 落ち着いたショーケース列
      for (let i = 0; i < 5; i++) {
        const z = 4 + i * 5;
        fill(map, -10, -8, 0, 1, z, z, 'stone'); fill(map, -10, -8, 2, 2, z, z, wool);
        fill(map, 8, 10, 0, 1, z, z, 'stone'); fill(map, 8, 10, 2, 2, z, z, wool);
      }
      shelfWall(map, -3, 26, 7);
      [[-6, 10], [6, 10], [-6, 20], [6, 20]].forEach(([x, z]) => lampPrefab(map, x, z));
      break;
    case 4: // 書籍カフェ: 芝の中庭に書架の回廊 + カフェテーブル + 木
      shelfWall(map, -11, 5, 7); shelfWall(map, 5, 5, 7);
      shelfWall(map, -11, 11, 7); shelfWall(map, 5, 11, 7);
      shelfWall(map, -11, 17, 7); shelfWall(map, 5, 17, 7);
      [[-6, 22], [0, 24], [6, 22], [-4, 8], [4, 8]].forEach(([x, z]) => tablePrefab(map, x, z, wool));
      [[-13, 14], [13, 14], [0, 27]].forEach(([x, z]) => treePrefab(map, x, z, 4));
      [[-8, 14], [8, 14]].forEach(([x, z]) => lampPrefab(map, x, z));
      break;
    case 5: // レストラン: レンガの中庭にテーブル席 + かまど(厨房) + 提灯
      [[-8, 5], [8, 5], [-8, 11], [8, 11], [-8, 17], [8, 17], [-4, 23], [4, 23]].forEach(([x, z]) => tablePrefab(map, x, z, wool));
      // レンガ厨房
      fill(map, -4, 4, 0, 2, 26, 27, 'brick');
      fill(map, -3, 3, 1, 1, 26, 26, 'glow');
      [[-12, 10], [12, 10], [-12, 20], [12, 20]].forEach(([x, z]) => lampPrefab(map, x, z));
      break;
    case 6: // 催事: 開けた広場に中央ステージ + 万国旗のポール
      fill(map, -6, 6, 1, 1, 12, 18, wool);
      fill(map, -6, 6, 2, 2, 13, 17, 'gold');
      ['c83c3c', 'e8c34a', '3c78c8', '3f9e4a', 'd07ab0'].forEach((c, i) => {
        const x = -12 + i * 6;
        fill(map, x, x, 1, 5, 6, 6, 'wool:' + c);
        fill(map, x, x, 1, 5, 24, 24, 'wool:' + c);
      });
      [[-10, 14], [10, 14], [0, 22]].forEach(([x, z]) => lampPrefab(map, x, z));
      break;
    case 7: // ラウンジ: 夜のテラス — 暗色の石 + 多数の光源 + ガラスのバー
      for (let i = 0; i < 8; i++) { const z = 3 + i * 3; lampPrefab(map, i % 2 ? -12 : 12, z); }
      fill(map, -6, 6, 0, 1, 24, 24, 'planks'); fill(map, -6, 6, 2, 2, 24, 24, 'glass');
      [[-5, 8], [5, 8], [-5, 16], [5, 16], [0, 12]].forEach(([x, z]) => { tablePrefab(map, x, z, wool); setBlock(map, x, 2, z, 'glow'); });
      [[0, 20]].forEach(([x, z]) => { setBlock(map, x, 0, z, 'gold'); setBlock(map, x, 1, z, 'glow'); });
      break;
  }
  return map;
}

/* ---------------- メッシュ構築 ---------------- */
function addBlockMesh(x, y, z, type) {
  const m = new THREE.Mesh(geoBox, blockMats(type));
  m.position.copy(cellToWorld(x, y, z));
  m.userData = { vox: true, shared: true, cell: { x, y, z }, type };
  voxGroup.add(m);
  blockMeshes.set(key(x, y, z), m);
  return m;
}

export function buildFloorVoxels(floor, parentGroup, doorZ, theme) {
  fz = doorZ;
  curFloor = floor;
  GRID = isPlains(floor) ? GRID_PLAINS : GRID_FIELD;
  voxGroup = parentGroup;
  blockMeshes = new Map();
  peopleList.forEach(p => p.group.parent?.remove(p.group));
  peopleList = [];
  clearItems();
  nightSpawnDone = false;

  if (!worldCache.has(floor)) worldCache.set(floor, generateFloor(floor, theme?.accent ?? 0x8888aa));
  world = worldCache.get(floor);
  for (const [k, v] of world) {
    const [x, y, z] = k.split(',').map(Number);
    addBlockMesh(x, y, z, v.type);
  }

  spawnFloorMobs(floor, theme?.accent ?? 0x8888aa);

  // ハイライト枠
  if (!highlight) {
    highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(CELL * 1.02, CELL * 1.02, CELL * 1.02)),
      new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: .8 })
    );
    highlight.userData.shared = true;
  }
  highlight.visible = false;
  voxGroup.add(highlight);
}

/* ---------------- ブロック人形 (オリジナルのボクセル人形) ---------------- */
function voxPartMat(hex) { return new THREE.MeshLambertMaterial({ color: hex }); }

/* 頭ブロック (顔テクスチャは -Z 面 = 正面)。顔は不透明の肌色ベースなので透過しない。 */
function makeHead(size, skinHex, hairHex, faceIdx) {
  const skinMat = voxPartMat(skinHex);
  const face = new THREE.MeshLambertMaterial({ map: faceTexV(skinHex, faceIdx) });
  return new THREE.Mesh(new THREE.BoxGeometry(size, size, size),
    [skinMat, skinMat, voxPartMat(hairHex), skinMat, skinMat, face]);
}

/* ====================================================================
   モブ (キャラクター) — 中立の買い物客 + 複数種の敵モブ
==================================================================== */
/* 敵種の定義。hostile:プレイヤーを襲う / behavior:挙動 */
const MOB_KINDS = {
  shopper:  { hostile: false, hp: 4,  speed: .55, dmg: 2, aggroR: 7,  atkR: 1.2, behavior: 'walk',  build: 'humanoid', name: '買い物客' },
  zombie:   { hostile: true,  hp: 8,  speed: 1.15,dmg: 3, aggroR: 20, atkR: 1.4, behavior: 'chase', build: 'humanoid', name: 'ゾンビ',    skin: 0x6a9b53, hair: 0x33452a, top: 0x37506a, bot: 0x35452f, armOut: true },
  skeleton: { hostile: true,  hp: 6,  speed: 1.35,dmg: 2, aggroR: 22, atkR: 1.4, behavior: 'chase', build: 'humanoid', name: 'スケルトン', skin: 0xe8e8e0, hair: 0xcfcfc4, top: 0xcbcbc0, bot: 0xb8b8ad, armOut: true, bony: true },
  slime:    { hostile: true,  hp: 4,  speed: 1.7, dmg: 2, aggroR: 18, atkR: 1.2, behavior: 'hop',   build: 'slime',    name: 'スライム' },
  creeper:  { hostile: true,  hp: 6,  speed: 1.3, dmg: 9, aggroR: 22, atkR: 1.9, behavior: 'creep', build: 'creeper',  name: 'クリーパー' },
};

/* 汎用ヒューマノイド (中立客・ゾンビ・スケルトン) */
function buildHumanoid(spec, rand) {
  const g = new THREE.Group();
  const skinHex = spec.skin ?? P_SKIN[(rand() * P_SKIN.length) | 0];
  const hairHex = spec.hair ?? P_HAIR[(rand() * P_HAIR.length) | 0];
  const topHex = spec.top ?? (rand() > .4 ? spec.accent : P_TOP[(rand() * P_TOP.length) | 0]) ?? P_TOP[(rand() * P_TOP.length) | 0];
  const botHex = spec.bot ?? P_BOT[(rand() * P_BOT.length) | 0];
  const parts = [];
  const add = (w, h, d, x, y, z, hex) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), voxPartMat(hex));
    m.position.set(x, y, z); g.add(m); parts.push(m); return m;
  };
  const legW = spec.bony ? .09 : .14;
  add(legW, .38, .14, -.08, .19, 0, botHex);
  add(legW, .38, .14, .08, .19, 0, botHex);
  add(.34, .42, spec.bony ? .16 : .2, 0, .59, 0, topHex);
  const armW = spec.bony ? .07 : .1;
  const armL = add(armW, .38, armW, -.235, .60, 0, topHex);
  const armR = add(armW, .38, armW, .235, .60, 0, topHex);
  if (spec.armOut) { armL.geometry.translate(0, .17, 0); armL.position.y = .60 - .17; armL.rotation.x = -1.4;
                     armR.geometry.translate(0, .17, 0); armR.position.y = .60 - .17; armR.rotation.x = -1.4; }
  const head = makeHead(.3, skinHex, hairHex, (rand() * FACE_VARIANTS) | 0);
  head.position.set(0, .97, 0); g.add(head); parts.push(head);
  const hairBand = add(.32, .1, .32, 0, 1.08, 0, hairHex);
  return { group: g, parts, armL, armR };
}
/* スライム (半透明の緑キューブ + 目) */
function buildSlime(rand) {
  const g = new THREE.Group();
  const parts = [];
  const body = new THREE.Mesh(new THREE.BoxGeometry(.6, .6, .6),
    new THREE.MeshLambertMaterial({ color: 0x67c246, transparent: true, opacity: .82 }));
  body.position.y = .32; g.add(body); parts.push(body);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(.32, .32, .32), new THREE.MeshLambertMaterial({ color: 0x4c9c34 }));
  inner.position.y = .3; g.add(inner); parts.push(inner);
  [-1, 1].forEach(s => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(.08, .08, .02), new THREE.MeshLambertMaterial({ color: 0x20301c }));
    eye.position.set(s * .13, .42, -.31); g.add(eye); parts.push(eye);
  });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(.16, .05, .02), new THREE.MeshLambertMaterial({ color: 0x20301c }));
  mouth.position.set(0, .28, -.31); g.add(mouth); parts.push(mouth);
  return { group: g, parts, armL: null, armR: null };
}
/* クリーパー (縦長の緑 + 4本脚 + ドット顔) */
function buildCreeper() {
  const g = new THREE.Group();
  const parts = [];
  const skin = () => new THREE.MeshLambertMaterial({ color: 0x54a63a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(.34, .72, .34), skin());
  body.position.y = .74; g.add(body); parts.push(body);
  [[-.11, -.13], [.11, -.13], [-.11, .13], [.11, .13]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.14, .24, .14), skin());
    leg.position.set(x, .12, z); g.add(leg); parts.push(leg);
  });
  // 顔 (クリーパー特有の模様)
  const faceTex2 = px16(g2 => {
    g2.fillStyle = '#54a63a'; g2.fillRect(0, 0, 16, 16);
    g2.fillStyle = '#14200e';
    g2.fillRect(3, 4, 4, 4); g2.fillRect(9, 4, 4, 4);      // 目
    g2.fillRect(6, 8, 4, 5); g2.fillRect(5, 10, 2, 3); g2.fillRect(9, 10, 2, 3); // 口
  });
  const faceMat = new THREE.MeshLambertMaterial({ map: faceTex2 });
  const gm = new THREE.MeshLambertMaterial({ color: 0x54a63a });
  const head = new THREE.Mesh(new THREE.BoxGeometry(.42, .42, .42), [gm, gm, gm, gm, gm, faceMat]);
  head.position.y = 1.31; g.add(head); parts.push(head);
  return { group: g, parts, armL: null, armR: null };
}

function makeMob(kind, rand) {
  const spec = MOB_KINDS[kind];
  let built;
  if (spec.build === 'slime') built = buildSlime(rand);
  else if (spec.build === 'creeper') built = buildCreeper();
  else built = buildHumanoid(spec, rand);
  built.group.userData.mob = true;
  return {
    ...built, kind, spec,
    hp: spec.hp, maxHp: spec.hp,
    speed: spec.speed * (0.9 + rand() * 0.25),
    hostile: spec.hostile, aggro: spec.hostile, angry: 0,
    phase: rand() * 6, target: null, wait: rand() * 2,
    atkCd: 0, vy: 0, hopCd: rand(), fuse: -1,
  };
}

/* フロアごとのモブ配置 */
function spawnFloorMobs(floor, accent) {
  const rand = seeded(floor * 977 + 5);
  const plains = isPlains(floor);
  const list = [];
  if (plains) {
    // 大草原: 敵モブ多数 + 数人の客
    const kinds = ['zombie', 'skeleton', 'slime', 'creeper', 'zombie', 'skeleton', 'slime'];
    kinds.forEach(k => list.push(k));
    list.push('shopper', 'shopper');
  } else {
    list.push('shopper', 'shopper');
    const pool = ['zombie', 'skeleton', 'slime'];
    list.push(pool[(rand() * pool.length) | 0]);
    if (rand() > .5) list.push(pool[(rand() * pool.length) | 0]);
  }
  const xr = GRID.xMax - 2;
  // 敵は入口付近から徐々に奥へ配置 (静止していても交戦できるよう手前にも)
  const zNear = plains ? [3, 5, 7, 9, 12, 15, 20, 26, 3, 6] : [3, 5, 7, 9, 6];
  list.forEach((kind, i) => {
    if (MOB_KINDS[kind].build === 'humanoid' && kind === 'shopper') MOB_KINDS[kind].accent = accent;
    const mob = makeMob(kind, rand);
    // 草原でも入口前の中央付近に集めて交戦しやすく (X広がりを抑える)
    const xspread = plains ? 12 : xr * 2;
    const cx = Math.round((rand() - .5) * xspread);
    const cz = zNear[i % zNear.length] + Math.round((rand() - .5) * 3);
    mob.group.position.copy(cellToWorld(cx, 0, Math.max(2, cz)));
    mob.group.position.y = 0;
    voxGroup.add(mob.group);
    peopleList.push(mob);
  });
}

/* 夜になると敵モブが増える (プレイヤー周辺の暗がりに湧く) */
function spawnNightMobs() {
  if (!voxGroup || !fp) return;
  const pool = ['zombie', 'skeleton', 'zombie', 'slime', 'creeper'];
  const n = isPlains(curFloor) ? 6 : 4;
  const rand = Math.random;
  ctx?.callbacks?.toast?.('🌙 夜だ ─ 敵が増えてくる…');
  for (let i = 0; i < n; i++) {
    const mob = makeMob(pool[(rand() * pool.length) | 0], rand);
    // プレイヤーの周囲リング状に配置
    const ang = rand() * Math.PI * 2;
    const dist = 5 + rand() * 6;
    const wx = player.pos.x + Math.cos(ang) * dist;
    const wz = player.pos.z + Math.sin(ang) * dist;
    const xLim = GRID.xMax * CELL - .5, zFar = fz - GRID.zMax * CELL, zNear = fz - CELL;
    mob.group.position.set(
      Math.max(-xLim, Math.min(xLim, wx)), 0,
      Math.max(zFar, Math.min(zNear, wz)));
    mob.aggro = true;
    voxGroup.add(mob.group);
    peopleList.push(mob);
  }
}

/* 顔(-Z)を進行方向/対象へ向ける */
function faceDir(group, dx, dz) {
  if (dx * dx + dz * dz < 1e-6) return;
  group.rotation.y = Math.atan2(-dx, -dz);
}

/* モブの更新 (徘徊・追跡・攻撃・跳ね・爆発) */
function updateMobs(dt, t) {
  const pp = player.pos;
  for (let i = peopleList.length - 1; i >= 0; i--) {
    const m = peopleList[i];
    if (m.atkCd > 0) m.atkCd -= dt;
    if (m.angry > 0) m.angry -= dt;
    const pos = m.group.position;
    const active = fp && !player.dead; // プレイヤーが居るときだけ戦闘AI
    const dxp = pp.x - pos.x, dzp = pp.z - pos.z;
    const distP = Math.hypot(dxp, dzp);
    const hostileNow = active && (m.hostile || m.angry > 0);

    // クリーパー: 接近で導火線
    if (m.kind === 'creeper' && hostileNow) {
      if (distP < 2.2 && m.fuse < 0) m.fuse = 1.4;
      if (m.fuse >= 0) {
        m.fuse -= dt;
        const fl = (Math.sin(t * 22) > 0) ? 1 : 0; // 点滅
        m.parts.forEach(part => { const mm = part.material; if (mm.emissive) { mm.emissive.setHex(fl ? 0xffffff : 0x000000); } else if (!Array.isArray(mm)) { part.material.emissive = new THREE.Color(fl ? 0x884400 : 0x000000); } });
        if (m.fuse <= 0) { creeperExplode(m); peopleList.splice(i, 1); continue; }
      }
    }

    if (hostileNow && distP < m.spec.aggroR) {
      // 追跡
      faceDir(m.group, dxp, dzp);
      if (distP > m.spec.atkR) {
        const spd = m.speed * dt;
        const nx = (dxp / distP) * spd, nz = (dzp / distP) * spd;
        pos.x = Math.max(GRID.xMin * CELL, Math.min(GRID.xMax * CELL, pos.x + nx));
        pos.z = Math.max(fz - GRID.zMax * CELL, Math.min(fz - CELL, pos.z + nz));
      } else if (m.atkCd <= 0 && m.kind !== 'creeper') {
        // 近接攻撃
        damagePlayer(m.spec.dmg, pos, m.spec.name);
        m.atkCd = 1.0;
        if (m.armL) { gsap.fromTo(m.armL.rotation, { x: -1.9 }, { x: m.spec.armOut ? -1.4 : 0, duration: .3 }); }
      }
    } else {
      // 徘徊
      if (m.wait > 0) { m.wait -= dt; }
      else {
        if (!m.target) {
          m.target = cellToWorld(
            Math.round((Math.random() - .5) * (GRID.xMax * 2 - 2)), 0,
            2 + Math.round(Math.random() * (GRID.zMax - 3)));
          m.target.y = 0;
        }
        const dx = m.target.x - pos.x, dz = m.target.z - pos.z;
        const d = Math.hypot(dx, dz);
        if (d < .12) { m.target = null; m.wait = 1 + Math.random() * 3; }
        else { const spd = m.speed * .6 * dt; pos.x += (dx / d) * spd; pos.z += (dz / d) * spd; faceDir(m.group, dx, dz); }
      }
    }

    // 接地 + 挙動アニメ
    const gh = groundHeightAt(pos.x, pos.z);
    if (m.spec.behavior === 'hop') {
      m.vy -= 16 * dt;
      pos.y += m.vy * dt;
      if (pos.y <= gh) {
        pos.y = gh; m.vy = 0;
        m.hopCd -= dt;
        if (m.hopCd <= 0 && (hostileNow || Math.random() < .01)) { m.vy = 4.4; m.hopCd = .5 + Math.random(); }
      }
      m.group.scale.y = 1 + Math.min(.25, Math.max(-.15, m.vy * .04));
    } else {
      pos.y = gh;
      if (m.armL && !m.spec.armOut) {
        const moving = hostileNow || m.target;
        const sw = moving ? Math.sin(t * 8 + m.phase) * .6 : 0;
        m.armL.rotation.x = sw; m.armR.rotation.x = -sw;
        pos.y = gh + (moving ? Math.abs(Math.sin(t * 8 + m.phase)) * .02 : 0);
      }
    }
  }
}

/* プレイヤーが攻撃 (反撃を誘発) */
function hitMob(m) {
  m.hp -= 3;
  navigator.vibrate?.(20);
  m.parts.forEach(part => {
    const mats = Array.isArray(part.material) ? part.material : [part.material];
    mats.forEach(mm => { if (mm.emissive !== undefined) { mm.emissive = new THREE.Color(0xff3333); gsap.fromTo(mm, { emissiveIntensity: .9 }, { emissiveIntensity: 0, duration: .35, onComplete: () => mm.emissive?.setHex(0x000000) }); } });
  });
  popSound(1.4);
  if (m.hp <= 0) {
    spawnParticles(m.group.position.clone().add(new THREE.Vector3(0, .5, 0)), m.kind === 'shopper' ? 0xd9a97e : 0x6a9b53, 14);
    dropMobLoot(m);
    voxGroup.remove(m.group);
    m.parts.forEach(part => { part.geometry.dispose(); (Array.isArray(part.material) ? part.material : [part.material]).forEach(mm => mm.dispose?.()); });
    peopleList = peopleList.filter(q => q !== m);
    ctx.callbacks.toast(`${m.spec.name}をたおした！`);
  } else {
    // 反撃: 中立客は怒って敵対化。全モブ即時にプレイヤーへ反応
    if (!m.hostile) { m.angry = 8; ctx.callbacks.toast(`${m.spec.name}を怒らせた！反撃してくる`); }
    m.aggro = true;
    const dir = m.group.position.clone().sub(ctx.camera.position).setY(0).normalize().multiplyScalar(.4);
    gsap.to(m.group.position, { x: m.group.position.x + dir.x, z: m.group.position.z + dir.z, duration: .16 });
  }
}

/* モブのドロップ */
const MOB_LOOT = { shopper: 'coin', zombie: 'coin', skeleton: 'bone', slime: 'gem', creeper: 'gem' };
function dropMobLoot(m) {
  const base = m.group.position.clone();
  const kind = MOB_LOOT[m.kind] || 'coin';
  const n = 1 + ((Math.random() * (m.spec.hostile ? 2 : 1)) | 0);
  for (let i = 0; i < n; i++) {
    const p = base.clone().add(new THREE.Vector3((Math.random() - .5) * .5, .4, (Math.random() - .5) * .5));
    dropItem(p, kind);
  }
}

/* クリーパー爆発 */
function creeperExplode(m) {
  const c = m.group.position.clone();
  boomSound();
  spawnParticles(c.clone().add(new THREE.Vector3(0, .5, 0)), 0x54a63a, 22);
  spawnParticles(c.clone().add(new THREE.Vector3(0, .5, 0)), 0x2a2a2a, 12);
  // ブロック破壊 (半径内)
  const cc = worldToCell(c);
  const R = 3;
  for (let dx = -R; dx <= R; dx++) for (let dy = 0; dy <= R; dy++) for (let dz = -R; dz <= R; dz++) {
    if (dx * dx + dy * dy + dz * dz > R * R) continue;
    const mesh = blockMeshes.get(key(cc.x + dx, dy, cc.z - dz));
    if (mesh) { world.delete(key(cc.x + dx, dy, cc.z - dz)); blockMeshes.delete(key(cc.x + dx, dy, cc.z - dz)); voxGroup.remove(mesh); }
  }
  markDirty(curFloor);
  dropItem(c.clone(), 'gem');
  // プレイヤーへ範囲ダメージ
  const dp = ctx.camera.position.distanceTo(c);
  if (dp < 3.4) damagePlayer(Math.round(m.spec.dmg * (1 - dp / 3.4)) + 2, c, m.spec.name);
  voxGroup.remove(m.group);
  m.parts.forEach(part => { part.geometry.dispose(); (Array.isArray(part.material) ? part.material : [part.material]).forEach(mm => mm.dispose?.()); });
}

/* ====================================================================
   プレイヤー HP / 被弾 / ゲームオーバー
==================================================================== */
function heartSVG(state) {
  // state: 'full' | 'half' | 'empty'
  const fill = state === 'empty' ? '#3a1518' : '#e02736';
  const half = state === 'half';
  const path = 'M11 19 C4 13 1 9 1 6 C1 3 3 1 5.5 1 C7.5 1 10 2.5 11 4.5 C12 2.5 14.5 1 16.5 1 C19 1 21 3 21 6 C21 9 18 13 11 19 Z';
  const halfClip = half ? '<clipPath id="hc"><rect x="0" y="0" width="11" height="22"/></clipPath>' : '';
  const emptyRight = half ? `<path d="${path}" fill="#3a1518"/>` : '';
  const fillPath = half
    ? `${emptyRight}<path d="${path}" fill="${fill}" clip-path="url(#hc)"/>`
    : `<path d="${path}" fill="${fill}"/>`;
  return `<svg viewBox="0 0 22 20">${halfClip}${fillPath}<path d="${path}" fill="none" stroke="#1a0a0c" stroke-width="1.4"/></svg>`;
}
function updateHearts() {
  const bar = document.getElementById('hpBar');
  const total = player.maxHp / 2;
  let html = '';
  for (let i = 0; i < total; i++) {
    const v = player.hp - i * 2;
    const state = v >= 2 ? 'full' : v === 1 ? 'half' : 'empty';
    html += `<div class="heart">${heartSVG(state)}</div>`;
  }
  bar.innerHTML = html;
}
function damagePlayer(amount, sourcePos, name) {
  if (!fp || player.dead || player.invuln > 0) return;
  player.hp = Math.max(0, player.hp - amount);
  player.invuln = .6;
  updateHearts();
  // 被弾フラッシュ
  const f = document.getElementById('dmgFlash');
  gsap.killTweensOf(f);
  gsap.fromTo(f, { opacity: .85 }, { opacity: 0, duration: .5 });
  navigator.vibrate?.(60);
  hurtSound();
  // ノックバック
  if (sourcePos) {
    const kb = player.pos.clone().sub(sourcePos).setY(0).normalize().multiplyScalar(.6);
    player.pos.x += kb.x; player.pos.z += kb.z; player.vel.y = 3.2;
  }
  const tip = document.getElementById('mobTip');
  tip.style.display = 'block'; tip.textContent = `${name ?? ''} の攻撃！`;
  gsap.killTweensOf(tip); gsap.fromTo(tip, { opacity: 1 }, { opacity: 0, delay: .8, duration: .5, onComplete: () => tip.style.display = 'none' });
  if (player.hp <= 0) gameOver();
}
function gameOver() {
  player.dead = true;
  if (document.pointerLockElement) document.exitPointerLock?.();
  document.getElementById('gameOver').style.display = 'flex';
  document.getElementById('crosshair').style.display = 'none';
  hurtSound(); setTimeout(boomSound, 120);
}
function respawnPlayer() {
  player.hp = player.maxHp; player.dead = false; player.invuln = 1.2;
  updateHearts();
  document.getElementById('gameOver').style.display = 'none';
  // かごへ戻す (やり直し)
  exitFPMode();
  ctx.callbacks.onRespawn();
}
export function isDead() { return player.dead; }

/* ─────────── かご内用ブロック人形 (静止・実寸プロポーション) ─────────── */
/* Minecraft風の直方体体型。~1.7m。かご内で近くから見るので少しディテールを足す */
export function makeBlockPerson(rand) {
  const g = new THREE.Group();
  const scale = 0.92 + rand() * 0.16;
  const skinHex = P_SKIN[(rand() * P_SKIN.length) | 0];
  const hairHex = P_HAIR[(rand() * P_HAIR.length) | 0];
  const top = voxPartMat(P_TOP[(rand() * P_TOP.length) | 0]);
  const bottom = voxPartMat(P_BOT[(rand() * P_BOT.length) | 0]);
  const skin = voxPartMat(skinHex);
  const hair = voxPartMat(hairHex);
  const shoe = voxPartMat(0x26231f);

  const box = (w, h, d, x, y, z, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); g.add(m); return m;
  };
  // 靴
  box(.13, .07, .19, -.078, .035, .02, shoe);
  box(.13, .07, .19, .078, .035, .02, shoe);
  // 脚
  box(.12, .68, .13, -.078, .41, 0, bottom);
  box(.12, .68, .13, .078, .41, 0, bottom);
  // 胴
  box(.36, .5, .18, 0, 1.0, 0, top);
  // 腕 (袖) + 手 (肌)
  const armDrop = (rand() - .5) * .12;
  [-1, 1].forEach(s => {
    box(.11, .42, .12, s * .235, 1.03 + armDrop * s, 0, top);
    box(.11, .1, .12, s * .235, .78 + armDrop * s, 0, skin);
  });
  // 首
  box(.11, .06, .11, 0, 1.28, 0, skin);
  // 頭
  const head = makeHead(.28, skinHex, hairHex, (rand() * FACE_VARIANTS) | 0);
  head.position.set(0, 1.45, 0); g.add(head);
  // 髪 (頭頂・後ろ・前髪)
  box(.3, .09, .3, 0, 1.605, 0, hair);
  box(.3, .24, .07, 0, 1.47, .11, hair);           // 後ろ髪 (+Z)
  if (rand() > .45) box(.3, .05, .04, 0, 1.55, -.145, hair); // 前髪 (-Z 上部)
  // 一部の人はロングヘア
  if (rand() > .6) box(.28, .18, .05, 0, 1.28, .12, hair);

  g.scale.setScalar(scale);
  g.userData.blockPerson = true;
  return g;
}

/* かご内用ブロック車いす */
export function makeBlockWheelchair(rand) {
  const g = new THREE.Group();
  const frame = voxPartMat(0x3a3f45);
  const tyre = voxPartMat(0x1a1c1f);
  const skinHex = P_SKIN[(rand() * P_SKIN.length) | 0];
  const hairHex = P_HAIR[(rand() * P_HAIR.length) | 0];
  const top = voxPartMat(P_TOP[(rand() * P_TOP.length) | 0]);
  const bottom = voxPartMat(P_BOT[(rand() * P_BOT.length) | 0]);
  const skin = voxPartMat(skinHex);
  const hair = voxPartMat(hairHex);
  const box = (w, h, d, x, y, z, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); g.add(m); return m;
  };
  // 車いす
  box(.46, .08, .44, 0, .5, .04, frame);           // 座面
  box(.46, .46, .08, 0, .74, .24, frame);          // 背もたれ
  box(.06, .5, .06, -.2, .25, -.16, frame); box(.06, .5, .06, .2, .25, -.16, frame); // 前脚
  [-1, 1].forEach(s => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .05, 10), tyre);
    wheel.rotation.z = Math.PI / 2; wheel.position.set(s * .27, .3, .06); g.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .07, 8), frame);
    hub.rotation.z = Math.PI / 2; hub.position.set(s * .27, .3, .06); g.add(hub);
    const caster = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .05, 8), tyre);
    caster.rotation.z = Math.PI / 2; caster.position.set(s * .2, .08, -.2); g.add(caster);
  });
  // 着座した人物
  box(.34, .4, .18, 0, .92, .04, top);             // 胴
  box(.11, .34, .12, -.235, .95, .04, top); box(.11, .34, .12, .235, .95, .04, top); // 腕
  box(.13, .13, .34, -.09, .6, -.12, bottom); box(.13, .13, .34, .09, .6, -.12, bottom); // 太もも
  box(.12, .34, .12, -.09, .42, -.28, bottom); box(.12, .34, .12, .09, .42, -.28, bottom); // すね
  box(.11, .06, .11, 0, 1.18, .04, skin);          // 首
  const head = makeHead(.28, skinHex, hairHex, (rand() * FACE_VARIANTS) | 0);
  head.position.set(0, 1.35, .04); g.add(head);
  box(.3, .09, .3, 0, 1.5, .04, hair);
  box(.3, .24, .07, 0, 1.37, .15, hair);
  g.userData.blockPerson = true;
  return g;
}
/* ---------------- 破壊・設置 ---------------- */
function spawnParticles(center, colorHex, count = 10) {
  const geo = new THREE.BoxGeometry(.07, .07, .07);
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colorHex }));
    m.userData.shared = false;
    m.position.copy(center).add(new THREE.Vector3((Math.random() - .5) * .3, (Math.random() - .5) * .3, (Math.random() - .5) * .3));
    ctx.scene.add(m);
    particles.push({
      mesh: m,
      vel: new THREE.Vector3((Math.random() - .5) * 2.4, 1.6 + Math.random() * 2, (Math.random() - .5) * 2.4),
      life: .65,
    });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vel.y -= 9.8 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += dt * 8; p.mesh.rotation.y += dt * 6;
    const s = Math.max(.05, p.life / .65);
    p.mesh.scale.setScalar(s);
    if (p.life <= 0 || p.mesh.position.y < .03) {
      ctx.scene.remove(p.mesh);
      p.mesh.material.dispose();
      particles.splice(i, 1);
    }
  }
}
/* ---------------- アイテム収集 ---------------- */
const ITEM_DEF = {
  coin:  { color: 0xf2d162, emissive: 0xa8801a, n: 'コイン', size: [.18, .18, .05] },
  apple: { color: 0xd8342c, emissive: 0x5a120e, n: 'りんご', size: [.16, .16, .16] },
  gem:   { color: 0x35d0c0, emissive: 0x0e6a60, n: 'ジェム', size: [.14, .2, .14] },
  bone:  { color: 0xe8e8dc, emissive: 0x777066, n: 'ほね',   size: [.08, .22, .08] },
};
const inventory = { coin: 0, apple: 0, gem: 0, bone: 0 };
export function getInventory() { return inventory; }
const itemGeoCache = new Map();
function itemGeo(kind) {
  if (!itemGeoCache.has(kind)) itemGeoCache.set(kind, new THREE.BoxGeometry(...ITEM_DEF[kind].size));
  return itemGeoCache.get(kind);
}
function dropItem(pos, kind) {
  const def = ITEM_DEF[kind]; if (!def) return;
  const m = new THREE.Mesh(itemGeo(kind),
    new THREE.MeshLambertMaterial({ color: def.color, emissive: def.emissive, emissiveIntensity: .5 }));
  m.userData.shared = false;
  m.position.copy(pos); m.position.y = Math.max(.4, pos.y + .4);
  ctx.scene.add(m);
  items.push({ mesh: m, kind, baseY: m.position.y, spin: Math.random() * 6, life: 30 });
}
function updateItems(dt, t) {
  const cam = ctx.camera.position;
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.life -= dt;
    it.mesh.rotation.y = t * 2 + it.spin;
    it.mesh.position.y = it.baseY + Math.sin(t * 3 + it.spin) * .08;
    // プレイヤーへ吸引 → 収集
    if (fp && !player.dead) {
      const d = it.mesh.position.distanceTo(cam);
      if (d < 2.0) {
        const dir = cam.clone().sub(it.mesh.position);
        it.mesh.position.addScaledVector(dir.normalize(), Math.min(d, 6 * dt));
        it.baseY = it.mesh.position.y;
      }
      if (d < .7) { collectItem(it.kind); disposeItem(i); continue; }
    }
    if (it.life <= 0) disposeItem(i);
  }
}
function disposeItem(i) {
  const it = items[i];
  ctx.scene.remove(it.mesh); it.mesh.material.dispose();
  items.splice(i, 1);
}
function clearItems() {
  for (let i = items.length - 1; i >= 0; i--) disposeItem(i);
}
function collectItem(kind) {
  inventory[kind] = (inventory[kind] || 0) + 1;
  updateInventoryUI();
  collectSound();
  const el = document.getElementById('invPop');
  if (el) {
    el.textContent = `+1 ${ITEM_DEF[kind].n}`;
    el.style.display = 'block';
    gsap.killTweensOf(el);
    gsap.fromTo(el, { opacity: 1, y: 0 }, { opacity: 0, y: -14, duration: .9, onComplete: () => el.style.display = 'none' });
  }
}
function updateInventoryUI() {
  const bar = document.getElementById('invBar');
  if (!bar) return;
  const order = ['coin', 'apple', 'gem', 'bone'];
  bar.innerHTML = order.map(k => {
    const d = ITEM_DEF[k];
    const c = '#' + new THREE.Color(d.color).getHexString();
    return `<div class="inv-item"><span class="inv-ic" style="background:${c}"></span>${inventory[k] || 0}</div>`;
  }).join('');
}
function collectSound() {
  const a = ctx.callbacks.audio();
  const t = a.currentTime;
  [880, 1320].forEach((f, k) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, t + k * .06);
    g.gain.setValueAtTime(.0001, t + k * .06); g.gain.exponentialRampToValueAtTime(.14, t + k * .06 + .01);
    g.gain.exponentialRampToValueAtTime(.0001, t + k * .06 + .12);
    o.connect(g).connect(a.destination); o.start(t + k * .06); o.stop(t + k * .06 + .14);
  });
}

function popSound(pitch = 1) {
  const a = ctx.callbacks.audio();
  const t = a.currentTime;
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(520 * pitch, t);
  o.frequency.exponentialRampToValueAtTime(160 * pitch, t + .12);
  g.gain.setValueAtTime(.18, t); g.gain.exponentialRampToValueAtTime(.0001, t + .16);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + .18);
  // 破片ノイズ
  const len = a.sampleRate * .1;
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const ns = a.createBufferSource(); ns.buffer = buf;
  const nf = a.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 900;
  const ng = a.createGain(); ng.gain.value = .1;
  ns.connect(nf).connect(ng).connect(a.destination); ns.start(t);
}
function placeSound() {
  const a = ctx.callbacks.audio();
  const t = a.currentTime;
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(240, t);
  o.frequency.exponentialRampToValueAtTime(170, t + .07);
  g.gain.setValueAtTime(.16, t); g.gain.exponentialRampToValueAtTime(.0001, t + .1);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + .12);
}
function hurtSound() {
  const a = ctx.callbacks.audio();
  const t = a.currentTime, o = a.createOscillator(), g = a.createGain();
  o.type = 'square'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(90, t + .18);
  g.gain.setValueAtTime(.2, t); g.gain.exponentialRampToValueAtTime(.0001, t + .22);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + .24);
}
function boomSound() {
  const a = ctx.callbacks.audio();
  const t = a.currentTime;
  const len = a.sampleRate * .5;
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.6);
  const ns = a.createBufferSource(); ns.buffer = buf;
  const nf = a.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.setValueAtTime(1200, t); nf.frequency.exponentialRampToValueAtTime(120, t + .45);
  const ng = a.createGain(); ng.gain.setValueAtTime(.5, t); ng.gain.exponentialRampToValueAtTime(.0001, t + .5);
  ns.connect(nf).connect(ng).connect(a.destination); ns.start(t);
  const o = a.createOscillator(), og = a.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(35, t + .4);
  og.gain.setValueAtTime(.4, t); og.gain.exponentialRampToValueAtTime(.0001, t + .45);
  o.connect(og).connect(a.destination); o.start(t); o.stop(t + .5);
}

function breakBlockAt(mesh) {
  const { cell, type } = mesh.userData;
  world.delete(key(cell.x, cell.y, cell.z));
  blockMeshes.delete(key(cell.x, cell.y, cell.z));
  voxGroup.remove(mesh); // 共有ジオメトリ/マテリアルなので dispose しない
  spawnParticles(mesh.position, avgColor(type), 10);
  popSound(1);
  navigator.vibrate?.(12);
  // 葉 → りんご / 金鉱脈 → コイン (マイクラ風ドロップ)
  if (type === 'leaves' && Math.random() < .28) dropItem(mesh.position.clone(), 'apple');
  else if (type === 'gold' && Math.random() < .6) dropItem(mesh.position.clone(), 'coin');
  markDirty(curFloor);
}
function placeBlockAt(targetMesh, faceNormal) {
  const c = targetMesh.userData.cell;
  const n = faceNormal;
  const nx = c.x + Math.round(n.x);
  const ny = c.y + Math.round(n.y);
  const nz = c.z - Math.round(n.z); // grid z は -Z 方向
  if (!inGrid(nx, ny, nz) || world.has(key(nx, ny, nz))) return;
  // プレイヤーと重なる位置には置けない
  const wp = cellToWorld(nx, ny, nz);
  const cam = ctx.camera.position;
  if (Math.abs(wp.x - cam.x) < .55 && Math.abs(wp.z - cam.z) < .55 && wp.y > cam.y - 1.8 && wp.y < cam.y + .4) return;
  const type = HOTBAR[hotbarIdx].type;
  world.set(key(nx, ny, nz), { type });
  const m = addBlockMesh(nx, ny, nz, type);
  gsap.fromTo(m.scale, { x: .6, y: .6, z: .6 }, { x: 1, y: 1, z: 1, duration: .16, ease: 'back.out(2)' });
  placeSound();
  markDirty(curFloor);
}
/* 床(地面)への設置: 空セルへの直接設置 (地面レイ) */
function placeOnGround(point) {
  const c = worldToCell(new THREE.Vector3(point.x, .01, point.z));
  if (!inGrid(c.x, 0, c.z) || world.has(key(c.x, 0, c.z))) return;
  const type = HOTBAR[hotbarIdx].type;
  world.set(key(c.x, 0, c.z), { type });
  const m = addBlockMesh(c.x, 0, c.z, type);
  gsap.fromTo(m.scale, { x: .6, y: .6, z: .6 }, { x: 1, y: 1, z: 1, duration: .16, ease: 'back.out(2)' });
  placeSound();
  markDirty(curFloor);
}

/* ---------------- 一人称コントローラ ---------------- */
let fp = false;
let locked = false;
const keys = {};
const player = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), onGround: true, hp: 20, maxHp: 20, invuln: 0, dead: false };
const EYE = 1.62, RADIUS = .22, GRAV = 20, JUMP = 5.4, SPEED = 3.4;
let savedFov = 66;
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const centerRay = new THREE.Raycaster();
centerRay.far = 4;
let groundPlane = null;

export function isFPActive() { return fp; }

export function initVoxel(context) {
  ctx = context;
  const dom = ctx.renderer.domElement;
  dom.addEventListener('contextmenu', e => { if (fp) e.preventDefault(); });

  let justLocked = false;
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === dom;
    if (locked) justLocked = true;
    document.getElementById('fpOverlay').style.display = (fp && !locked && !player.dead) ? 'flex' : 'none';
    document.getElementById('crosshair').style.display = (fp && locked) ? 'block' : 'none';
  });
  document.getElementById('respawnBtn').onclick = () => respawnPlayer();
  document.addEventListener('mousemove', e => {
    if (!fp || !locked) return;
    // ロック直後のスパイク (巨大な movement 値) を無視する
    if (justLocked) { justLocked = false; return; }
    if (Math.abs(e.movementX) > 200 || Math.abs(e.movementY) > 200) return;
    euler.setFromQuaternion(ctx.camera.quaternion);
    euler.y -= e.movementX * .0022;
    euler.x -= e.movementY * .0022;
    euler.x = Math.max(-Math.PI / 2 + .05, Math.min(Math.PI / 2 - .05, euler.x));
    ctx.camera.quaternion.setFromEuler(euler);
  });
  document.addEventListener('keydown', e => {
    if (!fp) return;
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'KeyB') { saveBaseManual(); return; } // 拠点を保存
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= HOTBAR.length) selectHotbar(num - 1);
  });
  document.addEventListener('keyup', e => { keys[e.code] = false; });

  dom.addEventListener('pointerdown', e => {
    if (!fp || !locked) return;
    e.preventDefault();
    centerRay.setFromCamera(new THREE.Vector2(0, 0), ctx.camera);
    // 乗場の呼びボタン
    const callHit = centerRay.intersectObjects(ctx.callbacks.getBtnHits(), false)[0];
    if (callHit?.object.userData.hallCall && e.button === 0) { ctx.callbacks.onHallCall(); return; }
    // モブ (攻撃)
    const personMeshes = peopleList.flatMap(p => p.parts);
    const ph = centerRay.intersectObjects(personMeshes, false)[0];
    if (ph && e.button === 0) {
      const p = peopleList.find(q => q.parts.includes(ph.object));
      if (p) { hitMob(p); return; }
    }
    // ブロック
    const bh = centerRay.intersectObjects([...blockMeshes.values()], false)[0];
    if (bh) {
      if (e.button === 0) breakBlockAt(bh.object);
      else if (e.button === 2) placeBlockAt(bh.object, bh.face.normal.clone().transformDirection(bh.object.matrixWorld));
      return;
    }
    // 地面へ設置
    if (e.button === 2 && groundPlane) {
      const gh = centerRay.intersectObject(groundPlane, false)[0];
      if (gh) placeOnGround(gh.point);
    }
  });

  buildHotbarUI();
  loadSavedWorld();     // 保存済み拠点を復元
  updateInventoryUI();
}

/* 地面レイ用の透明プレーン (全フロアを覆う大きさ) */
function ensureGroundPlane() {
  if (groundPlane) return;
  groundPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID_PLAINS.xMax * 2 * CELL + 4, (GRID_PLAINS.zMax + 3) * CELL + 4),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.userData.shared = true;
  ctx.scene.add(groundPlane);
}

export function enterFPMode() {
  if (fp) return;
  fp = true;
  // 進行中のカメラ移動トゥイーンを止める (onUpdateのcontrols.update()が姿勢を上書きするのを防ぐ)
  gsap.killTweensOf(ctx.camera.position);
  gsap.killTweensOf(ctx.controls.target);
  ensureGroundPlane();
  groundPlane.position.set(0, 0, fz - (GRID.zMax * CELL) / 2);
  ctx.controls.enabled = false;
  savedFov = ctx.camera.fov;
  ctx.camera.fov = 75; ctx.camera.updateProjectionMatrix();
  // ドアのすぐ外に立つ
  player.pos.set(0, 0, fz - .7);
  player.vel.set(0, 0, 0);
  ctx.camera.position.set(player.pos.x, player.pos.y + EYE, player.pos.z);
  euler.set(0, 0, 0); // フロア奥 (-Z) を向く
  ctx.camera.quaternion.setFromEuler(euler);
  document.getElementById('hotbar').style.display = 'flex';
  // HP初期化 (満タンで探索開始)
  if (player.hp <= 0 || player.dead) { player.hp = player.maxHp; player.dead = false; }
  player.invuln = 1.0;
  updateHearts();
  document.getElementById('hpBar').style.display = 'flex';
  const inv = document.getElementById('invBar'); if (inv) inv.style.display = 'flex';
  const clk = document.getElementById('clock'); if (clk) clk.style.display = 'flex';
  updateInventoryUI();
  ctx.renderer.domElement.requestPointerLock?.();
}
export function exitFPMode() {
  if (!fp) return;
  fp = false;
  if (document.pointerLockElement) document.exitPointerLock?.();
  ctx.controls.enabled = true;
  ctx.camera.fov = savedFov; ctx.camera.updateProjectionMatrix();
  document.getElementById('hotbar').style.display = 'none';
  document.getElementById('crosshair').style.display = 'none';
  document.getElementById('fpOverlay').style.display = 'none';
  document.getElementById('hpBar').style.display = 'none';
  document.getElementById('gameOver').style.display = 'none';
  const inv = document.getElementById('invBar'); if (inv) inv.style.display = 'none';
  const clk = document.getElementById('clock'); if (clk) clk.style.display = 'none';
  player.dead = false;
  if (highlight) highlight.visible = false;
}
export function relockFP() {
  if (fp) ctx.renderer.domElement.requestPointerLock?.();
}

/* 衝突: 水平方向はセルAABBと円の押し出し、垂直は地面高さ */
function solidAt(cx, cy, cz) { return world?.has(key(cx, cy, cz)); }
function collideAxis(pos, axis) {
  const feetY = Math.floor((pos.y + .1) / CELL);
  const headY = Math.floor((pos.y + 1.4) / CELL);
  for (const cy of [feetY, headY]) {
    if (cy < 0 || cy > GRID.yMax) continue;
    const c = worldToCell(new THREE.Vector3(pos.x, cy * CELL + .1, pos.z));
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const bx = c.x + dx, bz = c.z + dz;
      if (!solidAt(bx, cy, bz)) continue;
      const w = cellToWorld(bx, cy, bz);
      const minX = w.x - CELL / 2 - RADIUS, maxX = w.x + CELL / 2 + RADIUS;
      const minZ = w.z - CELL / 2 - RADIUS, maxZ = w.z + CELL / 2 + RADIUS;
      if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
        if (axis === 'x') pos.x = (pos.x - w.x > 0) ? maxX : minX;
        else pos.z = (pos.z - w.z > 0) ? maxZ : minZ;
      }
    }
  }
}
function groundHeightAt(x, z) {
  const c = worldToCell(new THREE.Vector3(x, .1, z));
  let h = 0;
  for (let y = GRID.yMax; y >= 0; y--) {
    for (let dx = -0; dx <= 0; dx++) for (let dz = 0; dz <= 0; dz++) {
      if (solidAt(c.x + dx, y, c.z + dz)) { h = Math.max(h, (y + 1) * CELL); }
    }
    if (h) break;
  }
  return h;
}

export function updateVoxel(dt, walkMode, t) {
  if (walkMode) {
    // 昼夜サイクルを進める (探索中のみ)
    if (fp) {
      dayT = (dayT + dt / DAY_LENGTH) % 1;
      const info = getDayInfo();
      if (info.night && !nightSpawnDone) { spawnNightMobs(); nightSpawnDone = true; }
      if (!info.night) nightSpawnDone = false;
    }
    updateMobs(dt, t);
    updateItems(dt, t);
  }
  updateParticles(dt);
  if (player.invuln > 0) player.invuln -= dt;
  if (!fp || !locked || player.dead) return;

  // 移動
  const fwd = new THREE.Vector3(); ctx.camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
  const move = new THREE.Vector3();
  if (keys.KeyW || keys.ArrowUp) move.add(fwd);
  if (keys.KeyS || keys.ArrowDown) move.sub(fwd);
  if (keys.KeyD || keys.ArrowRight) move.add(right);
  if (keys.KeyA || keys.ArrowLeft) move.sub(right);
  if (move.lengthSq() > 0) move.normalize().multiplyScalar(SPEED * dt);

  const beforeX = player.pos.x, beforeZ = player.pos.z;
  player.pos.x += move.x; collideAxis(player.pos, 'x');
  player.pos.z += move.z; collideAxis(player.pos, 'z');
  // オートステップ: 接地中に1段(≤0.55m)の段差へ進もうとしたら自動で登る
  if (player.onGround && (move.x || move.z)) {
    const gAhead = groundHeightAt(player.pos.x, player.pos.z);
    const rise = gAhead - player.pos.y;
    if (rise > 0.05 && rise <= 0.55) {
      const hc = worldToCell(new THREE.Vector3(player.pos.x, gAhead + 1.5, player.pos.z));
      if (!solidAt(hc.x, hc.y, hc.z)) { player.pos.y = gAhead; player.vel.y = 0; }
    }
  }

  // 乗場の外周・エレベーター壁
  const xLim = GRID.xMax * CELL - .1;
  player.pos.x = Math.max(-xLim, Math.min(xLim, player.pos.x));
  const zFar = fz - (GRID.zMax + 1) * CELL + .1;
  player.pos.z = Math.max(zFar, player.pos.z);
  const dw = ctx.callbacks.getDoorWidth();
  const nearDoor = Math.abs(player.pos.x) < dw / 2 - .1;
  if (nearDoor && ctx.callbacks.isDoorsOpen()) {
    // 開いたドアからかごへ戻れる。ただし被弾ノックバック中(invuln)は帰還しない
    // (敵に押し戻されて探索が終了してしまうのを防ぐ)
    if (player.invuln <= 0 && player.pos.z > fz - .32) { ctx.callbacks.onEnterCab(); return; }
  } else {
    player.pos.z = Math.min(player.pos.z, fz - .45);
  }

  // 重力・ジャンプ (1ブロック=0.5mを確実に越えられる初速)
  const ground = groundHeightAt(player.pos.x, player.pos.z);
  player.vel.y -= GRAV * dt;
  if ((keys.Space) && player.onGround) { player.vel.y = JUMP; player.onGround = false; }
  player.pos.y += player.vel.y * dt;
  if (player.pos.y <= ground) { player.pos.y = ground; player.vel.y = 0; player.onGround = true; }
  else player.onGround = false;

  ctx.camera.position.set(player.pos.x, player.pos.y + EYE, player.pos.z);

  // 照準ハイライト
  centerRay.setFromCamera(new THREE.Vector2(0, 0), ctx.camera);
  const bh = centerRay.intersectObjects([...blockMeshes.values()], false)[0];
  if (bh && highlight) {
    highlight.visible = true;
    highlight.position.copy(bh.object.position);
  } else if (highlight) highlight.visible = false;
}

/* 非FP(フォールバック回遊)でもクリックで壊せる */
export function voxelPointerAction(raycaster, isBreak) {
  const personMeshes = peopleList.flatMap(p => p.parts);
  const ph = raycaster.intersectObjects(personMeshes, false)[0];
  if (ph && isBreak) {
    const p = peopleList.find(q => q.parts.includes(ph.object));
    if (p) { hitMob(p); return true; }
  }
  const bh = raycaster.intersectObjects([...blockMeshes.values()], false)[0];
  if (bh) {
    if (isBreak) breakBlockAt(bh.object);
    else placeBlockAt(bh.object, bh.face.normal.clone().transformDirection(bh.object.matrixWorld));
    return true;
  }
  return false;
}

/* ---------------- ホットバー UI ---------------- */
function buildHotbarUI() {
  const bar = document.getElementById('hotbar');
  bar.innerHTML = '';
  HOTBAR.forEach((b, i) => {
    const slot = document.createElement('div');
    slot.className = 'hb-slot' + (i === hotbarIdx ? ' active' : '');
    const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const src = b.type.startsWith('wool:') ? T.wool(parseInt(b.type.slice(5), 16)) : (T[b.type] ? T[b.type]() : T.stone());
    g.drawImage(src.image, 0, 0, 32, 32);
    slot.appendChild(cv);
    const lbl = document.createElement('span'); lbl.textContent = `${i + 1} ${b.n}`;
    slot.appendChild(lbl);
    slot.onclick = () => selectHotbar(i);
    bar.appendChild(slot);
  });
}
function selectHotbar(i) {
  hotbarIdx = i;
  document.querySelectorAll('#hotbar .hb-slot').forEach((s, j) => s.classList.toggle('active', j === i));
}

/* 乗場の内装用テクスチャ (フロアごとの床・壁) */
export function shellTexturesFor(floor) {
  const floorTex = floor === 8 ? T.grassTop() : floor === 4 || floor === 7 ? T.planksPale() : T.stonePale();
  const wallTex = floor === 8 ? T.leaves() : floor === 5 ? T.brick() : T.stonePale();
  return { floorTex, wallTex };
}
