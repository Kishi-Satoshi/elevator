import { useRef, useMemo } from 'react';
import type { RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * CabinWalls
 * ------------------------------------------------------------
 * エレベーター かご室の4面壁 + 鏡を描画するコンポーネント。
 *
 * カメラの向きに応じて、視線を遮る側の壁を自動的にフェードアウトさせる。
 * (後ろから見たとき背面壁と鏡が邪魔にならないようにする)
 *
 * 正面壁(ドア側)は README の指示に従い、ドア開口の左右袖壁 + 欄間の
 * 3枚に分割している。ドア本体は CabinDoor コンポーネントが描画する。
 * ------------------------------------------------------------
 */

export interface CabinSize {
  w: number;
  h: number;
  d: number;
}

interface CabinWallsProps {
  /** かご室の内寸 (m) */
  size?: CabinSize;
  /** 正面/背面壁の色 */
  wallColor?: string;
  /** 側面壁の色 */
  sideWallColor?: string;
  /** 天井の色 */
  ceilingColor?: string;
  /** 床の色 */
  floorColor?: string;
  /** 鏡の最大不透明度 (0..1) */
  mirrorOpacityMax?: number;
  /** フェード開始角度 (rad, デフォルト 45°) */
  fadeThreshold?: number;
  /** 背面壁に鏡を表示するか */
  showMirror?: boolean;
  /** 正面壁のドア開口幅 (m) */
  doorWidth?: number;
  /** 正面壁のドア開口高 (m) */
  doorHeight?: number;
}

type MatRef = RefObject<THREE.MeshStandardMaterial | null>;

interface WallInfo {
  refs: MatRef[];
  normal: THREE.Vector3;
  mirror?: RefObject<THREE.MeshPhysicalMaterial | null>;
}

export function CabinWalls({
  size = { w: 1.4, h: 2.3, d: 1.35 },
  wallColor = '#f0e8d8',
  sideWallColor = '#d0b088',
  ceilingColor = '#ffffff',
  floorColor = '#2a2a2a',
  mirrorOpacityMax = 0.55,
  fadeThreshold = Math.PI / 4, // 45°
  showMirror = true,
  doorWidth = 0.75,
  doorHeight = 2.0,
}: CabinWallsProps) {
  const { camera } = useThree();

  // 各壁の materialRef
  const backWallRef = useRef<THREE.MeshStandardMaterial>(null);
  const frontLeftRef = useRef<THREE.MeshStandardMaterial>(null);
  const frontRightRef = useRef<THREE.MeshStandardMaterial>(null);
  const transomRef = useRef<THREE.MeshStandardMaterial>(null);
  const leftWallRef = useRef<THREE.MeshStandardMaterial>(null);
  const rightWallRef = useRef<THREE.MeshStandardMaterial>(null);
  const mirrorRef = useRef<THREE.MeshPhysicalMaterial>(null);

  // かごの中心を仮に (0, h/2, 0) と定義
  const cabinCenter = useMemo(
    () => new THREE.Vector3(0, size.h / 2, 0),
    [size.h]
  );

  // 各壁の外向き法線 (ワールド座標基準)
  // 背面壁: -Z 側にあるので法線は -Z 方向 (かご外に向かって)
  // 正面壁(ドア側): +Z (袖壁2枚 + 欄間で共有)
  // 左壁: -X, 右壁: +X
  const wallInfos = useMemo<WallInfo[]>(
    () => [
      { refs: [backWallRef], normal: new THREE.Vector3(0, 0, -1), mirror: mirrorRef },
      { refs: [frontLeftRef, frontRightRef, transomRef], normal: new THREE.Vector3(0, 0, 1) },
      { refs: [leftWallRef], normal: new THREE.Vector3(-1, 0, 0) },
      { refs: [rightWallRef], normal: new THREE.Vector3(1, 0, 0) },
    ],
    []
  );

  // 一時ベクトル (毎フレーム new しない)
  const camDir = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    // カメラからかご中心へのベクトル
    camDir.copy(cabinCenter).sub(camera.position).normalize();

    wallInfos.forEach(({ refs, normal, mirror }) => {
      // カメラの視線方向と壁の外向き法線の内積
      //   dot > 0 : カメラが壁の外側から中心を見ている
      //             = カメラと中心の間にその壁がある = フェードすべき
      //   dot < 0 : カメラが壁の内側にいる = 通常表示
      const dot = camDir.dot(normal);

      // dot を [0..1] のフェード係数に変換
      //   dot <= 0        : 完全表示 (opacity 1)
      //   dot >= sin(threshold) : ほぼ透明
      //   その間は線形補間
      const t = Math.max(0, Math.min(1, dot / Math.sin(fadeThreshold)));
      const targetOpacity = 1 - t;

      refs.forEach((ref) => {
        if (!ref.current) return;
        // なめらかに追従 (lerp)
        const mat = ref.current;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.15);
        // 完全に透明に近いときは描画スキップ
        mat.visible = mat.opacity > 0.02;
      });

      // 対応する鏡も同じフェード
      if (mirror?.current) {
        const mirrorTarget = targetOpacity * mirrorOpacityMax;
        mirror.current.opacity = THREE.MathUtils.lerp(
          mirror.current.opacity,
          mirrorTarget,
          0.15
        );
        mirror.current.visible = mirror.current.opacity > 0.02;
      }
    });
  });

  const { w, h, d } = size;

  // 正面袖壁の寸法
  const wingW = (w - doorWidth) / 2;
  const transomH = h - doorHeight;

  return (
    <group>
      {/* ─── 床 ─── */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[w, 0.02, d]} />
        <meshStandardMaterial color={floorColor} roughness={0.7} metalness={0.1} />
      </mesh>

      {/* ─── 天井 ─── */}
      <mesh position={[0, h, 0]}>
        <boxGeometry args={[w, 0.02, d]} />
        <meshStandardMaterial
          color={ceilingColor}
          emissive={ceilingColor}
          emissiveIntensity={0.15}
          roughness={0.6}
        />
      </mesh>

      {/* ─── 背面壁 (奥・-Z 側) ─── */}
      <mesh position={[0, h / 2, -d / 2]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          ref={backWallRef}
          color={wallColor}
          roughness={0.5}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ─── 背面の鏡 (背面壁の少し内側に浮かせる) ─── */}
      {showMirror && (
        <mesh position={[0, h * 0.55, -d / 2 + 0.005]}>
          <planeGeometry args={[w * 0.5, h * 0.55]} />
          <meshPhysicalMaterial
            ref={mirrorRef}
            color="#ffffff"
            roughness={0.05}
            metalness={0.9}
            transparent
            opacity={mirrorOpacityMax}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* ─── 正面壁 (ドア側・+Z): 左右の袖壁 + 欄間 ─── */}
      <mesh position={[-(doorWidth / 2 + wingW / 2), h / 2, d / 2]}>
        <planeGeometry args={[wingW, h]} />
        <meshStandardMaterial
          ref={frontLeftRef}
          color={wallColor}
          roughness={0.5}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[doorWidth / 2 + wingW / 2, h / 2, d / 2]}>
        <planeGeometry args={[wingW, h]} />
        <meshStandardMaterial
          ref={frontRightRef}
          color={wallColor}
          roughness={0.5}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
        />
      </mesh>
      {transomH > 0.01 && (
        <mesh position={[0, doorHeight + transomH / 2, d / 2]}>
          <planeGeometry args={[doorWidth, transomH]} />
          <meshStandardMaterial
            ref={transomRef}
            color={wallColor}
            roughness={0.5}
            transparent
            opacity={1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* ─── 左壁 ─── */}
      <mesh position={[-w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial
          ref={leftWallRef}
          color={sideWallColor}
          roughness={0.5}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ─── 右壁 ─── */}
      <mesh position={[w / 2, h / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial
          ref={rightWallRef}
          color={sideWallColor}
          roughness={0.5}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
