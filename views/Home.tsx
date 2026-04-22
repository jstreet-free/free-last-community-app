
import React, { useState } from 'react';
import { SAMPLE_ANNOUNCEMENTS, Icons, COLORS } from '../constants';
import { User, Announcement } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface HomeProps {
  user: User | null;
  assets: any;
  announcements: Announcement[];
}

export const Home: React.FC<HomeProps> = ({ user, assets, announcements }) => {
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    mobile: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'inquiries'), {
        ...inquiryForm,
        type: 'Get Involved',
        timestamp: serverTimestamp(),
        status: 'new'
      });
      setIsSuccess(true);
      setTimeout(() => {
        setShowInquiryModal(false);
        setIsSuccess(false);
        setInquiryForm({ name: '', mobile: '', message: '' });
      }, 2500);
    } catch (error) {
      console.error("Error submitting inquiry:", error);
      alert("Something went wrong. Please try again or email us directly at info@freeatlast.co.uk");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={assets.YOUTH_HOODIES} 
            alt="free@last youth team" 
            className="w-full h-full object-cover filter brightness-[0.35] scale-105"
          />
          <div className="absolute inset-0 bg-brand-dark-blue/40"></div>
        </div>
        <div className="relative z-10 max-w-5xl">
          <Icons.Logo className="mb-6 justify-center h-16 md:h-20" reversed />
          <span style={{ color: COLORS.yellow }} className="font-bold tracking-[0.4em] uppercase text-xs mb-6 block brand-heading">ESTABLISHED 1999</span>
          <h1 className="text-6xl md:text-8xl font-black text-white mb-8 leading-[1.1] brand-heading">
            Freeing potential, <br/><span style={{ color: COLORS.orange }}>transforming lives.</span>
          </h1>
          <p className="text-lg md:text-2xl text-gray-100 mb-12 leading-relaxed font-light max-w-3xl mx-auto opacity-95">
            Dedicated to helping the children and young people of Nechells be the best they can be.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <button 
              onClick={() => setShowInquiryModal(true)}
              style={{ backgroundColor: COLORS.orange }}
              className="hover:brightness-110 text-white px-10 py-5 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl active:scale-95 brand-heading uppercase tracking-widest text-center"
            >
              Get Involved
            </button>
            <a 
              href="http://freeatlast.co.uk/donate/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-gray-100 text-brand-dark-blue px-10 py-5 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl active:scale-95 brand-heading uppercase tracking-widest text-center"
            >
              Donate Now
            </a>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="relative group">
            <div style={{ backgroundColor: COLORS.green }} className="absolute -inset-4 opacity-10 rounded-3xl blur-2xl"></div>
            <img 
              src={assets.MUDDY_ADVENTURE} 
              alt="Adventure" 
              className="rounded-3xl shadow-2xl relative border-[8px] border-white w-full object-cover aspect-[4/3]"
            />
            <div style={{ backgroundColor: COLORS.secondary }} className="absolute -bottom-6 -left-6 px-8 py-6 rounded-2xl text-white brand-heading font-bold shadow-2xl z-20">
              RESILIENCE & ADVENTURE
            </div>
          </div>
          <div>
            <span style={{ color: COLORS.green }} className="font-bold tracking-widest uppercase text-sm mb-4 block brand-heading">Our Mission</span>
            <h2 style={{ color: COLORS.secondary }} className="text-4xl md:text-5xl font-bold mb-8 leading-tight brand-heading">Building Stronger Communities</h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              we provide a safe, fun and progressive environment and culture for children and young people. From youth clubs to adventure, creativity to entrepreneurialism, everything is designed to build character and confidence.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { text: "Fun", color: COLORS.lightBlue },
                { text: "Creativity", color: COLORS.orange },
                { text: "Adventure", color: COLORS.green },
                { text: "Support", color: COLORS.yellow }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border-l-4" style={{ borderColor: item.color }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]" style={{ backgroundColor: item.color }}>✓</div>
                  <span className="font-bold text-brand-dark-blue brand-heading text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Centre Updates */}
      <section style={{ backgroundColor: COLORS.secondary }} className="py-24 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-end mb-16 border-b border-white/10 pb-8">
            <h2 className="text-4xl font-bold brand-heading uppercase tracking-widest">Centre Updates</h2>
            <button style={{ color: COLORS.lightBlue }} className="font-bold uppercase tracking-widest text-xs brand-heading hover:text-white transition-colors">View All News</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {announcements.map((item) => (
              <div key={item.id} className="bg-white/5 p-10 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 bg-white/10 rounded-lg text-white/60 brand-heading">{item.category}</span>
                  <span className="text-[10px] font-bold text-white/40 brand-heading uppercase">{new Date(item.date).toLocaleDateString()}</span>
                </div>
                <h3 className="text-2xl font-bold mb-4 brand-heading group-hover:text-brand-orange transition-colors">{item.title}</h3>
                <p className="text-white/70 text-sm font-light leading-relaxed">{item.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safe Space Section */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1">
            <h2 style={{ color: COLORS.secondary }} className="text-4xl md:text-5xl font-bold mb-8 leading-tight brand-heading">A Haven for Play</h2>
            <p className="text-lg text-gray-600 mb-10 font-light leading-relaxed">
              In the heart of Nechells, we provide the space and security children need to thrive. Our Centre is more than a building—it's the heartbeat of the community.
            </p>
            <div className="flex gap-4">
               <div className="flex-1 p-6 rounded-2xl border-2 border-brand-light-blue/20 bg-brand-light-blue/5">
                  <div style={{ color: COLORS.lightBlue }} className="mb-3"><Icons.Heart /></div>
                  <p className="text-xs font-bold uppercase brand-heading text-brand-dark-blue">Wellbeing Focused</p>
               </div>
               <div className="flex-1 p-6 rounded-2xl border-2 border-brand-green/20 bg-brand-green/5">
                  <div style={{ color: COLORS.green }} className="mb-3"><Icons.Calendar /></div>
                  <p className="text-xs font-bold uppercase brand-heading text-brand-dark-blue">Daily Sessions</p>
               </div>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <img 
              src={assets.PLAYGROUND} 
              alt="Playground" 
              className="rounded-3xl shadow-2xl border-[8px] border-white w-full object-cover aspect-[4/5]"
            />
          </div>
        </div>
      </section>

      {/* Inquiry Modal */}
      <AnimatePresence>
        {showInquiryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInquiryModal(false)}
              className="absolute inset-0 bg-brand-dark-blue/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div style={{ backgroundColor: COLORS.secondary }} className="p-10 text-white relative">
                <button 
                  onClick={() => setShowInquiryModal(false)}
                  className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
                >
                  <Icons.Plus className="rotate-45 h-8 w-8" />
                </button>
                <div style={{ color: COLORS.yellow }} className="mb-4"><Icons.Heart /></div>
                <h2 className="text-3xl font-bold brand-heading uppercase tracking-tight">Get Involved</h2>
                <p className="text-white/60 font-light mt-2">Help us transform lives in Nechells.</p>
              </div>

              <div className="p-10">
                {isSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12"
                  >
                    <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Icons.Play className="rotate-[-90deg] h-10 w-10" />
                    </div>
                    <h3 className="text-2xl font-bold brand-heading text-brand-dark-blue mb-2">THANK YOU!</h3>
                    <p className="text-slate-500">Your inquiry has been sent to our team. We'll be in touch very soon.</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleInquirySubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Full Name</label>
                      <input 
                        required
                        type="text"
                        value={inquiryForm.name}
                        onChange={(e) => setInquiryForm({...inquiryForm, name: e.target.value})}
                        className="w-full px-6 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all"
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Mobile Number</label>
                      <input 
                        required
                        type="tel"
                        value={inquiryForm.mobile}
                        onChange={(e) => setInquiryForm({...inquiryForm, mobile: e.target.value})}
                        className="w-full px-6 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all"
                        placeholder="Your mobile"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">How would you like to get involved?</label>
                      <textarea 
                        required
                        value={inquiryForm.message}
                        onChange={(e) => setInquiryForm({...inquiryForm, message: e.target.value})}
                        className="w-full px-6 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all h-32 resize-none"
                        placeholder="Details of your inquiry..."
                      />
                    </div>
                    <button 
                      disabled={isSubmitting}
                      type="submit"
                      style={{ backgroundColor: COLORS.orange }}
                      className="w-full py-5 text-white rounded-xl font-bold text-lg brand-heading uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? 'Sending...' : 'Send Inquiry'}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
