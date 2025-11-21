import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { signUpUser } from '../lib/firebaseHelpers';

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    if (!name || name.length < 2) return 'Enter your name';
    if (!email || !email.includes('@')) return 'Enter a valid email';
    if (!password || password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirm) return 'Passwords do not match';
    return null;
  }

  async function handleSignup() {
    const v = validate();
    setError(v);
    if (v) return;
    setLoading(true);
    try {
      const result = await signUpUser(email, password, name);
      if (result.success) {
        router.replace('/(tabs)/home');
      } else {
        const errorMsg = result.error || 'Signup failed';
        console.error('Signup error:', errorMsg);
        setError(errorMsg.includes('network') ? 'Network error. Check internet connection.' : errorMsg);
      }
    } catch (e: any) {
      console.error('Signup exception:', e);
      const errorMsg = e.message || 'Signup failed';
      setError(errorMsg.includes('network') || errorMsg.includes('fetch') ? 'Network error. Check internet connection.' : errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.brand}>
          <Text style={styles.logo}>Create account</Text>
          <Text style={styles.tag}>Join Lumna — share your journeys</Text>
        </View>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor="#999"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSignup} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Creating...' : 'Create account'}</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <Text style={styles.small}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={[styles.small, styles.link]}> Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>We respect your privacy. Terms apply.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY = '#f39c12';
const SECONDARY = '#111';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 20, justifyContent: 'space-between' },
  brand: { alignItems: 'center', marginTop: 20 },
  logo: { fontSize: 20, fontWeight: '800', color: SECONDARY },
  tag: { color: '#666', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  input: { height: 48, borderRadius: 10, backgroundColor: '#f7f7f7', paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0', color: SECONDARY },
  btn: { height: 48, borderRadius: 10, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  small: { color: '#666' },
  link: { color: PRIMARY, fontWeight: '700' },
  error: { color: '#e0245e', marginBottom: 8 },
  footer: { alignItems: 'center', paddingVertical: 20 },
  footerText: { color: '#aaa', fontSize: 12 },
});
