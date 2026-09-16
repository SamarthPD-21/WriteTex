import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Sparkles, Cpu, Zap, Brain, Layers } from 'lucide-react';
import { AVAILABLE_MODELS, ModelInfo, AIProviderId, ModelBadge } from '../../messaging/types';

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (provider: AIProviderId, modelId: string) => void;
  className?: string;
}

const PROVIDER_NAMES: Record<AIProviderId, string> = {
  meta: 'Meta AI',
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Claude (Anthropic)',
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AIProviderId | 'all'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find active model info across all providers
  let activeModelInfo: ModelInfo | undefined;
  for (const p of Object.keys(AVAILABLE_MODELS) as AIProviderId[]) {
    const found = AVAILABLE_MODELS[p]?.find((m) => m.id === selectedModel);
    if (found) {
      activeModelInfo = found;
      break;
    }
  }

  const displayName = activeModelInfo?.name || selectedModel;

  // Shadow DOM-safe click outside handler using e.composedPath()
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const path = e.composedPath ? e.composedPath() : [];
      if (dropdownRef.current && !path.includes(dropdownRef.current)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (provider: AIProviderId, modelId: string) => {
    onSelectModel(provider, modelId);
    setIsOpen(false);
  };

  const renderBadge = (badge?: ModelBadge) => {
    if (!badge) return null;
    let badgeClass = 'bg-purple-950/70 text-purple-300 border-purple-800/50';
    if (badge === 'Efficient') {
      badgeClass = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/50';
    } else if (badge === 'Fast') {
      badgeClass = 'bg-cyan-950/70 text-cyan-300 border-cyan-800/50';
    } else if (badge === 'Reasoning') {
      badgeClass = 'bg-amber-950/70 text-amber-300 border-amber-800/50';
    } else if (badge === 'Latest') {
      badgeClass = 'bg-violet-950/70 text-violet-300 border-violet-800/50';
    }

    return (
      <span
        className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium tracking-wide uppercase border ${badgeClass}`}
      >
        {badge}
      </span>
    );
  };

  const providersToShow: AIProviderId[] =
    activeTab === 'all'
      ? (['gemini', 'meta', 'openai', 'anthropic'] as AIProviderId[])
      : [activeTab];

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-primary bg-bg-secondary hover:bg-bg-tertiary border border-border hover:border-accent/40 rounded-xl transition-all duration-150 shadow-sm active:scale-95"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
        <span className="truncate max-w-[145px] font-semibold text-[11.5px]">{displayName}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-text-muted transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute bottom-full mb-2 left-0 z-50 w-72 p-2 bg-[#1b1b28]/98 border border-border/80 rounded-2xl shadow-panel backdrop-blur-xl animate-panel-in flex flex-col gap-2 ring-1 ring-white/10"
        >
          {/* Header & Filter Tabs */}
          <div className="flex items-center justify-between px-1 pt-0.5 pb-1 border-b border-border-subtle">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-accent" />
              Select AI Model
            </span>
          </div>

          {/* Quick Provider Filters */}
          <div className="flex items-center gap-1 px-0.5 overflow-x-auto no-scrollbar">
            {(['all', 'gemini', 'meta', 'openai', 'anthropic'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setActiveTab(tab);
                }}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-bg-secondary text-text-muted hover:text-text-primary'
                }`}
              >
                {tab === 'all'
                  ? 'All'
                  : tab === 'gemini'
                  ? 'Gemini'
                  : tab === 'meta'
                  ? 'Meta'
                  : tab === 'openai'
                  ? 'OpenAI'
                  : 'Claude'}
              </button>
            ))}
          </div>

          {/* Model List */}
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 no-scrollbar">
            {providersToShow.map((providerKey) => {
              const models = AVAILABLE_MODELS[providerKey] || [];
              return (
                <div key={providerKey} className="flex flex-col gap-1">
                  <div className="px-1.5 pt-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    {providerKey === 'gemini' && <Cpu className="w-3 h-3 text-blue-400" />}
                    {providerKey === 'meta' && <Zap className="w-3 h-3 text-indigo-400" />}
                    {providerKey === 'openai' && <Layers className="w-3 h-3 text-emerald-400" />}
                    {providerKey === 'anthropic' && <Brain className="w-3 h-3 text-amber-400" />}
                    <span>{PROVIDER_NAMES[providerKey]}</span>
                  </div>

                  {models.map((model) => {
                    const isSelected = model.id === selectedModel;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleSelect(model.provider, model.id);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(model.provider, model.id);
                        }}
                        className={`w-full flex items-start justify-between px-2.5 py-1.5 rounded-xl text-left transition-all duration-150 ${
                          isSelected
                            ? 'bg-accent/25 border border-accent/50 text-white font-medium shadow-sm ring-1 ring-accent/30'
                            : 'hover:bg-bg-tertiary/80 text-text-primary border border-transparent'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold truncate">{model.name}</span>
                            {renderBadge(model.badge)}
                          </div>
                          {model.description && (
                            <span className="text-[10px] text-text-muted leading-tight line-clamp-1">
                              {model.description}
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <div className="shrink-0 p-0.5 rounded-full bg-accent text-white mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
