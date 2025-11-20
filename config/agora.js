// Agora.io Configuration
// Keep these credentials secure and never commit to public repositories

export const AGORA_CONFIG = {
  appId: 'de43c1db15cf47e58f1ec61a6d54583d',
  appCertificate: 'e8372567e0334d75add0ec3f597fb67b',
  // Token server URL (optional - for production use)
  tokenServerUrl: '', // If you have a token server, add URL here
};

// Generate a channel name for live streaming
export const generateChannelName = (userId) => {
  return `live_${userId}_${Date.now()}`;
};

// For development/testing, you can use null token
// For production, implement a token server
export const getAgoraToken = async (channelName, uid) => {
  try {
    // If you have a token server, fetch token from there
    if (AGORA_CONFIG.tokenServerUrl) {
      const response = await fetch(
        `${AGORA_CONFIG.tokenServerUrl}?channelName=${channelName}&uid=${uid}`
      );
      const data = await response.json();
      return data.token;
    }
    
    // For development only - return null (works without certificate)
    // In production, you MUST use a token server
    return null;
  } catch (error) {
    console.error('Error fetching Agora token:', error);
    return null;
  }
};
