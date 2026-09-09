import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { Icons, COLORS } from '../constants';

interface LoginPortalProps {
  onLogin: (
    role: UserRole,
    email: string,
    password: string,
    isSignUp: boolean,
    extraFields?: { name?: string; mobile?: string; businessName?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onForgotPassword: (email: string) => void;
  isLoggingIn: boolean;
  initialMode?: 'signin' | 'signup';
  onBackHome?: () => void;
}

const DRAFT_KEY = 'freeatlast_login_draft_v1';

export const LoginPortal: React.FC<LoginPortalProps> = ({
  onLogin,
  onForgotPassword,
  isLoggingIn,
  initialMode = 'signin',
  onBackHome
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  
  // Retrieve any previously entered draft so the user never loses information
  const [role, setRole] = useState<UserRole>(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role) return parsed.role;
      }
    } catch {}
    return 'member';
  });

  const [email, setEmail] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email) return parsed.email;
      }
    } catch {}
    return '';
  });

  const [friendName, setFriendName] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.friendName) return parsed.friendName;
      }
    } catch {}
    return '';
  });

  const [friendMobile, setFriendMobile] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.friendMobile) return parsed.friendMobile;
      }
    } catch {}
    return '';
  });

  const [friendBusinessName, setFriendBusinessName] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.friendBusinessName) return parsed.friendBusinessName;
      }
    } catch {}
    return '';
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [teamPasscode, setTeamPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);

  // Field-specific and global error tracking
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: boolean;
    password?: boolean;
    confirmPassword?: boolean;
    name?: boolean;
    mobile?: boolean;
    passcode?: boolean;
  }>({});

  // Sync draft fields to sessionStorage on change
  useEffect(() => {
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          role,
          email,
          friendName,
          friendMobile,
          friendBusinessName
        })
      );
    } catch {}
  }, [role, email, friendName, friendMobile, friendBusinessName]);

  const clearFieldError = (field: keyof typeof fieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: false }));
    }
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const newFieldErrors: typeof fieldErrors = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newFieldErrors.email = true;
      setFieldErrors(newFieldErrors);
      setErrorMessage('Please provide an email address or username.');
      return;
    }

    if (mode === 'signup') {
      if (role === 'friend') {
        if (!friendName.trim()) {
          newFieldErrors.name = true;
          setFieldErrors(newFieldErrors);
          setErrorMessage('Please enter your full name.');
          return;
        }
        if (!friendMobile.trim()) {
          newFieldErrors.mobile = true;
          setFieldErrors(newFieldErrors);
          setErrorMessage('Please enter your mobile contact number.');
          return;
        }
      }

      if (password.length < 6) {
        newFieldErrors.password = true;
        setFieldErrors(newFieldErrors);
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }

      if (password !== confirmPassword) {
        newFieldErrors.confirmPassword = true;
        setFieldErrors(newFieldErrors);
        setErrorMessage(
          'Passwords do not match. Please verify your confirm password box and try again.'
        );
        return;
      }

      if (role === 'team' && teamPasscode.trim() !== 'HUB2024') {
        newFieldErrors.passcode = true;
        setFieldErrors(newFieldErrors);
        setErrorMessage('Invalid team access code. Please check with your team coordinator.');
        return;
      }

      if (role === 'admin' && teamPasscode.trim() !== 'ADMIN2024') {
        newFieldErrors.passcode = true;
        setFieldErrors(newFieldErrors);
        setErrorMessage('Invalid admin access code. Please check with your administrator.');
        return;
      }
    } else {
      if (!password) {
        newFieldErrors.password = true;
        setFieldErrors(newFieldErrors);
        setErrorMessage('Please enter your password.');
        return;
      }
    }

    setFieldErrors({});

    // Normalize username or email
    let finalEmail = trimmedEmail.toLowerCase();
    if (!finalEmail.includes('@')) {
      finalEmail = `${finalEmail.replace(/\s/g, '')}@freeatlast.hub`;
    }

    const result = await onLogin(
      role,
      finalEmail,
      password,
      mode === 'signup',
      {
        name: friendName.trim(),
        mobile: friendMobile.trim(),
        businessName: friendBusinessName.trim()
      }
    );

    if (!result.success && result.error) {
      setErrorMessage(result.error);
      if (
        result.error.toLowerCase().includes('email') ||
        result.error.toLowerCase().includes('account')
      ) {
        setFieldErrors(prev => ({ ...prev, email: true }));
      } else if (result.error.toLowerCase().includes('password')) {
        setFieldErrors(prev => ({ ...prev, password: true }));
      }
      // Note: We intentionally DO NOT reset or clear any fields here!
      // All user data is preserved so they can easily correct the mistake.
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-[3rem] shadow-2xl border border-slate-100 text-center relative overflow-hidden">
        <div
          style={{ backgroundColor: COLORS.primary }}
          className="absolute top-0 left-0 right-0 h-3"
        />

        <div className="flex justify-between items-center mb-6">
          {onBackHome && (
            <button
              type="button"
              onClick={onBackHome}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              &larr; Back
            </button>
          )}
          <Icons.Logo className="h-10 mx-auto justify-center" />
          {onBackHome && <div className="w-12" />}
        </div>

        <h2
          style={{ color: COLORS.secondary }}
          className="text-2xl sm:text-3xl font-black mb-1 brand-heading uppercase tracking-tight"
        >
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </h2>
        <p className="text-slate-400 mb-6 font-bold text-[10px] uppercase tracking-[0.2em] brand-heading">
          {mode === 'signin' ? (
            <>Welcome back! Sign in to your account</>
          ) : (
            <>Join the hub: Select your role below</>
          )}
        </p>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-left flex items-start gap-3 text-xs leading-relaxed animate-shake">
            <span className="text-base shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="font-bold">{errorMessage}</p>
              <p className="text-[10px] text-red-500 mt-1">
                Your entered details have been saved below. Please adjust the highlighted field to proceed.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4 text-left">
          {mode === 'signup' && (
            <div className="space-y-2 mb-6">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">
                I am joining as a:
              </label>
              <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl flex-wrap">
                {(['member', 'friend', 'team', 'admin'] as UserRole[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRole(r);
                      setErrorMessage(null);
                    }}
                    className={`flex-1 min-w-[70px] py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all brand-heading ${
                      role === r
                        ? 'bg-brand-dark-blue text-white shadow-md scale-102'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Friend-specific fields */}
          {mode === 'signup' && role === 'friend' && (
            <div className="space-y-4 mb-4 animate-slideDown p-4 bg-orange-50/40 rounded-2xl border border-orange-100">
              <div className="space-y-1">
                <div className="flex justify-between items-center ml-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Your Full Name *
                  </label>
                  {fieldErrors.name && (
                    <span className="text-[9px] text-red-600 font-bold uppercase">Required</span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Smith"
                  value={friendName}
                  onChange={e => {
                    setFriendName(e.target.value);
                    clearFieldError('name');
                  }}
                  className={`w-full px-5 py-3.5 bg-white border-2 rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700 placeholder:text-slate-300 text-sm transition-all ${
                    fieldErrors.name ? 'border-red-400 bg-red-50/30' : 'border-slate-100'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center ml-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Mobile Number *
                  </label>
                  {fieldErrors.mobile && (
                    <span className="text-[9px] text-red-600 font-bold uppercase">Required</span>
                  )}
                </div>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 07123456789"
                  value={friendMobile}
                  onChange={e => {
                    setFriendMobile(e.target.value);
                    clearFieldError('mobile');
                  }}
                  className={`w-full px-5 py-3.5 bg-white border-2 rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700 placeholder:text-slate-300 text-sm transition-all ${
                    fieldErrors.mobile ? 'border-red-400 bg-red-50/30' : 'border-slate-100'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">
                  Business / Company Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corporation"
                  value={friendBusinessName}
                  onChange={e => setFriendBusinessName(e.target.value)}
                  className="w-full px-5 py-3.5 bg-white border-2 border-slate-100 rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700 placeholder:text-slate-300 text-sm transition-all"
                />
              </div>
            </div>
          )}

          {/* Email or Username */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center ml-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Username or Email
              </label>
              {fieldErrors.email && (
                <span className="text-[9px] text-red-600 font-bold uppercase">Check Email</span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                <Icons.Mail />
              </span>
              <input
                type="text"
                required
                placeholder="e.g. johnsmith or john@example.com"
                className={`w-full pl-12 pr-6 py-4 bg-slate-50 border-2 rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700 transition-all placeholder:text-slate-300 text-sm ${
                  fieldErrors.email ? 'border-red-400 bg-red-50/20' : 'border-transparent'
                }`}
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  clearFieldError('email');
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Password
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => onForgotPassword(email)}
                  className="text-[9px] font-bold text-brand-orange hover:underline uppercase tracking-widest brand-heading"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                <Icons.Key />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className={`w-full pl-12 pr-12 py-4 bg-slate-50 border-2 rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700 transition-all placeholder:text-slate-300 text-sm ${
                  fieldErrors.password ? 'border-red-400 bg-red-50/20' : 'border-transparent'
                }`}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  clearFieldError('password');
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
              </button>
            </div>
          </div>

          {/* Confirm Password (Signup only) */}
          {mode === 'signup' && (
            <div className="space-y-1.5 animate-slideDown">
              <div className="flex justify-between items-center ml-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Confirm Password
                </label>
                {fieldErrors.confirmPassword && (
                  <span className="text-[9px] text-red-600 font-bold uppercase">
                    Must match password
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                  <Icons.Key />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className={`w-full pl-12 pr-12 py-4 bg-slate-50 border-2 rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700 transition-all placeholder:text-slate-300 text-sm ${
                    fieldErrors.confirmPassword
                      ? 'border-red-400 bg-red-50/30 ring-2 ring-red-100'
                      : 'border-transparent'
                  }`}
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value);
                    clearFieldError('confirmPassword');
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-[10px] text-red-600 font-bold ml-2">
                  Please re-enter the same password in both fields.
                </p>
              )}
            </div>
          )}

          {/* Access code for team / admin */}
          {mode === 'signup' && (role === 'team' || role === 'admin') && (
            <div className="space-y-1.5 animate-slideDown">
              <div className="flex justify-between items-center ml-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {role === 'admin' ? 'Admin Access Code' : 'Team Access Code'}
                </label>
                {fieldErrors.passcode && (
                  <span className="text-[9px] text-red-600 font-bold uppercase">Invalid Code</span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPasscode ? 'text' : 'password'}
                  required
                  placeholder={`Enter ${role} code`}
                  className={`w-full px-6 pr-12 py-4 bg-orange-50 border-2 rounded-2xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue transition-all text-sm ${
                    fieldErrors.passcode ? 'border-red-400' : 'border-orange-100'
                  }`}
                  value={teamPasscode}
                  onChange={e => {
                    setTeamPasscode(e.target.value);
                    clearFieldError('passcode');
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-orange/50 hover:text-brand-orange transition-colors"
                >
                  {showPasscode ? <Icons.EyeOff /> : <Icons.Eye />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            style={{ backgroundColor: COLORS.orange }}
            className="w-full text-white font-black py-4.5 sm:py-5 rounded-2xl transition-all shadow-xl active:scale-95 hover:opacity-90 text-base sm:text-lg brand-heading uppercase tracking-widest disabled:opacity-50 mt-6"
          >
            {isLoggingIn
              ? 'Connecting...'
              : mode === 'signin'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setErrorMessage(null);
              setFieldErrors({});
              // Keep email, role, friend details! Only clear passwords for security
              setPassword('');
              setConfirmPassword('');
            }}
            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-brand-orange transition-colors brand-heading py-2"
          >
            {mode === 'signin'
              ? "Need an account? Sign Up"
              : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};
