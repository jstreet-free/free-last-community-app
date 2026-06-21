import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Icons, COLORS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

export const AdminNewsletterManager: React.FC = () => {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Composition State
  const [form, setForm] = useState({
    title: '',
    imageUrl: '',
    videoUrl: '',
    linkUrl: '',
    linkText: 'Learn More',
    content: ''
  });

  const [newSub, setNewSub] = useState({ name: '', email: '' });
  const [showAddSub, setShowAddSub] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Listen to subscribers
    const unsubSubscribers = onSnapshot(collection(db, 'newsletter_subscribers'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort newest subscribers first
      list.sort((a,b) => b.subscribedAt ? b.subscribedAt.localeCompare(a.subscribedAt) : 0);
      setSubscribers(list);
    });

    // Listen to sent newsletters history
    const unsubNewsletters = onSnapshot(collection(db, 'newsletters'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a,b) => b.sentAt.localeCompare(a.sentAt));
      setNewsletters(list);
      setLoading(false);
    });

    return () => {
      unsubSubscribers();
      unsubNewsletters();
    };
  }, []);

  const handleManualSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.name || !newSub.email) return;

    try {
      await addDoc(collection(db, 'newsletter_subscribers'), {
        name: newSub.name,
        email: newSub.email,
        subscribedAt: new Date().toISOString()
      });
      setNewSub({ name: '', email: '' });
      setShowAddSub(false);
      alert("Subscriber added successfully to the registry!");
    } catch (err) {
      console.error(err);
      alert("Failed to register subscriber manually.");
    }
  };

  const handleDeleteSubscriber = async (subId: string) => {
    if (!window.confirm("Are you sure you want to remove this subscriber?")) return;
    try {
      await deleteDoc(doc(db, 'newsletter_subscribers', subId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) {
      alert("Please enter a Title and the Newsletter Content.");
      return;
    }

    if (subscribers.length === 0) {
      alert("You have 0 subscribers! Please add yourself or a test account to the subscription list first.");
      return;
    }

    if (!window.confirm(`Are you ready to broadcast the newsletter "${form.title}" to all ${subscribers.length} subscriber(s)?`)) {
      return;
    }

    setSending(true);
    try {
      // 1. Log the campaign in "newsletters"
      const campaignDoc = {
        title: form.title,
        content: form.content,
        imageUrl: form.imageUrl,
        videoUrl: form.videoUrl,
        linkUrl: form.linkUrl,
        linkText: form.linkText,
        sentAt: new Date().toISOString(),
        recipientCount: subscribers.length
      };

      await addDoc(collection(db, 'newsletters'), campaignDoc);

      // 2. Format a gorgeous responsive HTML email template
      const formattedHtml = `
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Brand Header -->
          <div style="background-color: #2b337e; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
              <span style="color: #ffffff;">free</span><span style="color: #f47920;">@</span><span style="color: #ffffff;">last</span> Bulletin
            </h1>
            <p style="color: #ffd600; margin: 5px 0 0 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">Monthly Community Update</p>
          </div>

          ${form.imageUrl ? `
            <div style="width: 100%; aspect-ratio: 16/9; max-height: 250px; overflow: hidden;">
              <img src="${form.imageUrl}" alt="Monthly Highlight" style="width: 100%; height: auto; display: block;" />
            </div>
          ` : ''}

          <div style="padding: 40px 30px; color: #334155;">
            <h2 style="color: #2b337e; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 20px; text-transform: uppercase;">${form.title}</h2>
            
            <p style="font-size: 15px; line-height: 1.7; color: #516173; white-space: pre-wrap; margin-bottom: 25px;">${form.content}</p>

            ${form.videoUrl ? `
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 15px; text-align: center; margin: 25px 0;">
                <span style="font-size: 24px; display: block; margin-bottom: 5px;">🎞️</span>
                <strong style="color: #2b337e; font-size: 14px; display: block; margin-bottom: 10px;">Featured Highlight Video</strong>
                <a href="${form.videoUrl}" style="color: #f47920; font-weight: 700; font-size: 13px; text-decoration: underline;">Watch Clip on YouTube &rarr;</a>
              </div>
            ` : ''}

            ${form.linkUrl ? `
              <div style="text-align: center; margin-top: 35px; margin-bottom: 10px;">
                <a href="${form.linkUrl}" style="background-color: #f47920; color: #ffffff; padding: 15px 35px; border-radius: 12px; font-weight: 800; font-size: 14px; text-transform: uppercase; text-decoration: none; letter-spacing: 1px; display: inline-block;">
                  ${form.linkText}
                </a>
              </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div style="background-color: #f1f5f9; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 11px; line-height: 1.6;">
            <p style="margin: 0;"><strong>free@last</strong> Nechells Hub, Birmingham. Registered Charity No. 1101078</p>
            <p style="margin: 5px 0 0 0;">You received this because you subscribed to our monthly social impact briefing.</p>
          </div>
        </div>
      `;

      // 3. Batch dispatch to our contact subscriber list via Firestore mail collection
      const recipientEmails = subscribers.map(s => s.email);

      await addDoc(collection(db, 'mail'), {
        to: recipientEmails,
        message: {
          subject: `📩 free@last Monthly update: ${form.title}`,
          html: formattedHtml
        }
      });

      setSendSuccess(`Campaign successfully dispatched and sent to ${recipientEmails.length} active subscriber inbox(es)!`);
      setForm({
        title: '',
        imageUrl: '',
        videoUrl: '',
        linkUrl: '',
        linkText: 'Learn More',
        content: ''
      });
      setTimeout(() => setSendSuccess(null), 10000);
    } catch (err) {
      console.error(err);
      alert("Error sending campaign.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-12 animate-fadeIn">
      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading block mb-1">Mailing List</span>
            <span style={{ color: COLORS.secondary }} className="text-4xl font-black brand-heading">{subscribers.length}</span>
            <span className="text-xs font-semibold text-slate-400 block mt-1">Active Subscribers</span>
          </div>
          <div style={{ backgroundColor: '#2b337e10', color: COLORS.secondary }} className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl">
            📧
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading block mb-1">Sent Campaigns</span>
            <span style={{ color: COLORS.orange }} className="text-4xl font-black brand-heading">{newsletters.length}</span>
            <span className="text-xs font-semibold text-slate-400 block mt-1">Total Dispatched Newsletters</span>
          </div>
          <div style={{ backgroundColor: '#f4792010', color: COLORS.orange }} className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl">
            📈
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading block mb-1">Target Rate</span>
            <span style={{ color: COLORS.green }} className="text-4xl font-black brand-heading">100%</span>
            <span className="text-xs font-semibold text-slate-400 block mt-1">Inbox Delivery Success</span>
          </div>
          <div style={{ backgroundColor: '#85c44110', color: COLORS.green }} className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl">
            ⚡
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Composition Form Editor (Left) */}
        <div className="lg:col-span-7 bg-white rounded-[3.5rem] border border-slate-100 shadow-sm p-8 md:p-12 space-y-8">
          <div>
            <h2 style={{ color: COLORS.secondary }} className="text-3xl font-black brand-heading uppercase tracking-tight mb-2">Compose newsletter</h2>
            <p className="text-slate-400 text-sm font-medium">Create and distribute beautifully designed bulletins to all supporters</p>
          </div>

          {sendSuccess && (
            <div className="p-5 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-xs font-bold leading-normal">
              {sendSuccess}
            </div>
          )}

          <form onSubmit={handleSendNewsletter} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading px-2">Campaign Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Nechells Community June Highlights Bulletin"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading px-2">Banner Image URL</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading px-2">Featured Video URL</label>
                <input
                  type="text"
                  placeholder="https://youtube.com/watch?v=..."
                  value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading px-2">Action Button Link</label>
                <input
                  type="text"
                  placeholder="https://freeatlast.co.uk/get-involved"
                  value={form.linkUrl}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading px-2">Button Action Text</label>
                <input
                  type="text"
                  placeholder="Learn More"
                  value={form.linkText}
                  onChange={(e) => setForm({ ...form, linkText: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading px-2">Text Content Body</label>
              <textarea
                rows={8}
                required
                placeholder="Write your email body copy here. Tell your founders and supporter network all the latest news, updates and milestones accomplished."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700 resize-none leading-relaxed"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={sending}
                style={{ backgroundColor: COLORS.orange }}
                className="w-full text-white font-black py-5 rounded-2xl transition hover:brightness-110 shadow-lg active:scale-95 text-xs uppercase tracking-widest brand-heading disabled:opacity-50"
              >
                {sending ? "Sending Bulletin Campaign..." : "📤 Send Monthly Newsletter"}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview (Right Area) */}
        <div className="lg:col-span-5 space-y-8">
          {/* Live Mobile Frame Preview */}
          <div className="bg-slate-100 rounded-[2.5rem] border border-slate-200 p-4 md:p-6 shadow-inner relative">
            <span className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-300 w-12 h-3 rounded-full"></span>
            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm p-4 text-left max-h-[600px] overflow-y-auto mt-4">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-4 border-b pb-2 flex justify-between">
                <span>Campaign Preview</span>
                <span>Responsive Frame</span>
              </div>

              {/* Mock compiled HTML container */}
              <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div style={{ backgroundColor: COLORS.secondary }} className="p-4 text-white text-center">
                  <h3 className="font-extrabold text-white text-lg brand-heading uppercase m-0 leading-none">free@last Bulletin</h3>
                  <span className="text-[8px] uppercase tracking-wider text-amber-300">Monthly Update</span>
                </div>

                {form.imageUrl && (
                  <div className="w-full aspect-video overflow-hidden bg-slate-900">
                    <img src={form.imageUrl} alt="Newsletter Header" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="p-5 text-slate-600">
                  <h4 style={{ color: COLORS.secondary }} className="font-black text-sm uppercase mb-3 leading-tight brand-heading">
                    {form.title || "Your Campaign Title Goes Here"}
                  </h4>
                  <p className="text-xs leading-relaxed font-light whitespace-pre-wrap mb-4 text-slate-500">
                    {form.content || "Compose your body copy using the editor on the left side. The preview panel updates live in real-time."}
                  </p>

                  {form.videoUrl && (
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center mb-4">
                      <span className="text-xl block">🎞️</span>
                      <strong className="text-slate-700 text-[10px] block font-sans">Featured Highlight Video</strong>
                      <span className="text-brand-orange font-bold text-[9px] underline">Watch on YouTube &rarr;</span>
                    </div>
                  )}

                  {form.linkUrl && (
                    <div className="text-center mt-6">
                      <span
                        style={{ backgroundColor: COLORS.orange }}
                        className="inline-block text-white text-[9px] font-bold px-4 py-2.5 rounded-lg uppercase tracking-wider shadow"
                      >
                        {form.linkText}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Subscribers contact management section */}
          <div className="bg-white rounded-[2.5rem] border p-6 md:p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 style={{ color: COLORS.secondary }} className="text-xl font-black brand-heading uppercase">Contacts List</h3>
                <p className="text-slate-400 text-xs font-medium">Review and append newsletter subscriber accounts</p>
              </div>

              <button
                onClick={() => setShowAddSub(!showAddSub)}
                style={{ borderColor: COLORS.orange, color: COLORS.orange }}
                className="border px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-orange-50 active:scale-95 transition-all brand-heading"
              >
                {showAddSub ? "✕" : "Add Subscriber"}
              </button>
            </div>

            <AnimatePresence>
              {showAddSub && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleManualSubscribe}
                  className="bg-slate-50 p-4 rounded-2xl border mb-6 space-y-3"
                >
                  <input
                    type="text"
                    required
                    placeholder="Supporter's Name"
                    value={newSub.name}
                    onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
                    className="w-full bg-white border px-3 py-2 text-xs rounded-lg font-bold text-slate-700 focus:border-brand-orange outline-none"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={newSub.email}
                    onChange={(e) => setNewSub({ ...newSub, email: e.target.value })}
                    className="w-full bg-white border px-3 py-2 text-xs rounded-lg font-bold text-slate-700 focus:border-brand-orange outline-none"
                  />
                  <button
                    type="submit"
                    style={{ backgroundColor: COLORS.secondary }}
                    className="w-full text-white font-bold py-2 text-[10px] rounded-lg uppercase tracking-wider"
                  >
                    Add Contact
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* List */}
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {subscribers.map((sub) => (
                <div key={sub.id} className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 flex items-center justify-between text-left">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">{sub.name}</h4>
                    <span className="text-[10px] font-mono text-slate-400">{sub.email}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteSubscriber(sub.id)}
                    className="text-slate-300 hover:text-red-500 text-xs px-2"
                    title="Remove subscriber"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {subscribers.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 leading-normal border border-dashed rounded-xl">
                  Subscription list is empty. Add a supporter to review subscriber actions.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
