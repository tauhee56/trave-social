# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Trave-Social is a travel-focused social media app built with Expo/React Native. It combines Instagram-style posting with unique travel features like GPS-based passport stamps, verified location check-ins, and live streaming capabilities. The app uses Firebase for backend services, Agora for live streaming, and Google Maps for location services.

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on specific platforms
npx expo run:android      # Android
npx expo run:ios          # iOS (macOS only)
npm run web              # Web

# Clear cache (troubleshooting)
npx expo start -c
```

### Building & Deployment
```bash
# Development builds
eas build -p android --profile development
eas build -p ios --profile development

# Production builds
eas build -p android --profile production
eas build -p ios --profile production
```

### Utility Scripts
```bash
npm run lint                # Run ESLint
npm run check-auth          # Verify auth configuration
npm run setup-auth          # Initialize auth setup
npm run add-firebase-apps   # Add Firebase app configurations
npm run get-sha1            # Get Android SHA1 for Firebase
npm run fix-dev-build       # Fix development build issues
```

## Architecture Overview

### Service Layer Pattern
The app uses a **Service Layer Architecture** that abstracts all external dependencies behind interfaces. This allows swapping backends (Firebase → Supabase, Agora → Twilio, etc.) without modifying business logic.

**Key architectural principle**: Components never import Firebase/Agora/Maps directly. They always use service abstractions.

#### Service Structure
```
services/
├── interfaces/              # Abstract contracts
│   ├── IAuthService.ts
│   ├── IDatabaseService.ts
│   ├── IStorageService.ts
│   ├── IMapService.ts
│   ├── IStreamingService.ts
│   └── ILiveStreamService.ts
├── implementations/         # Concrete implementations
│   ├── FirebaseAuthService.ts
│   ├── FirebaseDatabaseService.ts
│   ├── GoogleMapsService.ts
│   └── AgoraStreamingService.ts
└── ServiceFactory.ts        # MAIN FILE - Single place to switch backends
```

**Changing a backend provider**: Edit `services/ServiceFactory.ts` and change the return statement in the appropriate getter method. That's it!

#### Usage Pattern
```typescript
// ❌ WRONG - Direct Firebase import
import { db } from '../config/firebase';
const users = await getDocs(collection(db, 'users'));

// ✅ CORRECT - Service abstraction
import ServiceFactory from '../services/ServiceFactory';
const dbService = ServiceFactory.getDatabaseService();
const users = await dbService.getUsers();
```

### File-Based Routing
Uses Expo Router with file-based routing in the `app/` directory:

```
app/
├── (tabs)/              # Tab navigation screens
│   ├── home.tsx         # Main feed
│   ├── map.tsx          # Map/travel view
│   ├── post.tsx         # Create post
│   ├── search.tsx       # Search users/places
│   └── profile.tsx      # User profile
├── auth/                # Authentication screens
├── user-profile/        # User profile views
├── post/                # Post detail views
├── go-live.tsx          # Live streaming interface
└── _layout.tsx          # Root layout
```

### Type System
All data models are centralized in `types/models.ts`:
- **User**: User profiles with stats and settings
- **Post**: Social posts with images, location, engagement
- **Story**: 24-hour ephemeral content
- **Highlight**: Permanent story collections
- **Message/Conversation**: Chat system
- **Comment**: Post comments with replies
- **Notification**: Push notifications
- **LocationData**: GPS and verified location data
- **PassportEntry**: Travel passport stamps

Always import types from `types/models.ts` for consistency.

### Configuration Management
All API keys and configuration are in `config/environment.ts` and `.env`:

```bash
# Required environment variables (see .env.example)
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_AGORA_APP_ID=
```

**Firebase config**: `config/firebase.js` exports `auth`, `db`, `storage`  
**Agora config**: Located in `config/agora.js`

## Key Features & Implementation Details

### Authentication System
- **Multiple sign-in methods**: Email/password, phone OTP, Google, Apple, TikTok, Snapchat
- **Service**: `services/authService.ts`
- **Firebase Auth** with AsyncStorage persistence
- **User profiles** automatically created in Firestore on signup

### Live Streaming (Agora)
Advanced live streaming with professional features:
- **Dual camera mode**: Picture-in-picture (front + back camera simultaneously)
- **Viewers list**: Real-time viewer tracking with modal
- **Controls**: Camera switch, mute/unmute, video toggle, location sharing
- **Real-time comments**: Firestore-based chat during streams
- **Stream discovery**: "Live Now" section on home feed
- **Implementation**: `app/go-live.tsx`

### Location Features
Two types of locations:
1. **GPS Locations**: Captured via device GPS, reverse geocoded to place names
2. **Verified Locations**: Manually searched places with placeId (shows green checkmark)

**Location service**: `services/locationService.ts`  
**Reverse geocoding**: Uses Google Maps Geocoding API  
**Passport stamps**: Automatic travel tracking stored in user profiles

### Posts & Feed
- **Feed algorithm**: Shows posts from followed users (can be customized in `app/(tabs)/home.tsx`)
- **Image handling**: Firebase Storage with progress callbacks
- **Location tagging**: Both GPS and verified location support
- **Engagement**: Likes, comments, shares, saves

### Notifications
- **Push notifications**: Expo Notifications
- **Service**: `services/notificationService.ts`
- **Types**: Like, comment, follow, mention, message, live-stream
- **Real-time**: Firestore listeners for instant updates

### Hooks
Custom React hooks for common operations:
- `useProfileData(userId)`: Fetch and subscribe to user profile
- `useEditProfileData()`: Edit current user's profile
- Additional hooks in `hooks/` directory

### UI Components
Reusable components in `components/`:
- `AvatarUpload.tsx`: Profile picture upload
- `PostLocationModal.tsx`: Location picker for posts
- `ProfileAvatar.tsx`: User avatar display
- `StatsRow.tsx`: Profile statistics

## Testing

### Live Streaming Tests
Requires **2 physical Android devices** (emulator doesn't support camera):
1. **Start stream**: Device 1 goes live
2. **View stream**: Device 2 watches from "Live Now" section
3. **Comments**: Test real-time chat
4. **Controls**: Test camera switch, mute, video toggle
5. **End stream**: Verify proper cleanup and viewer disconnection

See `TESTING_GUIDE.md` for comprehensive test cases.

### General Testing
- Run app on physical device for camera/location features
- Use Expo Go for quick testing (limited native features)
- Use development builds for full feature testing

## Common Development Tasks

### Adding a New Screen
1. Create file in `app/` directory following routing convention
2. Export default React component
3. Navigation handled automatically by Expo Router

### Adding a New Feature
1. Define TypeScript types in `types/models.ts`
2. Create/extend service interface in `services/interfaces/`
3. Implement in `services/implementations/`
4. Update `ServiceFactory.ts` if needed
5. Use service in components via `ServiceFactory.getXService()`

### Modifying Backend
To switch from Firebase to another backend:
1. Create new implementation (e.g., `SupabaseDatabaseService.ts`)
2. Implement the interface methods (e.g., `IDatabaseService`)
3. Update `ServiceFactory.ts` getter to return new implementation
4. All components work without changes

### Firestore Structure
```
users/
  {userId}/
    - profile data
    - followers[], following[]
    - passport entries

posts/
  {postId}/
    - post data
    - likes[], comments count

liveStreams/
  {streamId}/
    - stream metadata
    - comments/ subcollection

stories/
  {storyId}/
    - expires after 24h

conversations/
  {conversationId}/
    - messages/ subcollection
```

## Platform-Specific Notes

### Android
- Requires Google Maps API key in `app.json` and `eas.json`
- Camera/microphone permissions configured in `app.json` plugins
- Background location for passport tracking
- Package: `com.tauhee56.travesocial`

### iOS
- Requires Xcode on macOS
- Bundle identifier: `com.tauhee56.travesocial`
- Camera/location permission descriptions in `app.json`

### Windows Development
- This project is being developed on Windows
- Use PowerShell for commands
- Android builds work; iOS requires macOS

## Important Files

### Documentation
- `ARCHITECTURE.md`: Complete architecture guide with examples
- `TESTING_GUIDE.md`: Live stream testing procedures
- `AUTH_SYSTEM_README.md`: Authentication implementation details
- `FIREBASE_SETUP.md`: Firebase configuration guide
- `COMPLETED_FEATURES_SUMMARY.md`: Feature changelog

### Configuration
- `app.json`: Expo configuration, permissions, plugins
- `eas.json`: EAS Build profiles
- `tsconfig.json`: TypeScript configuration with path aliases (`@/*`)
- `babel.config.js`: Babel plugins including Reanimated and dotenv

### Services
- `services/ServiceFactory.ts`: Backend abstraction entry point
- `services/authService.ts`: Authentication logic
- `services/locationService.ts`: GPS and geocoding
- `services/notificationService.ts`: Push notifications
- `services/moderation.ts`: User reporting and blocking

## Troubleshooting

### Build Issues
```bash
# Clean cache and rebuild
npx expo start -c
rm -rf node_modules && npm install

# Fix dev build
npm run fix-dev-build
```

### Firebase Issues
```bash
# Verify configuration
npm run check-auth

# Reset auth setup
npm run setup-auth
```

### Agora/Live Streaming Issues
- Verify AGORA_APP_ID in `app.json` extra config
- Check permissions in `app.json`
- Test on physical device only

### Location Issues
- Ensure Google Maps API key is valid
- Enable Geocoding API in Google Cloud Console
- Check location permissions granted

## Code Style & Conventions

- **TypeScript strict mode**: Enabled in `tsconfig.json`
- **Path aliases**: Use `@/` for root imports
- **Service usage**: Always use `ServiceFactory` for backend access
- **Type imports**: Import from `types/models.ts`
- **Async/await**: Prefer over promises for async operations
- **Error handling**: Services return `{success: boolean, data/error: any}`

## Security Notes

- **Never commit** `.env` file or `serviceAccountKey.json`
- API keys should be in environment variables
- Firebase Security Rules configured for user-level access control
- Storage rules restrict uploads to authenticated users

## External Dependencies

### Core
- **Expo SDK 54**: React Native framework
- **React 19.1**: UI library
- **React Navigation 7**: Navigation (via Expo Router)
- **TypeScript 5.9**: Type safety

### Backend
- **Firebase 12.6**: Auth, Firestore, Storage
- **Agora 4.5**: Live streaming SDK

### Maps & Location
- **Google Maps**: Geocoding and reverse geocoding
- **react-native-maps 1.20**: Map display
- **expo-location 19**: GPS tracking

### Media
- **expo-camera 17**: Camera access
- **expo-image-picker 17**: Photo picker
- **expo-av 16**: Audio/video playback

### Storage & State
- **AsyncStorage 2.2**: Local storage
- **NetInfo 11.4**: Network status

## Performance Considerations

- **Image uploads**: Use Firebase Storage with progress callbacks
- **Firestore queries**: Always limit and paginate (use `limit()`)
- **Real-time listeners**: Clean up on unmount to prevent memory leaks
- **Live streaming**: Use appropriate video quality settings based on network
- **Location tracking**: Throttle GPS updates for battery efficiency
