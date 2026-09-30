import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'xs' | 'sm' | 'md';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-sm shadow-indigo-900/40 border border-indigo-400/20',
  secondary: 'text-zinc-200 bg-white/[0.05] hover:bg-white/[0.09] border border-line',
  ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]',
  danger: 'text-rose-200 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30',
  success: 'text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'h-6 px-2 text-[10.5px] gap-1 rounded-md',
  sm: 'h-7 px-2.5 text-[11px] gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-xs gap-2 rounded-xl',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'sm',
  icon,
  className = '',
  children,
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    className={`inline-flex items-center justify-center font-medium whitespace-nowrap transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    {...rest}
  >
    {icon}
    {children}
  </button>
);

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`rounded-xl bg-surface-2 border border-line ${className}`}>{children}</div>
);

type ChipTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
const CHIP_TONES: Record<ChipTone, string> = {
  neutral: 'bg-white/[0.06] text-zinc-300 border-line',
  accent: 'bg-indigo-500/15 text-indigo-200 border-indigo-400/25',
  success: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25',
  warning: 'bg-amber-500/15 text-amber-200 border-amber-400/25',
  danger: 'bg-rose-500/15 text-rose-200 border-rose-400/25',
};

export const Chip: React.FC<{ tone?: ChipTone; className?: string; title?: string; children: React.ReactNode }> = ({
  tone = 'neutral',
  className = '',
  title,
  children,
}) => (
  <span
    title={title}
    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-medium ${CHIP_TONES[tone]} ${className}`}
  >
    {children}
  </span>
);

/**
 * A section with a one-line summary that expands on click. Keeps the input view
 * short: set-up details stay out of the way until needed. `bare` renders it as a
 * row inside a <CardGroup> instead of as its own card.
 */
export const Collapsible: React.FC<{
  icon: React.ReactNode;
  title: string;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  actions?: React.ReactNode;
  bare?: boolean;
  children: React.ReactNode;
}> = ({ icon, title, summary, defaultOpen = false, open, onOpenChange, actions, bare = false, children }) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  const toggle = () => {
    onOpenChange?.(!isOpen);
    if (open === undefined) setInternalOpen(!isOpen);
  };

  const content = (
    <>
      <div className={`flex items-center gap-2 px-3 py-2 ${isOpen ? '' : 'hover:bg-white/[0.02]'}`}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          className="flex-1 min-w-0 flex items-center gap-2 text-left group"
        >
          <span className="shrink-0 w-4 flex justify-center text-zinc-400 group-hover:text-indigo-300 transition-colors">{icon}</span>
          <span className="text-[11.5px] font-medium text-zinc-100 shrink-0">{title}</span>
          {summary && <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-500">{summary}</span>}
          <ChevronDown
            className={`ml-auto w-3.5 h-3.5 shrink-0 text-zinc-600 group-hover:text-zinc-300 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {actions}
      </div>
      {isOpen && <div className="px-3 pb-3 pt-0.5 flex flex-col gap-2 animate-panel-in">{children}</div>}
    </>
  );

  return bare ? <div>{content}</div> : <Card className="overflow-hidden">{content}</Card>;
};

/** Stacks bare Collapsible rows in one card with hairline dividers. */
export const CardGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Card className="overflow-hidden divide-y divide-line">{children}</Card>
);

export const inputClass =
  'w-full px-2.5 py-1.5 bg-surface-0 border border-line rounded-lg text-[11px] text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/15 transition-colors';

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.floor(diffHour / 24)}d ago`;
}
