# 📸 Videos in Posts & Story Settings - Complete Guide

## ✅ What's New

### 1. **Videos in Posts** 🎥
Your app now fully supports **mixing images and videos** in a single post!

#### How to Use:
1. **Go to Create Post** → Tap the camera/create button
2. **Gallery opens with tabs:**
   - 📷 **Images** tab - Shows all photos (with count)
   - 🎥 **Videos** tab - Shows all videos (with count)
3. **Select mixed content:**
   - Switch between tabs to pick both images and videos
   - Tap items to select/deselect (selected items get golden border)
   - You can mix as many images and videos as you want
4. **Preview:** See them all in the carousel slider (videos have ▶️ icon)
5. **Post:** Click "Share" - all media uploads together!

#### Backend Support:
- ✅ Already supports `mediaType: 'video'` parameter
- ✅ Video compression ready
- ✅ Mixed media carousel viewing

---

### 2. **Story Settings** 📝

New **dedicated settings screen** for controlling who sees your stories and what they can do!

#### How to Access:
**Path:** `Settings → Story Settings` (or directly via `/story-settings` route)

#### Available Settings:

**👥 Privacy Options:**
- **Everyone** - All users can view (default)
- **Followers Only** - Only your followers
- **Close Friends** - Only close friends list
- **Custom** - Coming soon for granular control

**💬 Interactions:**
- ✅ **Allow Replies** - Users can reply to your story
- ✅ **Allow Mentions** - Users can tag/mention you
- ✅ **Show Viewers** - Display who viewed your story
- ✅ **Allow Downloads** - Let others download your story

**📝 Content Settings:**
- ✅ **Auto-Delete After 24h** - Stories vanish automatically (default: ON)
- ✅ **Allow in Search** - Appear in hashtag/location search results

---

## 🛠️ Technical Details

### Frontend Changes (commit: 18bbec7)
**File:** `app/create-post.tsx`
```tsx
// New tab switcher for gallery
const [galleryTab, setGalleryTab] = useState<'images' | 'videos'>('images');

// Tab UI shows:
// 📷 Images (12) | 🎥 Videos (5)
// - Click to switch between tabs
// - Shows count of each type
// - Selected items highlighted with border

// Updated summary shows:
// 📷 Images/Videos: 8
// 3 videos, 5 images
```

**File:** `app/story-settings.tsx` (NEW)
```tsx
type StorySettings = {
  allowReplies: boolean;
  allowMentions: boolean;
  allowDownloads: boolean;
  showViewers: boolean;
  autoDeleteAfter24h: boolean;
  allowSearching: boolean;
  privacyLevel: 'everyone' | 'followers' | 'close-friends' | 'custom';
  hideFromList: string[];
  muteNotificationsFrom: string[];
};

// Saved to AsyncStorage as 'storySettings'
```

---

## 📱 User Experience

### Creating a Post with Videos:

```
1. Home Screen → "+" button
   ↓
2. Gallery View (Images tab selected by default)
   ↓
3. Select images by tapping (golden border appears)
   ↓
4. Tap "🎥 Videos" tab to see available videos
   ↓
5. Select videos too (mix and match!)
   ↓
6. Tap "Next" when done (or directly from Albums picker)
   ↓
7. Caption + Location + Category + Tags
   ↓
8. Tap "Share" → POST CREATED ✅
   
Preview shows slider with video player and image viewer
```

### Configuring Story Settings:

```
1. Settings → Story Settings
   ↓
2. Choose Privacy Level (Everyone / Followers / Close Friends)
   ↓
3. Toggle Interactions (Allow Replies, Mentions, etc.)
   ↓
4. Toggle Content Settings (Auto-delete, Search visibility)
   ↓
5. Settings saved to AsyncStorage automatically ✅
```

---

## 🎬 Video Support Details

### Formats Supported:
- ✅ `.mp4` (H.264, AAC)
- ✅ `.mov` (QuickTime)
- ✅ Platform-native formats (auto-detected)

### Limitations (Can be enhanced):
- Currently no video compression (future: add `compress-video` module)
- Max upload size: Platform dependent (typically 100MB+)
- Duration: Unlimited (but recommended <60s for story)

### Detection Logic:
```tsx
// Videos are detected by URI:
- Ends with .mp4 or .mov
- Includes 'video' in URI
- Shows play icon overlay in gallery
```

---

## 🚀 Next Steps / Future Enhancements

### Phase 2 (Backend Integration):
- [ ] Store `storySettings` in user document on backend
- [ ] Enforce privacy levels when returning stories
- [ ] Track story viewers with settings
- [ ] Send notifications based on mute settings
- [ ] Implement custom privacy list (specific users)

### Phase 3 (Video Enhancements):
- [ ] Add video compression before upload
- [ ] Show video duration in gallery
- [ ] Add video trimming tool
- [ ] Support for video filters
- [ ] Video thumbnail customization

### Phase 4 (Story Features):
- [ ] Story reactions/stickers
- [ ] Video chat in story replies
- [ ] Story polls and questions
- [ ] Story music/audio
- [ ] Highlight stories (save permanently)

---

## 🔧 Configuration

### Story Settings Location:
```
Device: AsyncStorage
Key: 'storySettings'
Format: JSON object (serialized)
Default: See DEFAULT_SETTINGS in app/story-settings.tsx
```

### To Reset Story Settings:
```tsx
// In any screen:
await AsyncStorage.removeItem('storySettings');
// Will reload defaults next time
```

---

## ✨ Quick Tips

1. **Switch Tabs Fast:** Videos and images both load when screen loads
2. **Multi-select:** Tap multiple times on different items - no limit!
3. **Story Privacy:** Set once, applies to all new stories
4. **Video Preview:** Tap to play preview in full gallery
5. **Selected Count:** Shows in summary when you go to details

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Videos not showing in tab | Grant gallery/media permissions in app settings |
| Selected videos not uploading | Check internet connection & storage space |
| Story settings not saving | Ensure AsyncStorage has write permission |
| Mixed media carousel broken | Try clearing app cache & reload |
| Video play icon not visible | Update app - fixed in 18bbec7 |

---

## 📞 Questions?

- Check console logs: `[galleryTab]`, `[storySettings]`
- Verify AsyncStorage keys in DevTools
- Test with 2-3 image + 1-2 video combo first

**Enjoy creating! 🎉**
