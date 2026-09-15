import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { AVAILABLE_MODELS, ModelInfo, AIProviderId } from '../../messaging/types';

interface ModelSelectorProps {
  provider: AIProviderId;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  provider,
  selectedModel,
  onSelectModel,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const models: ModelInfo[] = AVAILABLE_MODELS[provider] || [];
  const currentModel = models.find((m) => m.id === selectedModel) || models[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-text-secondary bg-bg-secondary hover:bg-bg-tertiary border border-border rounded-lg transition-colors duration-150"
      >
        <span className="truncate max-w-[130px]">{currentModel?.name || selectedModel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-1 left-0 z-50 w-56 p-1 bg-bg-secondary border border-border rounded-xl shadow-xl backdrop-blur-md animate-panel-in">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            {provider.toUpperCase()} MODELS
          </div>
          {models.map((model) => {
            const isSelected = model.id === selectedModel;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => {
                  onSelectModel(model.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors duration-150 text-left ${
                  isSelected
                    ? 'bg-accent/15 text-accent font-medium'
                    : 'text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                <div className="flex flex-col">
                  <span>{model.name}</span>
                  {model.description && (
                    <span className="text-[10px] text-text-muted leading-tight">{model.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  {model.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                        model.badge === 'Best'
                          ? 'bg-purple-900/60 text-purple-300'
                          : model.badge === 'Fast'
                          ? 'bg-emerald-900/60 text-emerald-300'
                          : 'bg-blue-900/60 text-blue-300'
                      }`}
                    >
                      {model.badge}
                    </span>
                  )}
                  {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
