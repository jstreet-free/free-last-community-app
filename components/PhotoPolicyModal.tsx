
import React, { useState } from 'react';
import { COLORS, Icons } from '../constants';

interface PhotoPolicyModalProps {
  onConfirm: () => void;
}

export const PhotoPolicyModal: React.FC<PhotoPolicyModalProps> = ({ onConfirm }) => {
  const [agreedToUsage, setAgreedToUsage] = useState(false);
  const [agreedToDownload, setAgreedToDownload] = useState(false);

  const canConfirm = agreedToUsage && agreedToDownload;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark-blue/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 animate-slideIn">
        <div style={{ backgroundColor: COLORS.secondary }} className="p-10 text-white text-center relative">
          <div className="absolute top-6 left-10 opacity-20">
            <Icons.Shield />
          </div>
          <h2 className="text-3xl font-bold brand-heading uppercase tracking-widest mb-2">Photo Usage Policy</h2>
          <p className="text-white/70 text-sm font-light">Please confirm your agreement to access community photos.</p>
        </div>

        <div className="p-10 space-y-8">
          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 space-y-6">
            <div className="flex items-start gap-4">
              <div style={{ color: COLORS.orange }} className="mt-1"><Icons.Shield /></div>
              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  To protect the privacy and safety of all our members, especially children, we use Flickr to share photos of our activities. This helps us manage storage while keeping memories accessible to parents.
                </p>
                
                <label className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                  <input 
                    type="checkbox"
                    className="mt-1 w-6 h-6 accent-brand-orange"
                    checked={agreedToUsage}
                    onChange={e => setAgreedToUsage(e.target.checked)}
                  />
                  <span className="text-xs text-slate-600 leading-relaxed font-light">
                    I confirm that I will not use any photos inappropriately or for purposes that I do not have permission for from other participants or parents.
                  </span>
                </label>

                <label className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                  <input 
                    type="checkbox"
                    className="mt-1 w-6 h-6 accent-brand-orange"
                    checked={agreedToDownload}
                    onChange={e => setAgreedToDownload(e.target.checked)}
                  />
                  <span className="text-xs text-slate-600 leading-relaxed font-light">
                    I agree to only download photos featuring my own children. I will not download photos of other children without written permission, nor will I take screenshots of the albums.
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={onConfirm}
              disabled={!canConfirm}
              style={{ backgroundColor: canConfirm ? COLORS.orange : '#cbd5e1' }}
              className="text-white px-16 py-5 rounded-2xl font-bold text-lg shadow-xl transition-all transform hover:scale-105 active:scale-95 brand-heading uppercase tracking-widest disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Confirm & Access Photos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
