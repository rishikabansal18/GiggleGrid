import React, { useEffect, useState } from "react";

const MemeReel = ({ onInitialVideosLoaded, onOpenComments }) => {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMemes = async () => {
    try {
      const res = await fetch("https://meme-api.com/gimme/12");
      const data = await res.json();

      const formatted = data.memes.map((meme, index) => ({
        id: index,
        title: meme.title,
        url: meme.url,
      }));

      setMemes(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      onInitialVideosLoaded();
    }
  };

  useEffect(() => {
    fetchMemes();
  }, []);

  if (loading) {
    return <p className="text-gray-400">Loading memes...</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {memes.map((meme) => (
        <div key={meme.id} className="bg-zinc-900 p-3 rounded-xl">
          <img
            src={meme.url}
            alt={meme.title}
            className="w-full h-60 object-cover rounded-lg"
          />
          <p className="mt-2 text-sm">{meme.title}</p>

          <button
            onClick={() => onOpenComments(meme.id)}
            className="mt-2 text-blue-400"
          >
            💬 Comment
          </button>
        </div>
      ))}
    </div>
  );
};

export default MemeReel;