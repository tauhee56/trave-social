import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, PermissionsAndroid, Platform, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { collection, query as firestoreQuery, onSnapshot, where } from 'firebase/firestore';
import MapView, { Marker, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostLocationModal } from '../components/PostLocationModal';
import { db } from '../config/firebase';
import { getAllPosts } from '../lib/firebaseHelpers';

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

export default function MapScreen() {
  // Placeholder search function for modal
  function doSearch() {
    // TODO: Implement search logic to update map region based on query
    // Example: setMapRegion(...) or call geocoding API
    console.log('Search triggered for query:', query);
  }
      const [modalComment, setModalComment] = useState<{[id:string]:string}>({});
      const [modalLikes, setModalLikes] = useState<{[id:string]:number}>({});
      const [modalLiked, setModalLiked] = useState<{[id:string]:boolean}>({});
      const [modalCommentsCount, setModalCommentsCount] = useState<{[id:string]:number}>({});

      // Load posts from Firestore on mount
      useEffect(() => {
        setLoading(true);
        getAllPosts(150).then(res => { // Limit to 150 posts for better performance
          if (res.success) {
            setPosts(Array.isArray(res.posts) ? res.posts : []);
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
          await Share.share({
            message: `Check out this post by ${post.userName}: ${post.caption || ''}`,
            url: post.imageUrl
          });
        } catch (error) {
          console.error('Share error:', error);
        }
      }
      async function handleModalComment(post: PostType) {
        if (!modalComment[post.id] || !modalComment[post.id].trim()) return;
        // TODO: Call addComment API here
        setModalCommentsCount(c => ({...c, [post.id]: (c[post.id] ?? post.commentsCount ?? 0) + 1}));
        setModalComment(c => ({...c, [post.id]: ''}));
      }
    // Default avatar from Firebase Storage
    const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialQuery = (params.q as string) || '';
  const userId = (params.user as string) || undefined; // Get userId from params
  const latParam = params.lat ? parseFloat(params.lat as string) : undefined;
  const lonParam = params.lon ? parseFloat(params.lon as string) : undefined;

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  // Viewer location state
  const [viewerCoords, setViewerCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  // Defensive: always use array
  const safePosts = Array.isArray(posts) ? posts : [];
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  // Defensive: always use array
  const safeLiveStreams = Array.isArray(liveStreams) ? liveStreams : [];
  const [mapRegion, setMapRegion] = useState<Region | null>(DEFAULT_REGION);
    // Ensure mapRegion is always valid after mount
    useEffect(() => {
      if (!mapRegion || !isValidLatLon(mapRegion.latitude, mapRegion.longitude)) {
        setMapRegion(DEFAULT_REGION);
      }
    }, []);
  const [selectedPosts, setSelectedPosts] = useState<PostType[] | null>(null);
  // Defensive: always use array
  const safeSelectedPosts = Array.isArray(selectedPosts) ? selectedPosts : [];
  const mapRef = useRef<MapView | null>(null);
  const [error, setError] = useState<string | null>(null);
    const [locationPermission, setLocationPermission] = useState<'granted'|'denied'|'unknown'>('unknown');
  const [showSearch, setShowSearch] = useState(false);
  const [showCommentsModalId, setShowCommentsModal] = useState<string | null>(null);

  // Request location permissions and get viewer location on mount
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

  // Subscribe to live streams
  useEffect(() => {
    const liveStreamsRef = collection(db, 'liveStreams');
    const liveQuery = firestoreQuery(liveStreamsRef, where('isLive', '==', true));

    const unsubscribe = onSnapshot(liveQuery, (snapshot) => {
      const streams: LiveStream[] = [];
      snapshot.forEach((doc) => {
        streams.push({
          id: doc.id,
          ...doc.data()
        } as LiveStream);
      });

      // Sort by viewer count
      streams.sort((a, b) => (b.viewerCount || 0) - (a.viewerCount || 0));
      setLiveStreams(streams);
    });

    return () => unsubscribe();
  }, []);

  const requestLocationPermission = async () => {
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

  // Show all posts with valid location
  const filteredPosts = safePosts.filter(p => {
    const lat = p.lat ?? (typeof p.location !== 'string' ? p.location?.lat : undefined);
    const lon = p.lon ?? (typeof p.location !== 'string' ? p.location?.lon : undefined);
    return isValidLatLon(lat, lon);
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
    const imageUrl = p.imageUrl || (Array.isArray(p.imageUrls) && p.imageUrls.length > 0 ? p.imageUrls[0] : '') || '';
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

  // UI render
  // Helper: get streamer location from liveStreams (first live stream)
  const streamer = safeLiveStreams.length > 0 ? safeLiveStreams[0] : null;
  const streamerCoords = streamer?.location ? {
    lat: streamer.location.latitude,
    lon: streamer.location.longitude
  } : null;

  // Helper: route coordinates (viewer to streamer)
  const routeCoords = (viewerCoords && streamerCoords)
    ? [
        { latitude: viewerCoords.lat, longitude: viewerCoords.lon },
        { latitude: streamerCoords.lat, longitude: streamerCoords.lon }
      ]
    : [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={{ flex: 1 }}>
        {/* Main map or error fallback */}
        {!loading && validRegion ? (
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
            {/* Viewer marker */}
            {viewerCoords && (
              <Marker
                key="viewer"
                coordinate={{ latitude: viewerCoords.lat, longitude: viewerCoords.lon }}
                pinColor="#3498db"
                title="You"
              />
            )}
            {/* Streamer marker */}
            {streamerCoords && (
              <Marker
                key="streamer"
                coordinate={{ latitude: streamerCoords.lat, longitude: streamerCoords.lon }}
                pinColor="#e0245e"
                title={streamer?.userName || "Streamer"}
              />
            )}
            {/* Route polyline */}
            {routeCoords.length === 2 && (
              <MapView.Polyline
                coordinates={routeCoords}
                strokeColor="#e0245e"
                strokeWidth={4}
              />
            )}
            {/* ...existing code for post markers... */}
            {Object.entries(limitedLocationGroups).map(([key, postsAtLocation]) => {
              // ...existing code...
              // (keep post markers as before)
              try {
                const safePostsAtLocation = Array.isArray(postsAtLocation) ? postsAtLocation : [];
                const post = safePostsAtLocation[0];
                if (
                  post &&
                  isValidLatLon(post.lat, post.lon) &&
                  typeof post.imageUrl === 'string' && post.imageUrl &&
                  isFinite(Number(post.lat)) && isFinite(Number(post.lon))
                ) {
                  const handleMarkerPress = () => {
                    if (isValidLatLon(post.lat, post.lon)) {
                      setSelectedPosts(safePostsAtLocation);
                    } else {
                      console.warn('Invalid marker coordinates, cannot open modal');
                    }
                  };
                  if (Platform.OS === 'android') {
                    return (
                      <Marker
                        key={`post-${key}`}
                        coordinate={{ latitude: Number(post.lat), longitude: Number(post.lon) }}
                        pinColor="#ffa726"
                        onPress={handleMarkerPress}
                      />
                    );
                  } else {
                    return (
                      <Marker
                        key={`post-${key}`}
                        coordinate={{ latitude: Number(post.lat), longitude: Number(post.lon) }}
                        onPress={handleMarkerPress}
                      >
                        <TouchableOpacity activeOpacity={0.9} style={styles.markerContainer} onPress={handleMarkerPress}>
                          <View style={styles.postImageWrapper}>
                            <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
                          </View>
                          <View style={styles.postAvatarOutside}>
                            <Image source={{ uri: post.userAvatar || DEFAULT_AVATAR_URL }} style={styles.postAvatarImgFixed} />
                          </View>
                        </TouchableOpacity>
                      </Marker>
                    );
                  }
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
    </SafeAreaView>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  postImageWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#ffa726',
    overflow: 'hidden',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  postImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  postAvatarOutside: {
    marginLeft: 4,
    marginRight: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
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
  postAvatarImgFixed: {
    width: 34,
    height: 34,
    borderRadius: 17,
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