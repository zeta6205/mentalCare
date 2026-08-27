import React from 'react';
import { Platform, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { colors, radius } from '../../theme';

type GlassSurfaceProps = {
  children: React.ReactNode;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
};

const supportsLiquidGlass = () =>
  Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

export const GlassSurface: React.FC<GlassSurfaceProps> = ({ children, dark = false, style }) => {
  const borderColor = dark ? colors.navigation.glassDarkBorder : colors.navigation.glassBorder;
  const fallbackBackground = dark ? colors.navigation.glassDarkBackground : colors.navigation.glassBackground;

  if (supportsLiquidGlass()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor={dark ? colors.navigation.glassDarkTint : colors.navigation.glassTint}
        colorScheme={dark ? 'dark' : 'light'}
        style={[styles.surface, { borderColor }, style]}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      tint={dark ? 'systemMaterialDark' : 'systemMaterialLight'}
      intensity={82}
      experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      style={[styles.surface, { backgroundColor: fallbackBackground, borderColor }, style]}
    >
      {children}
    </BlurView>
  );
};

const styles = StyleSheet.create({
  surface: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
});
