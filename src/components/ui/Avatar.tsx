import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../../theme';

type AvatarProps = { uri?: string; name?: string; size?: number };

const getInitials = (name?: string) => {
  if (!name?.trim()) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
};

export const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 48 }) => {
  const label = name ? `Avatar de ${name}` : 'Avatar';
  const avatarStyle = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[styles.image, avatarStyle]} accessibilityLabel={label} />;
  return <View style={[styles.fallback, avatarStyle]} accessible accessibilityRole="image" accessibilityLabel={label}>
    <Text style={[styles.initials, { fontSize: Math.max(12, size * 0.36) }]}>{getInitials(name)}</Text>
  </View>;
};

const styles = StyleSheet.create({
  image: { backgroundColor: colors.brandMint },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandMint, borderRadius: radius.full },
  initials: { ...typography.bodySemibold, color: colors.primary },
});
