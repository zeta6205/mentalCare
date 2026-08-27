export const colors = {
  brandMint: '#A8EDEA',
  brandPink: '#FED6E3',
  primary: '#007B83',
  primaryTonal: '#E1F7F6',
  background: '#F7FAFA',
  surface: '#FFFFFF',
  border: '#E2EAEB',
  textPrimary: '#172B2D',
  textSecondary: '#5F6D70',
  textOnPrimary: '#FFFFFF',
  textOnDarkMuted: '#C9D4D6',
  navigationDarkSurface: 'rgba(23, 43, 45, 0.92)',
  navigation: {
    glassBackground: 'rgba(255, 255, 255, 0.1)',
    glassDarkBackground: 'rgba(18, 26, 48, 0.14)',
    glassBorder: 'rgba(255, 255, 255, 0.5)',
    glassDarkBorder: 'rgba(230, 238, 255, 0.42)',
    glassTint: 'rgba(231, 245, 255, 0.12)',
    glassDarkTint: 'rgba(25, 36, 70, 0.22)',
    activeSurface: 'rgba(255, 255, 255, 0.28)',
    activeSurfaceDark: 'rgba(255, 255, 255, 0.18)',
  },
  disabled: '#C9D4D6',
  overlay: 'rgba(23, 43, 45, 0.48)',
  semantic: {
    success: { main: '#067647', background: '#ECFDF3', border: '#ABEFC6' },
    warning: { main: '#B54708', background: '#FFFAEB', border: '#FEDF89' },
    error: { main: '#B42318', background: '#FEF3F2', border: '#FECDCA' },
    info: { main: '#175CD3', background: '#EFF8FF', border: '#B2DDFF' },
  },
} as const;

export type FeedbackVariant = keyof typeof colors.semantic;
