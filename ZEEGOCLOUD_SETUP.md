# 🎥 ZeegoCloud Live Streaming Setup Guide

## ✅ Installation Complete

ZeegoCloud SDK has been successfully installed and configured!

## 📦 Installed Packages

```bash
@zegocloud/zego-uikit-prebuilt-live-streaming-rn
```

## 🔧 Configuration

### 1. Config File: `config/zeegocloud.js`

```javascript
export const ZEEGOCLOUD_CONFIG = {
  appID: 1897376207,
  appSign: 'e3929da123bac9483ed6e6962753a55cff74996a3b0f1acecae54fbed4b02b0e',
  serverSecret: 'e3929da123bac9483ed6e6962753a55cff74996a3b0f1acecae54fbed4b02b0e',
};
```

### 2. Components Created

#### Host Component: `app/_components/ZeegocloudLiveHost.tsx`
- For broadcasters to start live streams
- Uses `HOST_DEFAULT_CONFIG` from SDK

#### Viewer Component: `app/_components/ZeegocloudLiveViewer.tsx`
- For viewers to watch live streams
- Uses `AUDIENCE_DEFAULT_CONFIG` from SDK

### 3. Screens Created

#### Go Live Screen: `app/go-live-new.tsx`
- Simple UI to start broadcasting
- Generates unique room ID
- Integrates ZeegocloudLiveHost component

#### Watch Live Screen: `app/watch-live-new.tsx`
- Join existing live streams
- Takes roomId as parameter
- Integrates ZeegocloudLiveViewer component

## 🚀 Usage

### Starting a Live Stream (Broadcaster)

```typescript
import ZeegocloudLiveHost from './_components/ZeegocloudLiveHost';

<ZeegocloudLiveHost
  roomID="live_user123_1234567890"
  userID="user123"
  userName="John Doe"
  onLeave={() => console.log('Stream ended')}
/>
```

### Watching a Live Stream (Viewer)

```typescript
import ZeegocloudLiveViewer from './_components/ZeegocloudLiveViewer';

<ZeegocloudLiveViewer
  roomID="live_user123_1234567890"
  userID="viewer456"
  userName="Jane Smith"
  onLeave={() => console.log('Left stream')}
/>
```

## 📱 Navigation

### Go Live
```typescript
router.push('/go-live-new');
```

### Watch Live
```typescript
router.push({
  pathname: '/watch-live-new',
  params: { roomId: 'live_user123_1234567890' }
});
```

## 🔑 Key Features

✅ **Plug & Play** - No complex WebSocket setup needed
✅ **Auto Camera/Mic** - SDK handles permissions automatically
✅ **Built-in UI** - Professional streaming interface included
✅ **Real-time** - Low latency streaming
✅ **Scalable** - Handles multiple viewers
✅ **Cross-platform** - Works on iOS & Android

## 🎯 Next Steps

1. **Replace old screens:**
   ```bash
   # Rename old files
   mv app/go-live.tsx app/go-live-old.tsx
   mv app/watch-live.tsx app/watch-live-old.tsx
   
   # Rename new files
   mv app/go-live-new.tsx app/go-live.tsx
   mv app/watch-live-new.tsx app/watch-live.tsx
   ```

2. **Test the implementation:**
   ```bash
   npm start
   ```

3. **Update navigation references** in your app to use new screens

## 🐛 Troubleshooting

### Issue: "Module not found"
**Solution:** Run `npm install` again

### Issue: "Camera permission denied"
**Solution:** Check `app.json` for camera/microphone permissions

### Issue: "Stream not connecting"
**Solution:** Verify appID and appSign in config

## 📚 Documentation

- [ZeegoCloud Docs](https://www.zegocloud.com/docs/uikit/live-streaming-kit-rn/quick-start/quick-start)
- [API Reference](https://www.zegocloud.com/docs/uikit/live-streaming-kit-rn/api-reference)

## ✨ Features Included

- ✅ Host broadcasting
- ✅ Viewer watching
- ✅ Auto camera/mic handling
- ✅ Built-in UI controls
- ✅ Room management
- ✅ User management
- ✅ Leave/End stream callbacks

## 🎉 You're All Set!

Your ZeegoCloud live streaming is now ready to use. Just replace the old screens and test!

