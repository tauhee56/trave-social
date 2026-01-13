import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { handleSocialAuthResult, signInWithApple, signInWithGoogle, signInWithSnapchat, signInWithTikTok } from '../../services/socialAuthService';
import { loginWithUsername } from '../../services/usernameAuthService';
import CustomButton from '../../src/_components/auth/CustomButton';
import SocialButton from '../../src/_components/auth/SocialButton';

export default function UsernameLoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }

    setLoading(true);
    const result = await loginWithUsername(username);
    setLoading(false);

    if (result.success) {
      router.replace('/(tabs)/home');
    } else {
      Alert.alert('Login Failed', result.error || 'Could not login with username');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await signInWithGoogle();
    await handleSocialAuthResult(result, router);
    setLoading(false);
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    const result = await signInWithApple();
    await handleSocialAuthResult(result, router);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Please login to your account</Text>
        </View>

        {/* Username Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Enter your username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        {/* Login Button */}
        <CustomButton
          title={loading ? 'Logging in...' : 'Login'}
          onPress={handleLogin}
          variant="primary"
          style={styles.loginButton}
          disabled={loading}
        />

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#f39c12" />
          </View>
        )}

        {/* Social Login Options */}
        <View style={styles.socialSection}>
          <SocialButton
            provider="google"
            onPress={handleGoogleSignIn}
            style={styles.socialButton}
          />
          <SocialButton
            provider="apple"
            onPress={handleAppleSignIn}
            style={styles.socialButton}
          />
          <SocialButton
            provider="tiktok"
            onPress={signInWithTikTok}
            style={styles.socialButton}
          />
          <SocialButton
            provider="snapchat"
            onPress={signInWithSnapchat}
            style={styles.socialButton}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don&apos;t have an account?{' '}
            <Text 
              style={styles.footerLink}
              onPress={() => router.push('/auth/signup-options')}
            >
              Sign up
            </Text>
          </Text>
        </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#000',
  },
  loginButton: {
    marginBottom: 30,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  socialSection: {
    marginBottom: 30,
  },
  socialButton: {
    marginBottom: 12,
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  footerLink: {
    color: '#f39c12',
    fontWeight: '600',
  },
});
