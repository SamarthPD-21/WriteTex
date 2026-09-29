import React, { useState } from 'react';
import {
  BasePreset,
  COVER_LETTER_SECTION_PRESETS,
  COVER_LETTER_TONE_PRESETS,
  RESUME_ACTION_PRESETS,
  RESUME_ROLE_PRESETS,
} from '../../prompts/presets';
import { DocumentMode } from '../../messaging/types';

interface PresetBarProps {
  docMode: DocumentMode;
  activePresetId: string | null;
  onSelect: (preset: BasePreset | null) => void;
}

const TABS: Record<DocumentMode, { id: string; label: string; presets: BasePreset[] }[]> = {
  resume: [
    { id: 'actions', label: 'Polish', presets: RESUME_ACTION_PRESETS },
    { id: 'roles', label: 'Tailor for role', presets: RESUME_ROLE_PRESETS },
  ],
  cover_letter: [
    { id: 'sections', label: 'Write', presets: COVER_LETTER_SECTION_PRESETS },
    { id: 'tones', label: 'Tone', presets: COVER_LETTER_TONE_PRESETS },
  ],
};

const COLLAPSED_COUNT = 6;

/** One-click instructions, grouped by intent. */
export const PresetBar: React.FC<PresetBarProps> = ({ docMode, activePresetId, onSelect }) => {
  const tabs = TABS[docMode];
  const [tabId, setTabId] = useState(tabs[0].id);
  const [expanded, setExpanded] = useState(false);
  const tab = tabs.find((t) => t.id === tabId) || tabs[0];
  const presets = expanded ? tab.presets : tab.presets.slice(0, COLLAPSED_COUNT);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTabId(t.id);
              setExpanded(false);
            }}
            className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition-colors ${
              t.id === tab.id ? 'bg-white/[0.08] text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
        {tab.presets.length > COLLAPSED_COUNT && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-300"
          >
            {expanded ? 'Fewer' : `All ${tab.presets.length}`}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map((preset) => {
          const active = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              title={preset.description}
              onClick={() => onSelect(active ? null : preset)}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-medium flex items-center gap-1 border transition-colors ${
                active
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-surface-2 border-line text-zinc-300 hover:text-white hover:border-indigo-500/40'
              }`}
            >
              {preset.icon && <span aria-hidden="true">{preset.icon}</span>}
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
