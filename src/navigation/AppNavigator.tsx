// src/navigation/AppNavigator.tsx

import React from 'react';
import {
  View,
  ActivityIndicator,
} from 'react-native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {
  useRoute,
} from '@react-navigation/native';

import type {
  RouteProp,
} from '@react-navigation/native';

import {
  useAuth,
} from '../context/AuthContext';

import {
  BottomTabBar,
} from '../components/navigation/BottomTabBar';

// ======================================================
// TELAS
// ======================================================

import HomeScreen from '../screens/HomeScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SearchScreen from '../screens/SearchScreen';
import ContactScreen from '../screens/ContactScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VideoScreen from '../screens/VideoScreen';

// ======================================================
// ROTAS
// ======================================================

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Profile: undefined;
  Messages: undefined;
  Contact: {
    contactId: string;
  };
  Search: undefined;
  Video: undefined;
};

const Stack =
  createNativeStackNavigator<RootStackParamList>();

// ======================================================
// WRAPPER COM BOTTOM TAB BAR
// ======================================================

const ScreenWrapper: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const route =
    useRoute<
      RouteProp<
        RootStackParamList,
        keyof RootStackParamList
      >
    >();

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <View
        style={{
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>

      <BottomTabBar floating />
    </View>
  );
};

// ======================================================
// HOC
// ======================================================

function withBottomMenu<P extends object>(
  Component: React.ComponentType<P>,
) {
  const WrappedScreen: React.FC<P> = (
    props,
  ) => {
    return (
      <ScreenWrapper>
        <Component {...props} />
      </ScreenWrapper>
    );
  };

  return WrappedScreen;
}

// ======================================================
// IMPORTANTE
//
// Criamos os wrappers UMA ÚNICA VEZ.
//
// NÃO chamar withBottomMenu() dentro do render
// do AppNavigator.
// ======================================================

const HomeWithBottomMenu =
  withBottomMenu(HomeScreen);

const MessagesWithBottomMenu =
  withBottomMenu(MessagesScreen);

const ProfileWithBottomMenu =
  withBottomMenu(ProfileScreen);

const SearchWithBottomMenu =
  withBottomMenu(SearchScreen);

const VideoWithBottomMenu =
  withBottomMenu(VideoScreen);

// ======================================================
// NAVIGATOR
// ======================================================

const AppNavigator: React.FC = () => {
  const {
    user,
    loading,
    authReady,
  } = useAuth();

  // ====================================================
  // PRIMEIRO ESPERA A RESTAURAÇÃO DA SESSÃO
  // ====================================================

  if (!authReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator
          size="large"
          color="#007B83"
        />
      </View>
    );
  }

  // ====================================================
  // LOGIN / REGISTER EM ANDAMENTO
  // ====================================================

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator
          size="large"
          color="#007B83"
        />
      </View>
    );
  }

  // ====================================================
  // STACK
  // ====================================================

  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {user ? (
        <>
          <Stack.Screen
            name="Home"
            component={
              HomeWithBottomMenu
            }
          />

          <Stack.Screen
            name="Messages"
            component={
              MessagesWithBottomMenu
            }
          />

          <Stack.Screen
            name="Profile"
            component={
              ProfileWithBottomMenu
            }
          />

          <Stack.Screen
            name="Search"
            component={
              SearchWithBottomMenu
            }
          />

          <Stack.Screen
            name="Contact"
            component={ContactScreen}
          />

          <Stack.Screen
            name="Video"
            component={
              VideoWithBottomMenu
            }
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
          />

          <Stack.Screen
            name="Register"
            component={
              RegisterScreen
            }
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;