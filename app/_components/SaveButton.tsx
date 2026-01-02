import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { TouchableOpacity, Alert } from "react-native";
import { useUser } from "./UserContext";
import { apiService } from "../_services/apiService";

async function savePost(postId: string, userId: string) {
  try {
    await apiService.post(`/users/${userId}/saved`, { postId });
    return { success: true };
  } catch (error: any) {
    console.error('Error saving post:', error);
    return { success: false, error: error.message };
  }
}

async function unsavePost(postId: string, userId: string) {
  try {
    await apiService.delete(`/users/${userId}/saved/${postId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error unsaving post:', error);
    return { success: false, error: error.message };
  }
}

export default function SaveButton({ post, currentUser }: any) {
  const user = useUser();
  // Use currentUser prop if provided, otherwise fall back to context
  const userForSave = currentUser || user;
  const userId = typeof userForSave === 'string' ? userForSave : (userForSave?.uid || userForSave?.id || userForSave?.userId);
  const [saved, setSaved] = useState(post.savedBy?.includes(userId));
  React.useEffect(() => {
    setSaved(post.savedBy?.includes(userId));
  }, [post.savedBy, userId]);
  async function handleSave() {
    if (!userId) {
      console.log('[SaveButton] ERROR - userId not found. currentUser:', currentUser, 'user:', user);
      Alert.alert('Error', 'User not logged in');
      return;
    }
    console.log('[SaveButton] Saving post. userId:', userId, 'postId:', post.id);
    if (saved) {
      await unsavePost(post.id, userId);
      setSaved(false);
    } else {
      await savePost(post.id, userId);
      setSaved(true);
    }
  }
  return (
    <TouchableOpacity onPress={handleSave} style={{ marginLeft: 8 }}>
      <MaterialCommunityIcons name={saved ? "bookmark" : "bookmark-outline"} size={24} color={saved ? "#007aff" : "#222"} />
    </TouchableOpacity>
  );
}