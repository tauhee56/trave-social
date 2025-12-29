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

export default function SaveButton({ post }: any) {
  const user = useUser();
  const [saved, setSaved] = useState(post.savedBy?.includes(user?.uid));
  React.useEffect(() => {
    setSaved(post.savedBy?.includes(user?.uid));
  }, [post.savedBy, user?.uid]);
  async function handleSave() {
    if (!user || !user.uid) {
      Alert.alert('Error', 'User not logged in');
      return;
    }
    if (saved) {
      await unsavePost(post.id, user.uid);
      setSaved(false);
    } else {
      await savePost(post.id, user.uid);
      setSaved(true);
    }
  }
  return (
    <TouchableOpacity onPress={handleSave} style={{ marginLeft: 8 }}>
      <MaterialCommunityIcons name={saved ? "bookmark" : "bookmark-outline"} size={24} color={saved ? "#007aff" : "#222"} />
    </TouchableOpacity>
  );
}