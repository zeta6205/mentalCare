import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../components/ui/Button';
import { GlassSurface } from '../components/ui/GlassSurface';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { TextField } from '../components/ui/TextField';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { colors, radius, spacing, typography } from '../theme';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const { login, loading } = useAuth();
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos antes de continuar.');
      return;
    }

    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      const message = err instanceof Error && err.message.includes('Network request failed')
        ? 'Falha de conexão com o servidor. Verifique sua rede.'
        : err instanceof Error ? err.message : 'Erro ao efetuar login.';
      Alert.alert('Erro', message);
    }
  };

  return (
    <LinearGradient colors={[colors.brandMint, colors.brandPink]} style={styles.background}>
      <ScreenContainer backgroundColor="transparent" padding={spacing.lg}>
        <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
            <View style={styles.mark}><MaterialIcons name="self-improvement" size={32} color={colors.primary} /></View>
            <Text style={styles.title}>Bem-vindo de volta</Text>
            <Text style={styles.subtitle}>Um espaço mais calmo para você.</Text>
          </View>
            <GlassSurface style={styles.form}>
            <Text style={styles.formTitle}>Entrar</Text>
            <TextField label="E-mail" placeholder="voce@email.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" leftIcon={<MaterialIcons name="mail-outline" size={20} color={colors.textSecondary} />} />
            <View style={styles.fieldGap} />
            <TextField label="Senha" placeholder="Sua senha" value={password} onChangeText={setPassword} secureTextEntry leftIcon={<MaterialIcons name="lock-outline" size={20} color={colors.textSecondary} />} />
            <View style={styles.actionGap} />
            <Button title="Entrar" onPress={handleLogin} loading={loading} />
            <Pressable accessibilityRole="button" accessibilityLabel="Criar uma conta" onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
              <Text style={styles.link}>Ainda não tem conta? <Text style={styles.linkEmphasis}>Cadastre-se</Text></Text>
            </Pressable>
            </GlassSurface>
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenContainer>
    </LinearGradient>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  background: { flex: 1 },
  keyboard: { flex: 1, justifyContent: 'center' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.lg },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  mark: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.62)', marginBottom: spacing.md },
  title: { ...typography.display, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  form: { width: '92%', alignSelf: 'center', borderRadius: radius.large, padding: spacing.lg },
  formTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg },
  fieldGap: { height: spacing.md },
  actionGap: { height: spacing.lg },
  linkButton: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: spacing.sm },
  link: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' },
  linkEmphasis: { ...typography.bodySmallSemibold, color: colors.primary },
});
