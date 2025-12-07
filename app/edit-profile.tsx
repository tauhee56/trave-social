import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { uploadImage } from '../lib/firebaseHelpers';
import { getCurrentUser, getUserProfile, updateUserProfile } from '../lib/firebaseHelpers/index';

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
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const user = getCurrentUser() as { uid: string } | null;
    if (!user || !user.uid) {
      router.replace('/auth/welcome');
      return;
    }
    const result = await getUserProfile(user.uid);
    if (result && result.success && result.data) {
      setName(result.data.name || '');
      setBio(result.data.bio || '');
      setWebsite(result.data.website || '');
      setAvatar(result.data.avatar || '');
      setIsPrivate(!!(result.data as any).isPrivate);
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
    
    const user = getCurrentUser() as { uid: string } | null;
    if (!user || !user.uid) {
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
        if (uploadResult && uploadResult.success && uploadResult.url) {
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
        isPrivate,
      });
      
      if (result && result.success) {
        // If privacy setting changed, update all user's posts
        console.log('🔄 Updating posts privacy to:', isPrivate);
        const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../config/firebase');
        
        try {
          const postsQuery = query(
            collection(db, 'posts'),
            where('userId', '==', user.uid)
          );
          const postsSnapshot = await getDocs(postsQuery);
          
          console.log(`📝 Found ${postsSnapshot.size} posts to update`);
          
          // Get user's followers list for allowedFollowers
          const userProfileRes = await getUserProfile(user.uid);
          const followers = userProfileRes?.data?.followers || [];
          
          console.log(`👥 User has ${followers.length} followers`);
          
          // Update all posts with new privacy settings
          const updatePromises = postsSnapshot.docs.map(async (postDoc) => {
            console.log(`🔒 Updating post ${postDoc.id} - isPrivate: ${isPrivate}, allowedFollowers: ${followers.length}`);
            await updateDoc(doc(db, 'posts', postDoc.id), {
              isPrivate: isPrivate,
              allowedFollowers: isPrivate ? followers : []
            });
          });
          
          await Promise.all(updatePromises);
          console.log(`✅ Successfully updated ${postsSnapshot.size} posts!`);
        } catch (error) {
          console.error('❌ Error updating posts privacy:', error);
          Alert.alert('Warning', `Profile updated but some posts may not have been updated. Please try again.`);
        }
        
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
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
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
              value={bio} 
              onChangeText={setBio} 
              style={styles.input} 
              placeholder="Lumna travel" 
              placeholderTextColor="#999" 
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
        </View>

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
                        const { getAuth, signOut } = await import('firebase/auth');
                        const auth = getAuth();
                        await signOut(auth);
                        console.log('Logout successful, redirecting to welcome');
                        router.replace('/auth/welcome');
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
