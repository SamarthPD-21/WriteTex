import React from 'react';
import { Check, AlertTriangle, XCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="absolute top-3 left-3 right-3 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium shadow-lg backdrop-blur-md transition-all duration-200 animate-panel-in ${
            toast.type === 'success'
              ? 'bg-[#133524]/95 text-[#4ade80] border border-[#1e5e3a]'
              : toast.type === 'error'
              ? 'bg-[#3a171c]/95 text-[#f87171] border border-[#64222a]'
              : toast.type === 'warning'
              ? 'bg-[#3d2c14]/95 text-[#fbbf24] border border-[#6d4d1f]'
              : 'bg-[#252537]/95 text-[#e4e4ef] border border-[#3d3d5c]'
          }`}
          onClick={() => onDismiss(toast.id)}
        >
          {toast.type === 'success' && <Check className="w-4 h-4 shrink-0 text-[#4ade80]" />}
          {toast.type === 'error' && <XCircle className="w-4 h-4 shrink-0 text-[#f87171]" />}
          {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0 text-[#fbbf24]" />}
          {toast.type === 'info' && <Info className="w-4 h-4 shrink-0 text-[#7c5cfc]" />}
          <span className="flex-1 leading-snug">{toast.text}</span>
        </div>
      ))}
    </div>
  );
};
