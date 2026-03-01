// src/bootstrap.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearUserStorage = async () => {
  try {
    await AsyncStorage.removeItem('@logged_user');
    console.log('AsyncStorage limpo ✅');
  } catch (err) {
    console.error('Erro ao limpar AsyncStorage:', err);
  }
};
