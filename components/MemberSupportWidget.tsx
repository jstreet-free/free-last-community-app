import React, { useState } from 'react';
import { User, Inquiry, InquiryReply } from '../types';
import { Icons, COLORS } from '../constants';
import { collection, addDoc, updateDoc, doc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreUtils';

interface MemberSupportWidgetProps {
  user: User | null;
  inquiries: Inquiry[];
}

export const MemberSupportWidget: React.FC<MemberSupportWidgetProps> = ({ user, inquiries }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ask' | 'my-questions'>('ask');
  const [topic, setTopic] = useState('General Question');
  const [name, setName] = useState(user?.name || user?.profile?.parentName || '');
  const [email, setEmail] = useState(user?.email || user?.profile?.parentEmail || '');
  const [mobile, setMobile] = useState(user?.profile?.parentMobile || '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  
  // Follow-up message state
  const [replyTextMap, setReplyTextMap] = useState<{ [inquiryId: string]: string }>({});
  const [isReplyingId, setIsReplyingId] = useState<string | null>(null);

  // Filter inquiries relevant to current user
  const myInquiries = inquiries.filter(inq => {
    if (user?.id && inq.userId === user.id) return true;
    if (user?.email && inq.email?.toLowerCase() === user.email.toLowerCase()) return true;
    return false;
  });

  const unreadRepliesCount = myInquiries.filter(inq => inq.status === 'replied').length;

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    const targetEmail = 'info@freeatlast.co.uk';

    try {
      const inquiryPayload = {
        name: name || 'Community Member',
        email: email || (user?.email || 'No email provided'),
        mobile: mobile || 'N/A',
        message: message.trim(),
        type: topic,
        targetEmail,
        timestamp: serverTimestamp(),
        status: 'new',
        userId: user?.id || null,
        replies: []
      };

      // 1. Save to inquiries Firestore collection
      const docRef = await addDoc(collection(db, 'inquiries'), inquiryPayload);

      // 2. Trigger staff email notification via Firestore mail collection
      try {
        await addDoc(collection(db, 'mail'), {
          to: [targetEmail, 'jstreet@freeatlast.st'],
          replyTo: email || targetEmail,
          message: {
            subject: `New Member Question: ${topic} from ${name || 'Member'}`,
            text: `Question from: ${name} (${email}, ${mobile})\nTopic: ${topic}\n\nQuestion:\n${message}`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #2b337e;">
                <h2 style="color: #f47920;">New Member Question Submitted</h2>
                <p><strong>Name:</strong> ${name || 'Member'}</p>
                <p><strong>Email:</strong> ${email || 'N/A'}</p>
                <p><strong>Mobile:</strong> ${mobile || 'N/A'}</p>
                <p><strong>Topic:</strong> ${topic}</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 10px; margin-top: 15px; border-left: 4px solid #f47920;">
                  <p style="margin: 0; white-space: pre-wrap;">${message}</p>
                </div>
                <p style="margin-top: 20px; font-size: 12px; color: #64748b;">Log into free@last Admin Panel to reply directly to this member.</p>
              </div>
            `
          }
        });
      } catch (mailErr) {
        console.warn("Mail trigger warning:", mailErr);
      }

      setIsSubmitting(false);
      setSubmittedSuccess(true);
      setMessage('');
    } catch (error) {
      setIsSubmitting(false);
      console.error("Error submitting question:", error);
      try {
        handleFirestoreError(error, OperationType.CREATE, 'inquiries');
      } catch (err: any) {
        alert("Unable to submit question. Please try again.");
      }
    }
  };

  const handleSendFollowUp = async (inquiryId: string) => {
    const text = replyTextMap[inquiryId]?.trim();
    if (!text) return;

    setIsReplyingId(inquiryId);
    try {
      const newReply: InquiryReply = {
        sender: 'member',
        senderName: user?.name || name || 'Member',
        message: text,
        timestamp: new Date().toISOString()
      };

      await updateDoc(doc(db, 'inquiries', inquiryId), {
        replies: arrayUnion(newReply),
        status: 'new' // Mark as new so admins know there is a response
      });

      setReplyTextMap(prev => ({ ...prev, [inquiryId]: '' }));
      setIsReplyingId(null);
    } catch (error) {
      console.error("Error sending follow up:", error);
      setIsReplyingId(null);
      alert("Failed to send follow-up message. Please try again.");
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-20 md:bottom-6 right-6 z-[90]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{ backgroundColor: COLORS.secondary }}
          className="group flex items-center gap-3 text-white px-5 py-3.5 rounded-full shadow-2xl hover:brightness-110 transition-all duration-300 border-2 border-white/20 active:scale-95"
          title="Ask Us a Question"
        >
          <div className="relative">
            <Icons.MessageSquare className="w-6 h-6 text-brand-orange group-hover:scale-110 transition-transform" />
            {unreadRepliesCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-orange text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadRepliesCount}
              </span>
            )}
          </div>
          <span className="font-bold text-xs uppercase tracking-widest brand-heading hidden sm:inline">
            Ask Us a Question
          </span>
        </button>
      </div>

      {/* Slide-over / Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-end p-0 sm:p-6 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full sm:max-w-lg h-[90vh] sm:h-[80vh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
            {/* Header */}
            <div style={{ backgroundColor: COLORS.secondary }} className="p-5 text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-orange/20 flex items-center justify-center border border-brand-orange/40">
                  <Icons.MessageSquare className="w-5 h-5 text-brand-orange" />
                </div>
                <div>
                  <h3 className="font-bold text-lg brand-heading uppercase tracking-wide">Ask Us a Question</h3>
                  <p className="text-xs text-white/70 font-light">Direct support from the free@last team</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-1">
              <button
                onClick={() => { setActiveTab('ask'); setSubmittedSuccess(false); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest brand-heading transition-all ${
                  activeTab === 'ask'
                    ? 'bg-white text-brand-dark-blue shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Ask New Question
              </button>
              <button
                onClick={() => setActiveTab('my-questions')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest brand-heading transition-all relative ${
                  activeTab === 'my-questions'
                    ? 'bg-white text-brand-dark-blue shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                My Questions ({myInquiries.length})
                {unreadRepliesCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-brand-orange text-white text-[9px] rounded-full">
                    {unreadRepliesCount}
                  </span>
                )}
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-grow overflow-y-auto p-6">
              {activeTab === 'ask' && (
                <>
                  {submittedSuccess ? (
                    <div className="text-center py-10 animate-fadeIn">
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icons.Check />
                      </div>
                      <h4 className="text-2xl font-bold brand-heading text-brand-dark-blue mb-2">Question Submitted!</h4>
                      <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
                        Thank you for reaching out. Our team has received your query and will reply as soon as possible.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          onClick={() => setSubmittedSuccess(false)}
                          className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs brand-heading uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                          Ask Another Question
                        </button>
                        <button
                          onClick={() => setActiveTab('my-questions')}
                          className="px-6 py-3 bg-brand-orange text-white rounded-xl font-bold text-xs brand-heading uppercase tracking-widest hover:brightness-110 transition-all shadow-md"
                        >
                          View My Questions
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitQuestion} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 brand-heading">
                          What is your question about?
                        </label>
                        <select
                          value={topic}
                          onChange={e => setTopic(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-brand-orange bg-white"
                        >
                          <option value="General Question">General Question / Support</option>
                          <option value="Activity Booking">Activity Session & Booking</option>
                          <option value="Hub Membership">Hub Membership & Registration</option>
                          <option value="Youth Club">Youth Club & Teenager Services</option>
                          <option value="Volunteering & Help">Volunteering & Offers</option>
                        </select>
                      </div>

                      {!user && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 brand-heading">
                              Your Name
                            </label>
                            <input
                              type="text"
                              required
                              value={name}
                              onChange={e => setName(e.target.value)}
                              placeholder="Full Name"
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-orange"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 brand-heading">
                              Email Address
                            </label>
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              placeholder="name@example.com"
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-orange"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 brand-heading">
                          Contact Phone Number (Optional)
                        </label>
                        <input
                          type="tel"
                          value={mobile}
                          onChange={e => setMobile(e.target.value)}
                          placeholder="e.g. 07123 456789"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-orange"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 brand-heading">
                          Your Question / Message
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          placeholder="Write your question or query in detail here..."
                          className="w-full p-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-orange leading-relaxed resize-none"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || !message.trim()}
                        style={{ backgroundColor: COLORS.primary }}
                        className="w-full py-3.5 text-white rounded-xl font-bold text-xs uppercase tracking-widest brand-heading hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <span>Sending Question...</span>
                        ) : (
                          <>
                            <Icons.Send className="w-4 h-4" />
                            <span>Submit Question</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </>
              )}

              {activeTab === 'my-questions' && (
                <div className="space-y-4">
                  {myInquiries.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Icons.HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="font-bold text-sm brand-heading uppercase tracking-wider">No Questions Asked Yet</p>
                      <p className="text-xs text-slate-400 mt-1">Have a question? Switch to the "Ask New Question" tab above.</p>
                    </div>
                  ) : (
                    myInquiries.map(inquiry => (
                      <div
                        key={inquiry.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          inquiry.status === 'replied'
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {/* Status Header */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest brand-heading ${
                            inquiry.status === 'replied'
                              ? 'bg-emerald-600 text-white'
                              : inquiry.status === 'read'
                              ? 'bg-blue-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}>
                            {inquiry.status === 'replied' ? 'Staff Replied' : inquiry.status === 'read' ? 'Under Review' : 'Pending'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold brand-heading uppercase">
                            {inquiry.timestamp?.toDate ? inquiry.timestamp.toDate().toLocaleDateString() : 'Recent'}
                          </span>
                        </div>

                        {/* Subject & Original Question */}
                        <div className="mb-3">
                          <span className="text-xs font-bold text-brand-orange uppercase tracking-wider brand-heading block mb-1">
                            {inquiry.type}
                          </span>
                          <p className="text-sm font-medium text-slate-800 bg-white p-3.5 rounded-xl border border-slate-100">
                            "{inquiry.message}"
                          </p>
                        </div>

                        {/* Direct Reply or Reply Thread */}
                        {(inquiry.reply || (inquiry.replies && inquiry.replies.length > 0)) && (
                          <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-3">
                            <h5 className="text-[11px] font-bold text-brand-dark-blue uppercase tracking-widest brand-heading flex items-center gap-1.5">
                              <Icons.MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              Staff Response & Discussion
                            </h5>

                            {/* Legacy single reply fallback */}
                            {inquiry.reply && (!inquiry.replies || inquiry.replies.length === 0) && (
                              <div className="bg-emerald-100/70 text-emerald-900 p-4 rounded-xl text-xs leading-relaxed border border-emerald-200">
                                <div className="flex items-center justify-between mb-1 text-[10px] font-bold text-emerald-700 uppercase brand-heading">
                                  <span>{inquiry.repliedBy || 'free@last Staff'}</span>
                                  {inquiry.repliedAt && <span>{new Date(inquiry.repliedAt).toLocaleDateString()}</span>}
                                </div>
                                <p className="font-normal text-sm">{inquiry.reply}</p>
                              </div>
                            )}

                            {/* Threaded replies */}
                            {inquiry.replies && inquiry.replies.map((rep, idx) => (
                              <div
                                key={idx}
                                className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                                  rep.sender === 'admin'
                                    ? 'bg-emerald-100/80 text-emerald-950 ml-2 border border-emerald-200'
                                    : 'bg-white text-slate-800 mr-2 border border-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1 text-[9.5px] font-bold uppercase brand-heading opacity-75">
                                  <span>{rep.senderName} ({rep.sender === 'admin' ? 'Staff' : 'You'})</span>
                                  <span>{rep.timestamp ? new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                </div>
                                <p className="font-medium text-sm">{rep.message}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply input field for member */}
                        <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2">
                          <input
                            type="text"
                            placeholder="Type a follow-up reply..."
                            value={replyTextMap[inquiry.id] || ''}
                            onChange={e => setReplyTextMap({ ...replyTextMap, [inquiry.id]: e.target.value })}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSendFollowUp(inquiry.id);
                            }}
                            className="flex-grow px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-orange"
                          />
                          <button
                            onClick={() => handleSendFollowUp(inquiry.id)}
                            disabled={isReplyingId === inquiry.id || !replyTextMap[inquiry.id]?.trim()}
                            className="px-3 py-2 bg-brand-dark-blue text-white rounded-xl text-xs font-bold brand-heading uppercase tracking-wider hover:bg-brand-orange transition-all disabled:opacity-40"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
