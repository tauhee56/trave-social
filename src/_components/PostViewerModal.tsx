import React, { useState } from 'react';
import { Dimensions, Modal, View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Post {
  id: string;
  imageUrl?: string;
  imageUrls?: string[];
  caption?: string;
  userId: string;
  likes?: string[];
  savedBy?: string[];
  commentsCount?: number;
  comments?: any[];
}

interface Profile {
  avatar?: string;
  username?: string;
  name?: string;
}

interface AuthUser {
  uid?: string;
}

interface PostViewerModalProps {
  visible: boolean;
  onClose: () => void;
  posts: Post[];
  selectedPostIndex: number;
  profile: Profile | null;
  authUser: AuthUser | null;
  likedPosts: { [key: string]: boolean };
  onDeletePost?: (postId: string) => void;
}

export default function PostViewerModal(props: PostViewerModalProps) {
  const { visible, onClose, posts, selectedPostIndex, authUser, onDeletePost } = props;
  const [currentIndex, setCurrentIndex] = useState(selectedPostIndex ?? 0);

  React.useEffect(() => {
    if (visible && selectedPostIndex != null) setCurrentIndex(selectedPostIndex);
  }, [visible, selectedPostIndex]);

  if (!visible || !posts || posts.length === 0 || currentIndex == null) return null;
  const post = posts[currentIndex];
  if (!post) return null;

  const isOwnPost = authUser && (post.userId === authUser.uid);

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDeletePost && onDeletePost(post.id) }
      ]
    );
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };
  const goNext = () => {
    if (currentIndex < posts.length - 1) setCurrentIndex(currentIndex + 1);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={{ fontSize: 28, color: '#fff' }}>×</Text>
          </TouchableOpacity>
          {isOwnPost && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={{ color: '#fff', fontSize: 16 }}>Delete</Text>
            </TouchableOpacity>
          )}
          <Image
            source={{ uri: post.imageUrl || (post as any)?.mediaUrls?.[0] || post.imageUrls?.[0] || '' }}
            style={styles.image}
            resizeMode="contain"
          />
          {post.caption ? (
            <Text style={styles.caption}>{post.caption}</Text>
          ) : null}
          <View style={styles.navRow}>
            <TouchableOpacity onPress={goPrev} disabled={currentIndex === 0} style={[styles.navBtn, currentIndex === 0 && { opacity: 0.3 }]}> 
              <Text style={styles.navText}>{'‹'}</Text>
            </TouchableOpacity>
            <Text style={styles.navIndex}>{`${currentIndex + 1} / ${posts.length}`}</Text>
            <TouchableOpacity onPress={goNext} disabled={currentIndex === posts.length - 1} style={[styles.navBtn, currentIndex === posts.length - 1 && { opacity: 0.3 }]}> 
              <Text style={styles.navText}>{'›'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width, height } = Dimensions.get('window');
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: width,
    height: height * 0.6,
    marginBottom: 20,
  },
  caption: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 4,
  },
  deleteBtn: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,0,0,0.7)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  navBtn: {
    padding: 10,
  },
  navText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  navIndex: {
    color: '#fff',
    fontSize: 16,
    marginHorizontal: 8,
  },
});

