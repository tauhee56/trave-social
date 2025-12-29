import { Feather, Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db, doc } from '../lib/firebaseCompatibility';
import { followUser, unfollowUser } from '../lib/firebaseHelpers/follow';
import { useUser } from './_components/UserContext';

const DEFAULT_AVATAR = 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/default/default-pic.jpg';

type UserItem = {
  uid: string;
  name: string;
  username?: string;
  avatar: string;
  isFollowing?: boolean;
  isFollowingYou?: boolean;
};

type TabType = 'followers' | 'following' | 'friends' | 'blocked';

export default function FriendsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const authUser = useUser();
  
  // Get userId and tab from params
  const userId = typeof params.userId === 'string' ? params.userId : authUser?.uid;
  const initialTab = typeof params.tab === 'string' ? params.tab as TabType : 'followers';
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [followers, setFollowers] = useState<UserItem[]>([]);
  const [following, setFollowing] = useState<UserItem[]>([]);
  const [friends, setFriends] = useState<UserItem[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [followLoadingIds, setFollowLoadingIds] = useState<Set<string>>(new Set());
  const [profileName, setProfileName] = useState('');
  
  const isOwnProfile = userId === authUser?.uid;

  useEffect(() => {
    fetchAllData();
  }, [userId, authUser?.uid]);

  const fetchAllData = async () => {
    if (!userId) return;
    setLoading(true);
    
    try {
      // TODO: Implement backend API for fetching user's followers/following/friends/blocked
      // For now, return empty lists
      // const response = await fetch(`/api/users/${userId}/friends`);
      // const data = await response.json();
      // setFollowers(data.followers);
      // setFollowing(data.following);
      // setFriends(data.friends);
      // setBlockedUsers(isOwnProfile ? data.blocked : []);
      
      setFollowers([]);
      setFollowing([]);
      setFriends([]);
      setBlockedUsers([]);
      setProfileName('User');
      
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    
    setLoading(false);
  };

  const handleFollowToggle = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    if (!authUser?.uid || targetUserId === authUser.uid) return;
    
    setFollowLoadingIds(prev => new Set(prev).add(targetUserId));
    
    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(authUser.uid, targetUserId);
      } else {
        await followUser(authUser.uid, targetUserId);
      }
      
      // Update local state
      const updateUserList = (list: UserItem[]) => 
        list.map(u => u.uid === targetUserId ? { ...u, isFollowing: !isCurrentlyFollowing } : u);
      
      setFollowers(updateUserList);
      setFollowing(updateUserList);
      setFriends(prev => {
        if (isCurrentlyFollowing) {
          // Removing from friends
          return prev.filter(u => u.uid !== targetUserId);
        } else {
          // Check if should add to friends (mutual follow)
          const targetInFollowers = followers.find(f => f.uid === targetUserId);
          if (targetInFollowers) {
            return [...prev, { ...targetInFollowers, isFollowing: true, isFollowingYou: true }];
          }
          return prev;
        }
      });
      
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
    
    setFollowLoadingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(targetUserId);
      return newSet;
    });
  };

  const handleUnblock = async (targetUserId: string) => {
    if (!authUser?.uid) return;
    
    Alert.alert(
      'Unblock User',
      'You will start seeing content from this user again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              const { deleteDoc } = await import('firebase/firestore');
              await deleteDoc(doc(db, 'users', authUser.uid, 'blocked', targetUserId) as any);
              setBlockedUsers(prev => prev.filter(u => u.uid !== targetUserId));
              Alert.alert('Success', 'User unblocked');
            } catch (e) {
              Alert.alert('Error', 'Failed to unblock user');
            }
          }
        }
      ]
    );
  };

  const handleRemoveFollower = async (targetUserId: string) => {
    if (!authUser?.uid || !isOwnProfile) return;
    
    Alert.alert(
      'Remove Follower',
      'This person will be removed from your followers. They won\'t be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from your followers (unfollow them from you)
              await unfollowUser(targetUserId, authUser.uid);
              setFollowers(prev => prev.filter(u => u.uid !== targetUserId));
              // Update friends list
              setFriends(prev => prev.filter(u => u.uid !== targetUserId));
              Alert.alert('Success', 'Follower removed');
            } catch (e) {
              Alert.alert('Error', 'Failed to remove follower');
            }
          }
        }
      ]
    );
  };

  const getFilteredData = () => {
    let data: UserItem[] = [];
    switch (activeTab) {
      case 'followers':
        data = followers;
        break;
      case 'following':
        data = following;
        break;
      case 'friends':
        data = friends;
        break;
      case 'blocked':
        data = blockedUsers;
        break;
    }
    
    if (!searchQuery.trim()) return data;
    
    const query = searchQuery.toLowerCase();
    return data.filter(u => 
      u.name.toLowerCase().includes(query) || 
      (u.username && u.username.toLowerCase().includes(query))
    );
  };

  const renderUserItem = ({ item }: { item: UserItem }) => {
    const isMe = item.uid === authUser?.uid;
    const isFollowLoading = followLoadingIds.has(item.uid);
    
    return (
      <TouchableOpacity 
        style={styles.userItem}
        onPress={() => router.push(`/user-profile?id=${item.uid}`)}
        activeOpacity={0.7}
      >
        <ExpoImage
          source={{ uri: item.avatar }}
          style={styles.avatar}
          contentFit="cover"
          transition={200}
        />
        
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
          {item.username && (
            <Text style={styles.userHandle} numberOfLines={1}>@{item.username}</Text>
          )}
          {activeTab === 'followers' && item.isFollowingYou && item.isFollowing && (
            <Text style={styles.mutualBadge}>Friends</Text>
          )}
        </View>
        
        {!isMe && activeTab !== 'blocked' && (
          <TouchableOpacity
            style={[
              styles.followBtn,
              item.isFollowing ? styles.followingBtn : styles.followBtnPrimary
            ]}
            onPress={() => handleFollowToggle(item.uid, !!item.isFollowing)}
            disabled={isFollowLoading}
          >
            {isFollowLoading ? (
              <ActivityIndicator size="small" color={item.isFollowing ? '#000' : '#fff'} />
            ) : (
              <Text style={[
                styles.followBtnText,
                item.isFollowing && styles.followingBtnText
              ]}>
                {item.isFollowing ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        )}
        
        {activeTab === 'blocked' && (
          <TouchableOpacity
            style={styles.unblockBtn}
            onPress={() => handleUnblock(item.uid)}
          >
            <Text style={styles.unblockBtnText}>Unblock</Text>
          </TouchableOpacity>
        )}
        
        {activeTab === 'followers' && isOwnProfile && !isMe && (
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => handleRemoveFollower(item.uid)}
          >
            <Feather name="x" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const messages: Record<TabType, { icon: string; title: string; subtitle: string }> = {
      followers: {
        icon: 'people-outline',
        title: 'No Followers Yet',
        subtitle: isOwnProfile ? 'Share your profile to get followers!' : 'This user has no followers yet.',
      },
      following: {
        icon: 'person-add-outline',
        title: 'Not Following Anyone',
        subtitle: isOwnProfile ? 'Find people to follow!' : 'This user isn\'t following anyone yet.',
      },
      friends: {
        icon: 'heart-outline',
        title: 'No Friends Yet',
        subtitle: 'Friends are people who follow each other.',
      },
      blocked: {
        icon: 'ban-outline',
        title: 'No Blocked Users',
        subtitle: 'When you block someone, they\'ll appear here.',
      },
    };
    
    const msg = messages[activeTab];
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={msg.icon as any} size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>{msg.title}</Text>
        <Text style={styles.emptySubtitle}>{msg.subtitle}</Text>
      </View>
    );
  };

  const filteredData = getFilteredData();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{profileName}</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
            {followers.length} Followers
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
            {following.length} Following
          </Text>
        </TouchableOpacity>
        
        {isOwnProfile && (
          <>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
              onPress={() => setActiveTab('friends')}
            >
              <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
                {friends.length} Friends
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'blocked' && styles.activeTab]}
              onPress={() => setActiveTab('blocked')}
            >
              <Text style={[styles.tabText, activeTab === 'blocked' && styles.activeTabText]}>
                Blocked
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      
      {/* Search */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f39c12" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.uid}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#f0f0f0',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  userHandle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  mutualBadge: {
    fontSize: 11,
    color: '#f39c12',
    marginTop: 2,
    fontWeight: '500',
  },
  followBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  followBtnPrimary: {
    backgroundColor: '#0095f6',
  },
  followingBtn: {
    backgroundColor: '#f0f0f0',
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  followingBtnText: {
    color: '#000',
  },
  unblockBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  unblockBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0095f6',
  },
  removeBtn: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});