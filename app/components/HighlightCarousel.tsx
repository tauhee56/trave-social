import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type Highlight = {
  id: string;
  title: string;
  coverImage: string;
  stories: Array<{ id: string; image: string; }>; // Minimal story type
};

interface HighlightCarouselProps {
  highlights: Highlight[];
  onPressHighlight?: (highlight: Highlight) => void;
}

const HighlightCarousel: React.FC<HighlightCarouselProps> = ({ highlights, onPressHighlight }) => {
  return (
    <View style={styles.container}>
      <FlatList
        data={highlights}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.highlightBubble} onPress={() => onPressHighlight?.(item)}>
            <Image source={{ uri: item.coverImage }} style={styles.coverImage} />
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  highlightBubble: {
    alignItems: 'center',
    marginRight: 16,
    width: 64,
  },
  coverImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#eee',
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    color: '#222',
    textAlign: 'center',
    maxWidth: 56,
  },
});

export default HighlightCarousel;
