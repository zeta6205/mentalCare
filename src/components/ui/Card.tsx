import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing } from '../../theme';

type CardProps = { children: React.ReactNode; padding?: number; style?: StyleProp<ViewStyle> };

export const Card: React.FC<CardProps> = ({ children, padding = spacing.md, style }) => (
  <View style={[styles.card, { padding }, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, ...shadows.card },
});
