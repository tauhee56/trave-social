import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getHighlightStories } from '../../lib/firebaseHelpers/index';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HighlightViewerProps {
  visible: boolean;
  highlightId: string | null;
  onClose: () => void;
}


const HighlightViewer: React.FC<HighlightViewerProps> = ({ visible, highlightId, onClose }) => {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (highlightId && visible) {
      setLoading(true);
      getHighlightStories(highlightId).then(res => {
        if (res.success) {
          setStories(res.stories || []);
        } else {
          setStories([]);
        }
        setLoading(false);
        setCurrentIndex(0);
      });
    }
  }, [highlightId, visible]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={{ color: '#fff', fontSize: 22 }}>×</Text>
        </TouchableOpacity>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : stories.length === 0 ? (
          <Text style={styles.loadingText}>No stories</Text>
        ) : (
          <View style={styles.storyContainer}>
            <Image
              source={{ uri: stories[currentIndex].imageUrl || stories[currentIndex].videoUrl }}
              style={styles.storyImage}
              resizeMode="cover"
            />
            {/* Progress bar */}
            <View style={styles.progressBarContainer}>
              {stories.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.progressBar, idx <= currentIndex ? styles.progressBarActive : null]}
                />
              ))}
            </View>
            {/* Navigation */}
            <View style={styles.navContainer}>
              <TouchableOpacity style={styles.navBtn} onPress={handlePrev} disabled={currentIndex === 0} />
              <TouchableOpacity style={styles.navBtn} onPress={handleNext} />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.98)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 80,
    textAlign: 'center',
  },
  storyContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
    borderRadius: 12,
    backgroundColor: '#222',
  },
  progressBarContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 4,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: '#555',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  progressBarActive: {
    backgroundColor: '#fff',
  },
  navContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtn: {
    width: SCREEN_WIDTH * 0.3,
    height: '100%',
  },
});

export default HighlightViewer;
