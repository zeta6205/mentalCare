import type { ViewStyle } from 'react-native';

export const shadows: Record<'card' | 'floating' | 'navigationDock' | 'navigationActive', ViewStyle> = {
  card: {
    elevation: 2,
    shadowColor: '#172B2D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  floating: {
    elevation: 6,
    shadowColor: '#172B2D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
  },
  navigationDock: {
    elevation: 4,
    shadowColor: '#172B2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  navigationActive: {
    elevation: 3,
    shadowColor: '#172B2D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
};
