
import React, { useState } from 'react';
import { MoodLog, User } from '../types';
import { Icons, COLORS } from '../constants';
import { getWellbeingSupport } from '../services/geminiService';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../services/firestoreUtils';

interface MemberWellbeingProps {
  user: User;
  logs: MoodLog[];
}

const EMOTIONS = [
  { label: 'Happy', emoji: '😊', color: 'bg-yellow-100 text-yellow-700', type: 'positive' },
  { label: 'Grateful', emoji: '🙏', color: 'bg-emerald-100 text-emerald-700', type: 'positive' },
  { label: 'Inspired', emoji: '✨', color: 'bg-purple-100 text-purple-700', type: 'positive' },
  { label: 'Tired', emoji: '😴', color: 'bg-blue-100 text-blue-700', type: 'neutral' },
  { label: 'Stressed', emoji: '🤯', color: 'bg-orange-100 text-orange-700', type: 'negative' },
  { label: 'Sad', emoji: '😢', color: 'bg-indigo-100 text-indigo-700', type: 'negative' },
];

export const MemberWellbeing: React.FC<MemberWellbeingProps> = ({ user, logs }) => {
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [impactText, setImpactText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmotion || !impactText) return;

    setIsSubmitting(true);
    const emotionData = EMOTIONS.find(em => em.label === selectedEmotion);
    const isUrgent = emotionData?.type === 'negative';
    
    const aiFeedback = await getWellbeingSupport(selectedEmotion, impactText);
    
    try {
      // 1. Save to wellbeing_logs
      const logData = {
        memberId: user.id,
        memberName: user.name || 'Anonymous',
        date: new Date().toISOString(),
        emotion: selectedEmotion,
        impactText: impactText,
        aiResponse: aiFeedback,
        isUrgent: isUrgent
      };

      await addDoc(collection(db, 'wellbeing_logs'), logData);

      // 2. If negative, trigger urgent email notification to admin
      if (isUrgent) {
        await addDoc(collection(db, 'mail'), {
          to: ['jstreet@freeatlast.co.uk', 'info@freeatlast.co.uk'],
          message: {
            subject: `URGENT: Negative Wellbeing Log from ${user.name || 'a team member'}`,
            text: `${user.name} for the department ${user.department || 'Unknown'} reported feeling ${selectedEmotion}.\n\nReflection: "${impactText}"`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; border: 2px solid #ef4444; border-radius: 12px;">
                <h2 style="color: #ef4444;">Urgent Wellbeing Alert</h2>
                <p><strong>Team Member:</strong> ${user.name || 'Anonymous'}</p>
                <p><strong>Department:</strong> ${user.department || 'N/A'}</p>
                <p><strong>Reported Feeling:</strong> ${selectedEmotion} ${emotionData?.emoji}</p>
                <hr style="border: 0; border-top: 1px solid #fee2e2; margin: 20px 0;">
                <p><strong>Their Reflection:</strong></p>
                <blockquote style="background: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; font-style: italic;">
                  "${impactText}"
                </blockquote>
                <p style="font-size: 12px; color: #666; margin-top: 20px;">This email was triggered automatically because a member reported a negative mood state.</p>
              </div>
            `
          }
        });
      }

      setSelectedEmotion('');
      setImpactText('');
    } catch (error) {
      console.error("Error saving wellbeing log:", error);
      try {
        handleFirestoreError(error, OperationType.WRITE, 'wellbeing_logs');
      } catch (err) {}
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLog = async (logId: string) => {
    try {
      await updateDoc(doc(db, 'wellbeing_logs', logId), { impactText: editText });
      setEditingLogId(null);
      setEditText('');
    } catch (error) {
      console.error("Error updating log:", error);
      alert("Failed to update log.");
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm("Are you sure you want to delete this log?")) return;
    try {
      await deleteDoc(doc(db, 'wellbeing_logs', logId));
    } catch (error) {
      console.error("Error deleting log:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-gray-900 brand-heading uppercase tracking-tight">Personal Wellbeing Hub</h1>
        <p className="text-gray-600 mt-2 font-light">Reflect on your journey and see how far you've come.</p>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-10 mb-12 transform transition-all hover:shadow-2xl">
        <h2 className="text-xl font-bold text-gray-900 mb-8 brand-heading uppercase tracking-widest">How are you feeling today?</h2>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {EMOTIONS.map(e => (
              <button
                key={e.label}
                type="button"
                onClick={() => setSelectedEmotion(e.label)}
                className={`flex flex-col items-center p-6 rounded-3xl border-2 transition-all ${
                  selectedEmotion === e.label 
                    ? 'border-brand-orange bg-brand-orange/5 scale-105 shadow-lg' 
                    : 'border-slate-50 bg-slate-50/50 hover:bg-slate-100'
                }`}
              >
                <span className="text-3xl mb-2">{e.emoji}</span>
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest brand-heading">{e.label}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest brand-heading mb-3 ml-2">How has free@last helped you lately?</label>
            <textarea 
              required
              placeholder="E.g. The coding session helped me feel more confident about my future career..."
              className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-2 focus:ring-brand-orange focus:bg-white outline-none h-40 transition-all font-light leading-relaxed"
              value={impactText}
              onChange={e => setImpactText(e.target.value)}
            />
          </div>

          <div className="flex justify-center">
            <button 
              type="submit"
              disabled={isSubmitting || !selectedEmotion || !impactText}
              className="px-12 py-5 bg-brand-dark-blue hover:bg-brand-orange rounded-full font-bold text-white shadow-xl transition-all active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed uppercase tracking-widest text-xs brand-heading"
            >
              {isSubmitting ? 'Processing Reflection...' : 'Log Wellbeing Entry'}
            </button>
          </div>
        </form>
      </div>

      {logs.length > 0 && (
        <div className="space-y-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 brand-heading uppercase tracking-tight">
              {user.role === 'admin' ? "Team Journey Logs" : "Your Journey"}
            </h2>
            {user.role === 'admin' && (
              <span className="text-[10px] font-black text-brand-orange uppercase tracking-widest p-2 bg-brand-orange/5 rounded-lg">Admin View</span>
            )}
          </div>
          <div className="space-y-6">
            {logs.map(log => (
              <div key={log.id} className="relative pl-8 border-l-2 border-slate-100 py-2 group">
                <div className={`absolute -left-[9px] top-6 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-colors ${log.isUrgent ? 'bg-red-500' : 'bg-brand-light-blue'}`}></div>
                
                <div className={`bg-white p-8 rounded-[2rem] shadow-sm border transition-all hover:shadow-md ${log.isUrgent ? 'border-red-100 bg-red-50/10' : 'border-gray-50'}`}>
                  <div className="flex items-center justify-between mb-6">
                     <div className="flex items-center gap-4">
                       <div className="flex flex-col">
                         {user.role === 'admin' && (
                           <span className="text-[9px] font-black text-brand-dark-blue uppercase tracking-widest brand-heading mb-1">{log.memberName}</span>
                         )}
                         <div className="flex items-center gap-3">
                           <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest brand-heading ${EMOTIONS.find(e => e.label === log.emotion)?.color || 'bg-slate-100 text-slate-700'}`}>
                             {log.emotion} {EMOTIONS.find(e => e.label === log.emotion)?.emoji}
                           </span>
                           <span className="text-[10px] text-slate-400 font-bold brand-heading uppercase">
                             {new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                           </span>
                         </div>
                       </div>
                     </div>
                     {user.role === 'admin' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setEditingLogId(log.id);
                              setEditText(log.impactText);
                            }}
                            className="p-2 text-slate-300 hover:text-brand-orange transition-colors"
                          >
                            <Icons.Key />
                          </button>
                          <button 
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Icons.Camera className="rotate-45" /> 
                          </button>
                        </div>
                     )}
                  </div>
                  
                  {editingLogId === log.id ? (
                    <div className="space-y-4">
                      <textarea 
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-brand-orange"
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleUpdateLog(log.id)}
                          className="px-4 py-2 bg-brand-orange text-white rounded-lg text-[10px] font-bold uppercase tracking-widest"
                        >
                          Save Changes
                        </button>
                        <button 
                          onClick={() => setEditingLogId(null)}
                          className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-600 text-lg font-light leading-relaxed italic">"{log.impactText}"</p>
                  )}
                  
                  {log.aiResponse && !editingLogId && (
                    <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100/50 mt-6 flex gap-4">
                      <div className="text-emerald-500 flex-shrink-0 mt-1">
                        <Icons.Heart />
                      </div>
                      <div className="text-sm text-emerald-900 leading-relaxed font-medium">
                        <span className="text-[9px] font-black uppercase tracking-widest block mb-1 opacity-60">Community Voice</span>
                        {log.aiResponse}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
