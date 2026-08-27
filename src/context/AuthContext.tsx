import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  banner?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authReady: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  authReady: false,
  setUser: () => {},
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const AUTH_STORAGE_KEY = '@mentalcare:user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userState, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // =====================================================
  // Persistência centralizada do usuário
  // =====================================================

  const setUser = (user: User | null) => {
    setUserState(user);

    if (user) {
      AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify(user),
      ).catch(error => {
        console.error('❌ Erro ao persistir usuário:', error);
      });
    } else {
      AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(error => {
        console.error('❌ Erro ao remover usuário persistido:', error);
      });
    }
  };

  // =====================================================
  // Restaurar sessão ao iniciar o app
  // =====================================================

  useEffect(() => {
    const restoreSession = async () => {
      try {
        console.log('🔄 Restaurando sessão...');

        const storedUser = await AsyncStorage.getItem(
          AUTH_STORAGE_KEY,
        );

        if (storedUser) {
          const parsedUser: User = JSON.parse(storedUser);

          if (parsedUser?._id) {
            console.log(
              '✅ Sessão restaurada:',
              parsedUser.name,
            );

            setUserState(parsedUser);
          } else {
            await AsyncStorage.removeItem(
              AUTH_STORAGE_KEY,
            );
          }
        } else {
          console.log('ℹ️ Nenhuma sessão salva.');
        }
      } catch (error) {
        console.error(
          '❌ Erro ao restaurar sessão:',
          error,
        );

        await AsyncStorage.removeItem(
          AUTH_STORAGE_KEY,
        ).catch(() => {});
      } finally {
        setAuthReady(true);
      }
    };

    restoreSession();
  }, []);

  // =====================================================
  // LOGIN
  // =====================================================

  const login = async (
    email: string,
    password: string,
  ) => {
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      const data = await response.json();

      console.log(
        '🔑 Resposta do login:',
        data,
      );

      if (!response.ok || !data.user?._id) {
        throw new Error(
          data.error ||
            'Erro ao logar usuário.',
        );
      }

      const authenticatedUser: User = {
        _id: data.user._id,
        name: data.user.name,
        email: data.user.email,
        avatar: data.user.avatar || '',
        bio: data.user.bio || '',
        banner: data.user.banner || '',
      };

      setUser(authenticatedUser);

      console.log(
        '✅ Login bem-sucedido:',
        authenticatedUser.name,
      );
    } catch (err) {
      console.error(
        '❌ Erro no login:',
        err,
      );

      throw err;
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // REGISTRO
  // =====================================================

  const register = async (
    name: string,
    email: string,
    password: string,
  ) => {
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        },
      );

      const data = await response.json();

      console.log(
        '🆕 Resposta do registro:',
        data,
      );

      if (!response.ok || !data.user?._id) {
        throw new Error(
          data.error ||
            'Erro ao registrar usuário.',
        );
      }

      const registeredUser: User = {
        _id: data.user._id,
        name: data.user.name,
        email: data.user.email,
        avatar: data.user.avatar || '',
        bio: data.user.bio || '',
        banner: data.user.banner || '',
      };

      setUser(registeredUser);

      console.log(
        '✅ Registro bem-sucedido:',
        registeredUser.name,
      );
    } catch (err) {
      console.error(
        '❌ Erro no registro:',
        err,
      );

      throw err;
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = async () => {
    setUserState(null);

    try {
      await AsyncStorage.removeItem(
        AUTH_STORAGE_KEY,
      );
    } catch (error) {
      console.error(
        '❌ Erro ao limpar sessão:',
        error,
      );
    }

    console.log('👋 Logout realizado.');
  };

  return (
    <AuthContext.Provider
      value={{
        user: userState,
        loading,
        authReady,
        setUser,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
