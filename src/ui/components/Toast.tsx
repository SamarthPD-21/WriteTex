import React from 'react';
import { Check, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  text: string;
  action?: ToastAction;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="absolute top-2 left-2.5 right-2.5 z-50 flex flex-col gap-1 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-lg text-xs shadow-panel animate-panel-in border ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-100 border-emerald-500/30'
              : toast.type === 'error'
              ? 'bg-rose-950/95 text-rose-100 border-rose-500/35'
              : toast.type === 'warning'
              ? 'bg-amber-950/95 text-amber-100 border-amber-500/35'
              : 'bg-surface-3/95 text-zinc-100 border-line-strong'
          }`}
        >
          {toast.type === 'success' && <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />}
          {toast.type === 'error' && <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />}
          {toast.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />}
          {toast.type === 'info' && <Info className="w-3.5 h-3.5 shrink-0 text-indigo-300" />}

          <p className="flex-1 min-w-0 leading-snug break-words text-[11px]">{toast.text}</p>

          {toast.action && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(toast.id);
                toast.action?.onClick();
              }}
              className="shrink-0 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border border-white/15"
            >
              {toast.action.label}
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(toast.id);
            }}
            title="Dismiss"
            className="shrink-0 p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};
