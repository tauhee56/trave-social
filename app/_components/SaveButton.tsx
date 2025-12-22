import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { TouchableOpacity, Alert } from "react-native";
import { useUser } from "./UserContext";

async function savePost(postId: string, userId: string) {
  // TODO: Implement backend API to save post
  // const response = await fetch(`/api/users/${userId}/saved`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ postId })
  // });
  console.log('Post saved:', postId);
}

async function unsavePost(postId: string, userId: string) {
  // TODO: Implement backend API to unsave post
  // const response = await fetch(`/api/users/${userId}/saved/${postId}`, {
  //   method: 'DELETE'
  // });
  console.log('Post unsaved:', postId);
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