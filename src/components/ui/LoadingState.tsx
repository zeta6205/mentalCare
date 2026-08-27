import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

type LoadingStateProps = { message?: string; fullScreen?: boolean };

export const LoadingState: React.FC<LoadingStateProps> = ({ message, fullScreen = true }) => (
  <View style={[styles.container, fullScreen && styles.fullScreen]} accessibilityRole="progressbar" accessibilityLabel={message ?? 'Carregando'}>
    <ActivityIndicator color={colors.primary} size="large" />
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  fullScreen: { flex: 1 },
  message: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
});
