import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, ScrollView, Modal, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { createPost, getCurrentUser, searchUsers } from '../lib/firebaseHelpers';

const GOOGLE_MAP_API_KEY = 'AIzaSyCYpwO1yUux1cHtd2bs-huu1hNKv1kC18c';

// Runtime import of ImagePicker with graceful fallback
let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.warn('expo-image-picker not available');
}

const { width } = Dimensions.get('window');
const GRID_SIZE = width / 3;

export default function CreatePostScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'picker' | 'details'>('picker');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState<any>(null);
  const [verifiedLocation, setVerifiedLocation] = useState<any>(null);
  const [taggedUsers, setTaggedUsers] = useState<any[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [verifiedQuery, setVerifiedQuery] = useState('');
  const [verifiedSuggestions, setVerifiedSuggestions] = useState<any[]>([]);
  const [loadingVerified, setLoadingVerified] = useState(false);

  useEffect(() => {
    loadUsers();
    loadGalleryImages();
  }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    const result = await searchUsers("", 20);
    if (result.success) {
      setUsers(result.data);
    }
    setLoadingUsers(false);
  };

  const loadGalleryImages = async () => {
    if (!ImagePicker) return;
    setLoadingGallery(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.granted) {
        // For demo purposes - in production you'd use expo-media-library to fetch actual gallery
        setGalleryImages([]);
      }
    } catch (err) {
      console.warn('Gallery permission error', err);
    }
    setLoadingGallery(false);
  };

  const searchGooglePlaces = async (query: string, isVerified: boolean) => {
    if (!query.trim()) {
      if (isVerified) setVerifiedSuggestions([]);
      else setLocationSuggestions([]);
      return;
    }

    if (isVerified) setLoadingVerified(true);
    else setLoadingLocations(true);

    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAP_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.predictions) {
        const suggestions = data.predictions.map((p: any) => ({
          id: p.place_id,
          name: p.structured_formatting.main_text,
          address: p.description,
          placeId: p.place_id
        }));
        
        if (isVerified) setVerifiedSuggestions(suggestions);
        else setLocationSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Google Places search error:', error);
    } finally {
      if (isVerified) setLoadingVerified(false);
      else setLoadingLocations(false);
    }
  };

  const getPlaceDetails = async (placeId: string) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAP_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.result && data.result.geometry) {
        return {
          lat: data.result.geometry.location.lat,
          lon: data.result.geometry.location.lng,
          name: data.result.name,
          address: data.result.formatted_address
        };
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    }
    return null;
  };

  const pickFromGallery = async () => {
    if (!ImagePicker) {
      Alert.alert('Not available', 'Image picker not installed.');
      return;
    }
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map((asset: any) => asset.uri);
        setSelectedImages(uris);
        // Don't auto-navigate to details, stay on picker
      }
    } catch (err) {
      console.warn('ImagePicker error', err);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  async function handleShare() {
    if (selectedImages.length === 0) {
      Alert.alert('No media', 'Please select media first');
      return;
    }
    
    const user = getCurrentUser();
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to create a post');
      router.replace('/login');
      return;
    }
    
    setLoading(true);
    try {
      // Detect media type from file extension or asset type
      const selectedMedia = selectedImages[0];
      const mediaType = selectedMedia.toLowerCase().endsWith('.mp4') || 
                       selectedMedia.toLowerCase().endsWith('.mov') || 
                       selectedMedia.toLowerCase().includes('video') 
                       ? 'video' 
                       : 'image';
      
      console.log('Creating post with mediaType:', mediaType, 'uri:', selectedMedia);
      
      // Get location coordinates if location is selected
      let locationData: any = null;
      if (location && location.placeId) {
        const placeDetails = await getPlaceDetails(location.placeId);
        if (placeDetails) {
          locationData = {
            name: location.name,
            address: location.address,
            lat: placeDetails.lat,
            lon: placeDetails.lon
          };
        }
      } else if (verifiedLocation && verifiedLocation.placeId) {
        const placeDetails = await getPlaceDetails(verifiedLocation.placeId);
        if (placeDetails) {
          locationData = {
            name: verifiedLocation.name,
            address: verifiedLocation.address,
            lat: placeDetails.lat,
            lon: placeDetails.lon,
            verified: true
          };
        }
      }
      
      const result = await createPost(
        user.uid, 
        selectedMedia, 
        caption, 
        locationData?.name || '', 
        mediaType,
        locationData,
        taggedUsers.map(u => u.uid)
      );
      
      if (result.success) {
        Alert.alert('Success', 'Post created successfully!', [
          { text: 'OK', onPress: () => {
            router.back();
          }}
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to create post');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'picker') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="x" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New post</Text>
          {selectedImages.length > 0 && (
            <TouchableOpacity onPress={() => setStep('details')}>
              <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
          )}
          {selectedImages.length === 0 && <View style={{ width: 50 }} />}
        </View>

        {/* Main Preview */}
        {selectedImages.length > 0 ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedImages[0] }} style={styles.previewImage} />
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <View style={styles.emptyPreview}>
              <Feather name="image" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Select photos or videos</Text>
            </View>
          </View>
        )}

        {/* Gallery Grid */}
        <View style={styles.galleryContainer}>
          <View style={styles.galleryHeader}>
            <Text style={styles.galleryTitle}>Recent</Text>
            <TouchableOpacity>
              <Feather name="chevron-down" size={20} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }}>
            <View style={styles.gridContainer}>
              {loadingGallery ? (
                <ActivityIndicator color="#f39c12" style={{ margin: 20 }} />
              ) : (
                <>
                  <TouchableOpacity style={styles.gridItem} onPress={pickFromGallery}>
                    <View style={styles.selectItem}>
                      <Feather name="folder" size={32} color="#666" />
                      <Text style={styles.selectText}>Select from Gallery</Text>
                    </View>
                  </TouchableOpacity>
                  {selectedImages.map((uri, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.gridItem}
                      onPress={() => {
                        const newImages = [...selectedImages];
                        [newImages[0], newImages[index]] = [newImages[index], newImages[0]];
                        setSelectedImages(newImages);
                      }}
                    >
                      <Image source={{ uri }} style={styles.gridImage} />
                      {index === 0 && (
                        <View style={styles.selectedBadge}>
                          <Text style={styles.badgeText}>1</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Clear All */}
        {selectedImages.length > 0 && (
          <View style={styles.bottomBar}>
            <TouchableOpacity onPress={() => setSelectedImages([])}>
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep('details')}>
              <Text style={styles.nextBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Details Step
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep('picker')}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New post</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Main Image Preview */}
        {selectedImages.length > 0 && (
          <View>
            <Image source={{ uri: selectedImages[0] }} style={styles.mainImage} />
            
            {/* Small Image Grid */}
            <View style={styles.smallGridContainer}>
              {selectedImages.map((uri, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.smallGridItem, index === 0 && styles.smallGridItemActive]}
                  onPress={() => {
                    const newImages = [...selectedImages];
                    [newImages[0], newImages[index]] = [newImages[index], newImages[0]];
                    setSelectedImages(newImages);
                  }}
                >
                  <Image source={{ uri }} style={styles.smallGridImage} />
                  {index === 0 && <View style={styles.activeIndicator} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Post Options */}
        <View style={styles.options}>
          {/* Caption */}
          <TouchableOpacity style={styles.optionRow}>
            <MaterialIcons name="notes" size={20} color="#000" style={{ marginRight: 12 }} />
            <TextInput
              placeholder="Add a caption"
              value={caption}
              onChangeText={setCaption}
              style={styles.captionInput}
              placeholderTextColor="#999"
            />
          </TouchableOpacity>

          {/* Location */}
          <TouchableOpacity style={styles.optionRow} onPress={() => setShowLocationModal(true)}>
            <Feather name="map-pin" size={20} color="#000" style={{ marginRight: 12 }} />
            <Text style={styles.optionText}>
              {location ? location.name : "Add a location"}
            </Text>
            <Feather name="chevron-right" size={20} color="#999" style={{ marginLeft: "auto" }} />
          </TouchableOpacity>

          {/* Verified Location */}
          <TouchableOpacity style={styles.optionRow} onPress={() => setShowVerifiedModal(true)}>
            <MaterialIcons name="verified" size={20} color="#000" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.optionText}>
                {verifiedLocation ? "Verified location added" : "Add a verified location"}
              </Text>
              {verifiedLocation && (
                <View style={styles.verifiedInfo}>
                  <Text style={styles.verifiedName}>{verifiedLocation.name}</Text>
                  <Text style={styles.verifiedAddress}>{verifiedLocation.address}</Text>
                </View>
              )}
            </View>
            {verifiedLocation ? (
              <TouchableOpacity onPress={() => setVerifiedLocation(null)}>
                <Feather name="x" size={20} color="#000" />
              </TouchableOpacity>
            ) : (
              <Feather name="chevron-right" size={20} color="#999" />
            )}
          </TouchableOpacity>

          {/* Tag People */}
          <TouchableOpacity style={styles.optionRow} onPress={() => setShowTagModal(true)}>
            <Feather name="user" size={20} color="#000" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.optionText}>Tag people</Text>
              {taggedUsers.length > 0 && (
                <Text style={styles.taggedCount}>{taggedUsers.length} people tagged</Text>
              )}
            </View>
            <Feather name="chevron-right" size={20} color="#999" style={{ marginLeft: "auto" }} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Share Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={() => {
          setCaption(""); setLocation(null); setVerifiedLocation(null); setTaggedUsers([]);
        }}>
          <Text style={styles.clearBottomText}>Clear all</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.shareBtn, loading && styles.shareBtnDisabled]} 
          onPress={handleShare}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.shareBtnText}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Location Modal */}
      <Modal visible={showLocationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Choose a location to tag</Text>
            <Text style={styles.modalSubtitle}>
              Search for a location using Google Places
            </Text>
            <View style={styles.searchContainer}>
              <Feather name="search" size={18} color="#999" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search location..."
                style={styles.searchInputField}
                placeholderTextColor="#999"
                value={locationQuery}
                onChangeText={(text) => {
                  setLocationQuery(text);
                  searchGooglePlaces(text, false);
                }}
              />
            </View>
            {loadingLocations && <ActivityIndicator color="#f39c12" style={{ marginVertical: 10 }} />}
            <FlatList
              data={locationSuggestions}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.locationItem}
                  onPress={async () => {
                    setLocation(item);
                    setShowLocationModal(false);
                    setLocationQuery('');
                    setLocationSuggestions([]);
                  }}
                >
                  <Feather name="map-pin" size={22} color="#000" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationName}>{item.name}</Text>
                    <Text style={styles.locationAddress}>{item.address}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                !loadingLocations && locationQuery ? (
                  <Text style={{ textAlign: 'center', color: '#999', marginVertical: 20 }}>
                    No results found
                  </Text>
                ) : null
              )}
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => {
                setShowLocationModal(false);
                setLocationQuery('');
                setLocationSuggestions([]);
              }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Verified Location Modal */}
      <Modal visible={showVerifiedModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.verifiedHeader}>
              <MaterialIcons name="verified" size={24} color="#f39c12" />
              <Text style={styles.modalTitle}>Add a verified location</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Search for verified locations using Google Places
            </Text>
            <View style={styles.searchContainer}>
              <Feather name="search" size={18} color="#999" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search verified location..."
                style={styles.searchInputField}
                placeholderTextColor="#999"
                value={verifiedQuery}
                onChangeText={(text) => {
                  setVerifiedQuery(text);
                  searchGooglePlaces(text, true);
                }}
              />
            </View>
            {loadingVerified && <ActivityIndicator color="#f39c12" style={{ marginVertical: 10 }} />}
            <FlatList
              data={verifiedSuggestions}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.locationItem}
                  onPress={() => {
                    setVerifiedLocation(item);
                    setShowVerifiedModal(false);
                    setVerifiedQuery('');
                    setVerifiedSuggestions([]);
                  }}
                >
                  <MaterialIcons name="verified" size={22} color="#f39c12" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationName}>{item.name}</Text>
                    <Text style={styles.locationAddress}>{item.address}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                !loadingVerified && verifiedQuery ? (
                  <Text style={{ textAlign: 'center', color: '#999', marginVertical: 20 }}>
                    No results found
                  </Text>
                ) : null
              )}
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => {
                setShowVerifiedModal(false);
                setVerifiedQuery('');
                setVerifiedSuggestions([]);
              }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tag People Modal */}
      <Modal visible={showTagModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Tag people</Text>
            <Text style={styles.modalSubtitle}>
              {taggedUsers.length > 0 ? `${taggedUsers.length} people tagged` : 'Search for people to tag'}
            </Text>
            <View style={styles.searchContainer}>
              <Feather name="search" size={18} color="#999" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search users..."
                style={styles.searchInputField}
                placeholderTextColor="#999"
                onChangeText={async (text) => {
                  const result = await searchUsers(text, 20);
                  if (result.success) {
                    setUsers(result.data);
                  }
                }}
              />
            </View>
            
            {/* Tagged Users */}
            {taggedUsers.length > 0 && (
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.taggedSectionTitle}>Tagged:</Text>
                {taggedUsers.map((user) => (
                  <View key={user.uid} style={styles.userItem}>
                    <Image 
                      source={{ uri: user.photoURL || "https://i.pravatar.cc/100?img=1" }} 
                      style={styles.userAvatar} 
                    />
                    <Text style={styles.userName}>{user.displayName || "User"}</Text>
                    <TouchableOpacity 
                      onPress={() => setTaggedUsers(taggedUsers.filter(u => u.uid !== user.uid))}
                      style={{ marginLeft: 'auto' }}
                    >
                      <Feather name="x" size={20} color="#999" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            
            {loadingUsers ? (
              <ActivityIndicator color="#f39c12" style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={users.filter(u => !taggedUsers.some(tagged => tagged.uid === u.uid))}
                keyExtractor={item => item.uid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => {
                      setTaggedUsers([...taggedUsers, item]);
                    }}
                  >
                    <Image 
                      source={{ uri: item.photoURL || "https://i.pravatar.cc/100?img=1" }} 
                      style={styles.userAvatar} 
                    />
                    <Text style={styles.userName}>{item.displayName || "User"}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No users found</Text>}
              />
            )}
            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => setShowTagModal(false)}>
                <Text style={styles.cancelText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#000',
  },
  headerTitle: { fontWeight: '600', fontSize: 17, color: '#fff' },
  nextText: { color: '#FFB800', fontWeight: '600', fontSize: 16 },
  previewContainer: {
    width: width,
    height: width,
    backgroundColor: '#111',
  },
  previewImage: { width: '100%', height: '100%' },
  emptyPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: '#666', marginTop: 12, fontSize: 16 },
  galleryContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  galleryTitle: { fontWeight: '600', fontSize: 16, color: '#000' },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    borderWidth: 0.5,
    borderColor: '#fff',
  },
  gridImage: { width: '100%', height: '100%' },
  selectItem: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectText: { color: '#666', marginTop: 8, fontSize: 13 },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFB800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#ddd',
  },
  clearText: { color: '#000', fontSize: 16 },
  nextBtn: {
    backgroundColor: '#FFB800',
    borderRadius: 8,
    paddingHorizontal: 32,
    paddingVertical: 10,
  },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  mainImage: { width: '100%', height: 375, backgroundColor: '#f5f5f5' },
  smallGridContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#fff',
  },
  smallGridItem: {
    width: 60,
    height: 60,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  smallGridItemActive: { borderWidth: 2, borderColor: '#FFB800' },
  smallGridImage: { width: '100%', height: '100%' },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFB800',
  },
  options: { paddingHorizontal: 16, backgroundColor: '#fff' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
  },
  optionText: { color: '#000', fontSize: 16, flex: 1 },
  captionInput: { flex: 1, fontSize: 16, color: '#000', padding: 0 },
  verifiedInfo: { marginTop: 4 },
  verifiedName: { fontWeight: '600', fontSize: 13, color: '#000' },
  verifiedAddress: { color: '#666', fontSize: 12, marginTop: 2 },
  clearAllBtn: { paddingVertical: 20, alignItems: 'center' },
  clearAllText: { color: '#000', fontSize: 16 },
  clearBottomText: { color: '#000', fontSize: 16, fontWeight: '500' },
  shareBtn: {
    backgroundColor: '#FFB800',
    borderRadius: 8,
    paddingHorizontal: 48,
    paddingVertical: 10,
  },
  shareBtnDisabled: { backgroundColor: '#ccc' },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 24,
    paddingHorizontal: 16,
    maxHeight: '80%',
  },
  modalTitle: { fontWeight: '600', fontSize: 18, color: '#000', marginBottom: 8 },
  modalSubtitle: { color: '#666', fontSize: 14, marginBottom: 16 },
  verifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInputField: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
  },
  locationName: { fontWeight: '600', fontSize: 15, color: '#000' },
  locationAddress: { color: '#666', fontSize: 13, marginTop: 3 },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  userName: { fontWeight: '500', fontSize: 15, color: '#000' },
  taggedCount: { color: '#f39c12', fontSize: 13, marginTop: 2 },
  taggedSectionTitle: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 8, marginTop: 8 },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#e5e5e5',
    marginTop: 16,
  },
  cancelText: { color: '#000', fontWeight: '500', fontSize: 16 },
  saveButton: {
    backgroundColor: '#FFB800',
    borderRadius: 6,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  addButton: {
    backgroundColor: '#000',
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
