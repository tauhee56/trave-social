import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../components/auth/CustomButton';
import CustomInput from '../components/auth/CustomInput';

export default function PhoneSignUpScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+33');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = async () => {
    setError('');
    
    // Validation
    if (!phoneNumber || phoneNumber.length < 8) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    
    try {
      const fullPhone = `${countryCode}${phoneNumber}`;
      // For React Native, you'd use @react-native-firebase/auth
      // This is simplified - implement proper phone auth for mobile
      
      // Navigate to OTP screen
      router.push({
        pathname: '/auth/phone-otp',
        params: { phoneNumber: fullPhone }
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Sign up</Text>
          <Text style={styles.subtitle}>Let's keep it quick, 2 steps and you're in.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>By phone number</Text>
          
          {/* Country Code Picker */}
          <TouchableOpacity style={styles.countryPicker}>
            <Text style={styles.countryCode}>France</Text>
            <Ionicons name="chevron-down" size={20} color="#000" />
          </TouchableOpacity>

          {/* Phone Input */}
          <CustomInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+33"
            keyboardType="phone-pad"
            error={error}
          />

          {/* Next Button */}
          <CustomButton
            title="Next"
            onPress={handleNext}
            loading={loading}
            variant="primary"
            style={styles.nextButton}
          />
        </View>

        {/* Social Options */}
        <View style={styles.socialSection}>
          <CustomButton
            title="Continue with Google"
            onPress={() => {}}
            variant="outline"
            style={styles.socialButton}
          />
          <CustomButton
            title="Continue with Apple"
            onPress={() => {}}
            variant="outline"
            style={styles.socialButton}
          />
          <CustomButton
            title="Continue with TikTok"
            onPress={() => {}}
            variant="secondary"
            style={styles.socialButton}
          />
          <CustomButton
            title="Continue with Snap"
            onPress={() => {}}
            variant="outline"
            style={styles.snapButton}
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
    padding: 20,
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
  form: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    height: 50,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  countryCode: {
    fontSize: 15,
    color: '#000',
  },
  nextButton: {
    marginTop: 8,
  },
  socialSection: {
    marginBottom: 20,
  },
  socialButton: {
    marginBottom: 12,
  },
  snapButton: {
    backgroundColor: '#FFFC00',
    borderColor: '#FFFC00',
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
