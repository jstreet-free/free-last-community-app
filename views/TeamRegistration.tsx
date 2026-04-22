
import React, { useState } from 'react';
import { User } from '../types';
import { Icons, COLORS } from '../constants';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface TeamRegistrationProps {
  user: User;
  onSubmitted: () => void;
}

export const TeamRegistration: React.FC<TeamRegistrationProps> = ({ user, onSubmitted }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    department: '',
    role: '',
    passcode: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.department || !formData.role || !formData.passcode) {
      setError("Please fill in all fields.");
      return;
    }

    if (formData.passcode !== 'HUB2024') {
      setError("Invalid team access code. Please contact the administrator.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        name: formData.name,
        department: `${formData.department} (${formData.role})`,
        status: 'pending',
        profileComplete: true
      });
      setSubmitted(true);
      onSubmitted();
    } catch (error) {
      console.error("Error submitting team registration:", error);
      setError("Failed to submit registration. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted || user.status === 'pending') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
          <div style={{ backgroundColor: COLORS.secondary }} className="absolute top-0 left-0 right-0 h-3"></div>
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-secondary scale-110">
            <Icons.Clock className="h-10 w-10" />
          </div>
          <h2 style={{ color: COLORS.secondary }} className="text-3xl font-black mb-4 brand-heading uppercase tracking-tight">Registration Under Review</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Thank you, <span className="font-bold text-brand-dark-blue">{formData.name || user.name}</span>. Your team access request has been submitted to the administration team.
          </p>
          <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2 brand-heading">Next Steps</p>
            <p className="text-sm text-slate-600 font-medium">Once an admin approves your account, you will have full access to the Team Hub and Volunteer Logs.</p>
          </div>
          <p className="text-[10px] text-slate-400 font-bold brand-heading uppercase tracking-widest">You will be notified within the app when approved.</p>
        </div>
      </div>
    );
  }

  if (user.status === 'rejected') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-3 bg-red-500"></div>
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-red-500">
            <Icons.Plus className="rotate-45 h-10 w-10" />
          </div>
          <h2 className="text-3xl font-black mb-4 brand-heading uppercase tracking-tight text-red-600">Access Denied</h2>
          <p className="text-slate-500 mb-8">
            Your request for team access has been declined. Please contact the administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-20 animate-fadeIn">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
        <div style={{ backgroundColor: COLORS.secondary }} className="absolute top-0 left-0 right-0 h-3"></div>
        <div className="text-center mb-10">
          <h2 style={{ color: COLORS.secondary }} className="text-3xl font-black mb-3 brand-heading uppercase tracking-tight">Team Registration</h2>
          <p className="text-slate-500 font-medium">Apply for team member access at the Hub.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-xl text-xs font-bold brand-heading uppercase tracking-widest border border-red-100 animate-shake">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading px-2">Full Name</label>
            <input 
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-secondary outline-none transition-all font-bold text-slate-600"
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading px-2">Department</label>
            <input 
              type="text"
              required
              value={formData.department}
              onChange={e => setFormData({...formData, department: e.target.value})}
              className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-secondary outline-none transition-all font-bold text-slate-600"
              placeholder="e.g. Youth Work, Admin, Sports"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading px-2">Role / Title</label>
            <input 
              type="text"
              required
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value})}
              className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-secondary outline-none transition-all font-bold text-slate-600"
              placeholder="e.g. Lead Youth Worker"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading px-2">Team Access Code</label>
            <input 
              type="password"
              required
              value={formData.passcode}
              onChange={e => setFormData({...formData, passcode: e.target.value})}
              className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-secondary outline-none transition-all font-bold text-slate-600"
              placeholder="Enter secret code"
            />
          </div>

          <div className="pt-6">
            <button 
              type="submit"
              disabled={isSubmitting}
              style={{ backgroundColor: COLORS.secondary }}
              className="w-full py-6 rounded-2xl text-white font-black text-lg brand-heading uppercase tracking-[0.2em] shadow-xl hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Apply for Access"}
            </button>
          </div>
          
          <p className="text-[10px] text-center text-slate-400 font-bold brand-heading uppercase tracking-widest mt-6">
            Registration requires administrator approval.
          </p>
        </form>
      </div>
    </div>
  );
};
