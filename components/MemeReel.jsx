import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import MemeCard from './MemeCard';
import { useSpring, animated } from '@react-spring/web';
import { useGesture } from '@use-gesture/react';
import { doc, setDoc } from 'firebase/firestore'; // Import Firestore functions

// MemeReel Component: Handles fetching and displaying a reel of memes
const MemeReel = ({ onInitialVideosLoaded, db, auth, userId, appId, onOpenComments }) => { // Accept onOpenComments prop
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const observerTarget = useRef(null);
  const reelContainerRef = useRef(null);
  const initialLoadCompleted = useRef(false);

  // Pexels API Key
  const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY;

  // react-spring for animating the vertical position
  const [{ y }, api] = useSpring(() => ({ y: 0 }));

  // Debounce for wheel events (still used for keyboard-like behavior on trackpads)
  const wheelTimeout = useRef(null);
  const WHEEL_DEBOUNCE_TIME = 400; // Time in ms to wait before allowing another wheel event

  // Function to fetch videos from Pexels API
  const fetchVideos = useCallback(async (pageNum, initialRandomPage = 0) => {
    if (!PEXELS_API_KEY) {
      setError("Pexels API Key is not configured. Please get one from pexels.com/api and add it to your .env file as VITE_PEXELS_API_KEY.");
      setLoading(false);
      return;
    }
    if (!db || !userId || !appId) {
        setError("Firebase is not initialized, user ID, or app ID is not available.");
        setLoading(false);
        return;
    }

    setLoading(true);
    setError(null);
    try {
      const actualPageToFetch = initialRandomPage > 0 ? initialRandomPage : pageNum;

      const response = await fetch(`https://api.pexels.com/videos/search?query=funny+memes&per_page=15&page=${actualPageToFetch}&cachebust=${Date.now()}`, {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}. Details: ${errorText}`);
      }
      const data = await response.json();

      if (data.videos.length === 0 && actualPageToFetch > 1) {
        console.warn(`No videos found on page ${actualPageToFetch}. Falling back to page 1.`);
        await fetchVideos(1, 0);
        return;
      }

      const newVideos = data.videos
        .filter(video => video && video.id && video.video_files && video.video_files.length > 0)
        .map(video => {
          const videoFile = video.video_files.find(file => file.quality === 'hd' && video.width <= 1080) || video.video_files[0];
          const videoUrl = videoFile ? videoFile.link : '';

          const videoTitle = (typeof video.url === 'string' && video.url.split('/').pop()?.replace(/-/g, ' ').replace(/\.html$/, '')) || 'Funny Meme';

          return {
            id: String(video.id),
            url: videoUrl,
            thumbnail: video.image,
            title: videoTitle,
            description: `A hilarious video from Pexels by ${video.user.name}.`,
            likes: 0,
            comments: 0,
            photographer: video.user.name,
            photographerUrl: video.user.url,
          };
        })
        .filter(video => video.url);

      for (const video of newVideos) {
        const videoDocRef = doc(db, `artifacts/${appId}/public/data/videos`, video.id);
        await setDoc(videoDocRef, {
          title: video.title,
          url: video.url,
          thumbnail: video.thumbnail,
          photographer: video.photographer,
          photographerUrl: video.photographerUrl,
          likes: 0,
          comments: 0
        }, { merge: true });
      }

      if (initialRandomPage === 0 && pageNum === 1) {
          setVideos(newVideos);
      } else {
          setVideos(prevVideos => [...prevVideos, ...newVideos]);
      }

    } catch (e) {
      console.error("Failed to fetch videos:", e);
      setError(`Failed to load memes: ${e.message}. Please check your API key and network connection.`);
    } finally {
      setLoading(false);
      if (!initialLoadCompleted.current && pageNum === 1) {
        initialLoadCompleted.current = true;
        if (onInitialVideosLoaded) {
          onInitialVideosLoaded();
        }
      }
    }
  }, [PEXELS_API_KEY, onInitialVideosLoaded, db, userId, appId]);

  useEffect(() => {
    if (db && userId && appId) {
      const randomInitialPage = Math.floor(Math.random() * 10) + 1;
      fetchVideos(1, randomInitialPage);
    }
  }, [fetchVideos, db, userId, appId]);

  useEffect(() => {
    if (reelContainerRef.current && videos.length > 0) {
      const videoHeight = reelContainerRef.current.clientHeight;
      api.start({ y: -currentVideoIndex * videoHeight, immediate: false });
    }
  }, [currentVideoIndex, videos.length, api]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          setPage(prevPage => prevPage + 1);
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loading]);

  useEffect(() => {
    if (page > 1) {
      fetchVideos(page);
    }
  }, [page, fetchVideos]);

  // --- Keyboard Navigation ---
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (videos.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setCurrentVideoIndex(prevIndex => Math.min(prevIndex + 1, videos.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setCurrentVideoIndex(prevIndex => Math.max(prevIndex - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [videos.length]);

  // --- Click/Tap Navigation ---
  const handleClick = useCallback((event) => {
    // Check if the click originated from a button or link inside MemeCard
    const target = event.target;
    // Check if the click target or any of its ancestors is a button or an anchor tag
    if (target.closest('button') || target.closest('a')) {
      return; // Do not navigate if an interactive element was clicked
    }

    if (videos.length === 0 || !reelContainerRef.current) return;

    const rect = reelContainerRef.current.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    const containerHeight = rect.height;

    if (clickY < containerHeight / 2) {
      setCurrentVideoIndex(prevIndex => Math.max(prevIndex - 1, 0));
    } else {
      setCurrentVideoIndex(prevIndex => Math.min(prevIndex + 1, videos.length - 1));
    }
  }, [videos.length]);

  // --- Gesture Handling with useGesture (for visual drag/rubberband AND navigation) ---
  useGesture(
    {
      onDrag: ({ active, movement: [, my], cancel }) => {
        const videoHeight = reelContainerRef.current.clientHeight;
        const currentSnapY = -currentVideoIndex * videoHeight;

        const lowerBound = -(videos.length - 1) * videoHeight;
        const upperBound = 0;

        let newY = currentSnapY + my;
        if (newY < lowerBound) {
          newY = lowerBound - (lowerBound - newY) * 0.2; // Apply rubberband below
        } else if (newY > upperBound) {
          newY = upperBound + (newY - upperBound) * 0.2; // Apply rubberband above
        }

        api.start({ y: newY, immediate: true }); // Immediate visual update during drag
      },
      onDragEnd: ({ movement: [, my], velocity: [, vy], direction: [, dyDirection] }) => {
        const videoHeight = reelContainerRef.current.clientHeight;
        let newIndex = currentVideoIndex;
        const swipeThreshold = videoHeight * 0.25; // 25% of video height for a swipe
        const flickVelocityThreshold = 0.5; // Velocity to consider a "flick"

        if (Math.abs(my) > swipeThreshold || Math.abs(vy) > flickVelocityThreshold) {
          // Determine direction based on movement or velocity
          if (my < 0 || (Math.abs(vy) > flickVelocityThreshold && dyDirection > 0)) {
            newIndex = currentVideoIndex + 1; // Swiped up (next video)
          } else if (my > 0 || (Math.abs(vy) > flickVelocityThreshold && dyDirection < 0)) {
            newIndex = currentVideoIndex - 1; // Swiped down (previous video)
          }
        }
        
        // Ensure newIndex is within bounds
        newIndex = Math.max(0, Math.min(newIndex, videos.length - 1));
        setCurrentVideoIndex(newIndex);

        // Snap the spring to the new, corrected position
        api.start({ y: -newIndex * videoHeight, immediate: false });
      },
      // onWheel handler is removed as per user request for tap/swipe/keyboard navigation only
    },
    {
      target: reelContainerRef,
      eventOptions: { passive: false }, // Allows preventDefault for touchmove/wheel
      drag: {
        filterTaps: true, // Crucial: prevents drag from triggering onClick
        axis: 'y',
      },
    }
  );

  return (
    <div
      ref={reelContainerRef}
      className="relative w-full max-w-md h-[calc(100vh-150px)] md:h-[calc(100vh-200px)] overflow-y-hidden rounded-lg shadow-2xl bg-gray-900 hide-scrollbar"
      onClick={handleClick}
    >
      {videos.length === 0 && loading && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-50 text-lg">
          <Loader2 className="animate-spin mr-2" size={24} /> Loading GiggleGrid...
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 text-lg p-4 text-center">
          <AlertCircle className="mb-2" size={32} /> {error}
        </div>
      )}

      <animated.div
        style={{ y }}
        className="w-full h-full will-change-transform"
      >
        {videos.map((video, index) => (
          video ? (
            <MemeCard
              key={video.id}
              video={video}
              isActive={index === currentVideoIndex}
              isPreloaded={index >= currentVideoIndex - 2 && index <= currentVideoIndex + 2}
              db={db}
              auth={auth}
              userId={userId}
              appId={appId}
              onOpenComments={onOpenComments} // Pass the handler down
              ref={index === videos.length - 1 ? observerTarget : null}
            />
          ) : null
        ))}
      </animated.div>

      {loading && videos.length > 0 && (
        <div className="flex items-center justify-center p-4 text-gray-50">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading more...
        </div>
      )}
    </div>
  );
};

export default MemeReel;
