import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import { useAuth } from './AuthContext';

// 🧩 Tipos
type Card = { id: string; text: string; color: string };

export type Profile = {
  _id: string;
  name: string;
  email: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  cards?: Card[];
};

type ProfileContextType = {
  profile: Profile | null;
  loading: boolean;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  uploadAvatar: (file: any) => Promise<void>;
  addCard: (text: string, color: string) => void;
  editCard: (id: string, text: string) => void;
  deleteCard: (id: string) => void;
};

const ProfileContext = createContext<ProfileContextType>({} as ProfileContextType);
export const useProfile = () => useContext(ProfileContext);

// 🌐 URL base do backend — sem “/users” no final
const BASE_URL = 'http://192.168.4.109:3000';

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);


  // 🔄 Buscar perfil do backend
  const fetchProfile = async () => {
    console.log('🧠 Iniciando fetchProfile...');
    console.log('👤 Usuário recebido do AuthContext:', user);

    if (!user?._id) {
      console.log('⚠️ Nenhum usuário logado, limpando perfil.');
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const endpoint = `${BASE_URL}/users/${user._id}`;
      console.log('🌐 Buscando perfil em:', endpoint);

      const res = await fetch(endpoint);
      console.log('📥 Status da resposta:', res.status);

      if (!res.ok) {
        console.warn(`⚠️ Perfil não encontrado (ID: ${user._id})`);
        setProfile(user); // fallback: usa o do AuthContext
        return;
      }

      const data = await res.json();
      console.log('✅ Perfil carregado:', data);

      setProfile(data);
      setUser(data);
      console.log(data)
    } catch (err) {
      console.error('❌ Erro ao carregar perfil:', err);
    } finally {
      setLoading(false);
      console.log('🏁 fetchProfile finalizado — loading = false');
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user?._id]);

  // ✏️ Atualiza perfil
  const updateProfile = async (data: Partial<Profile>) => {
    if (!profile?._id) return;
    try {
      const res = await fetch(`${BASE_URL}/users/${profile._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Erro ao atualizar perfil.');

      const updated = await res.json();
      setProfile(updated);
      setUser(updated);
      console.log('✅ Perfil atualizado:', updated);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível atualizar o perfil.');
      console.error('❌ Erro no updateProfile:', err);
      console.log(profile)
    }
  };

  // 📸 Upload (avatar/banner)
  const uploadAvatar = async (file: any) => {
    if (!profile?._id) return;

    const isBanner = file.type === 'banner';
    const endpoint = `${BASE_URL}/uploads/${profile._id}/${isBanner ? 'banner' : 'avatar'}`;

    console.log('🚀 Iniciando upload para:', endpoint);
    console.log('📦 Arquivo:', file);

    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
      name: isBanner ? 'banner.jpg' : 'avatar.jpg',
      type: file.type || 'image/jpeg',
    } as any);

    try {
      console.log('📤 Enviando FormData:', formData);
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!res.ok) {
        console.error('❌ Erro na resposta:', res.status, res.statusText);
        const errorText = await res.text();
        console.error('📝 Detalhes do erro:', errorText);
        throw new Error('Falha ao enviar imagem.');
      }

      const data = await res.json();
      console.log('✅ Resposta do servidor:', data);
      await updateProfile(isBanner ? { banner: data.url } : { avatar: data.url });
    } catch (err) {
      console.error('❌ Erro detalhado no uploadAvatar:', err);
      Alert.alert('Erro', `Não foi possível atualizar ${isBanner ? 'o banner' : 'o avatar'}.`);
      throw err;
    }
  };

  // 💬 Funções locais (cards)
  const addCard = (text: string, color: string) => {
    if (!profile) return;
    const newCard: Card = { id: Date.now().toString(), text, color };
    setProfile({ ...profile, cards: [newCard, ...(profile.cards || [])] });
  };

  const editCard = (id: string, text: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      cards: (profile.cards || []).map(c => (c.id === id ? { ...c, text } : c)),
    });
  };

  const deleteCard = (id: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      cards: (profile.cards || []).filter(c => c.id !== id),
    });
  };

  return (
    <ProfileContext.Provider
      value={{ profile, loading, updateProfile, uploadAvatar, addCard, editCard, deleteCard }}
    >
      {children}
    </ProfileContext.Provider>
  );
};
