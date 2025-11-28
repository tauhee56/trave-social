import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const GOOGLE_MAP_API_KEY = 'AIzaSyCYpwO1yUux1cHtd2bs-huu1hNKv1kC18c';

export default function LocationDetailsScreen() {
  const { placeId } = useLocalSearchParams();
  const [placeDetails, setPlaceDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<any[]>([]);
  const [popularPlaces, setPopularPlaces] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDetails() {
      setLoading(true);
      try {
        // Fetch place details
        const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAP_API_KEY}`);
        const data = await res.json();
        setPlaceDetails(data.result);

        // Fetch popular places (sub-locations)
        if (data.result?.geometry?.location) {
          const { lat, lng } = data.result.geometry.location;
          // Try with larger radius and broader type
          const nearbyRes = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=point_of_interest&key=${GOOGLE_MAP_API_KEY}`);
          const nearbyData = await nearbyRes.json();
          console.log('Nearby Search API response:', nearbyData);
          setPopularPlaces(nearbyData.results || []);
        } else {
          console.log('No geometry/location found in Place Details API response:', data.result);
        }

        // Fetch stories and posts from backend (mocked for now)
        // TODO: Replace with real API calls
        setStories([
          { id: '1', user: 'Ali', avatar: 'https://randomuser.me/api/portraits/men/1.jpg', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb', },
          { id: '2', user: 'Sara', avatar: 'https://randomuser.me/api/portraits/women/2.jpg', image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca', },
        ]);
        setPosts([
          { id: 'p1', user: 'Tokio', avatar: 'https://randomuser.me/api/portraits/men/3.jpg', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb', caption: 'I have filmed a small vlog...', likes: 23046, comments: 1012 },
          { id: 'p2', user: 'Sara', avatar: 'https://randomuser.me/api/portraits/women/2.jpg', image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca', caption: 'Excited to post on YouTube...', likes: 236384, comments: 1012 },
        ]);
      } catch (e) {
        setPlaceDetails(null);
      }
      setLoading(false);
    }
    if (placeId) fetchDetails();
  }, [placeId]);

  if (loading) return <ActivityIndicator size="large" color="#f39c12" style={{ marginTop: 40 }} />;
  if (!placeDetails) return <Text style={{ margin: 24 }}>No details found.</Text>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      <ScrollView style={styles.container}>
      {/* Top location info card */}
      <View style={styles.locationCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationTitle}>{placeDetails.name}</Text>
            <Text style={styles.locationSubtitle}>{placeDetails.formatted_address}</Text>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <Text style={styles.locationStat}>784,731 Visits</Text>
              <Text style={styles.locationStatSep}>·</Text>
              <Text style={styles.locationStat}>13,730 Verified visits</Text>
            </View>
          </View>
          <View style={styles.locationAvatarWrap}>
            <View style={styles.locationAvatarCircle}>
              <Text style={{ fontWeight: '700', fontSize: 18, color: '#fff' }}>{placeDetails.name[0]}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Stories row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesRow}>
        {stories.map(story => (
          <View key={story.id} style={styles.storyCard}>
            <View style={styles.storyThumbWrap}>
              <Image source={{ uri: story.image }} style={styles.storyThumbImg} />
              <Image source={{ uri: story.avatar }} style={styles.storyAvatarImg} />
            </View>
            <Text style={styles.storyUser}>{story.user}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Popular places/sub-locations */}
      <View style={styles.popularPlacesSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {popularPlaces.length > 0 ? popularPlaces.map(place => (
            <View key={place.place_id} style={styles.popularPlaceCard}>
              {place.photos && place.photos[0] ? (
                <Image
                  source={{ uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=120&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_MAP_API_KEY}` }}
                  style={styles.popularPlaceImg}
                />
              ) : (
                <View style={styles.popularPlaceImgPlaceholder} />
              )}
              <Text style={styles.popularPlaceName}>{place.name}</Text>
            </View>
          )) : (
            <Text style={styles.noPopularPlaces}>No popular places found nearby.</Text>
          )}
        </ScrollView>
      </View>

      {/* Posts feed */}
      <View style={styles.postsSection}>
        {posts.map(post => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Image source={{ uri: post.avatar }} style={styles.postAvatarImg} />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.postUser}>{post.user}</Text>
                <Text style={styles.postLocation}>{placeDetails.name}, {placeDetails.formatted_address}</Text>
              </View>
            </View>
            <Image source={{ uri: post.image }} style={styles.postImg} />
            <View style={styles.postActionsRow}>
              <Text style={styles.postLikes}>{post.likes.toLocaleString()} likes</Text>
              <Text style={styles.postComments}>View all {post.comments} comments</Text>
            </View>
            <Text style={styles.postCaption}>{post.caption}</Text>
            <View style={styles.postAddCommentRow}>
              <Image source={{ uri: post.avatar }} style={styles.postAddCommentAvatar} />
              <Text style={styles.postAddCommentText}>Add a comment...</Text>
            </View>
          </View>
        ))}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 0 },
  locationCard: { backgroundColor: '#fff', borderRadius: 18, margin: 16, padding: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  locationTitle: { fontSize: 22, fontWeight: '700', color: '#222', marginBottom: 2 },
  locationSubtitle: { fontSize: 15, color: '#666', marginBottom: 8 },
  locationStat: { fontSize: 13, color: '#333', fontWeight: '500' },
  locationStatSep: { fontSize: 16, color: '#bbb', marginHorizontal: 8 },
  locationAvatarWrap: { marginLeft: 12 },
  locationAvatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f39c12', alignItems: 'center', justifyContent: 'center' },
  storiesRow: { marginLeft: 16, marginTop: 0, marginBottom: 8, minHeight: 90 },
  storyCard: { alignItems: 'center', marginRight: 18, width: 70 },
  storyThumbWrap: { position: 'relative', width: 54, height: 54, marginBottom: 4 },
  storyThumbImg: { width: 54, height: 54, borderRadius: 16 },
  storyAvatarImg: { position: 'absolute', bottom: -6, left: 16, width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#fff' },
  storyUser: { fontSize: 12, color: '#333', fontWeight: '500', marginTop: 2, textAlign: 'center' },
  popularPlacesSection: { marginLeft: 16, marginTop: 8, marginBottom: 8, minHeight: 120 },
  popularPlaceCard: { backgroundColor: '#fff', borderRadius: 12, padding: 8, marginRight: 14, minWidth: 120, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  popularPlaceImg: { width: 100, height: 60, borderRadius: 8, marginBottom: 6 },
  popularPlaceImgPlaceholder: { width: 100, height: 60, borderRadius: 8, backgroundColor: '#eee', marginBottom: 6 },
  popularPlaceName: { fontSize: 13, fontWeight: '600', color: '#222', textAlign: 'center' },
  noPopularPlaces: { fontSize: 13, color: '#888', marginTop: 24 },
  postsSection: { marginHorizontal: 0, marginTop: 8, paddingHorizontal: 0 },
  postCard: { backgroundColor: '#fff', borderRadius: 18, marginHorizontal: 16, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, paddingBottom: 10 },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  postAvatarImg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' },
  postUser: { fontWeight: '700', fontSize: 15, color: '#222' },
  postLocation: { fontSize: 12, color: '#888' },
  postImg: { width: '100%', height: 220, backgroundColor: '#eee', borderRadius: 0, marginBottom: 8 },
  postActionsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 18 },
  postLikes: { fontWeight: '700', fontSize: 14, color: '#222' },
  postComments: { fontSize: 13, color: '#666' },
  postCaption: { fontSize: 14, color: '#222', marginHorizontal: 12, marginBottom: 4, marginTop: 2 },
  postAddCommentRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  postAddCommentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#eee', marginRight: 8 },
  postAddCommentText: { color: '#888', fontSize: 13 },
});
