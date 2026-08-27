// src/screens/ContactScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Image, SafeAreaView, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { IconButton } from '../components/ui/IconButton';
import { GlassSurface } from '../components/ui/GlassSurface';
import { LoadingState } from '../components/ui/LoadingState';
import { colors, radius, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getUserConversations, findUserById, addMessageToConversation } from '../db';
import type { Conversation, Message } from '../db';

type Props = NativeStackScreenProps<RootStackParamList, 'Contact'>;

const ContactScreen: React.FC<Props> = ({ route, navigation }) => {
  const { contactId } = route.params;
    const { user, loading: authLoading } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  

  useEffect(() => {
    const loadConversation = async () => {
      if (!contactId || !user?._id) return;
      try {
        setIsLoading(true);
        setError(null);
        const conv = getUserConversations(user._id).find(c => c.id === contactId) || null;
        setConversation(conv);
      } catch (err) {
        setError('Não foi possível carregar a conversa. Tente novamente.');
        console.error('Erro ao carregar conversa:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadConversation();
  }, [contactId, user?._id]);

  if (authLoading || isLoading) {
    return (
      <View style={styles.loadingContainer}><LoadingState message="Carregando conversa..." /></View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!user?._id || !conversation) return null;

  const otherId = conversation.participants.find(id => id !== user._id);
  const otherUser = otherId ? findUserById(otherId) : { name: 'Usuário', avatar: 'https://i.pravatar.cc/150' };

  const handleSend = async () => {
    if (!newMessage.trim() || sendingMessage) return;
    
    const message: Message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      sender: user._id,
      timestamp: Date.now(),
    };

    setSendingMessage(true);
    try {
      await addMessageToConversation(conversation.id, message);
      setConversation(prev => prev ? { 
        ...prev, 
        messages: [...prev.messages, message] 
      } : null);
      setNewMessage('');
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setError('Não foi possível enviar a mensagem. Tente novamente.');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <GlassSurface style={styles.header}>
        <IconButton
          icon={<MaterialIcons name="arrow-back" size={24} color={colors.primary} />}
          accessibilityLabel="Voltar para mensagens"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
        <Image source={{ uri: otherUser.avatar }} style={styles.avatar} />
        <Text style={styles.name}>{otherUser.name}</Text>
      </GlassSurface>

      <FlatList
        style={styles.messages}
        data={conversation.messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.messageBubble, item.sender === user._id ? styles.myMessage : styles.theirMessage]}>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
      />

      <GlassSurface style={styles.inputContainer}>
        <TextInput
          style={[styles.input, sendingMessage && styles.inputDisabled]}
          placeholder="Digite sua mensagem..."
          value={newMessage}
          onChangeText={setNewMessage}
          editable={!sendingMessage}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled]} 
          onPress={handleSend}
          disabled={!newMessage.trim() || sendingMessage}
        >
          {sendingMessage ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Enviar</Text>
          )}
        </TouchableOpacity>
      </GlassSurface>
    </SafeAreaView>
  );
};

export default ContactScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.semantic.error.main,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.input,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: spacing.sm,
    borderRadius: radius.card,
  },
  backButton: {
    marginRight: spacing.xs,
  },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    marginRight: 12,
  },
  name: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  messages: { 
    flex: 1, 
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  messageBubble: { 
    padding: spacing.sm,
    borderRadius: radius.card,
    marginVertical: 4,
    maxWidth: '80%',
  },
  myMessage: { 
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirMessage: { 
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: { 
    color: colors.textPrimary,
  },
  inputContainer: { 
    flexDirection: 'row', 
    padding: spacing.xs,
    borderRadius: radius.large,
  },
  input: { 
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    ...typography.body,
    marginRight: 8,
  },
  inputDisabled: {
    opacity: 0.7,
  },
  sendButton: { 
    height: 40,
    paddingHorizontal: 16, 
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
