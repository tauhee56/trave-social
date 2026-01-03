import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getRegions, searchUsers } from "../lib/firebaseHelpers/index";
import { followUser, sendFollowRequest, unfollowUser } from "../lib/firebaseHelpers/follow";

// Type definitions
type Region = {
  id: string;
  name: string;
  image: string;
  order?: number;
};

type Suggestion = {
  id: string;
  title: string;
  subtitle: string;
  placeId: string;
};

type User = {
  uid: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
};

const DEFAULT_AVATAR_URL = 'https://via.placeholder.com/200x200.png?text=Profile';

// Default regions (fallback if Firebase fetch fails)
const defaultRegions: Region[] = [
  { id: 'world', name: 'World', image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/regions/world.png' },
  { id: 'us', name: 'United States', image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/regions/us.png' },
  { id: 'eastasia', name: 'East Asia', image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/regions/eastasia.png' },
  { id: 'me', name: 'Middle East', image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/regions/middleeast.png' },
  { id: 'sea', name: 'South Asia', image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/regions/southeastasia.png' },
  { id: 'japan', name: 'Japan', image: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/regions/Japan.png' },
];

export default function SearchModal() {
  const [tab, setTab] = useState<'place'|'people'>('place');
  const [q, setQ] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [recommendations, setRecommendations] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [regions, setRegions] = useState<Region[]>(defaultRegions);
  const [loadingRegions, setLoadingRegions] = useState<boolean>(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingMap, setFollowingMap] = useState<{ [key: string]: boolean }>({});

  // Get current user ID on mount
  useEffect(() => {
    AsyncStorage.getItem('userId').then(uid => {
      if (uid) {
        setCurrentUserId(uid);
        console.log('[SearchModal] Current user ID:', uid);
      }
    }).catch(err => console.error('[SearchModal] Failed to get userId:', err));
  }, []);

  // Fetch regions from Firebase on mount
  useEffect(() => {
    async function fetchRegions() {
      setLoadingRegions(true);
      try {
        const result = await getRegions();
        if (result.success && result.data && result.data.length > 0) {
          setRegions(result.data);
        } else {
          // Use default regions if Firebase fetch fails
          setRegions(defaultRegions);
        }
      } catch (error) {
        console.error('Error loading regions:', error);
        setRegions(defaultRegions);
      }
      setLoadingRegions(false);
    }
    fetchRegions();
  }, []);

  // Reset data when tab changes
  useEffect(() => {
    setQ('');
    setSuggestions([]);
    setUsers([]); // Only reset to empty array, never set region objects
    setRecommendations([]); // Only reset to empty array, never set region objects
    setSelectedRegion(null);
  }, [tab]);

  // Place search (Google Maps Places API)
  useEffect(() => {
    if (tab !== 'place' || q.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggest(true);
    const timer = setTimeout(async () => {
      try {
        const { mapService } = await import('../services');
        const results = await mapService.getAutocompleteSuggestions(q);
        setSuggestions(results.map((r: any) => ({
          id: r.placeId || String(Math.random()),
          title: r.description || r.mainText || 'Location',
          subtitle: r.secondaryText || '',
          placeId: r.placeId,
        })));
      } catch (err) {
        setSuggestions([]);
      } finally {
        setLoadingSuggest(false);
      }
    }, 600); // Increased from 300ms to 600ms for better debouncing
    return () => clearTimeout(timer);
  }, [q, tab]);

  // People recommendations
  useEffect(() => {
    if (tab === 'people' && recommendations.length === 0) {
      setLoadingUsers(true);
      searchUsers('', 10).then(result => {
        if (result.success && Array.isArray(result.data)) {
          const users = result.data.map((u: any) => ({
            uid: u._id || u.uid || u.id,
            displayName: u.displayName || 'Unknown',
            photoURL: u.avatar || u.photoURL || DEFAULT_AVATAR_URL,
            bio: u.bio || ''
          }));
          setRecommendations(users);
        } else {
          setRecommendations([]);
        }
        setLoadingUsers(false);
      });
    }
  }, [tab, recommendations.length]);

  // People search
  useEffect(() => {
    if (tab !== 'people' || q.length < 2) {
      setUsers([]);
      return;
    }
    setLoadingUsers(true);
    const timer = setTimeout(async () => {
      const result = await searchUsers(q, 20);
      if (result.success && Array.isArray(result.data)) {
        const users = result.data.map((u: any) => ({
          uid: u._id || u.uid || u.id,
          displayName: u.displayName || 'Unknown',
          photoURL: u.avatar || u.photoURL || DEFAULT_AVATAR_URL,
          bio: u.bio || ''
        }));
        setUsers(users);
      } else {
        setUsers([]);
      }
      setLoadingUsers(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [q, tab]);

  // UI
  // Error boundary fallback UI
  if (hasError) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: 'red', fontSize: 16, marginBottom: 12 }}>Something went wrong. Please try again.</Text>
          <TouchableOpacity onPress={() => setHasError(false)} style={styles.searchBtnBar}>
            <Text style={styles.searchBtnBarText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          {/* Header Tabs */}
          <View style={styles.headerTabsRow}>
            <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} style={styles.closeBtn}>
              <Feather name="x" size={16} color="#333" />
            </TouchableOpacity>
            <View style={styles.tabsCenterWrap}>
              <View style={styles.tabsInline}>
                <TouchableOpacity onPress={() => setTab('place')} style={styles.tabBtnInline}>
                  <Text style={[styles.tabText, tab === 'place' && styles.tabTextActive]}>Place</Text>
                  {tab === 'place' && <View style={styles.tabUnderlineInline} />}
                </TouchableOpacity>
                <Text style={styles.dotSep}>·</Text>
                <TouchableOpacity onPress={() => setTab('people')} style={styles.tabBtnInline}>
                  <Text style={[styles.tabText, tab === 'people' && styles.tabTextActive]}>People</Text>
                  {tab === 'people' && <View style={styles.tabUnderlineInline} />}
                </TouchableOpacity>
              </View>
            </View>
          </View>
          {/* Search and Region Select in bordered box */}
          <View style={styles.searchRegionBorderBox}>
            <View style={styles.searchBox}>
              <Feather name="search" size={20} color="#333" />
              <TextInput
                style={styles.input}
                placeholder={tab === 'people' ? 'Search for traveler' : 'Search a destination'}
                placeholderTextColor="#999"
                value={q}
                onChangeText={setQ}
                autoCapitalize="none"
                autoCorrect={false}
                importantForAutofill="no"
              />
              {q.length > 0 && (
                <TouchableOpacity onPress={() => setQ('')} style={styles.inputClear}>
                  <Feather name="x" size={16} color="#777" />
                </TouchableOpacity>
              )}
            </View>
            {/* Region Select Grid (background) */}
            {tab === 'place' && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionTitle}>Or select a region</Text>
                {loadingRegions ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center', height: 200 }}>
                    <ActivityIndicator size="large" color="#f39c12" />
                  </View>
                ) : (
                  <View style={styles.regionGridWrap}>
                    {/* First row - independent scroll */}
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 16 }}
                    >
                      <View style={styles.regionGridRow}>
                        {regions.slice(0, 3).map(item => (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.regionCard, selectedRegion === item.id && styles.regionCardActive]}
                            onPress={() => { setSelectedRegion(item.id); setQ(item.name); }}
                            accessibilityLabel={`Select region ${item.name}`}
                          >
                            <View style={styles.regionImageWrap}>
                              <Image 
                                source={{ uri: item.image }} 
                                style={styles.regionImage} 
                                resizeMode="cover"
                              />
                            </View>
                            <Text style={styles.regionName}>{item.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                    {/* Second row - independent scroll */}
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 16 }}
                    >
                      <View style={styles.regionGridRow}>
                        {regions.slice(3, 6).map(item => (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.regionCard, selectedRegion === item.id && styles.regionCardActive]}
                            onPress={() => { setSelectedRegion(item.id); setQ(item.name); }}
                            accessibilityLabel={`Select region ${item.name}`}
                          >
                            <View style={styles.regionImageWrap}>
                              <Image 
                                source={{ uri: item.image }} 
                                style={styles.regionImage} 
                                resizeMode="cover"
                              />
                            </View>
                            <Text style={styles.regionName}>{item.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
            {/* Place Tab Results (Google Maps suggestions) - overlay above region grid */}
            {tab === 'place' && q.length >= 2 && (
              <View style={styles.suggestionListOverlay} pointerEvents="box-none">
                {loadingSuggest && <Text style={{ textAlign: 'center', color: '#888', marginBottom: 8 }}>Loading suggestions...</Text>}
                <FlatList
                  data={suggestions}
                  keyExtractor={(item: Suggestion) => item.id}
                  renderItem={({ item }: { item: Suggestion }) => (
                    <TouchableOpacity
                      style={styles.suggestionCardList}
                      onPress={() => {
                        router.push({ pathname: '/location/[placeId]', params: { placeId: item.placeId, locationName: item.title, locationAddress: item.subtitle } });
                      }}
                    >
                      <View style={styles.suggestionIconList}>
                        <Feather name="map-pin" size={28} color="#222" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionTitleList}>{item.title}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={{ color: '#888', marginTop: 12, textAlign: 'center' }}>No results</Text>}
                  style={{ marginTop: 0, maxHeight: 400 }}
                  contentContainerStyle={{ paddingVertical: 4, paddingBottom: 8 }}
                  showsVerticalScrollIndicator={false}
                  initialNumToRender={10}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  removeClippedSubviews={true}
                />
              </View>
            )}
            {/* People Tab Results (Firebase users) */}
            {tab === 'people' && q.length >= 2 && (
              <FlatList
                data={users}
                keyExtractor={(item: User) => item.uid}
                renderItem={({ item }: { item: User }) => {
                  const isOwnProfile = currentUserId === item.uid;
                  return (
                    <View style={styles.userResultRow}>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
                        onPress={() => router.push(`/user-profile?uid=${item.uid}`)}
                        accessibilityLabel={`Open profile for ${item.displayName || 'Traveler'}`}
                      >
                        <Image source={{ uri: item.photoURL || DEFAULT_AVATAR_URL }} style={styles.avatarImage} />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <Text style={{ fontWeight: '600' }}>
                            {item.displayName || 'Traveler'}{isOwnProfile ? ' (You)' : ''}
                          </Text>
                          <Text style={{ color: '#666', fontSize: 12 }}>{item.bio || 'No bio available'}</Text>
                        </View>
                      </TouchableOpacity>
                      {!isOwnProfile && (
                        <View style={{ flexDirection: 'row', gap: 8, paddingLeft: 8 }}>
                          <TouchableOpacity
                            style={styles.userActionBtn}
                            onPress={() => {
                              if (!currentUserId || !item.uid) {
                                console.log('[SearchModal] Missing IDs for message:', { currentUserId, itemUid: item.uid });
                                return;
                              }
                              console.log('[SearchModal] Navigating to DM with:', item.uid);
                              router.push({
                                pathname: '/dm',
                                params: {
                                  otherUserId: item.uid,
                                  user: item.displayName || 'Traveler',
                                  avatar: item.photoURL || DEFAULT_AVATAR_URL
                                }
                              });
                            }}
                            accessibilityLabel="Send message"
                          >
                            <Feather name="message-circle" size={18} color="#007AFF" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.userActionBtn}
                            onPress={() => {
                              if (!currentUserId || !item.uid) {
                                console.log('[SearchModal] Missing IDs for follow:', { currentUserId, itemUid: item.uid });
                                return;
                              }
                              const isFollowing = followingMap[item.uid];
                              console.log('[SearchModal] Toggle follow for', item.uid, 'currently following:', isFollowing);
                              if (isFollowing) {
                                unfollowUser(currentUserId, item.uid).then(res => {
                                  console.log('[SearchModal] Unfollow response:', res);
                                  if (res.success) {
                                    setFollowingMap(prev => ({ ...prev, [item.uid]: false }));
                                  }
                                }).catch(err => {
                                  console.error('[SearchModal] Unfollow error:', err);
                                });
                              } else {
                                followUser(currentUserId, item.uid).then(res => {
                                  console.log('[SearchModal] Follow response:', res);
                                  if (res.success) {
                                    setFollowingMap(prev => ({ ...prev, [item.uid]: true }));
                                  }
                                }).catch(err => {
                                  console.error('[SearchModal] Follow error:', err);
                                });
                              }
                            }}
                            accessibilityLabel={followingMap[item.uid] ? "Unfollow" : "Follow"}
                          >
                            <Feather name={followingMap[item.uid] ? "check" : "user-plus"} size={18} color={followingMap[item.uid] ? "#34C759" : "#666"} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                }}
                ListEmptyComponent={<Text style={{ color: '#888', marginTop: 12 }}>No travelers found</Text>}
                style={{ marginTop: 16, maxHeight: 120 }}
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={7}
                removeClippedSubviews={true}
              />
            )}
        </KeyboardAvoidingView>
        {/* Bottom Action Bar: always visible above keyboard */}
        <View style={styles.actionBtnBar}>
          <TouchableOpacity
            style={styles.clearAllBtn}
            onPress={() => {
              setQ('');
              setSelectedRegion(null);
              setUsers([]);
              setSuggestions([]);
            }}
            accessibilityLabel="Clear all search fields"
          >
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.searchBtnBar, (tab === 'place' && (suggestions.length === 0 || loadingSuggest)) && { opacity: 0.5 }]}
            disabled={tab === 'place' && (suggestions.length === 0 || loadingSuggest)}
            onPress={() => {
              if (tab === 'place' && suggestions.length > 0) {
                // Use first suggestion always, navigate to location details
                const selected = suggestions[0];
                router.push({ pathname: '/location/[placeId]', params: { placeId: selected.placeId, locationName: selected.title, locationAddress: selected.subtitle } });
              } else if (tab === 'people' && q.length >= 2 && users.length > 0) {
                // Open first user's profile
                const user = users[0];
                if (user?.uid) {
                  router.push(`/user-profile?uid=${user.uid}`);
                }
              }
            }}
            accessibilityLabel="Search with current query"
          >
            <Feather name="search" size={18} color="#fff" />
            <Text style={styles.searchBtnBarText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 12,
  },
  headerTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  tabsCenterWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotSep: { fontSize: 18, color: '#bbb', marginHorizontal: 2, marginTop: 2 },
  tabBtnInline: { paddingVertical: 0, paddingHorizontal: 0, position: 'relative', marginRight: 0, minWidth: 70, alignItems: 'center', justifyContent: 'center', height: 34 },
  tabText: { fontSize: 16, color: '#999', fontWeight: '400', textAlign: 'center' },
  tabTextActive: { color: '#111', fontWeight: '700', textAlign: 'center' },
  tabUnderlineInline: { position: 'absolute', bottom: -2, left: '22%', right: '22%', height: 2, backgroundColor: '#111', borderRadius: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e5e5' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#222', marginBottom: 12 },
  regionGridWrap: {
    flexDirection: 'column',
    gap: 12,
  },
  regionGridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  regionCard: {
    width: 110,
    height: 130,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    backgroundColor: '#fff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
    paddingBottom: 8,
  },
  regionCardActive: {
    borderColor: '#222',
    borderWidth: 2,
  },
  regionImageWrap: {
    width: 90,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    overflow: 'hidden',
  },
  regionImage: { 
    width: '100%', 
    height: '100%',
    borderRadius: 10,
  },
  regionName: { fontSize: 12, color: '#222', textAlign: 'center', fontWeight: '500', marginTop: 8 },
  actionBtnBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
    // Remove position absolute so it stays above keyboard and never gets cut off
    minHeight: 60,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  clearAllBtn: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  clearAllText: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  searchBtnBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f39c12',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  searchBtnBarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
  searchRegionBorderBox: {
    width: 327,
    height: 492,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#eee',
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
    paddingHorizontal: 8,
  },
  inputClear: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  clearBtn: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchBtn: {
    backgroundColor: '#f39c12',
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  suggestionListWrap: {
    marginTop: 0,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    paddingVertical: 4,
    paddingHorizontal: 0,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  suggestionListOverlay: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eee',
    marginHorizontal: 0,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 400,
  },
  suggestionCardList: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f6f8',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 20,
    marginBottom: 18,
    marginHorizontal: 0,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.01,
    shadowRadius: 1,
    elevation: 0,
  },
  suggestionIconList: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  suggestionTitleList: {
    fontSize: 17,
    fontWeight: '500',
    color: '#222',
  },
  userResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  userActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
});