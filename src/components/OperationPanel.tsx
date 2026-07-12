import { FloorIndicator } from './FloorIndicator';
import { FloorButton } from './FloorButton';
import type { Direction, ButtonStyle, ButtonColor, CopFinish } from '../lib/elevatorConfig';
import { MAX_FLOOR, MIN_FLOOR } from '../lib/elevatorConfig';

interface Props {
  currentFloor: number;
  direction: Direction;
  activeButtons: number[];
  buttonStyle: ButtonStyle;
  buttonColor: ButtonColor;
  copFinish: CopFinish;
  onPressFloor: (floor: number) => void;
  onPressDoorOpen: () => void;
  onPressDoorClose: () => void;
  onPressAlarm: () => void;
}

export function OperationPanel({
  currentFloor,
  direction,
  activeButtons,
  buttonStyle,
  buttonColor,
  copFinish,
  onPressFloor,
  onPressDoorOpen,
  onPressDoorClose,
  onPressAlarm,
}: Props) {
  const floors: number[] = [];
  for (let f = MIN_FLOOR; f <= MAX_FLOOR; f++) {
    floors.push(f);
  }

  const rows: [number, number | null][] = [];
  for (let i = 0; i < floors.length; i += 2) {
    rows.push([floors[i], floors[i + 1] ?? null]);
  }
  rows.reverse();

  const copBg = copFinish === 'hairline'
    ? 'bg-gradient-to-b from-zinc-600 via-zinc-700 to-zinc-800'
    : 'bg-gradient-to-b from-zinc-500 via-zinc-600 to-zinc-700';

  const copTexture = copFinish === 'hairline'
    ? 'bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,rgba(255,255,255,0.03)_1px,rgba(255,255,255,0.03)_2px)]'
    : '';

  return (
    <div className={`relative rounded-xl p-4 flex flex-col items-center gap-3 shadow-2xl border border-zinc-500/30 ${copBg}`}>
      {/* Hairline texture overlay */}
      {copTexture && <div className={`absolute inset-0 rounded-xl ${copTexture} pointer-events-none`} />}

      {/* Floor indicator (LCD) */}
      <div className="w-full max-w-[180px] relative z-10">
        <FloorIndicator currentFloor={currentFloor} direction={direction} />
      </div>

      {/* Floor buttons - staggered 2-column (reverse-Z) */}
      <div className="flex flex-col gap-2 relative z-10 py-2">
        {rows.map(([left, right]) => (
          <div key={left} className="flex gap-3 justify-center">
            <FloorButton
              floor={left}
              isActive={activeButtons.includes(left)}
              isCurrent={currentFloor === left}
              buttonStyle={buttonStyle}
              buttonColor={buttonColor}
              onPress={onPressFloor}
            />
            {right !== null ? (
              <FloorButton
                floor={right}
                isActive={activeButtons.includes(right)}
                isCurrent={currentFloor === right}
                buttonStyle={buttonStyle}
                buttonColor={buttonColor}
                onPress={onPressFloor}
              />
            ) : (
              <div className={buttonStyle === 'large' ? 'w-12 h-12' : 'w-10 h-10'} />
            )}
          </div>
        ))}
      </div>

      {/* Separator */}
      <div className="w-full h-px bg-zinc-500/40 relative z-10" />

      {/* Door open/close buttons */}
      <div className="flex gap-4 relative z-10">
        {/* Open button */}
        <button
          onClick={onPressDoorOpen}
          className="w-14 h-10 rounded-lg bg-zinc-600 hover:bg-zinc-500 active:scale-95 transition-all flex items-center justify-center border border-zinc-500/50 cursor-pointer select-none"
          aria-label="ドアを開く"
        >
          <svg width="24" height="16" viewBox="0 0 24 16" className="text-zinc-200">
            <polygon points="4,8 9,2 9,14" fill="currentColor" />
            <polygon points="20,8 15,2 15,14" fill="currentColor" />
            <line x1="0" y1="1" x2="0" y2="15" stroke="currentColor" strokeWidth="2" />
            <line x1="24" y1="1" x2="24" y2="15" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>

        {/* Close button */}
        <button
          onClick={onPressDoorClose}
          className="w-14 h-10 rounded-lg bg-zinc-600 hover:bg-zinc-500 active:scale-95 transition-all flex items-center justify-center border border-zinc-500/50 cursor-pointer select-none"
          aria-label="ドアを閉める"
        >
          <svg width="24" height="16" viewBox="0 0 24 16" className="text-zinc-200">
            <polygon points="9,8 4,2 4,14" fill="currentColor" />
            <polygon points="15,8 20,2 20,14" fill="currentColor" />
            <line x1="0" y1="1" x2="0" y2="15" stroke="currentColor" strokeWidth="2" />
            <line x1="24" y1="1" x2="24" y2="15" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>

      {/* Separator */}
      <div className="w-full h-px bg-zinc-500/40 relative z-10" />

      {/* Alarm button */}
      <button
        onClick={onPressAlarm}
        className="w-10 h-10 rounded-full bg-red-900/80 hover:bg-red-800 active:scale-95 transition-all flex items-center justify-center border border-red-700/50 cursor-pointer select-none relative z-10"
        aria-label="非常ベル"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-300">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
