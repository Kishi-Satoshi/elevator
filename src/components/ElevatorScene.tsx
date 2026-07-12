import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { CabinWalls } from './CabinWalls';
import { CabinDoor } from './CabinDoor';
import { OperationPanel } from './OperationPanel';
import { STYLE_PRESETS } from '../lib/stylePresets';
import type {
  ElevatorTheme,
  ButtonStyle,
  ButtonColor,
  CopFinish,
  DoorState,
  Direction,
} from '../lib/elevatorConfig';

/** かご室の内寸 (m) */
const CABIN = { w: 1.4, h: 2.3, d: 1.35 };
/** ドア開口 (m) */
const DOOR = { width: 0.75, height: 2.0 };

interface SceneProps {
  theme: ElevatorTheme;
  buttonStyle: ButtonStyle;
  buttonColor: ButtonColor;
  copFinish: CopFinish;
  currentFloor: number;
  direction: Direction;
  doorState: DoorState;
  isMoving: boolean;
  activeButtons: number[];
  onPressFloor: (floor: number) => void;
  onPressDoorOpen: () => void;
  onPressDoorClose: () => void;
  onPressAlarm: () => void;
}

/** 走行中にかご全体を微振動させるグループ */
function VibratingGroup({ isMoving, children }: { isMoving: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const target = isMoving ? Math.sin(clock.elapsedTime * 42) * 0.0025 : 0;
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, target, 0.3);
  });

  return <group ref={ref}>{children}</group>;
}

/** ドアの向こうに見える乗場 (ホール) */
function HallView({ currentFloor, direction }: { currentFloor: number; direction: Direction }) {
  const hallZ = CABIN.d / 2;

  return (
    <group>
      {/* ホール正面壁 (廊下の奥) */}
      <mesh position={[0, 1.4, hallZ + 1.8]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[5, 2.8]} />
        <meshStandardMaterial color="#d8cfc0" roughness={0.8} />
      </mesh>

      {/* ホール床 */}
      <mesh position={[0, 0.005, hallZ + 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 1.8]} />
        <meshStandardMaterial color="#a89e90" roughness={0.9} />
      </mesh>

      {/* ホール天井 */}
      <mesh position={[0, 2.5, hallZ + 0.9]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 1.8]} />
        <meshStandardMaterial color="#e8e4dc" roughness={0.9} />
      </mesh>

      {/* ホール照明 */}
      <pointLight position={[0, 2.35, hallZ + 0.9]} intensity={1.5} color="#fff8e8" decay={1.8} />

      {/* ホールランタン (階数表示) */}
      <Html
        transform
        occlude
        position={[0, DOOR.height + 0.16, hallZ + 0.68]}
        rotation={[0, Math.PI, 0]}
        distanceFactor={0.5}
        zIndexRange={[30, 0]}
        style={{ backfaceVisibility: 'hidden', pointerEvents: 'none' }}
      >
        <div className="flex items-center gap-2 bg-black rounded px-3 py-1 border border-zinc-600">
          <svg width="10" height="8" viewBox="0 0 10 8" className={direction === 'up' ? 'text-emerald-400' : 'text-zinc-700'}>
            <polygon points="5,0 10,8 0,8" fill="currentColor" />
          </svg>
          <span className="font-mono text-xl font-bold text-amber-400 tabular-nums">
            {currentFloor}
          </span>
          <svg width="10" height="8" viewBox="0 0 10 8" className={direction === 'down' ? 'text-emerald-400' : 'text-zinc-700'}>
            <polygon points="5,8 0,0 10,0" fill="currentColor" />
          </svg>
        </div>
      </Html>
    </group>
  );
}

export function ElevatorScene({
  theme,
  buttonStyle,
  buttonColor,
  copFinish,
  currentFloor,
  direction,
  doorState,
  isMoving,
  activeButtons,
  onPressFloor,
  onPressDoorOpen,
  onPressDoorClose,
  onPressAlarm,
}: SceneProps) {
  const preset = STYLE_PRESETS[theme];

  return (
    <Canvas camera={{ position: [0.25, 1.5, -0.3], fov: 70 }} dpr={[1, 2]}>
      {/* 照明 */}
      <ambientLight intensity={0.6} />
      <pointLight position={[0, CABIN.h - 0.18, 0]} intensity={3.2} color="#fff8e8" decay={1.6} />
      <pointLight position={[0, 2.3, CABIN.d / 2 + 0.5]} intensity={2.5} color="#fff4e0" decay={1.6} />

      {/* 乗場 (ホール) */}
      <HallView currentFloor={currentFloor} direction={direction} />

      {/* かご室 (走行中は微振動) */}
      <VibratingGroup isMoving={isMoving}>
        {/* 4面壁 + 鏡 (カメラ位置に応じて自動フェード) */}
        <CabinWalls
          size={CABIN}
          wallColor={preset.wallColor}
          sideWallColor={preset.sideWallColor}
          ceilingColor={preset.ceilingColor}
          floorColor={preset.floorColor}
          doorWidth={DOOR.width}
          doorHeight={DOOR.height}
        />

        {/* 中央開きドア */}
        <CabinDoor
          doorState={doorState}
          width={DOOR.width}
          height={DOOR.height}
          z={CABIN.d / 2}
          cabinCenterY={CABIN.h / 2}
        />

        {/* 操作盤 (COP) — ドア左側の袖壁に設置 */}
        <Html
          transform
          position={[-0.5, 1.28, CABIN.d / 2 - 0.02]}
          rotation={[0, Math.PI, 0]}
          distanceFactor={0.29}
          zIndexRange={[40, 0]}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="w-[220px]">
            <OperationPanel
              currentFloor={currentFloor}
              direction={direction}
              activeButtons={activeButtons}
              buttonStyle={buttonStyle}
              buttonColor={buttonColor}
              copFinish={copFinish}
              onPressFloor={onPressFloor}
              onPressDoorOpen={onPressDoorOpen}
              onPressDoorClose={onPressDoorClose}
              onPressAlarm={onPressAlarm}
            />
          </div>
        </Html>
      </VibratingGroup>

      {/* カメラ操作: ドラッグで見回し / スクロールでズーム */}
      <OrbitControls
        makeDefault
        target={[0, 1.35, 0.45]}
        enablePan={false}
        minDistance={0.15}
        maxDistance={4.5}
      />
    </Canvas>
  );
}
