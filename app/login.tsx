import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { signInUser } from '../lib/firebaseHelpers';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    if (!email || !email.includes('@')) return 'Enter a valid email';
    if (!password || password.length < 6) return 'Password must be at least 6 characters';
    return null;
  }

  async function handleLogin() {
    const v = validate();
    setError(v);
    if (v) return;
    setLoading(true);
    try {
      const result = await signInUser(email, password);
      if (result.success) {
        // Replace the stack with tabs home after login
        router.replace('/(tabs)/home');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.brand}>
          <Text style={styles.logo}>Lumna</Text>
          <Text style={styles.tag}>Discover & share travel</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={(t) => setEmail(t)}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={(t) => setPassword(t)}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleLogin} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <Text style={styles.small}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={[styles.small, styles.link]}> Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>By signing in you agree to our Terms.</Text>
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
  logo: { fontSize: 32, fontWeight: '800', color: SECONDARY },
  tag: { color: '#666', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  title: { fontSize: 20, fontWeight: '700', color: SECONDARY, marginBottom: 6 },
  subtitle: { color: '#666', marginBottom: 12 },
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
