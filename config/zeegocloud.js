// ZeegoCloud Configuration for Live Streaming
// Using ZeegoCloud UIKit for React Native

export const ZEEGOCLOUD_CONFIG = {
  appID: 1897376207, // Your ZeegoCloud App ID
  appSign: 'e3929da123bac9483ed6e6962753a55cff74996a3b0f1acecae54fbed4b02b0e', // Your App Sign
  serverSecret: 'e3929da123bac9483ed6e6962753a55cff74996a3b0f1acecae54fbed4b02b0e',
};

// Generate unique room ID for live stream
export const generateRoomId = (userId) => {
  return `live_${userId}_${Date.now()}`;
};

// Generate user ID for ZeegoCloud
export const generateUserId = (userId) => {
  return userId || `user_${Date.now()}`;
};

console.log('✅ ZeegoCloud config loaded');
