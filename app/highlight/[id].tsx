import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HighlightScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = (params.id as string) || 'unknown';

  // sample images for highlight
  const images = [
    'https://images.unsplash.com/photo-1505765051845-1e5a1f8d3f3d?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=',
    'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=',
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=',
    'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=',
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#111" />
        </TouchableOpacity>
        <Text style={styles.title}>{id.charAt(0).toUpperCase() + id.slice(1)}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={images}
        numColumns={3}
        keyExtractor={(i) => i}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.gridImage} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 12, flexDirection: 'row', alignItems: 'center' },
  title: { fontWeight: '700', fontSize: 16, marginLeft: 12 },
  gridImage: { width: width / 3, height: width / 3, backgroundColor: '#eee' },
});
