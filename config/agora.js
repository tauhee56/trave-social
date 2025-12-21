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
  appId: 'b3afe61e45af4fe3819dbdffbbcffbf3', // NEW Testing Mode App ID (no certificate)
  appCertificate: '', // Testing Mode: certificate disabled, no token required
  // VERIFY: Ensure appId and appCertificate match latest from Agora Console
  // Cloud Function URL for token generation (production-ready)
  tokenServerUrl: '', // Testing Mode: no token server needed (null token works)
};

// Generate a channel name for live streaming
export const generateChannelName = (userId) => {
  return `live_${userId}_${Date.now()}`;
};

// Get Agora token from Cloud Function
// Supports both broadcaster (publisher) and viewer (subscriber) roles
export const getAgoraToken = async (channelName, uid, role = 'subscriber') => {
  try {
    console.log('🎫 Requesting token from Cloud Function...');
    console.log('📡 Channel:', channelName);
    console.log('🎯 UID:', uid);
    console.log('👤 Role:', role);

    // Testing Mode: no token server, return null (certificate disabled)
    if (!AGORA_CONFIG.tokenServerUrl || AGORA_CONFIG.tokenServerUrl === '') {
      console.log('⚠️ Testing Mode: Using null token (certificate disabled)');
      return null;
    }

    // Call Cloud Function to generate token
    if (AGORA_CONFIG.tokenServerUrl) {
      const response = await fetch(AGORA_CONFIG.tokenServerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelName: channelName,
          uid: uid.toString(),
          role: role, // 'publisher' or 'subscriber'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token server error:', response.status, errorText);
        throw new Error(`Token server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.token) {
        console.log('✅ Token received successfully');
        console.log('⏰ Expires in:', data.expiresIn, 'seconds');
        return data.token;
      } else {
        console.error('❌ Invalid token response:', data);
        throw new Error('Invalid token response from server');
      }
    }

    // Fallback: return null (only works if certificate is disabled in Agora console)
    console.warn('⚠️ No token server configured, using null token (certificate must be disabled)');
    return null;
  } catch (error) {
    console.error('❌ Error fetching Agora token:', error);
    // Return null as fallback (only works if certificate is disabled)
    return null;
  }
};
