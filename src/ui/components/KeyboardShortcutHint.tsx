import React from 'react';

interface KeyboardShortcutHintProps {
  shortcut: string;
  className?: string;
}

export const KeyboardShortcutHint: React.FC<KeyboardShortcutHintProps> = ({
  shortcut,
  className = '',
}) => {
  return (
    <kbd
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-text-muted bg-bg-primary/70 border border-border-subtle rounded ${className}`}
    >
      {shortcut}
    </kbd>
  );
};
