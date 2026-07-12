# AXIEZ-LINKs EXPERIENCE — 意匠3Dシミュレーター（非公式）

[![CI](https://github.com/Kishi-Satoshi/elevator/actions/workflows/ci.yml/badge.svg)](https://github.com/Kishi-Satoshi/elevator/actions/workflows/ci.yml)
[![Deploy](https://github.com/Kishi-Satoshi/elevator/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/Kishi-Satoshi/elevator/actions/workflows/deploy-pages.yml)

🔗 **ライブデモ**: https://kishi-satoshi.github.io/elevator/

三菱電機ビルソリューションズ「AXIEZ-LINKs」の公開カタログ情報を参考にした、
かご内意匠と乗り心地を3D空間で体験できる非公式コンフィギュレーターです。
公式ロゴ・実機音声・写真素材は使用していません。

## 体験の流れ

1. **イントロ**: タイプ（P乗用 / R住宅用）と定員（6〜15名）を選択
2. **扉が開く**: ゲート演出とともにかご内へ
3. **カスタマイズ & 乗車**: 右パネルで意匠を変えながら、フロアボタンで実際に乗車

## 機能

### 乗車体験
- 8フロアの行先ボタン（UIパネル / **かご内の3Dボタンも直接クリック可能**・刻印つき）
- 走行シーケンス: 戸閉 → 加減速に追従する走行音・振動 → 階通過表示 → 到着チャイム（上り単音 / 下り二連音）→ 戸開
- **百貨店フロア演出**: 到着階ごとに乗場の内装色・照明・売場名が変わる（1F化粧品 〜 8F屋上庭園）
- 音声アナウンス（日本語 / English / OFF）: 「上へまいります」「5階、レストラン街売場でございます」等。
  実車アナウンス音源の解析値（基本周波数中央値245Hz・ゆったりした話速）に基づく合成音声

### 意匠カスタマイズ
- **スタイルプリセット**: LUXURY / NATURAL / COMFORT / MODERN
- **壁・側板**: 化粧鋼板 / プレミアムウォール / ステンレス（8色）
- **床**: 樹脂タイル / プレミアムフロア（6色）
- **ドア・三方枠・幅木**: 各色（ステンレス / ブラック / シャンパンゴールド / 木目 等）
- **天井・照明**: フラット / ダウンライト白色・電球色 / コーニス間接
- **操作盤**: ステンレスクリック / クリスタル / ブラック / タッチレス（10.1型縦LCD付き）
- **オプション**: 手すり（三方）・鏡
- 定員に応じた**かご寸法スケーリング**、人物モデル配置（少人数〜定員・車いす）で広さを確認

### ビュー
- かご内視点（ドラッグ見回し / ズーム）・俯瞰ビュー
- プリセットアングル: 正面 / 背面 / 操作盤 / 天井 / 床

### 共有・保存
- 仕様サマリー表示、**共有URL**（構成をハッシュに埋め込み）、localStorage への自動保存

## 開発

```bash
npm install
npm run dev      # 開発サーバー → http://localhost:5173
npm run build    # プロダクションビルド (dist/)
npm run preview  # ビルド成果物のプレビュー
```

## スタック

Vanilla JS + three.js（Reflector / RoomEnvironment）+ GSAP + Web Audio API + Web Speech API / Vite 7

```
index.html     # マークアップ + スタイル（イントロ / HUD / カスタマイズパネル）
src/main.js    # 3Dシーン・かご構築・乗車シーケンス・音響/音声・UI 一式
```

## CI / 自動マージ / 自動デプロイ

| ワークフロー | 役割 |
|---|---|
| `ci.yml` | PR と `main` への push で `npm ci` → `npm run build` を実行 |
| `auto-merge.yml` | **`auto-merge` ラベル**付きPRを、CI成功後に自動で Squash マージ。`main` へのマージ後は Pages デプロイを自動起動 |
| `deploy-pages.yml` | `main` への push / 手動 / auto-merge からの起動で GitHub Pages へデプロイ |

PR に `auto-merge` ラベルを付けるだけで、CI → マージ → 公開まで全自動で流れます。

> サブパス（`/elevator/`）配信のため、ビルド時に `VITE_BASE` を渡して Vite の
> `base` を切り替えています。ローカルの `npm run dev` は `/` のままです。
