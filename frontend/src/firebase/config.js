// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserSessionPersistence } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCtnNZAaO6ct92AOMrsXuV8heHNj0Vala8",
  authDomain: "collabcode-ecc2e.firebaseapp.com",
  projectId: "collabcode-ecc2e",
  storageBucket: "collabcode-ecc2e.firebasestorage.app",
  messagingSenderId: "792272194603",
  appId: "1:792272194603:web:2df7be030682c4678d6e6e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Set session persistence to browser-specific (NOT shared across tabs/windows)
// This ensures each browser/tab has its own independent session
setPersistence(auth, browserSessionPersistence)
  .catch((error) => {
    console.error("Error setting auth persistence:", error);
  });

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

export default app;

