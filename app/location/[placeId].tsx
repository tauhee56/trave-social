import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PostCard from '../../src/_components/PostCard';
import StoriesViewer from '../../src/_components/StoriesViewer';
import VerifiedBadge from '../../src/_components/VerifiedBadge';
import { apiService } from '../_services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const DEFAULT_AVATAR_URL = 'https://via.placeholder.com/200x200.png?text=Profile';

type Post = {
  id: string;
  _id?: string;
  userId: string;
  userName: string;
  userAvatar: string;
  imageUrl: string;
  imageUrls?: string[];
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  caption: string;
  locationName?: string;
  location?: string | { name?: string };
  locationData?: {
    name?: string;
    address?: string;
    lat?: number;
    lon?: number;
    verified?: boolean;
    city?: string;
    country?: string;
    countryCode?: string;
    placeId?: string;
  };
  likes: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: any;
};

type Story = {
  id: string;
  _id?: string;
  userId: string;
  userName: string;
  userAvatar: string;
  imageUrl: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt: any;
  location?: string | { name?: string };
  locationData?: {
    name?: string;
    address?: string;
  };
  views?: string[];
  likes?: string[];
  comments?: any[];
};

type SubLocation = {
  name: string;
  count: number;
  thumbnail: string;
  posts: Post[];
};

export default function LocationDetailsScreen() {
  const { placeId, locationName, locationAddress } = useLocalSearchParams();
  const router = useRouter();
  const [placeDetails, setPlaceDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<Story[]>([]);
  const [subLocations, setSubLocations] = useState<SubLocation[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [selectedSubLocation, setSelectedSubLocation] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [totalVisits, setTotalVisits] = useState(0);
  const [verifiedVisits, setVerifiedVisits] = useState(0);
  const [mostLikedPostImage, setMostLikedPostImage] = useState<string>('');
  const [showStoriesViewer, setShowStoriesViewer] = useState(false);
  const [selectedStories, setSelectedStories] = useState<Story[]>([]);

  const onStoryPress = (stories: Story[], initialIndex: number) => {
    setSelectedStories(stories);
    setShowStoriesViewer(true);
  };

  // Load current user when component mounts
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
          setCurrentUser({ uid: userId, id: userId });
          console.log('[Location] Current user loaded:', userId);
        }
      } catch (error) {
        console.log('[Location] Failed to load current user:', error);
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    async function fetchDetails() {
      setLoading(true);
      try {
        // Use the location data passed from navigation params
        // This avoids CORS issues with Google Places Details API
        const placeDetails = {
          name: locationName as string,
          formatted_address: locationAddress as string || locationName as string,
        };
        setPlaceDetails(placeDetails);

        // Fetch posts from Firebase that match this location
        await fetchLocationPosts(locationName as string);

        // Fetch stories from Firebase that match this location
        await fetchLocationStories(locationName as string);
      } catch (e) {
        console.error('Error fetching location details:', e);
        setPlaceDetails(null);
      }
      setLoading(false);
    }
    if (locationName) fetchDetails();
  }, [placeId, locationName, locationAddress]);

  const extractSubLocationName = (locationName: string, locationAddress: string): string => {
    // Extract city/area name from location
    // If locationName is already a city (short name), use it
    // Otherwise, extract from address

    if (locationName && locationName.length < 30 && !locationName.includes(',')) {
      return locationName;
    }

    // Try to extract city from address
    const addressParts = locationAddress.split(',').map(p => p.trim());
    if (addressParts.length > 0) {
      // Return first part (usually city)
      return addressParts[0];
    }

    return locationName;
  };

  const fetchLocationPosts = async (searchLocationName: string) => {
    try {
      const viewerId = await AsyncStorage.getItem('userId');

      let metaHasVerifiedVisits = false;

      const all: any[] = [];
      const pageSize = 50;
      const maxPages = 5;

      for (let page = 0; page < maxPages; page++) {
        const skip = page * pageSize;
        const response = await apiService.getPostsByLocation(searchLocationName, skip, pageSize, viewerId || undefined);
        const next = response?.success && Array.isArray(response?.data) ? response.data : [];
        all.push(...next);
        if (next.length < pageSize) break;
      }

      // Normalize posts to ensure they have an 'id' field
      const locationPosts = all.map((post: any) => ({
        ...post,
        id: post.id || post._id,
      }));

      console.log(`[Location] Found ${locationPosts.length} posts for "${searchLocationName}"`);
      
      setAllPosts(locationPosts);
      setFilteredPosts(locationPosts);

      try {
        const metaRes = await apiService.getLocationMeta(searchLocationName, viewerId || undefined);
        const meta = metaRes?.success ? metaRes?.data : null;
        if (meta && typeof meta === 'object') {
          if (typeof meta.visits === 'number') setTotalVisits(meta.visits);
          else if (typeof meta.postCount === 'number') setTotalVisits(meta.postCount);
          if (typeof meta.verifiedVisits === 'number') {
            metaHasVerifiedVisits = true;
            setVerifiedVisits(meta.verifiedVisits);
          }
        } else {
          setTotalVisits(locationPosts.length);
        }
      } catch {
        setTotalVisits(locationPosts.length);
      }
      
      // Extract sub-locations from posts
      const subLocationMap = new Map<string, any[]>();
      locationPosts.forEach((post: Post) => {
        const locStr =
          post?.locationData?.name ||
          post?.locationName ||
          (typeof post?.location === 'string' ? post.location : post?.location?.name) ||
          '';
        const subLocName = extractSubLocationName(
          locStr,
          post?.locationData?.address || ''
        );
        if (!subLocationMap.has(subLocName)) {
          subLocationMap.set(subLocName, []);
        }
        subLocationMap.get(subLocName)?.push(post);
      });
      
      const subLocations = Array.from(subLocationMap.entries()).map(([name, posts]) => ({
        name,
        count: posts.length,
        thumbnail: posts[0]?.imageUrl || 'https://via.placeholder.com/60',
        posts
      }));
      
      setSubLocations(subLocations);
      
      // Count verified visits (if meta not available)
      if (!metaHasVerifiedVisits) {
        const verifiedCount = locationPosts.filter((p: any) => p?.locationData?.verified).length;
        setVerifiedVisits(verifiedCount);
      }
      
      // Set most liked post image for header
      if (locationPosts.length > 0) {
        const mostLiked = locationPosts.reduce((prev: any, curr: any) => 
          (curr.likesCount || 0) > (prev.likesCount || 0) ? curr : prev
        );
        if (mostLiked?.imageUrl) {
          setMostLikedPostImage(mostLiked.imageUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching location posts:', error);
      setAllPosts([]);
      setFilteredPosts([]);
    }
  };

  const fetchLocationStories = async (searchLocationName: string) => {
    try {
      // Fetch stories from AsyncStorage or backend if available
      // For now, we'll attempt to fetch from a stories endpoint if it exists
      const response = await apiService.get('/stories?skip=0&limit=100');
      
      if (response.success && response.data) {
        // Normalize stories to ensure they have an 'id' field
        const normalizedStories = response.data.map((story: any) => ({
          ...story,
          id: story.id || story._id,
        }));

        const locationStories = normalizedStories.filter((story: any) => {
          const storyLocation = 
            story?.locationData?.name || 
            story?.location || 
            '';
          
          return storyLocation.toLowerCase().includes(searchLocationName.toLowerCase());
        });
        
        console.log(`[Location] Found ${locationStories.length} stories for "${searchLocationName}"`);
        setStories(locationStories);
      } else {
        setStories([]);
      }
    } catch (error) {
      console.log('Stories endpoint not available or no stories:', error);
      setStories([]);
    }
  };

  const handleSubLocationFilter = (subLocationName: string) => {
    if (selectedSubLocation === subLocationName) {
      // Deselect - show all posts
      setSelectedSubLocation(null);
      setFilteredPosts(allPosts);
    } else {
      // Select - filter posts
      setSelectedSubLocation(subLocationName);
      const subLocation = subLocations.find(sl => sl.name === subLocationName);
      if (subLocation) {
        setFilteredPosts(subLocation.posts);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#f39c12" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!placeDetails) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <Text style={{ margin: 24, fontSize: 16, color: '#666' }}>No details found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id || item._id || `post-${Math.random()}`}
        ListHeaderComponent={
          <>
            {/* Location Header Card */}
            <View style={styles.locationHeaderCard}>
              <Image
                source={{ uri: mostLikedPostImage || 'https://via.placeholder.com/60' }}
                style={styles.locationImage}
              />
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationName}>{placeDetails.name}</Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {placeDetails.formatted_address}
                </Text>
                <View style={styles.visitsRow}>
                  <Ionicons name="location" size={13} color="#666" />
                  <Text style={styles.visitsText}>{totalVisits} Visits</Text>
                  {verifiedVisits > 0 && (
                    <>
                      <View style={{ marginLeft: 8 }}><VerifiedBadge size={13} color="#000" /></View>
                      <Text style={styles.verifiedText}>{verifiedVisits} Verified visits</Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* Stories/People Section - Horizontal scroll with avatars */}
            {stories.length > 0 && (
              <View style={styles.storiesSection}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.storiesScroll}
                >
                  {stories.map((story, index) => (
                    <TouchableOpacity
                      key={story.id || story._id || `story-${index}`}
                      style={styles.storyCard}
                      onPress={() => onStoryPress && onStoryPress(stories, index)}
                    >
                      <View style={styles.storyImageWrapper}>
                        <Image
                          source={{ uri: story.userAvatar || story.imageUrl }}
                          style={styles.storyAvatar}
                        />
                      </View>
                      <Text style={styles.storyUserName} numberOfLines={1}>
                        {story.userName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Sub Locations Section - Square cards with images */}
            {subLocations.length > 0 && (
              <View style={styles.subLocationsSection}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.subLocationsScroll}
                >
                  {subLocations.map((subLoc) => (
                    <TouchableOpacity
                      key={subLoc.name}
                      style={[
                        styles.subLocationCard,
                        selectedSubLocation === subLoc.name && styles.subLocationCardSelected
                      ]}
                      onPress={() => handleSubLocationFilter(subLoc.name)}
                    >
                      <Image
                        source={{ uri: subLoc.thumbnail || 'https://via.placeholder.com/100' }}
                        style={styles.subLocationImage}
                      />
                      <Text style={styles.subLocationName} numberOfLines={1}>
                        {subLoc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Current Location Header for Feed */}
            <View style={styles.feedLocationHeader}>
              <Ionicons name="location-outline" size={16} color="#000" />
              <View style={styles.feedLocationInfo}>
                <Text style={styles.feedLocationName}>{selectedSubLocation || placeDetails.name}</Text>
                <Text style={styles.feedLocationVisits}>{selectedSubLocation ? subLocations.find(s => s.name === selectedSubLocation)?.count || filteredPosts.length : totalVisits} Visits</Text>
              </View>
              <Image
                source={{ uri: mostLikedPostImage || DEFAULT_AVATAR_URL }}
                style={styles.feedLocationAvatar}
              />
            </View>
          </>
        }
        renderItem={({ item }) => (
          <PostCard post={item} currentUser={currentUser} showMenu={true} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="map-pin" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No posts from this location</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Stories Viewer Modal */}
      {showStoriesViewer && selectedStories.length > 0 && (
        <Modal
          visible={showStoriesViewer}
          transparent={false}
          animationType="fade"
          onRequestClose={() => setShowStoriesViewer(false)}
        >
          <StoriesViewer
            stories={selectedStories}
            onClose={() => setShowStoriesViewer(false)}
          />
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Location Header Card
  locationHeaderCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  locationImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  locationTextContainer: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    lineHeight: 16,
  },
  visitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visitsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#f39c12',
    marginLeft: 4,
  },

  // Stories Section - Avatar style
  storiesSection: {
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  storiesScroll: {
    paddingHorizontal: 16,
  },
  storyCard: {
    width: 60,
    marginRight: 12,
    alignItems: 'center',
  },
  storyImageWrapper: {
    width: 50,
    height: 50,
    borderRadius: 10,
    padding: 2,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#f39c12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  storyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  storyUserName: {
    fontSize: 10,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    width: 60,
  },

  // Sub Locations Section - Square cards
  subLocationsSection: {
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  subLocationsScroll: {
    paddingHorizontal: 16,
  },
  subLocationCard: {
    width: 70,
    marginRight: 10,
    alignItems: 'center',
  },
  subLocationCardSelected: {
    opacity: 0.8,
  },
  subLocationImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    marginBottom: 4,
  },
  subLocationName: {
    fontSize: 10,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    width: 70,
  },

  // Feed Location Header
  feedLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#eee',
  },
  feedLocationInfo: {
    flex: 1,
    marginLeft: 8,
  },
  feedLocationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  feedLocationVisits: {
    fontSize: 12,
    color: '#666',
  },
  feedLocationAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});
