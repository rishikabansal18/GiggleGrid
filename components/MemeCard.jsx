import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, VolumeX, Volume2 } from 'lucide-react';
import { doc, updateDoc, increment, getDoc, setDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
// CommentModal import removed as it's now handled by App.jsx

// MemeCard Component: Displays a single meme video with its details and interaction buttons
const MemeCard = React.forwardRef(({ video, isActive, isPreloaded, db, auth, userId, appId, onOpenComments }, ref) => { // Added onOpenComments prop
  // Defensive checks for video and its properties during state initialization
  const initialLikes = (video && typeof video.likes === 'number') ? video.likes : 0;
  const initialComments = (video && typeof video.comments === 'number') ? video.comments : 0;

  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [currentLikes, setCurrentLikes] = useState(initialLikes); // Use defensive initial value
  const [currentCommentsCount, setCurrentCommentsCount] = useState(initialComments); // Use defensive initial value
  // showCommentModal state removed as it's now managed by App.jsx

  // Effect to control video playback based on isActive prop
  useEffect(() => {
    const currentVideo = videoRef.current;
    if (currentVideo) {
      if (isActive) {
        currentVideo.play().then(() => {
          if (currentVideo.muted) {
            setShowUnmuteHint(true);
          } else {
            setShowUnmuteHint(false);
          }
        }).catch(error => {
          console.warn("Autoplay prevented:", error);
          currentVideo.muted = true;
          setIsMuted(true);
          setShowUnmuteHint(true);
          currentVideo.play().catch(e => console.error("Failed to play video even when muted:", e));
        });
      } else {
        currentVideo.pause();
        currentVideo.currentTime = 0;
        setShowUnmuteHint(false);
      }
    }
  }, [isActive, video?.url]);

  // Function to toggle mute status
  const toggleMute = (event) => {
    event.stopPropagation(); // Stop propagation
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
      setShowUnmuteHint(false);
    }
  };

  // --- Firebase Likes Integration ---
  useEffect(() => {
    // Ensure all necessary props are available before attempting Firebase operations
    if (!db || !userId || !video?.id || !appId) return;

    const videoDocRef = doc(db, `artifacts/${appId}/public/data/videos`, video.id);
    const userLikeRef = doc(db, `artifacts/${appId}/public/data/videos/${video.id}/usersLiked`, userId);

    // Check if user has liked this video
    const checkLikeStatus = async () => {
      try {
        const docSnap = await getDoc(userLikeRef);
        setHasLiked(docSnap.exists() && docSnap.data()?.liked);
      } catch (e) {
        console.error("Error checking like status:", e);
      }
    };
    checkLikeStatus();

    // Listen for real-time updates to the video's like count
    const unsubscribeLikes = onSnapshot(videoDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentLikes(data.likes || 0);
      }
    }, (error) => {
      console.error("Error listening to likes:", error);
    });

    // Listen for real-time updates to the comments count (from sub-collection size)
    const commentsCollectionRef = collection(db, `artifacts/${appId}/public/data/videos/${video.id}/comments`);
    const unsubscribeComments = onSnapshot(commentsCollectionRef, (snapshot) => {
      setCurrentCommentsCount(snapshot.size); // Update count based on sub-collection size
    }, (error) => {
      console.error("Error listening to comments count:", error);
    });

    return () => {
      unsubscribeLikes();
      unsubscribeComments();
    };
  }, [db, userId, video?.id, appId]);

  const handleLike = async (event) => {
    event.stopPropagation(); // Stop propagation
    if (!db || !userId || !video?.id || !appId) return;

    const videoDocRef = doc(db, `artifacts/${appId}/public/data/videos`, video.id);
    const userLikeDocRef = doc(db, `artifacts/${appId}/public/data/videos/${video.id}/usersLiked`, userId);

    try {
      if (hasLiked) {
        await updateDoc(videoDocRef, { likes: increment(-1) });
        await setDoc(userLikeDocRef, { liked: false }, { merge: true });
        setHasLiked(false);
      } else {
        await updateDoc(videoDocRef, { likes: increment(1) }, { merge: true });
        await setDoc(userLikeDocRef, { liked: true, timestamp: serverTimestamp() });
        setHasLiked(true);
      }
    } catch (error) {
      console.error("Error updating like:", error);
    }
  };

  const handleCommentClick = (event) => {
    event.stopPropagation(); // Stop propagation
    if (onOpenComments && video?.id) { // Ensure handler and video ID exist
      onOpenComments(video.id); // Call the prop function
    }
  };

  const handleShareClick = (event) => {
    event.stopPropagation(); // Stop propagation
    console.log("Share button clicked for video:", video?.id);
    if (navigator.share && video?.title && video?.description && video?.url) {
      navigator.share({
        title: video.title,
        text: video.description,
        url: video.url,
      }).catch((error) => console.error('Error sharing:', error));
    } else {
      alert('Share functionality not supported or video details missing. You can copy the video URL: ' + (video?.url || ''));
    }
  };

  // Render nothing if video prop is null or undefined
  if (!video) {
    return null;
  }

  return (
    <div
      ref={ref}
      className="relative w-full h-full flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden flex-shrink-0"
      style={{ height: '100%' }}
    >
      {isPreloaded ? (
        <video
          ref={videoRef}
          src={video.url}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted={isMuted}
          playsInline
          onError={(e) => console.error("Video error:", e.message || e.target.error || "An unknown video error occurred. Check video URL.")}
          preload="auto"
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gray-800 flex items-center justify-center text-gray-400">
          Video not loaded (scroll closer)
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 flex flex-col justify-end p-4">
        <button
          onClick={toggleMute}
          className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-gray-50 hover:bg-black/70 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-50 focus:ring-opacity-50"
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        {isActive && isMuted && showUnmuteHint && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 text-gray-50 px-4 py-2 rounded-full text-sm animate-pulse">
            Tap to Unmute
          </div>
        )}

        <div className="flex justify-between items-end w-full">
          <div className="flex-1 pr-4 text-shadow-md">
            <h2 className="text-gray-50 text-xl font-bold mb-1 line-clamp-2">
              {video.title}
            </h2>
            <p className="text-gray-300 text-sm mb-2 line-clamp-3">
              {video.description}
            </p>
            <a
              href={video.photographerUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-500 text-xs hover:underline"
            >
              By {video.photographer} (Pexels)
            </a>
          </div>

          <div className="flex flex-col items-center space-y-5">
            {/* Like Button */}
            <button
              onClick={handleLike}
              className={`flex flex-col items-center transition-transform transform hover:scale-110 active:scale-95 ${hasLiked ? 'text-red-500' : 'text-gray-50'}`}
            >
              <Heart className="w-8 h-8 drop-shadow-lg" fill={hasLiked ? 'currentColor' : 'none'} />
              <span className="text-sm font-semibold mt-1">
                {currentLikes >= 1000000
                  ? (currentLikes / 1000000).toFixed(1) + 'M'
                  : currentLikes >= 1000
                  ? (currentLikes / 1000).toFixed(1) + 'K'
                  : currentLikes}
              </span>
            </button>

            {/* Comment Button */}
            <button
              onClick={handleCommentClick} // This now calls the prop function
              className="flex flex-col items-center text-gray-50 transition-transform transform hover:scale-110 active:scale-95"
            >
              <MessageCircle className="w-8 h-8 drop-shadow-lg" />
              <span className="text-sm font-semibold mt-1">
                {currentCommentsCount >= 1000000
                  ? (currentCommentsCount / 1000000).toFixed(1) + 'M'
                  : currentCommentsCount >= 1000
                  ? (currentCommentsCount / 1000).toFixed(1) + 'K'
                  : currentCommentsCount}
              </span>
            </button>

            {/* Share Button */}
            <button
              onClick={handleShareClick}
              className="flex flex-col items-center text-gray-50 transition-transform transform hover:scale-110 active:scale-95"
            >
              <Share2 className="w-8 h-8 drop-shadow-lg" />
              <span className="text-sm font-semibold mt-1">Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comment Modal is now rendered by App.jsx, so remove it from here */}
    </div>
  );
});

export default MemeCard;
