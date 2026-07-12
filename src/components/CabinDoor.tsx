import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { DoorState } from '../lib/elevatorConfig';

/**
 * CabinDoor
 * ------------------------------------------------------------
 * 中央開き2枚パネルのステンレスドア。
 * doorState に応じてパネルをスライドアニメーションさせる。
 *
 * CabinWalls の正面壁と同じロジックで、カメラが正面(+Z)外側に
 * 回り込んだときはドアもフェードして内部を視認できるようにする。
 * ------------------------------------------------------------
 */

interface CabinDoorProps {
  doorState: DoorState;
  /** ドア開口幅 (m) */
  width?: number;
  /** ドア開口高 (m) */
  height?: number;
  /** 正面壁の z 位置 (かご奥行 d / 2) */
  z?: number;
  /** かご中心の高さ (フェード判定用) */
  cabinCenterY?: number;
  /** フェード開始角度 (rad) */
  fadeThreshold?: number;
}

export function CabinDoor({
  doorState,
  width = 0.75,
  height = 2.0,
  z = 0.675,
  cabinCenterY = 1.15,
  fadeThreshold = Math.PI / 4,
}: CabinDoorProps) {
  const { camera } = useThree();

  const leftPanelRef = useRef<THREE.Mesh>(null);
  const rightPanelRef = useRef<THREE.Mesh>(null);
  const leftMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const rightMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const cabinCenter = useMemo(() => new THREE.Vector3(0, cabinCenterY, 0), [cabinCenterY]);
  const camDir = useMemo(() => new THREE.Vector3(), []);
  const normal = useMemo(() => new THREE.Vector3(0, 0, 1), []);

  // 閉時: パネル中心 ±width/4 / 開時: 袖壁の裏に引き込む
  const closedX = width / 4 + 0.002;
  const openX = width * 0.71;

  useFrame((_, delta) => {
    const opening = doorState === 'open' || doorState === 'opening';
    const targetX = opening ? openX : closedX;

    if (leftPanelRef.current) {
      leftPanelRef.current.position.x = THREE.MathUtils.damp(
        leftPanelRef.current.position.x, -targetX, 3, delta
      );
    }
    if (rightPanelRef.current) {
      rightPanelRef.current.position.x = THREE.MathUtils.damp(
        rightPanelRef.current.position.x, targetX, 3, delta
      );
    }

    // 正面壁と同じフェード判定
    camDir.copy(cabinCenter).sub(camera.position).normalize();
    const dot = camDir.dot(normal);
    const t = Math.max(0, Math.min(1, dot / Math.sin(fadeThreshold)));
    const targetOpacity = 1 - t;

    [leftMatRef, rightMatRef].forEach((ref) => {
      if (!ref.current) return;
      ref.current.opacity = THREE.MathUtils.lerp(ref.current.opacity, targetOpacity, 0.15);
      ref.current.visible = ref.current.opacity > 0.02;
    });
  });

  const panelW = width / 2 - 0.004;

  return (
    <group position={[0, 0, z + 0.03]}>
      {/* 左パネル */}
      <mesh ref={leftPanelRef} position={[-closedX, height / 2, 0]}>
        <boxGeometry args={[panelW, height, 0.04]} />
        <meshStandardMaterial
          ref={leftMatRef}
          color="#aeb4ba"
          metalness={0.85}
          roughness={0.25}
          transparent
          opacity={1}
        />
      </mesh>

      {/* 右パネル */}
      <mesh ref={rightPanelRef} position={[closedX, height / 2, 0]}>
        <boxGeometry args={[panelW, height, 0.04]} />
        <meshStandardMaterial
          ref={rightMatRef}
          color="#aeb4ba"
          metalness={0.85}
          roughness={0.25}
          transparent
          opacity={1}
        />
      </mesh>
    </group>
  );
}
