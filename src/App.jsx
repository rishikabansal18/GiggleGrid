import React, { useState, useRef } from "react";
import MemeReel from "./components/MemeReel";
import SplashScreen from "./components/SplashScreen";
import CommentModal from "./components/CommentModal";

const App = () => {
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const splashScreenLoadedRef = useRef(null);

  const [userId] = useState("demo-user");

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentVideoId, setCommentVideoId] = useState(null);

  const handleOpenComments = (videoId) => {
    setCommentVideoId(videoId);
    setShowCommentModal(true);
  };

  const handleCloseComments = () => {
    setShowCommentModal(false);
    setCommentVideoId(null);
  };

  return (
    <div className="min-h-screen w-screen bg-gray-950 text-gray-50 p-6">
      {showSplashScreen && <SplashScreen onLoaded={splashScreenLoadedRef} />}

      <h1 className="text-4xl font-bold mb-6">
        Giggle<span className="text-red-400">Grid</span>
      </h1>

      <MemeReel
        onInitialVideosLoaded={() => {
          if (splashScreenLoadedRef.current) {
            splashScreenLoadedRef.current();
          }
          setTimeout(() => setShowSplashScreen(false), 500);
        }}
        onOpenComments={handleOpenComments}
      />

      {showCommentModal && (
        <CommentModal
          videoId={commentVideoId}
          userId={userId}
          onClose={handleCloseComments}
        />
      )}
    </div>
  );
};

export default App;