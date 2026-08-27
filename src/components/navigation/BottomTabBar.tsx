import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadows, sizes, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { GlassSurface } from '../ui/GlassSurface';

type TabRouteName = 'Home' | 'Video' | 'Messages' | 'Profile' | 'Search';
type TabItem = {
  route: TabRouteName;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  accessibilityLabel: string;
};

const tabItems: readonly TabItem[] = [
  { route: 'Home', label: 'Início', icon: 'home', accessibilityLabel: 'Ir para Início' },
  { route: 'Video', label: 'Vídeos', icon: 'smart-display', accessibilityLabel: 'Ir para Vídeos' },
  { route: 'Messages', label: 'Mensagens', icon: 'chat-bubble-outline', accessibilityLabel: 'Ir para Mensagens' },
  { route: 'Profile', label: 'Perfil', icon: 'person-outline', accessibilityLabel: 'Ir para Perfil' },
  { route: 'Search', label: 'Busca', icon: 'search', accessibilityLabel: 'Ir para Busca' },
];

type BottomTabBarProps = {
  floating?: boolean;
};

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ floating = false }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, keyof RootStackParamList>>();
  const isDark = route.name === 'Video';

  const navigateTo = (tabRoute: TabRouteName) => {
    navigation.navigate(tabRoute);
  };

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={[styles.safeArea, isDark && styles.safeAreaDark, floating && styles.safeAreaFloating]}
    >
      <GlassSurface dark={isDark} style={styles.container}>
        {tabItems.map(item => {
          const isActive = route.name === item.route;
          const activeColor = isDark ? colors.brandMint : colors.primary;
          const inactiveColor = isDark ? colors.textOnPrimary : colors.textPrimary;

          return (
            <Pressable
              key={item.route}
              accessibilityRole="tab"
              accessibilityLabel={item.accessibilityLabel}
              accessibilityState={{ selected: isActive }}
              onPress={() => navigateTo(item.route)}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            >
              <View style={[styles.activeSurface, isActive && styles.activeSurfaceVisible, isDark && styles.activeSurfaceDark]} />
              <MaterialIcons name={item.icon} size={sizes.iconMedium} color={isActive ? activeColor : inactiveColor} />
            </Pressable>
          );
        })}
      </GlassSurface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'transparent',
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  safeAreaDark: {
    backgroundColor: 'transparent',
  },
  safeAreaFloating: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
  },
  container: {
    minHeight: sizes.navigationDockHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
    ...shadows.navigationDock,
  },
  item: {
    minWidth: sizes.touchTarget,
    minHeight: sizes.touchTarget,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  activeSurface: {
    position: 'absolute',
    width: sizes.touchTarget,
    height: sizes.touchTarget - spacing.xxs,
    borderRadius: sizes.touchTarget,
    backgroundColor: colors.navigation.activeSurface,
    opacity: 0,
  },
  activeSurfaceVisible: { opacity: 1, ...shadows.navigationActive },
  activeSurfaceDark: { backgroundColor: colors.navigation.activeSurfaceDark },
});
