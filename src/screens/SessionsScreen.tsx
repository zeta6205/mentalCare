// src/screens/SessionsScreen.tsx
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useProfile } from '../context/ProfileContext';

const SessionsScreen: React.FC = () => {
  const { profile, addCard, editCard, deleteCard } = useProfile();
  const [newCard, setNewCard] = useState('');

  const handleAddCard = () => {
    if (!newCard.trim()) return;
    addCard(newCard, '#a8edea');
    setNewCard('');
  };

  const renderCard = ({ item }: any) => (
    <View style={[styles.card, { backgroundColor: item.color }]}>
      <Text style={styles.cardText}>{item.text}</Text>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => editCard(item.id, prompt('Editar card:', item.text) || item.text)}>
          <Text style={styles.actionText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteCard(item.id)}>
          <Text style={[styles.actionText, { color: 'red' }]}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Novo card..."
        value={newCard}
        onChangeText={setNewCard}
        style={styles.input}
      />
      <TouchableOpacity style={styles.addButton} onPress={handleAddCard}>
        <Text style={styles.addButtonText}>Adicionar</Text>
      </TouchableOpacity>

      <FlatList
        data={profile?.cards || []}
        keyExtractor={item => item.id}
        renderItem={renderCard}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
};

export default SessionsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 10 },
  addButton: { backgroundColor: '#007B83', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  cardText: { fontSize: 16, color: '#333' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  actionText: { fontWeight: 'bold', color: '#007B83' },
});
