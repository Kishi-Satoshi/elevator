export type ElevatorTheme = 'LUXURY' | 'NATURAL' | 'COMFORT' | 'MODERN';
export type ButtonStyle = 'crystal' | 'stainless' | 'large';
export type ButtonColor = 'amber' | 'blue' | 'white';
export type CopFinish = 'hairline' | 'vibration';
export type AnnouncementLang = 'ja' | 'en';
export type DoorState = 'open' | 'opening' | 'closed' | 'closing';
export type Direction = 'up' | 'down' | 'idle';

export interface ElevatorConfig {
  theme: ElevatorTheme;
  buttonStyle: ButtonStyle;
  buttonColor: ButtonColor;
  copFinish: CopFinish;
  language: AnnouncementLang;
}

export interface ElevatorState {
  currentFloor: number;
  targetFloors: number[];
  direction: Direction;
  doorState: DoorState;
  isMoving: boolean;
  activeButtons: number[];
}

export const DEFAULT_CONFIG: ElevatorConfig = {
  theme: 'LUXURY',
  buttonStyle: 'crystal',
  buttonColor: 'amber',
  copFinish: 'hairline',
  language: 'ja',
};

export const MIN_FLOOR = 1;
export const MAX_FLOOR = 20;

export const TIMING = {
  floorTravel: 1500,
  doorOpenClose: 2000,
  doorHoldOpen: 3000,
  announcementDelay: 300,
};

export const BUTTON_COLOR_VALUES: Record<ButtonColor, { active: string; glow: string; label: string }> = {
  amber: { active: 'bg-amber-500', glow: 'shadow-amber-500/60', label: 'アンバー' },
  blue: { active: 'bg-blue-500', glow: 'shadow-blue-500/60', label: 'ブルー' },
  white: { active: 'bg-white', glow: 'shadow-white/60', label: 'ホワイト' },
};

export const BUTTON_STYLE_LABELS: Record<ButtonStyle, string> = {
  crystal: 'クリスタル',
  stainless: 'ステンレスクリック',
  large: '大形60mm',
};

export const COP_FINISH_LABELS: Record<CopFinish, string> = {
  hairline: 'ヘアライン仕上げ',
  vibration: 'バイブレーション仕上げ',
};

const JP_FLOOR_READINGS: Record<number, string> = {
  1: 'いっかい',
  2: 'にかい',
  3: 'さんがい',
  4: 'よんかい',
  5: 'ごかい',
  6: 'ろっかい',
  7: 'ななかい',
  8: 'はちかい',
  9: 'きゅうかい',
  10: 'じゅっかい',
  11: 'じゅういっかい',
  12: 'じゅうにかい',
  13: 'じゅうさんがい',
  14: 'じゅうよんかい',
  15: 'じゅうごかい',
  16: 'じゅうろっかい',
  17: 'じゅうななかい',
  18: 'じゅうはちかい',
  19: 'じゅうきゅうかい',
  20: 'にじゅっかい',
};

const EN_FLOOR_NAMES: Record<number, string> = {
  1: 'First', 2: 'Second', 3: 'Third', 4: 'Fourth', 5: 'Fifth',
  6: 'Sixth', 7: 'Seventh', 8: 'Eighth', 9: 'Ninth', 10: 'Tenth',
  11: 'Eleventh', 12: 'Twelfth', 13: 'Thirteenth', 14: 'Fourteenth', 15: 'Fifteenth',
  16: 'Sixteenth', 17: 'Seventeenth', 18: 'Eighteenth', 19: 'Nineteenth', 20: 'Twentieth',
};

export function getFloorAnnouncement(floor: number, lang: AnnouncementLang): string {
  if (lang === 'ja') {
    return `${JP_FLOOR_READINGS[floor] ?? `${floor}かい`}でございます`;
  }
  return `${EN_FLOOR_NAMES[floor] ?? `Floor ${floor}`} floor`;
}

export function getDirectionAnnouncement(dir: 'up' | 'down', lang: AnnouncementLang): string {
  if (lang === 'ja') {
    return dir === 'up' ? 'うえにまいります' : 'したにまいります';
  }
  return dir === 'up' ? 'Going up' : 'Going down';
}

export function getDoorClosingAnnouncement(lang: AnnouncementLang): string {
  return lang === 'ja' ? 'ドアがしまります' : 'Doors closing';
}

export function loadConfig(): ElevatorConfig {
  try {
    const raw = localStorage.getItem('elevator-customize-v1');
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: ElevatorConfig): void {
  try {
    localStorage.setItem('elevator-customize-v1', JSON.stringify(config));
  } catch { /* ignore */ }
}
