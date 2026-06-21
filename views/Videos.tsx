import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Icons, COLORS } from '../constants';
import { User, YouTubeVideo } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../services/firestoreUtils';

interface VideosProps {
  user: User | null;
}

export const Videos: React.FC<VideosProps> = ({ user }) => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<YouTubeVideo | null>(null);

  const [form, setForm] = useState({
    title: '',
    url: '',
    description: ''
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const path = 'youtube_videos';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const list: YouTubeVideo[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as YouTubeVideo);
      });
      // Sort newest first
      list.sort((a,b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
      setVideos(list);
      setLoading(false);
    }, (error) => {
      console.error("Failed to load videos:", error);
      setLoading(false);
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err) {}
    });

    return () => unsubscribe();
  }, []);

  const getYoutubeId = (url: string) => {
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    } catch (e) {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.url) {
      alert("Please fill in Title and URL.");
      return;
    }

    const videoId = getYoutubeId(form.url);
    if (!videoId) {
      alert("Please provide a valid YouTube URL (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ).");
      return;
    }

    const payload = {
      title: form.title,
      url: form.url,
      description: form.description || '',
      addedAt: editingVideo ? editingVideo.addedAt : new Date().toISOString()
    };

    const path = 'youtube_videos';
    try {
      if (editingVideo) {
        await updateDoc(doc(db, path, editingVideo.id), payload);
        alert("Video link updated successfully!");
      } else {
        await addDoc(collection(db, path), payload);
        alert("Video link added successfully!");
      }
      setForm({ title: '', url: '', description: '' });
      setEditingVideo(null);
      setShowAddModal(false);
    } catch (error) {
      console.error("Failed to save video:", error);
      alert("Error saving video details.");
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch (err) {}
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!window.confirm("Are you sure you want to delete this video link?")) return;
    const path = 'youtube_videos';
    try {
      await deleteDoc(doc(db, path, videoId));
    } catch (error) {
      console.error("Failed to delete video:", error);
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch (err) {}
    }
  };

  const handleEdit = (video: YouTubeVideo) => {
    setEditingVideo(video);
    setForm({
      title: video.title,
      url: video.url,
      description: video.description || ''
    });
    setShowAddModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
        <div>
          <span style={{ color: COLORS.orange }} className="text-xs font-black uppercase tracking-[0.2em] brand-heading block mb-3">Our Media Space</span>
          <h1 style={{ color: COLORS.secondary }} className="text-5xl font-black mb-4 brand-heading uppercase tracking-tight leading-none">YouTube Channel</h1>
          <p className="text-slate-400 text-lg font-light max-w-2xl">
            Watch the latest news, activities, event recaps, and inspiring stories directly from Nechells free@last media hub.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setEditingVideo(null);
              setForm({ title: '', url: '', description: '' });
              setShowAddModal(true);
            }}
            style={{ backgroundColor: COLORS.orange }}
            className="flex items-center gap-3 text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:brightness-110 shadow-lg active:scale-95 transition-all brand-heading"
          >
            <Icons.Plus />
            <span>Add Video Link</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-slate-100 max-w-3xl mx-auto p-10">
          <div style={{ color: COLORS.orange }} className="mb-6 flex justify-center text-5xl">▶️</div>
          <h3 style={{ color: COLORS.secondary }} className="text-2xl font-black mb-2 brand-heading uppercase">No Videos Added Yet</h3>
          <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm font-medium">
            Our administrators have not linked any YouTube channel videos yet. Check back soon for exciting recaps!
          </p>
          <a
            href="https://www.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ backgroundColor: COLORS.secondary }}
            className="inline-block text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:brightness-110 shadow-lg"
          >
            Visit Our Main Channel
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {videos.map((video) => {
            const ytId = getYoutubeId(video.url);
            return (
              <div 
                key={video.id} 
                className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col p-6 hover:shadow-xl transition-all h-full"
              >
                {/* Embed video container */}
                {ytId ? (
                  <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-sm bg-slate-900 mb-6">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      title={video.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full"
                    ></iframe>
                  </div>
                ) : (
                  <div className="w-full aspect-video rounded-2xl bg-slate-100 flex flex-col items-center justify-center p-6 text-center mb-6">
                    <span className="text-4xl mb-2">🎞️</span>
                    <a 
                      href={video.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="font-bold underline text-brand-orange text-sm mb-1"
                    >
                      Watch on YouTube
                    </a>
                    <span className="text-[10px] text-slate-400 font-mono break-all">{video.url}</span>
                  </div>
                )}

                <div className="flex-grow flex flex-col px-2">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <h3 style={{ color: COLORS.secondary }} className="text-xl font-black brand-heading uppercase tracking-tight leading-snug">
                      {video.title}
                    </h3>
                    
                    {isAdmin && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleEdit(video)}
                          className="p-2 text-slate-400 hover:text-brand-orange bg-slate-50 hover:bg-orange-50 rounded-lg transition-colors border border-slate-100"
                          title="Edit link details"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(video.id)}
                          className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors border border-slate-100"
                          title="Delete link"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {video.description && (
                    <p className="text-slate-500 text-sm font-light leading-relaxed mb-6">
                      {video.description}
                    </p>
                  )}

                  <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 brand-heading tracking-widest">
                    <span>Uploaded Link</span>
                    <span>
                      {new Date(video.addedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Link Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-brand-dark-blue/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden"
            >
              <div style={{ backgroundColor: COLORS.secondary }} className="p-12 text-white relative">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors text-3xl font-bold"
                >
                  ✕
                </button>
                <div style={{ color: COLORS.yellow }} className="mb-6 text-3xl">🎥</div>
                <h2 className="text-3xl font-black brand-heading uppercase tracking-tight leading-none mb-3">
                  {editingVideo ? "Edit Video Link" : "Link YouTube Video"}
                </h2>
                <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] brand-heading">
                  Highlight key activities or news from your YouTube channel
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-12 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading px-2">Video Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Summer Camp 2024 Highlights"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none transition-all font-bold text-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading px-2">YouTube URL</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., https://www.youtube.com/watch?v=..."
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none transition-all font-bold text-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading px-2">Brief Description (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Provide a quick synopsis of the video clip"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none transition-all font-bold text-slate-600 resize-none"
                  />
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    style={{ backgroundColor: COLORS.orange }}
                    className="w-full py-6 rounded-2xl text-white font-black text-lg brand-heading uppercase tracking-[0.2em] shadow-xl hover:brightness-110 transition-all active:scale-95"
                  >
                    {editingVideo ? "Update Video Link" : "Add Video Link"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
