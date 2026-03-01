import React, { createContext, useState, useContext, ReactNode } from 'react';

// 🧩 Tipo do usuário
export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  banner?: string;
}

// 🧠 Tipagem do contexto
interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// 🌐 Criação do contexto
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  setUser: () => {},
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

// 🌎 URL do backend — altere conforme seu IP
const API_URL = 'http://192.168.4.109:3000/users';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔐 LOGIN
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('🔑 Resposta do login:', data);

      if (!response.ok || !data.user?._id) {
        throw new Error(data.error || 'Erro ao logar usuário.');
      }

      // 🔹 Garante formato padronizado
      setUser({
        _id: data.user._id,
        name: data.user.name,
        email: data.user.email,
        avatar: data.user.avatar || '',
        bio: data.user.bio || '',
        banner: data.user.banner || '',
      });
      console.log('✅ Login bem-sucedido:', data.user.name);
    } catch (err) {
      console.error('❌ Erro no login:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🆕 REGISTRO
  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      console.log('🆕 Resposta do registro:', data);

      if (!response.ok || !data.user?._id) {
        throw new Error(data.error || 'Erro ao registrar usuário.');
      }

      setUser({
        _id: data.user._id,
        name: data.user.name,
        email: data.user.email,
        avatar: data.user.avatar || '',
        bio: data.user.bio || '',
        banner: data.user.banner || '',
      });
      console.log('✅ Registro bem-sucedido:', data.user.name);
    } catch (err) {
      console.error('❌ Erro no registro:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🚪 LOGOUT
  const logout = () => {
    setUser(null);
    console.log('👋 Logout realizado.');
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, setUser, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
