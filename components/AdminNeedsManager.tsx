import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { Icons, COLORS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { FriendNeed } from '../types';

// Custom error categories for telemetry diagnostics
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {}, // Optional addition for monitoring
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  alert(`Operation Failed: ${error instanceof Error ? error.message : String(error)}`);
}

export const AdminNeedsManager: React.FC = () => {
  const [needs, setNeeds] = useState<FriendNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState({
    title: '',
    category: 'volunteers' as 'volunteers' | 'resources' | 'finance' | 'events' | 'sponsorship',
    description: ''
  });

  const [uiError, setUiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load Needs from collection 'friend_needs'
  useEffect(() => {
    const path = 'friend_needs';
    const unsub = onSnapshot(collection(db, path), (snapshot) => {
      const list: FriendNeed[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as FriendNeed);
      });
      // Sort newest posted needs first
      setNeeds(list.sort((a, b) => b.date.localeCompare(a.date)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleCreateNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setUiError(null);
    setSuccessMsg(null);

    if (!form.title.trim()) {
      setUiError("Please specify a clear need title.");
      return;
    }
    if (form.title.length > 200) {
      setUiError("The title must be under 200 characters.");
      return;
    }
    if (!form.description.trim()) {
      setUiError("Please enter descriptive details about what other resources or skills the center needs.");
      return;
    }
    if (form.description.length > 5000) {
      setUiError("The description is unreasonably long (must be under 5000 characters).");
      return;
    }

    const path = 'friend_needs';
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        date: new Date().toISOString().split('T')[0],
        sentStatus: 'draft' as const
      };

      await addDoc(collection(db, path), payload);

      setSuccessMsg("Support Callout draft created successfully! Send a broadcast to alert friends of free@last now.");
      setForm({
        title: '',
        category: 'volunteers',
        description: ''
      });
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const handleDeleteNeed = async (needId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this center support need?")) return;
    const path = `friend_needs/${needId}`;
    try {
      await deleteDoc(doc(db, 'friend_needs', needId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleBroadcastNeed = async (need: FriendNeed) => {
    setBroadcastingId(need.id);
    setUiError(null);
    setSuccessMsg(null);

    try {
      // 1. Fetch user emails in 'friend' role
      const q = query(collection(db, 'users'), where('role', '==', 'friend'));
      const querySnap = await getDocs(q);
      const friendsEmails: string[] = [];

      querySnap.forEach(docSnap => {
        const u = docSnap.data();
        if (u.email) friendsEmails.push(u.email);
      });

      if (friendsEmails.length === 0) {
        // Mark as sent anyways but warn that no friends received email
        await updateDoc(doc(db, 'friend_needs', need.id), {
          sentStatus: 'sent',
          sentAt: serverTimestamp()
        });
        alert("The Callout was published! However, there are currently no registered 'Friend' support accounts in the hub to email-notify.");
      } else {
        // 2. Trigger automated system broadcast email to supporters
        await addDoc(collection(db, 'mail'), {
          to: friendsEmails,
          message: {
            subject: `🚨 Urgent Center Need: ${need.category.toUpperCase()} Callout: ${need.title}`,
            text: `Hi Friend of free@last!\n\nOur team has launched a new center support request:\n\nNeed Title: ${need.title}\nCategory: ${need.category}\n\nDescription:\n${need.description}\n\nIf you have materials, volunteering hours, or equipment matching this request, please log in and fill in an offer under the "Friends Of" tab!\n\nWarm regards,\nManagement Team\nNechells Community Hub`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; border: 2px solid #2b337e; padding: 25px; border-radius: 15px;">
                <div style="background-color: #2b337e; color: #ffffff; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -25px -25px 25px -25px;">
                  <h2 style="margin: 0; font-size: 24px;">Support Call for free@last</h2>
                  <p style="margin: 5px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #ffd600;">Active Social Need</p>
                </div>
                <p>Hello valued Friend of free@last,</p>
                <p>Our Nechells Hub management team has published a new support opportunity:</p>
                
                <div style="background: #f5f6fa; padding: 20px; border-radius: 10px; border-left: 5px solid #2b337e; margin: 20px 0;">
                  <h3 style="margin: 0 0 5px 0; color: #2b337e;">${need.title}</h3>
                  <span style="background: #ffd600; color: #000; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 5px; text-transform: uppercase;">Category: ${need.category}</span>
                  <p style="margin: 15px 0 0 0; color: #444; line-height: 1.6; white-space: pre-wrap;">${need.description}</p>
                </div>

                <p>If you can help with resource donations, professional volunteering hours, or equipment support, please log into your hub workspace and post your offer!</p>
                
                <p style="margin-top: 30px;">Thank you for standing along with the youth of Nechells.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
                <p style="font-size: 10px; color: #999; text-align: center;">
                  To disable these automatic emails, please let our office know. Registered Charity No. 1101078.
                </p>
              </div>
            `
          }
        });

        // 3. Mark the need as sent / broadcasted
        await updateDoc(doc(db, 'friend_needs', need.id), {
          sentStatus: 'sent',
          sentAt: serverTimestamp()
        });

        setSuccessMsg(`Sent broadcast message successfully to ${friendsEmails.length} supporter email accounts!`);
        setTimeout(() => setSuccessMsg(null), 6000);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `friend_needs/${need.id}`);
    } finally {
      setBroadcastingId(null);
    }
  };

  return (
    <div className="space-y-12 animate-fadeIn" id="admin-needs-manager">
      <div className="bg-slate-50 border border-slate-100 rounded-[3rem] p-8 md:p-10">
        <div>
          <h3 style={{ color: COLORS.secondary }} className="text-2xl font-black brand-heading uppercase tracking-tight">Create support callout</h3>
          <p className="text-slate-400 text-sm font-medium mt-1">Manage draft needs first, then send broadcast alert emails to registered partners & supporters.</p>
        </div>

        {uiError && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">
            ⚠️ {uiError}
          </div>
        )}

        {successMsg && (
          <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-xs font-bold">
            🎉 {successMsg}
          </div>
        )}

        <form onSubmit={handleCreateNeed} className="space-y-6 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Need Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                className="w-full bg-white border border-slate-200 px-5 py-4 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand-orange transition"
              >
                <option value="volunteers">Volunteers</option>
                <option value="resources">Resources / Materials</option>
                <option value="finance">Finance / Giving</option>
                <option value="events">Events Assistance</option>
                <option value="sponsorship">Corporate Sponsorship</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Campaign Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Minibus tyres or Christmas holiday lunch covers"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-white border border-slate-200 px-5 py-4 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand-orange transition shadow-sm placeholder:text-slate-300"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Callout Details / Requirements</label>
            <textarea
              rows={4}
              required
              placeholder="What skills, equipment, count, materials, dates or fundraising level are required?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-white border border-slate-200 p-5 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand-orange transition resize-none shadow-sm placeholder:text-slate-300"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              style={{ backgroundColor: COLORS.orange }}
              className="px-8 py-4 rounded-2xl text-white font-bold text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition shadow-md"
            >
              Save Callout Draft
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <div>
          <h3 style={{ color: COLORS.secondary }} className="text-2xl font-black brand-heading uppercase tracking-tight">Active & Draft Center Needs</h3>
          <p className="text-slate-400 text-sm font-medium mt-1">Review active needs or send pending email broadcasts to the community.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : needs.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 text-slate-400 font-medium">
            Currently no center needs documented.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {needs.map(need => {
              // Custom text contrast matching based on category
              const isDarkBadge = need.category === 'events' || need.category === 'volunteers';
              const badgeBg = 
                need.category === 'volunteers' ? COLORS.green :
                need.category === 'resources' ? COLORS.orange :
                need.category === 'finance' ? COLORS.lightBlue :
                need.category === 'events' ? COLORS.yellow : COLORS.secondary;

              return (
                <div key={need.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span 
                        className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest brand-heading"
                        style={{ backgroundColor: badgeBg, color: isDarkBadge ? '#1e293b' : '#ffffff' }}
                      >
                        {need.category}
                      </span>

                      <div className="flex items-center gap-2">
                        {need.sentStatus === 'draft' ? (
                          <button
                            disabled={broadcastingId === need.id}
                            onClick={() => handleBroadcastNeed(need)}
                            style={{ backgroundColor: COLORS.orange }}
                            className="text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest disabled:opacity-50 hover:brightness-110 active:scale-95 transition"
                          >
                            {broadcastingId === need.id ? "Sending..." : "📢 Broadcast Email"}
                          </button>
                        ) : (
                          <span className="text-[9px] text-green-600 font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 flex items-center gap-1">
                            ✓ Sent Broadcast
                          </span>
                        )}

                        <button
                          onClick={() => handleDeleteNeed(need.id)}
                          className="text-slate-300 hover:text-red-500 hover:bg-slate-50 p-2 rounded-xl transition text-sm font-bold"
                          title="Delete Need"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <h4 style={{ color: COLORS.secondary }} className="text-lg font-black brand-heading uppercase tracking-tight leading-snug mb-2">
                      {need.title}
                    </h4>
                    <p className="text-slate-500 text-xs font-light leading-relaxed whitespace-pre-wrap">
                      {need.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Draft Status: {need.sentStatus}</span>
                    <span>Created: {need.date}</span>
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
