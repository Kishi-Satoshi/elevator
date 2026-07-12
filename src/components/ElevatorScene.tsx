import { useRef, useEffect } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CabinWalls } from './CabinWalls';
import { CabinDoor } from './CabinDoor';
import { OperationPanel } from './OperationPanel';
import { HallScene } from './HallScene';
import { STYLE_PRESETS } from '../lib/stylePresets';
import { getFloorTheme } from '../lib/floorThemes';
import type { MotionState } from '../hooks/useElevator';
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
  motionRef: RefObject<MotionState>;
  onPressFloor: (floor: number) => void;
  onPressDoorOpen: () => void;
  onPressDoorClose: () => void;
  onPressAlarm: () => void;
}

/**
 * PBR環境光。RoomEnvironment をPMREMで焼き込み、
 * 金属・鏡面材質にリアルな映り込みを与える (外部アセット不要)。
 */
function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    scene.environmentIntensity = 0.45;
    return () => {
      scene.environment = null;
      envTexture.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return null;
}

/**
 * 走行中のかご挙動。速度に応じた微振動 + 加減速時の慣性沈み込みを
 * motionRef (S字プロファイルの速度/加速度) から毎フレーム再現する。
 */
function VibratingGroup({ motionRef, children }: { motionRef: RefObject<MotionState>; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const { speed, accel } = motionRef.current;
    const t = clock.elapsedTime;
    // 微振動: 速度に比例。複数周波数を重ねてレールの継ぎ目感を出す
    const vib = speed * (Math.sin(t * 38) * 0.0016 + Math.sin(t * 61 + 1.3) * 0.0008);
    // 慣性: 上昇加速で床に押し付けられる → かごをわずかに沈める
    const inertia = -accel * 0.006;
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, vib + inertia, 0.35);
    // ごく僅かな横揺れ
    ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, speed * Math.sin(t * 23) * 0.0006, 0.3);
  });

  return <group ref={ref}>{children}</group>;
}

/** ドア上のかご内インジケーター (カタログのドア柱LCD風) */
function DoorTopIndicator({ currentFloor, direction }: { currentFloor: number; direction: Direction }) {
  const short = getFloorTheme(currentFloor).short;
  return (
    <Html
      transform
      position={[0, DOOR.height + 0.16, CABIN.d / 2 - 0.03]}
      rotation={[0, 0, 0]}
      distanceFactor={0.5}
      zIndexRange={[35, 0]}
      style={{ backfaceVisibility: 'hidden', pointerEvents: 'none' }}
    >
      <div className="flex items-center gap-2 bg-black rounded px-3 py-1 border border-zinc-700">
        <svg width="9" height="7" viewBox="0 0 10 8" className={direction === 'up' ? 'text-amber-400' : 'text-zinc-800'}>
          <polygon points="5,0 10,8 0,8" fill="currentColor" />
        </svg>
        <svg width="9" height="7" viewBox="0 0 10 8" className={direction === 'down' ? 'text-amber-400' : 'text-zinc-800'}>
          <polygon points="5,8 0,0 10,0" fill="currentColor" />
        </svg>
        <span className="font-mono text-lg font-bold text-amber-400 tabular-nums">{currentFloor}</span>
        <span className="text-[8px] font-semibold text-amber-200/80 whitespace-nowrap">{short}</span>
      </div>
    </Html>
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
  motionRef,
  onPressFloor,
  onPressDoorOpen,
  onPressDoorClose,
  onPressAlarm,
}: SceneProps) {
  const preset = STYLE_PRESETS[theme];

  return (
    <Canvas camera={{ position: [0.25, 1.5, -0.3], fov: 70 }} dpr={[1, 2]}>
      <color attach="background" args={['#0a0a0c']} />
      <StudioEnvironment />

      {/* かご内照明 (テーマの照明色・強度) */}
      <ambientLight intensity={0.35 * preset.lightIntensity} color={preset.lightColor} />
      <pointLight
        position={[0, CABIN.h - 0.22, 0]}
        intensity={2.8 * preset.lightIntensity}
        color={preset.lightColor}
        decay={1.6}
      />
      <pointLight
        position={[0, 1.6, CABIN.d / 2 - 0.3]}
        intensity={0.7 * preset.lightIntensity}
        color={preset.lightColor}
        decay={1.8}
      />

      {/* 百貨店ホール (停止階のフロアテーマで演出が切り替わる) */}
      <HallScene
        currentFloor={currentFloor}
        direction={direction}
        hallZ={CABIN.d / 2}
        doorHeight={DOOR.height}
      />

      {/* かご室 (走行中はS字プロファイル連動で振動) */}
      <VibratingGroup motionRef={motionRef}>
        <CabinWalls
          size={CABIN}
          preset={preset}
          doorWidth={DOOR.width}
          doorHeight={DOOR.height}
        />

        <CabinDoor
          doorState={doorState}
          width={DOOR.width}
          height={DOOR.height}
          z={CABIN.d / 2}
          cabinCenterY={CABIN.h / 2}
        />

        {/* ドア上インジケーター */}
        <DoorTopIndicator currentFloor={currentFloor} direction={direction} />

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
              isMoving={isMoving}
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
