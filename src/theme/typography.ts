import type { TextStyle } from 'react-native';

type TypographyStyle = Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight'>;

export const typography: Record<
  'display' | 'h1' | 'h2' | 'body' | 'bodySemibold' | 'bodySmall' | 'bodySmallSemibold' | 'caption' | 'captionSemibold',
  TypographyStyle
> = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodySemibold: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  bodySmallSemibold: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  captionSemibold: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
};
