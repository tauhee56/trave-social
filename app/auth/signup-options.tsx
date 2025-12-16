import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { handleSocialAuthResult, signInWithApple, signInWithGoogle, signInWithSnapchat, signInWithTikTok } from '../../services/socialAuthService';
import CustomButton from '../_components/auth/CustomButton';
import SocialButton from '../_components/auth/SocialButton';

export default function SignUpOptionsScreen() {
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
    setLoading(true);
    const result = await signInWithTikTok();
    await handleSocialAuthResult(result, router);
    setLoading(false);
  };

  const handleSnapchatSignIn = async () => {
    setLoading(true);
    const result = await signInWithSnapchat();
    await handleSocialAuthResult(result, router);
    setLoading(false);
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
          <Text style={styles.title}>Sign up</Text>
          <Text style={styles.subtitle}>Let's keep it quick, 2 steps and you're in.</Text>
        </View>

        {/* Method Selection */}
        <View style={styles.methodContainer}>
          <Text style={styles.methodLabel}>By Email</Text>
          <CustomButton
            title="Email"
            onPress={() => router.push('/auth/email-signup')}
            variant="primary"
            style={styles.methodButton}
            textStyle={styles.methodButtonText}
          />

          <Text style={styles.methodLabel}>By phone number</Text>
          <CustomButton
            title="Phone"
            onPress={() => router.push('/auth/phone-signup')}
            variant="primary"
            style={styles.methodButton}
            textStyle={styles.methodButtonText}
          />

          <Text style={styles.methodLabel}>By username</Text>
          <CustomButton
            title="Username"
            onPress={() => router.push('/auth/username-signup')}
            variant="secondary"
            style={styles.methodButton}
            textStyle={styles.methodButtonText}
          />
        </View>

        {/* Social Login Options */}
        <View style={styles.socialContainer}>
          <SocialButton 
            provider="google" 
            onPress={handleGoogleSignIn}
          />
          <SocialButton 
            provider="apple" 
            onPress={handleAppleSignIn}
          />
          <SocialButton 
            provider="tiktok" 
            onPress={handleTikTokSignIn}
          />
          <SocialButton 
            provider="snapchat" 
            onPress={handleSnapchatSignIn}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You have an account?{' '}
            <Text 
              style={styles.footerLink}
              onPress={() => router.push('/auth/login-options')}
            >
              Log in
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
    justifyContent: 'center',
  },
  titleSection: {
    marginBottom: 40,
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
    lineHeight: 20,
  },
  methodContainer: {
    marginBottom: 30,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 12,
  },
  methodButton: {
    marginBottom: 4,
  },
  methodButtonText: {
    fontSize: 15,
  },
  socialContainer: {
    marginBottom: 20,
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
