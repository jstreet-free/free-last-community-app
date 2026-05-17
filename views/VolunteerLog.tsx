
import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { TeamLog, User } from '../types';
import { Icons, COLORS } from '../constants';
import { summarizeTeamImpact } from '../services/geminiService';

interface TeamPortalProps {
  user: User;
  logs: TeamLog[];
}

export const VolunteerLogView: React.FC<TeamPortalProps> = ({ user, logs }) => {
  const [isLogging, setIsLogging] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    sessionName: '',
    category: 'Youth Club',
    hours: 1,
    date: new Date().toISOString().split('T')[0],
    description: '',
    attendeesCount: 0,
    outcome: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const newLogData = {
        teamMemberId: user.id,
        teamMemberName: user.name || user.email,
        ...formData,
        timestamp: serverTimestamp()
      };
      
      await addDoc(collection(db, 'team_logs'), newLogData);
      
      setIsLogging(false);
      setFormData({
        sessionName: '',
        category: 'Youth Club',
        hours: 1,
        date: new Date().toISOString().split('T')[0],
        description: '',
        attendeesCount: 0,
        outcome: ''
      });
      
      // Provide positive feedback
      alert("Session report successfully recorded! Your contribution has been added to our impact tracking.");
    } catch (error) {
      console.error("Error saving log:", error);
      alert("Failed to save session report. This might be a temporary connection issue. Please try again or contact the hub administrator.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSummarize = async () => {
    if (logs.length === 0) return;
    setIsSummarizing(true);
    const result = await summarizeTeamImpact(logs);
    setSummary(result);
    setIsSummarizing(false);
  };

  const totalHours = logs.reduce((sum, log) => sum + log.hours, 0);
  const totalValue = totalHours * 15;

  return (
    <div className="max-w-4xl mx-auto px-4 py-20 animate-fadeIn">
      <div className="bg-brand-dark-blue rounded-3xl shadow-xl overflow-hidden mb-12">
        <div className="p-10 text-white border-b border-white/5">
          <h1 className="text-4xl font-bold brand-heading uppercase tracking-widest">Team Dashboard</h1>
          <p className="text-white/60 mt-3 text-lg font-light">Record session impact and track your contribution to the community.</p>
        </div>
        
        <div className="p-10 grid grid-cols-1 sm:grid-cols-3 gap-8 bg-white/5">
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center">
            <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest brand-heading mb-2">Total Service Hours</div>
            <div style={{ color: COLORS.orange }} className="text-4xl font-bold brand-heading">{totalHours} <span className="text-xs text-white/30 uppercase tracking-tighter">hrs</span></div>
          </div>
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center">
            <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest brand-heading mb-2">Social Value Generated</div>
            <div style={{ color: COLORS.green }} className="text-4xl font-bold brand-heading">£{totalValue.toLocaleString()}</div>
          </div>
          <div className="flex items-center">
            <button 
              onClick={() => setIsLogging(true)}
              style={{ backgroundColor: COLORS.orange }}
              className="w-full text-white px-8 py-5 rounded-2xl font-bold text-lg hover:brightness-110 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 brand-heading uppercase tracking-widest"
            >
              <Icons.Plus /> Record Session
            </button>
          </div>
        </div>
      </div>

      {isLogging && (
        <div className="bg-white rounded-3xl border-2 border-brand-orange/30 p-10 mb-12 animate-slideIn shadow-2xl">
          <div className="flex items-center justify-between mb-10">
            <h2 style={{ color: COLORS.secondary }} className="text-2xl font-bold brand-heading uppercase">Detailed Session Report</h2>
            <button onClick={() => setIsLogging(false)} className="text-gray-300 hover:text-gray-600 transition-colors p-2 text-xl">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 brand-heading">Session Name</label>
                <input 
                  type="text" required
                  placeholder="e.g. Football Coaching"
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                  value={formData.sessionName}
                  onChange={e => setFormData({...formData, sessionName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 brand-heading">Session Category</label>
                <select 
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option>Youth Club</option>
                  <option>Sports & Outdoors</option>
                  <option>Creative Arts</option>
                  <option>Education & Skills</option>
                  <option>Community Support</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 brand-heading">Date</label>
                <input 
                  type="date" required
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 brand-heading">Hours</label>
                  <input 
                    type="number" min="0.5" step="0.5" required
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                    value={formData.hours}
                    onChange={e => setFormData({...formData, hours: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 brand-heading">Attendees</label>
                  <input 
                    type="number" min="0" required
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                    value={formData.attendeesCount}
                    onChange={e => setFormData({...formData, attendeesCount: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 brand-heading">Session Activities (What happened?)</label>
              <textarea 
                required
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none h-24 font-light"
                placeholder="Describe the main activities delivered..."
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 brand-heading">Key Outcome or Impact</label>
              <textarea 
                required
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none h-24 font-light"
                placeholder="What was the positive result for the participants?"
                value={formData.outcome}
                onChange={e => setFormData({...formData, outcome: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <button 
                type="submit" 
                style={{ backgroundColor: COLORS.orange }} 
                disabled={isSubmitting}
                className="text-white px-12 py-4 rounded-xl font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all brand-heading uppercase tracking-widest disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Session Report'}
              </button>
            </div>
          </form>
        </div>
      )}

      {logs.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 style={{ color: COLORS.secondary }} className="text-xl font-bold brand-heading uppercase">Recorded Impact</h2>
            <button 
              onClick={handleSummarize}
              disabled={isSummarizing}
              style={{ color: COLORS.orange }}
              className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:underline brand-heading"
            >
              {isSummarizing ? 'Analyzing...' : 'AI Impact Recap'}
            </button>
          </div>

          {summary && (
            <div className="bg-brand-orange/5 border-2 border-brand-orange/10 p-8 rounded-2xl animate-fadeIn">
              <p className="text-brand-orange font-bold text-lg leading-relaxed italic">"{summary}"</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {logs.map(log => (
              <div key={log.id} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                <div className="flex-1">
                   <div className="flex items-center gap-3 mb-2">
                     <h3 style={{ color: COLORS.secondary }} className="font-bold text-xl brand-heading">{log.sessionName}</h3>
                     <span style={{ backgroundColor: COLORS.lightBlue + '20', color: COLORS.lightBlue }} className="px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest brand-heading">
                       {log.category}
                     </span>
                   </div>
                   <p className="text-[10px] text-gray-400 font-bold uppercase brand-heading mb-4">
                     {new Date(log.date).toLocaleDateString()} • {log.hours} hrs • {log.attendeesCount} participants {log.teamMemberName ? `• By ${log.teamMemberName}` : ''}
                   </p>
                   <p className="text-sm text-gray-600 line-clamp-2 italic">"{log.outcome}"</p>
                </div>
                <div style={{ backgroundColor: COLORS.green }} className="px-6 py-2 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest brand-heading shadow-md self-start md:self-center">
                  Verified
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100">
           <div className="text-gray-300 mb-4 flex justify-center"><Icons.Clock /></div>
           <p className="text-gray-400 font-bold brand-heading uppercase tracking-[0.2em] text-sm">No sessions recorded yet.</p>
        </div>
      )}
    </div>
  );
};
