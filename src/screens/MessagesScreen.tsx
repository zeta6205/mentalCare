// src/screens/MessagesScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { getUserConversations, findUserById } from '../db';
import type { Message, Conversation } from '../db';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyState } from '../components/ui/EmptyState';
import { GlassSurface } from '../components/ui/GlassSurface';
import { LoadingState } from '../components/ui/LoadingState';
import { colors, radius, sizes, spacing, typography } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Messages'>;

interface MessagesScreenProps {
  userId: string;
}

type ConversationView = {
  id: string;
  name: string;
  avatar: string;
  messages: Message[];
};

const MessagesScreen: React.FC<MessagesScreenProps> = ({ userId }) => {
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState<ConversationView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConversations = () => {
      if (!userId) return;

      try {
        setLoading(true);
        const convs = getUserConversations(userId);

        const conversationViews = convs.map((conv: Conversation) => {
          const otherUserId = conv.participants.find(id => id !== userId);
          const otherUser = otherUserId ? findUserById(otherUserId) : null;

          return {
            id: conv.id,
            name: otherUser?.name || 'Usuário',
            avatar: otherUser?.avatar || 'https://i.pravatar.cc/150',
            messages: conv.messages,
          };
        });

        setConversations(conversationViews);
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [userId, isFocused]);

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: ConversationView }) => {
    const lastMessage = item.messages[item.messages.length - 1];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Contact', { contactId: item.id })}
      >
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.time}>
              {lastMessage ? new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>
          <Text style={styles.message} numberOfLines={1} ellipsizeMode="tail">
            {lastMessage?.text || ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <GlassSurface style={styles.searchContainer}>
          <MaterialIcons name="search" size={24} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversas..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#888"
          />
        </GlassSurface>

        {loading ? (
          <LoadingState message="Carregando conversas..." />
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhuma conversa encontrada" description="Quando houver mensagens, elas aparecerão aqui." />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: sizes.bottomTabBarReservedSpace }}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default MessagesScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 20 : 40,
  },
  container: { flex: 1, paddingHorizontal: spacing.md },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, marginLeft: spacing.xs, ...typography.body, color: colors.textPrimary },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatar: { width: 55, height: 55, borderRadius: 30, marginRight: 12 },
  textContainer: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  name: { ...typography.bodySemibold, color: colors.textPrimary },
  time: { ...typography.caption, color: colors.textSecondary },
  message: { ...typography.bodySmall, color: colors.textSecondary },
});
