import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { TouchableOpacity } from "react-native";
import { useUser } from "./UserContext";

async function savePost(postId: string, userId: string) {
  const { db } = await import('../../config/firebase');
  const { doc, updateDoc, arrayUnion, setDoc } = await import('firebase/firestore');
  const postRef = doc(db, 'posts', postId);
  await updateDoc(postRef, { savedBy: arrayUnion(userId) });
  // Also add to user's saved collection
  const userSavedRef = doc(db, 'users', userId, 'saved', postId);
  await setDoc(userSavedRef, { savedAt: Date.now() });
}

async function unsavePost(postId: string, userId: string) {
  const { db } = await import('../../config/firebase');
  const { doc, updateDoc, arrayRemove, deleteDoc } = await import('firebase/firestore');
  const postRef = doc(db, 'posts', postId);
  await updateDoc(postRef, { savedBy: arrayRemove(userId) });
  // Also remove from user's saved collection
  const userSavedRef = doc(db, 'users', userId, 'saved', postId);
  await deleteDoc(userSavedRef);
}

export default function SaveButton({ post }: any) {
  const user = useUser();
  const [saved, setSaved] = useState(post.savedBy?.includes(user?.uid));
  React.useEffect(() => {
    setSaved(post.savedBy?.includes(user?.uid));
  }, [post.savedBy, user?.uid]);
  async function handleSave() {
    if (!user || !user.uid) {
      alert('User not logged in');
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