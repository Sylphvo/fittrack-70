export interface ThemePalette {
  mode: 'dark' | 'light';
  bg: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  emerald: string;
  emeraldDim: string;
  emeraldBorder: string;
  amber: string;
  amberDim: string;
  amberBorder: string;
  cyan: string;
  cyanDim: string;
  cyanBorder: string;
  coral: string;
  coralDim: string;
  coralBorder: string;
  onAccent: string;
  white: string;
  black: string;
}

export const DARK_COLORS: ThemePalette = {
  mode: 'dark',
  bg: '#090B0E',
  surface: '#12161C',
  surfaceElevated: '#181E27',
  surfaceMuted: '#0E1217',
  border: '#202833',
  borderStrong: '#2E3949',

  textPrimary: '#F4F7FA',
  textSecondary: '#9AA8BA',
  textMuted: '#69778A',

  emerald: '#22C55E',
  emeraldDim: 'rgba(34, 197, 94, 0.14)',
  emeraldBorder: 'rgba(34, 197, 94, 0.35)',

  amber: '#F59E0B',
  amberDim: 'rgba(245, 158, 11, 0.14)',
  amberBorder: 'rgba(245, 158, 11, 0.35)',

  cyan: '#06B6D4',
  cyanDim: 'rgba(6, 182, 212, 0.14)',
  cyanBorder: 'rgba(6, 182, 212, 0.35)',

  coral: '#F43F5E',
  coralDim: 'rgba(244, 63, 94, 0.14)',
  coralBorder: 'rgba(244, 63, 94, 0.35)',

  onAccent: '#04120A',
  white: '#FFFFFF',
  black: '#000000',
};

export const LIGHT_COLORS: ThemePalette = {
  mode: 'light',
  bg: '#F3F6FA',
  surface: '#FFFFFF',
  surfaceElevated: '#EBF0F6',
  surfaceMuted: '#F8FAFC',
  border: '#DCE3EC',
  borderStrong: '#C5D0DF',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',

  emerald: '#16A34A',
  emeraldDim: 'rgba(22, 163, 74, 0.12)',
  emeraldBorder: 'rgba(22, 163, 74, 0.35)',

  amber: '#D97706',
  amberDim: 'rgba(217, 119, 6, 0.12)',
  amberBorder: 'rgba(217, 119, 6, 0.35)',

  cyan: '#0891B2',
  cyanDim: 'rgba(8, 145, 178, 0.12)',
  cyanBorder: 'rgba(8, 145, 178, 0.35)',

  coral: '#E11D48',
  coralDim: 'rgba(225, 29, 72, 0.12)',
  coralBorder: 'rgba(225, 29, 72, 0.35)',

  onAccent: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000',
};

// Backwards-compatible default export for static fallbacks
export const COLORS = DARK_COLORS;

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
} as const;

export const RADIUS = {
  sm: 10,
  md: 16,
  lg: 22,
  full: 999,
} as const;

export const TYPO = {
  heroNumber: {
    fontSize: 38,
    fontWeight: '800' as const,
    letterSpacing: -1,
    fontVariant: ['tabular-nums' as const],
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  micro: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
  },
};
