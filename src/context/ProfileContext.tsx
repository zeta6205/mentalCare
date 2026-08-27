import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Alert, Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../config/api';

// ======================================================
// TIPOS
// ======================================================

type Card = {
  id: string;
  text: string;
  color: string;
};

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

  updateProfile: (
    data: Partial<Profile>,
  ) => Promise<void>;

  uploadAvatar: (
    file: any,
  ) => Promise<void>;

  addCard: (
    text: string,
    color: string,
  ) => void;

  editCard: (
    id: string,
    text: string,
  ) => void;

  deleteCard: (
    id: string,
  ) => void;
};

// ======================================================
// CONTEXTO
// ======================================================

const ProfileContext =
  createContext<ProfileContextType>(
    {} as ProfileContextType,
  );

export const useProfile = () =>
  useContext(ProfileContext);

// ======================================================
// BACKEND
// ======================================================

// ======================================================
// PROVIDER
// ======================================================

export const ProfileProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const {
    user,
    setUser,
    authReady,
  } = useAuth();

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loading, setLoading] =
    useState(true);

  // ====================================================
  // BUSCAR PERFIL
  // ====================================================

  const fetchProfile = async () => {
    console.log(
      '🧠 Iniciando fetchProfile...',
    );

    console.log(
      '🔐 Auth pronto:',
      authReady,
    );

    console.log(
      '👤 Usuário recebido do AuthContext:',
      user,
    );

    // --------------------------------------------------
    // Ainda estamos restaurando AsyncStorage
    // --------------------------------------------------

    if (!authReady) {
      console.log(
        '⏳ AuthContext ainda está restaurando a sessão...',
      );

      return;
    }

    // --------------------------------------------------
    // Auth terminou e realmente não existe usuário
    // --------------------------------------------------

    if (!user?._id) {
      console.log(
        '⚠️ Nenhum usuário logado. Limpando perfil.',
      );

      setProfile(null);
      setLoading(false);

      return;
    }

    try {
      setLoading(true);

      const endpoint =
        `${API_BASE_URL}/users/${user._id}`;

      console.log(
        '🌐 Buscando perfil em:',
        endpoint,
      );

      const res =
        await fetch(endpoint);

      console.log(
        '📥 Status da resposta:',
        res.status,
      );

      // ------------------------------------------------
      // Backend respondeu, mas perfil não foi encontrado
      // ------------------------------------------------

      if (!res.ok) {
        console.warn(
          `⚠️ Perfil não encontrado no backend. ID: ${user._id}`,
        );

        console.log(
          '↩️ Utilizando usuário do AuthContext como fallback.',
        );

        setProfile(user);

        return;
      }

      // ------------------------------------------------
      // Perfil encontrado
      // ------------------------------------------------

      const data: Profile =
        await res.json();

      console.log(
        '✅ Perfil carregado:',
        data,
      );

      setProfile(data);

      // Mantém AuthContext sincronizado
      setUser(data);
    } catch (err) {
      console.error(
        '❌ Erro ao carregar perfil:',
        err,
      );

      // Evita spinner infinito caso o backend
      // esteja temporariamente indisponível
      if (user?._id) {
        console.log(
          '↩️ Usando usuário local como fallback.',
        );

        setProfile(user);
      } else {
        setProfile(null);
      }
    } finally {
      setLoading(false);

      console.log(
        '🏁 fetchProfile finalizado — loading = false',
      );
    }
  };

  // ====================================================
  // REAGIR À AUTENTICAÇÃO
  // ====================================================

  useEffect(() => {
    // Enquanto AuthContext estiver restaurando
    // a sessão, não concluímos que o usuário
    // está deslogado.
    if (!authReady) {
      console.log(
        '⏳ ProfileContext aguardando AuthContext...',
      );

      return;
    }

    fetchProfile();
  }, [
    authReady,
    user?._id,
  ]);

  // ====================================================
  // ATUALIZAR PERFIL
  // ====================================================

  const updateProfile = async (
    data: Partial<Profile>,
  ) => {
    if (!profile?._id) {
      console.warn(
        '⚠️ updateProfile chamado sem perfil carregado.',
      );

      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/users/${profile._id}`,
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(data),
        },
      );

      if (!res.ok) {
        throw new Error(
          'Erro ao atualizar perfil.',
        );
      }

      const updated: Profile =
        await res.json();

      setProfile(updated);

      // Atualiza também AuthContext
      // e consequentemente AsyncStorage
      setUser(updated);

      console.log(
        '✅ Perfil atualizado:',
        updated,
      );
    } catch (err) {
      Alert.alert(
        'Erro',
        'Não foi possível atualizar o perfil.',
      );

      console.error(
        '❌ Erro no updateProfile:',
        err,
      );
    }
  };

  // ====================================================
  // UPLOAD AVATAR / BANNER
  // ====================================================

  const uploadAvatar = async (
    file: any,
  ) => {
    if (!profile?._id) {
      console.warn(
        '⚠️ Upload solicitado sem perfil carregado.',
      );

      return;
    }

    const isBanner =
      file.type === 'banner';

    const endpoint =
      `${API_BASE_URL}/uploads/` +
      `${profile._id}/` +
      `${isBanner ? 'banner' : 'avatar'}`;

    console.log(
      '🚀 Iniciando upload para:',
      endpoint,
    );

    console.log(
      '📦 Arquivo:',
      file,
    );

    const formData =
      new FormData();

    formData.append(
      'file',
      {
        uri:
          Platform.OS === 'ios'
            ? file.uri.replace(
                'file://',
                '',
              )
            : file.uri,

        name:
          isBanner
            ? 'banner.jpg'
            : 'avatar.jpg',

        // Mantido como estava por enquanto.
        type:
          file.type ||
          'image/jpeg',
      } as any,
    );

    try {
      console.log(
        '📤 Enviando FormData...',
      );

      const res = await fetch(
        endpoint,
        {
          method: 'POST',

          body: formData,

          headers: {
            Accept:
              'application/json',

            'Content-Type':
              'multipart/form-data',
          },
        },
      );

      if (!res.ok) {
        console.error(
          '❌ Erro na resposta:',
          res.status,
          res.statusText,
        );

        const errorText =
          await res.text();

        console.error(
          '📝 Detalhes:',
          errorText,
        );

        throw new Error(
          'Falha ao enviar imagem.',
        );
      }

      const data =
        await res.json();

      console.log(
        '✅ Resposta do servidor:',
        data,
      );

      if (isBanner) {
        await updateProfile({
          banner: data.url,
        });
      } else {
        await updateProfile({
          avatar: data.url,
        });
      }
    } catch (err) {
      console.error(
        '❌ Erro detalhado no uploadAvatar:',
        err,
      );

      Alert.alert(
        'Erro',
        `Não foi possível atualizar ${
          isBanner
            ? 'o banner'
            : 'o avatar'
        }.`,
      );

      throw err;
    }
  };

  // ====================================================
  // CARDS LOCAIS
  // ====================================================

  const addCard = (
    text: string,
    color: string,
  ) => {
    if (!profile) return;

    const newCard: Card = {
      id: Date.now().toString(),
      text,
      color,
    };

    setProfile({
      ...profile,

      cards: [
        newCard,
        ...(profile.cards || []),
      ],
    });
  };

  const editCard = (
    id: string,
    text: string,
  ) => {
    if (!profile) return;

    setProfile({
      ...profile,

      cards: (
        profile.cards || []
      ).map(card =>
        card.id === id
          ? {
              ...card,
              text,
            }
          : card,
      ),
    });
  };

  const deleteCard = (
    id: string,
  ) => {
    if (!profile) return;

    setProfile({
      ...profile,

      cards: (
        profile.cards || []
      ).filter(
        card =>
          card.id !== id,
      ),
    });
  };

  // ====================================================
  // PROVIDER
  // ====================================================

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        updateProfile,
        uploadAvatar,
        addCard,
        editCard,
        deleteCard,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};
