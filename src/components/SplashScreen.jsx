import React, { useEffect } from "react";

const SplashScreen = ({ onLoaded }) => {
  useEffect(() => {
    if (onLoaded && typeof onLoaded === "object") {
      onLoaded.current = () => {};
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center text-white text-3xl">
      Loading GiggleGrid...
    </div>
  );
};

export default SplashScreen;