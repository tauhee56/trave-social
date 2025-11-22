import React, { useState, useRef, useEffect } from 'react';
import { Platform, View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Keyboard, Modal, Pressable, Image, ScrollView, FlatList, Share, Alert, PermissionsAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import PostCard from './components/PostCard';
import { getAllPosts } from '../lib/firebaseHelpers';

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
  const [showSearch, setShowSearch] = useState(false);

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
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('Location permission denied');
        }
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission denied');
        }
      }
    } catch (error) {
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
      console.log('Map: getAllPosts result:', result);
      if (result.success && Array.isArray(result.posts)) {
        console.log('Map: Setting posts, count:', result.posts.length);
        if (result.posts.length > 0) {
          console.log('Map: First post sample:', result.posts[0]);
        }
        // Filter posts by userId if provided
        const filteredPosts = userId 
          ? result.posts.filter((p: any) => p.userId === userId)
          : result.posts;
        console.log('Map: Filtered posts count:', filteredPosts.length);
        setPosts(filteredPosts as PostType[]);
      }
    } catch (e) {
      console.error('Map: Failed to load posts:', e);
      setError('Failed to load posts');
    }
    setLoading(false);
  }

  async function doSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAP_API_KEY}`
      );
      
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
          mapRef.current.animateToRegion(region, 1000);
        }
        
        // Check if there are posts near this location
        const nearby = findPostsNear(lat, lon, 5);
        if (nearby.length > 0) {
          console.log('Found', nearby.length, 'posts near searched location');
        }
      } else {
        setError('Location not found');
      }
    } catch (e: any) {
      console.error('Map search error:', e);
      setError(`Search failed: ${e.message || 'Unknown error'}`);
    }
    setLoading(false);
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

  // Group posts by location (lat/lon rounded to 5 decimals)
  const locationGroups: { [key: string]: PostType[] } = {};
  posts.forEach(p => {
    // Check both direct lat/lon and location.lat/lon
    const lat = p.lat ?? (typeof p.location !== 'string' ? p.location?.lat : undefined);
    const lon = p.lon ?? (typeof p.location !== 'string' ? p.location?.lon : undefined);
    if (lat != null && lon != null) {
      const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
      if (!locationGroups[key]) locationGroups[key] = [];
      locationGroups[key].push({ ...p, lat, lon });
    }
  });
  console.log('Map: Location groups:', Object.keys(locationGroups).length, 'groups');
  console.log('Map: Location groups detail:', locationGroups);

  // UI render
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.mapContainer}>
        {loading && <ActivityIndicator size="large" color="#f39c12" />}
        {!loading && (
          <MapView
            ref={r => { mapRef.current = r; }}
            style={styles.mapView}
            initialRegion={mapRegion ?? { latitude: 20, longitude: 0, latitudeDelta: 60, longitudeDelta: 60 }}
            onMapReady={() => {
              if (mapRegion && mapRef.current) {
                mapRef.current.animateToRegion(mapRegion, 400);
              }
            }}
          >
            {Object.entries(locationGroups).map(([key, group]) => (
              <Marker
                key={key}
                coordinate={{ latitude: group[0].lat!, longitude: group[0].lon! }}
                onPress={() => {
                  console.log('Marker pressed! Group:', group);
                  setSelectedPosts(group);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', padding: 2 }}>
                  {group.slice(0, 3).map((p, idx) => (
                    <View
                      key={p.id}
                      style={{
                        width: 44,
                        height: 44,
                        marginLeft: idx === 0 ? 0 : -10,
                        borderWidth: 3,
                        borderColor: '#FFD600',
                        backgroundColor: '#fff',
                        shadowColor: '#FFD600',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.6,
                        shadowRadius: 4,
                        elevation: 6,
                        borderRadius: 8,
                        overflow: 'hidden',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Image
                        source={{ uri: p.userAvatar || DEFAULT_AVATAR_URL }}
                        style={{ width: 38, height: 38, resizeMode: 'cover', borderRadius: 6 }}
                      />
                    </View>
                  ))}
                  {group.length > 3 && (
                    <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#FFD600', alignItems: 'center', justifyContent: 'center', marginLeft: -10, borderWidth: 3, borderColor: '#FFD600', shadowColor: '#FFD600', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 6 }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>+{group.length - 3}</Text>
                    </View>
                  )}
                </View>
              </Marker>
            ))}
            {coords && (
              <Marker
                coordinate={{ latitude: coords.lat, longitude: coords.lon }}
                title={query}
                pinColor="#f39c12"
                onPress={() => {
                  const nearby = findPostsNear(coords.lat, coords.lon, 5);
                  if (nearby.length > 0) {
                    setSelectedPosts(nearby);
                  }
                }}
              />
            )}
          </MapView>
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}
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
                    onSubmitEditing={() => { doSearch(); setShowSearch(false); }}
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
                    keyExtractor={item => item.id}
                    style={{ maxHeight: 500 }}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    renderItem={({ item }) => (
                      <View style={{ backgroundColor: '#fff', marginBottom: 8 }}>
                        <TouchableOpacity
                          activeOpacity={0.95}
                          onPress={() => {
                            const locationName = typeof item.location === 'string' ? item.location : item.location?.name;
                            if (locationName) {
                              router.push(`/(tabs)/home?filter=${encodeURIComponent(locationName)}`);
                            } else {
                              router.push(`/(tabs)/home`);
                            }
                          }}
                        >
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={{ width: '100%', height: 340, backgroundColor: '#eee', borderRadius: 0, alignSelf: 'center' }}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                        {/* Likes, Comments, Actions Row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, gap: 18 }}>
                          <TouchableOpacity onPress={() => handleModalLike(item)}>
                            <Feather name="heart" size={22} color={modalLiked[item.id] ? "#e0245e" : "#222"} />
                          </TouchableOpacity>
                          <Feather name="message-circle" size={22} color="#222" />
                          <TouchableOpacity onPress={() => handleModalShare(item)}>
                            <Feather name="send" size={22} color="#222" />
                          </TouchableOpacity>
                          <Feather name="bookmark" size={22} color="#222" style={{ marginLeft: 'auto' }} />
                        </View>
                        <Text style={{ fontWeight: '700', fontSize: 15, paddingHorizontal: 12, paddingTop: 4 }}>{(modalLikes[item.id] ?? item.likesCount ?? item.likes ?? 0).toLocaleString()} likes</Text>
                        {/* Caption and comments count */}
                        <View style={{ paddingHorizontal: 12, paddingTop: 6 }}>
                          <Text style={{ fontWeight: '700', fontSize: 15 }}>{item.userName}</Text>
                          <Text style={{ color: '#333', fontSize: 14, marginTop: 2 }}>{item.caption}</Text>
                          <Text style={{ color: '#666', fontSize: 13, marginTop: 2 }}>View all {(modalCommentsCount[item.id] ?? item.commentsCount ?? 0)} comments</Text>
                        </View>
                        {/* Add comment input */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 }}>
                          <Image source={{ uri: item.userAvatar }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }} />
                          <TextInput
                            style={{ flex: 1, fontSize: 14, color: '#000', paddingVertical: 8 }}
                            placeholder="Add a comment..."
                            placeholderTextColor="#8e8e8e"
                            value={modalComment[item.id] ?? ''}
                            onChangeText={text => setModalComment(c => ({...c, [item.id]: text}))}
                            multiline
                            maxLength={500}
                          />
                          <TouchableOpacity onPress={() => handleModalComment(item)}>
                            <Feather name="send" size={22} color="#f39c12" style={{ marginRight: 8 }} />
                          </TouchableOpacity>
                          <Feather name="heart" size={22} color="#f39c12" />
                        </View>
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
