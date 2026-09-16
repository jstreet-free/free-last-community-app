import React, { useState } from 'react';
import { Icons, COLORS } from '../constants';
import { SignupAttempt, User } from '../types';
import { triggerPasswordReset, markSignupAttemptResolved, deleteSignupAttempt } from '../services/adminAuthService';

interface FailedSignupsManagerProps {
  signupAttempts: SignupAttempt[];
  onOpenOverrideModal: (data?: Partial<SignupAttempt>) => void;
  onNotification: (msg: string) => void;
  adminEmail: string;
  existingUsers: User[];
}

export const FailedSignupsManager: React.FC<FailedSignupsManagerProps> = ({
  signupAttempts,
  onOpenOverrideModal,
  onNotification,
  adminEmail,
  existingUsers
}) => {
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  // Quick check if an email exists in the existing users list
  const isEmailInUserHub = (email: string) => {
    return existingUsers.some(u => u.email?.toLowerCase() === email.toLowerCase());
  };

  const filteredAttempts = signupAttempts.filter(attempt => {
    // Filter status
    if (filter === 'unresolved' && attempt.status === 'resolved') return false;
    if (filter === 'resolved' && attempt.status !== 'resolved') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEmail = attempt.email.toLowerCase().includes(q);
      const matchName = attempt.name?.toLowerCase().includes(q);
      const matchError = attempt.errorMessage?.toLowerCase().includes(q) || attempt.errorCode?.toLowerCase().includes(q);
      if (!matchEmail && !matchName && !matchError) return false;
    }

    return true;
  }).sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime());

  const handleSendReset = async (email: string) => {
    setIsProcessingId(email);
    try {
      const res = await triggerPasswordReset(email);
      onNotification(res.message);
    } catch (err: any) {
      onNotification(err.message || 'Failed to send password reset email.');
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleResolve = async (id: string) => {
    setIsProcessingId(id);
    try {
      await markSignupAttemptResolved(id, adminEmail);
      onNotification('Signup issue marked as resolved.');
    } catch (err: any) {
      onNotification('Failed to update status.');
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this signup attempt record?')) return;
    setIsProcessingId(id);
    try {
      await deleteSignupAttempt(id);
      onNotification('Record removed.');
    } catch (err: any) {
      onNotification('Failed to delete record.');
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleManualCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualEmail.trim().toLowerCase();
    if (!clean) return;

    const inHub = isEmailInUserHub(clean);
    if (inHub) {
      onNotification(`"${clean}" is already registered in the User Hub.`);
      return;
    }

    // Open override modal pre-populated
    onOpenOverrideModal({
      email: clean,
      notes: 'Admin manual lookup & override'
    });
    setManualEmail('');
  };

  const unresolvedCount = signupAttempts.filter(a => a.status !== 'resolved').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header & Quick Manual Lookup */}
      <div className="bg-gradient-to-r from-slate-900 to-brand-dark-blue rounded-3xl p-8 text-white shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest brand-heading">
            <span>🛡️</span> Sign-up Diagnostics & Override Hub
          </div>
          <h3 className="text-2xl font-black brand-heading uppercase tracking-tight">
            Failed & Incomplete Signups
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-light">
            View registration attempts that encountered errors (such as &ldquo;email already in use&rdquo; or orphaned authentication records). Use the <strong>Manual Override</strong> tool to provision full User Hub access and send activation instructions with one click.
          </p>
        </div>

        {/* Manual lookup input */}
        <form onSubmit={handleManualCheck} className="w-full lg:w-auto flex flex-col sm:flex-row gap-2 bg-white/10 p-2 rounded-2xl border border-white/15 backdrop-blur-sm">
          <input
            type="email"
            placeholder="Check any email address..."
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            className="px-4 py-2.5 bg-white/10 rounded-xl text-xs text-white placeholder:text-slate-300 outline-none border border-transparent focus:border-brand-orange sm:w-64"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-brand-orange hover:brightness-110 text-white font-bold rounded-xl text-xs brand-heading uppercase tracking-wider transition-all whitespace-nowrap"
          >
            Override / Fix
          </button>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          <button
            onClick={() => setFilter('unresolved')}
            className={`px-4 py-2 rounded-xl text-xs font-bold brand-heading uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              filter === 'unresolved' ? 'bg-white text-brand-orange shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Needs Action
            {unresolvedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white">
                {unresolvedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold brand-heading uppercase tracking-wider transition-all ${
              filter === 'all' ? 'bg-white text-brand-orange shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Logs ({signupAttempts.length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-xl text-xs font-bold brand-heading uppercase tracking-wider transition-all ${
              filter === 'resolved' ? 'bg-white text-brand-orange shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Resolved
          </button>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search email, name, or error..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-brand-orange outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Attempts List / Table */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        {filteredAttempts.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="text-4xl">✨</div>
            <h4 className="text-base font-black text-slate-700 brand-heading uppercase">
              No {filter === 'unresolved' ? 'Unresolved' : ''} Signup Issues Found
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {filter === 'unresolved'
                ? 'All member signups are operating smoothly. When someone encounters an authentication or duplicate email error, it will automatically appear here.'
                : 'No registration logs match the current search filter.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAttempts.map((attempt) => {
              const inHub = isEmailInUserHub(attempt.email);
              const isEmailInUseError = attempt.errorCode === 'auth/email-already-in-use' || attempt.errorMessage?.includes('already');
              const isResolved = attempt.status === 'resolved';

              return (
                <div key={attempt.id} className="p-6 md:p-8 hover:bg-slate-50/70 transition-colors space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-base font-bold text-slate-900 brand-heading">
                          {attempt.name || 'Anonymous / Unspecified Name'}
                        </span>
                        <span className="text-xs font-mono font-bold text-brand-orange bg-brand-orange/10 px-2.5 py-0.5 rounded-lg">
                          {attempt.email}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                          Role: {attempt.role}
                        </span>
                        {inHub ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">
                            ✓ In User Hub
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                            ⚠️ Not in User Hub
                          </span>
                        )}
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                          isResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {isResolved ? 'Resolved' : 'Action Needed'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        <span>Attempted: {new Date(attempt.attemptedAt).toLocaleString()}</span>
                        {attempt.mobile && <span>Mobile: {attempt.mobile}</span>}
                        {attempt.businessName && <span>Business: {attempt.businessName}</span>}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => onOpenOverrideModal({
                          email: attempt.email,
                          name: attempt.name,
                          role: attempt.role,
                          mobile: attempt.mobile,
                          businessName: attempt.businessName,
                          notes: `Override resolved for issue: ${attempt.errorCode}`
                        })}
                        className="px-4 py-2 bg-brand-orange hover:brightness-110 text-white font-bold rounded-xl text-xs brand-heading uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5"
                      >
                        ⚡ Override & Create Account
                      </button>

                      <button
                        onClick={() => handleSendReset(attempt.email)}
                        disabled={isProcessingId === attempt.email}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs brand-heading uppercase tracking-wider transition-all"
                        title="Send password reset email directly to this member"
                      >
                        {isProcessingId === attempt.email ? 'Sending...' : '🔑 Send Reset Email'}
                      </button>

                      {!isResolved ? (
                        <button
                          onClick={() => handleResolve(attempt.id)}
                          disabled={isProcessingId === attempt.id}
                          className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs brand-heading uppercase tracking-wider transition-all"
                        >
                          ✓ Mark Resolved
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDelete(attempt.id)}
                          disabled={isProcessingId === attempt.id}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          title="Delete record"
                        >
                          <Icons.Plus className="rotate-45 h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Error & Diagnostic context */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-2 text-slate-600 font-mono">
                      <span className="font-bold text-rose-600">Error Code: {attempt.errorCode || 'N/A'}</span>
                    </div>
                    <p className="text-slate-600 text-xs">
                      {attempt.errorMessage}
                    </p>
                    {isEmailInUseError && !inHub && (
                      <div className="mt-2 text-amber-800 bg-amber-50 p-2 rounded-lg text-[11px] font-medium border border-amber-200">
                        💡 <strong>Diagnosis:</strong> This member&apos;s email already exists in Firebase Authentication, but their profile document was never stored in the User Hub (orphaned account). Clicking <strong>&ldquo;Override &amp; Create Account&rdquo;</strong> will create their complete User Hub record and dispatch an activation/reset link immediately.
                      </div>
                    )}
                    {attempt.notes && (
                      <p className="text-slate-400 text-[10px] italic">
                        Notes: {attempt.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
