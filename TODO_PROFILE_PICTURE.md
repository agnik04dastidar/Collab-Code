# Profile Picture Upload Feature - Implementation Plan

## Tasks

### 1. Backend - Fix Upload Endpoint ✅
- [x] Fix the `/api/upload-profile-picture` endpoint to properly handle Firebase UID
- [x] Ensure the profile is updated with the correct avatar_url
- [x] Use full URL for the uploaded image (https://real-time-code-editor-7n13.onrender.com/uploads/)

### 2. AuthContext - Update Profile Handling ✅
- [x] Add function to fetch user profile from Supabase
- [x] Store avatar_url in the auth state
- [x] Add function to update profile with avatar URL
- [x] Added userProfile state, fetchUserProfile, and updateUserProfile functions

### 3. Create ProfilePictureUpload Component ✅
- [x] Create a reusable component for uploading profile pictures
- [x] Handle file selection, preview, and upload
- [x] File validation (type and size)
- [x] Progress feedback during upload

### 4. Update Welcome.jsx - Display & Upload ✅
- [x] Display profile picture in user dropdown (instead of just initial)
- [x] Add "Change Profile Picture" button in dropdown
- [x] Integrate the upload component with modal

### 5. App.jsx - Updates Needed
- [x] Import FaCamera icon
- [x] Import ProfilePictureUpload component
- [x] Add userProfile from useAuth
- [ ] Add profile upload modal and functionality

## Implementation Status
- [x] Task 1: Backend fix
- [x] Task 2: AuthContext update
- [x] Task 3: Create upload component
- [x] Task 4: Update Welcome.jsx
- [x] Task 5: Update App.jsx (basic integration)

## Summary
The profile picture upload feature has been implemented with:
1. Backend endpoint that handles file uploads and updates Supabase profiles
2. AuthContext with profile fetching and state management
3. A reusable ProfilePictureUpload component with preview and validation
4. Welcome page integration showing profile pictures in the user dropdown
5. Modal-based upload interface with the same arcade-style design

