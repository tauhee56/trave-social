import React from 'react';
import { View } from 'react-native';

interface CustomMapMarkerProps {
  imageUrl?: string;
  imageUrls?: string[];
  userAvatar?: string;
  isLive?: boolean;
}

const DEFAULT_AVATAR = 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/default/default-pic.jpg';

const CustomMapMarker: React.FC<CustomMapMarkerProps> = ({ imageUrl, imageUrls, userAvatar, isLive }) => {
  // Get post image
  const postImage = imageUrl || imageUrls?.[0] || DEFAULT_AVATAR;
  const avatarImage = userAvatar || DEFAULT_AVATAR;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* Post Image - Main marker */}
    </View>
  );
};

export default CustomMapMarker;
