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
const GRID = { xMin: -9, xMax: 9, zMin: 0, zMax: 13, yMax: 5 };

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

function generateFloor(floor, accentHex) {
  const map = new Map();
  const wool = 'wool:' + accentHex.toString(16).padStart(6, '0');
  switch (floor) {
    case 1: // 化粧品: 白いカウンター + ガラス + 金アクセント
      counterPrefab(map, -5, 3, wool); counterPrefab(map, 5, 3, wool);
      counterPrefab(map, -5, 8, wool); counterPrefab(map, 5, 8, wool);
      fill(map, -1, 1, 0, 0, 11, 11, 'gold');
      lampPrefab(map, -8, 6); lampPrefab(map, 8, 6);
      break;
    case 2: // 婦人服: カラフルなウール棚
      ['c98a96', 'e0d0b8', '8a6e78'].forEach((c, i) => {
        fill(map, -7 + i * 2, -7 + i * 2, 0, 1, 3, 5, 'wool:' + c);
        fill(map, 7 - i * 2, 7 - i * 2, 0, 1, 3, 5, 'wool:' + c);
      });
      counterPrefab(map, 0, 9, wool);
      lampPrefab(map, -5, 11); lampPrefab(map, 5, 11);
      break;
    case 3: // 紳士服: 石×濃色ウールの陳列
      fill(map, -7, -5, 0, 1, 3, 3, 'stone'); fill(map, 5, 7, 0, 1, 3, 3, 'stone');
      fill(map, -7, -5, 2, 2, 3, 3, wool); fill(map, 5, 7, 2, 2, 3, 3, wool);
      shelfWall(map, -3, 11, 7);
      lampPrefab(map, 0, 6);
      break;
    case 4: // 書籍: 本棚の迷路 + カフェ
      shelfWall(map, -8, 3, 6); shelfWall(map, 3, 3, 6);
      shelfWall(map, -8, 7, 6); shelfWall(map, 3, 7, 6);
      tablePrefab(map, 0, 10, wool); tablePrefab(map, -5, 11, wool); tablePrefab(map, 5, 11, wool);
      lampPrefab(map, 0, 5);
      break;
    case 5: // レストラン: テーブル席 + レンガ厨房
      tablePrefab(map, -5, 3, wool); tablePrefab(map, 5, 3, wool);
      tablePrefab(map, -5, 7, wool); tablePrefab(map, 5, 7, wool);
      tablePrefab(map, 0, 5, wool);
      fill(map, -3, 3, 0, 1, 11, 11, 'brick');
      fill(map, -3, 3, 2, 2, 11, 11, 'glow');
      break;
    case 6: // 催事場: ステージ + ウールの旗
      fill(map, -4, 4, 0, 0, 8, 10, wool);
      fill(map, -4, 4, 1, 1, 9, 9, 'gold');
      ['c83c3c', 'e8c34a', '3c78c8'].forEach((c, i) => {
        fill(map, -6 + i * 6, -6 + i * 6, 3, 4, 3, 3, 'wool:' + c);
      });
      lampPrefab(map, -8, 5); lampPrefab(map, 8, 5);
      break;
    case 7: // ラウンジ: 暗色 + 光源多め + バー
      fill(map, -7, -3, 0, 0, 4, 4, wool); fill(map, -7, -3, 0, 0, 5, 5, 'planks');
      fill(map, 3, 7, 0, 1, 9, 9, 'planks'); fill(map, 3, 7, 2, 2, 9, 9, 'glass');
      lampPrefab(map, -8, 8); lampPrefab(map, 0, 3); lampPrefab(map, 8, 8);
      setBlock(map, 0, 0, 11, 'gold');
      break;
    case 8: // 屋上庭園: 芝生 + 木 + 花壇
      fill(map, GRID.xMin, GRID.xMax, 0, 0, 6, GRID.zMax, 'grass');
      treePrefab(map, -6, 9, 3); treePrefab(map, 6, 10, 4); treePrefab(map, 0, 12, 3);
      fill(map, -3, -1, 1, 1, 7, 7, 'wool:c94a55'); fill(map, 1, 3, 1, 1, 7, 7, 'wool:e8c34a');
      lampPrefab(map, -8, 7); lampPrefab(map, 8, 7);
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
  voxGroup = parentGroup;
  blockMeshes = new Map();
  peopleList.forEach(p => p.group.parent?.remove(p.group));
  peopleList = [];

  if (!worldCache.has(floor)) worldCache.set(floor, generateFloor(floor, theme?.accent ?? 0x8888aa));
  world = worldCache.get(floor);
  for (const [k, v] of world) {
    const [x, y, z] = k.split(',').map(Number);
    addBlockMesh(x, y, z, v.type);
  }

  // ブロック人形 (毎回リスポーン)
  const rand = seeded(floor * 977 + 5);
  const n = 3;
  for (let i = 0; i < n; i++) {
    const p = makeVoxPerson(rand, theme?.accent ?? 0x8888aa);
    p.group.position.copy(cellToWorld(
      Math.round((rand() - .5) * 12), 0,
      3 + Math.round(rand() * 8)
    ));
    p.group.position.y = 0;
    voxGroup.add(p.group);
    peopleList.push(p);
  }

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

function makeVoxPerson(rand, accent) {
  const g = new THREE.Group();
  const skinHex = P_SKIN[(rand() * P_SKIN.length) | 0];
  const hairHex = P_HAIR[(rand() * P_HAIR.length) | 0];
  const topHex = rand() > .4 ? accent : P_TOP[(rand() * P_TOP.length) | 0];
  const botHex = P_BOT[(rand() * P_BOT.length) | 0];

  const parts = [];
  const add = (w, h, d, x, y, z, matOrHex, extraMats) => {
    const mm = extraMats ?? voxPartMat(matOrHex);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mm);
    m.position.set(x, y, z); g.add(m); parts.push(m);
    return m;
  };
  // 脚・胴・腕・頭 (角ばったプロポーション)
  add(.14, .38, .14, -.08, .19, 0, botHex);
  add(.14, .38, .14, .08, .19, 0, botHex);
  add(.34, .42, .2, 0, .59, 0, topHex);
  const armL = add(.1, .38, .1, -.235, .60, 0, topHex);
  const armR = add(.1, .38, .1, .235, .60, 0, topHex);
  const head = makeHead(.3, skinHex, hairHex, (rand() * FACE_VARIANTS) | 0);
  head.position.set(0, .97, 0); g.add(head); parts.push(head);
  const hairBand = add(.32, .1, .32, 0, 1.09, 0, hairHex);
  hairBand.position.y = 1.08;

  g.userData.voxPerson = true;
  return {
    group: g, parts, hp: 2,
    armL, armR, phase: rand() * 6,
    speed: .5 + rand() * .4,
    target: null, wait: 1 + rand() * 2,
  };
}

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
function updatePeople(dt, t) {
  for (const p of peopleList) {
    if (p.wait > 0) { p.wait -= dt; continue; }
    if (!p.target) {
      const r = Math.random;
      p.target = cellToWorld(
        Math.round((r() - .5) * (GRID.xMax * 2 - 2)), 0,
        2 + Math.round(r() * (GRID.zMax - 3))
      );
      p.target.y = 0;
    }
    const pos = p.group.position;
    const dx = p.target.x - pos.x, dz = p.target.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < .1) { p.target = null; p.wait = 1.5 + Math.random() * 3; continue; }
    const vx = (dx / dist) * p.speed * dt, vz = (dz / dist) * p.speed * dt;
    pos.x += vx; pos.z += vz;
    p.group.rotation.y = Math.atan2(dx, dz);
    const sw = Math.sin(t * 7 + p.phase) * .5;
    p.armL.rotation.x = sw; p.armR.rotation.x = -sw;
    pos.y = Math.abs(Math.sin(t * 7 + p.phase)) * .02;
  }
}
function hitPerson(p) {
  p.hp -= 1;
  navigator.vibrate?.(20);
  // 赤フラッシュ
  p.parts.forEach(m => {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach(mm => {
      if (!mm.emissive) return;
      gsap.fromTo(mm, { emissiveIntensity: .9 }, { emissiveIntensity: 0, duration: .35 });
      mm.emissive = new THREE.Color(0xff3333);
    });
  });
  popSound(1.4);
  if (p.hp <= 0) {
    spawnParticles(p.group.position.clone().add(new THREE.Vector3(0, .6, 0)), 0xd9a97e, 14);
    voxGroup.remove(p.group);
    p.parts.forEach(m => { m.geometry.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach(mm => mm.dispose()); });
    peopleList = peopleList.filter(q => q !== p);
    ctx.callbacks.toast('ブロック人形をたおした！ (次の来店時に復活します)');
  } else {
    // ノックバック
    const dir = p.group.position.clone().sub(ctx.camera.position).setY(0).normalize().multiplyScalar(.35);
    gsap.to(p.group.position, { x: p.group.position.x + dir.x, z: p.group.position.z + dir.z, duration: .18 });
  }
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

function breakBlockAt(mesh) {
  const { cell, type } = mesh.userData;
  world.delete(key(cell.x, cell.y, cell.z));
  blockMeshes.delete(key(cell.x, cell.y, cell.z));
  voxGroup.remove(mesh); // 共有ジオメトリ/マテリアルなので dispose しない
  spawnParticles(mesh.position, avgColor(type), 10);
  popSound(1);
  navigator.vibrate?.(12);
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
}

/* ---------------- 一人称コントローラ ---------------- */
let fp = false;
let locked = false;
const keys = {};
const player = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), onGround: true };
const EYE = 1.62, RADIUS = .22, GRAV = 20, JUMP = 6.8, SPEED = 3.4;
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
    document.getElementById('fpOverlay').style.display = (fp && !locked) ? 'flex' : 'none';
    document.getElementById('crosshair').style.display = (fp && locked) ? 'block' : 'none';
  });
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
    // ブロック人形
    const personMeshes = peopleList.flatMap(p => p.parts);
    const ph = centerRay.intersectObjects(personMeshes, false)[0];
    if (ph && e.button === 0) {
      const p = peopleList.find(q => q.parts.includes(ph.object));
      if (p) { hitPerson(p); return; }
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
}

/* 地面レイ用の透明プレーン (乗場床と同じ位置) */
function ensureGroundPlane() {
  if (groundPlane) return;
  groundPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID.xMax * 2 * CELL + 2, (GRID.zMax + 2) * CELL + 2),
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
    updatePeople(dt, t);
  }
  updateParticles(dt);
  if (!fp || !locked) return;

  // 移動
  const fwd = new THREE.Vector3(); ctx.camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
  const move = new THREE.Vector3();
  if (keys.KeyW || keys.ArrowUp) move.add(fwd);
  if (keys.KeyS || keys.ArrowDown) move.sub(fwd);
  if (keys.KeyD || keys.ArrowRight) move.add(right);
  if (keys.KeyA || keys.ArrowLeft) move.sub(right);
  if (move.lengthSq() > 0) move.normalize().multiplyScalar(SPEED * dt);

  player.pos.x += move.x; collideAxis(player.pos, 'x');
  player.pos.z += move.z; collideAxis(player.pos, 'z');

  // 乗場の外周・エレベーター壁
  const xLim = GRID.xMax * CELL - .1;
  player.pos.x = Math.max(-xLim, Math.min(xLim, player.pos.x));
  const zFar = fz - (GRID.zMax + 1) * CELL + .1;
  player.pos.z = Math.max(zFar, player.pos.z);
  const dw = ctx.callbacks.getDoorWidth();
  const nearDoor = Math.abs(player.pos.x) < dw / 2 - .1;
  if (nearDoor && ctx.callbacks.isDoorsOpen()) {
    // 開いたドアからかごへ戻れる
    if (player.pos.z > fz - .32) { ctx.callbacks.onEnterCab(); return; }
  } else {
    player.pos.z = Math.min(player.pos.z, fz - .45);
  }

  // 重力・ジャンプ
  const ground = groundHeightAt(player.pos.x, player.pos.z);
  player.vel.y -= GRAV * dt;
  if ((keys.Space) && player.onGround) { player.vel.y = JUMP * .55; player.onGround = false; }
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
    if (p) { hitPerson(p); return true; }
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
