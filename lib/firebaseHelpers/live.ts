// Live streaming helpers

import { apiService } from '../../app/_services/apiService';

export async function getActiveLiveStreams() {
  try {
    const res = await apiService.get('/live-streams');
    const streams = res?.data || [];
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
    // Backend doesn't currently expose a dedicated "join" REST endpoint.
    // Fetch the stream details as a lightweight "join" operation.
    return await apiService.get(`/live-streams/${streamId}`);
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
