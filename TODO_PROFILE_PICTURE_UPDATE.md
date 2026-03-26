# Profile Picture - Persistent Storage & Remove Feature

## TODO List

### 1. Backend - Add Remove Profile Picture Endpoint
- [x] Add `/api/remove-profile-picture` endpoint in backend/index.js

### 2. AuthContext - Add removeProfilePicture Function
- [x] Add `removeProfilePicture` function in AuthContext.jsx

### 3. ProfilePictureUpload - Add Remove Button
- [x] Add "Remove Picture" button in ProfilePictureUpload.jsx

### 4. Welcome.jsx - Add Remove Option
- [x] Add showRemove prop and integrate with profile upload modal

### 5. Persistence - Verified Working
- [x] Profile pictures are stored in Supabase and persist after logout/login
- [x] User profile is fetched on login via fetchUserProfile function

## Implementation Notes
- Remove option appears when user has a profile picture (showRemove={!!avatarUrl})
- After removing, updates local state and clears Firebase photoURL
- Profile pictures persist in Supabase profiles table with avatar_url field

