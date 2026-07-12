import type { ElevatorTheme } from './elevatorConfig';

/**
 * かご室4スタイルのカラープリセット (CabinWalls README 準拠)
 * LUXURY / NATURAL / COMFORT / MODERN
 */
export interface CabinStylePreset {
  wallColor: string;
  sideWallColor: string;
  ceilingColor: string;
  floorColor: string;
  label: string;
}

export const STYLE_PRESETS: Record<ElevatorTheme, CabinStylePreset> = {
  LUXURY: {
    wallColor: '#4a4038',
    sideWallColor: '#d0c8b8',
    ceilingColor: '#2a2520',
    floorColor: '#1a1a1a',
    label: 'ラグジュアリー',
  },
  NATURAL: {
    wallColor: '#f4f0e4',
    sideWallColor: '#d8b888',
    ceilingColor: '#ffffff',
    floorColor: '#3a3a3a',
    label: 'ナチュラル',
  },
  COMFORT: {
    wallColor: '#f8f4ea',
    sideWallColor: '#e4c8a0',
    ceilingColor: '#faf5e8',
    floorColor: '#c8b090',
    label: 'コンフォート',
  },
  MODERN: {
    wallColor: '#6a7080',
    sideWallColor: '#b8bcc4',
    ceilingColor: '#f8f8fa',
    floorColor: '#2a2a2e',
    label: 'モダン',
  },
};
