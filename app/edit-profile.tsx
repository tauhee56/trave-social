import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getCurrentUser, getUserProfile, updateUserProfile, uploadImage } from '../lib/firebaseHelpers';

// Runtime import with fallback
let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.warn('expo-image-picker not available');
}

export default function EditProfile() {
    // Default avatar from Firebase Storage
    const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
  const router = useRouter();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [avatar, setAvatar] = useState('');
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    
    const result = await getUserProfile(user.uid);
    if (result.success && result.data) {
      setName(result.data.name || '');
      setBio(result.data.bio || '');
      setWebsite(result.data.website || '');
      setAvatar(result.data.avatar || '');
    }
    setLoading(false);
  }

  function validate() {
    if (!name || name.trim().length < 2) return 'Please enter your name';
    return null;
  }

  async function handleSave() {
    const v = validate();
    setError(v);
    if (v) return;
    
    const user = getCurrentUser();
    if (!user) {
      Alert.alert('Error', 'Not signed in');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      let finalAvatar = avatar;
      
      // Upload new avatar if picked
      if (newAvatarUri) {
        const uploadResult = await uploadImage(newAvatarUri, `avatars/${user.uid}`);
        if (uploadResult.success && uploadResult.url) {
          finalAvatar = uploadResult.url;
        } else {
          throw new Error(uploadResult.error || 'Failed to upload image');
        }
      }
      // Update profile with avatar URL
      const result = await updateUserProfile(user.uid, {
        name,
        bio,
        website,
        avatar: finalAvatar,
      });
      
      if (result.success) {
        await loadProfile();
        Alert.alert('Success', 'Profile updated!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  async function pickImage() {
    if (!ImagePicker) {
      Alert.alert('Not available', 'Image picker not installed. Run: npx expo install expo-image-picker');
      return;
    }
    
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow access to your photos.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setNewAvatarUri(uri);
        setAvatar(uri); // Preview locally
      }
    } catch (err) {
      console.warn('ImagePicker error', err);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]} edges={["top", "bottom"]}>
        <ActivityIndicator size="large" color="#f39c12" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, saving && { opacity: 0.7 }]} disabled={saving}>
            <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.avatarSection}>
            <Image source={{ uri: avatar || DEFAULT_AVATAR_URL }} style={styles.avatar} />
            <TouchableOpacity style={styles.changePhotoBtn} onPress={pickImage}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Full name</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Your name" placeholderTextColor="#999" />

          <Text style={styles.fieldLabel}>Bio</Text>
          <TextInput value={bio} onChangeText={setBio} style={[styles.input, { height: 100 }]} placeholder="Short bio" placeholderTextColor="#999" multiline />

          <Text style={styles.fieldLabel}>Website</Text>
          <TextInput value={website} onChangeText={setWebsite} style={styles.input} placeholder="https://example.com" placeholderTextColor="#999" />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={saving}>
            <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY = '#f39c12';
const SECONDARY = '#111';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  cancel: { color: '#666' },
  headerTitle: { fontWeight: '700', fontSize: 16, color: SECONDARY },
  saveBtn: { backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  saveText: { color: '#fff', fontWeight: '700' },
  content: { padding: 16 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eee' },
  changePhotoBtn: { marginTop: 12 },
  changePhotoText: { color: PRIMARY, fontWeight: '700' },
  fieldLabel: { color: '#666', marginBottom: 6, marginTop: 8 },
  input: { height: 48, borderRadius: 10, backgroundColor: '#f7f7f7', paddingHorizontal: 12, borderWidth: 1, borderColor: '#f0f0f0', color: SECONDARY },
  btn: { height: 48, borderRadius: 10, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '700' },
  error: { color: '#e0245e', marginTop: 12 },
});
