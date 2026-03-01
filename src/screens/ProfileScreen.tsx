import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { MaterialIcons } from '@expo/vector-icons';

const ProfileScreen: React.FC = () => {
  const { logout } = useAuth();
  const { profile, updateProfile, uploadAvatar, loading } = useProfile();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [password, setPassword] = useState('');
  const [uploading, setUploading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      await updateProfile({
        name,
        email,
        bio,
        ...(password ? { password } : {}),
      });
      setEditing(false);
      setPassword('');
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o perfil.');
    }
  };

  const handleImageUpload = async (type: 'avatar' | 'banner') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão negada', 'Permita o acesso às fotos para mudar a imagem.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return;

      setUploading(true);
      const file = result.assets[0];
      await uploadAvatar({ ...file, type });
      fadeIn();
      Alert.alert('Sucesso', `${type === 'avatar' ? 'Foto de perfil' : 'Banner'} atualizado!`);
    } catch (err) {
      console.error('Erro ao enviar imagem:', err);
      Alert.alert('Erro', 'Não foi possível atualizar a imagem.');
    } finally {
      setUploading(false);
    }
  };

  if (loading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007B83" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 50 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 🌈 Banner */}
      <LinearGradient colors={['#a8edea', '#fed6e3']} style={styles.bannerContainer}>
        <TouchableOpacity 
          onPress={() => handleImageUpload('banner')} 
          disabled={uploading}
          style={styles.bannerTouchable}
        >
          <Animated.Image
            source={{
              uri:
                profile.banner ||
                'https://img.freepik.com/free-vector/gradient-pastel-sky-background_23-2148900625.jpg',
            }}
            style={styles.banner}
          />
          {uploading && (
            <View style={styles.bannerOverlay}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.avatarUploadingText}>Enviando...</Text>
            </View>
          )}
          {/* Botão de edição do banner */}
          <TouchableOpacity
            style={styles.editBannerButton}
            onPress={() => handleImageUpload('banner')}
            disabled={uploading}
          >
            <LinearGradient
              colors={['#007B83', '#a8edea']}
              style={styles.editBannerGradient}
            >
              <MaterialIcons name="edit" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* 🧍 Avatar + Botão Flutuante */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            <TouchableOpacity
              onPress={() => handleImageUpload('avatar')}
              disabled={uploading}
              style={styles.avatarTouchable}
            >
              <Animated.Image
                source={{
                  uri:
                    profile.avatar ||
                    'https://cdn-icons-png.flaticon.com/512/847/847969.png',
                }}
                style={[styles.avatar, { opacity: fadeAnim }]}
                onLoad={fadeIn}
              />
              {uploading && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.avatarUploadingText}>Enviando...</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* ✏️ Botão flutuante */}
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={() => handleImageUpload('avatar')}
              disabled={uploading}
            >
              <LinearGradient
                colors={['#007B83', '#a8edea']}
                style={styles.editAvatarGradient}
              >
                <MaterialIcons name="edit" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* 💬 Informações */}
      <View style={styles.infoSection}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.email}>{profile.email}</Text>
        {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
      </View>

      {/* ✏️ Formulário */}
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Editar Informações</Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          editable={editing}
          placeholder="Nome"
        />
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          editable={editing}
          placeholder="Email"
          keyboardType="email-address"
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={bio}
          onChangeText={setBio}
          editable={editing}
          placeholder="Biografia"
          multiline
        />
        {editing && (
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Nova Senha (opcional)"
          />
        )}

        {editing ? (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Salvar Alterações</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
            <Text style={styles.editButtonText}>Editar Perfil</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfdfd',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 30) + 10 : 60,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerContainer: {
    width: '100%',
    height: 200,
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    // Allow avatar to overflow and sit above the banner
    overflow: 'visible',
    zIndex: 1,
  },
  banner: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'cover', 
    borderBottomLeftRadius: 25, 
    borderBottomRightRadius: 25 
  },
  bannerTouchable: {
    width: '100%',
    height: '100%',
    position: 'relative'
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25
  },
  editBannerButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  editBannerGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: { position: 'absolute', bottom: -60, alignItems: 'center', zIndex: 10, elevation: 10 },
  avatarWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center' },

  avatarTouchable: { justifyContent: 'center', alignItems: 'center' },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  editAvatarGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarUploadingText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  infoSection: { marginTop: 90, alignItems: 'center', paddingHorizontal: 20 },
  name: { fontSize: 24, fontWeight: '700', color: '#222' },
  email: { fontSize: 15, color: '#555', marginTop: 4 },
  bio: { fontSize: 14, color: '#444', marginTop: 10, textAlign: 'center', lineHeight: 20 },
  form: { paddingHorizontal: 25, marginTop: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#007B83', marginBottom: 15 },
  input: {
    backgroundColor: '#f3f3f3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },
  editButton: {
    backgroundColor: '#a8edea',
    padding: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginVertical: 10,
  },
  editButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  saveButton: {
    backgroundColor: '#007B83',
    padding: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginVertical: 10,
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logoutButton: {
    marginTop: 20,
    padding: 14,
    backgroundColor: '#fed6e3',
    borderRadius: 30,
    alignItems: 'center',
  },
  logoutText: { color: '#b20000', fontWeight: 'bold', fontSize: 16 },
});
