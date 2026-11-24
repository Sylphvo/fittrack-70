export const COLORS = {
  // OLED Athletic Obsidian Palette (No AI purple/blue gradients)
  bg: '#090B0E',
  surface: '#12161C',
  surfaceElevated: '#181E27',
  surfaceMuted: '#0E1217',
  border: '#202833',
  borderStrong: '#2E3949',

  // Typography hierarchy (WCAG AA+ on dark obsidian)
  textPrimary: '#F4F7FA',
  textSecondary: '#9AA8BA',
  textMuted: '#69778A',

  // Semantic accents
  emerald: '#22C55E',       // In-zone calories, completed workout, weight loss
  emeraldDim: 'rgba(34, 197, 94, 0.14)',
  emeraldBorder: 'rgba(34, 197, 94, 0.35)',

  amber: '#F59E0B',         // Protein target, cardio sprint phase, caution
  amberDim: 'rgba(245, 158, 11, 0.14)',
  amberBorder: 'rgba(245, 158, 11, 0.35)',

  cyan: '#06B6D4',          // Hydration 3000ml & electrolytes
  cyanDim: 'rgba(6, 182, 212, 0.14)',
  cyanBorder: 'rgba(6, 182, 212, 0.35)',

  coral: '#F43F5E',         // Over calorie ceiling (> 1500 kcal)
  coralDim: 'rgba(244, 63, 94, 0.14)',
  coralBorder: 'rgba(244, 63, 94, 0.35)',

  white: '#FFFFFF',
  black: '#000000',
} as const;

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
