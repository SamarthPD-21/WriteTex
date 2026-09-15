export const colors = {
  bg: {
    primary: '#1e1e2e',
    secondary: '#252537',
    tertiary: '#2d2d44',
    hover: '#363652',
    input: '#181825',
  },
  accent: {
    DEFAULT: '#7c5cfc',
    hover: '#6a4de8',
    light: '#9b82fd',
    muted: 'rgba(124, 92, 252, 0.15)',
    gradient: 'linear-gradient(135deg, #7c5cfc, #a78bfa)',
  },
  text: {
    primary: '#e4e4ef',
    secondary: '#9595b0',
    muted: '#636384',
    inverse: '#ffffff',
  },
  diff: {
    addBg: '#133524',
    addText: '#4ade80',
    addBorder: '#1e5e3a',
    delBg: '#3a171c',
    delText: '#f87171',
    delBorder: '#64222a',
  },
  border: {
    subtle: '#2d2d44',
    DEFAULT: '#3d3d5c',
    focus: '#7c5cfc',
  },
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  },
} as const;

export const layout = {
  panel: {
    width: 380,
    minWidth: 320,
    maxWidth: 520,
    maxHeight: 640,
    borderRadius: 14,
  },
  fab: {
    height: 38,
    borderRadius: 19,
    bottom: 24,
    right: 24,
  },
} as const;
