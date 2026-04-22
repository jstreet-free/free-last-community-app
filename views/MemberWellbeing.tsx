
import React, { useState } from 'react';
import { MoodLog, User } from '../types';
import { Icons } from '../constants';
import { getWellbeingSupport } from '../services/geminiService';

interface MemberWellbeingProps {
  user: User;
}

const EMOTIONS = [
  { label: 'Happy', emoji: '😊', color: 'bg-yellow-100 text-yellow-700' },
  { label: 'Grateful', emoji: '🙏', color: 'bg-emerald-100 text-emerald-700' },
  { label: 'Inspired', emoji: '✨', color: 'bg-purple-100 text-purple-700' },
  { label: 'Tired', emoji: '😴', color: 'bg-blue-100 text-blue-700' },
  { label: 'Stressed', emoji: '🤯', color: 'bg-orange-100 text-orange-700' },
  { label: 'Sad', emoji: '😢', color: 'bg-indigo-100 text-indigo-700' },
];

export const MemberWellbeing: React.FC<MemberWellbeingProps> = ({ user }) => {
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [impactText, setImpactText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmotion || !impactText) return;

    setIsSubmitting(true);
    const aiFeedback = await getWellbeingSupport(selectedEmotion, impactText);
    
    const newLog: MoodLog = {
      id: Date.now().toString(),
      memberId: user.id,
      date: new Date().toISOString(),
      emotion: selectedEmotion,
      impactText: impactText,
      aiResponse: aiFeedback
    };

    setLogs([newLog, ...logs]);
    setSelectedEmotion('');
    setImpactText('');
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-gray-900">Personal Wellbeing Hub</h1>
        <p className="text-gray-600 mt-2">Reflect on your journey and see how far you've come.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-6">How are you feeling today?</h2>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {EMOTIONS.map(e => (
              <button
                key={e.label}
                type="button"
                onClick={() => setSelectedEmotion(e.label)}
                className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                  selectedEmotion === e.label 
                    ? 'border-sky-500 bg-sky-50 scale-105 shadow-md' 
                    : 'border-transparent bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className="text-2xl mb-1">{e.emoji}</span>
                <span className="text-xs font-bold text-gray-700">{e.label}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">How has free@last helped you lately?</label>
            <textarea 
              required
              placeholder="E.g. The coding session helped me feel more confident about my future career..."
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:outline-none h-32 transition-all"
              value={impactText}
              onChange={e => setImpactText(e.target.value)}
            />
          </div>

          <div className="flex justify-center">
            <button 
              type="submit"
              disabled={isSubmitting || !selectedEmotion || !impactText}
              className={`px-12 py-4 rounded-full font-bold text-white shadow-xl transition-all ${
                isSubmitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-sky-600 hover:bg-sky-700 active:scale-95'
              }`}
            >
              {isSubmitting ? 'Reflecting...' : 'Log Wellbeing Entry'}
            </button>
          </div>
        </form>
      </div>

      {logs.length > 0 && (
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-gray-900">Your Journey</h2>
          {logs.map(log => (
            <div key={log.id} className="relative pl-8 border-l-2 border-sky-100 py-2">
              <div className="absolute -left-[9px] top-4 w-4 h-4 rounded-full bg-sky-500 border-4 border-white shadow-sm"></div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-3">
                     <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700">
                       {log.emotion}
                     </span>
                     <span className="text-xs text-gray-400 font-medium">
                       {new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                     </span>
                   </div>
                </div>
                
                <p className="text-gray-700 mb-4 leading-relaxed italic">"{log.impactText}"</p>
                
                {log.aiResponse && (
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mt-4 flex gap-3">
                    <div className="text-emerald-500 flex-shrink-0">
                      <Icons.Heart />
                    </div>
                    <div className="text-sm text-emerald-900 leading-relaxed">
                      <strong>Community Voice:</strong> {log.aiResponse}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
