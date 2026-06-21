
import React, { useState } from 'react';
import { SAMPLE_ANNOUNCEMENTS, Icons, COLORS } from '../constants';
import { User, Announcement, CaseStudyRequest, CaseStudy } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../services/firestoreUtils';
import { analyzeCaseStudy } from '../services/geminiService';

interface HomeProps {
  user: User | null;
  assets: any;
  announcements: Announcement[];
  setActiveTab: (tab: string) => void;
  caseStudyRequests: CaseStudyRequest[];
  caseStudies: CaseStudy[];
}

export const Home: React.FC<HomeProps> = ({ 
  user, 
  assets, 
  announcements, 
  setActiveTab,
  caseStudyRequests = [],
  caseStudies = []
}) => {
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [showAllNews, setShowAllNews] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    email: '',
    mobile: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Story submission states
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyContent, setStoryContent] = useState('');
  const [isSubmittingStory, setIsSubmittingStory] = useState(false);
  const [storySuccess, setStorySuccess] = useState(false);
  const [detectedCategory, setDetectedCategory] = useState('');
  const [storyError, setStoryError] = useState<string | null>(null);

  // Newsletter Subscription States
  const [subscriberName, setSubscriberName] = useState('');
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [subscribedSuccess, setSubscribedSuccess] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriberName || !subscriberEmail) return;
    setSubscribing(true);
    try {
      await addDoc(collection(db, 'newsletter_subscribers'), {
        name: subscriberName,
        email: subscriberEmail,
        subscribedAt: new Date().toISOString()
      });
      setSubscribedSuccess(true);
      setSubscriberName('');
      setSubscriberEmail('');
      setTimeout(() => setSubscribedSuccess(false), 8000);
    } catch (err) {
      console.error("Subscribing failed:", err);
      alert("Uh oh! Subscription failed, please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  // Active feedback invitation filter
  const activeRequest = caseStudyRequests.find(r => r.isActive);
  const userHasSubmitted = activeRequest && user && caseStudies.some(cs => cs.requestId === activeRequest.id && cs.memberId === user.id);

  const handleStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeRequest || !storyContent.trim()) return;

    setIsSubmittingStory(true);
    setStoryError(null);

    try {
      // 1. Core live AI extraction of category, sentiment and sentence summary!
      const analysis = await analyzeCaseStudy(storyContent);

      // 2. Write to Firestore 'case_studies'
      await addDoc(collection(db, 'case_studies'), {
        requestId: activeRequest.id,
        requestTitle: activeRequest.title,
        memberId: user.id,
        memberName: user.name || 'Resident',
        memberEmail: user.email || '',
        content: storyContent,
        date: new Date().toISOString().split('T')[0],
        status: 'approved', // Auto-approved for simple reporting & stats boards
        category: analysis.category,
        aiSummary: analysis.aiSummary,
        sentimentScore: analysis.sentimentScore,
        createdAt: serverTimestamp()
      });

      setDetectedCategory(analysis.category);
      setStorySuccess(true);
      setStoryContent('');
      setTimeout(() => {
        setIsSubmittingStory(false);
        setShowStoryModal(false);
        setStorySuccess(false);
      }, 6000);
    } catch (err) {
      console.error("Story submission error:", err);
      setStoryError("We encountered a small error analyzing or saving your story. Please try again!");
      setIsSubmittingStory(false);
    }
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    const path = 'inquiries';
    try {
      // 1. Save to inquiries collection for database record
      await addDoc(collection(db, path), {
        ...inquiryForm,
        type: 'Get Involved',
        timestamp: serverTimestamp(),
        status: 'new',
        targetEmail: 'jstreet@freeatlast.co.uk'
      });

      // 2. Trigger actual email via 'mail' collection
      await addDoc(collection(db, 'mail'), {
        to: ['jstreet@freeatlast.co.uk', 'info@freeatlast.co.uk'],
        replyTo: inquiryForm.email,
        message: {
          subject: `New Get Involved Inquiry from ${inquiryForm.name}`,
          text: `Name: ${inquiryForm.name}\nEmail: ${inquiryForm.email}\nMobile: ${inquiryForm.mobile}\nMessage: ${inquiryForm.message}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #7e2b33; padding: 20px; border-radius: 15px;">
              <h2 style="color: #2b337e;">New "Get Involved" Inquiry</h2>
              <p>Someone has reached out via the free@last Community Hub portal.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p><strong>Name:</strong> ${inquiryForm.name}</p>
              <p><strong>Email:</strong> ${inquiryForm.email}</p>
              <p><strong>Mobile:</strong> ${inquiryForm.mobile}</p>
              <div style="background: #f4792010; border-left: 4px solid #f47920; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #444; line-height: 1.6;">${inquiryForm.message}</p>
              </div>
              <p style="font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
                Sent via free@last Community Hub Digital Platform
              </p>
            </div>
          `
        }
      });

      setIsSuccess(true);
      setTimeout(() => {
        setShowInquiryModal(false);
        setIsSuccess(false);
        setInquiryForm({ name: '', email: '', mobile: '', message: '' });
      }, 5000);
    } catch (error) {
      setErrorMessage("Something went wrong. Please try again or email us directly at jstreet@freeatlast.co.uk");
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch (err) {
        console.error("Firestore Error logged:", err);
      }
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

      {/* Active Call for Case Studies / Impact Stories */}
      {activeRequest && user && user.role !== 'admin' && (
        <section className="bg-yellow-50/70 py-12 px-6 shadow-inner border-y border-yellow-100 flex items-center justify-center animate-fadeIn">
          <div className="max-w-6xl w-full flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-start gap-4">
              <div style={{ backgroundColor: COLORS.yellow }} className="p-4 rounded-2xl shrink-0 text-white shadow-md">
                <span className="text-xl animate-pulse block">✨</span>
              </div>
              <div>
                <span className="text-[9px] font-black tracking-widest text-brand-orange uppercase brand-heading bg-brand-orange/5 px-2.5 py-1 rounded-full border border-brand-orange/15 shadow-sm">Monthly callback for stories</span>
                <h3 className="text-2xl font-bold text-brand-dark-blue brand-heading uppercase mt-2.5 leading-tight">{activeRequest.title}</h3>
                <p className="text-slate-600 text-sm font-light mt-2 max-w-2xl leading-relaxed">{activeRequest.prompt}</p>
              </div>
            </div>
            
            <div className="shrink-0 w-full md:w-auto">
              {userHasSubmitted ? (
                <div style={{ borderColor: COLORS.green }} className="border-2 rounded-2xl px-5 py-3.5 bg-green-50/50 flex items-center gap-3">
                  <div style={{ backgroundColor: COLORS.green }} className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                  <span style={{ color: COLORS.secondary }} className="font-bold text-xs uppercase tracking-wider brand-heading">Submitted & Compiled</span>
                </div>
              ) : (
                <button
                  onClick={() => setShowStoryModal(true)}
                  style={{ backgroundColor: COLORS.orange }}
                  className="w-full md:w-auto hover:brightness-110 text-white px-8 py-5 rounded-xl font-bold text-sm tracking-wider uppercase brand-heading shadow-lg active:scale-95 transition-all text-center"
                >
                  Write Your Story
                </button>
              )}
            </div>
          </div>
        </section>
      )}

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
      <section id="updates" style={{ backgroundColor: COLORS.secondary }} className="py-24 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-end mb-16 border-b border-white/10 pb-8">
            <h2 className="text-4xl font-bold brand-heading uppercase tracking-widest">Centre Updates</h2>
            <button 
              onClick={() => setActiveTab('activities')}
              style={{ color: COLORS.lightBlue }} 
              className="font-bold uppercase tracking-widest text-xs brand-heading hover:text-white transition-colors"
            >
              View All Events
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {announcements.slice(0, 2).map((item) => (
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
          <div className="mt-8 flex justify-center">
             <button 
                onClick={() => setShowAllNews(true)}
                className="text-[10px] font-black tracking-widest text-white/40 hover:text-white uppercase brand-heading transition-colors"
             >
                View News Archive
             </button>
          </div>
        </div>
      </section>

      {/* All News Modal */}
      <AnimatePresence>
        {showAllNews && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllNews(false)}
              className="absolute inset-0 bg-brand-dark-blue/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div style={{ backgroundColor: COLORS.secondary }} className="p-10 text-white flex justify-between items-center shrink-0">
                <h3 className="text-2xl font-black brand-heading uppercase tracking-widest leading-none">Complete Feed</h3>
                <button 
                  onClick={() => setShowAllNews(false)}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="p-8 md:p-12 overflow-y-auto space-y-8">
                {announcements.map((item) => (
                  <div key={item.id} className="p-8 bg-slate-50 rounded-3xl border border-slate-100 group">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-orange brand-heading">{item.category}</span>
                      <span className="text-[10px] font-bold text-slate-400 brand-heading">{new Date(item.date).toLocaleDateString()}</span>
                    </div>
                    <h4 style={{ color: COLORS.secondary }} className="text-xl font-bold mb-3 brand-heading uppercase leading-tight">{item.title}</h4>
                    <p className="text-slate-500 text-sm font-light leading-relaxed">{item.content}</p>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <div className="text-center py-20">
                    <Icons.Megaphone className="h-16 w-16 text-slate-200 mx-auto mb-6" />
                    <p className="text-slate-400 font-bold brand-heading uppercase tracking-widest">No updates found yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* Newsletter Signup Section */}
      <section style={{ backgroundColor: COLORS.secondary }} className="py-24 px-6 text-white text-center relative overflow-hidden rounded-[3rem] max-w-7xl mx-auto my-12 shadow-xl border border-slate-100">
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-brand-orange opacity-20 rounded-full blur-3xl"></div>
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-brand-light-blue opacity-20 rounded-full blur-3xl"></div>
        <div className="max-w-3xl mx-auto relative z-10">
          <span style={{ color: COLORS.yellow }} className="text-xs font-black uppercase tracking-[0.2em] brand-heading block mb-3">Stay Connected</span>
          <h2 className="text-4xl md:text-5xl font-black mb-6 brand-heading uppercase tracking-tight leading-none text-white">Subscribe to Our Newsletter</h2>
          <p className="text-white/80 text-base font-light max-w-xl mx-auto mb-10 leading-relaxed">
            Get key monthly social impact stats, youth activities bulletins, and opportunities to support Nechells, directly in your inbox.
          </p>

          {subscribedSuccess ? (
            <div className="bg-white/10 border border-white/20 p-8 rounded-3xl text-white font-bold max-w-lg mx-auto animate-fadeIn">
              <span className="text-3xl block mb-2">🎉</span>
              <p className="text-lg brand-heading uppercase tracking-wider text-brand-orange">Thank you for subscribing!</p>
              <p className="text-xs text-white/70 font-light mt-1">You are successfully added to the free@last mailing list.</p>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
              <input
                required
                type="text"
                placeholder="Your Name"
                value={subscriberName}
                onChange={(e) => setSubscriberName(e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 focus:border-brand-orange focus:bg-white focus:text-slate-700 outline-none px-6 py-4 rounded-xl text-white font-bold transition placeholder:text-white/40"
              />
              <input
                required
                type="email"
                placeholder="Email Address"
                value={subscriberEmail}
                onChange={(e) => setSubscriberEmail(e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 focus:border-brand-orange focus:bg-white focus:text-slate-700 outline-none px-6 py-4 rounded-xl text-white font-bold transition placeholder:text-white/40"
              />
              <button
                type="submit"
                disabled={subscribing}
                style={{ backgroundColor: COLORS.orange }}
                className="text-white font-black px-10 py-4 rounded-xl uppercase tracking-widest text-xs brand-heading hover:brightness-110 shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                {subscribing ? "Subscribing..." : "Join List"}
              </button>
            </form>
          )}
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
                    {errorMessage && (
                      <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium animate-shake">
                        {errorMessage}
                      </div>
                    )}
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
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Email Address</label>
                      <input 
                        required
                        type="email"
                        value={inquiryForm.email}
                        onChange={(e) => setInquiryForm({...inquiryForm, email: e.target.value})}
                        className="w-full px-6 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all"
                        placeholder="Your email address"
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

      {/* Case Study / Impact Reflection Submission Modal */}
      <AnimatePresence>
        {showStoryModal && activeRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSubmittingStory) setShowStoryModal(false);
              }}
              className="absolute inset-0 bg-brand-dark-blue/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div style={{ backgroundColor: COLORS.secondary }} className="p-10 text-white relative">
                {!isSubmittingStory && (
                  <button 
                    onClick={() => setShowStoryModal(false)}
                    className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
                  >
                    <Icons.Plus className="rotate-45 h-8 w-8" />
                  </button>
                )}
                <div style={{ color: COLORS.yellow }} className="mb-4 text-2xl">✨</div>
                <h2 className="text-3xl font-bold brand-heading uppercase tracking-tight">Share Your Experience</h2>
                <p className="text-white/60 font-light mt-2">{activeRequest.title}</p>
              </div>

              <div className="p-10">
                {storySuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-6"
                  >
                    <div style={{ backgroundColor: '#2ca58d20', color: '#2ca58d' }} className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-4xl animate-bounce">🌟</span>
                    </div>
                    <h3 className="text-2xl font-bold brand-heading text-brand-dark-blue mb-2">STORY SUBMITTED!</h3>
                    <p className="text-slate-500 font-light text-sm mb-6">
                      Thank you for sharing. Your story was instantly processed by our AI systems:
                    </p>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-4 text-left space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase brand-heading">AI Category:</span>
                        <span style={{ color: COLORS.orange }} className="font-bold uppercase brand-heading bg-orange-50 px-2 py-0.5 rounded border border-orange-100">{detectedCategory}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase brand-heading">Sentiment Score:</span>
                        <span className="font-extrabold text-teal-600">★★★★★ (5 / 5)</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed italic border-t border-slate-100/50 pt-2.5">
                        Your voice is recorded securely to demonstrate the life-transforming social value of free@last's initiatives in Nechells.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleStorySubmit} className="space-y-6">
                    {storyError && (
                      <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium animate-shake">
                        {storyError}
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading bg-slate-50 px-2 py-1 rounded">
                        Please share feel free@last has helped you or your family
                      </label>
                      <textarea 
                        required
                        disabled={isSubmittingStory}
                        value={storyContent}
                        onChange={(e) => setStoryContent(e.target.value)}
                        className="w-full px-6 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all h-40 resize-none leading-relaxed text-slate-700"
                        placeholder="Tell us about your journey, what programs you attended (e.g. youth club, sports, trips), the team's support, or anything that made a real difference..."
                      />
                    </div>
                    
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 flex items-start gap-2.5">
                      <span className="text-base select-none">🤖</span>
                      <p className="leading-normal">
                        <strong>AI Integration Notice:</strong> Upon submission, Gemini's AI extractor will instantly index your story category and summarize the qualitative social impact value for our aggregate founders' report.
                      </p>
                    </div>

                    <button 
                      disabled={isSubmittingStory || !storyContent.trim()}
                      type="submit"
                      style={{ backgroundColor: COLORS.orange }}
                      className="w-full py-5 text-white rounded-xl font-bold text-lg brand-heading uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isSubmittingStory ? 'AI Categorizing Story...' : 'Submit Story ✨'}
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
