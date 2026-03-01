// src/navigation/AppNavigator.tsx
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import BottomMenu, { ButtonConfig } from '../components/Button';

// Telas
import HomeScreen from '../screens/HomeScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SearchScreen from '../screens/SearchScreen';
import ContactScreen from '../screens/ContactScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Profile: undefined;
  Messages: undefined;
  Contact: { contactId: string };
  Search: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const ScreenWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const buttons: ButtonConfig[] = [
    { screen: 'Home', iconName: 'home' },
    { screen: 'Messages', iconName: 'chat-bubble-outline' },
    { screen: 'Profile', iconName: 'person' },
    { screen: 'Search', iconName: 'search' },
  ];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{children}</View>
      <BottomMenu buttons={buttons} />
    </View>
  );
};

function withBottomMenu<P extends object>(Component: React.ComponentType<P>) {
  return (props: P) => (
    <ScreenWrapper>
      <Component {...props} />
    </ScreenWrapper>
  );
}

const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007B83" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {user ? (
        <>
          <Stack.Screen name="Home" component={withBottomMenu(HomeScreen)} />
          <Stack.Screen name="Messages" component={withBottomMenu(MessagesScreen)} />
          <Stack.Screen name="Profile" component={withBottomMenu(ProfileScreen)} />
          <Stack.Screen name="Search" component={withBottomMenu(SearchScreen)} />
          <Stack.Screen name="Contact" component={ContactScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
