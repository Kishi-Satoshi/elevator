import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getFloorTheme } from '../lib/floorThemes';
import type { FloorTheme, HallArchetype } from '../lib/floorThemes';
import type { Direction } from '../lib/elevatorConfig';

/**
 * HallScene
 * ------------------------------------------------------------
 * ドアの向こうに広がる百貨店フロアのホール。
 * 停止階の FloorTheme に応じて内装色・照明・什器レイアウトが
 * まるごと入れ替わり、階ごとに売場の空気感が変わる。
 *
 * 什器はプリミティブ形状の組み合わせで、フロア番号をシードに
 * 決定的に配置する (同じ階はいつも同じ売場に見える)。
 * ------------------------------------------------------------
 */

interface HallSceneProps {
  currentFloor: number;
  direction: Direction;
  /** かご正面壁の z 位置 */
  hallZ: number;
  doorHeight: number;
}

/** 決定的な擬似乱数 (mulberry32) — 階ごとに固定の売場レイアウトを作る */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HALL = { w: 7, h: 2.7, d: 4.6 };

/* ============ 什器プリミティブ ============ */

function Mannequin({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.36, 0.2, 0.36]} />
        <meshStandardMaterial color="#e8e4dc" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.085, 0.11, 0.72, 12]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.09, 0]}>
        <sphereGeometry args={[0.075, 12, 10]} />
        <meshStandardMaterial color="#ddd6ca" roughness={0.5} />
      </mesh>
    </group>
  );
}

function ClothingRack({ position, colors, rand }: { position: [number, number, number]; colors: string[]; rand: () => number }) {
  const items = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      x: -0.42 + i * 0.17,
      color: colors[Math.floor(rand() * colors.length)],
      h: 0.5 + rand() * 0.2,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <group position={position}>
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.65, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 1.3, 8]} />
          <meshStandardMaterial color="#9a9a9a" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 1.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 1.14, 8]} />
        <meshStandardMaterial color="#9a9a9a" metalness={0.8} roughness={0.3} />
      </mesh>
      {items.map((it, i) => (
        <mesh key={i} position={[it.x, 1.26 - it.h / 2, 0]}>
          <boxGeometry args={[0.13, it.h, 0.05]} />
          <meshStandardMaterial color={it.color} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function GlassCounter({ position, accent }: { position: [number, number, number]; accent: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.1, 0.84, 0.55]} />
        <meshStandardMaterial color="#f4f2ee" roughness={0.25} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.97, 0]}>
        <boxGeometry args={[1.1, 0.26, 0.55]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0.75} roughness={0.05} thickness={0.1} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 0.86, 0]}>
        <boxGeometry args={[1.0, 0.02, 0.45]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} roughness={0.3} />
      </mesh>
    </group>
  );
}

function ShelfUnit({ position, accent, rand }: { position: [number, number, number]; accent: string; rand: () => number }) {
  const books = useMemo(() => {
    const arr: { x: number; y: number; c: string; h: number }[] = [];
    const palette = [accent, '#c8b89c', '#8a8078', '#e2d8c4', '#6a7484'];
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 5; i++) {
        if (rand() < 0.25) continue;
        arr.push({
          x: -0.42 + i * 0.21 + rand() * 0.04,
          y: 0.36 + row * 0.5,
          c: palette[Math.floor(rand() * palette.length)],
          h: 0.22 + rand() * 0.14,
        });
      }
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <group position={position}>
      <mesh position={[0, 0.9, -0.14]}>
        <boxGeometry args={[1.16, 1.8, 0.04]} />
        <meshStandardMaterial color="#b09a78" roughness={0.7} />
      </mesh>
      {[0.12, 0.62, 1.12, 1.62].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[1.16, 0.035, 0.32]} />
          <meshStandardMaterial color="#c0aa86" roughness={0.65} />
        </mesh>
      ))}
      {books.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, 0]}>
          <boxGeometry args={[0.16, b.h, 0.2]} />
          <meshStandardMaterial color={b.c} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function DiningSet({ position, accent, warm }: { position: [number, number, number]; accent: string; warm: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.035, 20]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.72, 10]} />
        <meshStandardMaterial color="#5a5048" metalness={0.4} roughness={0.4} />
      </mesh>
      {[[-0.55, 0], [0.55, 0]].map(([x], i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[0, 0.24, 0]}>
            <boxGeometry args={[0.34, 0.06, 0.34]} />
            <meshStandardMaterial color={accent} roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.05, 0.24, 0.05]} />
            <meshStandardMaterial color="#4a4038" roughness={0.5} />
          </mesh>
        </group>
      ))}
      {/* ペンダントライト */}
      <mesh position={[0, 2.1, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 1.0, 6]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0, 1.58, 0]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color={warm} emissive={warm} emissiveIntensity={2.2} />
      </mesh>
    </group>
  );
}

function LivingSet({ position, accent }: { position: [number, number, number]; accent: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.26, -0.25]}>
        <boxGeometry args={[1.5, 0.34, 0.6]} />
        <meshStandardMaterial color={accent} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.55, -0.5]}>
        <boxGeometry args={[1.5, 0.44, 0.16]} />
        <meshStandardMaterial color={accent} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.2, 0.5]}>
        <boxGeometry args={[0.9, 0.06, 0.45]} />
        <meshStandardMaterial color="#6a5644" roughness={0.4} />
      </mesh>
      {/* フロアランプ */}
      <group position={[1.05, 0, 0.1]}>
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.015, 0.02, 1.4, 8]} />
          <meshStandardMaterial color="#3a352e" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.44, 0]}>
          <cylinderGeometry args={[0.1, 0.14, 0.18, 12, 1, true]} />
          <meshStandardMaterial color="#f6ecd8" emissive="#ffd9a0" emissiveIntensity={1.6} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function EventBanner({ position, accent, text }: { position: [number, number, number]; accent: string; text?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, -0.45, 0]}>
        <planeGeometry args={[0.5, 0.9]} />
        <meshStandardMaterial color={accent} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {text && (
        <Html
          transform
          position={[0, -0.45, 0.006]}
          rotation={[0, Math.PI, 0]}
          distanceFactor={1.2}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none', backfaceVisibility: 'hidden' }}
        >
          <div style={{ writingMode: 'vertical-rl' }} className="text-white font-bold text-[10px] tracking-widest select-none">
            {text}
          </div>
        </Html>
      )}
    </group>
  );
}

function GardenPlanter({ position, rand }: { position: [number, number, number]; rand: () => number }) {
  const tall = rand() > 0.5;
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.55, 0.4, 0.55]} />
        <meshStandardMaterial color="#8a8078" roughness={0.9} />
      </mesh>
      <mesh position={[0, tall ? 0.85 : 0.6, 0]}>
        <cylinderGeometry args={[0.03, 0.045, tall ? 0.9 : 0.4, 8]} />
        <meshStandardMaterial color="#5a4632" roughness={0.9} />
      </mesh>
      <mesh position={[0, tall ? 1.55 : 0.95, 0]}>
        {tall
          ? <coneGeometry args={[0.32, 0.85, 10]} />
          : <sphereGeometry args={[0.3, 10, 8]} />}
        <meshStandardMaterial color={tall ? '#3e6a3a' : '#4e8a44'} roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ============ アーキタイプ別レイアウト ============ */

function HallProps({ theme, floor }: { theme: FloorTheme; floor: number }) {
  const rand = useMemo(() => mulberry32(floor * 7919 + 17), [floor]);
  const a: HallArchetype = theme.archetype;
  const accents = [theme.accent, '#c8b89c', '#8a8078'];

  switch (a) {
    case 'counters':
      return (
        <group>
          <GlassCounter position={[-1.5, 0, 1.6]} accent={theme.accent} />
          <GlassCounter position={[1.5, 0, 1.6]} accent={theme.accent} />
          <GlassCounter position={[0, 0, 3.0]} accent={theme.accent} />
          <Mannequin position={[-2.6, 0, 2.6]} color={theme.accent} />
        </group>
      );
    case 'racks':
      return (
        <group>
          <ClothingRack position={[-1.7, 0, 1.7]} colors={accents} rand={rand} />
          <ClothingRack position={[1.8, 0, 2.2]} colors={accents} rand={rand} />
          <Mannequin position={[-0.6, 0, 2.9]} color={theme.accent} />
          <Mannequin position={[0.6, 0, 2.9]} color={accents[1]} />
        </group>
      );
    case 'shelves':
      return (
        <group>
          <ShelfUnit position={[-1.8, 0, 2.0]} accent={theme.accent} rand={rand} />
          <ShelfUnit position={[1.8, 0, 2.0]} accent={theme.accent} rand={rand} />
          <GlassCounter position={[0, 0, 3.2]} accent={theme.accent} />
        </group>
      );
    case 'tables':
      return (
        <group>
          <DiningSet position={[-1.5, 0, 1.9]} accent={theme.accent} warm={theme.light} />
          <DiningSet position={[1.5, 0, 2.4]} accent={theme.accent} warm={theme.light} />
          <DiningSet position={[0, 0, 3.3]} accent={theme.accent} warm={theme.light} />
        </group>
      );
    case 'living':
      return (
        <group>
          <LivingSet position={[-1.0, 0, 2.4]} accent={theme.accent} />
          <GardenPlanter position={[1.9, 0, 1.7]} rand={rand} />
          <GlassCounter position={[2.0, 0, 3.2]} accent={theme.accent} />
        </group>
      );
    case 'plaza':
      return (
        <group>
          {[-1.8, 0, 1.8].map((x, i) => (
            <EventBanner key={i} position={[x, 2.5, 2.0]} accent={theme.accent} text={i === 1 ? theme.short : undefined} />
          ))}
          <mesh position={[0, 0.15, 3.2]}>
            <boxGeometry args={[2.6, 0.3, 1.2]} />
            <meshStandardMaterial color={theme.accent} roughness={0.7} />
          </mesh>
          <Mannequin position={[-0.7, 0.3, 3.2]} color="#e8dcc8" />
          <Mannequin position={[0.7, 0.3, 3.2]} color={theme.accent} />
        </group>
      );
    case 'garden':
      return (
        <group>
          <GardenPlanter position={[-2.0, 0, 1.6]} rand={rand} />
          <GardenPlanter position={[2.1, 0, 1.9]} rand={rand} />
          <GardenPlanter position={[-1.0, 0, 3.0]} rand={rand} />
          <GardenPlanter position={[1.2, 0, 3.2]} rand={rand} />
          {/* ベンチ */}
          <mesh position={[0, 0.22, 2.2]}>
            <boxGeometry args={[1.4, 0.08, 0.4]} />
            <meshStandardMaterial color="#a08a68" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.1, 2.2]}>
            <boxGeometry args={[1.2, 0.16, 0.3]} />
            <meshStandardMaterial color="#6a5a44" roughness={0.85} />
          </mesh>
        </group>
      );
  }
}

/* ============ ホール本体 ============ */

export function HallScene({ currentFloor, direction, hallZ, doorHeight }: HallSceneProps) {
  const theme = getFloorTheme(currentFloor);
  const { w, h, d } = HALL;

  return (
    <group position={[0, 0, hallZ]}>
      {/* 床 */}
      <mesh position={[0, 0.003, d / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={theme.floor} roughness={0.45} metalness={0.05} />
      </mesh>

      {/* 天井 */}
      <mesh position={[0, h, d / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={theme.ceiling} roughness={0.9} />
      </mesh>

      {/* 奥壁 + アクセント帯 */}
      <mesh position={[0, h / 2, d]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={theme.wall} roughness={0.75} />
      </mesh>
      <mesh position={[0, 2.05, d - 0.01]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w, 0.28]} />
        <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={0.25} roughness={0.6} />
      </mesh>

      {/* 側壁 */}
      <mesh position={[-w / 2, h / 2, d / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial color={theme.wall} roughness={0.8} />
      </mesh>
      <mesh position={[w / 2, h / 2, d / 2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial color={theme.wall} roughness={0.8} />
      </mesh>

      {/* 乗場側の壁 (かご正面壁の外側) — ドア開口部を避けた2枚 */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 4 + 0.5), h / 2, 0.001]}>
          <planeGeometry args={[w / 2 - 1, h]} />
          <meshStandardMaterial color={theme.wall} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* ダウンライト (発光ディスク) */}
      {[-1.8, 0, 1.8].map((x) => (
        <mesh key={x} position={[x, h - 0.008, 1.6]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.11, 16]} />
          <meshStandardMaterial color={theme.light} emissive={theme.light} emissiveIntensity={2.5} />
        </mesh>
      ))}

      {/* ホール照明 (テーマ色・強度) */}
      <pointLight
        position={[0, h - 0.3, 1.4]}
        intensity={2.2 * theme.intensity}
        color={theme.light}
        decay={1.7}
      />
      <pointLight
        position={[0, h - 0.4, 3.4]}
        intensity={1.4 * theme.intensity}
        color={theme.light}
        decay={1.8}
      />

      {/* 売場什器 */}
      <HallProps theme={theme} floor={currentFloor} />

      {/* ホールランタン (階数表示) */}
      <Html
        transform
        occlude
        position={[0, doorHeight + 0.16, 0.03]}
        rotation={[0, Math.PI, 0]}
        distanceFactor={0.5}
        zIndexRange={[30, 0]}
        style={{ backfaceVisibility: 'hidden', pointerEvents: 'none' }}
      >
        <div className="flex items-center gap-2 bg-black rounded px-3 py-1 border border-zinc-600">
          <svg width="10" height="8" viewBox="0 0 10 8" className={direction === 'up' ? 'text-amber-400' : 'text-zinc-700'}>
            <polygon points="5,0 10,8 0,8" fill="currentColor" />
          </svg>
          <span className="font-mono text-xl font-bold text-amber-400 tabular-nums">
            {currentFloor}
          </span>
          <svg width="10" height="8" viewBox="0 0 10 8" className={direction === 'down' ? 'text-amber-400' : 'text-zinc-700'}>
            <polygon points="5,8 0,0 10,0" fill="currentColor" />
          </svg>
        </div>
      </Html>

      {/* フロアガイドサイン (ドア横) */}
      <Html
        transform
        occlude
        position={[0.85, 1.62, 0.03]}
        rotation={[0, Math.PI, 0]}
        distanceFactor={0.55}
        zIndexRange={[25, 0]}
        style={{ backfaceVisibility: 'hidden', pointerEvents: 'none' }}
      >
        <div
          className="rounded-md px-3 py-2 shadow-lg border border-black/10 max-w-[150px]"
          style={{ background: 'rgba(20,20,24,0.92)' }}
        >
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black" style={{ color: theme.accent, filter: 'brightness(1.6)' }}>
              {currentFloor}
            </span>
            <span className="text-[9px] font-bold text-white/60">F</span>
          </div>
          <div className="text-[9px] font-semibold text-white leading-tight mt-0.5">
            {theme.name}
          </div>
          <div className="text-[7px] text-white/50 leading-tight">
            {theme.nameEn}
          </div>
        </div>
      </Html>
    </group>
  );
}
