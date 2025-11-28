import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Modal, PermissionsAndroid, Platform, Pressable, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import MapView, { Marker, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllPosts } from '../lib/firebaseHelpers';
import CommentSection from './components/CommentSection';

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
const GOOGLE_MAP_API_KEY = 'AIzaSyCYpwO1yUux1cHtd2bs-huu1hNKv1kC18c';
// If Nominatim is blocked for your IP you can provide a Mapbox token or Google Maps API key here.
const MAPBOX_TOKEN = ""; // <-- put your Mapbox token here (or leave empty)

interface PostType {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  imageUrl: string;
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

export default function MapScreen() {
      const [modalComment, setModalComment] = useState<{[id:string]:string}>({});
      const [modalLikes, setModalLikes] = useState<{[id:string]:number}>({});
      const [modalLiked, setModalLiked] = useState<{[id:string]:boolean}>({});
      const [modalCommentsCount, setModalCommentsCount] = useState<{[id:string]:number}>({});
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
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<PostType[] | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const [error, setError] = useState<string | null>(null);
    const [locationPermission, setLocationPermission] = useState<'granted'|'denied'|'unknown'>('unknown');
  const [showSearch, setShowSearch] = useState(false);
  const [showCommentsModalId, setShowCommentsModal] = useState<string | null>(null);

  // Request location permissions on mount
  useEffect(() => {
    requestLocationPermission();
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
      console.warn('Location permission error:', error);
    }
  };

  function handlePostPress(post: PostType) {
    const locationName = typeof post.location === 'string' ? post.location : post.location?.name;
    if (locationName) {
      router.push(`/(tabs)/home?filter=${encodeURIComponent(locationName)}`);
    } else {
      router.push(`/(tabs)/home`);
    }
  }

  // Load posts from Firebase
  React.useEffect(() => {
    loadPosts();
    // Set initial region from URL params if provided
    if (latParam && lonParam) {
      const region: Region = {
        latitude: latParam,
        longitude: lonParam,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1
      };
      setMapRegion(region);
      setCoords({ lat: latParam, lon: lonParam });
    } else if (initialQuery) {
      // If only query provided (no lat/lon), geocode it
      doSearch();
    }
  }, []);

  async function loadPosts() {
    setLoading(true);
    try {
      const result = await getAllPosts();
      if (result.success && Array.isArray(result.posts)) {
        // Get top 7 posts by visits or likes
        const sorted = result.posts.sort((a: any, b: any) => {
          const aScore = (a.visits ?? 0) + (a.likesCount ?? a.likes ?? 0);
          const bScore = (b.visits ?? 0) + (b.likesCount ?? b.likes ?? 0);
          return bScore - aScore;
        });
        const topPosts = sorted.slice(0, 7);
        setPosts(topPosts as PostType[]);
      } else {
        setPosts([]);
      }
    } catch (e: any) {
      setError(`Unable to load posts: ${e?.message || 'Network error'}`);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  async function doSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAP_API_KEY}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Map search API error:', response.status);
        setError(`Search failed: ${response.status === 403 ? 'API key issue' : 'Network error'}`);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      // Check Google Maps API response status
      if (data.status === 'REQUEST_DENIED') {
        console.error('Google Maps API denied:', data.error_message);
        setError('Maps API key restricted. Please check Google Cloud Console.');
        setLoading(false);
        return;
      }
      
      if (data.status !== 'OK') {
        console.warn('Maps API status:', data.status);
        setError(`Search failed: ${data.status}`);
        setLoading(false);
        return;
      }
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const lat = result.geometry.location.lat;
        const lon = result.geometry.location.lng;
        setCoords({ lat, lon });
        const region: Region = { latitude: lat, longitude: lon, latitudeDelta: 0.1, longitudeDelta: 0.1 };
        setMapRegion(region);
        
        // Clear selected posts when searching new location
        setSelectedPosts(null);
        
        // Animate to searched location
        if (mapRef.current) {
          try {
            mapRef.current.animateToRegion(region, 1000);
          } catch (animError) {
            console.warn('Map animation error:', animError);
          }
        }
        
        // Check if there are posts near this location
        const nearby = findPostsNear(lat, lon, 5);
        if (nearby.length > 0) {
          // Show only the most popular post at this location
          const sortedNearby = nearby.sort((a: any, b: any) => {
            const aScore = (a.visits ?? 0) + (a.likesCount ?? a.likes ?? 0);
            const bScore = (b.visits ?? 0) + (b.likesCount ?? b.likes ?? 0);
            return bScore - aScore;
          });
          setSelectedPosts([sortedNearby[0]]);
        }
      } else {
        setError('Location not found');
      }
    } catch (e: any) {
      console.error('Map search error:', e);
      if (e.name === 'AbortError') {
        setError('Search timeout - please try again');
      } else {
        setError(`Search failed: ${e.message || 'Network error'}`);
      }
    } finally {
      setLoading(false);
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

  // Filter posts: only those with 100+ likes
  const filteredPosts = posts.filter(p => (p.likesCount ?? p.likes ?? 0) >= 100);

  // Group filtered posts by location (lat/lon rounded to 5 decimals), max 5 per location sorted by likes
  const locationGroups: { [key: string]: PostType[] } = {};
  filteredPosts.forEach(p => {
    const lat = p.lat ?? (typeof p.location !== 'string' ? p.location?.lat : undefined);
    const lon = p.lon ?? (typeof p.location !== 'string' ? p.location?.lon : undefined);
    if (lat != null && lon != null) {
      const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
      if (!locationGroups[key]) locationGroups[key] = [];
      locationGroups[key].push({ ...p, lat, lon });
      // Sort and keep only top 5 by likes
      locationGroups[key] = locationGroups[key]
        .sort((a, b) => ((b.likesCount ?? b.likes ?? 0) - (a.likesCount ?? a.likes ?? 0)))
        .slice(0, 5);
    }
  });
  console.log('Map: Location groups:', Object.keys(locationGroups).length, 'groups');
  console.log('Map: Location groups detail:', locationGroups);
  console.log('Google Maps API Key:', GOOGLE_MAP_API_KEY); // Debug print for API key

  // UI render
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.mapContainer}>
        {loading && <ActivityIndicator size="large" color="#f39c12" />}
        {!loading && (
          <MapView
            ref={mapRef}
            style={styles.mapView}
            initialRegion={mapRegion || {
              latitude: 0,
              longitude: 0,
              latitudeDelta: 180,
              longitudeDelta: 360
            }}
            region={mapRegion || {
              latitude: 0,
              longitude: 0,
              latitudeDelta: 180,
              longitudeDelta: 360
            }}
            showsUserLocation={locationPermission === 'granted'}
            showsMyLocationButton={locationPermission === 'granted'}
            customMapStyle={standardMapStyle}
            onPress={e => {
              // Example: select posts at pressed location
              const { latitude, longitude } = e.nativeEvent.coordinate;
              const nearby = findPostsNear(latitude, longitude, 5);
              if (nearby.length > 0) setSelectedPosts(nearby);
            }}
          >
            {Object.entries(locationGroups).map(([key, postsAtLocation]) => {
              const post = postsAtLocation[0];
              if (typeof post.lat === 'number' && typeof post.lon === 'number') {
                return (
                  <Marker
                    key={key}
                    coordinate={{ latitude: post.lat, longitude: post.lon }}
                    onPress={() => setSelectedPosts(postsAtLocation)}
                  >
                    <View style={styles.markerContainer}>
                      <Image source={{ uri: post.imageUrl }} style={styles.markerAvatar} />
                      {/* Small user avatar circle */}
                      <View style={{ position: 'absolute', top: 2, left: 2, width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#fff', overflow: 'hidden', backgroundColor: '#eee', zIndex: 2 }}>
                        <Image source={{ uri: post.userAvatar || DEFAULT_AVATAR_URL }} style={{ width: 18, height: 18, borderRadius: 9 }} />
                      </View>
                      {/* Live badge */}
                      {post.isLive && (
                        <View style={{ position: 'absolute', top: 2, right: 2, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, zIndex: 3, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f39c12' }}>
                          <Text style={{ color: '#e0245e', fontWeight: 'bold', fontSize: 10, marginRight: 2 }}>Live</Text>
                          <Image source={{ uri: post.userAvatar || DEFAULT_AVATAR_URL }} style={{ width: 12, height: 12, borderRadius: 6 }} />
                        </View>
                      )}
                    </View>
                  </Marker>
                );
              }
              return null;
            })}
          </MapView>
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}
        
        {/* Use My Location Button - bottom-left */}
        {locationPermission === 'granted' && (
          <TouchableOpacity 
            style={styles.myLocationBtn} 
            onPress={async () => {
              try {
                const location = await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.High,
                });
                const region: Region = {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                };
                setMapRegion(region);
                mapRef.current?.animateToRegion(region, 1000);
                setCoords({ lat: location.coords.latitude, lon: location.coords.longitude });
              } catch (error) {
                console.error('Error getting current location:', error);
              }
            }}
            activeOpacity={0.85}
          >
            <View style={styles.myLocationBtnInner}>
              <Feather name="navigation" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* Floating search button (bottom-right) - hide when search modal is open */}
        {!showSearch && (
          <TouchableOpacity style={styles.fab} onPress={() => setShowSearch(true)} activeOpacity={0.85}>
            <View style={styles.fabInner}>
              <Feather name="search" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        )}
        {/* Modal-style bottom rounded search bar shown when FAB pressed */}
        <Modal visible={showSearch} transparent animationType="slide" onRequestClose={() => setShowSearch(false)}>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setShowSearch(false)} />
            <View style={styles.modalContent} pointerEvents="box-none">
              <View style={styles.searchModalWrapper}>
                <Pressable onPress={() => {}} style={styles.searchBarTop}>
                  <Feather name="search" size={18} color="#111" />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Where to?"
                    placeholderTextColor="#666"
                    style={styles.modalInput}
                    returnKeyType="search"
                    autoFocus
                    onSubmitEditing={() => {
                      // Only move the map to the searched location, do not navigate away
                      doSearch();
                      setShowSearch(false);
                    }}
                  />
                  {query ? (
                    <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                      <Feather name="x" size={16} color="#999" />
                    </TouchableOpacity>
                  ) : null}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        {/* Modal for posts at selected location */}
        <Modal visible={!!selectedPosts} transparent animationType="slide" onRequestClose={() => setSelectedPosts(null)}>
          <View style={styles.postModalOverlay}> 
            <Pressable style={styles.postModalBackdrop} onPress={() => setSelectedPosts(null)} />
            <View style={styles.postModalContainer}> 
              {selectedPosts && selectedPosts.length > 0 && (
                <View style={styles.postModalContent}> 
                  {/* Top pills with location info */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 8 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#eee' }}>
                      <Feather name="map-pin" size={16} color="#f39c12" />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#111' }}>
                        {typeof selectedPosts[0]?.location === 'string' ? selectedPosts[0]?.location : selectedPosts[0]?.location?.name || 'Location'}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Post count */}
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', textAlign: 'center', paddingVertical: 8 }}>
                    {selectedPosts.length} Post{selectedPosts.length > 1 ? 's' : ''}
                  </Text>
                  
                  {/* Main post location info with icon */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Feather name="map-pin" size={20} color="#111" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 2 }}>
                        {typeof selectedPosts[0]?.location === 'string' ? selectedPosts[0]?.location : selectedPosts[0]?.location?.name || 'Location'}
                      </Text>
                      {selectedPosts[0]?.location && typeof selectedPosts[0]?.location === 'object' && selectedPosts[0]?.location?.name && (
                        <Text style={{ fontSize: 13, color: '#666', lineHeight: 18 }}>
                          {selectedPosts[0]?.location?.name}
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  {/* Posts list */}
                  <FlatList
                    data={selectedPosts}
                    key={`selectedPosts-${selectedPosts?.[0]?.id || ''}-${selectedPosts?.length}`}
                    keyExtractor={item => item.id}
                    style={{ maxHeight: 500 }}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    renderItem={({ item }) => (
                      <View style={{ backgroundColor: '#fff', borderRadius: 18, margin: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, overflow: 'hidden' }}>
                        {/* Post image at top */}
                        <TouchableOpacity
                          activeOpacity={0.95}
                          onPress={() => {
                            // Navigate to feed with postId and location
                            const postId = item.id;
                            let locationName = '';
                            if (typeof item.location === 'string') locationName = item.location;
                            else if (typeof item.location === 'object' && item.location?.name) locationName = item.location.name;
                            if (locationName) {
                              router.push(`/(tabs)/home?location=${encodeURIComponent(locationName)}&postId=${postId}`);
                            } else {
                              router.push(`/(tabs)/home?postId=${postId}`);
                            }
                          }}
                        >
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={{ width: '100%', height: 340, backgroundColor: '#eee', borderRadius: 0, alignSelf: 'center' }}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                        {/* Icons row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, gap: 18 }}>
                          <TouchableOpacity
                            onPress={() => {
                              if (!modalLiked[item.id]) handleModalLike(item);
                            }}
                            disabled={modalLiked[item.id]}
                            style={{ opacity: modalLiked[item.id] ? 0.5 : 1 }}
                          >
                            <Feather name="heart" size={24} color={modalLiked[item.id] ? "#e0245e" : "#222"} />
                          </TouchableOpacity>
                          <Feather name="message-circle" size={22} color="#222" />
                          <TouchableOpacity onPress={() => handleModalShare(item)}>
                            <Feather name="send" size={22} color="#222" />
                          </TouchableOpacity>
                          <Feather name="bookmark" size={22} color="#222" style={{ marginLeft: 'auto' }} />
                        </View>
                        {/* Likes count */}
                        <Text style={{ fontWeight: '700', fontSize: 15, paddingHorizontal: 16, paddingTop: 4 }}>{(modalLikes[item.id] ?? item.likesCount ?? item.likes ?? 0).toLocaleString()} likes</Text>
                        {/* Caption */}
                        <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
                          <Text style={{ color: '#333', fontSize: 15, marginTop: 2 }}>{item.caption}</Text>
                        </View>
                        {/* View all comments link */}
                        <TouchableOpacity style={{ paddingHorizontal: 16, paddingTop: 8 }} onPress={() => setShowCommentsModal(item.id)}>
                          <Text style={{ color: '#007aff', fontSize: 15, fontWeight: '500' }}>View all comments</Text>
                        </TouchableOpacity>
                        {/* Comment box at bottom */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#eee', marginTop: 8 }}>
                          <Image source={{ uri: item.userAvatar }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8, backgroundColor: '#eee' }} />
                          <TextInput
                            style={{ flex: 1, backgroundColor: '#f5f5f5', borderRadius: 16, paddingHorizontal: 12, fontSize: 15, height: 36 }}
                            placeholder="Add a comment..."
                            placeholderTextColor="#999"
                            value={modalComment[item.id] || ''}
                            onChangeText={text => setModalComment(c => ({ ...c, [item.id]: text }))}
                            returnKeyType="send"
                            onSubmitEditing={() => handleModalComment(item)}
                          />
                          <TouchableOpacity
                            onPress={() => handleModalComment(item)}
                            style={{ marginLeft: 8, backgroundColor: '#007aff', borderRadius: 16, padding: 8 }}
                            disabled={!modalComment[item.id] || !modalComment[item.id].trim()}
                          >
                            <Feather name="send" size={18} color="#fff" />
                          </TouchableOpacity>
                        </View>
                        {/* Comments modal (Instagram style) */}
                        {showCommentsModalId === item.id && (
                          <Modal visible transparent animationType="slide" onRequestClose={() => setShowCommentsModal(null)}>
                            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'flex-end' }}>
                              <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '70%' }}>
                                {/* @ts-ignore */}
                                <CommentSection postId={item.id} currentAvatar={item.userAvatar} instagramStyle />
                              </View>
                            </View>
                          </Modal>
                        )}
                      </View>
                    )}
                  />
                </View>
              )}
            </View>
          </View>
        </Modal>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerAvatar: {
    width: '100%',
    height: '100%',
  },
});
