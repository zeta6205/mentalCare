import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { Button } from './Button';

type EmptyStateProps = { icon?: React.ReactNode; title: string; description?: string; action?: { title: string; onPress: () => void } };

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <View style={styles.container} accessibilityRole="text">
    {icon ? <View style={styles.icon}>{icon}</View> : null}
    <Text style={styles.title}>{title}</Text>
    {description ? <Text style={styles.description}>{description}</Text> : null}
    {action ? <Button title={action.title} onPress={action.onPress} style={styles.action} /> : null}
  </View>
);

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  icon: { marginBottom: spacing.sm },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
  description: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  action: { alignSelf: 'center', marginTop: spacing.lg },
});
