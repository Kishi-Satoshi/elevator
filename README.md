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
