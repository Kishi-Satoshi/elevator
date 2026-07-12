import { useRef, useCallback, useEffect } from 'react';
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

/**
 * 音声プロファイル。
 * 実車アナウンス音源の解析値から導出:
 *   基本周波数 中央値 245Hz (女声, p10=170 / p90=320)
 *   発話比率 0.62 (落ち着いた間のある話速)
 *   スペクトル重心 ~1.4kHz (柔らかく明るすぎない声質)
 * → 女声ボイスを優先選択し、pitch をやや高め・rate を遅めに設定。
 */
const VOICE_PROFILE = {
  pitch: 1.14,
  rate: 0.88,
  volume: 0.9,
};

/** 日本語女声を優先的に選ぶ (環境により利用可能ボイスが異なる) */
const JA_VOICE_PREFERENCE = [
  'Nanami', 'Kyoko', 'O-Ren', 'Sayaka', 'Haruka', 'Mizuki',
  'Google 日本語', 'Japanese',
];
const EN_VOICE_PREFERENCE = [
  'Samantha', 'Jenny', 'Aria', 'Google US English', 'Zira', 'English',
];

let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices() {
  if ('speechSynthesis' in window) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
}

function pickVoice(lang: AnnouncementLang): SpeechSynthesisVoice | null {
  if (cachedVoices.length === 0) refreshVoices();
  const langPrefix = lang === 'ja' ? 'ja' : 'en';
  const candidates = cachedVoices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  if (candidates.length === 0) return null;
  const prefs = lang === 'ja' ? JA_VOICE_PREFERENCE : EN_VOICE_PREFERENCE;
  for (const pref of prefs) {
    const hit = candidates.find((v) => v.name.includes(pref));
    if (hit) return hit;
  }
  return candidates[0];
}

/**
 * 到着チャイム音。柔らかいベル質感 (基音 + 弱い倍音 + 長めの減衰)。
 * 上り: 単音「ポーン」 / 下り: 二連音「ポン・ポーン」
 */
function playChimeTone(freq: number, duration: number, startTime: number, ctx: AudioContext, volume = 0.22) {
  const partials: [number, number][] = [
    [1, 1.0],      // 基音
    [2.0, 0.18],   // オクターブ
    [2.76, 0.08],  // ベル特有の非整数倍音
  ];
  for (const [ratio, amp] of partials) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * ratio;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume * amp, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

function playNoiseBurst(duration: number, startTime: number, ctx: AudioContext, volume: number, filterFreq = 800) {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;

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

/** 連続走行音のノードセット */
interface TravelSound {
  noiseGain: GainNode;
  noiseFilter: BiquadFilterNode;
  humGain: GainNode;
  hum: OscillatorNode;
  noiseSource: AudioBufferSourceNode;
}

export function useElevatorAudio() {
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const travelRef = useRef<TravelSound | null>(null);

  useEffect(() => {
    refreshVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices);
    }
  }, []);

  const playUpChime = useCallback(() => {
    const ctx = getAudioContext();
    playChimeTone(932, 1.1, ctx.currentTime, ctx);
  }, []);

  const playDownChime = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    playChimeTone(932, 0.5, now, ctx, 0.18);
    playChimeTone(830, 1.1, now + 0.42, ctx);
  }, []);

  const playDoorOpen = useCallback(() => {
    const ctx = getAudioContext();
    playNoiseBurst(1.8, ctx.currentTime, ctx, 0.05, 600);
  }, []);

  const playDoorClose = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    playNoiseBurst(1.8, now, ctx, 0.05, 600);
    // 閉扉終端の軽い接触音
    playNoiseBurst(0.08, now + 1.75, ctx, 0.04, 300);
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

  /**
   * 連続走行音を開始する。速度は updateTravelSound(0..1) で毎フレーム更新。
   * 低域ノイズ (機械/風切り) + 低周波ハム (巻上機) を速度に追従させる。
   */
  const startTravelSound = useCallback(() => {
    const ctx = getAudioContext();
    if (travelRef.current) return;

    // ループする低域ノイズ
    const seconds = 2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      // ブラウンノイズ風 (積分ノイズ) で滑らかな走行音に
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 160;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start();

    const hum = ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 46;
    const humGain = ctx.createGain();
    humGain.gain.value = 0;
    hum.connect(humGain);
    humGain.connect(ctx.destination);
    hum.start();

    travelRef.current = { noiseGain, noiseFilter, humGain, hum, noiseSource };
  }, []);

  /** 走行音の強さを速度 (0..1) に追従させる */
  const updateTravelSound = useCallback((speedNorm: number) => {
    const t = travelRef.current;
    if (!t || !audioCtx) return;
    const now = audioCtx.currentTime;
    t.noiseGain.gain.setTargetAtTime(speedNorm * 0.075, now, 0.08);
    t.noiseFilter.frequency.setTargetAtTime(140 + speedNorm * 420, now, 0.1);
    t.humGain.gain.setTargetAtTime(speedNorm * 0.035, now, 0.08);
    t.hum.frequency.setTargetAtTime(42 + speedNorm * 14, now, 0.1);
  }, []);

  const stopTravelSound = useCallback(() => {
    const t = travelRef.current;
    if (!t || !audioCtx) return;
    const now = audioCtx.currentTime;
    t.noiseGain.gain.setTargetAtTime(0, now, 0.15);
    t.humGain.gain.setTargetAtTime(0, now, 0.15);
    const { noiseSource, hum } = t;
    setTimeout(() => {
      try { noiseSource.stop(); hum.stop(); } catch { /* already stopped */ }
    }, 700);
    travelRef.current = null;
  }, []);

  const speak = useCallback((text: string, lang: AnnouncementLang) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === 'ja' ? 'ja-JP' : 'en-US';
    utter.rate = VOICE_PROFILE.rate;
    utter.pitch = VOICE_PROFILE.pitch;
    utter.volume = VOICE_PROFILE.volume;
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
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
    startTravelSound,
    updateTravelSound,
    stopTravelSound,
    announceFloor,
    announceDirection,
    announceDoorClosing,
  };
}
