import React, { useState, useRef, useEffect } from 'react';
import MemeReel from '../components/MemeReel';
import SplashScreen from '../components/SplashScreen';
import CommentModal from '../components/CommentModal'; // Import CommentModal here

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

// Main App Component
const App = () => {
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const splashScreenLoadedRef = useRef(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);

  // State for Comment Modal
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentVideoId, setCommentVideoId] = useState(null);

  // Get app ID with a fallback for local development
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-gigglegrid-app-id';

  // Function to open the comment modal for a specific video
  const handleOpenComments = (videoId) => {
    setCommentVideoId(videoId);
    setShowCommentModal(true);
  };

  // Function to close the comment modal
  const handleCloseComments = () => {
    setShowCommentModal(false);
    setCommentVideoId(null);
  };

  // Initialize Firebase and authenticate user
  useEffect(() => {
    try {
      // Read Firebase config from environment variables
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };

      // Ensure all necessary config values are present
      if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
        console.error("Firebase config is incomplete. Please ensure all VITE_FIREBASE_... variables are set in your .env file.");
        setUserId(crypto.randomUUID());
        setFirebaseInitialized(true);
        return;
      }

      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestore);
      setAuth(firebaseAuth);

      // Listen for auth state changes
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          setFirebaseInitialized(true);
        } else {
          try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
              await signInWithCustomToken(firebaseAuth, __initial_auth_token);
            } else {
              await signInAnonymously(firebaseAuth);
            }
          } catch (error) {
            console.error("Firebase authentication failed:", error);
            setUserId(crypto.randomUUID());
            setFirebaseInitialized(true);
          }
        }
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Error initializing Firebase:", e);
      setUserId(crypto.randomUUID());
      setFirebaseInitialized(true);
    }
  }, []);

  return (
    <div className="min-h-screen w-screen bg-gray-950 text-gray-50 font-inter overflow-hidden flex flex-col items-start p-6 md:p-8">
      {showSplashScreen && <SplashScreen onLoaded={splashScreenLoadedRef} />}

      <h1 className="text-4xl font-extrabold mb-6 text-zinc-200">
        Giggle<span className='text-red-400'>Grid</span>
      </h1>
      <div className="flex-grow w-full flex items-center justify-center">
        {firebaseInitialized ? (
          <MemeReel
            db={db}
            auth={auth}
            userId={userId}
            appId={appId}
            onInitialVideosLoaded={() => {
              if (splashScreenLoadedRef.current) {
                splashScreenLoadedRef.current();
              }
              setTimeout(() => setShowSplashScreen(false), 500);
            }}
            onOpenComments={handleOpenComments} // Pass the new handler
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full w-full text-gray-400">
            <Loader2 className="animate-spin mr-2" size={32} />
            <p className="mt-2">Initializing Firebase...</p>
          </div>
        )}
      </div>

      {/* Render CommentModal conditionally and outside MemeReel */}
      {showCommentModal && commentVideoId && (
        <CommentModal
          videoId={commentVideoId}
          db={db}
          userId={userId}
          appId={appId}
          onClose={handleCloseComments}
        />
      )}
    </div>
  );
};

export default App;
