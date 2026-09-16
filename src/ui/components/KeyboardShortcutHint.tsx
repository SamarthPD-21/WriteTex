import React from 'react';

interface KeyboardShortcutHintProps {
  shortcut: string;
  className?: string;
  variant?: 'default' | 'on-accent';
}

export const KeyboardShortcutHint: React.FC<KeyboardShortcutHintProps> = ({
  shortcut,
  className = '',
  variant = 'default',
}) => {
  const variantStyles =
    variant === 'on-accent'
      ? 'bg-white/15 text-white/90 border-white/20'
      : 'bg-white/[0.06] text-zinc-400 border-white/[0.08]';

  return (
    <kbd
      className={`inline-flex items-center px-1.5 py-0.5 text-[9.5px] font-mono font-semibold border rounded-md shadow-2xs ${variantStyles} ${className}`}
    >
      {shortcut}
    </kbd>
  );
};
