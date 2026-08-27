import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, radius, sizes, spacing, typography } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.brandMint },
  tonal: { backgroundColor: colors.primaryTonal },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.semantic.error.main },
});

const textColors: Record<ButtonVariant, string> = {
  primary: colors.textOnPrimary,
  secondary: colors.textPrimary,
  tonal: colors.primary,
  ghost: colors.primary,
  danger: colors.textOnPrimary,
};

export const Button: React.FC<ButtonProps> = ({
  title, onPress, variant = 'primary', disabled = false, loading = false, leftIcon, rightIcon,
  fullWidth = true, style, accessibilityLabel,
}) => {
  const isDisabled = disabled || loading;
  const textColor = textColors[variant];

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      activeOpacity={0.78}
      disabled={isDisabled}
      onPress={onPress}
      style={[styles.base, variantStyles[variant], fullWidth && styles.fullWidth, isDisabled && styles.disabled, style]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <>
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
      </>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: { minHeight: sizes.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: spacing.lg },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.52 },
  title: { ...typography.bodySemibold, textAlign: 'center' },
  iconLeft: { marginRight: spacing.xs },
  iconRight: { marginLeft: spacing.xs },
});
