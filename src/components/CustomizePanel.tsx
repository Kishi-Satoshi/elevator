import type { ElevatorConfig, ElevatorTheme, ButtonStyle, ButtonColor, CopFinish, AnnouncementLang } from '../lib/elevatorConfig';
import { BUTTON_STYLE_LABELS, BUTTON_COLOR_VALUES, COP_FINISH_LABELS } from '../lib/elevatorConfig';
import { STYLE_PRESETS } from '../lib/stylePresets';

interface Props {
  config: ElevatorConfig;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (config: ElevatorConfig) => void;
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-slate-100 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export function CustomizePanel({ config, isOpen, onToggle, onChange }: Props) {
  const themeOptions = (Object.keys(STYLE_PRESETS) as ElevatorTheme[]).map((k) => ({
    value: k,
    label: STYLE_PRESETS[k].label,
  }));

  const buttonStyleOptions = (Object.keys(BUTTON_STYLE_LABELS) as ButtonStyle[]).map((k) => ({
    value: k,
    label: BUTTON_STYLE_LABELS[k],
  }));

  const buttonColorOptions = (Object.keys(BUTTON_COLOR_VALUES) as ButtonColor[]).map((k) => ({
    value: k,
    label: BUTTON_COLOR_VALUES[k].label,
  }));

  const copFinishOptions = (Object.keys(COP_FINISH_LABELS) as CopFinish[]).map((k) => ({
    value: k,
    label: COP_FINISH_LABELS[k],
  }));

  const langOptions: { value: AnnouncementLang; label: string }[] = [
    { value: 'ja', label: '日本語' },
    { value: 'en', label: 'English' },
  ];

  return (
    <div className="w-full max-w-md mx-auto">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/15 transition-colors cursor-pointer select-none"
      >
        <span className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 dark:text-slate-400">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          カスタマイズ
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-2 p-4 rounded-xl bg-white/80 dark:bg-white/10 border border-gray-200 dark:border-white/10 space-y-4">
          <Select
            label="かごテーマ"
            value={config.theme}
            options={themeOptions}
            onChange={(v) => onChange({ ...config, theme: v })}
          />
          <Select
            label="ボタンスタイル"
            value={config.buttonStyle}
            options={buttonStyleOptions}
            onChange={(v) => onChange({ ...config, buttonStyle: v })}
          />
          <Select
            label="ボタン発光色"
            value={config.buttonColor}
            options={buttonColorOptions}
            onChange={(v) => onChange({ ...config, buttonColor: v })}
          />
          <Select
            label="COP仕上げ"
            value={config.copFinish}
            options={copFinishOptions}
            onChange={(v) => onChange({ ...config, copFinish: v })}
          />
          <Select
            label="アナウンス言語"
            value={config.language}
            options={langOptions}
            onChange={(v) => onChange({ ...config, language: v })}
          />
        </div>
      )}
    </div>
  );
}
