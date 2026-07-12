import { useState, useCallback, useRef, useEffect } from 'react';
import type { DoorState, Direction, AnnouncementLang } from '../lib/elevatorConfig';
import { TIMING } from '../lib/elevatorConfig';
import { useElevatorAudio } from './useElevatorAudio';

interface UseElevatorOptions {
  language: AnnouncementLang;
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
        const floorsToTravel = Math.abs(target - cur);
        const step = dir === 'up' ? 1 : -1;

        setIsMoving(true);

        for (let i = 1; i <= floorsToTravel; i++) {
          addTimer(() => {
            audio.playMovingHum();
          }, (i - 1) * TIMING.floorTravel);

          addTimer(() => {
            const newFloor = cur + step * i;
            currentFloorRef.current = newFloor;
            setCurrentFloor(newFloor);
          }, i * TIMING.floorTravel - 200);
        }

        addTimer(() => {
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
        }, floorsToTravel * TIMING.floorTravel);
      }, 800);
    }, 500 + TIMING.doorOpenClose);
  }, [audio, addTimer]);

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
    pressFloorButton,
    pressDoorOpen,
    pressDoorClose,
    pressAlarm,
  };
}
