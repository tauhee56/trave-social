# 🧪 Live Stream Testing Guide

## 📱 Testing Setup:

### **Requirements:**
- 2 physical Android devices (emulator won't work for camera)
- Both devices on same network
- Firebase project configured
- Agora App ID configured

---

## 🔴 Test 1: Start Live Stream

### **Steps:**
1. Open app on Device 1
2. Login with account
3. Tap pink "Go Live" button (bottom navigation)
4. Camera preview should show immediately
5. Tap "Start Live Video" button
6. Check:
   - ✅ Camera shows your face
   - ✅ Top shows: [X] [🔴 LIVE] [👁 0]
   - ✅ Right side shows 4 control buttons
   - ✅ Bottom shows comment input + End button
   - ✅ No debug messages visible

### **Expected Result:**
```
✅ Stream starts
✅ Firebase document created in liveStreams collection
✅ isLive: true
✅ Camera preview working
✅ Professional UI visible
```

---

## 👁 Test 2: Watch Live Stream

### **Steps:**
1. Open app on Device 2
2. Login with different account
3. Home screen should show "Live Now" section
4. Check:
   - ✅ Red ring around broadcaster's avatar
   - ✅ "LIVE" badge visible
   - ✅ Viewer count shows
5. Tap on the live stream
6. Check:
   - ✅ Video loads and shows broadcaster
   - ✅ Top shows broadcaster info + LIVE badge
   - ✅ Viewer count increases to 1
   - ✅ Comment input at bottom

### **Expected Result:**
```
✅ Viewer joins successfully
✅ Video stream visible
✅ Viewer count updates on both devices
✅ Professional UI
```

---

## 💬 Test 3: Comments

### **On Device 2 (Viewer):**
1. Type "Hello!" in comment input
2. Tap send icon
3. Check:
   - ✅ Comment appears in floating bubble
   - ✅ Username shows in bold
   - ✅ Comment text visible

### **On Device 1 (Broadcaster):**
1. Check if comment appears
2. Type reply: "Hi there!"
3. Send
4. Check:
   - ✅ Comment visible on both devices
   - ✅ Real-time sync working

### **Expected Result:**
```
✅ Comments send instantly
✅ Visible on both devices
✅ Proper formatting
✅ Auto-scroll to latest
```

---

## 🎛 Test 4: Controls (Device 1 - Broadcaster)

### **Camera Switch:**
1. Tap camera icon (top button on right)
2. Check:
   - ✅ Camera flips front/back
   - ✅ Smooth transition
   - ✅ Button background changes to yellow

### **Microphone Toggle:**
1. Tap mic icon
2. Check:
   - ✅ Icon changes to mic-off
   - ✅ Background turns red
   - ✅ Audio muted (ask viewer to confirm)
3. Tap again
4. Check:
   - ✅ Icon back to mic
   - ✅ Background back to normal
   - ✅ Audio working

### **Video Toggle:**
1. Tap video icon
2. Check:
   - ✅ Icon changes to videocam-off
   - ✅ Background turns red
   - ✅ Video stops (viewer sees black screen)
3. Tap again
4. Check:
   - ✅ Video resumes
   - ✅ Viewer can see again

### **Location:**
1. Tap location icon
2. Check:
   - ✅ Map slides up from bottom
   - ✅ Shows current location
   - ✅ Can close map

### **Expected Result:**
```
✅ All controls working
✅ Visual feedback proper
✅ State changes reflected
✅ Viewer sees changes
```

---

## 🛑 Test 5: End Stream

### **On Device 1 (Broadcaster):**
1. Tap "End" button (bottom right, red)
2. Confirm dialog appears
3. Tap "End Stream"
4. Check:
   - ✅ Stream stops
   - ✅ Returns to previous screen
   - ✅ Firebase: isLive = false
   - ✅ endedAt timestamp added

### **On Device 2 (Viewer):**
1. Should see alert: "Stream Ended"
2. Check:
   - ✅ Alert shows immediately
   - ✅ Tap OK returns to home
   - ✅ "Live Now" section empty or updated

### **On Both Devices:**
1. Go to Home screen
2. Check "Live Now" section
3. Check:
   - ✅ Stream removed from list
   - ✅ No longer shows as live
   - ✅ Section hides if no streams

### **Expected Result:**
```
✅ Stream ends properly
✅ Firebase updated immediately
✅ Viewer disconnected
✅ "Live Now" updates
✅ No ghost streams
```

---

## 🔄 Test 6: Multiple Streams

### **Setup:**
1. Device 1: Start stream (User A)
2. Device 2: Start stream (User B)
3. Device 3: Watch streams

### **On Device 3:**
1. Check "Live Now" section
2. Should see 2 streams
3. Check:
   - ✅ Both avatars with red rings
   - ✅ Both show LIVE badge
   - ✅ Viewer counts separate
   - ✅ Sorted by popularity
4. Tap first stream → Watch
5. Go back
6. Tap second stream → Watch
7. Check:
   - ✅ Can switch between streams
   - ✅ Each loads properly
   - ✅ Comments separate

### **Expected Result:**
```
✅ Multiple streams supported
✅ Can watch any stream
✅ Proper isolation
✅ Real-time updates
```

---

## 🐛 Common Issues & Fixes:

### **Issue 1: Black Screen**
**Symptoms:** Camera shows black screen
**Fix:**
- Check camera permissions
- Restart app
- Check if `startPreview()` is called before `joinChannel()`

### **Issue 2: Stream Still Shows After End**
**Symptoms:** "Live Now" shows ended stream
**Fix:**
- Check Firebase: isLive should be false
- Check query: `where('isLive', '==', true)`
- Force refresh app

### **Issue 3: No Video on Viewer Side**
**Symptoms:** Viewer sees loading forever
**Fix:**
- Check Agora App ID
- Check channel name matches
- Check network connection
- Verify broadcaster is actually streaming

### **Issue 4: Comments Not Showing**
**Symptoms:** Comments send but don't appear
**Fix:**
- Check Firebase rules for liveStreams/{id}/comments
- Check real-time listener is active
- Verify streamId is correct

### **Issue 5: Controls Not Working**
**Symptoms:** Buttons don't respond
**Fix:**
- Check if `isLive` is true
- Verify engineRef.current exists
- Check function implementations

---

## ✅ Final Checklist:

### **UI/UX:**
- [ ] Professional Instagram-style design
- [ ] No debug messages visible
- [ ] Smooth animations
- [ ] Proper spacing and colors
- [ ] Touch feedback on buttons
- [ ] Loading states handled

### **Functionality:**
- [ ] Stream starts/stops properly
- [ ] Camera preview works
- [ ] All controls functional
- [ ] Comments real-time
- [ ] Viewer count accurate
- [ ] Multiple viewers supported
- [ ] Stream discovery works
- [ ] Auto-cleanup on end

### **Performance:**
- [ ] No lag in video
- [ ] Comments instant
- [ ] UI responsive
- [ ] No memory leaks
- [ ] Proper cleanup on exit

### **Edge Cases:**
- [ ] Network loss handled
- [ ] App backgrounding handled
- [ ] Broadcaster leaves abruptly
- [ ] Viewer leaves during stream
- [ ] Multiple streams concurrent
- [ ] No streams available

---

## 🎉 Success Criteria:

**All tests pass = Ready for production!**

```
✅ Professional UI
✅ All features working
✅ No bugs
✅ Smooth performance
✅ Instagram-quality experience
```

---

**Happy Testing! 🚀**

