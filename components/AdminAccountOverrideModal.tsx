import React, { useState, useEffect } from 'react';
import { Icons, COLORS } from '../constants';
import { UserRole, UserStatus } from '../types';
import { adminProvisionUser, ProvisionUserParams } from '../services/adminAuthService';

interface AdminAccountOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  adminEmail: string;
  initialData?: {
    email?: string;
    name?: string;
    role?: UserRole;
    mobile?: string;
    businessName?: string;
    notes?: string;
  } | null;
}

export const AdminAccountOverrideModal: React.FC<AdminAccountOverrideModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  adminEmail,
  initialData
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [status, setStatus] = useState<UserStatus>('approved');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sendResetEmail, setSendResetEmail] = useState(true);
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [registrationType, setRegistrationType] = useState<'family' | 'teenager' | 'friend' | 'individual'>('family');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string; tempPass?: string; email: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail(initialData?.email || '');
      setName(initialData?.name || '');
      setRole(initialData?.role || 'member');
      setStatus('approved'); // Default to approved for manual overrides
      const defaultPass = `Nechells${new Date().getFullYear()}!`;
      setPassword(defaultPass);
      setSendResetEmail(true);
      setMobile(initialData?.mobile || '');
      setAddress('');
      setPostcode('');
      setRegistrationType(initialData?.role === 'friend' ? 'friend' : 'family');
      setNotes(initialData?.notes || 'Manual admin override for account access');
      setErrorMsg(null);
      setSuccessInfo(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      setErrorMsg('Please enter both full name and email.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const params: ProvisionUserParams = {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role,
        status,
        password: password.trim(),
        sendResetEmail,
        mobile: mobile.trim(),
        address: address.trim(),
        postcode: postcode.trim(),
        notes: notes.trim(),
        profileComplete: true,
        registrationType: role === 'friend' ? 'friend' : registrationType,
        adminEmail
      };

      const result = await adminProvisionUser(params);

      setSuccessInfo({
        message: result.message,
        tempPass: password,
        email: email.trim().toLowerCase()
      });
      onSuccess(result.message);
    } catch (err: any) {
      console.error('Admin provision error:', err);
      setErrorMsg(err.message || 'Failed to create or override account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDetails = () => {
    if (!successInfo) return;
    const text = `free@last Account Access Details:\nEmail: ${successInfo.email}\nTemporary Password: ${successInfo.tempPass}\nPortal Link: ${window.location.origin}\nNote: Check your email for password reset or activation instructions.`;
    navigator.clipboard.writeText(text);
    alert('Account details copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-2xl w-full p-8 md:p-10 relative my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-6 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-orange/10 border border-brand-orange/20 text-brand-orange rounded-lg text-[9px] font-black uppercase tracking-widest brand-heading mb-2">
              <span>⚡</span> Administrator Override Facility
            </div>
            <h3 className="text-2xl font-black text-brand-dark-blue brand-heading uppercase tracking-tight">
              Create / Override User Account
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Resolve signup conflicts, bypass orphaned authentication records, and provision immediate hub access.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
          >
            <Icons.Plus className="rotate-45 h-6 w-6" />
          </button>
        </div>

        {successInfo ? (
          <div className="space-y-6 py-4 animate-fadeIn">
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-3">
              <span className="text-4xl">🎉</span>
              <h4 className="text-lg font-black text-emerald-900 brand-heading uppercase">
                Account Provisioned Successfully!
              </h4>
              <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
                {successInfo.message}
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500 uppercase tracking-wider text-[10px]">Email:</span>
                <span className="font-bold text-slate-800">{successInfo.email}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500 uppercase tracking-wider text-[10px]">Assigned Role:</span>
                <span className="font-bold text-brand-orange uppercase">{role}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 uppercase tracking-wider text-[10px]">Assigned Temp Password:</span>
                <span className="font-bold text-slate-800">{successInfo.tempPass}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={handleCopyDetails}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs brand-heading uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                📋 Copy Details for Member
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 bg-brand-orange text-white font-bold rounded-2xl text-xs brand-heading uppercase tracking-widest hover:opacity-90 transition-all shadow-lg"
              >
                Done / Back to Hub
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-start gap-3">
                <span className="text-base">⚠️</span>
                <div>
                  <p className="font-bold">Account Override Error</p>
                  <p className="mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-blue-900 leading-relaxed">
              💡 <strong>How this works:</strong> If the member’s email was already registered in Firebase Authentication (e.g. from an interrupted or previous signup), this tool safely links their credentials to a complete User Hub profile, sets their status to Approved, and dispatches a password reset link so they can log in immediately.
            </div>

            {/* Core Credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-800 text-sm transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">
                  Member Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jane.doe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-800 text-sm transition-all"
                />
              </div>
            </div>

            {/* Role & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">
                  Account Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-800 text-sm"
                >
                  <option value="member">Member (Community Youth & Family)</option>
                  <option value="team">Team Member (Staff / Volunteer)</option>
                  <option value="friend">Friend of free@last (Supporter / Business)</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">
                  Approval Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as UserStatus)}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-800 text-sm"
                >
                  <option value="approved">Approved (Instant Active Access)</option>
                  <option value="pending">Pending Home Visit / Review</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Password & Activation */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Password & Access Activation
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const rnd = Math.random().toString(36).substring(2, 6);
                    setPassword(`FAL-${rnd}!2026`);
                  }}
                  className="text-[9px] font-bold text-brand-orange hover:underline uppercase tracking-wider"
                >
                  Regenerate Temporary Password
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set temporary password"
                  className="w-full px-5 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:border-brand-orange outline-none font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                </button>
              </div>

              <label className="flex items-center gap-3 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={sendResetEmail}
                  onChange={(e) => setSendResetEmail(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Send immediate password reset / activation email to this user
                </span>
              </label>
            </div>

            {/* Optional Profile Details */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Additional Profile Information (Optional)
              </h5>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-1">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 07123456789"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-1">
                    Registration Mode
                  </label>
                  <select
                    value={registrationType}
                    onChange={(e) => setRegistrationType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
                  >
                    <option value="family">Family (Household with Children)</option>
                    <option value="teenager">Teenager / Young Person (Independent)</option>
                    <option value="individual">Adult / Individual</option>
                    <option value="friend">Friend of free@last</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-1">
                    Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 49 Nechells Park Road"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-1">
                    Postcode
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. B7 5PR"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-1">
                  Override Notes / Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Email in-use conflict override resolved for member"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs brand-heading uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                style={{ backgroundColor: COLORS.orange }}
                className="flex-1 py-4 text-white font-black rounded-2xl text-xs brand-heading uppercase tracking-widest hover:opacity-90 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span> Provisioning Account...
                  </>
                ) : (
                  <>⚡ Create / Override Account</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
