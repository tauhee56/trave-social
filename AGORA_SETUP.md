# Agora Live Streaming Setup Guide

## Installation Steps

### 1. Install Agora SDK
```bash
npm install react-native-agora
```

### 2. iOS Setup (if targeting iOS)
```bash
cd ios
pod install
cd ..
```

### 3. Android Setup
Add permissions to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.INTERNET" />
```

## Configuration

Your Agora credentials are securely stored in `config/agora.js`:
- **App ID**: de43c1db15cf47e58f1ec61a6d54583d
- **App Certificate**: e8372567e0334d75add0ec3f597fb67b

## Features Implemented

1. **Live Video Streaming**: Real-time video broadcasting using Agora RTC SDK
2. **Live Comments**: Real-time chat during live streams
3. **Viewer Count**: Display number of viewers watching the stream
4. **Live Badge**: Shows "LIVE" indicator when streaming is active
5. **Secure Credentials**: API keys stored in config file (not exposed in code)

## How to Use

1. **Start Live Stream**: 
   - Navigate to Go Live screen
   - Tap "TAP TO GO LIVE" button
   - Camera will activate and stream will start

2. **Stop Stream**:
   - Tap the X button in top right
   - Confirm to end the stream

3. **Comments**:
   - Viewers and broadcaster can send comments during live stream
   - Comments appear in real-time

## Security Notes

⚠️ **IMPORTANT**: 
- The App Certificate should be kept secure
- For production, implement a token server to generate dynamic tokens
- Never commit API keys to public repositories
- Current setup uses null token (development only)

## Production Deployment

For production use, you MUST:

1. **Set up a Token Server**:
   - Create a backend server to generate Agora tokens
   - Update `tokenServerUrl` in `config/agora.js`
   - Implement token refresh logic

2. **Enable App Certificate**:
   - In Agora Console, enable App Certificate
   - Update your token server to use the certificate

3. **Implement Security**:
   - Add user authentication before going live
   - Implement stream moderation
   - Add viewer authentication for private streams

## Testing

To test the live streaming:
1. Run the app: `npm start` or `npx expo start`
2. Open the app on a physical device (emulator camera may not work)
3. Navigate to DM screen and tap "Go Live"
4. Grant camera and microphone permissions when prompted
5. Tap "TAP TO GO LIVE" to start streaming

## Troubleshooting

**Stream not starting:**
- Check if react-native-agora is installed
- Verify camera/microphone permissions are granted
- Check Agora App ID is correct

**No video showing:**
- Ensure using physical device (not emulator)
- Check camera permissions in device settings
- Verify Agora SDK initialized correctly

npx react-native start --reset-cache
npx react-native run-android

**Connection issues:**
- Check internet connection
- Verify Agora App ID and Certificate are correct
- Check if project has active Agora subscription

## Additional Resources

- [Agora React Native Documentation](https://docs.agora.io/en/video-calling/get-started/get-started-sdk?platform=react-native)
- [Agora Dashboard](https://console.agora.io/)
- [Token Server Guide](https://docs.agora.io/en/video-calling/develop/authentication-workflow)
