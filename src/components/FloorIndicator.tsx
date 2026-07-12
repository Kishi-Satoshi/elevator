import type { Direction } from '../lib/elevatorConfig';
import { getFloorTheme } from '../lib/floorThemes';

interface Props {
  currentFloor: number;
  direction: Direction;
  isMoving?: boolean;
}

export function FloorIndicator({ currentFloor, direction, isMoving = false }: Props) {
  const theme = getFloorTheme(currentFloor);

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-black border border-zinc-600 shadow-inner">
      <div className="px-4 pt-2.5 pb-1 flex items-center justify-between">
        {/* Direction arrows */}
        <div className="flex flex-col gap-0.5">
          <svg
            width="14"
            height="10"
            viewBox="0 0 14 10"
            className={`transition-colors duration-300 ${
              direction === 'up' ? 'text-amber-400' : 'text-zinc-800'
            } ${direction === 'up' && isMoving ? 'animate-pulse' : ''}`}
          >
            <polygon points="7,0 14,10 0,10" fill="currentColor" />
          </svg>
          <svg
            width="14"
            height="10"
            viewBox="0 0 14 10"
            className={`transition-colors duration-300 ${
              direction === 'down' ? 'text-amber-400' : 'text-zinc-800'
            } ${direction === 'down' && isMoving ? 'animate-pulse' : ''}`}
          >
            <polygon points="7,10 0,0 14,0" fill="currentColor" />
          </svg>
        </div>

        {/* Floor number */}
        <div className="font-mono text-3xl font-bold text-amber-400 tabular-nums tracking-wider drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
          {currentFloor.toString().padStart(2, ' ')}
          <span className="text-base ml-0.5 text-amber-400/70">F</span>
        </div>
      </div>

      {/* Floor guide name (百貨店フロアガイド) */}
      <div className="px-2 pb-1.5 text-center">
        <span className="text-[9px] font-semibold text-amber-200/85 tracking-wide truncate block">
          {theme.name}
        </span>
      </div>

      {/* LCD scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />
    </div>
  );
}
