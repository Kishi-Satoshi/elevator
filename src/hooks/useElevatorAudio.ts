import { useRef, useCallback } from 'react';
import type { AnnouncementLang } from '../lib/elevatorConfig';
import { getFloorAnnouncement, getDirectionAnnouncement, getDoorClosingAnnouncement } from '../lib/elevatorConfig';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, startTime: number, ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.35, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playNoiseBurst(duration: number, startTime: number, ctx: AudioContext, volume: number) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.05);
  gain.gain.linearRampToValueAtTime(volume * 0.7, startTime + duration * 0.8);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(startTime);
  source.stop(startTime + duration);
}

export function useElevatorAudio() {
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const playUpChime = useCallback(() => {
    const ctx = getAudioContext();
    playTone(932, 0.45, ctx.currentTime, ctx);
  }, []);

  const playDownChime = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    playTone(932, 0.35, now, ctx);
    playTone(830, 0.35, now + 0.38, ctx);
  }, []);

  const playDoorOpen = useCallback(() => {
    const ctx = getAudioContext();
    playNoiseBurst(1.8, ctx.currentTime, ctx, 0.06);
  }, []);

  const playDoorClose = useCallback(() => {
    const ctx = getAudioContext();
    playNoiseBurst(1.8, ctx.currentTime, ctx, 0.06);
  }, []);

  const playButtonPress = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }, []);

  const playMovingHum = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 1.5;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.3);
    gain.gain.setValueAtTime(0.04, now + duration - 0.3);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }, []);

  const speak = useCallback((text: string, lang: AnnouncementLang) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === 'ja' ? 'ja-JP' : 'en-US';
    utter.rate = 0.9;
    utter.pitch = 1.0;
    utter.volume = 0.8;
    speechRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, []);

  const announceFloor = useCallback((floor: number, lang: AnnouncementLang) => {
    speak(getFloorAnnouncement(floor, lang), lang);
  }, [speak]);

  const announceDirection = useCallback((dir: 'up' | 'down', lang: AnnouncementLang) => {
    speak(getDirectionAnnouncement(dir, lang), lang);
  }, [speak]);

  const announceDoorClosing = useCallback((lang: AnnouncementLang) => {
    speak(getDoorClosingAnnouncement(lang), lang);
  }, [speak]);

  return {
    playUpChime,
    playDownChime,
    playDoorOpen,
    playDoorClose,
    playButtonPress,
    playMovingHum,
    announceFloor,
    announceDirection,
    announceDoorClosing,
  };
}
