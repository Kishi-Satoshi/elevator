import type { ButtonStyle, ButtonColor } from '../lib/elevatorConfig';
import { BUTTON_COLOR_VALUES } from '../lib/elevatorConfig';

interface Props {
  floor: number;
  isActive: boolean;
  isCurrent: boolean;
  buttonStyle: ButtonStyle;
  buttonColor: ButtonColor;
  onPress: (floor: number) => void;
}

export function FloorButton({ floor, isActive, isCurrent, buttonStyle, buttonColor, onPress }: Props) {
  const colorValues = BUTTON_COLOR_VALUES[buttonColor];

  const sizeClass = buttonStyle === 'large' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm';

  const baseStyle = buttonStyle === 'crystal'
    ? 'bg-gradient-to-b from-white/30 to-white/10 backdrop-blur-sm border border-white/20'
    : buttonStyle === 'stainless'
      ? 'bg-gradient-to-b from-zinc-300 to-zinc-400 dark:from-zinc-500 dark:to-zinc-600 border border-zinc-400 dark:border-zinc-500'
      : 'bg-gradient-to-b from-zinc-300 to-zinc-400 dark:from-zinc-500 dark:to-zinc-600 border-2 border-zinc-400 dark:border-zinc-500';

  const activeGlow = isActive ? `${colorValues.active} shadow-[0_0_12px_3px] ${colorValues.glow} border-transparent` : '';
  const currentRing = isCurrent && !isActive ? 'ring-2 ring-emerald-400/50' : '';

  return (
    <button
      onClick={() => onPress(floor)}
      className={`
        ${sizeClass}
        rounded-full flex items-center justify-center
        font-bold font-mono
        transition-all duration-150
        active:scale-90
        select-none cursor-pointer
        ${isActive ? `text-black ${activeGlow}` : `text-zinc-200 ${baseStyle}`}
        ${currentRing}
        hover:brightness-125
      `}
      aria-label={`${floor}階`}
      aria-pressed={isActive}
    >
      {floor}
    </button>
  );
}
