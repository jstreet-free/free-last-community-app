
import React, { useState } from 'react';
import { SAMPLE_PARTNERS, SAMPLE_IMPACT_STORIES, Icons, COLORS } from '../constants';
import { Partner, ImpactStory } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../services/firestoreUtils';

interface PartnersProps {
  assets: any;
  partners: Partner[];
  impactStories: ImpactStory[];
}

export const Partners: React.FC<PartnersProps> = ({ assets, partners, impactStories }) => {
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [selectedStory, setSelectedStory] = useState<ImpactStory | null>(null);
  const [partnerForm, setPartnerForm] = useState({
    orgName: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    const path = 'inquiries';
    try {
      // 1. Record inquiry
      await addDoc(collection(db, path), {
        name: partnerForm.orgName,
        mobile: 'N/A', // Using mobile field for schema compatibility
        message: partnerForm.message,
        email: partnerForm.email,
        type: 'Partnership Inquiry',
        timestamp: serverTimestamp(),
        status: 'new',
        targetEmail: 'info@freeatlast.co.uk'
      });

      // 2. Trigger actual email
      await addDoc(collection(db, 'mail'), {
        to: ['info@freeatlast.co.uk'],
        cc: ['jstreet@freeatlast.co.uk'],
        replyTo: partnerForm.email,
        message: {
          subject: `Partnership Inquiry: ${partnerForm.orgName}`,
          text: `Organization: ${partnerForm.orgName}\nEmail: ${partnerForm.email}\nMessage: ${partnerForm.message}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #7e2b33; padding: 20px; border-radius: 15px;">
              <h2 style="color: #2b337e;">New Partnership Inquiry</h2>
              <p>An organization is interested in partnering with free@last.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p><strong>Organization:</strong> ${partnerForm.orgName}</p>
              <p><strong>Contact Email:</strong> ${partnerForm.email}</p>
              <p><strong>Message:</strong></p>
              <div style="background: #f4792010; border-left: 4px solid #f47920; padding: 15px; margin: 20px 0;">
                 <p style="margin: 0; color: #444; line-height: 1.6;">${partnerForm.message}</p>
              </div>
              <p style="font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
                Sent via free@last Community Hub Digital Platform
              </p>
            </div>
          `
        }
      });

      setIsSuccess(true);
      setPartnerForm({ orgName: '', email: '', message: '' });
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      setErrorMessage("Failed to send inquiry. Please try again.");
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Hero Section */}
      <section style={{ backgroundColor: COLORS.secondary }} className="py-24 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight brand-heading uppercase tracking-tight">
            Stronger <span style={{ color: COLORS.primary }}>Together.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto font-light leading-relaxed">
            Our partners and supporters are the engine behind our mission. Through collaborative action, we are transforming the Nechells community.
          </p>
          <button 
            style={{ backgroundColor: COLORS.primary }}
            className="text-white px-12 py-5 rounded-xl font-bold text-lg shadow-2xl hover:brightness-110 active:scale-95 transition-all brand-heading uppercase tracking-widest"
          >
            Partner With Us
          </button>
        </div>
      </section>

      {/* Partners Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span style={{ color: COLORS.primary }} className="font-bold tracking-[0.2em] uppercase text-xs mb-4 block brand-heading">Our Network</span>
            <h2 style={{ color: COLORS.secondary }} className="text-4xl font-bold brand-heading uppercase tracking-widest">Trusted Partners</h2>
            <p className="mt-4 text-slate-500 font-light">Click a partner to see our shared impact.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {partners.map((partner) => (
              <button 
                key={partner.id} 
                onClick={() => setSelectedPartner(partner)}
                className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center group hover:border-orange-200 transition-all hover:shadow-xl active:scale-95 text-left"
              >
                <div className="w-full aspect-square rounded-2xl overflow-hidden mb-6 shadow-lg bg-white">
                  <img 
                    src={partner.logo} 
                    alt={partner.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h3 style={{ color: COLORS.secondary }} className="text-xl font-bold mb-3 brand-heading uppercase leading-none">{partner.name}</h3>
                <p className="text-slate-500 text-xs font-light line-clamp-3 leading-relaxed">{partner.description}</p>
                <div className="mt-6 flex items-center gap-2 text-brand-orange font-bold text-[10px] uppercase tracking-widest brand-heading opacity-0 group-hover:opacity-100 transition-opacity">
                  View Impact <Icons.Plus />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Detail Modal */}
      <AnimatePresence>
        {selectedPartner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPartner(null)}
              className="absolute inset-0 bg-brand-dark-blue/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            >
              <div className="w-full md:w-2/5 h-64 md:h-auto relative">
                <img 
                  src={selectedPartner.logo} 
                  alt={selectedPartner.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                  <h3 className="text-white text-4xl font-black brand-heading uppercase leading-none border-l-4 pl-4" style={{ borderColor: COLORS.orange }}>
                    {selectedPartner.name}
                  </h3>
                </div>
              </div>
              
              <div className="w-full md:w-3/5 p-8 md:p-12 overflow-y-auto">
                <button 
                  onClick={() => setSelectedPartner(null)}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                  ✕
                </button>
                
                <div className="space-y-8">
                  <div>
                    <span style={{ color: COLORS.orange }} className="font-bold tracking-widest uppercase text-xs mb-3 block brand-heading">Our Partnership</span>
                    <p className="text-slate-600 text-lg font-light leading-relaxed italic">
                      "{selectedPartner.description}"
                    </p>
                  </div>

                  {selectedPartner.details && (
                    <div>
                      <h4 style={{ color: COLORS.secondary }} className="font-bold uppercase tracking-widest text-sm mb-4 brand-heading">Deep Impact</h4>
                      <p className="text-slate-500 font-light leading-relaxed">
                        {selectedPartner.details}
                      </p>
                    </div>
                  )}

                  {selectedPartner.stats && (
                    <div className="grid grid-cols-3 gap-4">
                      {selectedPartner.stats.map((stat, i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                          <p style={{ color: COLORS.primary }} className="text-2xl font-black brand-heading">{stat.value}</p>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1 brand-heading leading-tight">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedPartner.website && selectedPartner.website !== '#' && (
                    <div className="pt-4">
                      <a 
                        href={selectedPartner.website}
                        target="_blank"
                        rel="noreferrer"
                        style={{ backgroundColor: COLORS.secondary }}
                        className="inline-flex items-center gap-3 text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest brand-heading hover:brightness-110 transition-all shadow-lg"
                      >
                        Visit Website <Icons.Briefcase />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Story Detail Modal */}
      <AnimatePresence>
        {selectedStory && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStory(null)}
              className="absolute inset-0 bg-brand-dark-blue/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-2xl bg-white rounded-[3.5rem] overflow-hidden shadow-2xl"
            >
              <div className="h-64 relative">
                <img 
                  src={selectedStory.image || (selectedStory.id === 's1' ? assets.GALA_AWARDS : assets.FIRE_FIGHTERS)} 
                  className="w-full h-full object-cover" 
                  alt={selectedStory.title} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent"></div>
                <button 
                  onClick={() => setSelectedStory(null)}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="p-12 -mt-12 relative z-10">
                <span style={{ backgroundColor: COLORS.orange }} className="px-5 py-2 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest brand-heading shadow-xl mb-6 inline-block">
                  {selectedStory.partnerName}
                </span>
                <h3 style={{ color: COLORS.secondary }} className="text-4xl font-black brand-heading uppercase leading-tight mb-6">
                  {selectedStory.title}
                </h3>
                <p className="text-slate-600 text-lg leading-relaxed font-light mb-8">
                  {selectedStory.content}
                </p>
                <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Collective Impact Story</p>
                   <button 
                     onClick={() => setSelectedStory(null)}
                     style={{ color: COLORS.secondary }}
                     className="font-black text-sm uppercase tracking-widest hover:underline brand-heading"
                   >
                     Close
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Impact Stories Together */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 style={{ color: COLORS.secondary }} className="text-5xl font-bold mb-6 brand-heading uppercase tracking-tight">Collective Impact</h2>
              <p className="text-slate-500 text-xl font-light leading-relaxed">Discover how we work with our supporters to create lasting change in Nechells.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {impactStories.map((story) => {
              // Map sample images to our asset state if possible, otherwise use stock
              const storyImg = story.image || (story.id === 's1' ? assets.GALA_AWARDS : assets.FIRE_FIGHTERS);
              return (
                <div key={story.id} className="bg-white rounded-[3rem] overflow-hidden shadow-sm border border-slate-100 group hover:shadow-2xl transition-all flex flex-col">
                  <div className="h-72 relative overflow-hidden">
                    <img 
                      src={storyImg} 
                      alt={story.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-6 left-8 text-white">
                      <span style={{ backgroundColor: COLORS.primary }} className="px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-lg brand-heading">
                        {story.partnerName}
                      </span>
                    </div>
                  </div>
                  <div className="p-10 flex-grow">
                    <h3 style={{ color: COLORS.secondary }} className="text-3xl font-bold mb-6 leading-tight brand-heading uppercase">{story.title}</h3>
                    <p className="text-slate-500 text-lg font-light leading-relaxed mb-8">{story.content}</p>
                    <button 
                      onClick={() => setSelectedStory(story)}
                      className="text-brand-orange font-bold uppercase tracking-widest text-xs flex items-center gap-2 group-hover:gap-4 transition-all brand-heading"
                    >
                      Read Story <Icons.Play />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Become a Supporter Form */}
      <section className="py-24 bg-white px-4">
        <div className="max-w-5xl mx-auto bg-slate-50 rounded-[4rem] p-16 md:p-24 shadow-inner border border-slate-100 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-orange/10 rounded-full blur-[100px]"></div>
          <div className="relative z-10">
            <div className="text-center mb-16">
              <h2 style={{ color: COLORS.secondary }} className="text-4xl md:text-5xl font-bold mb-6 brand-heading uppercase tracking-tight">Become a Partner</h2>
              <p className="text-slate-500 text-xl font-light max-w-2xl mx-auto">Does your organization want to make a tangible difference? Connect with us today.</p>
            </div>
            
            <form onSubmit={handlePartnerSubmit} className="space-y-6">
              {errorMessage && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center font-bold text-sm">
                  {errorMessage}
                </div>
              )}
              {isSuccess && (
                <div className="p-4 bg-green-50 text-green-600 rounded-xl text-center font-bold text-sm">
                  Thank you! Your partnership inquiry has been sent.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input 
                  required
                  type="text" 
                  value={partnerForm.orgName}
                  onChange={e => setPartnerForm({...partnerForm, orgName: e.target.value})}
                  placeholder="Organization Name"
                  className="w-full p-6 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-orange outline-none font-bold"
                />
                <input 
                  required
                  type="email" 
                  value={partnerForm.email}
                  onChange={e => setPartnerForm({...partnerForm, email: e.target.value})}
                  placeholder="Business Email"
                  className="w-full p-6 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-orange outline-none font-bold"
                />
              </div>
              <textarea 
                required
                value={partnerForm.message}
                onChange={e => setPartnerForm({...partnerForm, message: e.target.value})}
                placeholder="How would you like to support free@last?"
                className="w-full p-6 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-orange outline-none font-light h-40"
              />
              <div className="flex justify-center">
                <button 
                  disabled={isSubmitting}
                  type="submit"
                  style={{ backgroundColor: COLORS.primary }}
                  className="text-white px-16 py-6 rounded-xl font-bold text-xl shadow-xl hover:brightness-110 active:scale-95 transition-all brand-heading uppercase tracking-widest disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : 'Send Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
