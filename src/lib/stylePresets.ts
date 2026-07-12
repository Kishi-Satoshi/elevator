import type { ElevatorTheme } from './elevatorConfig';

/**
 * かご室4スタイルのプリセット。
 * AXIEZ-LINKs カタログの Premium/Deluxe 系意匠を参考に、
 * 配色・天井照明方式・手すり材質・床反射をテーマごとに定義する。
 */

/** 天井照明方式 */
export type CeilingStyle =
  | 'indirect'   // 周縁間接照明 (Premium)
  | 'panel'      // 中央角形フラットパネル
  | 'downlight'  // ダウンライト4灯
  | 'luminous';  // 全面発光天井

/** 手すり材質 */
export type HandrailStyle = 'wood' | 'bronze' | 'steel' | 'flatbar';

export interface CabinStylePreset {
  wallColor: string;
  sideWallColor: string;
  ceilingColor: string;
  floorColor: string;
  /** かご内照明の色 */
  lightColor: string;
  /** かご内照明の強度 (基準 1.0) */
  lightIntensity: number;
  /** 床の鏡面反射の強さ (0..1) */
  floorReflect: number;
  /** 壁の金属感 (0..1) */
  wallMetalness: number;
  /** 壁の粗さ (0..1) */
  wallRoughness: number;
  ceilingStyle: CeilingStyle;
  handrail: HandrailStyle;
  label: string;
}

export const STYLE_PRESETS: Record<ElevatorTheme, CabinStylePreset> = {
  // Premium LUXURY: 濃色横筋パネル + 周縁間接照明 + 濃色石目床
  LUXURY: {
    wallColor: '#3a3632',
    sideWallColor: '#48423c',
    ceilingColor: '#2a2724',
    floorColor: '#1c1a18',
    lightColor: '#ffe8c8',
    lightIntensity: 0.85,
    floorReflect: 0.75,
    wallMetalness: 0.55,
    wallRoughness: 0.38,
    ceilingStyle: 'indirect',
    handrail: 'bronze',
    label: 'ラグジュアリー (Premium)',
  },
  // NATURAL: ライトオーク基調 + ダウンライト + 淡色床
  NATURAL: {
    wallColor: '#e6d4b4',
    sideWallColor: '#d4b988',
    ceilingColor: '#f6efe2',
    floorColor: '#8a7c68',
    lightColor: '#fff0d8',
    lightIntensity: 1.05,
    floorReflect: 0.35,
    wallMetalness: 0.08,
    wallRoughness: 0.55,
    ceilingStyle: 'downlight',
    handrail: 'wood',
    label: 'ナチュラル (木目)',
  },
  // COMFORT: 白基調 + 木目天井アクセント + 全面発光
  COMFORT: {
    wallColor: '#f6f2ea',
    sideWallColor: '#efe8da',
    ceilingColor: '#f0e0c4',
    floorColor: '#c4b49c',
    lightColor: '#fff6e6',
    lightIntensity: 1.15,
    floorReflect: 0.3,
    wallMetalness: 0.05,
    wallRoughness: 0.5,
    ceilingStyle: 'luminous',
    handrail: 'wood',
    label: 'コンフォート (白木調)',
  },
  // MODERN: ステンレス/グレージュ + 中央パネル照明 + グレー床
  MODERN: {
    wallColor: '#9aa0a8',
    sideWallColor: '#b4b9c0',
    ceilingColor: '#eceef2',
    floorColor: '#3c3e44',
    lightColor: '#f2f6fc',
    lightIntensity: 1.1,
    floorReflect: 0.6,
    wallMetalness: 0.7,
    wallRoughness: 0.3,
    ceilingStyle: 'panel',
    handrail: 'steel',
    label: 'モダン (ステンレス)',
  },
};
