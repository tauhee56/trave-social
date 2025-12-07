import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../../config/firebase';
import CustomButton from '../components/auth/CustomButton';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMethod, setResetMethod] = useState<'email' | 'phone'>('email');
  const [phone, setPhone] = useState('');

  const handleSendOTP = async () => {
    if (resetMethod === 'email') {
      if (!email.trim()) {
        Alert.alert('Error', 'Please enter your email address');
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }

      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, email.trim());
        // Navigate to OTP sent confirmation screen
        router.push({
          pathname: '/auth/otp-sent',
          params: { contact: email, method: 'email', flow: 'reset' }
        });
      } catch (error: any) {
        console.error('Password reset error:', error);
        let errorMessage = 'Failed to send reset email';

        if (error.code === 'auth/user-not-found') {
          errorMessage = 'No account found with this email. Please check your email or sign up.';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'Invalid email address';
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = 'Too many attempts. Please wait a few minutes and try again.';
        } else if (error.code === 'auth/network-request-failed') {
          errorMessage = 'Network error. Please check your internet connection.';
        }

        Alert.alert('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    } else {
      // Phone - we'll send OTP to email associated with phone
      if (!phone.trim()) {
        Alert.alert('Error', 'Please enter your phone number');
        return;
      }

      if (phone.length < 10) {
        Alert.alert('Error', 'Please enter a valid phone number');
        return;
      }

      setLoading(true);
      try {
        // For phone reset, navigate to OTP sent screen
        router.push({
          pathname: '/auth/otp-sent',
          params: { contact: phone, method: 'phone', flow: 'reset' }
        });
      } catch (error: any) {
        Alert.alert('Error', 'Failed to send OTP. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
              <Text style={styles.title}>Forgot password?</Text>
              <Text style={styles.subtitle}>
                Enter your email or phone number and we'll send you a verification code to reset your password.
              </Text>
            </View>

            {/* Method Toggle */}
            <View style={styles.methodToggle}>
              <TouchableOpacity 
                style={[styles.methodButton, resetMethod === 'email' && styles.methodButtonActive]}
                onPress={() => setResetMethod('email')}
              >
                <Ionicons name="mail-outline" size={20} color={resetMethod === 'email' ? '#fff' : '#666'} />
                <Text style={[styles.methodText, resetMethod === 'email' && styles.methodTextActive]}>Email</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.methodButton, resetMethod === 'phone' && styles.methodButtonActive]}
                onPress={() => setResetMethod('phone')}
              >
                <Ionicons name="call-outline" size={20} color={resetMethod === 'phone' ? '#fff' : '#666'} />
                <Text style={[styles.methodText, resetMethod === 'phone' && styles.methodTextActive]}>Phone</Text>
              </TouchableOpacity>
            </View>

            {/* Email Input */}
            {resetMethod === 'email' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
            )}

            {/* Phone Input */}
            {resetMethod === 'phone' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#999"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
                <Text style={styles.helperText}>
                  OTP will be sent to the email linked with this phone number
                </Text>
              </View>
            )}

            {/* Send OTP Button */}
            <CustomButton
              title={loading ? "Sending..." : "Send OTP"}
              onPress={handleSendOTP}
              variant="primary"
              style={styles.nextButton}
              disabled={loading}
            />
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
    lineHeight: 20,
  },
  methodToggle: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    gap: 8,
  },
  methodButtonActive: {
    backgroundColor: '#f39c12',
  },
  methodText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  methodTextActive: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 16,
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
  helperText: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    fontStyle: 'italic',
  },
  nextButton: {
    marginTop: 10,
  },
});
