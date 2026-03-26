import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  updateProfile,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { supabase } from '../supabase/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Fetch user profile from Supabase
  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        setUserProfile(data);
        return data;
      }
      return null;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return null;
    }
  };

  // Update user profile in state
  const updateUserProfile = (updates) => {
    setUserProfile(prev => ({ ...prev, ...updates }));
  };

  // Set session persistence on mount (must be done before any auth operation)
  useEffect(() => {
    const initAuth = async () => {
      try {
        await setPersistence(auth, browserSessionPersistence);
        console.log('Auth persistence set to session-only');
      } catch (err) {
        console.error('Error setting auth persistence:', err);
      }
    };
    initAuth();
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch user profile when authenticated
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign up with email and password
  const signup = async (email, password, displayName) => {
    try {
      setError(null);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Update profile with display name
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      // Save profile to Supabase
      await supabase
        .from('profiles')
        .upsert([{ 
          id: result.user.uid,
          email: email,
          display_name: displayName
        }], { onConflict: 'id' })
      
      // Fetch the newly created profile
      await fetchUserProfile(result.user.uid);
      
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sign in with email and password
  const login = async (email, password) => {
    try {
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Save/update profile in Supabase on login
      await supabase
        .from('profiles')
        .upsert([{ 
          id: result.user.uid,
          email: result.user.email,
          display_name: result.user.displayName || email.split('@')[0]
        }], { onConflict: 'id' })
      
      // Fetch user profile
      await fetchUserProfile(result.user.uid);
      
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sign in with Google
  const loginWithGoogle = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      // Save/update profile in Supabase on Google login
      await supabase
        .from('profiles')
        .upsert([{ 
          id: result.user.uid,
          email: result.user.email,
          display_name: result.user.displayName || result.user.email.split('@')[0]
        }], { onConflict: 'id' })
      
      // Fetch user profile
      await fetchUserProfile(result.user.uid);
      
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      setError(null);
      setUserProfile(null);
      await signOut(auth);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Clear error
  const clearError = () => setError(null);

  // Upload profile picture
  const uploadProfilePicture = async (file) => {
    try {
      setError(null);
      
      if (!currentUser) {
        throw new Error('You must be logged in to upload a profile picture');
      }

      const formData = new FormData();
      formData.append('profilePicture', file);
      formData.append('userId', currentUser.uid);

      // Use local server for development, deployed server for production
      const API_BASE_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : 'https://real-time-code-editor-7n13.onrender.com';
      
      const response = await fetch(`${API_BASE_URL}/api/upload-profile-picture`, {
        method: 'POST',
        body: formData
      });

      // Get response text first to check if it's JSON or HTML
      const responseText = await response.text();

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Server returned non-JSON response:', responseText);
        throw new Error('Server error: Unable to process upload. Please try again.');
      }

      if (!response.ok) {
        // If Supabase fails, store image as base64 in local state only
        console.log('Supabase save failed, storing locally...');
        
        // Create a data URL for the image and store locally
        const reader = new FileReader();
        const imageDataUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        // Update local state only (not Firebase)
        updateUserProfile({ avatar_url: imageDataUrl });
        
        return imageDataUrl;
      }

      // Update local profile state with new avatar URL
      updateUserProfile({ avatar_url: data.profilePictureUrl });
      
      // Also update Firebase profile photoURL (if URL is not too long)
      if (data.profilePictureUrl && data.profilePictureUrl.length < 2000) {
        await updateProfile(currentUser, { photoURL: data.profilePictureUrl });
      }

      return data.profilePictureUrl;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Remove profile picture
  const removeProfilePicture = async () => {
    try {
      setError(null);
      
      if (!currentUser) {
        throw new Error('You must be logged in to remove a profile picture');
      }

      // Use local server for development, deployed server for production
      const API_BASE_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : 'https://real-time-code-editor-7n13.onrender.com';
      
      const response = await fetch(`${API_BASE_URL}/api/remove-profile-picture`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: currentUser.uid })
      });

      // Get response text first to check if it's JSON or HTML
      const responseText = await response.text();

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Server returned non-JSON response:', responseText);
        // If server error, still clear local state
        updateUserProfile({ avatar_url: null });
        await updateProfile(currentUser, { photoURL: null });
        return true;
      }

      if (!response.ok) {
        // Even if server fails, try to clear local state
        updateUserProfile({ avatar_url: null });
        await updateProfile(currentUser, { photoURL: null });
        return true;
      }

      // Update local profile state to remove avatar URL
      updateUserProfile({ avatar_url: null });
      
      // Also update Firebase profile photoURL
      await updateProfile(currentUser, { photoURL: null });

      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    signup,
    login,
    loginWithGoogle,
    logout,
    clearError,
    uploadProfilePicture,
    removeProfilePicture,
    fetchUserProfile,
    updateUserProfile
  };

  // Always render the provider, but show loading state inside
  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div style={{ 
          backgroundColor: '#0a0a0a', 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ 
            color: '#00ff00', 
            fontFamily: '"Press Start 2P", cursive',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            LOADING...
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #00cc00',
            borderTop: '3px solid #00ff00',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export default AuthContext;

