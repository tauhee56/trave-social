import React from 'react';
import { Image, Text, View } from 'react-native';

interface CustomMapMarkerProps {
  imageUrl?: string;
  imageUrls?: string[];
  userAvatar?: string;
  isLive?: boolean;
}

export const CustomMapMarker: React.FC<CustomMapMarkerProps> = ({ imageUrl, imageUrls, userAvatar, isLive }) => {
  // Fallback for image
  const fallbackImg = require('../../assets/images/react-logo.png');
  let markerImgSrc = fallbackImg;
  if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http') && imageUrl.trim() !== '') {
    markerImgSrc = { uri: imageUrl };
  } else if (imageUrls && imageUrls[0] && typeof imageUrls[0] === 'string' && imageUrls[0].startsWith('http') && imageUrls[0].trim() !== '') {
    markerImgSrc = { uri: imageUrls[0] };
  }
  return (
    <View style={{ width: 50, height: 50, borderRadius: 8, borderWidth: 2, borderColor: '#fff', overflow: 'hidden', backgroundColor: '#f0f0f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={markerImgSrc} style={{ width: 50, height: 50, borderRadius: 8 }} resizeMode="cover" />
      {isLive && (
        <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1, zIndex: 2, borderWidth: 1, borderColor: '#e0245e' }}>
          <Text style={{ color: '#e0245e', fontWeight: 'bold', fontSize: 10 }}>LIVE</Text>
        </View>
      )}
    </View>
  );
};
