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
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={24} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversas..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#888"
          />
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <Text>Carregando conversas...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text>Nenhuma conversa encontrada</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
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
    backgroundColor: '#f0fcfb',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 20 : 40,
  },
  container: { flex: 1, paddingHorizontal: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginBottom: 15,
    elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#333' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  avatar: { width: 55, height: 55, borderRadius: 30, marginRight: 12 },
  textContainer: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  name: { fontSize: 16, fontWeight: '600', color: '#333' },
  time: { fontSize: 12, color: '#aaa' },
  message: { fontSize: 14, color: '#555' },
});
