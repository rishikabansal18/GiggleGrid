import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

const CommentModal = ({ videoId, db, userId, appId, onClose }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const commentsEndRef = useRef(null); // Ref for auto-scrolling comments

  useEffect(() => {
    if (!db || !videoId || !appId) return;

    // Listen for real-time updates to comments for this video
    const commentsCollectionRef = collection(db, `artifacts/${appId}/public/data/videos/${videoId}/comments`);
    const q = query(commentsCollectionRef, orderBy('timestamp', 'asc')); // Order by timestamp

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComments(fetchedComments);
    }, (error) => {
      console.error("Error fetching comments:", error);
      // Handle error display if needed
    });

    return () => unsubscribe(); // Unsubscribe on unmount
  }, [db, videoId, appId]); // Add appId to dependency array

  // Scroll to the latest comment when comments update
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const handleAddComment = async () => {
    if (!db || !videoId || !userId || !appId || newComment.trim() === '') return;

    try {
      const commentsCollectionRef = collection(db, `artifacts/${appId}/public/data/videos/${videoId}/comments`);
      await addDoc(commentsCollectionRef, {
        userId: userId,
        text: newComment.trim(),
        timestamp: serverTimestamp() // Use server timestamp for consistency
      });
      setNewComment(''); // Clear input after sending
    } catch (error) {
      console.error("Error adding comment:", error);
      // Handle error display if needed
    }
  };

  return (
    // Modal Overlay: Fixed position, covers entire screen, high z-index
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 md:p-8"> {/* Increased z-index, added md:p-8 */}
      {/* Modal Content Box */}
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md h-full max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 scale-100 opacity-100"> {/* Added shadow-2xl, max-h-[90vh], and transition for potential future animations */}
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0"> {/* flex-shrink-0 to prevent header from shrinking */}
          <h2 className="text-xl font-bold text-gray-50">Comments</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors text-gray-400">
            <X size={24} />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {comments.length === 0 ? (
            <p className="text-gray-400 text-center mt-4">No comments yet. Be the first!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-gray-700 p-3 rounded-lg break-words"> {/* Added break-words */}
                <div className="flex items-center mb-1">
                  <User size={16} className="text-gray-400 mr-2 flex-shrink-0" /> {/* flex-shrink-0 for icon */}
                  <span className="font-semibold text-gray-200 text-sm flex-grow min-w-0 truncate"> {/* flex-grow, min-w-0, truncate for long user IDs */}
                    {comment.userId ? `${comment.userId.substring(0, 8)}...${comment.userId.substring(comment.userId.length - 4)}` : 'Anonymous'}
                  </span>
                  {comment.timestamp && (
                    <span className="text-gray-400 text-xs ml-auto flex-shrink-0"> {/* ml-auto, flex-shrink-0 for timestamp */}
                      {new Date(comment.timestamp.toDate()).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-gray-50 text-sm">{comment.text}</p>
              </div>
            ))
          )}
          <div ref={commentsEndRef} /> {/* For auto-scrolling */}
        </div>

        {/* Comment Input */}
        <div className="p-4 border-t border-gray-700 flex items-center flex-shrink-0"> {/* flex-shrink-0 to prevent input area from shrinking */}
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-gray-700 text-gray-50 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 mr-2"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddComment();
              }
            }}
          />
          <button
            onClick={handleAddComment}
            className="p-2 bg-purple-600 rounded-full text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            disabled={newComment.trim() === ''}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
