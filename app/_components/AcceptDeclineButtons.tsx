import React, { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { db } from '../../config/firebase';

interface AcceptDeclineButtonsProps {
  item: any;
  onActionTaken?: (id: string) => void;
}

const AcceptDeclineButtons: React.FC<AcceptDeclineButtonsProps> = ({ item, onActionTaken }) => {
  const [actionTaken, setActionTaken] = useState(false);
  // Helper to mark notification as read
  const markNotificationRead = async () => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { getCurrentUser } = await import('../../lib/firebaseHelpers');
      const user = getCurrentUser();
      if (!user) return;
      await updateDoc(doc(db, 'users', user.uid, 'notifications', item.id), { read: true });
    } catch {}
  };

  return (
    <>
      <TouchableOpacity
        style={{
          backgroundColor: '#007aff',
          paddingVertical: 6,
          paddingHorizontal: 18,
          borderRadius: 8,
          marginRight: 8,
          opacity: actionTaken ? 0.5 : 1,
        }}
        disabled={actionTaken}
        onPress={async () => {
          setActionTaken(true);
          try {
            const { updateDoc, doc, getDoc, deleteDoc } = await import('firebase/firestore');
            const { getCurrentUser, addNotification } = await import('../../lib/firebaseHelpers');
            const user = getCurrentUser();
            if (!user) return;

            // Add requester to followers (private user)
            const userRef = doc(db, 'users', user.uid);
            const requesterRef = doc(db, 'users', item.senderId);

            // Get both user docs
            const [userSnap, requesterSnap] = await Promise.all([
              getDoc(userRef),
              getDoc(requesterRef)
            ]);
            if (!userSnap.exists() || !requesterSnap.exists()) return;

            const userData = userSnap.data();
            const requesterData = requesterSnap.data();

            // Prevent duplicate followers
            const alreadyFollower = Array.isArray(userData.followers) && userData.followers.includes(item.senderId);
            const newFollowers = alreadyFollower
              ? userData.followers
              : Array.isArray(userData.followers)
                ? [...userData.followers, item.senderId]
                : [item.senderId];

            // Prevent duplicate approvedFollowers
            const alreadyApproved = Array.isArray(userData.approvedFollowers) && userData.approvedFollowers.includes(item.senderId);
            const newApprovedFollowers = alreadyApproved
              ? userData.approvedFollowers
              : Array.isArray(userData.approvedFollowers)
                ? [...userData.approvedFollowers, item.senderId]
                : [item.senderId];

            await updateDoc(userRef, {
              followers: newFollowers,
              followersCount: alreadyFollower
                ? userData.followersCount || 0
                : (userData.followersCount || 0) + 1,
              approvedFollowers: newApprovedFollowers,
            });
            // Debug log: print updated arrays
            console.log('[DEBUG] AcceptDeclineButtons: Updated userRef', {
              followers: newFollowers,
              approvedFollowers: newApprovedFollowers,
              followersCount: alreadyFollower
                ? userData.followersCount || 0
                : (userData.followersCount || 0) + 1,
            });

            // Prevent duplicate following
            const alreadyFollowing = Array.isArray(requesterData.following) && requesterData.following.includes(user.uid);
            const newFollowing = alreadyFollowing
              ? requesterData.following
              : Array.isArray(requesterData.following)
                ? [...requesterData.following, user.uid]
                : [user.uid];
            await updateDoc(requesterRef, {
              following: newFollowing,
              followingCount: alreadyFollowing
                ? requesterData.followingCount || 0
                : (requesterData.followingCount || 0) + 1,
            });

            // Update all user's posts to include new follower in allowedFollowers
            const { collection, query, where, getDocs, updateDoc: updateDocFirestore, doc: docFirestore } = await import('firebase/firestore');
            const postsQuery = query(
              collection(db, 'posts'),
              where('userId', '==', user.uid),
              where('isPrivate', '==', true)
            );
            const postsSnapshot = await getDocs(postsQuery);
            const updatePromises = postsSnapshot.docs.map(async (postDoc) => {
              const postData = postDoc.data();
              const currentAllowed = postData.allowedFollowers || [];
              if (!currentAllowed.includes(item.senderId)) {
                await updateDocFirestore(docFirestore(db, 'posts', postDoc.id), {
                  allowedFollowers: [...currentAllowed, item.senderId]
                });
              }
            });
            await Promise.all(updatePromises);

            // Remove follow request
            await deleteDoc(docFirestore(db, 'users', user.uid, 'followRequests', item.senderId));

            // Delete notification from Firestore so it never reappears
            await deleteDoc(docFirestore(db, 'users', user.uid, 'notifications', item.id));

            // Send notification to requester
            await addNotification({
              recipientId: item.senderId,
              senderId: user.uid,
              type: 'follow-approved',
              message: 'Your follow request was accepted',
            });

            alert('Request accepted');
            if (onActionTaken) onActionTaken(item.id);
          } catch (err) {
            console.error('Error accepting request:', err);
            alert('Error accepting request');
          }
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Accept</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: '#FF3B30',
          paddingVertical: 6,
          paddingHorizontal: 18,
          borderRadius: 8,
          opacity: actionTaken ? 0.5 : 1,
        }}
        disabled={actionTaken}
        onPress={async () => {
          setActionTaken(true);
          try {
            const { deleteDoc, doc } = await import('firebase/firestore');
            const { getCurrentUser, addNotification } = await import('../../lib/firebaseHelpers');
            const user = getCurrentUser();
            if (!user) return;

            // Remove follow request
            await deleteDoc(doc(db, 'users', user.uid, 'followRequests', item.senderId));

            // Delete notification from Firestore so it never reappears
            await deleteDoc(doc(db, 'users', user.uid, 'notifications', item.id));

            // Send notification to requester
            await addNotification({
              recipientId: item.senderId,
              senderId: user.uid,
              type: 'follow-rejected',
              message: 'Your follow request was rejected',
            });

            alert('Request declined');
            if (onActionTaken) onActionTaken(item.id);
          } catch (err) {
            console.error('Error declining request:', err);
            alert('Error declining request');
          }
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Decline</Text>
      </TouchableOpacity>
    </>
  );
};

export default AcceptDeclineButtons;
