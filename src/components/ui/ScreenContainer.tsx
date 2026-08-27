import React from 'react';
import { ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, sizes, spacing } from '../../theme';

type ScreenContainerProps = {
  children: React.ReactNode;
  scroll?: boolean;
  backgroundColor?: string;
  padding?: number;
  reserveBottomTabBar?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scroll = false,
  backgroundColor = colors.background,
  padding = spacing.md,
  reserveBottomTabBar = false,
  style,
  contentContainerStyle,
}) => {
  const contentStyle: ViewStyle = {
    flexGrow: scroll ? 1 : undefined,
    padding,
    paddingBottom: padding + (reserveBottomTabBar ? sizes.bottomTabBarReservedSpace : 0),
  };

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor }, style]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={[contentStyle, contentContainerStyle]}>{children}</ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
};
