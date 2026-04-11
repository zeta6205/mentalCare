import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

export type ButtonConfig = {
  iconName: React.ComponentProps<typeof MaterialIcons>['name'];
  iconColor?: string;
  iconSize?: number;
  screen: keyof RootStackParamList;
};

type Props = {
  buttons: ButtonConfig[];
};

const BottomMenu: React.FC<Props> = ({ buttons }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, keyof RootStackParamList>>();

  return (
    <View style={styles.container}>
      {buttons.map((btn, index) => {
        const isActive = route.name === btn.screen;
        return (
          <TouchableOpacity
            key={index}
            style={[styles.button, isActive && styles.activeButton]}
            onPress={() => navigation.navigate(btn.screen as any)}
          >
            <MaterialIcons
              name={btn.iconName}
              size={btn.iconSize || 28}
              color={isActive ? '#fff' : btn.iconColor || '#000'}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default BottomMenu;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#a8edea',
    padding: 10,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  button: {
    backgroundColor: '#d7e3e3ff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  activeButton: {
    backgroundColor: '#007B83', // cor de destaque para o botão ativo
  },
});
