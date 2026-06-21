import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { Icons, COLORS } from '../constants';
import { User, FriendNeed, FriendOffer } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../services/firestoreUtils';

interface FriendsOfProps {
  user: User | null;
  setActiveTab: (tab: string) => void;
}

export const FriendsOf: React.FC<FriendsOfProps> = ({ user, setActiveTab }) => {
  const [needs, setNeeds] = useState<FriendNeed[]>([]);
  const [offers, setOffers] = useState<FriendOffer[]>([]);
  const [loadingNeeds, setLoadingNeeds] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);

  // Offer Form State
  const [offerForm, setOfferForm] = useState({
    name: user?.role === 'friend' ? user.name : '',
    email: user?.role === 'friend' ? user.email : '',
    mobile: (user as any)?.profile?.mobileNumber || '',
    businessName: (user as any)?.profile?.businessName || '',
    category: 'volunteering',
    description: ''
  });

  const [needForm, setNeedForm] = useState({
    title: '',
    description: '',
    category: 'volunteers'
  });

  const [showAddNeed, setShowAddNeed] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [offerStatusMsg, setOfferStatusMsg] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';
  const isFriend = user?.role === 'friend';

  useEffect(() => {
    // 1. Listen to active Center Needs
    const needsPath = 'friend_needs';
    const unsubscribeNeeds = onSnapshot(collection(db, needsPath), (snapshot) => {
      const list: FriendNeed[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as FriendNeed);
      });
      // Sort: active / un-sent first, then by date newest
      setNeeds(list.sort((a,b) => b.date.localeCompare(a.date)));
      setLoadingNeeds(false);
    }, (error) => {
      console.error("Failed to load center needs", error);
      setLoadingNeeds(false);
    });

    // 2. Listen to Offers (Admin can see all offers, friends only see their own)
    const offersPath = 'friend_offers';
    let q = query(collection(db, offersPath));
    if (user && !isAdmin) {
      q = query(collection(db, offersPath), where('friendEmail', '==', user.email));
    }

    const unsubscribeOffers = onSnapshot(q, (snapshot) => {
      const list: FriendOffer[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as FriendOffer);
      });
      setOffers(list.sort((a,b) => b.date.localeCompare(a.date)));
      setLoadingOffers(false);
    }, (error) => {
      console.error("Failed to load offers", error);
      setLoadingOffers(false);
    });

    return () => {
      unsubscribeNeeds();
      if (user) unsubscribeOffers();
      else setLoadingOffers(false);
    };
  }, [user, isAdmin]);

  // Handle supporters submitting offers
  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerForm.name || !offerForm.email || !offerForm.mobile || !offerForm.description) {
      alert("Please fill in Name, Email, Mobile and your Offer Description.");
      return;
    }

    setSubmittingOffer(true);
    const path = 'friend_offers';
    try {
      const payload: Omit<FriendOffer, 'id'> = {
        friendName: offerForm.name,
        friendEmail: offerForm.email,
        friendMobile: offerForm.mobile,
        businessName: offerForm.businessName || '',
        category: offerForm.category as any,
        description: offerForm.description,
        date: new Date().toISOString(),
        status: 'pending'
      };

      // 1. Store in friend_offers
      const offerDoc = await addDoc(collection(db, path), payload);

      // 2. Add to inquiries as a notification for Admin
      await addDoc(collection(db, 'inquiries'), {
        name: offerForm.name,
        email: offerForm.email,
        mobile: offerForm.mobile,
        type: 'friend_offer',
        message: `SUPPORTER OFFER OF ${offerForm.category.toUpperCase()}\nBusiness: ${offerForm.businessName || 'N/A'}\n\nOffer details:\n${offerForm.description}`,
        timestamp: serverTimestamp(),
        status: 'new',
        targetEmail: 'jstreet@freeatlast.co.uk'
      });

      // 3. Trigger email via Firebase 'mail' collection to JStreet
      await addDoc(collection(db, 'mail'), {
        to: ['jstreet@freeatlast.co.uk'],
        replyTo: offerForm.email,
        message: {
          subject: `🤝 New Friend Offer: ${offerForm.category.toUpperCase()} from ${offerForm.name}`,
          text: `You have received a new support offer!\n\nSupporter: ${offerForm.name}\nEmail: ${offerForm.email}\nMobile: ${offerForm.mobile}\nBusiness: ${offerForm.businessName || 'N/A'}\nOffer Category: ${offerForm.category}\n\nOffer Description:\n${offerForm.description}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #f47920; padding: 25px; border-radius: 15px;">
              <h2 style="color: #2b337e; border-bottom: 2px solid #f47920; padding-bottom: 10px;">New Friend Offer Submitted</h2>
              <p>A new support opportunity has been offered by <strong>${offerForm.name}</strong>.</p>
              <div style="background: #fdf6f0; padding: 15px; border-radius: 10px; border-left: 4px solid #f47920; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Category:</strong> ${offerForm.category.toUpperCase()}</p>
                <p style="margin: 5px 0;"><strong>Business name:</strong> ${offerForm.businessName || 'N/A'}</p>
                <p style="margin: 5px 0;"><strong>Contact Mobile:</strong> ${offerForm.mobile}</p>
                <p style="margin: 5px 0;"><strong>Email Address:</strong> ${offerForm.email}</p>
              </div>
              <p style="white-space: pre-wrap; color: #444; background: #f9f9f9; padding: 15px; border-radius: 8px;">${offerForm.description}</p>
              <p style="font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
                Log into your free@last management console to review this offer.
              </p>
            </div>
          `
        }
      });

      setOfferStatusMsg("Thank you! Your supporting offer has been received and compiled. A notification was sent to our founders!");
      setOfferForm({
        name: user?.role === 'friend' ? user.name : '',
        email: user?.role === 'friend' ? user.email : '',
        mobile: '',
        businessName: '',
        category: 'volunteering',
        description: ''
      });
      setTimeout(() => setOfferStatusMsg(null), 8000);
    } catch (error) {
      console.error("Failed to add offer:", error);
      alert("Error submitting offer details.");
    } finally {
      setSubmittingOffer(false);
    }
  };

  // Admin adding a need
  const handleAddNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!needForm.title || !needForm.description) return;

    const path = 'friend_needs';
    try {
      await addDoc(collection(db, path), {
        title: needForm.title,
        description: needForm.description,
        category: needForm.category,
        date: new Date().toISOString().split('T')[0],
        sentStatus: 'draft'
      });
      alert("Need requested successfully! Click 'Send Broadcast' to notify all registered Friends.");
      setNeedForm({ title: '', description: '', category: 'volunteers' });
      setShowAddNeed(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Admin broadcasting a need as an email notification to all registration 'friend' roles
  const handleBroadcastNeed = async (need: FriendNeed) => {
    setBroadcastingId(need.id);
    try {
      // 1. Query all users with role == 'friend'
      const q = query(collection(db, 'users'), where('role', '==', 'friend'));
      const querySnap = await getDocs(q);
      const friendsEmails: string[] = [];
      querySnap.forEach(docSnap => {
        const u = docSnap.data();
        if (u.email) friendsEmails.push(u.email);
      });

      if (friendsEmails.length === 0) {
        alert("Need published! Currently, there are no registered Friends of free@last accounts to email, but it is now publicly visible on this page.");
      } else {
        // 2. Add email trigger documents in bulk or a single transactional array
        await addDoc(collection(db, 'mail'), {
          to: friendsEmails,
          message: {
            subject: `🚨 Supporting Call: ${need.category.toUpperCase()} urgent need: ${need.title}`,
            text: `Hi Friend of free@last!\n\nOur team has added a new center need that you might be able to help us with:\n\nNeed Title: ${need.title}\nCategory: ${need.category}\n\nDescription:\n${need.description}\n\nIf you have equipment, resources, or time that can satisfy this request, please log into your hub account and post an offer under "Friends Of" page!\n\nWarm regards,\nManagement Team\nfree@last Nechells Hub`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; border: 2px solid #2b337e; padding: 25px; border-radius: 15px;">
                <div style="background-color: #2b337e; color: #ffffff; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -25px -25px 25px -25px;">
                  <h2 style="margin: 0; font-size: 24px;">Supporting Call for free@last</h2>
                  <p style="margin: 5px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #ffd600;">Urgent Center Need</p>
                </div>
                <p>Hello valued Friend of free@last,</p>
                <p>The Nechells Hub team has launched a new support request where your help would make a tremendous social impact:</p>
                
                <div style="background: #f5f6fa; padding: 20px; border-radius: 10px; border-left: 5px solid #2b337e; margin: 20px 0;">
                  <h3 style="margin: 0 0 5px 0; color: #2b337e;">${need.title}</h3>
                  <span style="background: #ffd600; color: #000; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 5px; text-transform: uppercase;">Category: ${need.category}</span>
                  <p style="margin: 15px 0 0 0; color: #444; line-height: 1.6; white-space: pre-wrap;">${need.description}</p>
                </div>

                <p>If you can offer volunteering hours, resources, equipment, financial sponsorship, or host an event, please visit the <strong>Friends Of</strong> page in your app to make an offer!</p>
                
                <p style="margin-top: 30px;">Thank you for standing alongside the youth & families of Nechells.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
                <p style="font-size: 10px; color: #999; text-align: center;">
                  To unsubscribe from these callouts, please contact support. Registered Charity No. 1101078.
                </p>
              </div>
            `
          }
        });
        alert(`Request successfully broadcasted to ${friendsEmails.length} registered friend(s)!`);
      }

      // 3. Mark as sent in need document
      await updateDoc(doc(db, 'friend_needs', need.id), {
        sentStatus: 'sent',
        sentAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
      alert("Error broadcasting. Please try again.");
    } finally {
      setBroadcastingId(null);
    }
  };

  const handleDeleteNeed = async (needId: string) => {
    if (!window.confirm("Are you sure you want to delete this support need?")) return;
    try {
      await deleteDoc(doc(db, 'friend_needs', needId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOfferStatus = async (offer: FriendOffer, newStatus: 'accepted' | 'declined') => {
    try {
      await updateDoc(doc(db, 'friend_offers', offer.id), { status: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 animate-fadeIn">
      {/* Hero Banner Section */}
      <div className="bg-gradient-to-br from-brand-dark-blue to-[#404ebd] rounded-[3.5rem] p-12 md:p-20 text-white shadow-xl relative overflow-hidden mb-16">
        <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-brand-orange opacity-15 rounded-full blur-3xl"></div>
        <div className="max-w-3xl relative z-10">
          <span style={{ color: COLORS.yellow }} className="text-xs font-black uppercase tracking-[0.2em] brand-heading block mb-4">Partner with Nechells Hub</span>
          <h1 className="text-4xl md:text-6xl font-black mb-6 brand-heading uppercase tracking-tight leading-none">Friends of free@last</h1>
          <p className="text-white/80 text-base md:text-xl font-light leading-relaxed mb-8">
            Our "Friends of free@last" network facilitates localized support. Supporter friends bypass long member intake questionnaires, get instant access to our real-time photos/videos gallery, and collaborate directly on center needs.
          </p>
          {!user ? (
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setActiveTab('login')}
                style={{ backgroundColor: COLORS.orange }}
                className="text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:brightness-110 shadow-lg"
              >
                Sign Up as a Friend
              </button>
            </div>
          ) : (
            <div className="bg-white/10 px-6 py-3 rounded-2xl inline-flex items-center gap-3 border border-white/10 text-xs font-medium brand-heading uppercase tracking-wider">
              <span>Status: Registered {user.role === 'friend' ? 'Friend Account' : user.role.toUpperCase()}</span>
              <span className="text-brand-orange">●</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Side: Center Needs Board */}
        <div className="lg:col-span-7 space-y-12">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 style={{ color: COLORS.secondary }} className="text-3xl font-black brand-heading uppercase tracking-tight">Center Needs</h2>
                <p className="text-slate-400 text-sm font-medium">How you can make an immediate, direct social impact today</p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => setShowAddNeed(!showAddNeed)}
                  style={{ borderColor: COLORS.orange, color: COLORS.orange }}
                  className="px-5 py-2.5 rounded-xl border-2 font-bold text-[10px] uppercase tracking-widest hover:bg-orange-50 active:scale-95 transition-all brand-heading"
                >
                  {showAddNeed ? "Close Editor" : "New Support Call"}
                </button>
              )}
            </div>

            {/* Admin Add Need Panel */}
            <AnimatePresence>
              {showAddNeed && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-inner mb-8 space-y-4"
                >
                  <form onSubmit={handleAddNeed} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Need Category</label>
                        <select
                          value={needForm.category}
                          onChange={(e) => setNeedForm({ ...needForm, category: e.target.value })}
                          className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl font-bold text-slate-700 outline-none focus:border-brand-orange transition-all"
                        >
                          <option value="volunteers">Volunteers</option>
                          <option value="resources">Resources / Materials</option>
                          <option value="finance">Finance / Giving</option>
                          <option value="events">Events Assistance</option>
                          <option value="sponsorship">Corporate Sponsorship</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Minibus tires or holiday lunch cover"
                          value={needForm.title}
                          onChange={(e) => setNeedForm({ ...needForm, title: e.target.value })}
                          className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl font-bold text-slate-700 outline-none focus:border-brand-orange"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1 font-sans">Details / Message</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="What specific resources or volunteering skills is the center looking for?"
                        value={needForm.description}
                        onChange={(e) => setNeedForm({ ...needForm, description: e.target.value })}
                        className="w-full bg-white border border-slate-200 p-4 rounded-xl font-bold text-slate-700 outline-none focus:border-brand-orange resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      style={{ backgroundColor: COLORS.secondary }}
                      className="text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                    >
                      Save Callout Draft
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {loadingNeeds ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : needs.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8">
                <p className="text-slate-400 font-medium text-sm">No active support requests currently published by admins.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {needs.map(need => (
                  <div
                    key={need.id}
                    className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <span
                          className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest text-white brand-heading"
                          style={{
                            backgroundColor:
                              need.category === 'volunteers' ? COLORS.green :
                              need.category === 'resources' ? COLORS.orange :
                              need.category === 'finance' ? COLORS.lightBlue :
                              need.category === 'events' ? COLORS.yellow : COLORS.secondary
                          }}
                        >
                          {need.category}
                        </span>
                        
                        {isAdmin && (
                          <div className="flex gap-2">
                            {need.sentStatus === 'draft' ? (
                              <button
                                disabled={broadcastingId === need.id}
                                onClick={() => handleBroadcastNeed(need)}
                                style={{ backgroundColor: COLORS.orange }}
                                className="text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest disabled:opacity-50"
                              >
                                {broadcastingId === need.id ? "Sending..." : "📢 Send Broadcast"}
                              </button>
                            ) : (
                              <span className="text-[10px] text-green-500 font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                                ✓ Sent Notification
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteNeed(need.id)}
                              className="text-slate-400 hover:text-red-500 px-2 text-sm"
                              title="Delete Callout"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>

                      <h3 style={{ color: COLORS.secondary }} className="text-xl font-black brand-heading uppercase tracking-tight leading-none mb-3">
                        {need.title}
                      </h3>
                      <p className="text-slate-500 text-sm font-light leading-relaxed whitespace-pre-wrap">
                        {need.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span>Posted Needs Area</span>
                      <span>{need.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Make an Offer / My Offers Form */}
        <div className="lg:col-span-5 space-y-12">
          {/* Supporter Offers Area */}
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 md:p-10">
            <h2 style={{ color: COLORS.secondary }} className="text-2xl font-black brand-heading uppercase tracking-tight mb-2">Offer Help</h2>
            <p className="text-slate-400 text-sm font-medium mb-8">Tell us what resources, equipment, money, or time you stand ready to contribute!</p>

            {offerStatusMsg && (
              <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-xs font-bold font-sans">
                {offerStatusMsg}
              </div>
            )}

            <form onSubmit={handleOfferSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="James Supporter"
                  value={offerForm.name}
                  onChange={(e) => setOfferForm({ ...offerForm, name: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-transparent focus:border-brand-orange outline-none rounded-xl font-bold text-slate-700 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={offerForm.email}
                    onChange={(e) => setOfferForm({ ...offerForm, email: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-transparent focus:border-brand-orange outline-none rounded-xl font-bold text-slate-700 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mobile No.</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 07123456789"
                    value={offerForm.mobile}
                    onChange={(e) => setOfferForm({ ...offerForm, mobile: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-transparent focus:border-brand-orange outline-none rounded-xl font-bold text-slate-700 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Business Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Deloitte"
                    value={offerForm.businessName}
                    onChange={(e) => setOfferForm({ ...offerForm, businessName: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-transparent focus:border-brand-orange outline-none rounded-xl font-bold text-slate-700 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Offer Category</label>
                  <select
                    value={offerForm.category}
                    onChange={(e) => setOfferForm({ ...offerForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-xl font-bold text-slate-700 outline-none focus:border-brand-orange transition"
                  >
                    <option value="volunteering">Volunteering / Time</option>
                    <option value="resources">Materials / Goods</option>
                    <option value="equipment">Equipment to keep/sell</option>
                    <option value="sale-items">Donation Items for resell</option>
                    <option value="money">Financial Gift</option>
                    <option value="sponsorship">Enterprise Sponsorship</option>
                    <option value="other">Other Potential Offer</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Describe what you can offer</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter details of your supporting offer, equipment sizes, available sponsorship values, of what you could volunteering help us with."
                  value={offerForm.description}
                  onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-transparent focus:border-brand-orange outline-none rounded-xl font-bold text-slate-700 transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingOffer}
                style={{ backgroundColor: COLORS.orange }}
                className="w-full text-white font-bold py-4 rounded-xl transition shadow-lg active:scale-95 hover:brightness-110 text-xs uppercase tracking-widest mt-4 disabled:opacity-50"
              >
                {submittingOffer ? "Sending details..." : "Submit Offer to Admin"}
              </button>
            </form>
          </div>

          {/* Active Offers Logs (visible to logged-in user or admin) */}
          {user && (
            <div className="space-y-4">
              <h3 style={{ color: COLORS.secondary }} className="text-xl font-black brand-heading uppercase tracking-tight">
                {isAdmin ? "Track Supporter Offers" : "My Submitted Offers"}
              </h3>

              {loadingOffers ? (
                <div className="flex justify-center h-20">
                  <div className="w-5 h-5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : offers.length === 0 ? (
                <div className="p-6 bg-slate-50 border rounded-2xl text-center text-xs text-slate-400">
                  No offers recorded yet. Keep checking!
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {offers.map(offer => (
                    <div key={offer.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-bold text-brand-orange bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-md uppercase tracking-wider">
                            {offer.category}
                          </span>
                          <span
                            className={`text-[9px] font-black uppercase tracking-widest brand-heading rounded px-2 py-0.5 ${
                              offer.status === 'accepted' ? 'text-green-500 bg-green-50' :
                              offer.status === 'declined' ? 'text-red-500 bg-red-50' : 'text-slate-400 bg-slate-100'
                            }`}
                          >
                            {offer.status}
                          </span>
                        </div>

                        {isAdmin && (
                          <p className="text-xs font-bold text-slate-700 mb-1">
                            {offer.friendName} {offer.businessName && `(${offer.businessName})`}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 leading-relaxed italic">{offer.description}</p>
                      </div>

                      {isAdmin && offer.status === 'pending' && (
                        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200">
                          <button
                            onClick={() => handleUpdateOfferStatus(offer, 'accepted')}
                            className="bg-green-500 text-white px-3 py-1 rounded text-[9px] font-bold uppercase hover:brightness-115"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleUpdateOfferStatus(offer, 'declined')}
                            className="bg-red-500 text-white px-3 py-1 rounded text-[9px] font-bold uppercase hover:brightness-115"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
