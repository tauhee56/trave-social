import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert } from 'react-native';

interface CreateHighlightModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onSuccess?: () => void;
}

export default function CreateHighlightModal({ visible, onClose, userId, onSuccess }: CreateHighlightModalProps) {
  const [name, setName] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setCoverImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a highlight name');
      return;
    }
    // ...existing code...
  };

  // ...existing code...
}
