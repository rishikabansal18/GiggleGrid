import React, { useEffect } from 'react';
import { animated, useSpring } from '@react-spring/web';
import { Loader2 } from 'lucide-react';

const SplashScreen = ({ onLoaded }) => {
  // Spring animation for fade out
  const splashProps = useSpring({
    from: { opacity: 1 },
    to: async (next) => {
      // Wait for `onLoaded` to be called externally
      await new Promise(resolve => {
        // This promise is resolved by the `onLoaded` function when data is ready
        // We pass `resolve` to `onLoaded` so MemeReel can signal completion.
        onLoaded.current = resolve;
      });
      await next({ opacity: 0 }); // Fade out
    },
    config: { duration: 500 }, // Fade out duration
    onRest: () => {
      // Once animation is complete, you might trigger a state change in App.jsx
      // to unmount this component and show the main app.
    }
  });

  return (
    <animated.div
      style={splashProps}
      className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center z-50 text-white"
    >
      <h1 className="text-4xl font-extrabold mb-6 text-zinc-200">
        Giggle<span className='text-red-400'>Grid</span>
      </h1>
      <Loader2 className="animate-spin text-purple-400" size={48} />
      <p className="mt-4 text-gray-300 text-lg">Loading your daily dose of laughs...</p>
    </animated.div>
  );
};

export default SplashScreen;
