#!/usr/bin/env python3
"""実機アナウンス録音をフレーズごとに切り出し、public/voice/ に配置するツール。

使い方:
  python3 scripts/slice_voice.py <録音ファイル.mp3> [--gap 0.35] [--out public/voice]

  1. 無音区間 (既定 0.35 秒以上) でフレーズに分割し、clip01.mp3, clip02.mp3 ... を出力
  2. public/voice/manifest.json の雛形を出力（各キューにどのクリップを使うか
     ファイル名を割り当てて保存すると、アプリが自動で録音音声を再生します）

必要: ffmpeg / numpy / scipy

注意: 録音の権利はご自身でご確認ください。公開サイトへ配置すると
      その音声が配布されることになります (このリポジトリの .gitignore は
      public/voice/*.mp3 を既定で除外しています)。
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src", help="録音ファイル (mp3/wav 等 ffmpeg が読める形式)")
    ap.add_argument("--gap", type=float, default=0.35, help="フレーズ区切りとみなす無音秒数")
    ap.add_argument("--min", type=float, default=0.4, help="フレーズ最小長 (秒)")
    ap.add_argument("--out", default="public/voice", help="出力ディレクトリ")
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav_path = tmp.name
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", args.src, "-ac", "1", "-ar", "22050", wav_path],
        check=True,
    )

    sr, x = wavfile.read(wav_path)
    x = x.astype(np.float64) / 32768.0

    frame = int(0.025 * sr)
    hop = int(0.010 * sr)
    n = (len(x) - frame) // hop
    rms = np.array([np.sqrt(np.mean(x[i * hop : i * hop + frame] ** 2)) for i in range(n)])
    thresh = np.percentile(rms, 60) * 0.28
    speech = rms > thresh

    phrases = []
    in_p = False
    start = 0.0
    last = 0.0
    for i, s in enumerate(speech):
        t = i * 0.010
        if s:
            if not in_p:
                in_p, start = True, t
            last = t
        elif in_p and (t - last) > args.gap:
            if last - start >= args.min:
                phrases.append((start, last))
            in_p = False
    if in_p and last - start >= args.min:
        phrases.append((start, last))

    if not phrases:
        sys.exit("フレーズを検出できませんでした。--gap を調整してください。")

    files = []
    for i, (s, e) in enumerate(phrases, 1):
        name = f"clip{i:02d}.mp3"
        subprocess.run(
            [
                "ffmpeg", "-y", "-v", "error",
                "-ss", f"{max(0, s - 0.12):.3f}", "-t", f"{e - s + 0.25:.3f}",
                "-i", args.src, "-c:a", "libmp3lame", "-q:a", "4", str(out / name),
            ],
            check=True,
        )
        files.append((name, e - s))
        print(f"  {name}  {s:6.2f}s - {e:6.2f}s  ({e - s:.2f}s)")

    manifest = out / "manifest.json"
    if not manifest.exists():
        template = {
            "_comment": "各キューに使うクリップのファイル名を割り当ててください。不要なキューは削除可。",
            "_clips": [f"{n} ({d:.1f}s)" for n, d in files],
            "up": files[0][0] if files else "",
            "down": files[1][0] if len(files) > 1 else "",
            "close": files[2][0] if len(files) > 2 else "",
            "open": files[3][0] if len(files) > 3 else "",
            "arrive": files[4][0] if len(files) > 4 else "",
        }
        manifest.write_text(json.dumps(template, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\nmanifest 雛形を書き出しました: {manifest}")
        print("各クリップを聴いて、up/down/close/open/arrive の割り当てを修正してください。")
    else:
        print(f"\n既存の {manifest} は保持しました。")


if __name__ == "__main__":
    main()
