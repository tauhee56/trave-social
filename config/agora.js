// Agora.io Configuration
// Keep these credentials secure and never commit to public repositories

// IMPORTANT: If you're getting Error 110 (ERR_OPEN_CHANNEL_TIMEOUT):
// 1. Go to: https://console.agora.io
// 2. Select your project: travel-app
// 3. Click "Config" or "Edit"
// 4. Find "Primary Certificate" section
// 5. Click "Disable" to turn OFF the certificate requirement
// 6. OR implement a token server (see getAgoraToken function below)

// Directly use config to avoid environment loading issues
export const AGORA_CONFIG = {
  appId: '29320482381a43498eb8ca3e222b6e34',
  appCertificate: 'e8372567e0334d75add0ec3f597fb67b', // Only needed if certificate is enabled
  tokenServerUrl: '', // Add your token server URL here if using certificates
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
