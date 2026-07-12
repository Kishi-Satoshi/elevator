import { useState, useCallback, useRef, useEffect } from 'react';
import type { DoorState, Direction, AnnouncementLang } from '../lib/elevatorConfig';
import { TIMING, MOTION } from '../lib/elevatorConfig';
import { useElevatorAudio } from './useElevatorAudio';

interface UseElevatorOptions {
  language: AnnouncementLang;
}

/**
 * 3Dシーン側がrefで毎フレーム読む走行状態。
 * speed: 正規化速度 0..1 / accel: 正規化加速度 -1..1 (符号は進行方向基準)
 */
export interface MotionState {
  speed: number;
  accel: number;
}

export function useElevator({ language }: UseElevatorOptions) {
  const [currentFloor, setCurrentFloor] = useState(1);
  const [direction, setDirection] = useState<Direction>('idle');
  const [doorState, setDoorState] = useState<DoorState>('closed');
  const [isMoving, setIsMoving] = useState(false);
  const [activeButtons, setActiveButtons] = useState<number[]>([]);

  const queueRef = useRef<number[]>([]);
  const processingRef = useRef(false);
  const currentFloorRef = useRef(1);
  const langRef = useRef(language);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef = useRef(0);
  const motionRef = useRef<MotionState>({ speed: 0, accel: 0 });

  useEffect(() => {
    langRef.current = language;
  }, [language]);

  const audio = useElevatorAudio();

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const addTimer = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }, []);

  /**
   * ジャーク制限つきS字プロファイルで from → to へ走行する。
   * 加減速区間は正弦波ランプ (jerk が連続) で、実機のような
   * 滑らかな乗り心地を再現する。毎フレーム motionRef を更新し、
   * 走行音・かご振動・インジケーターが速度に追従する。
   */
  const startTravel = useCallback((from: number, to: number, onArrive: () => void) => {
    const dist = Math.abs(to - from);
    const dir = to > from ? 1 : -1;
    const { vMax, accel: A } = MOTION;

    // 正弦波ランプでは加減速距離 = vPeak * tRamp / 2 (台形と同じ)
    let vPeak = vMax;
    let tRamp = vMax / A;
    let tCruise = 0;
    const dRamp = (vMax * tRamp) / 2;
    if (dist < 2 * dRamp) {
      vPeak = Math.sqrt(A * dist);
      tRamp = vPeak / A;
    } else {
      tCruise = (dist - 2 * dRamp) / vMax;
    }
    const tTotal = 2 * tRamp + tCruise;

    audio.startTravelSound();
    const t0 = performance.now();
    let lastFloor = from;

    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      let s: number;
      let v: number;
      let a: number;

      if (t < tRamp) {
        // 加速: v = vPeak/2 * (1 - cos(πt/tRamp))
        const phase = (Math.PI * t) / tRamp;
        v = vPeak * 0.5 * (1 - Math.cos(phase));
        s = vPeak * (t / 2 - (tRamp / (2 * Math.PI)) * Math.sin(phase));
        a = ((vPeak * Math.PI) / (2 * tRamp)) * Math.sin(phase);
      } else if (t < tRamp + tCruise) {
        v = vPeak;
        s = (vPeak * tRamp) / 2 + vPeak * (t - tRamp);
        a = 0;
      } else if (t < tTotal) {
        const td = t - tRamp - tCruise;
        const phase = (Math.PI * td) / tRamp;
        v = vPeak * 0.5 * (1 + Math.cos(phase));
        s = (vPeak * tRamp) / 2 + vPeak * tCruise
          + vPeak * (td / 2 + (tRamp / (2 * Math.PI)) * Math.sin(phase));
        a = -((vPeak * Math.PI) / (2 * tRamp)) * Math.sin(phase);
      } else {
        motionRef.current.speed = 0;
        motionRef.current.accel = 0;
        audio.stopTravelSound();
        currentFloorRef.current = to;
        setCurrentFloor(to);
        onArrive();
        return;
      }

      const pos = from + dir * s;
      const passing = Math.max(1, Math.round(pos));
      if (passing !== lastFloor) {
        lastFloor = passing;
        currentFloorRef.current = passing;
        setCurrentFloor(passing);
      }
      motionRef.current.speed = v / vMax;
      motionRef.current.accel = (a / A) * dir;
      audio.updateTravelSound(v / vMax);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [audio]);

  const processQueue = useCallback(() => {
    if (processingRef.current) return;
    if (queueRef.current.length === 0) {
      setDirection('idle');
      return;
    }

    processingRef.current = true;
    const target = queueRef.current[0];
    const cur = currentFloorRef.current;

    if (target === cur) {
      queueRef.current.shift();
      setActiveButtons((prev) => prev.filter((f) => f !== target));
      processingRef.current = false;
      processQueue();
      return;
    }

    const dir: Direction = target > cur ? 'up' : 'down';
    setDirection(dir);

    audio.announceDoorClosing(langRef.current);
    addTimer(() => {
      audio.playDoorClose();
      setDoorState('closing');
    }, 500);

    addTimer(() => {
      setDoorState('closed');

      audio.announceDirection(dir, langRef.current);

      addTimer(() => {
        setIsMoving(true);

        startTravel(cur, target, () => {
          setIsMoving(false);

          if (dir === 'up') {
            audio.playUpChime();
          } else {
            audio.playDownChime();
          }

          addTimer(() => {
            audio.announceFloor(target, langRef.current);
          }, 500);

          addTimer(() => {
            audio.playDoorOpen();
            setDoorState('opening');
          }, 800);

          addTimer(() => {
            setDoorState('open');
            queueRef.current.shift();
            setActiveButtons((prev) => prev.filter((f) => f !== target));

            addTimer(() => {
              processingRef.current = false;
              if (queueRef.current.length > 0) {
                processQueue();
              } else {
                setDirection('idle');
              }
            }, TIMING.doorHoldOpen);
          }, 800 + TIMING.doorOpenClose);
        });
      }, 800);
    }, 500 + TIMING.doorOpenClose);
  }, [audio, addTimer, startTravel]);

  const pressFloorButton = useCallback((floor: number) => {
    if (floor === currentFloorRef.current && !processingRef.current) return;
    if (queueRef.current.includes(floor)) return;

    audio.playButtonPress();
    queueRef.current.push(floor);
    setActiveButtons((prev) => [...prev, floor]);

    if (!processingRef.current) {
      processQueue();
    }
  }, [audio, processQueue]);

  const pressDoorOpen = useCallback(() => {
    if (isMoving) return;
    if (doorState === 'open' || doorState === 'opening') return;

    audio.playDoorOpen();
    setDoorState('opening');
    addTimer(() => {
      setDoorState('open');
    }, TIMING.doorOpenClose);
  }, [isMoving, doorState, audio, addTimer]);

  const pressDoorClose = useCallback(() => {
    if (isMoving) return;
    if (doorState === 'closed' || doorState === 'closing') return;

    audio.announceDoorClosing(langRef.current);
    addTimer(() => {
      audio.playDoorClose();
      setDoorState('closing');
      addTimer(() => {
        setDoorState('closed');
      }, TIMING.doorOpenClose);
    }, 500);
  }, [isMoving, doorState, audio, addTimer]);

  const pressAlarm = useCallback(() => {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = i % 2 === 0 ? 800 : 600;
      gain.gain.setValueAtTime(0.15, now + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.2);
      osc.stop(now + (i + 1) * 0.2);
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      cancelAnimationFrame(rafRef.current);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [clearTimers]);

  return {
    currentFloor,
    direction,
    doorState,
    isMoving,
    activeButtons,
    motionRef,
    pressFloorButton,
    pressDoorOpen,
    pressDoorClose,
    pressAlarm,
  };
}
