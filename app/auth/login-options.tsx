import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { handleSocialAuthResult, signInWithApple, signInWithGoogle, signInWithSnapchat, signInWithTikTok } from '../../services/socialAuthService';
import CustomButton from '../components/auth/CustomButton';
import SocialButton from '../components/auth/SocialButton';

export default function LoginOptionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

  const handleTikTokSignIn = async () => {
    await signInWithTikTok();
  };

  const handleSnapchatSignIn = async () => {
    await signInWithSnapchat();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
          <Text style={styles.logo}>Travel app logo</Text>
          <Text style={styles.subtitle}>How would you like to login?</Text>
        </View>

        {/* Login Method Selection */}
        <View style={styles.methodContainer}>
          <CustomButton
            title="Phone"
            onPress={() => router.push('/auth/phone-login')}
            variant="primary"
            style={styles.methodButton}
          />

          <CustomButton
            title="Email"
            onPress={() => router.push('/auth/email-login')}
            variant="primary"
            style={styles.methodButton}
          />

          <CustomButton
            title="Username"
            onPress={() => router.push('/auth/username-login')}
            variant="secondary"
            style={styles.methodButton}
          />
        </View>

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
            onPress={handleTikTokSignIn}
            style={styles.socialButton}
          />
          <SocialButton
            provider="snapchat"
            onPress={handleSnapchatSignIn}
            style={styles.socialButton}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
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
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  methodContainer: {
    marginBottom: 30,
  },
  methodButton: {
    marginBottom: 12,
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
