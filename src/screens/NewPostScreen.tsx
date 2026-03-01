// src/screens/NewPostScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NewPostScreen = () => (
  <View style={styles.container}>
    <Text>Tela de Novo Post</Text>
  </View>
);

export default NewPostScreen;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
