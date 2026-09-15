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
    <div className="absolute top-2.5 left-2.5 right-2.5 z-50 flex flex-col gap-1.5 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl text-xs shadow-panel backdrop-blur-xl transition-all duration-200 animate-panel-in border ${
            toast.type === 'success'
              ? 'bg-[#102d1f]/95 text-[#86efac] border-[#22c55e]/30 shadow-[#16a34a]/10'
              : toast.type === 'error'
              ? 'bg-[#2a1218]/95 text-[#fca5a5] border-[#ef4444]/35 shadow-[#dc2626]/10'
              : toast.type === 'warning'
              ? 'bg-[#2e200c]/95 text-[#fde047] border-[#f59e0b]/35 shadow-[#d97706]/10'
              : 'bg-[#1e1e2e]/95 text-[#e4e4ef] border-[#7c5cfc]/35 shadow-[#7c5cfc]/10'
          }`}
        >
          {toast.type === 'success' && <Check className="w-4 h-4 shrink-0 text-[#4ade80] mt-0.5" />}
          {toast.type === 'error' && <XCircle className="w-4 h-4 shrink-0 text-[#f87171] mt-0.5" />}
          {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0 text-[#fbbf24] mt-0.5" />}
          {toast.type === 'info' && <Info className="w-4 h-4 shrink-0 text-[#a78bfa] mt-0.5" />}

          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            <p className="leading-snug break-words text-[11.5px] font-normal">{toast.text}</p>

            {toast.action && (
              <div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.action?.onClick();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border border-white/15"
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(toast.id);
            }}
            title="Dismiss"
            className="shrink-0 p-1 -mr-1 -mt-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
