import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, FeedbackVariant, radius, spacing, typography } from '../../theme';
import { IconButton } from './IconButton';

type FeedbackBannerProps = { variant: FeedbackVariant; message: string; title?: string; onDismiss?: () => void };

const icons: Record<FeedbackVariant, React.ComponentProps<typeof MaterialIcons>['name']> = {
  success: 'check-circle-outline', warning: 'warning-amber', error: 'error-outline', info: 'info-outline',
};

export const FeedbackBanner: React.FC<FeedbackBannerProps> = ({ variant, message, title, onDismiss }) => {
  const tone = colors.semantic[variant];
  return <View style={[styles.container, { backgroundColor: tone.background, borderColor: tone.border }]} accessibilityRole="alert">
    <MaterialIcons name={icons[variant]} size={24} color={tone.main} />
    <View style={styles.content}>
      {title ? <Text style={[styles.title, { color: tone.main }]}>{title}</Text> : null}
      <Text style={styles.message}>{message}</Text>
    </View>
    {onDismiss ? <IconButton icon={<MaterialIcons name="close" size={20} color={tone.main} />} accessibilityLabel="Fechar aviso" onPress={onDismiss} size={36} /> : null}
  </View>;
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: radius.input, padding: spacing.sm },
  content: { flex: 1, marginLeft: spacing.xs, paddingTop: 1 },
  title: { ...typography.bodySmallSemibold },
  message: { ...typography.bodySmall, color: colors.textPrimary, marginTop: spacing.xxs },
});
