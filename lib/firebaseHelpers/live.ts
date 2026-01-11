// Live streaming helpers

import { apiService } from '../../app/_services/apiService';

export async function getActiveLiveStreams() {
  try {
    const res = await apiService.get('/live-streams');
    const streams = (res as any)?.streams ?? (res as any)?.data ?? [];
    return Array.isArray(streams) ? streams : [];
  } catch (error: any) {
    return [];
  }
}

export async function startLiveStream(userId: string, streamData: any) {
  try {
    return await apiService.post('/live-streams', { userId, ...streamData });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function endLiveStream(streamId: string, userId: string) {
  try {
    return await apiService.patch(`/live-streams/${streamId}/end`, { userId });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function joinLiveStream(streamId: string, userId: string) {
  try {
    const joined = await apiService.post(`/live-streams/${streamId}/join`, { userId });
    if (joined?.success !== false) return joined;
    return await apiService.get(`/live-streams/${streamId}`);
  } catch (error: any) {
    try {
      return await apiService.get(`/live-streams/${streamId}`);
    } catch (e: any) {
      return { success: false, error: e?.message || error?.message };
    }
  }
}

export async function addLiveComment(streamId: string, payload: { userId: string; text: string; userName?: string; userAvatar?: string }) {
  try {
    return await apiService.post(`/live-streams/${streamId}/comments`, payload);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function leaveLiveStream(streamId: string, userId: string) {
  try {
    return await apiService.post(`/live-streams/${streamId}/leave`, { userId });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function subscribeToLiveStream(streamId: string, callback: (stream: any) => void) {
  // Use polling for live stream
  const pollInterval = setInterval(async () => {
    try {
      const data = await apiService.get(`/live-streams/${streamId}`);
      if (data?.success !== false && data?.data) {
        callback(data.data);
      }
    } catch (error) {
      console.error('Error polling live stream:', error);
    }
  }, 5000);

  return () => clearInterval(pollInterval);
}

export function subscribeToLiveComments(streamId: string, callback: (comments: any[]) => void) {
  // Use polling for comments
  const pollInterval = setInterval(async () => {
    try {
      const data = await apiService.get(`/live-streams/${streamId}/comments`);
      if (data?.success !== false) {
        const comments = data?.data || [];
        callback(comments);
      }
    } catch (error) {
      console.error('Error polling live comments:', error);
    }
  }, 5000);

  return () => clearInterval(pollInterval);
}
