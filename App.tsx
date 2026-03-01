import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { ProfileProvider } from './src/context/ProfileContext';

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </ProfileProvider>
    </AuthProvider>
  );
}
