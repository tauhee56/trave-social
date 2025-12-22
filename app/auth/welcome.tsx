import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { handleSocialAuthResult, signInWithApple, signInWithGoogle, signInWithSnapchat, signInWithTikTok } from '../../services/socialAuthService';
import CustomButton from '../../src/_components/auth/CustomButton';
import SocialButton from '../../src/_components/auth/SocialButton';
import fetchLogoUrl from '../../src/_services/brandingService';

export default function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchLogoUrl().then(url => {
      if (isMounted) {
        setLogoUrl(url);
        setLogoLoading(false);
      }
    }).catch(() => setLogoLoading(false));
    return () => { isMounted = false; };
  }, []);

  const handleGoogleSignIn = async () => {
    if (loading) {
      console.log('⚠️ Sign-in already in progress, ignoring duplicate tap');
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithGoogle();
      await handleSocialAuthResult(result, router);
    } catch (error) {
      console.error('Google Sign-In error:', error);
      Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await signInWithApple();
      await handleSocialAuthResult(result, router);
    } catch (error) {
      console.error('Apple Sign-In error:', error);
      Alert.alert('Error', 'Failed to sign in with Apple. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTikTokSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await signInWithTikTok();
      await handleSocialAuthResult(result, router);
    } catch (error) {
      console.error('TikTok Sign-In error:', error);
      Alert.alert('Error', 'Failed to sign in with TikTok. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSnapchatSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await signInWithSnapchat();
      await handleSocialAuthResult(result, router);
    } catch (error) {
      console.error('Snapchat Sign-In error:', error);
      Alert.alert('Error', 'Failed to sign in with Snapchat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.content}>
        {/* Logo/Header */}
        <View style={styles.header}>
          {logoLoading ? (
            <ActivityIndicator size="large" color="#f39c12" style={{ marginBottom: 32 }} />
          ) : (
            <Image
              source={{ uri: logoUrl || 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/logo/logo.png' }}
              style={styles.logo}
              accessibilityLabel="App Logo"
            />
          )}
          <Text style={styles.subtitle}>Please login to your account</Text>
        </View>

        {/* Main Action Buttons */}
        <View style={styles.buttonContainer}>
          <CustomButton
            title="Login"
            onPress={() => router.push('/auth/login-options')}
            variant="primary"
            style={styles.mainButton}
          />
          <CustomButton
            title="Sign up"
            onPress={() => router.push('/auth/signup-options')}
            variant="secondary"
            style={styles.mainButton}
          />
        </View>

        {/* Social Login Section */}
        <View style={styles.socialSection}>
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.line} />
          </View>

          <SocialButton provider="google" onPress={handleGoogleSignIn} style={styles.socialButton} disabled={loading} />
          <SocialButton provider="apple" onPress={handleAppleSignIn} style={styles.socialButton} disabled={loading} />
          <SocialButton provider="tiktok" onPress={handleTikTokSignIn} style={styles.socialButton} disabled={loading} />
          <SocialButton provider="snapchat" onPress={handleSnapchatSignIn} style={{ ...styles.socialButton, ...styles.snapButton }} disabled={loading} />
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

          <View style={styles.legalLinks}>
            <Text
              style={styles.legalLink}
              onPress={() => router.push('/legal/privacy' as any)}
            >
              Privacy Policy
            </Text>
            <Text style={styles.legalSeparator}> • </Text>
            <Text
              style={styles.legalLink}
              onPress={() => router.push('/legal/terms' as any)}
            >
              Terms of Service
            </Text>
          </View>
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
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
  },
  logo: {
    width: 170,
    height: 170,
    marginBottom: 32,
    alignSelf: 'center',
    resizeMode: 'contain',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    marginBottom: 30,
  },
  mainButton: {
    marginBottom: 12,
  },
  socialSection: {
    marginBottom: 30,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#999',
    fontSize: 14,
  },
  socialButton: {
    marginBottom: 12,
  },
  snapButton: {
    backgroundColor: '#FFFC00',
    borderColor: '#FFFC00',
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
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  legalLink: {
    fontSize: 12,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 8,
  },
});
