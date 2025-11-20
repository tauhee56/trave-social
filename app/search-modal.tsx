import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, Dimensions, FlatList, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { searchUsers } from "../lib/firebaseHelpers";

const GOOGLE_MAP_API_KEY = 'AIzaSyCYpwO1yUux1cHtd2bs-huu1hNKv1kC18c';

const { width } = Dimensions.get("window");

const regions = [
  { id: 'world', name: 'World', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Equirectangular_projection_SW.jpg/320px-Equirectangular_projection_SW.jpg' },
  { id: 'us', name: 'United States', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/USA_orthographic.svg/300px-USA_orthographic.svg.png' },
  { id: 'italy', name: 'Italy', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Italy_on_the_globe_%28Europe_centered%29.svg/300px-Italy_on_the_globe_%28Europe_centered%29.svg.png' },
  { id: 'japan', name: 'Japan', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Japan_on_the_globe_%28Japan_centered%29.svg/300px-Japan_on_the_globe_%28Japan_centered%29.svg.png' },
  { id: 'sea', name: 'Southeast Asia', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Southeast_Asia_%28orthographic_projection%29.svg/300px-Southeast_Asia_%28orthographic_projection%29.svg.png' },
  { id: 'me', name: 'Middle East', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Middle_East_%28orthographic_projection%29.svg/300px-Middle_East_%28orthographic_projection%29.svg.png' },
];

export default function SearchModal() {
    // Default avatar from Firebase Storage
    const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/travel-app-3da72.firebasestorage.app/o/default%2Fdefault-pic.jpg?alt=media&token=7177f487-a345-4e45-9a56-732f03dbf65d';
  const [tab, setTab] = useState<'place'|'people'>('place');
  const [q, setQ] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const router = useRouter();

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);

  // People search
  const [users, setUsers] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Optional Mapbox token for better autocomplete. Leave empty to use Nominatim fallback.
  const MAPBOX_TOKEN = "";

  // Load recommendations when switching to people tab
  useEffect(() => {
    if (tab === 'people' && recommendations.length === 0) {
      loadRecommendations();
    }
  }, [tab]);

  // Search users when query changes
  useEffect(() => {
    if (tab !== 'people') return;
    if (q.trim().length < 2) {
      setUsers([]);
      return;
    }

    const timer = setTimeout(() => {
      searchForUsers(q.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [q, tab]);

  async function loadRecommendations() {
    try {
      setLoadingUsers(true);
      const result = await searchUsers('', 10);
      if (result.success) {
        setRecommendations(result.data);
      }
    } catch (error) {
      console.log('Error loading recommendations:', error);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function searchForUsers(query: string) {
    try {
      setLoadingUsers(true);
      const result = await searchUsers(query, 20);
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.log('Error searching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }

  const SAMPLE_USERS = [
    { id: 'u1', name: 'Aisha Khan', avatar: '' },
    { id: 'u2', name: 'Carlos M', avatar: '' },
    { id: 'u3', name: 'Sophie L', avatar: '' },
  ];

  useEffect(() => {
    if (!q || q.length < 2 || tab !== 'place') {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setLoadingSuggest(true);
    const timer = setTimeout(async () => {
      try {
        // Use Nominatim OpenStreetMap API (no key required, more reliable in production)
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const res = await fetch(url, { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TravelSocialApp/1.0'
          }
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          console.warn('Search API status:', res.status);
          if (!cancelled) setSuggestions([]);
          return;
        }
        
        const data = await res.json();
        
        const items = (data || []).map((r: any) => ({
          id: r.place_id || String(Math.random()),
          title: r.display_name?.split(',')[0] || r.name || 'Location',
          subtitle: r.display_name || '',
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
          source: 'nominatim',
        }));
        
        if (!cancelled) setSuggestions(items);
      } catch (e: any) {
        console.warn('Search API error:', e?.message || e);
        // Don't crash - just show empty suggestions
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoadingSuggest(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q, tab]);

  function handleClear() {
    setQ('');
    setSelectedRegion(null);
    setSuggestions([]);
  }

  function handleSearch() {
    const trimmed = (q || '').trim();
    if (selectedRegion) {
      const region = regions.find(r => r.id === selectedRegion);
      const label = region ? region.name : trimmed;
      router.push(`/(tabs)/map?q=${encodeURIComponent(label || '')}`);
      return;
    }

    if (trimmed.length > 0) {
      router.push(`/(tabs)/map?q=${encodeURIComponent(trimmed)}`);
      return;
    }

    // fallback: just open map
    router.push(`/(tabs)/map`);
  }

  // Clear input when switching to People tab so text doesn't persist
  useEffect(() => {
    if (tab === 'people') {
      handleClear();
    }
  }, [tab]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
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

      {/* Main content */}
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={styles.searchRegionBox}>
          <View style={styles.searchBox}>
            <Feather name="search" size={20} color="#333" />
            <TextInput
              style={styles.input}
              placeholder={tab === 'people' ? 'Search for traveler' : 'Search a destination'}
              placeholderTextColor="#999"
              value={q}
              onChangeText={setQ}
            />
            {q.length > 0 && (
              <TouchableOpacity onPress={handleClear} style={styles.inputClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={16} color="#777" />
              </TouchableOpacity>
            )}
          </View>

          {q.length >= 2 && tab === 'place' && (
            <View style={{ marginTop: 10, maxHeight: 220 }}>
              <FlatList
                data={suggestions}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionRow}
                    onPress={() => {
                      handleClear();
                      if (item.lat && item.lon) {
                        router.push(`/(tabs)/map?lat=${item.lat}&lon=${item.lon}&q=${encodeURIComponent(item.subtitle || item.title)}`);
                      } else {
                        router.push(`/(tabs)/map?q=${encodeURIComponent(item.subtitle || item.title)}`);
                      }
                    }}
                  >
                    <Feather name="map-pin" size={18} color="#f39c12" />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={{ fontWeight: '600' }}>{item.title}</Text>
                      <Text style={{ color: '#666', fontSize: 12 }}>{item.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f0f0f0', marginVertical: 8 }} />}
              />
            </View>
          )}

          {tab === 'place' && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.sectionTitle}>Or select a region</Text>

              <View style={{ height: 140, marginBottom: 12 }}>
                <FlatList
                  data={regions.slice(0, 3)}
                  keyExtractor={item => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item, index }) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.regionCard,
                          selectedRegion === item.id && styles.regionCardActive,
                          { marginRight: index !== 2 ? 12 : 0 }
                        ]}
                        onPress={() => {
                          setSelectedRegion(item.id);
                          setQ(item.name);
                        }}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: item.image }} style={styles.regionImage} resizeMode="contain" />
                        <Text style={styles.regionName}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                />
              </View>

              <View style={{ height: 140 }}>
                <FlatList
                  data={regions.slice(3, 6)}
                  keyExtractor={item => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item, index }) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.regionCard,
                          selectedRegion === item.id && styles.regionCardActive,
                          { marginRight: index !== 2 ? 12 : 0 }
                        ]}
                        onPress={() => {
                          setSelectedRegion(item.id);
                          setQ(item.name);
                        }}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: item.image }} style={styles.regionImage} resizeMode="contain" />
                        <Text style={styles.regionName}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                />
              </View>
            </View>
          )}

          {tab === 'people' && (
            <View style={{ marginTop: 20 }}>
              {q.trim().length === 0 && (
                <>
                  <Text style={styles.sectionTitle}>Recommended travelers</Text>
                  {loadingUsers ? (
                    <ActivityIndicator size="small" color="#f39c12" style={{ marginTop: 20 }} />
                  ) : (
                    <View style={{ marginTop: 8 }}>
                      <FlatList
                        data={recommendations}
                        keyExtractor={u => u.id}
                        renderItem={({ item }) => (
                          <TouchableOpacity style={styles.personRow} onPress={() => { handleClear(); router.push(`/user-profile?user=${item.id}`); }}>
                            <Image source={{ uri: item.photoURL || item.avatar || DEFAULT_AVATAR_URL }} style={styles.personAvatar} />
                            <View style={{ marginLeft: 12, flex: 1 }}>
                              <Text style={{ fontWeight: '600' }}>{item.displayName || 'Traveler'}</Text>
                              {item.bio && <Text style={{ fontSize: 12, color: '#666' }} numberOfLines={1}>{item.bio}</Text>}
                            </View>
                          </TouchableOpacity>
                        )}
                        ListEmptyComponent={<Text style={{ color: '#999', marginTop: 20, textAlign: 'center' }}>No recommendations available</Text>}
                      />
                    </View>
                  )}
                </>
              )}

              {q.trim().length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Search results</Text>
                  {loadingUsers ? (
                    <ActivityIndicator size="small" color="#f39c12" style={{ marginTop: 20 }} />
                  ) : (
                    <View style={{ marginTop: 8 }}>
                      <FlatList
                        data={users}
                        keyExtractor={u => u.id}
                        renderItem={({ item }) => (
                          <TouchableOpacity style={styles.personRow} onPress={() => { handleClear(); router.push(`/user-profile?user=${item.id}`); }}>
                            <Image source={{ uri: (item.photoURL && item.photoURL.trim() !== "" ? item.photoURL : (item.avatar && item.avatar.trim() !== "" ? item.avatar : DEFAULT_AVATAR_URL)) }} style={styles.personAvatar} />
                            <View style={{ marginLeft: 12, flex: 1 }}>
                              <Text style={{ fontWeight: '600' }}>{item.displayName || 'Traveler'}</Text>
                              {item.bio && <Text style={{ fontSize: 12, color: '#666' }} numberOfLines={1}>{item.bio}</Text>}
                            </View>
                          </TouchableOpacity>
                        )}
                        ListEmptyComponent={<Text style={{ color: '#999', marginTop: 20, textAlign: 'center' }}>No users found</Text>}
                      />
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Bottom Actions */}
          <View style={styles.bottomBar}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', flex: 1 }}>
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
            <View style={styles.clearUnderline} />
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Feather name="search" size={18} color="#fff" />
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchRegionBox: {
    width: 327,
    height: 492,
    backgroundColor: '#fff',
    borderRadius: 24,
    alignSelf: 'center',
    marginTop: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  personRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  personAvatar: { width: 36, height: 36, borderRadius: 18 },
  container: { 
    flex: 1, 
    backgroundColor: '#fff', 
    paddingTop: 12,
  },
  headerTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    height: 44,
  },
  tabsCenterWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    height: 44,
  },
  tabsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 34,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  dotSep: {
    fontSize: 18,
    color: '#bbb',
    marginHorizontal: 2,
    marginTop: 2,
  },
  tabBtnInline: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    position: 'relative',
    marginRight: 0,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
  },
  tabText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '400',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#111',
    fontWeight: '700',
    textAlign: 'center',
  },
  tabUnderlineInline: {
    position: 'absolute',
    bottom: -2,
    left: '22%',
    right: '22%',
    height: 2,
    backgroundColor: '#111',
    borderRadius: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tabRow: { 
    flexDirection: 'row', 
    gap: 20,
  },
  tabBtn: { 
    paddingVertical: 8,
    position: 'relative',
  },
  /* tabText and tabTextActive already defined above; duplicates removed */
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#333',
  },
  searchBox: { 
    backgroundColor: '#f9f9f9', 
    height: 50, 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    flexDirection: 'row', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  input: { 
    flex: 1, 
    marginLeft: 12,
    fontSize: 15,
    color: '#333',
    paddingRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  regionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  regionCard: {
    width: 124,
    height: 124,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#eee',
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  regionCardActive: {
    borderColor: '#111',
    borderWidth: 3,
    borderRadius: 20,
  },
  regionImage: {
    width: '100%',
    height: '70%',
    marginBottom: 4,
  },
  regionName: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  clearBtn: {
    width: 122,
    height: 46,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  clearUnderline: {
    marginTop: 2,
    alignSelf: 'center',
    width: 70,
    height: 2,
    backgroundColor: '#111',
    borderRadius: 1,
  },
  clearText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  searchBtn: {
    width: 122,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#f39c12',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  inputClear: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
