/**
 * floorThemes
 * ------------------------------------------------------------
 * 百貨店フロアガイド。停止階ごとにドアの外のホール演出
 * (照明・内装色・什器) と売場アナウンスを切り替えるための定義。
 *
 * カラーはカタログのCUD配慮パレット (アイボリー/グレージュ/
 * ウォールナット + 若草/オレンジ/ブルーグレー/ネイビー/マルーン)
 * を基調にフロアごとの雰囲気を構成している。
 * ------------------------------------------------------------
 */

/** ホール什器のレイアウト原型 */
export type HallArchetype =
  | 'counters'   // ガラスカウンター什器 (化粧品・宝飾・サロン)
  | 'racks'      // ハンガーラック + マネキン (衣料)
  | 'shelves'    // 陳列棚 (書籍・雑貨・スポーツ)
  | 'tables'     // テーブル席 + ペンダント照明 (飲食)
  | 'living'     // ソファ + ローテーブル (家具・ラウンジ)
  | 'plaza'      // バナー + ステージ (催事・呉服)
  | 'garden';    // プランター + 樹木 (屋上庭園)

export interface FloorTheme {
  /** 表示名 (日本語) */
  name: string;
  /** 表示名 (英語) */
  nameEn: string;
  /** LCD用短縮名 */
  short: string;
  /** 音声読み (日本語かな) — 「◯◯うりばでございます」に接続 */
  readJa: string;
  /** 音声読み (英語) */
  readEn: string;
  /** ホール壁色 */
  wall: string;
  /** アクセント色 (帯・什器・サイン) */
  accent: string;
  /** ホール床色 */
  floor: string;
  /** ホール天井色 */
  ceiling: string;
  /** 照明色 */
  light: string;
  /** 照明強度 (基準 1.0) */
  intensity: number;
  /** 什器レイアウト */
  archetype: HallArchetype;
}

export const FLOOR_THEMES: Record<number, FloorTheme> = {
  1: {
    name: '化粧品・ラグジュアリーブティック', nameEn: 'Cosmetics & Luxury Boutiques', short: '化粧品',
    readJa: 'けしょうひん、ラグジュアリーブティック',
    readEn: 'Cosmetics and luxury boutiques',
    wall: '#f5f1e8', accent: '#c9a44c', floor: '#e8e2d4', ceiling: '#faf7f0',
    light: '#fff4dd', intensity: 1.25, archetype: 'counters',
  },
  2: {
    name: '婦人服・シューズ', nameEn: "Ladies' Fashion & Shoes", short: '婦人服',
    readJa: 'ふじんふく、シューズ',
    readEn: "Ladies' fashion and shoes",
    wall: '#f2ece2', accent: '#c98a96', floor: '#d8cfc0', ceiling: '#f8f4ec',
    light: '#fff0e2', intensity: 1.1, archetype: 'racks',
  },
  3: {
    name: '婦人服・ハンドバッグ', nameEn: "Ladies' Fashion & Handbags", short: 'バッグ',
    readJa: 'ふじんふく、ハンドバッグ',
    readEn: "Ladies' fashion and handbags",
    wall: '#e8e0d4', accent: '#7a2233', floor: '#cfc5b4', ceiling: '#f4efe6',
    light: '#ffeedd', intensity: 1.05, archetype: 'racks',
  },
  4: {
    name: '紳士服・ビジネスウェア', nameEn: "Men's Suits & Business Wear", short: '紳士服',
    readJa: 'しんしふく、ビジネスウェア',
    readEn: "Men's suits and business wear",
    wall: '#4c4f58', accent: '#1e3a5f', floor: '#3a3c42', ceiling: '#5c5f68',
    light: '#e8ecf4', intensity: 0.85, archetype: 'racks',
  },
  5: {
    name: '時計・宝飾・メガネ', nameEn: 'Watches, Jewelry & Eyewear', short: '宝飾',
    readJa: 'とけい、ほうしょく、メガネ',
    readEn: 'Watches, jewelry and eyewear',
    wall: '#2a2724', accent: '#d4af37', floor: '#242220', ceiling: '#1e1c1a',
    light: '#ffe9c0', intensity: 0.7, archetype: 'counters',
  },
  6: {
    name: 'ベビー・こども服・おもちゃ', nameEn: "Baby, Kids' Wear & Toys", short: 'こども',
    readJa: 'ベビー、こどもふく、おもちゃ',
    readEn: "Baby and kids' wear, and toys",
    wall: '#faf6e8', accent: '#a8c84c', floor: '#f0e4c8', ceiling: '#fdfaf0',
    light: '#fff8e0', intensity: 1.3, archetype: 'racks',
  },
  7: {
    name: '書籍・文具・ホビー', nameEn: 'Books, Stationery & Hobbies', short: '書籍',
    readJa: 'しょせき、ぶんぐ、ホビー',
    readEn: 'Books, stationery and hobbies',
    wall: '#e4d8c0', accent: '#4a6741', floor: '#b8a488', ceiling: '#efe8d8',
    light: '#fff2d8', intensity: 1.0, archetype: 'shelves',
  },
  8: {
    name: 'キッチン・生活雑貨', nameEn: 'Kitchen & Household Goods', short: '生活雑貨',
    readJa: 'キッチン、せいかつざっか',
    readEn: 'Kitchen and household goods',
    wall: '#f4f0e8', accent: '#c86a3c', floor: '#ddd6c8', ceiling: '#f8f5ee',
    light: '#fff6e6', intensity: 1.15, archetype: 'shelves',
  },
  9: {
    name: '家具・インテリア', nameEn: 'Furniture & Interior', short: '家具',
    readJa: 'かぐ、インテリア',
    readEn: 'Furniture and interior',
    wall: '#5a4636', accent: '#b8925c', floor: '#463830', ceiling: '#3e332a',
    light: '#ffdfb0', intensity: 0.75, archetype: 'living',
  },
  10: {
    name: '呉服・美術・宝飾サロン', nameEn: 'Kimono, Fine Arts & Gallery', short: '呉服・美術',
    readJa: 'ごふく、びじゅつ、ほうしょくサロン',
    readEn: 'Kimono, fine arts and gallery',
    wall: '#5c2430', accent: '#c9a44c', floor: '#4a3c34', ceiling: '#443036',
    light: '#ffe4c4', intensity: 0.8, archetype: 'plaza',
  },
  11: {
    name: 'スポーツ・アウトドア', nameEn: 'Sports & Outdoor', short: 'スポーツ',
    readJa: 'スポーツ、アウトドア',
    readEn: 'Sports and outdoor',
    wall: '#e8ecf0', accent: '#2464b4', floor: '#c8ccd4', ceiling: '#f2f4f8',
    light: '#f0f6ff', intensity: 1.2, archetype: 'shelves',
  },
  12: {
    name: '旅行用品・トラベルサロン', nameEn: 'Travel Goods & Salon', short: '旅行用品',
    readJa: 'りょこうようひん、トラベルサロン',
    readEn: 'Travel goods and travel salon',
    wall: '#dce4e8', accent: '#e88c3c', floor: '#bcc4cc', ceiling: '#ecf1f4',
    light: '#fef4e4', intensity: 1.05, archetype: 'shelves',
  },
  13: {
    name: '催事場・イベントホール', nameEn: 'Event Hall', short: '催事場',
    readJa: 'さいじじょう、イベントホール',
    readEn: 'The event hall',
    wall: '#f6ede0', accent: '#c83c3c', floor: '#e0d4c0', ceiling: '#faf4ea',
    light: '#fff2d0', intensity: 1.35, archetype: 'plaza',
  },
  14: {
    name: 'レストラン街「和の膳」', nameEn: 'Japanese Dining Floor', short: '和食',
    readJa: 'レストランがい、わのぜん',
    readEn: 'The Japanese dining floor',
    wall: '#3c342c', accent: '#28405c', floor: '#322c26', ceiling: '#2c2620',
    light: '#ffd9a0', intensity: 0.7, archetype: 'tables',
  },
  15: {
    name: 'レストラン街・カフェテラス', nameEn: 'Restaurants & Cafe Terrace', short: 'カフェ',
    readJa: 'レストランがい、カフェテラス',
    readEn: 'Restaurants and cafe terrace',
    wall: '#f0e8d8', accent: '#8a9a4c', floor: '#d4c8b0', ceiling: '#f6f0e4',
    light: '#ffedcc', intensity: 0.95, archetype: 'tables',
  },
  16: {
    name: '美容室・エステ・クリニック', nameEn: 'Beauty Salon & Clinic', short: '美容',
    readJa: 'びようしつ、エステ、クリニック',
    readEn: 'Beauty salon, spa and clinic',
    wall: '#f2f6f4', accent: '#4ca89a', floor: '#dee6e2', ceiling: '#f8fbfa',
    light: '#f0fbff', intensity: 1.25, archetype: 'counters',
  },
  17: {
    name: 'カルチャースクール', nameEn: 'Culture School', short: 'カルチャー',
    readJa: 'カルチャースクール',
    readEn: 'The culture school',
    wall: '#ece4d8', accent: '#7a6494', floor: '#cabfa8', ceiling: '#f2ecdf',
    light: '#fff4e0', intensity: 1.0, archetype: 'living',
  },
  18: {
    name: 'スカイラウンジ&バー', nameEn: 'Sky Lounge & Bar', short: 'ラウンジ',
    readJa: 'スカイラウンジ、アンド、バー',
    readEn: 'The sky lounge and bar',
    wall: '#1c2434', accent: '#e8a84c', floor: '#181e2a', ceiling: '#141a24',
    light: '#ffcf8e', intensity: 0.55, archetype: 'living',
  },
  19: {
    name: 'スカイレストラン', nameEn: 'Sky Restaurant', short: 'スカイＲ',
    readJa: 'スカイレストラン',
    readEn: 'The sky restaurant',
    wall: '#2c2622', accent: '#c9a44c', floor: '#262220', ceiling: '#201c18',
    light: '#ffd8a4', intensity: 0.65, archetype: 'tables',
  },
  20: {
    name: '屋上庭園・展望テラス', nameEn: 'Rooftop Garden & Observatory', short: '屋上庭園',
    readJa: 'おくじょうていえん、てんぼうテラス',
    readEn: 'The rooftop garden and observatory',
    wall: '#c8dcE8', accent: '#5a9a4c', floor: '#b0a890', ceiling: '#d8ecf8',
    light: '#f4faff', intensity: 1.45, archetype: 'garden',
  },
};

export function getFloorTheme(floor: number): FloorTheme {
  return FLOOR_THEMES[floor] ?? FLOOR_THEMES[1];
}
