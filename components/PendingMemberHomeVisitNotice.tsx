import React from 'react';
import { User } from '../types';
import { COLORS } from '../constants';
import * as Icons from 'lucide-react';

interface PendingMemberHomeVisitNoticeProps {
  user: User;
  onOpenProfile: () => void;
  setActiveTab: (tab: string) => void;
  feature: string;
}

export const PendingMemberHomeVisitNotice: React.FC<PendingMemberHomeVisitNoticeProps> = ({
  user,
  onOpenProfile,
  setActiveTab,
  feature,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 animate-fadeIn">
      <div className="bg-white rounded-[3rem] p-8 md:p-14 shadow-2xl border-4 border-orange-100 text-center relative overflow-hidden">
        <div style={{ backgroundColor: COLORS.orange }} className="absolute top-0 left-0 right-0 h-3"></div>
        
        <div className="w-20 h-20 bg-orange-100 text-brand-orange rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-inner">
          <Icons.Home className="w-10 h-10" />
        </div>

        <span className="px-4 py-1.5 bg-orange-100 text-orange-800 rounded-full text-xs font-black brand-heading uppercase tracking-widest inline-block mb-4">
          Safeguarding & Home Visit Required
        </span>

        <h2 style={{ color: COLORS.secondary }} className="text-3xl sm:text-4xl font-bold brand-heading uppercase tracking-tight mb-4">
          Welcome to free@last!
        </h2>

        <p className="text-slate-600 text-base max-w-2xl mx-auto font-light leading-relaxed mb-8">
          To ensure the safety and wellbeing of every child in our Nechells community, all new members must have a brief, friendly <strong>home visit</strong> with our team before accessing <strong>{feature}</strong>.
        </p>

        <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 max-w-xl mx-auto text-left mb-8 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-brand-dark-blue brand-heading flex items-center gap-2">
            <Icons.CheckCircle className="w-4 h-4 text-green-600" /> What happens next?
          </h4>
          <ul className="space-y-2 text-xs text-slate-600 font-medium list-disc list-inside">
            <li>Our staff will contact you at <strong>{user.profile?.parentMobile || user.email}</strong> to arrange a convenient home visit time.</li>
            <li>Once verified, your account will be activated immediately by admin for unlimited session bookings and photo gallery access.</li>
            <li>You can check or update your family contact numbers and authorized collection contacts below.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <button
            onClick={onOpenProfile}
            style={{ backgroundColor: COLORS.orange }}
            className="w-full sm:w-auto px-8 py-4 text-white rounded-2xl font-bold text-xs brand-heading uppercase tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Icons.UserCheck className="w-4 h-4" /> View / Edit My Profile & Numbers
          </button>
          <button
            onClick={() => setActiveTab('home')}
            className="w-full sm:w-auto px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs brand-heading uppercase tracking-widest transition-all"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};
