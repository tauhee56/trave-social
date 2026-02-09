import { Feather } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../app/_components/UserContext';
import VerifiedBadge from '../src/_components/VerifiedBadge';
// import {} from '../lib/firebaseHelpers';
import { GOOGLE_MAPS_CONFIG } from '../config/environment';
import { createPost, DEFAULT_CATEGORIES, ensureDefaultCategories, getCategories, getPassportTickets, searchUsers } from '../lib/firebaseHelpers/index';
import { getCategoryImageSource } from '../lib/categoryImages';
import { compressImage } from '../lib/imageCompressor';
import { extractHashtags, trackHashtag } from '../lib/mentions';
import { startTrace } from '../lib/perf';
import { mapService } from '../services';
import { getKeyboardOffset, getModalHeight } from '../utils/responsive';

// Runtime import of ImagePicker with graceful fallback
let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.warn('expo-image-picker not available');
}

const { width } = Dimensions.get('window');
const GRID_SIZE = width / 3;

const MIN_MEDIA_RATIO = 4 / 5;
const MAX_MEDIA_RATIO = 1.91;

const DEFAULT_AVATAR_URL = 'https://via.placeholder.com/200x200.png?text=Profile';

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
  photoURL?: string | null;
};

export default function CreatePostScreen() {
  const router = useRouter();
  const user = useUser();
  const [step, setStep] = useState<'picker' | 'details'>('picker');
  const [caption, setCaption] = useState<string>('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState<string>('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [location, setLocation] = useState<LocationType | null>(null);
  const [verifiedLocation, setVerifiedLocation] = useState<LocationType | null>(null);
  const [taggedUsers, setTaggedUsers] = useState<UserType[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewHeight, setPreviewHeight] = useState<number>(width);
  const previewRatioCacheRef = useRef<Map<string, number>>(new Map());
  const activePreviewUriRef = useRef<string | null>(null);
  const previewReqIdRef = useRef(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<boolean>(false);

  const clampMediaRatio = (ratio: number) => {
    if (!Number.isFinite(ratio) || ratio <= 0) return 1;
    return Math.min(MAX_MEDIA_RATIO, Math.max(MIN_MEDIA_RATIO, ratio));
  };

  const setPreviewHeightFromRatio = (ratio: number) => {
    const clamped = clampMediaRatio(ratio);
    const nextHeight = width / clamped;
    setPreviewHeight(nextHeight);
  };

  useEffect(() => {
    if (!Array.isArray(selectedImages) || selectedImages.length === 0) {
      setPreviewIndex(0);
      setPreviewHeight(width);
      activePreviewUriRef.current = null;
      return;
    }

    if (previewIndex >= selectedImages.length) {
      setPreviewIndex(0);
      return;
    }

    const uri = selectedImages[previewIndex];
    if (!uri) {
      setPreviewHeightFromRatio(1);
      activePreviewUriRef.current = null;
      return;
    }

    activePreviewUriRef.current = uri;
    const reqId = ++previewReqIdRef.current;

    const cached = previewRatioCacheRef.current.get(uri);
    if (typeof cached === 'number') {
      setPreviewHeightFromRatio(cached);
      return;
    }

    const isVideo = uri.toLowerCase().endsWith('.mp4') || uri.toLowerCase().endsWith('.mov') || uri.toLowerCase().includes('video');
    if (isVideo) {
      setPreviewHeightFromRatio(1);
      return;
    }

    Image.getSize(
      uri,
      (w, h) => {
        if (h > 0) {
          const ratio = w / h;
          previewRatioCacheRef.current.set(uri, ratio);
          if (previewReqIdRef.current === reqId && activePreviewUriRef.current === uri) {
            setPreviewHeightFromRatio(ratio);
          }
        }
      },
      () => {
        if (previewReqIdRef.current === reqId && activePreviewUriRef.current === uri) {
          setPreviewHeightFromRatio(1);
        }
      }
    );
  }, [selectedImages, previewIndex]);

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
  // Map DEFAULT_CATEGORIES to objects for UI
  const defaultCategoryObjects = Array.isArray(DEFAULT_CATEGORIES)
    ? DEFAULT_CATEGORIES.map((cat: any) => {
        if (typeof cat === 'string') {
          return { name: cat, image: 'https://via.placeholder.com/80x80/FFB800/ffffff?text=' + encodeURIComponent(cat) };
        }
        let image = cat.image || 'https://via.placeholder.com/80x80/FFB800/ffffff?text=' + encodeURIComponent(cat.name);
        if (!image.includes('?')) {
          image += '?w=80&h=80&fit=crop';
        }
        return { name: cat.name, image };
      })
    : [];
  const [categories, setCategories] = useState<{ name: string; image: string }[]>(defaultCategoryObjects);
  const [selectedCategories, setSelectedCategories] = useState<{ name: string; image: string }[]>([]);
  const [categorySearch, setCategorySearch] = useState<string>('');

  // Gallery tab state for switching between images/videos
  const [galleryTab, setGalleryTab] = useState<'images' | 'videos'>('images');

  // Reset form when screen loses focus or on mount
  useFocusEffect(
    useCallback(() => {
      // Reset state when screen comes into focus
      return () => {
        // Optional: Clean up when leaving screen
        // You can optionally reset the form here too
      };
    }, [])
  );

  useEffect(() => {
    async function setupCategories() {
      await ensureDefaultCategories();
      const cats = await getCategories();
      // Map each category to correct shape with image validation
      const mappedCats = Array.isArray(cats)
        ? cats.map((c: any) => {
            let image = '';
            let name = '';
            
            if (typeof c === 'string') {
              name = c;
              image = 'https://via.placeholder.com/80x80/FFB800/ffffff?text=' + encodeURIComponent(c);
            } else if (c && typeof c === 'object') {
              name = typeof c.name === 'string' ? c.name : '';
              image = typeof c.image === 'string' ? c.image : 'https://via.placeholder.com/80x80/FFB800/ffffff?text=' + encodeURIComponent(c.name || 'Category');
            }
            
            // Ensure image URL has proper query parameters
            if (image && !image.includes('?')) {
              image += '?w=80&h=80&fit=crop';
            }
            
            return { name, image };
          }).filter((c: any) => c.name && c.image)
        : [];
      setCategories(mappedCats.length > 0 ? mappedCats : defaultCategoryObjects);
    }
    setupCategories();
  }, []);

  // Memoized category item renderer
  const renderCategoryItem = useCallback(({ item }: { item: { name: string; image: string } }) => (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
      onPress={() => {
        setSelectedCategories([item]);
        setShowCategoryModal(false);
      }}
    >
      <Image 
        source={getCategoryImageSource(item.name, item.image)} 
        style={{ width: 60, height: 60, borderRadius: 10, marginRight: 12, backgroundColor: '#f0f0f0' }}
      />
      <Text style={{ fontSize: 16, flex: 1 }}>{item.name}</Text>
      {selectedCategories.some(c => c.name === item.name) && (
        <Feather name="check" size={20} color="#FFB800" style={{ marginLeft: 8 }} />
      )}
    </TouchableOpacity>
  ), [selectedCategories]);

  // Location modal
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [locationResults, setLocationResults] = useState<LocationType[]>([]);
  const [loadingLocationResults, setLoadingLocationResults] = useState<boolean>(false);

  // Verified location modal
  const [verifiedSearch, setVerifiedSearch] = useState<string>('');
  const [verifiedResults, setVerifiedResults] = useState<LocationType[]>([]);
  const [loadingVerifiedResults, setLoadingVerifiedResults] = useState<boolean>(false);
  const [verifiedCenter, setVerifiedCenter] = useState<{ lat: number; lon: number } | null>(null);
  const verifiedSearchTimerRef = useRef<any>(null);
  const verifiedReqIdRef = useRef(0);

  // Tag people modal
  const [userSearch, setUserSearch] = useState<string>('');
  const [userResults, setUserResults] = useState<UserType[]>([]);
  const [loadingUserResults, setLoadingUserResults] = useState<boolean>(false);

  const handleHashtagInputChange = (text: string) => {
    setHashtagInput(text);
    const parsed = extractHashtags(text);
    if (Array.isArray(parsed)) {
      const unique = Array.from(new Set(parsed.map(hashtag => hashtag.tag.toLowerCase())));
      setHashtags(unique);
    }
  };

  // Verified location options: current device location + passport tickets
  const [verifiedOptions, setVerifiedOptions] = useState<LocationType[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!showVerifiedModal) return;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setVerifiedCenter(null);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        setVerifiedCenter({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      } catch {
        if (cancelled) return;
        setVerifiedCenter(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showVerifiedModal]);

  useEffect(() => {
    if (!showVerifiedModal) {
      if (verifiedSearchTimerRef.current) {
        clearTimeout(verifiedSearchTimerRef.current);
        verifiedSearchTimerRef.current = null;
      }
      setVerifiedSearch('');
      setVerifiedResults([]);
      setLoadingVerifiedResults(false);
      return;
    }

    if (!verifiedCenter) {
      setVerifiedResults([]);
      return;
    }

    if (verifiedSearchTimerRef.current) {
      clearTimeout(verifiedSearchTimerRef.current);
      verifiedSearchTimerRef.current = null;
    }

    const reqId = ++verifiedReqIdRef.current;
    setLoadingVerifiedResults(true);

    verifiedSearchTimerRef.current = setTimeout(async () => {
      try {
        const places = await mapService.getNearbyPlaces(verifiedCenter.lat, verifiedCenter.lon, 100, verifiedSearch.trim() || undefined);
        if (verifiedReqIdRef.current !== reqId) return;

        const mapped: LocationType[] = Array.isArray(places)
          ? places
              .map((p: any) => ({
                name: String(p?.placeName || p?.name || p?.address || 'Location'),
                address: String(p?.address || ''),
                placeId: typeof p?.placeId === 'string' ? p.placeId : undefined,
                lat: typeof p?.latitude === 'number' ? p.latitude : 0,
                lon: typeof p?.longitude === 'number' ? p.longitude : 0,
                verified: true,
              }))
              .filter((p: any) => p.name)
          : [];

        setVerifiedResults(mapped);
      } catch {
        if (verifiedReqIdRef.current !== reqId) return;
        setVerifiedResults([]);
      } finally {
        if (verifiedReqIdRef.current !== reqId) return;
        setLoadingVerifiedResults(false);
      }
    }, 450);

    return () => {
      if (verifiedSearchTimerRef.current) {
        clearTimeout(verifiedSearchTimerRef.current);
        verifiedSearchTimerRef.current = null;
      }
    };
  }, [showVerifiedModal, verifiedCenter, verifiedSearch]);

  useEffect(() => {
    async function fetchVerifiedOptions() {
      // const user = getCurrentUser() as { uid?: string } | null;
      // if (!user) return;
      // TODO: Use user from context or props
      let resolvedUserId: string | null = null;
      try {
        resolvedUserId = typeof user?.uid === 'string' ? user.uid : null;
        if (!resolvedUserId) {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          resolvedUserId = await AsyncStorage.getItem('userId');
        }
      } catch {
        resolvedUserId = typeof user?.uid === 'string' ? user.uid : null;
      }

      let options: LocationType[] = [];
      // Get current device location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});

          // Reverse geocode to get actual location name
          let locationName = 'Current Location';
          let locationAddress = '';
          try {
            const reverseGeocode = await Location.reverseGeocodeAsync({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            });

            if (reverseGeocode && reverseGeocode.length > 0) {
              const place = reverseGeocode[0];
              // Build location name from available data
              const parts = [];
              if (place.name) parts.push(place.name);
              else if (place.street) parts.push(place.street);

              if (place.city) parts.push(place.city);
              else if (place.district) parts.push(place.district);

              if (parts.length > 0) {
                locationName = parts.join(', ');
              }

              // Build address
              const addressParts = [];
              if (place.street) addressParts.push(place.street);
              if (place.city) addressParts.push(place.city);
              if (place.region) addressParts.push(place.region);
              if (place.country) addressParts.push(place.country);
              locationAddress = addressParts.join(', ');
            }
          } catch {
            try {
              const google = await mapService.reverseGeocode(loc.coords.latitude, loc.coords.longitude);
              if (google) {
                if (typeof google.placeName === 'string' && google.placeName.trim()) {
                  locationName = google.placeName;
                } else if (typeof google.city === 'string' && google.city.trim()) {
                  locationName = google.city;
                }
                if (typeof google.address === 'string') {
                  locationAddress = google.address;
                }
              }
            } catch {}
          }

          options.push({
            name: locationName,
            address: locationAddress,
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
            verified: true
          });
        }
      } catch {}
      // Get passport tickets
      try {
        const tickets = resolvedUserId ? await getPassportTickets(resolvedUserId) : [];
        // Debug: log ticket structure
        if (tickets && tickets.length > 0) {
          console.log('Sample passport ticket:', tickets[0]);
        }
        // Deduplicate by location name and lat/lon (update keys after log)
        const uniqueLocations: { [key: string]: LocationType } = {};
        tickets.forEach((ticketRaw: any) => {
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

      // Priority 1: If verifiedLocation exists (GPS or Passport), use it
      if (verifiedLocation) {
        if (verifiedLocation.placeId) {
          // Verified location with placeId (from search)
          const placeDetails = await getPlaceDetails(verifiedLocation.placeId);
          if (placeDetails) {
            locationData = {
              name: verifiedLocation.name,
              address: verifiedLocation.address || '',
              placeId: verifiedLocation.placeId,
              lat: placeDetails.lat ?? 0,
              lon: placeDetails.lon ?? 0,
              verified: true
            };
          }
        } else {
          // Verified location without placeId (GPS or Passport)
          locationData = {
            name: verifiedLocation.name,
            address: verifiedLocation.address || '',
            placeId: verifiedLocation.placeId,
            lat: verifiedLocation.lat ?? 0,
            lon: verifiedLocation.lon ?? 0,
            verified: true
          };
        }
      }
      // Priority 2: If only location exists (not verified)
      else if (location) {
        if (location.placeId) {
          const placeDetails = await getPlaceDetails(location.placeId);
          if (placeDetails) {
            locationData = {
              name: location.name,
              address: location.address || '',
              placeId: location.placeId,
              lat: placeDetails.lat ?? 0,
              lon: placeDetails.lon ?? 0,
              verified: false
            };
          } else {
            // If placeDetails fetch fails, still use location with default coords
            locationData = {
              name: location.name,
              address: location.address || '',
              placeId: location.placeId,
              lat: location.lat ?? 0,
              lon: location.lon ?? 0,
              verified: false
            };
          }
        } else {
          // No placeId: Use location directly
          locationData = {
            name: location.name,
            address: location.address || '',
            placeId: location.placeId,
            lat: location.lat ?? 0,
            lon: location.lon ?? 0,
            verified: false
          };
        }
      }
      // const user = getCurrentUser() as { uid?: string } | null;
      // if (!user) throw new Error('User not found');
      // TODO: Use user from context or props
      
      console.log('📍 Location Debug:', {
        location,
        verifiedLocation,
        locationData,
        finalLocation: locationData?.name || 'No location selected'
      });
      
      // Extract hashtags and mentions from caption + manual input
      const extractedHashtags = Array.from(new Set([
        ...extractHashtags(caption),
        ...hashtags,
      ]));
      const extractedMentions = caption.match(/@[\w]+/g) || [];
      
      // Save selected category with post
      const selectedCategory = selectedCategories.length > 0 ? selectedCategories[0] : null;
      
      const trace = await startTrace('create_post_flow');

      // Compress images before upload using optimized compression
      let uploadImages = selectedImages;
      if (mediaType === 'image') {
        const compressedImages: string[] = [];
        for (const imgUri of selectedImages) {
          try {
            // Use optimized compression with 80% quality & 2048px max width
            const compressed = await compressImage(imgUri, 0.8, 2048);
            compressedImages.push(compressed.uri);
            console.log(`✅ Image compressed: ${(compressed.size / 1024).toFixed(0)}KB`);
          } catch (error) {
            console.warn(`⚠️ Compression failed, using original: ${error}`);
            compressedImages.push(imgUri);
          }
        }
        uploadImages = compressedImages;
      }
      
      // Get userId from user context or AsyncStorage
      let userId = user?.uid;
      if (!userId) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        userId = await AsyncStorage.getItem('userId');
      }

      console.log('📤 Creating post with params:', {
        userId,
        imagesCount: uploadImages.length,
        caption: caption.substring(0, 50),
        hashtags: extractedHashtags,
        mentions: extractedMentions,
        mediaType,
        location: locationData?.name,
        category: selectedCategory?.name
      });

      const result = await createPost(
        typeof userId === 'string' ? userId : '',
        Array.isArray(uploadImages) ? uploadImages : [uploadImages], // Pass array of images
        caption,
        locationData?.name || '',
        mediaType,
        locationData ? { 
          name: locationData.name, 
          address: locationData.address, 
          placeId: locationData.placeId,
          lat: locationData.lat, 
          lon: locationData.lon,
          verified: locationData.verified
        } : undefined,
        taggedUsers.map(u => u.uid),
        selectedCategory?.name || '',
        extractedHashtags.map(h => typeof h === 'string' ? h : h.tag), // Convert to string array
        extractedMentions
      ) as { success: boolean; postId?: string; error?: string };

      trace?.end({
        success: result?.success ? 1 : 0,
        images: uploadImages.length,
        mediaType,
      });

      console.log('📥 Post creation result:', result);
      
      // Track hashtags if post created successfully
      if (result && result.success && extractedHashtags.length > 0) {
        for (const hashtag of extractedHashtags) {
          try {
            // trackHashtag expects just the hashtag string
            const hashtagStr = typeof hashtag === 'string' ? hashtag : hashtag.tag;
            await trackHashtag(hashtagStr);
          } catch (error) {
            console.warn(`⚠️ Failed to track hashtag ${hashtag}:`, error);
          }
        }
      }

      if (result && result.success) {
        console.log('✅ Post created successfully! ID:', result.postId);
        // Reset state before navigating back
        setSelectedImages([]);
        setCaption('');
        setHashtags([]);
        setMentions([]);
        setLocation(null);
        setVerifiedLocation(null);
        setTaggedUsers([]);
        setSelectedCategories([]);
        setStep('picker');
        Alert.alert('Success', 'Post created successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        console.error('❌ Post creation failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to create post');
      }
    } catch (error: any) {
      console.error('❌ Exception during post creation:', error);
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  // Fetch real place details from Google Places API
  const getPlaceDetails = async (placeId: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      const apiKey = GOOGLE_MAPS_CONFIG.apiKey;
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.result && data.result.geometry && data.result.geometry.location) {
        return {
          lat: data.result.geometry.location.lat,
          lon: data.result.geometry.location.lng
        };
      }
      return null;
    } catch (err) {
      console.error('Google Places API error:', err);
      return null;
    }
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={getKeyboardOffset()}
        style={{ flex: 1 }}
      >
        {step === 'picker' ? (
          <View style={{ flex: 1 }}>
            {/* Gallery header with picker button and tabs */}
            <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}>
                <TouchableOpacity
                  onPress={async () => {
                    if (ImagePicker) {
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ['images', 'videos'],
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
                <Text style={{ fontWeight: '600', fontSize: 16, color: '#222', flex: 1 }}>Gallery</Text>
              </View>
              
              {/* Tab switcher for Images/Videos */}
              <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eee' }}>
                <TouchableOpacity 
                  onPress={() => setGalleryTab('images')}
                  style={{ 
                    flex: 1, 
                    paddingVertical: 12, 
                    alignItems: 'center', 
                    borderBottomWidth: galleryTab === 'images' ? 3 : 0,
                    borderBottomColor: '#FFB800',
                    backgroundColor: galleryTab === 'images' ? '#fff8f0' : '#fff'
                  }}
                >
                  <Text style={{ fontWeight: galleryTab === 'images' ? '700' : '500', color: galleryTab === 'images' ? '#FFB800' : '#999', fontSize: 14 }}>
                    📷 Images ({galleryImages.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setGalleryTab('videos')}
                  style={{ 
                    flex: 1, 
                    paddingVertical: 12, 
                    alignItems: 'center', 
                    borderBottomWidth: galleryTab === 'videos' ? 3 : 0,
                    borderBottomColor: '#FFB800',
                    backgroundColor: galleryTab === 'videos' ? '#fff8f0' : '#fff'
                  }}
                >
                  <Text style={{ fontWeight: galleryTab === 'videos' ? '700' : '500', color: galleryTab === 'videos' ? '#FFB800' : '#999', fontSize: 14 }}>
                    🎥 Videos ({galleryVideos.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Gallery grid (images or videos based on tab) */}
            <FlatList
              data={galleryTab === 'images' ? galleryImages : galleryVideos}
              numColumns={3}
              keyExtractor={(uri, idx) => uri + idx}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => {
                  if (selectedImages.includes(item)) {
                    setSelectedImages(selectedImages.filter(uri => uri !== item));
                  } else {
                    setSelectedImages([...selectedImages, item]);
                  }
                }} style={{ width: GRID_SIZE, height: GRID_SIZE, borderWidth: 1, borderColor: '#eee', position: 'relative' }}>
                  {galleryTab === 'videos' ? (
                    <>
                      <Video 
                        source={{ uri: item }} 
                        style={{ width: '100%', height: '100%' }}
                        resizeMode={ResizeMode.COVER}
                        useNativeControls={false}
                        shouldPlay={false}
                      />
                      <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -12, marginTop: -12 }}>
                        <Feather name="play-circle" size={24} color="#FFB800" />
                      </View>
                    </>
                  ) : (
                    <Image source={{ uri: item }} style={{ width: '100%', height: '100%' }} />
                  )}
                  {selectedImages.includes(item) && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 3, borderColor: '#FFB800', backgroundColor: 'rgba(255,184,0,0.1)' }} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}><Text>No {galleryTab === 'images' ? 'images' : 'videos'} found</Text></View>}
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
            <View style={{ width: width, height: previewHeight, backgroundColor: '#f8f8f8', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {selectedImages.length > 1 ? (
                <>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={{ width: width, height: previewHeight }}
                    onMomentumScrollEnd={(e) => {
                      const offsetX = e.nativeEvent.contentOffset.x;
                      const currentIndex = Math.round(offsetX / width);
                      if (Number.isFinite(currentIndex) && currentIndex !== previewIndex) {
                        setPreviewIndex(currentIndex);
                      }
                    }}
                    scrollEventThrottle={16}
                  >
                    {selectedImages.map((item, idx) => (
                      item.toLowerCase().endsWith('.mp4') || item.toLowerCase().endsWith('.mov') || item.toLowerCase().includes('video') ? (
                        <Video
                          key={item + idx}
                          source={{ uri: item }}
                          style={{ width: width, height: previewHeight, backgroundColor: '#000' }}
                          resizeMode={ResizeMode.COVER}
                          shouldPlay={false}
                          useNativeControls={true}
                          isLooping={false}
                          onLoad={(status: any) => {
                            const w = status?.naturalSize?.width;
                            const h = status?.naturalSize?.height;
                            if (typeof w === 'number' && typeof h === 'number' && h > 0) {
                              const ratio = w / h;
                              previewRatioCacheRef.current.set(item, ratio);
                              if (activePreviewUriRef.current === item) {
                                setPreviewHeightFromRatio(ratio);
                              }
                            }
                          }}
                        />
                      ) : (
                        <Image key={item + idx} source={{ uri: item }} style={{ width: width, height: previewHeight }} resizeMode="cover" />
                      )
                    ))}
                  </ScrollView>
                  {/* Page indicator */}
                  <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                      {previewIndex + 1}/{selectedImages.length}
                    </Text>
                  </View>
                </>
              ) : selectedImages.length === 1 ? (
                selectedImages[0].toLowerCase().endsWith('.mp4') || selectedImages[0].toLowerCase().endsWith('.mov') || selectedImages[0].toLowerCase().includes('video') ? (
                  <Video
                    source={{ uri: selectedImages[0] }}
                    style={{ width: width, height: previewHeight, backgroundColor: '#000' }}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    useNativeControls={true}
                    isLooping={false}
                    onLoad={(status: any) => {
                      const w = status?.naturalSize?.width;
                      const h = status?.naturalSize?.height;
                      if (typeof w === 'number' && typeof h === 'number' && h > 0) {
                        const ratio = w / h;
                        previewRatioCacheRef.current.set(selectedImages[0], ratio);
                        setPreviewHeightFromRatio(ratio);
                      }
                    }}
                  />
                ) : (
                  <Image source={{ uri: selectedImages[0] }} style={{ width: width, height: previewHeight }} resizeMode="cover" />
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
                style={{ fontSize: 15, color: '#111', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                placeholder="#hashtags (space or comma separated)"
                placeholderTextColor="#888"
                value={hashtagInput}
                onChangeText={handleHashtagInputChange}
              />
              {hashtags.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {hashtags.map(tag => (
                    <View key={tag} style={{ backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
                      <Text style={{ color: '#667eea', fontWeight: '600' }}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            {/* Options & Selected Summary */}
            <View style={{ backgroundColor: '#fff', paddingHorizontal: 16 }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }} onPress={() => setShowCategoryModal(true)}>
                <Feather name="tag" size={20} color="#000" style={{ marginRight: 12 }} />
                <Text style={{ color: '#111', fontSize: 16 }}>Add category</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }} onPress={() => setShowLocationModal(true)}>
                <Feather name="map-pin" size={20} color="#000" style={{ marginRight: 12 }} />
                <Text style={{ color: '#111', fontSize: 16 }}>Add a location</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }} onPress={() => setShowVerifiedModal(true)}>
                <View style={{ marginRight: 12 }}><VerifiedBadge size={20} color="#000" /></View>
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
                <>
                  <Text style={{ color: '#111', marginBottom: 4 }}>📷 Images/Videos: {selectedImages.length}</Text>
                  {selectedImages.length > 0 && (
                    <Text style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>
                      {selectedImages.filter(img => img.toLowerCase().endsWith('.mp4') || img.toLowerCase().endsWith('.mov') || img.toLowerCase().includes('video')).length} videos, {selectedImages.filter(img => !img.toLowerCase().endsWith('.mp4') && !img.toLowerCase().endsWith('.mov') && !img.toLowerCase().includes('video')).length} images
                    </Text>
                  )}
                </>
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
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
            <View style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 24,
              height: getModalHeight(0.8)
            }}>
              {/* Handle bar */}
              <View style={{ width: 40, height: 5, backgroundColor: '#e0e0e0', borderRadius: 2.5, alignSelf: 'center', marginBottom: 20 }} />
              
              {/* Header */}
              <Text style={{ fontWeight: '700', fontSize: 20, marginBottom: 16, color: '#000' }}>Select Category</Text>
              
              {/* List */}
              <FlatList
                data={categories}
                keyExtractor={item => item.name}
                renderItem={renderCategoryItem}
                scrollEnabled={true}
                contentContainerStyle={{ paddingBottom: 10 }}
              />
              
              {/* Close Button */}
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                  <Text style={{ color: '#f39c12', fontWeight: '700', fontSize: 16 }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {/* Location Modal */}
        <Modal visible={showLocationModal} animationType="slide" transparent onRequestClose={() => setShowLocationModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.select({ ios: 90, android: 0 })}
            >
              <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View style={{
                  backgroundColor: '#fff',
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: 24,
                  height: getModalHeight(0.8)
                }}>
                  {/* Handle bar */}
                  <View style={{ width: 40, height: 5, backgroundColor: '#e0e0e0', borderRadius: 2.5, alignSelf: 'center', marginBottom: 20 }} />
                  <Text style={{ fontWeight: '700', fontSize: 20, marginBottom: 12, color: '#000' }}>Add Location</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14, fontSize: 16, backgroundColor: '#f9f9f9' }}
                    placeholder="Search location..."
                    placeholderTextColor="#999"
                    value={locationSearch}
                    onChangeText={async (text) => {
                      setLocationSearch(text);
                      if (text.length > 2) {
                        setLoadingLocationResults(true);
                        try {
                          const suggestions = await mapService.getAutocompleteSuggestions(text);
                          setLocationResults(suggestions.map((s: any) => ({
                            name: s.description.split(',')[0],
                            address: s.description,
                            placeId: s.placeId,
                            lat: 0,
                            lon: 0
                          })));
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
                      keyExtractor={(item, idx) => String(item.placeId || item.name || idx)}
                      keyboardShouldPersistTaps="handled"
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
                  {/* Close Button */}
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                      <Text style={{ color: '#f39c12', fontWeight: '700', fontSize: 16 }}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
        {/* Verified Location Modal */}
        <Modal visible={showVerifiedModal} animationType="slide" transparent onRequestClose={() => setShowVerifiedModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.select({ ios: 90, android: 0 })}
            >
              <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View style={{
                  backgroundColor: '#fff',
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: 24,
                  height: getModalHeight(0.8)
                }}>
                  {/* Handle bar */}
                  <View style={{ width: 40, height: 5, backgroundColor: '#e0e0e0', borderRadius: 2.5, alignSelf: 'center', marginBottom: 20 }} />
                  <Text style={{ fontWeight: '700', fontSize: 20, marginBottom: 12, color: '#000' }}>Select Verified Location</Text>
                  <Text style={{ color: '#888', marginBottom: 12 }}>
                    Only your current GPS location or passport ticket locations can be used as verified location.
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f9f9f9', marginBottom: 12 }}>
                    <Feather name="search" size={18} color="#999" style={{ marginRight: 8 }} />
                    <TextInput
                      placeholder="Search nearby (100m)..."
                      placeholderTextColor="#999"
                      value={verifiedSearch}
                      onChangeText={setVerifiedSearch}
                      style={{ flex: 1, fontSize: 16, color: '#111' }}
                    />
                  </View>

                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: '#111', marginBottom: 8 }}>Nearby (100m)</Text>
                    {verifiedCenter ? null : (
                      <Text style={{ color: '#888', marginBottom: 12 }}>Enable location permission to see nearby verified places.</Text>
                    )}

                    {loadingVerifiedResults ? (
                      <ActivityIndicator size="small" color="#FFB800" style={{ marginVertical: 10 }} />
                    ) : (
                      <FlatList
                        data={verifiedResults}
                        scrollEnabled={false}
                        keyExtractor={(item, idx) => String(item.placeId || (item.name + item.lat + item.lon) || idx)}
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
                            <Text style={{ color: '#007aff', fontSize: 12, marginTop: 2 }}>Verified</Text>
                          </TouchableOpacity>
                        )}
                        ListEmptyComponent={<Text style={{ color: '#888', marginTop: 6 }}>No nearby locations found</Text>}
                      />
                    )}

                    <Text style={{ fontWeight: '700', fontSize: 14, color: '#111', marginTop: 18, marginBottom: 8 }}>Passport / GPS</Text>
                    <FlatList
                      data={verifiedOptions}
                      scrollEnabled={false}
                      keyExtractor={(item, idx) => String((item.name + item.lat + item.lon) || idx)}
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
                      ListEmptyComponent={<Text style={{ color: '#888', marginTop: 6 }}>No verified locations found</Text>}
                    />
                  </ScrollView>

                  {/* Close Button */}
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setShowVerifiedModal(false)}>
                      <Text style={{ color: '#f39c12', fontWeight: '700', fontSize: 16 }}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
        {/* Tag People Modal */}
        <Modal visible={showTagModal} animationType="slide" transparent onRequestClose={() => setShowTagModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.select({ ios: 90, android: 0 })}
            >
              <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View style={{
                  backgroundColor: '#fff',
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: 24,
                  height: getModalHeight(0.8)
                }}>
                  {/* Handle bar */}
                  <View style={{ width: 40, height: 5, backgroundColor: '#e0e0e0', borderRadius: 2.5, alignSelf: 'center', marginBottom: 20 }} />
                  <Text style={{ fontWeight: '700', fontSize: 18, marginBottom: 14, color: '#000', textAlign: 'center' }}>Tag someone</Text>

                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, backgroundColor: '#f9f9f9' }}>
                    <Feather name="search" size={18} color="#999" style={{ marginLeft: 10 }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 15, color: '#111', textAlign: 'right' }}
                      placeholder="Search"
                      placeholderTextColor="#999"
                      value={userSearch}
                      onChangeText={async (text) => {
                        setUserSearch(text);
                        setLoadingUserResults(true);
                        const result = await searchUsers(text, 20);
                        if (result.success) {
                          setUserResults(result.data.map((u: any) => ({
                            uid: String(u?.uid || u?.id || ''),
                            displayName: u?.displayName,
                            userName: u?.userName,
                            photoURL: u?.photoURL || u?.avatar || null,
                          })).filter((uu: any) => typeof uu?.uid === 'string' && uu.uid.trim().length > 0));
                        } else {
                          setUserResults([]);
                        }
                        setLoadingUserResults(false);
                      }}
                    />
                  </View>
                  {loadingUserResults ? (
                    <ActivityIndicator size="small" color="#FFB800" />
                  ) : (
                    <FlatList
                      data={userResults}
                      keyExtractor={item => item.uid}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={{ flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                          onPress={() => {
                            if (!taggedUsers.some(u => u.uid === item.uid)) {
                              setTaggedUsers([...taggedUsers, item]);
                            } else {
                              setTaggedUsers(taggedUsers.filter(u => u.uid !== item.uid));
                            }
                          }}
                        >
                          <Image
                            source={{ uri: item.photoURL || DEFAULT_AVATAR_URL }}
                            style={{ width: 44, height: 44, borderRadius: 12, marginLeft: 12, backgroundColor: '#eee' }}
                          />
                          <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 15, fontWeight: '500', textAlign: 'right', color: '#111' }} numberOfLines={1}>
                              {item.displayName || item.userName || item.uid}
                            </Text>
                            {!!item.userName && (
                              <Text style={{ fontSize: 12, color: '#777', textAlign: 'right', marginTop: 2 }} numberOfLines={1}>
                                {item.userName}
                              </Text>
                            )}
                          </View>
                          {taggedUsers.some(u => u.uid === item.uid) && (
                            <Feather name="check" size={20} color="#f39c12" style={{ marginRight: 10 }} />
                          )}
                        </TouchableOpacity>
                      )}
                      ListEmptyComponent={<Text style={{ color: '#888', marginTop: 12 }}>No results</Text>}
                    />
                  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14 }}>
                    <TouchableOpacity onPress={() => setShowTagModal(false)}>
                      <Text style={{ color: '#111', fontWeight: '600', fontSize: 15 }}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowTagModal(false)} style={{ backgroundColor: '#FFB800', borderRadius: 8, paddingHorizontal: 22, paddingVertical: 12 }}>
                      <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
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
