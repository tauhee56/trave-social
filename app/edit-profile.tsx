import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { uploadImage } from '../lib/firebaseHelpers';
import { updateUserProfile } from '../lib/firebaseHelpers/index';
import { getUserProfile } from '../src/_services/firebaseService';
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
  const params = useLocalSearchParams();
  const user = useUser();
  const authLoading = useAuthLoading();
  
  // Get userId - prioritize paramUserId, then user.uid from context
  // The paramUserId is passed from profile screen and should be the logged-in user's ID
  const paramUserId = params.userId as string | undefined;
  
  console.log('📋 EditProfile loaded with:');
  console.log('   paramUserId:', paramUserId);
  console.log('   user?.uid:', user?.uid);
  console.log('   authLoading:', authLoading);
  
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
  const [userId, setUserId] = useState<string | null>(paramUserId || user?.uid || null);

  // Load profile whenever auth state changes or user changes
  useEffect(() => {
    let isMounted = true;

    const initializeProfile = async () => {
      try {
        // If we have paramUserId from params, use that directly
        if (paramUserId) {
          console.log('📋 Loading profile for paramUserId:', paramUserId);
          setUserId(paramUserId);
          setLoading(true);
          await loadProfileWithId(paramUserId);
          return;
        }

        // If auth is still loading, wait
        if (authLoading) {
          console.log('⏳ Auth is loading...');
          setLoading(true);
          return;
        }

        if (!isMounted) return;

        // If user exists, load their profile data
        if (user?.uid) {
          console.log('👤 User found, loading profile:', user.uid);
          setUserId(user.uid);
          setLoading(true);
          await loadProfileWithId(user.uid);
        } else {
          // No user - just show empty form
          console.warn('⚠️ No authenticated user - showing empty edit form');
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ Error in initializeProfile:', err);
        if (isMounted) setLoading(false);
      }
    };

    initializeProfile();

    return () => {
      isMounted = false;
    };
  }, [authLoading, user?.uid, paramUserId]);

  async function loadProfileWithId(uid: string) {
    console.log('🔄 Loading profile for uid:', uid);
    try {
      const result = await getUserProfile(uid);
      
      if (result?.success && result?.data) {
        console.log('✅ Profile loaded:', {
          displayName: result.data.displayName,
          email: result.data.email,
        });
        
        // Map fields correctly - response has displayName, not name
        setName(result.data.displayName || result.data.name || '');
        setUsername((result.data as any).username || (result.data as any).displayName || '');
        setBio(result.data.bio || '');
        setWebsite(result.data.website || '');
        setLocation((result.data as any).location || '');
        setPhone((result.data as any).phone || '');
        setInterests((result.data as any).interests || '');
        setAvatar(result.data.avatar || '');
        setIsPrivate(!!(result.data as any).isPrivate);
        setError(null);
      } else {
        console.warn('⚠️ Profile fetch returned no data - using empty form');
        setError(null);
      }
    } catch (err) {
      console.warn('⚠️ Error loading profile - still showing form:', err);
      setError(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile() {
    if (!user?.uid) {
      console.warn('⚠️ No user UID - showing empty form');
      setLoading(false);
      return;
    }
    
    console.log('🔄 Loading profile for user:', user.uid);
    setUserId(user.uid); // Store userId for later use in save
    try {
      const result = await getUserProfile(user.uid);
      
      if (result?.success && result?.data) {
        console.log('✅ Profile loaded:', {
          name: result.data.name,
          username: result.data.username,
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
        setError(null);
      } else {
        console.warn('⚠️ Profile fetch returned no data - using empty form');
        setError(null);
      }
    } catch (err) {
      console.warn('⚠️ Error loading profile - still showing form:', err);
      setError(null);
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

    // Ensure user is available - try user.uid first, then fallback to stored userId
    const currentUserId = user?.uid || userId;
    
    if (!currentUserId) {
      console.error('❌ User not authenticated - cannot save profile');
      console.log('   authLoading:', authLoading);
      console.log('   user?.uid:', user?.uid);
      console.log('   stored userId:', userId);
      Alert.alert('Error', 'You must be logged in to save your profile');
      return;
    }

    console.log('💾 Saving profile with userId:', currentUserId);
    
    console.log('💾 Saving profile changes...');
    console.log('  UserId:', userId);
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
        const uploadResult = await uploadImage(newAvatarUri, `avatars/${currentUserId}`);
        if (uploadResult && uploadResult.success && uploadResult.url) {
          finalAvatar = uploadResult.url;
          console.log('✅ Avatar uploaded:', finalAvatar.substring(0, 50));
        } else {
          throw new Error(uploadResult.error || 'Failed to upload image');
        }
      }
      
      // Update profile with avatar URL
      console.log('💾 Updating Firestore profile...');
      const result = await updateUserProfile(currentUserId, {
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

  if (loading && authLoading) {
    // Only show full loading screen while auth is still loading AND loading profile
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]} edges={["top", "bottom"]}>
        <ActivityIndicator size="large" color="#f39c12" />
        <Text style={{ marginTop: 16, color: '#666', fontSize: 14 }}>Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  // If auth is done but profile data still loading, show form with overlay indicator
  // This prevents the user from being stuck on a blank loader screen
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
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer} disabled={loading}>
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
              editable={!loading}
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
              editable={!loading}
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
      
      {/* Loading overlay when fetching profile data (but auth is done) */}
      {loading && !authLoading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#f39c12" />
            <Text style={{ marginTop: 12, color: '#666', fontSize: 14 }}>Loading profile data...</Text>
          </View>
        </View>
      )}
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
