import React from 'react';

/** The WriteTex mark: LaTeX braces around an AI spark (same art as the extension icon). */
export const BrandMark: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="wt-mark-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#8b5cf6" />
        <stop offset="1" stopColor="#4338ca" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="url(#wt-mark-bg)" />
    <path d="M11 6.5c-3 0-3.8 1.5-3.8 3.8v2.4c0 1.8-1.1 3-2.7 3.3 1.6.3 2.7 1.5 2.7 3.3v2.4c0 2.3.8 3.8 3.8 3.8" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 6.5c3 0 3.8 1.5 3.8 3.8v2.4c0 1.8 1.1 3 2.7 3.3-1.6.3-2.7 1.5-2.7 3.3v2.4c0 2.3-.8 3.8-3.8 3.8" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 9.5c.8 3.8 1.8 4.8 5.6 5.6-3.8.8-4.8 1.8-5.6 5.6-.8-3.8-1.8-4.8-5.6-5.6 3.8-.8 4.8-1.8 5.6-5.6z" fill="#fde68a" />
  </svg>
);
