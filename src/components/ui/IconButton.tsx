import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, sizes } from '../../theme';

type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type IconButtonProps = { icon: React.ReactNode; accessibilityLabel: string; onPress: () => void; size?: number; variant?: IconButtonVariant; disabled?: boolean; style?: StyleProp<ViewStyle> };

const backgrounds: Record<IconButtonVariant, string> = { primary: colors.primary, secondary: colors.brandMint, ghost: 'transparent', danger: colors.semantic.error.main };

export const IconButton: React.FC<IconButtonProps> = ({ icon, accessibilityLabel, onPress, size = sizes.touchTarget, variant = 'ghost', disabled = false, style }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.base, { width: Math.max(size, sizes.touchTargetMin), height: Math.max(size, sizes.touchTargetMin), backgroundColor: backgrounds[variant] }, pressed && !disabled && styles.pressed, disabled && styles.disabled, style]}>
    {icon}
  </Pressable>
);

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.5 },
});
