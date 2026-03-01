// src/navigation/types.ts
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Profile: { userId?: string };
  Messages: undefined;
  Contact: { contactId: string };
  Search: undefined;
};

export type NavigationProp<T extends keyof RootStackParamList> = NativeStackNavigationProp<RootStackParamList, T>;
export type Route<T extends keyof RootStackParamList> = RouteProp<RootStackParamList, T>;
