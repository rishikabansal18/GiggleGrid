import React, { useState } from "react";

const CommentModal = ({ videoId, userId, onClose }) => {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);

  const addComment = () => {
    if (!comment.trim()) return;

    const newComment = {
      id: Date.now(),
      text: comment,
      user: userId,
    };

    setComments([...comments, newComment]);
    setComment("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center">
      <div className="bg-zinc-900 p-6 rounded-xl w-96">
        <h2 className="text-lg mb-4">Comments</h2>

        <div className="max-h-40 overflow-y-auto mb-3">
          {comments.map((c) => (
            <p key={c.id} className="text-sm">
              {c.text}
            </p>
          ))}
        </div>

        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full p-2 bg-zinc-800 rounded"
          placeholder="Write a comment..."
        />

        <button
          onClick={addComment}
          className="mt-2 bg-blue-500 px-4 py-2 rounded"
        >
          Add
        </button>

        <button
          onClick={onClose}
          className="mt-2 ml-2 text-red-400"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default CommentModal;