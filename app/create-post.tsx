import { Feather, MaterialIcons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createPost, DEFAULT_CATEGORIES, ensureDefaultCategories, getCategories, getCurrentUser, getPassportTickets, searchUsers } from '../lib/firebaseHelpers';

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

type LocationType = {
  name: string;
  address: string;
  placeId?: string;
  lat: number;
  lon: number;
  verified?: boolean;
};

type UserType = {
  uid: string;
  displayName?: string;
  userName?: string;
};

export default function CreatePostScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'picker' | 'details'>('picker');
  const [caption, setCaption] = useState<string>('');
  const [location, setLocation] = useState<LocationType | null>(null);
  const [verifiedLocation, setVerifiedLocation] = useState<LocationType | null>(null);
  const [taggedUsers, setTaggedUsers] = useState<UserType[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<boolean>(false);

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [showVerifiedModal, setShowVerifiedModal] = useState<boolean>(false);
  const [showTagModal, setShowTagModal] = useState<boolean>(false);

  // Gallery
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryVideos, setGalleryVideos] = useState<string[]>([]);
  const [loadingGallery, setLoadingGallery] = useState<boolean>(false);

  // Category
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedCategories, setSelectedCategories] = useState<{ name: string; image: string }[]>([]);
  const [categorySearch, setCategorySearch] = useState<string>('');

  // Gallery tab state for switching between images/videos
  const [galleryTab, setGalleryTab] = useState<'images' | 'videos'>('images');

  useEffect(() => {
    async function setupCategories() {
      await ensureDefaultCategories();
      const cats = await getCategories();
      // Fix: filter categories to correct type
      const validCategories = (Array.isArray(cats) 
        ? cats.filter((c): c is { name: string; image: string } => c && typeof c.name === 'string' && typeof c.image === 'string') 
        : DEFAULT_CATEGORIES) as { name: string; image: string }[];
      setCategories(validCategories);
    }
    setupCategories();
  }, []);

  // Location modal
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [locationResults, setLocationResults] = useState<LocationType[]>([]);
  const [loadingLocationResults, setLoadingLocationResults] = useState<boolean>(false);

  // Verified location modal
  const [verifiedSearch, setVerifiedSearch] = useState<string>('');
  const [verifiedResults, setVerifiedResults] = useState<LocationType[]>([]);
  const [loadingVerifiedResults, setLoadingVerifiedResults] = useState<boolean>(false);

  // Tag people modal
  const [userSearch, setUserSearch] = useState<string>('');
  const [userResults, setUserResults] = useState<UserType[]>([]);
  const [loadingUserResults, setLoadingUserResults] = useState<boolean>(false);

  // Verified location options: current device location + passport tickets
  const [verifiedOptions, setVerifiedOptions] = useState<LocationType[]>([]);

  useEffect(() => {
    async function fetchVerifiedOptions() {
      const user = getCurrentUser();
      if (!user) return;
      let options: LocationType[] = [];
      // Get current device location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          options.push({
            name: 'Current Location',
            address: '',
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
            verified: true
          });
        }
      } catch {}
      // Get passport tickets
      try {
        const tickets = await getPassportTickets(user.uid);
        // Debug: log ticket structure
        if (tickets && tickets.length > 0) {
          console.log('Sample passport ticket:', tickets[0]);
        }
        // Deduplicate by location name and lat/lon (update keys after log)
        const uniqueLocations: { [key: string]: LocationType } = {};
        tickets.forEach(ticketRaw => {
          const ticket = ticketRaw as {
            city?: string;
            coordinates?: { latitude: number; longitude: number };
            countryName?: string;
          };
          if (ticket.city && ticket.coordinates && ticket.coordinates.latitude && ticket.coordinates.longitude) {
            const key = `${ticket.city}_${ticket.coordinates.latitude}_${ticket.coordinates.longitude}`;
            if (!uniqueLocations[key]) {
              uniqueLocations[key] = {
                name: ticket.city,
                address: ticket.countryName || '',
                lat: ticket.coordinates.latitude,
                lon: ticket.coordinates.longitude,
                verified: true
              };
            }
          }
        });
        options = [...options, ...Object.values(uniqueLocations)];
      } catch {}
      setVerifiedOptions(options);
    }
    fetchVerifiedOptions();
  }, []);

  useEffect(() => {
    loadGalleryImages();
    loadGalleryVideos();
  }, []);

  const loadGalleryImages = async (): Promise<void> => {
    setLoadingGallery(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        const assets = await MediaLibrary.getAssetsAsync({ mediaType: ['photo'], first: 60 });
        setGalleryImages(assets.assets.map((asset: { uri: string }) => asset.uri));
      } else {
        Alert.alert('Permission required', 'Please allow access to your photos to create a post.');
      }
    } catch (err) {
      console.warn('Gallery permission error', err);
      setGalleryImages([]);
    }
    setLoadingGallery(false);
  };

  const loadGalleryVideos = async (): Promise<void> => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        const assets = await MediaLibrary.getAssetsAsync({ mediaType: ['video'], first: 30 });
        setGalleryVideos(assets.assets.map((asset: { uri: string }) => asset.uri));
      } else {
        setGalleryVideos([]);
      }
    } catch (err) {
      setGalleryVideos([]);
    }
  };

  const handleShare = async (): Promise<void> => {
    if (selectedImages.length === 0) {
      Alert.alert('Select at least one image or video to post.');
      return;
    }
    setLoading(true);
    try {
      const mediaType = selectedImages.length > 0 && (selectedImages[0].toLowerCase().endsWith('.mp4') || selectedImages[0].toLowerCase().endsWith('.mov') || selectedImages[0].toLowerCase().includes('video')) ? 'video' : 'image';
      let locationData: LocationType | null = null;
      if (location && location.placeId) {
        const placeDetails = await getPlaceDetails(location.placeId);
        if (placeDetails) {
          locationData = {
            name: location.name,
            address: location.address,
            lat: placeDetails.lat ?? 0,
            lon: placeDetails.lon ?? 0,
            verified: false // manually added location, not verified
          };
        }
      } else if (verifiedLocation && verifiedLocation.placeId) {
        const placeDetails = await getPlaceDetails(verifiedLocation.placeId);
        if (placeDetails) {
          locationData = {
            name: verifiedLocation.name,
            address: verifiedLocation.address,
            lat: placeDetails.lat ?? 0,
            lon: placeDetails.lon ?? 0,
            verified: true // verified location
          };
        }
      }
      const user = getCurrentUser();
      if (!user) throw new Error('User not found');
      // Save selected category with post
      const selectedCategory = selectedCategories.length > 0 ? selectedCategories[0] : null;
      const result = await createPost(
        user.uid,
        selectedImages,
        caption,
        location ? location.name : '',
        mediaType,
        locationData ?? undefined,
        undefined,
        selectedCategory ? selectedCategory.name : ''
      );
      if (result.success) {
        Alert.alert('Success', 'Post created successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to create post');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const getPlaceDetails = async (placeId: string): Promise<{ lat: number; lon: number } | null> => {
    // Dummy implementation for demo
    return { lat: 51.5074, lon: -0.1278 };
  };

  // Helper to get video thumbnail
  const getVideoThumbnail = async (uri: string): Promise<string | null> => {
    try {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(uri);
      return assetInfo?.filename ? uri : null;
    } catch {
      return null;
    }
  };

  // --- END OF COMPONENT ---
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {step === 'picker' ? (
          <View style={{ flex: 1 }}>
            {/* Gallery header with picker button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', padding: 8 }}>
              <TouchableOpacity
                onPress={async () => {
                  if (ImagePicker) {
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.All,
                      allowsMultipleSelection: true,
                      quality: 1,
                    });
                    if (!result.canceled && result.assets) {
                      const uris = result.assets.map((a: any) => a.uri);
                      setSelectedImages(uris);
                      setStep('details'); // Go directly to post details after selection
                    }
                  }
                }}
                style={{ padding: 8, borderRadius: 8, backgroundColor: '#f5f5f5', flexDirection: 'row', alignItems: 'center', marginRight: 12 }}
              >
                <Feather name="folder" size={20} color="#FFB800" />
                <Text style={{ marginLeft: 6, color: '#222', fontWeight: '600' }}>Albums</Text>
              </TouchableOpacity>
              <Text style={{ fontWeight: '600', fontSize: 16, color: '#222' }}>Gallery</Text>
            </View>
            {/* Gallery grid (images only) */}
            <FlatList
              data={galleryImages}
              numColumns={3}
              keyExtractor={(uri, idx) => uri + idx}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => {
                  if (selectedImages.includes(item)) {
                    setSelectedImages(selectedImages.filter(uri => uri !== item));
                  } else {
                    setSelectedImages([...selectedImages, item]);
                  }
                }} style={{ width: GRID_SIZE, height: GRID_SIZE, borderWidth: 1, borderColor: '#eee' }}>
                  <Image source={{ uri: item }} style={{ width: '100%', height: '100%' }} />
                  {selectedImages.includes(item) && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 3, borderColor: '#FFB800', borderRadius: 8 }} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}><Text>No images found</Text></View>}
            />
            <TouchableOpacity onPress={() => setStep('details')} style={{ backgroundColor: '#FFB800', margin: 16, borderRadius: 6, padding: 16, alignItems: 'center' }}>
              <Text style={{ color: '#000', fontWeight: '600', fontSize: 16 }}>Next</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}>
              <TouchableOpacity onPress={() => setStep('picker')}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={{ fontWeight: '600', fontSize: 17, color: '#000' }}>New post</Text>
              <View style={{ width: 50 }} />
            </View>
            {/* Image slider preview */}
            <View style={{ width: width, height: width, backgroundColor: '#f8f8f8', alignItems: 'center', justifyContent: 'center' }}>
              {selectedImages.length > 1 ? (
                <FlatList
                  data={selectedImages}
                  horizontal
                  pagingEnabled
                  keyExtractor={(uri, idx) => uri + idx}
                  renderItem={({ item }) => (
                    item.toLowerCase().endsWith('.mp4') || item.toLowerCase().endsWith('.mov') || item.toLowerCase().includes('video') ? (
                      <Video
                        source={{ uri: item }}
                        style={{ width: width, height: width, backgroundColor: '#000' }}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={false}
                        useNativeControls={true}
                        isLooping={false}
                      />
                    ) : (
                      <Image source={{ uri: item }} style={{ width: width, height: width }} />
                    )
                  )}
                  showsHorizontalScrollIndicator={false}
                />
              ) : selectedImages.length === 1 ? (
                selectedImages[0].toLowerCase().endsWith('.mp4') || selectedImages[0].toLowerCase().endsWith('.mov') || selectedImages[0].toLowerCase().includes('video') ? (
                  <Video
                    source={{ uri: selectedImages[0] }}
                    style={{ width: width, height: width, backgroundColor: '#000' }}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    useNativeControls={true}
                    isLooping={false}
                  />
                ) : (
                  <Image source={{ uri: selectedImages[0] }} style={{ width: width, height: width }} />
                )
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="image" size={64} color="#ccc" />
                  <Text style={{ color: '#666', marginTop: 12, fontSize: 16 }}>No image selected</Text>
                </View>
              )}
            </View>
            {/* Caption & tags */}
            <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16 }}>
              <TextInput
                style={{ fontSize: 16, color: '#111', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                placeholder="Add a caption"
                placeholderTextColor="#888"
                value={caption}
                onChangeText={setCaption}
              />
              <TextInput
                style={{ fontSize: 15, color: '#111', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                placeholder="#addtags"
                placeholderTextColor="#888"
                value={taggedUsers.map(u => u.displayName || u.userName).join(', ')}
                editable={false}
              />
            </View>
            {/* Options & Selected Summary */}
            <View style={{ backgroundColor: '#fff', paddingHorizontal: 16 }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }} onPress={() => setShowCategoryModal(true)}>
                <Feather name="tag" size={20} color="#000" style={{ marginRight: 12 }} />
                <Text style={{ color: '#111', fontSize: 16 }}>Add a category for the home feed</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }} onPress={() => setShowLocationModal(true)}>
                <Feather name="map-pin" size={20} color="#000" style={{ marginRight: 12 }} />
                <Text style={{ color: '#111', fontSize: 16 }}>Add a location</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }} onPress={() => setShowVerifiedModal(true)}>
                <MaterialIcons name="verified" size={20} color="#000" style={{ marginRight: 12 }} />
                <Text style={{ color: '#111', fontSize: 16 }}>Add a verified location</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }} onPress={() => setShowTagModal(true)}>
                <Feather name="user" size={20} color="#000" style={{ marginRight: 12 }} />
                <Text style={{ color: '#111', fontSize: 16 }}>Tag people</Text>
              </TouchableOpacity>
            </View>
            {/* Selected Summary Section */}
            <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, marginBottom: 8, borderRadius: 8, borderWidth: 1, borderColor: '#eee' }}>
              <Text style={{ fontWeight: '600', fontSize: 16, marginBottom: 6 }}>Selected Options:</Text>
              {selectedImages.length > 0 && (
                <Text style={{ color: '#111', marginBottom: 4 }}>Images: {selectedImages.length}</Text>
              )}
              {selectedCategories.length > 0 && (
                <Text style={{ color: '#111', marginBottom: 4 }}>Category: {selectedCategories[0].name}</Text>
              )}
              {location && (
                <Text style={{ color: '#111', marginBottom: 4 }}>Location: {location.name}</Text>
              )}
              {verifiedLocation && (
                <Text style={{ color: '#111', marginBottom: 4 }}>Verified Location: {verifiedLocation.name}</Text>
              )}
              {taggedUsers.length > 0 && (
                <Text style={{ color: '#111', marginBottom: 4 }}>Tagged: {taggedUsers.map(u => u.displayName || u.userName).join(', ')}</Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16 }}>
              <TouchableOpacity onPress={() => {
                setSelectedImages([]);
                setStep('picker');
              }}>
                <Text style={{ color: '#FFB800', fontWeight: '600' }}>Clear all</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={{ backgroundColor: '#FFB800', borderRadius: 6, paddingHorizontal: 24, paddingVertical: 10 }}>
                <Text style={{ color: '#000', fontWeight: '600', fontSize: 16 }}>Share</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
        {/* Modals would go here, omitted for brevity */}
        {/* Category Modal */}
        <Modal visible={showCategoryModal} animationType="slide" transparent onRequestClose={() => setShowCategoryModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, minHeight: 320 }}>
              <Text style={{ fontWeight: '700', fontSize: 18, marginBottom: 16 }}>Select Category</Text>
              <FlatList
                data={categories}
                keyExtractor={item => item.name}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
                    onPress={() => {
                      setSelectedCategories([item]);
                      setShowCategoryModal(false);
                    }}
                  >
                    <Image source={{ uri: item.image }} style={{ width: 40, height: 40, borderRadius: 8, marginRight: 12 }} />
                    <Text style={{ fontSize: 16 }}>{item.name}</Text>
                    {selectedCategories.some(c => c.name === item.name) && (
                      <Feather name="check" size={20} color="#FFB800" style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={{ marginTop: 18, alignItems: 'center' }}>
                <Text style={{ color: '#FFB800', fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Location Modal */}
        <Modal visible={showLocationModal} animationType="slide" transparent onRequestClose={() => setShowLocationModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, minHeight: 320 }}>
              <Text style={{ fontWeight: '700', fontSize: 18, marginBottom: 16 }}>Add Location</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, marginBottom: 12 }}
                placeholder="Search location..."
                value={locationSearch}
                onChangeText={async (text) => {
                  setLocationSearch(text);
                  if (text.length > 2) {
                    setLoadingLocationResults(true);
                    try {
                      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_MAP_API_KEY}`;
                      const response = await fetch(url);
                      const data = await response.json();
                      if (data.predictions) {
                        setLocationResults(data.predictions.map((p: any) => ({
                          name: p.structured_formatting.main_text,
                          address: p.description,
                          placeId: p.place_id,
                          lat: 0,
                          lon: 0
                        })));
                      }
                    } catch (e) {
                      setLocationResults([]);
                    }
                    setLoadingLocationResults(false);
                  } else {
                    setLocationResults([]);
                  }
                }}
              />
              {loadingLocationResults ? (
                <ActivityIndicator size="small" color="#FFB800" />
              ) : (
                <FlatList
                  data={locationResults}
                  keyExtractor={item => item.placeId || item.name}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{ paddingVertical: 10 }}
                      onPress={() => {
                        setLocation(item);
                        setShowLocationModal(false);
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>{item.name}</Text>
                      <Text style={{ color: '#888', fontSize: 13 }}>{item.address}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={{ color: '#888', marginTop: 12 }}>No results</Text>}
                />
              )}
              <TouchableOpacity onPress={() => setShowLocationModal(false)} style={{ marginTop: 18, alignItems: 'center' }}>
                <Text style={{ color: '#FFB800', fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Verified Location Modal */}
        <Modal visible={showVerifiedModal} animationType="slide" transparent onRequestClose={() => setShowVerifiedModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, minHeight: 320 }}>
              <Text style={{ fontWeight: '700', fontSize: 18, marginBottom: 16 }}>Select Verified Location</Text>
              <Text style={{ color: '#888', marginBottom: 12 }}>
                Only your current GPS location or passport ticket locations can be used as verified location.
              </Text>
              <FlatList
                data={verifiedOptions}
                keyExtractor={item => item.name + item.lat + item.lon}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                    onPress={() => {
                      setVerifiedLocation(item);
                      setShowVerifiedModal(false);
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
                    <Text style={{ color: '#888', fontSize: 13 }}>{item.address}</Text>
                    <Text style={{ color: '#007aff', fontSize: 12, marginTop: 2 }}>{item.verified ? 'Verified' : ''}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={{ color: '#888', marginTop: 12 }}>No verified locations found</Text>}
              />
              <TouchableOpacity onPress={() => setShowVerifiedModal(false)} style={{ marginTop: 18, alignItems: 'center' }}>
                <Text style={{ color: '#FFB800', fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Tag People Modal */}
        <Modal visible={showTagModal} animationType="slide" transparent onRequestClose={() => setShowTagModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, minHeight: 320 }}>
              <Text style={{ fontWeight: '700', fontSize: 18, marginBottom: 16 }}>Tag People</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, marginBottom: 12 }}
                placeholder="Search users..."
                value={userSearch}
                onChangeText={async (text) => {
                  setUserSearch(text);
                  setLoadingUserResults(true);
                  const result = await searchUsers(text, 20);
                  if (result.success) {
                    setUserResults(result.data.map((u: any) => ({
                      uid: u.id,
                      displayName: u.displayName,
                      userName: u.userName
                    })));
                  } else {
                    setUserResults([]);
                  }
                  setLoadingUserResults(false);
                }}
              />
              {loadingUserResults ? (
                <ActivityIndicator size="small" color="#FFB800" />
              ) : (
                <FlatList
                  data={userResults}
                  keyExtractor={item => item.uid}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}
                      onPress={() => {
                        if (!taggedUsers.some(u => u.uid === item.uid)) {
                          setTaggedUsers([...taggedUsers, item]);
                        } else {
                          setTaggedUsers(taggedUsers.filter(u => u.uid !== item.uid));
                        }
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>{item.displayName || item.userName || item.uid}</Text>
                      {taggedUsers.some(u => u.uid === item.uid) && (
                        <Feather name="check" size={20} color="#FFB800" style={{ marginLeft: 8 }} />
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={{ color: '#888', marginTop: 12 }}>No results</Text>}
                />
              )}
              <TouchableOpacity onPress={() => setShowTagModal(false)} style={{ marginTop: 18, alignItems: 'center' }}>
                <Text style={{ color: '#FFB800', fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {loading && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', zIndex: 99 }}>
            <ActivityIndicator size="large" color="#FFB800" />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
