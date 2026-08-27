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
import { GlassSurface } from '../components/ui/GlassSurface';
import { colors, radius, sizes, spacing, typography } from '../theme';

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
      contentContainerStyle={{ paddingBottom: sizes.bottomTabBarReservedSpace }}
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
      <GlassSurface style={styles.form}>
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
      </GlassSurface>
    </ScrollView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 30) + 10 : 60,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  bannerContainer: {
    width: '100%',
    height: 200,
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderBottomLeftRadius: radius.large,
    borderBottomRightRadius: radius.large,
    // Allow avatar to overflow and sit above the banner
    overflow: 'visible',
    zIndex: 1,
  },
  banner: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'cover', 
    borderBottomLeftRadius: radius.large,
    borderBottomRightRadius: radius.large
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
  infoSection: { marginTop: 90, alignItems: 'center', paddingHorizontal: spacing.lg },
  name: { ...typography.h1, color: colors.textPrimary },
  email: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xxs },
  bio: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  form: { borderRadius: radius.large, padding: spacing.lg, marginHorizontal: spacing.md, marginTop: spacing.lg },
  sectionTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.input,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  editButton: {
    backgroundColor: colors.brandMint,
    padding: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
    marginVertical: 10,
  },
  editButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  saveButton: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
    marginVertical: 10,
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logoutButton: {
    marginTop: 20,
    padding: spacing.sm,
    backgroundColor: colors.brandPink,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  logoutText: { color: '#b20000', fontWeight: 'bold', fontSize: 16 },
});
