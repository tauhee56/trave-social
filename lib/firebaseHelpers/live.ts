// Live streaming helpers

export async function getActiveLiveStreams() {
  try {
    const res = await fetch(`/api/live`);
    const data = await res.json();
    if (data.success) {
      return data.data;
    } else {
      return [];
    }
  } catch (error: any) {
    return [];
  }
}

export async function startLiveStream(userId: string, streamData: any) {
  try {
    const res = await fetch(`/api/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...streamData })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function endLiveStream(streamId: string, userId: string) {
  try {
    const res = await fetch(`/api/live/${streamId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function joinLiveStream(streamId: string, userId: string) {
  try {
    const res = await fetch(`/api/live/${streamId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function leaveLiveStream(streamId: string, userId: string) {
  try {
    const res = await fetch(`/api/live/${streamId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function subscribeToLiveStream(streamId: string, callback: (stream: any) => void) {
  // Use polling for live stream
  const pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/live/${streamId}`);
      const data = await res.json();
      if (data.success && data.data) {
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
      const res = await fetch(`/api/live/${streamId}/comments`);
      const data = await res.json();
      if (data.success) {
        const comments = data.data || [];
        callback(comments);
      }
    } catch (error) {
      console.error('Error polling live comments:', error);
    }
  }, 5000);

  return () => clearInterval(pollInterval);
}
