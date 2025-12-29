// Stub for isApprovedFollower
export async function isApprovedFollower(followerId: string, followingId: string) {
  // Implement actual logic as needed
  return true;
}

export async function followUser(followerId: string, followingId: string) {
  try {
    const res = await fetch(`/api/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId, followingId })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function unfollowUser(followerId: string, followingId: string) {
  try {
    const res = await fetch(`/api/follow`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId, followingId })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send a follow request to a private account
 */
export async function sendFollowRequest(fromUserId: string, toUserId: string) {
  try {
    const res = await fetch(`/api/follow/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUserId, toUserId })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Reject a follow request
 */
export async function rejectFollowRequest(privateUserId: string, requesterId: string) {
  try {
    const res = await fetch(`/api/follow/request/${requesterId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: privateUserId })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
