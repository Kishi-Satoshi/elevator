import { useRef, useMemo } from 'react';
import type { RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import type { CabinStylePreset } from '../lib/stylePresets';

/**
 * CabinWalls
 * ------------------------------------------------------------
 * かご室の4面壁 + 鏡 + 床 + 天井を描画するコンポーネント。
 *
 * - 床: MeshReflectorMaterial による実反射 (テーマごとの強度)
 * - 鏡: 背面壁の実像リフレクター
 * - 天井: プリセットの照明方式 (間接/パネル/ダウンライト/全面発光)
 * - 手すり: 木製 / ブロンズ / ステンレス / フラットバー
 * - カメラの向きに応じて視線を遮る壁を自動フェード
 * ------------------------------------------------------------
 */

export interface CabinSize {
  w: number;
  h: number;
  d: number;
}

interface CabinWallsProps {
  size?: CabinSize;
  preset: CabinStylePreset;
  mirrorOpacityMax?: number;
  fadeThreshold?: number;
  showMirror?: boolean;
  doorWidth?: number;
  doorHeight?: number;
}

type MatRef = RefObject<THREE.MeshStandardMaterial | null>;

interface WallInfo {
  refs: MatRef[];
  normal: THREE.Vector3;
  /** 壁面の法線方向オフセット (かご中心から壁面までの距離) */
  planeOffset: number;
  /** 壁フェード時に非表示にする付随オブジェクト (鏡・手すり) */
  group?: RefObject<THREE.Group | null>;
}

const HANDRAIL_COLORS: Record<CabinStylePreset['handrail'], { color: string; metalness: number; roughness: number }> = {
  wood: { color: '#c08850', metalness: 0.05, roughness: 0.55 },
  bronze: { color: '#4a3c34', metalness: 0.75, roughness: 0.35 },
  steel: { color: '#b0b6bc', metalness: 0.9, roughness: 0.25 },
  flatbar: { color: '#c0c6cc', metalness: 0.9, roughness: 0.3 },
};

export function CabinWalls({
  size = { w: 1.4, h: 2.3, d: 1.35 },
  preset,
  fadeThreshold = Math.PI / 4,
  showMirror = true,
  doorWidth = 0.75,
  doorHeight = 2.0,
}: CabinWallsProps) {
  const { camera } = useThree();

  const backWallRef = useRef<THREE.MeshStandardMaterial>(null);
  const frontLeftRef = useRef<THREE.MeshStandardMaterial>(null);
  const frontRightRef = useRef<THREE.MeshStandardMaterial>(null);
  const transomRef = useRef<THREE.MeshStandardMaterial>(null);
  const leftWallRef = useRef<THREE.MeshStandardMaterial>(null);
  const rightWallRef = useRef<THREE.MeshStandardMaterial>(null);
  const backGroupRef = useRef<THREE.Group>(null);
  const leftGroupRef = useRef<THREE.Group>(null);
  const rightGroupRef = useRef<THREE.Group>(null);

  const cabinCenter = useMemo(
    () => new THREE.Vector3(0, size.h / 2, 0),
    [size.h]
  );

  const wallInfos = useMemo<WallInfo[]>(
    () => [
      { refs: [backWallRef], normal: new THREE.Vector3(0, 0, -1), planeOffset: size.d / 2, group: backGroupRef },
      { refs: [frontLeftRef, frontRightRef, transomRef], normal: new THREE.Vector3(0, 0, 1), planeOffset: size.d / 2 },
      { refs: [leftWallRef], normal: new THREE.Vector3(-1, 0, 0), planeOffset: size.w / 2, group: leftGroupRef },
      { refs: [rightWallRef], normal: new THREE.Vector3(1, 0, 0), planeOffset: size.w / 2, group: rightGroupRef },
    ],
    [size.w, size.d]
  );

  const camDir = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    camDir.copy(cabinCenter).sub(camera.position).normalize();

    wallInfos.forEach(({ refs, normal, planeOffset, group }) => {
      // カメラが壁面の外側にいるときだけフェード対象にする
      // (かご内から見たときに壁やドアが透けるのを防ぐ)
      const outside = camera.position.dot(normal) > planeOffset - 0.05;
      const dot = outside ? camDir.dot(normal) : 0;
      const t = Math.max(0, Math.min(1, dot / Math.sin(fadeThreshold)));
      const targetOpacity = 1 - t;

      refs.forEach((ref) => {
        if (!ref.current) return;
        const mat = ref.current;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.15);
        mat.visible = mat.opacity > 0.02;
      });

      // 鏡や手すりはリフレクター材質のため透過フェードできない。
      // 壁が概ね透けたら丸ごと非表示にする。
      if (group?.current) {
        group.current.visible = targetOpacity > 0.4;
      }
    });
  });

  const { w, h, d } = size;
  const wingW = (w - doorWidth) / 2;
  const transomH = h - doorHeight;
  const rail = HANDRAIL_COLORS[preset.handrail];
  const railY = 0.82;
  const railR = preset.handrail === 'flatbar' ? 0.015 : 0.019;

  const wallMatProps = {
    metalness: preset.wallMetalness,
    roughness: preset.wallRoughness,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
  } as const;

  return (
    <group>
      {/* ─── 床: 実反射 ─── */}
      <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - 0.02, d - 0.02]} />
        <MeshReflectorMaterial
          color={preset.floorColor}
          resolution={512}
          blur={[300, 100]}
          mixBlur={0.9}
          mixStrength={preset.floorReflect * 2.2}
          roughness={0.55}
          metalness={0.15}
          mirror={0.4}
          depthScale={0.4}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
        />
      </mesh>
      {/* 床下地 (反射面の裏抜け防止) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[w, 0.02, d]} />
        <meshStandardMaterial color={preset.floorColor} roughness={0.8} />
      </mesh>

      {/* ─── 天井 ─── */}
      <CabinCeiling size={size} preset={preset} />

      {/* ─── 背面壁 (奥・-Z 側) ─── */}
      <mesh position={[0, h / 2, -d / 2]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial ref={backWallRef} color={preset.wallColor} {...wallMatProps} />
      </mesh>

      {/* ─── 背面: 実像ミラー + 手すり ─── */}
      <group ref={backGroupRef}>
        {showMirror && (
          <mesh position={[0, h * 0.58, -d / 2 + 0.012]}>
            <planeGeometry args={[w * 0.52, h * 0.58]} />
            <MeshReflectorMaterial
              color="#f2f4f6"
              resolution={512}
              blur={[80, 40]}
              mixBlur={0.15}
              mixStrength={3.2}
              roughness={0.08}
              metalness={0.6}
              mirror={0.9}
            />
          </mesh>
        )}
        {/* ミラー枠 */}
        {showMirror && (
          <mesh position={[0, h * 0.58, -d / 2 + 0.008]}>
            <planeGeometry args={[w * 0.54, h * 0.6]} />
            <meshStandardMaterial color="#8a9096" metalness={0.85} roughness={0.3} />
          </mesh>
        )}
        {/* 背面手すり */}
        <mesh position={[0, railY, -d / 2 + 0.055]} rotation={[0, 0, Math.PI / 2]}>
          {preset.handrail === 'flatbar'
            ? <boxGeometry args={[0.04, w * 0.8, 0.012]} />
            : <cylinderGeometry args={[railR, railR, w * 0.8, 12]} />}
          <meshStandardMaterial {...rail} />
        </mesh>
        {[-w * 0.34, w * 0.34].map((x) => (
          <mesh key={x} position={[x, railY, -d / 2 + 0.028]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.055, 8]} />
            <meshStandardMaterial color="#7a8086" metalness={0.85} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* ─── 正面壁 (ドア側・+Z): 袖壁 + 欄間 ─── */}
      <mesh position={[-(doorWidth / 2 + wingW / 2), h / 2, d / 2]}>
        <planeGeometry args={[wingW, h]} />
        <meshStandardMaterial ref={frontLeftRef} color={preset.wallColor} {...wallMatProps} />
      </mesh>
      <mesh position={[doorWidth / 2 + wingW / 2, h / 2, d / 2]}>
        <planeGeometry args={[wingW, h]} />
        <meshStandardMaterial ref={frontRightRef} color={preset.wallColor} {...wallMatProps} />
      </mesh>
      {transomH > 0.01 && (
        <mesh position={[0, doorHeight + transomH / 2, d / 2]}>
          <planeGeometry args={[doorWidth, transomH]} />
          <meshStandardMaterial ref={transomRef} color={preset.wallColor} {...wallMatProps} />
        </mesh>
      )}

      {/* ─── 左壁 + 手すり ─── */}
      <mesh position={[-w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial ref={leftWallRef} color={preset.sideWallColor} {...wallMatProps} />
      </mesh>
      <group ref={leftGroupRef}>
        <mesh position={[-w / 2 + 0.055, railY, 0]} rotation={[Math.PI / 2, 0, 0]}>
          {preset.handrail === 'flatbar'
            ? <boxGeometry args={[0.04, d * 0.7, 0.012]} />
            : <cylinderGeometry args={[railR, railR, d * 0.7, 12]} />}
          <meshStandardMaterial {...rail} />
        </mesh>
      </group>

      {/* ─── 右壁 + 手すり ─── */}
      <mesh position={[w / 2, h / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial ref={rightWallRef} color={preset.sideWallColor} {...wallMatProps} />
      </mesh>
      <group ref={rightGroupRef}>
        <mesh position={[w / 2 - 0.055, railY, 0]} rotation={[Math.PI / 2, 0, 0]}>
          {preset.handrail === 'flatbar'
            ? <boxGeometry args={[0.04, d * 0.7, 0.012]} />
            : <cylinderGeometry args={[railR, railR, d * 0.7, 12]} />}
          <meshStandardMaterial {...rail} />
        </mesh>
      </group>

      {/* ─── 幅木 (ステンレスキックプレート) ─── */}
      {([
        [0, -d / 2 + 0.006, 0, w],
        [-w / 2 + 0.006, 0, Math.PI / 2, d],
        [w / 2 - 0.006, 0, Math.PI / 2, d],
      ] as [number, number, number, number][]).map(([x, z, rotY, len], i) => (
        <mesh key={i} position={[x, 0.05, z]} rotation={[0, rotY, 0]}>
          <boxGeometry args={[len, 0.08, 0.008]} />
          <meshStandardMaterial color="#9aa0a6" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/** テーマごとの天井照明方式 */
function CabinCeiling({ size, preset }: { size: CabinSize; preset: CabinStylePreset }) {
  const { w, h, d } = size;
  const style = preset.ceilingStyle;

  return (
    <group>
      {/* 天井面 */}
      <mesh position={[0, h, 0]}>
        <boxGeometry args={[w, 0.02, d]} />
        <meshStandardMaterial
          color={preset.ceilingColor}
          emissive={style === 'luminous' ? preset.lightColor : preset.ceilingColor}
          emissiveIntensity={style === 'luminous' ? 0.7 : 0.08}
          roughness={0.6}
        />
      </mesh>

      {style === 'indirect' && (
        <>
          {/* 周縁の間接照明スリット (Premium) */}
          {([
            [0, -d / 2 + 0.07, 0, w - 0.12],
            [0, d / 2 - 0.07, 0, w - 0.12],
            [-w / 2 + 0.07, 0, Math.PI / 2, d - 0.12],
            [w / 2 - 0.07, 0, Math.PI / 2, d - 0.12],
          ] as [number, number, number, number][]).map(([x, z, rotY, len], i) => (
            <mesh key={i} position={[x, h - 0.035, z]} rotation={[0, rotY, 0]}>
              <boxGeometry args={[len, 0.012, 0.05]} />
              <meshStandardMaterial
                color={preset.lightColor}
                emissive={preset.lightColor}
                emissiveIntensity={2.4}
              />
            </mesh>
          ))}
          {/* 中央の折り上げパネル */}
          <mesh position={[0, h - 0.05, 0]}>
            <boxGeometry args={[w - 0.3, 0.02, d - 0.3]} />
            <meshStandardMaterial color={preset.ceilingColor} roughness={0.5} />
          </mesh>
        </>
      )}

      {style === 'panel' && (
        <mesh position={[0, h - 0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w * 0.45, d * 0.45]} />
          <meshStandardMaterial
            color={preset.lightColor}
            emissive={preset.lightColor}
            emissiveIntensity={1.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {style === 'downlight' && (
        <>
          {([[-w * 0.28, -d * 0.28], [w * 0.28, -d * 0.28], [-w * 0.28, d * 0.28], [w * 0.28, d * 0.28]] as [number, number][]).map(([x, z], i) => (
            <mesh key={i} position={[x, h - 0.012, z]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.055, 16]} />
              <meshStandardMaterial
                color={preset.lightColor}
                emissive={preset.lightColor}
                emissiveIntensity={2.6}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}
