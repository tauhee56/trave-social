import { Image as ExpoImage } from 'expo-image';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Dimensions, PermissionsAndroid, Platform, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
// import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
// Firestore imports removed

import { PostLocationModal } from '../components/PostLocationModal';
// import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
// Firestore imports removed - using backend API
import { useUser } from './_components/UserContext';
// Firebase imports removed - using backend API
import { getAllPosts } from '../lib/firebaseHelpers';
import { sharePost } from '../lib/postShare';
import { apiService } from './_services/apiService';
import { addComment } from '../lib/firebaseHelpers/comments';
import { getOptimizedImageUrl } from '../lib/imageHelpers';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default ?? RNMaps;
  Marker = RNMaps.Marker;
}

// Standard Google Maps style (clean, default look)
const standardMapStyle = [
  { "featureType": "water", "elementType": "geometry", "stylers": [ { "color": "#aadaff" } ] },
  { "featureType": "landscape", "elementType": "geometry", "stylers": [ { "color": "#e5f5e0" } ] },
  { "featureType": "road", "elementType": "geometry", "stylers": [ { "color": "#ffffff" } ] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [ { "color": "#7b7b7b" } ] },
  { "featureType": "road", "elementType": "labels.text.stroke", "stylers": [ { "color": "#ffffff" } ] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [ { "color": "#b6e5a8" } ] },
  { "featureType": "administrative", "elementType": "labels.text.fill", "stylers": [ { "color": "#495e6a" } ] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [ { "color": "#e5e5e5" } ] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [ { "color": "#f2f2f2" } ] },
  { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [ { "color": "#d0f5d8" } ] },
  { "featureType": "landscape.man_made", "elementType": "geometry", "stylers": [ { "color": "#f8f8f8" } ] }
];

const { width } = Dimensions.get('window');
const IMAGE_PLACEHOLDER = 'L5H2EC=PM+yV0g-mq.wG9c010J}I';

interface PostType {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  imageUrl: string;
  imageUrls?: string[];
  caption?: string;
  location?: {
    lat: number;
    lon: number;
    name?: string;
  } | string;
  lat?: number;
  lon?: number;
  likes?: number;
  likesCount?: number;
  comments?: number;
  commentsCount?: number;
  createdAt: any;
  isLive?: boolean;
}

interface LiveStream {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  imageUrl: string;
  imageUrls?: string[];
  channelName?: string;
  viewerCount: number;
  isLive: boolean;
  startedAt: any;
  location?: {
    latitude: number;
    longitude: number;
  };
}

const DEFAULT_REGION = {
  latitude: 33.6844,
  longitude: 73.0479,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};

const DEFAULT_AVATAR_URL = 'https://via.placeholder.com/200x200.png?text=Profile';

export default function MapScreen() {
  const currentUser = useUser();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const safePosts = Array.isArray(posts) ? posts : [];
  const [selectedPosts, setSelectedPosts] = useState<PostType[] | null>(null);
  const safeSelectedPosts = Array.isArray(selectedPosts) ? selectedPosts : [];

  const mapRef = useRef<any>(null);
  const appStateRef = useRef<string>(AppState.currentState);

  const [modalComment, setModalComment] = useState<{[id:string]:string}>({});
  const [modalLikes, setModalLikes] = useState<{[id:string]:number}>({});
  const [modalLiked, setModalLiked] = useState<{[id:string]:boolean}>({});
  const [modalCommentsCount, setModalCommentsCount] = useState<{[id:string]:number}>({});

  // Placeholder search function for modal
  function doSearch() {
    // TODO: Implement search logic to update map region based on query
    // Example: setMapRegion(...) or call geocoding API
    console.log('Search triggered for query:', query);
  }

  const router = useRouter();
  const params = useLocalSearchParams();
  const initialQuery = (params.q as string) || '';
  const userId = (params.user as string) || undefined; // Get userId from params
  const latParam = params.lat ? parseFloat(params.lat as string) : undefined;
  const lonParam = params.lon ? parseFloat(params.lon as string) : undefined;

  const [query, setQuery] = useState(initialQuery);
  // Viewer location state
  const [viewerCoords, setViewerCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  // Defensive: always use array
  const safeLiveStreams = Array.isArray(liveStreams) ? liveStreams : [];

  const livePollTimerRef = useRef<any>(null);
  const isFetchingLiveRef = useRef<boolean>(false);
  const lastLiveFetchRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  const [mapRegion, setMapRegion] = useState<Region | null>(DEFAULT_REGION);
  // Ensure mapRegion is always valid after mount
  useEffect(() => {
    if (!mapRegion || !isValidLatLon(mapRegion.latitude, mapRegion.longitude)) {
      setMapRegion(DEFAULT_REGION);
    }
  }, []);

  const [locationPermission, setLocationPermission] = useState<'granted'|'denied'|'unknown'>('unknown');
  const [showSearch, setShowSearch] = useState(false);
  const [showCommentsModalId, setShowCommentsModal] = useState<string | null>(null);

  // Load posts from Firestore on mount (with caching)
  const postsCache = useRef<PostType[]>([]);
  const lastFetchTime = useRef<number>(0);

  useEffect(() => {
    setLoading(true);
    // Fetch posts with cache (avoid refetching within 60 seconds)
    const now = Date.now();
    if (postsCache.current.length > 0 && (now - lastFetchTime.current) < 60000) {
      setPosts(postsCache.current);
      setLoading(false);
      return;
    }

    // Reduced limit to 50 for much faster loading
    getAllPosts(50).then(res => {
      if (res.success) {
        const postsArray = Array.isArray(res.posts) ? res.posts : [];
        setPosts(postsArray);
        postsCache.current = postsArray;
        lastFetchTime.current = now;
      } else {
        setError(res.error || 'Failed to load posts');
      }
    }).finally(() => setLoading(false));
  }, []);

  async function handleModalLike(post: PostType) {
    const alreadyLiked = modalLiked[post.id] || false;
    if (alreadyLiked) return; // Only allow one like per user
    setModalLiked(l => ({...l, [post.id]: true}));
    setModalLikes(l => ({...l, [post.id]: (l[post.id] ?? post.likesCount ?? post.likes ?? 0) + 1}));
    // TODO: Call likePost API here
  }
  async function handleModalShare(post: PostType) {
    try {
      await sharePost(post);
    } catch (error) {
      console.error('Share error:', error);
    }
  }
  async function handleModalComment(post: PostType) {
    if (!modalComment[post.id] || !modalComment[post.id].trim()) return;

    // const currentUser = getCurrentUser();
    // if (!currentUser) {
    //   console.log('❌ User not logged in');
    //   return;
    // }
    // TODO: Use user from context or props

    const commentText = modalComment[post.id].trim();

    // Optimistic UI update
    setModalCommentsCount(c => ({...c, [post.id]: (c[post.id] ?? post.commentsCount ?? 0) + 1}));
    setModalComment(c => ({...c, [post.id]: ''}));

    // Add comment to Firebase
    const result = await addComment(
      post.id,
      currentUser.uid,
      currentUser.displayName || 'User',
      currentUser.photoURL || DEFAULT_AVATAR_URL,
      commentText
    );

    if (!result.success) {
      console.error('❌ Failed to add comment:', result.error);
      // Revert optimistic update on error
      setModalCommentsCount(c => ({...c, [post.id]: Math.max(0, (c[post.id] ?? post.commentsCount ?? 0) - 1)}));
    }
  }

  // Request location permissions and get viewer location on mount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      if (livePollTimerRef.current) {
        clearInterval(livePollTimerRef.current);
        livePollTimerRef.current = null;
      }
    };
  }, []);

  async function requestLocationPermission() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location for maps',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setLocationPermission('granted');
        } else {
          setLocationPermission('denied');
          console.warn('Location permission denied');
        }
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setLocationPermission('granted');
        } else {
          setLocationPermission('denied');
          console.warn('Location permission denied');
        }
      }
    } catch (error) {
      setLocationPermission('denied');
    }
  }

  useEffect(() => {
    requestLocationPermission();
    (async () => {
      try {
        let location;
        if (Platform.OS === 'android') {
          location = await Location.getCurrentPositionAsync({});
        } else {
          location = await Location.getCurrentPositionAsync({});
        }
        if (location?.coords) {
          setViewerCoords({ lat: location.coords.latitude, lon: location.coords.longitude });
        }
      } catch (err) {
        setViewerCoords(null);
      }
    })();
  }, []);

  const fetchLiveStreams = useCallback(async () => {
    if (isFetchingLiveRef.current) return;
    const now = Date.now();
    if (now - lastLiveFetchRef.current < 1200) return;
    lastLiveFetchRef.current = now;

    isFetchingLiveRef.current = true;
    try {
      const res = await apiService.get('/live-streams');
      const streams = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      streams.sort((a: any, b: any) => (b.viewerCount || 0) - (a.viewerCount || 0));
      if (isMountedRef.current) setLiveStreams(streams);
    } catch (error) {
      console.error('Error fetching live streams:', error);
      if (isMountedRef.current) setLiveStreams([]);
    } finally {
      isFetchingLiveRef.current = false;
    }
  }, [apiService]);

  useFocusEffect(
    useCallback(() => {
      fetchLiveStreams();
      if (!livePollTimerRef.current) {
        livePollTimerRef.current = setInterval(fetchLiveStreams, 5000);
      }

      return () => {
        if (livePollTimerRef.current) {
          clearInterval(livePollTimerRef.current);
          livePollTimerRef.current = null;
        }
      };
    }, [fetchLiveStreams])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      if (nextState === 'active') {
        fetchLiveStreams();
        if (!livePollTimerRef.current) {
          livePollTimerRef.current = setInterval(fetchLiveStreams, 5000);
        }
      } else {
        if (livePollTimerRef.current) {
          clearInterval(livePollTimerRef.current);
          livePollTimerRef.current = null;
        }
      }
    });

    return () => {
      try {
        sub.remove();
      } catch {}
    };
  }, [fetchLiveStreams]);

  function findPostsNear(lat: number, lon: number, radiusKm: number): PostType[] {
    return posts.filter(post => {
      if (!post.lat || !post.lon) return false;
      const distance = getDistance(lat, lon, post.lat, post.lon);
      return distance <= radiusKm;
    });
  }

  function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Helper to check valid lat/lon
  function isValidLatLon(lat: any, lon: any) {
    return (
      typeof lat === 'number' && typeof lon === 'number' &&
      !isNaN(lat) && !isNaN(lon) &&
      lat >= -90 && lat <= 90 &&
      lon >= -180 && lon <= 180
    );
  }

  // Show posts with valid location AND 100+ likes (unless viewing specific user)
  const filteredPosts = safePosts.filter(p => {
    const lat = p.lat ?? (typeof p.location !== 'string' ? p.location?.lat : undefined);
    const lon = p.lon ?? (typeof p.location !== 'string' ? p.location?.lon : undefined);
    const likes = p.likesCount ?? p.likes ?? 0;

    // If userId param exists, show all posts from that user (no like filter)
    if (userId) {
      return isValidLatLon(lat, lon) && p.userId === userId;
    }

    // Otherwise, show only posts with 100+ likes
    return isValidLatLon(lat, lon) && likes >= 100;
  });

  // Group filtered posts by location (lat/lon rounded to 5 decimals), max 5 per location sorted by likes
  const locationGroups: { [key: string]: PostType[] } = {};
  let markerCount = 0;
  (Array.isArray(filteredPosts) ? filteredPosts : []).forEach(p => {
    let lat = p.lat ?? (typeof p.location !== 'string' ? p.location?.lat : undefined);
    let lon = p.lon ?? (typeof p.location !== 'string' ? p.location?.lon : undefined);
    if ((lat == null || lon == null) && typeof p.location === 'object' && p.location) {
      lat = p.location.lat;
      lon = p.location.lon;
    }
    // Defensive: must have imageUrl
    const imageUrl = p.imageUrl || (Array.isArray(p.imageUrls) && p.imageUrls[0]) || DEFAULT_AVATAR_URL;
    // Extra strict: only allow valid numbers
    if (isValidLatLon(lat, lon) && typeof imageUrl === 'string' && imageUrl) {
      const key = `${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}`;
      if (!locationGroups[key]) locationGroups[key] = [];
      locationGroups[key].push({ ...p, lat: Number(lat), lon: Number(lon), imageUrl });
      // Sort and keep only top 5 by likes
      locationGroups[key] = locationGroups[key]
        .sort((a, b) => ((b.likesCount ?? b.likes ?? 0) - (a.likesCount ?? a.likes ?? 0)))
        .slice(0, 5);
      markerCount++;
    }
  });
  // Limit total markers to 50 to further prevent native crash
  const limitedLocationGroups = Object.entries(locationGroups).slice(0, 50).reduce((acc, [key, val]) => {
    acc[key] = val;
    return acc;
  }, {} as typeof locationGroups);
  console.log('Map: Location groups:', Object.keys(limitedLocationGroups).length, 'groups');
  console.log('Map: Location groups detail:', limitedLocationGroups);

  // Extra logging for region and marker validity
  function isValidRegion(region: Region | null): boolean {
    return (
      !!region &&
      isValidLatLon(region.latitude, region.longitude) &&
      typeof region.latitudeDelta === 'number' && typeof region.longitudeDelta === 'number' &&
      isFinite(region.latitudeDelta) && isFinite(region.longitudeDelta) &&
      region.latitudeDelta > 0 && region.longitudeDelta > 0
    );
  }
  const validRegion = isValidRegion(mapRegion);
  const hasValidMarkers = Object.values(limitedLocationGroups).some(group => {
    const post = Array.isArray(group) ? group[0] : null;
    return post && isValidLatLon(post.lat, post.lon) && isFinite(Number(post.lat)) && isFinite(Number(post.lon));
  });
  console.log('Map: validRegion:', validRegion, 'hasValidMarkers:', hasValidMarkers);

  // Marker component that keeps tracksViewChanges true until images load (or timeout)
  const PostMarker: React.FC<{ post: PostType; postsAtLocation: PostType[] }> = ({ post, postsAtLocation }) => {
    const [tracks, setTracks] = useState(true);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [avatarLoaded, setAvatarLoaded] = useState(false);

    useEffect(() => {
      const timeout = setTimeout(() => {
        setTracks(false);
        console.log('⏱️ Marker timeout for post:', post.id);
      }, 20000); // Allow very slow networks to finish image fetch
      return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
      if (imgLoaded && avatarLoaded) {
        setTracks(false);
        console.log('✅ Both images loaded for post:', post.id);
      }
    }, [imgLoaded, avatarLoaded]);

    const handleMarkerPress = () => {
      if (isValidLatLon(Number(post.lat), Number(post.lon))) {
        setSelectedPosts(postsAtLocation);
      }
    };

    // Ensure valid image URL
    const imageUrl = post.imageUrl || (Array.isArray(post.imageUrls) && post.imageUrls[0]) || DEFAULT_AVATAR_URL;
    const avatarUrl = post.userAvatar || DEFAULT_AVATAR_URL;

    // Use thumbnail for map markers (200px is plenty for small markers)
    const markerImageUrl = getOptimizedImageUrl(imageUrl, 'map-marker');
    const markerAvatarUrl = getOptimizedImageUrl(avatarUrl, 'thumbnail');

    console.log('🗺️ Rendering marker for post:', post.id, 'imageUrl:', imageUrl?.substring(0, 50));

    return (
      <Marker
        key={`post-${post.id}`}
        coordinate={{ latitude: Number(post.lat), longitude: Number(post.lon) }}
        tracksViewChanges={tracks}
        onPress={handleMarkerPress}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={styles.markerContainer}>
          <View style={styles.postImageWrapper}>
            {imageUrl ? (
              <ExpoImage
                source={{ uri: markerImageUrl }}
                style={styles.postImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                priority="high"
                placeholder={IMAGE_PLACEHOLDER}
                transition={150}
                onLoad={() => {
                  console.log('📸 Post image loaded:', post.id);
                  setImgLoaded(true);
                }}
                onLoadEnd={() => setImgLoaded(true)}
                onError={(error) => {
                  console.error('❌ Post image error:', post.id, error);
                  setImgLoaded(true); // Stop tracking even on error
                }}
              />
            ) : (
              <View style={[styles.postImage, { backgroundColor: '#ddd' }]} />
            )}
          </View>
          <View style={styles.postAvatarOutside}>
            <ExpoImage
              source={{ uri: markerAvatarUrl }}
              style={styles.postAvatarImgFixed}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
              placeholder={IMAGE_PLACEHOLDER}
              transition={120}
              onLoad={() => {
                console.log('👤 Avatar loaded:', post.id);
                setAvatarLoaded(true);
              }}
              onLoadEnd={() => setAvatarLoaded(true)}
              onError={(error) => {
                console.error('❌ Avatar error:', post.id, error);
                setAvatarLoaded(true); // Stop tracking even on error
              }}
            />
          </View>
        </View>
      </Marker>
    );
  };

  // UI render
  // Live stream markers component
  const LiveStreamMarker = ({ stream }: { stream: LiveStream }) => {
    if (!stream.location) return null;

    return (
      <Marker
        key={`live-${stream.id}`}
        coordinate={{
          latitude: stream.location.latitude,
          longitude: stream.location.longitude
        }}
        anchor={{ x: 0.5, y: 0.5 }}
        onPress={() => {
          // Navigate to watch-live screen
          router.push({
            pathname: '/watch-live',
            params: {
              streamId: (stream as any)?.id || (stream as any)?._id,
              roomId: (stream as any)?.roomId || stream.channelName || (stream as any)?.id,
              channelName: stream.channelName || (stream as any)?.id,
              title: (stream as any)?.title,
              hostName: (stream as any)?.userName,
              hostAvatar: (stream as any)?.userAvatar,
            }
          });
        }}
      >
        <View style={styles.liveMarkerContainer}>
          <View style={styles.liveBadgeNew}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <View style={styles.liveAvatarOutside}>
            <ExpoImage
              source={{ uri: stream.userAvatar || 'https://via.placeholder.com/32' }}
              style={styles.liveAvatarNew}
              contentFit="cover"
              cachePolicy="memory-disk"
              placeholder={IMAGE_PLACEHOLDER}
              transition={120}
            />
          </View>
        </View>
      </Marker>
    );
  };

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        {/* Main map or error fallback */}
        {!loading && validRegion && Platform.OS !== 'web' && MapView ? (
          <MapView
            ref={mapRef}
            style={styles.mapView}
            initialRegion={mapRegion && isValidLatLon(mapRegion.latitude, mapRegion.longitude)
              ? mapRegion
              : DEFAULT_REGION
            }
            region={mapRegion && isValidLatLon(mapRegion.latitude, mapRegion.longitude)
              ? mapRegion
              : DEFAULT_REGION
            }
            customMapStyle={standardMapStyle}
          >
            {/* Live stream markers - only show LIVE pill, no distance */}
            {safeLiveStreams.map((stream) => (
              <LiveStreamMarker key={stream.id} stream={stream} />
            ))}

            {/* Post markers */}
            {Object.entries(limitedLocationGroups).map(([key, postsAtLocation]) => {
              try {
                const safePostsAtLocation = Array.isArray(postsAtLocation) ? postsAtLocation : [];
                const post = safePostsAtLocation[0];
                if (
                  post &&
                  isValidLatLon(post.lat, post.lon) &&
                  typeof post.imageUrl === 'string' && post.imageUrl &&
                  isFinite(Number(post.lat)) && isFinite(Number(post.lon))
                ) {
                  return <PostMarker key={`post-${key}`} post={post as any} postsAtLocation={safePostsAtLocation as any} />;
                }
              } catch (err) {
                console.error('Error rendering marker:', err, key, postsAtLocation);
                return null;
              }
              return null;
            })}
          </MapView>
        ) : (
          <View style={styles.errorText}>
            <Text style={{ color: '#c00', fontWeight: 'bold' }}>
              No valid map data available. Please try again later.
            </Text>
          </View>
        )}
        {/* ...existing code for modals... */}
        <PostLocationModal
          visible={!!safeSelectedPosts.length}
          posts={safeSelectedPosts}
          onClose={() => setSelectedPosts(null)}
          onImagePress={post => {
            let locationName = '';
            if (typeof post.location === 'string') {
              locationName = post.location;
            } else if (typeof post.location === 'object' && post.location?.name) {
              locationName = post.location.name;
            }
            if (locationName) {
              setSelectedPosts(null);
              router.push({
                pathname: '/(tabs)/home',
                params: { location: locationName }
              });
            }
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mapContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapView: { width: '100%', height: '100%' },
  errorText: { position: 'absolute', bottom: 20, color: '#c00', backgroundColor: 'rgba(255,255,255,0.9)', padding: 8, borderRadius: 6 },

  /* Floating action button */
  fab: {
    position: 'absolute',
    right: 16,
    bottom: Platform.OS === 'ios' ? 34 : 20,
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  fabInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* My Location button */
  myLocationBtn: {
    position: 'absolute',
    left: 16,
    bottom: Platform.OS === 'ios' ? 34 : 20,
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  myLocationBtnInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f39c12',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Modal search bar styles */
  modalOverlay: { flex: 1 },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.18)' },
  modalContent: { flex: 1, justifyContent: 'flex-end' },
  searchModalWrapper: { left: 12, right: 12, bottom: Platform.OS === 'ios' ? 140 : 120, alignItems: 'center', zIndex: 9999, elevation: 20 },
  searchBarTop: { width: '92%', height: 56, borderRadius: 28, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 10 },
  modalInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#111' },
  clearBtn: { padding: 6 },
  
  /* Post modal styles */
  postModalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
  postModalBackdrop: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0 
  },
  postModalContainer: { 
    flex: 1, 
    justifyContent: 'flex-end' 
  },
  postModalContent: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
    maxHeight: '95%',
    paddingTop: 8,
  },
  
  /* Custom marker styles */
  markerContainer: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  postImageWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ffa726',
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  postImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  postAvatarOutside: {
    position: 'absolute',
    top: -2,
    left: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 6,
    zIndex: 100,
    overflow: 'hidden',
  },
  postAvatarImgFixed: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },

  /* Live stream marker styles */
  liveMarkerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  liveBadgeNew: {
    backgroundColor: '#e0245e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: -8,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  liveText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  liveAvatarOutside: {
    marginLeft: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  liveAvatarNew: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});