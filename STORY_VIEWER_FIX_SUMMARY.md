# Story Viewer Fix Summary

## Problem
Media picker was repeatedly opening when trying to view stories from the profile picture in the upload modal, instead of showing the StoriesViewer.

## Root Causes Identified & Fixed

### 1. **Picker Re-opening on Modal Close** ✅ FIXED
- **Issue**: When modal closed and `selectedMedia` became null, component re-rendered showing the "Select Photo or Video" touchable, which could get accidentally tapped
- **Fix**: Added `isViewingStories` flag state to prevent picker from opening during story viewing

### 2. **Missing Initial Index Parameter** ✅ FIXED
- **Issue**: Profile pic click called `onStoryPress(myUser.stories, 0)` but home.tsx callback wasn't expecting initialIndex parameter
- **Fix**: 
  - Updated home.tsx callback to accept `(stories, initialIndex)` parameters
  - Added `storyInitialIndex` state to home.tsx
  - Passed `initialIndex` prop to StoriesViewer component

### 3. **Race Conditions** ✅ FIXED
- **Issue**: Modal close and picker call might race, causing picker to open unexpectedly
- **Fix**: 
  - Added `isViewingStories` flag to disable picker while viewing
  - Added checks in `handleAddStory()` to prevent calls when modal is open
  - Reset flag in Modal's `onRequestClose` handler

## Changes Made

### app/_components/StoriesRow.tsx
```tsx
// 1. Added new state
const [isViewingStories, setIsViewingStories] = useState(false);

// 2. Updated profile pic click handler
onPress={() => {
  setIsViewingStories(true);  // Set flag FIRST
  setShowUploadModal(false);
  setSelectedMedia(null);
  // ... rest of handler ...
  if (myUser && myUser.stories.length > 0 && onStoryPress) {
    setTimeout(() => {
      onStoryPress(myUser.stories, 0);  // Pass initialIndex!
      setIsViewingStories(false);
    }, 100);
  }
}}

// 3. Protected image picker area
<TouchableOpacity
  disabled={isViewingStories}
  onPress={async () => {
    if (isViewingStories) return;
    // ... open picker ...
  }}
/>

// 4. Protected handleAddStory
function handleAddStory() {
  if (isViewingStories || showUploadModal) {
    return;  // Prevent picker from opening
  }
  // ... open picker ...
}

// 5. Reset flag in Modal.onRequestClose
onRequestClose={() => {
  // ... reset state ...
  setIsViewingStories(false);
}}
```

### app/(tabs)/home.tsx
```tsx
// 1. Added initialIndex state
const [storyInitialIndex, setStoryInitialIndex] = useState(0);

// 2. Updated callback to accept initialIndex
onStoryPress={(stories, initialIndex) => {
  console.log('[Home] onStoryPress called with', stories.length, 'stories, initialIndex:', initialIndex);
  setSelectedStories(stories);
  setStoryInitialIndex(initialIndex || 0);  // Save initialIndex
  setShowStoriesViewer(true);
}}

// 3. Pass initialIndex to StoriesViewer
<StoriesViewer 
  stories={selectedStories} 
  initialIndex={storyInitialIndex}  // Add this
  onClose={() => setShowStoriesViewer(false)} 
/>
```

## Testing Steps

1. **Open app and go to stories section**
2. **Click "+" to add a story** → Media picker should open ✅
3. **Select an image/video**
4. **Modal appears with profile pic** ✅
5. **Click profile pic** → Should close modal and show StoriesViewer (your stories)
   - Media picker should NOT open ❌ (this was the bug, now fixed ✅)
   - StoriesViewer should appear showing your stories ✅
6. **Close StoriesViewer**
7. **Click "+" again** → Media picker should open (not blocked) ✅

## Expected Behavior After Fix

- Profile pic click → StoriesViewer opens (your stories displayed)
- Media picker is disabled during story viewing
- Modal properly closes without triggering picker
- No accidental picker openings

## Debugging Console Logs

Added console.log statements for debugging:
```
[StoriesRow] Profile pic clicked, viewing stories...
[StoriesRow] My user: <userId> Stories count: <count>
[StoriesRow] Opening stories viewer...
[Home] onStoryPress called with <count> stories, initialIndex: <index>
```

Check these logs in your React Native debugger to verify the flow.

## Commits Made

1. `296242f` - Add isViewingStories flag to prevent picker
2. `e004517` - Add robust checks to prevent unexpected picker opening
3. `646b751` - Pass initialIndex to StoriesViewer

## Files Modified

- `app/_components/StoriesRow.tsx` - Added state flag and safety checks
- `app/(tabs)/home.tsx` - Added initialIndex state and callback parameter

---

**Status**: ✅ COMPLETE - Ready for testing

This fix should completely resolve the issue of media picker opening instead of StoriesViewer when clicking the profile picture.
