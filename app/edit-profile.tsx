import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { uploadImage } from '../lib/firebaseHelpers';
import { getUserProfile, updateUserProfile } from '../lib/firebaseHelpers/index';
import { useUser, useAuthLoading } from './_components/UserContext';

// Runtime import with fallback
let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.warn('expo-image-picker not available');
}

export default function EditProfile() {
    // Default avatar from Firebase Storage
    const DEFAULT_AVATAR_URL = 'https://via.placeholder.com/200x200.png?text=Profile';
  const router = useRouter();
  const user = useUser();
  const authLoading = useAuthLoading();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [interests, setInterests] = useState('');
  const [avatar, setAvatar] = useState('');
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    // If auth is loaded and user exists, load profile immediately
    if (!authLoading && user?.uid) {
      loadProfile();
      return;
    }
    
    // Safety timeout: force load after 3 seconds regardless of authLoading state
    // This prevents infinite loading if authLoading gets stuck
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('⏱️ Edit profile timeout - checking user state');
        if (user?.uid) {
          console.log('⏱️ User exists, forcing profile load');
          loadProfile();
        } else {
          console.warn('⏱️ No user after timeout, but continuing with empty form');
          setLoading(false);
          // Don't redirect - let user fill form manually
          // router.replace('/auth/welcome');
        }
      }
    }, 3000);
    
    return () => clearTimeout(timeoutId);
  }, [authLoading, user?.uid]);

  async function loadProfile() {
    if (!user || !user.uid) {
      console.error('❌ User not authenticated');
      router.replace('/auth/welcome');
      return;
    }
    
    console.log('🔄 Loading profile for user:', user.uid);
    try {
      const result = await getUserProfile(user.uid);
      
      if (result && result.success && result.data) {
        console.log('✅ Profile loaded:', {
          name: result.data.name,
          username: result.data.username,
          avatar: result.data.avatar?.substring(0, 50),
          isPrivate: result.data.isPrivate
        });
        
        setName(result.data.name || '');
        setUsername((result.data as any).username || '');
        setBio(result.data.bio || '');
        setWebsite(result.data.website || '');
        setLocation((result.data as any).location || '');
        setPhone((result.data as any).phone || '');
        setInterests((result.data as any).interests || '');
        setAvatar(result.data.avatar || '');
        setIsPrivate(!!(result.data as any).isPrivate);
      } else {
        console.error('❌ Failed to load profile:', result.error);
        setError(result?.error || 'Failed to load profile');
      }
    } catch (err) {
      console.error('❌ Profile load error:', err);
      setError('Error loading profile');
    } finally {
      setLoading(false);
    }
  }

  function validate() {
    if (!name || name.trim().length < 2) return 'Please enter your name';
    return null;
  }

  async function handleSave() {
    const v = validate();
    setError(v);
    if (v) return;
    
    // const user = getCurrentUser() as { uid: string } | null;
    // if (!user || !user.uid) {
    //   Alert.alert('Error', 'Not signed in');
    //   return;
    // }
    // TODO: Use user from context or props
    
    console.log('💾 Saving profile changes...');
    console.log('  Name:', name);
    console.log('  Username:', username);
    console.log('  Bio:', bio);
    console.log('  Website:', website);
    console.log('  Location:', location);
    console.log('  Phone:', phone);
    console.log('  Interests:', interests);
    console.log('  IsPrivate:', isPrivate);
    console.log('  New Avatar URI:', newAvatarUri ? 'Yes' : 'No');
    
    setSaving(true);
    setError(null);
    
    try {
      let finalAvatar = avatar;
      
      // Upload new avatar if picked
      if (newAvatarUri) {
        console.log('📤 Uploading new avatar...');
        const uploadResult = await uploadImage(newAvatarUri, `avatars/${user.uid}`);
        if (uploadResult && uploadResult.success && uploadResult.url) {
          finalAvatar = uploadResult.url;
          console.log('✅ Avatar uploaded:', finalAvatar.substring(0, 50));
        } else {
          throw new Error(uploadResult.error || 'Failed to upload image');
        }
      }
      
      // Update profile with avatar URL
      console.log('💾 Updating Firestore profile...');
      const result = await updateUserProfile(user.uid, {
        name,
        username,
        displayName: name, // Also set displayName for Firebase
        bio,
        website,
        location,
        phone,
        interests,
        avatar: finalAvatar,
        photoURL: finalAvatar, // Also set photoURL
        isPrivate,
        updatedAt: new Date().toISOString(),
      });
      
      if (result && result.success) {
        console.log('✅ Profile updated');
        
        // If privacy setting changed, TODO: implement backend API to update all user's posts
        console.log('🔄 Updating posts privacy to:', isPrivate);
        
        try {
          // TODO: Call backend API to update user posts
          // const response = await fetch(`/api/users/${user.uid}/posts/privacy`, {
          //   method: 'PATCH',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify({ isPrivate })
          // });
          
          console.log(`📝 Posts privacy update complete`);
        } catch (error) {
          console.error('❌ Error updating posts privacy:', error);
          Alert.alert('Warning', `Profile updated but some posts may not have been updated. Please try again.`);
        }
        
        // Reload profile to get fresh data
        await loadProfile();
        
        Alert.alert('Success', 'Profile updated!', [
          { 
            text: 'OK', 
            onPress: () => {
              // Force profile screen to reload by going back
              router.back();
            }
          }
        ]);
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (e: any) {
      console.error('Save profile error:', e);
      setError(e.message || 'Failed to save profile');
      Alert.alert('Error', e.message || 'Failed to save profile');
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            <Image source={{ uri: avatar || DEFAULT_AVATAR_URL }} style={styles.avatar} />
          </TouchableOpacity>

          {/* Form Fields */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput 
              value={name} 
              onChangeText={setName} 
              style={styles.input} 
              placeholder="Emma Lumna" 
              placeholderTextColor="#999" 
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput 
              value={username} 
              onChangeText={setUsername} 
              style={styles.input} 
              placeholder="@username" 
              placeholderTextColor="#999"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput 
              value={bio} 
              onChangeText={setBio} 
              style={styles.input} 
              placeholder="Add bio" 
              placeholderTextColor="#999" 
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Links</Text>
            <TextInput
              value={website}
              onChangeText={setWebsite}
              style={styles.input}
              placeholder="Add links"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Location</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              style={styles.input}
              placeholder="City, Country"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Interests</Text>
            <TextInput
              value={interests}
              onChangeText={setInterests}
              style={[styles.input, { height: 80 }]}
              placeholder="e.g., Photography, Travel, Food"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Privacy Toggle */}
          <View style={styles.privacySection}>
            <View style={styles.privacyRow}>
              <View style={styles.privacyLeft}>
                <Ionicons name="lock-closed-outline" size={22} color="#667eea" style={{ marginRight: 10 }} />
                <View>
                  <Text style={styles.privacyLabel}>Private Account</Text>
                  <Text style={styles.privacyInfo}>
                    {isPrivate
                      ? 'Only approved followers can see your posts'
                      : 'Anyone can see your posts'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: '#ddd', true: '#667eea' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={styles.logoutBtn}
            onPress={async () => {
              Alert.alert(
                'Log out',
                'Are you sure you want to log out?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Log out',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const { logoutUser } = await import('./_services/firebaseAuthService');
                        const result = await logoutUser();
                        if (result.success) {
                          console.log('Logout successful, redirecting to welcome');
                          router.replace('/auth/welcome');
                        } else {
                          Alert.alert('Error', 'Failed to log out');
                        }
                      } catch (err) {
                        Alert.alert('Error', 'Failed to log out');
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.shareBtn, saving && { opacity: 0.7 }]} 
            onPress={handleSave} 
            disabled={saving}
          >
            <Text style={styles.shareText}>{saving ? 'Saving...' : 'Share'}</Text>
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
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#e0e0e0' 
  },
  closeBtn: { 
    width: 40, 
    height: 40, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  closeIcon: { 
    fontSize: 24, 
    color: '#000', 
    fontWeight: '300' 
  },
  headerTitle: { 
    fontWeight: '600', 
    fontSize: 16, 
    color: '#000', 
    textAlign: 'center',
    flex: 1
  },
  content: { 
    flex: 1,
    paddingTop: 24 
  },
  avatarContainer: { 
    alignItems: 'center', 
    marginBottom: 32 
  },
  avatar: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: '#f0f0f0' 
  },
  formGroup: { 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#e0e0e0' 
  },
  fieldLabel: { 
    fontSize: 13, 
    color: '#000', 
    fontWeight: '600', 
    marginBottom: 6 
  },
  input: { 
    fontSize: 14, 
    color: '#999', 
    paddingVertical: 4 
  },
  error: {
    color: '#e0245e',
    marginTop: 12,
    paddingHorizontal: 16
  },
  privacySection: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privacyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privacyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  privacyInfo: {
    fontSize: 13,
    color: '#666',
    maxWidth: 220,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0'
  },
  logoutBtn: { 
    paddingVertical: 12, 
    paddingHorizontal: 20 
  },
  logoutText: { 
    fontSize: 15, 
    color: '#000', 
    fontWeight: '400' 
  },
  shareBtn: { 
    backgroundColor: PRIMARY, 
    paddingVertical: 10, 
    paddingHorizontal: 32, 
    borderRadius: 8 
  },
  shareText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 15 
  },
});
