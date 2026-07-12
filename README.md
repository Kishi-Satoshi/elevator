# AXIEZ-LINKs エレベーターシミュレーター

三菱電機ビルソリューションズの「AXIEZ-LINKs」を模した、3Dエレベーターシミュレーターゲームです。
React Three Fiber によるリアルなかご内ビジュアルで、1〜20階のボタン操作・チャイム・日英音声アナウンスを再現しています。

## 機能

- **3Dかご内ビジュアル**: 4面壁 + 鏡 + 中央開きステンレスドア。カメラの向きに応じて視線を遮る壁が自動フェード
- **操作盤 (COP)**: 1〜20階ボタン (2列千鳥配列) / LCDインジケーター / 開・閉ボタン / 非常ベル
- **走行シミュレーション**: 行先階キュー処理、走行中のかご微振動、ホールランタン表示
- **サウンド**: Web Audio API による三菱風チャイム合成 (上り単音 / 下り二連音)、ドア音、走行音
- **音声アナウンス**: Web Speech API による「◯階でございます」「上に参ります」等。日本語 / English 切替可能
- **カスタマイズ** (localStorage 保存):
  - かごテーマ: ラグジュアリー / ナチュラル / コンフォート / モダン
  - ボタンスタイル: クリスタル / ステンレスクリック / 大形
  - ボタン発光色: アンバー / ブルー / ホワイト
  - 操作盤仕上げ: ヘアライン / 振動仕上げ
  - アナウンス言語: 日本語 / English

## 操作方法

| 操作 | 動作 |
|---|---|
| ドラッグ | かご内を見回す |
| スクロール | ズームイン / アウト |
| 階数ボタン | 行先階を登録 (複数登録可) |
| 開 / 閉ボタン | 停止中のドア開閉 |

## 開発

```bash
npm install
npm run dev      # 開発サーバー起動 → http://localhost:5173
npm run build    # 型チェック + プロダクションビルド
npm run preview  # ビルド成果物のプレビュー
```

## CI / 自動マージ

`.github/workflows/` に2つの GitHub Actions を用意しています。

| ワークフロー | 役割 |
|---|---|
| `ci.yml` | PR と `main` への push で `npm ci` → `npm run build`（型チェック + ビルド）を実行 |
| `auto-merge.yml` | **`auto-merge` ラベル**が付いた PR を、CI 成功後に自動で **Squash マージ** |

### 使い方

1. PR を作成する
2. PR に `auto-merge` ラベルを付ける
3. CI（ビルド）が緑になると自動的に Squash マージされる

CI が失敗している間、または未実行の間はマージされません。ラベルを付けた時点で
既に CI が緑なら即マージ、まだ実行中なら CI 完了時にマージされます。

> **初回セットアップ**: `auto-merge` ラベルがリポジトリに無い場合は、一度だけ
> GitHub の Issues/PR のラベル画面、または `gh label create auto-merge` で作成してください。
> ワークフローの実行には Settings → Actions → General の "Workflow permissions" が
> **Read and write** になっている必要があります。

## スタック

React 19 / TypeScript 5.9 / Vite 7 / Tailwind CSS 4 / three.js + @react-three/fiber + @react-three/drei

## 構成

```
src/
├── App.tsx                    # エントリー (シーン + カスタマイズパネル)
├── components/
│   ├── ElevatorScene.tsx      # 3Dシーン全体 (Canvas / 照明 / ホール / カメラ)
│   ├── CabinWalls.tsx         # かご室4面壁 + 鏡 (カメラ位置で自動フェード)
│   ├── CabinDoor.tsx          # 中央開きドア (スライドアニメーション)
│   ├── OperationPanel.tsx     # 操作盤 (3D空間内にHTML埋め込み)
│   ├── FloorButton.tsx        # 階数ボタン (クリスタル / ステンレス / 大形)
│   ├── FloorIndicator.tsx     # LCD風インジケーター
│   └── CustomizePanel.tsx     # カスタマイズ設定UI
├── hooks/
│   ├── useElevator.ts         # エレベーター状態マシン (階移動 / ドア / キュー)
│   └── useElevatorAudio.ts    # チャイム合成 + 音声アナウンス
└── lib/
    ├── elevatorConfig.ts      # 型定義 / 定数 / 設定の保存・読込
    └── stylePresets.ts        # かごテーマ4種のカラープリセット
```
