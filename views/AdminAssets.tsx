
import React, { useState, useEffect } from 'react';
import { Icons, COLORS } from '../constants';
import { Announcement, Activity as ActivityType, Partner, ImpactStory, Inquiry, Booking, User, UserStatus, GalleryAlbum, TeamLog, MailLog, MoodLog, CaseStudyRequest, CaseStudy, MemberProfile, AuthorizedCollector } from '../types';
import { MemberWellbeing } from './MemberWellbeing';
import { SocialImpactPanel } from './SocialImpactPanel';
import { AdminNewsletterManager } from '../components/AdminNewsletterManager';
import { AdminNeedsManager } from '../components/AdminNeedsManager';

import { db } from '../services/firebase';
import { doc, setDoc, deleteDoc, collection, addDoc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';

interface AdminAssetsProps {
  user: User;
  assets: any;
  onUpdate: (key: string, newValue: string) => void;
  onReset: () => void;
  announcements: Announcement[];
  activities: ActivityType[];
  partners: Partner[];
  impactStories: ImpactStory[];
  inquiries: Inquiry[];
  bookings: Booking[];
  users: User[];
  teamLogs?: TeamLog[];
  wellbeingLogs?: MoodLog[];
  galleryAlbums: GalleryAlbum[];
  mailLogs?: MailLog[];
  warnings?: any[];
  caseStudyRequests?: CaseStudyRequest[];
  caseStudies?: CaseStudy[];
}

const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const dateOnly = dateStr.split('T')[0];
  const parts = dateOnly.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 12, 0, 0);
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date();
  return d;
};

const formatLocalDateStr = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const AdminAssets: React.FC<AdminAssetsProps> = ({ 
  user,
  assets, 
  onUpdate, 
  onReset,
  announcements,
  activities,
  partners,
  impactStories,
  inquiries,
  bookings,
  users,
  teamLogs = [],
  wellbeingLogs = [],
  galleryAlbums,
  mailLogs = [],
  warnings = [],
  caseStudyRequests = [],
  caseStudies = [],
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'images' | 'updates' | 'activities' | 'partners' | 'impact' | 'inquiries' | 'bookings' | 'users' | 'rally' | 'archive' | 'mail' | 'wellbeing' | 'social-impact' | 'newsletter' | 'needs' | 'warnings'>(() => {
    return (localStorage.getItem('admin_active_tab') as any) || 'activities';
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    category: 'Update',
    author: 'Management Team'
  });
  
  // Persist admin tab
  React.useEffect(() => {
    localStorage.setItem('admin_active_tab', activeAdminTab);
  }, [activeAdminTab]);

  const [editingActivity, setEditingActivity] = useState<ActivityType | null>(null);
  const [isAddingActivity, setIsAddingActivity] = useState(() => {
    return localStorage.getItem('admin_is_adding_activity') === 'true';
  });
  
  // Persist isAddingActivity
  React.useEffect(() => {
    localStorage.setItem('admin_is_adding_activity', isAddingActivity ? 'true' : 'false');
  }, [isAddingActivity]);
  const [newActivity, setNewActivity] = useState<Partial<ActivityType>>(() => {
    const saved = localStorage.getItem('admin_new_activity_draft');
    return saved ? JSON.parse(saved) : {
      title: '',
      description: '',
      date: '',
      time: '',
      location: 'The Hub',
      capacity: 20,
      bookedCount: 0,
      category: 'youth',
      status: 'upcoming',
      flickrAlbumUrl: '',
      frequency: 'once'
    };
  });

  // Persist draft
  React.useEffect(() => {
    localStorage.setItem('admin_new_activity_draft', JSON.stringify(newActivity));
  }, [newActivity]);

  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  const [newPartner, setNewPartner] = useState<Partial<Partner>>({
    name: '',
    description: '',
    logo: '',
    details: '',
    website: '',
    stats: [{ label: '', value: '' }]
  });

  const [editingImpactStory, setEditingImpactStory] = useState<ImpactStory | null>(null);
  const [isAddingImpactStory, setIsAddingImpactStory] = useState(false);
  const [newImpactStory, setNewImpactStory] = useState<Partial<ImpactStory>>({
    title: '',
    content: '',
    partnerName: '',
    image: '',
  });

  const [editingAlbum, setEditingAlbum] = useState<GalleryAlbum | null>(null);
  const [isAddingAlbum, setIsAddingAlbum] = useState(false);
  const [newAlbum, setNewAlbum] = useState<Partial<GalleryAlbum>>({
    title: '',
    description: '',
    date: '',
    category: 'youth',
    flickrAlbumUrl: '',
    imageUrl: ''
  });

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [activeUserSubTab, setActiveUserSubTab] = useState<'member' | 'team' | 'friend' | 'admin' | 'all'>('member');
  const [selectedUserDetail, setSelectedUserDetail] = useState<User | null>(null);
  const [uniqueNumInput, setUniqueNumInput] = useState('');
  const [editStatus, setEditStatus] = useState<UserStatus>('pending');
  const [editRole, setEditRole] = useState<string>('member');
  const [editProfileComplete, setEditProfileComplete] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Bookings Organization States
  const [activeBookingView, setActiveBookingView] = useState<'by-activity' | 'all-log'>('by-activity');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [bookingTimeframeFilter, setBookingTimeframeFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [activitySearchQuery, setActivitySearchQuery] = useState('');

  // Mail Monitor & Management States
  const [mailFilter, setMailFilter] = useState<'all' | 'pending' | 'resolved' | 'error'>('all');
  const [mailSearchQuery, setMailSearchQuery] = useState('');
  const [selectedMailLog, setSelectedMailLog] = useState<MailLog | null>(null);
  const [adminMailReplyMap, setAdminMailReplyMap] = useState<{ [mailId: string]: string }>({});
  const [isSendingMailResponseId, setIsSendingMailResponseId] = useState<string | null>(null);

  const handleMarkMailResolved = async (mailId: string) => {
    try {
      await updateDoc(doc(db, 'mail', mailId), {
        'delivery.state': 'SUCCESS',
        'delivery.info.response': `Marked as resolved by ${user.name || 'Admin'}`,
        status: 'RESOLVED',
        resolvedBy: user.name || 'Admin',
        resolvedAt: new Date().toISOString()
      });
      if (selectedMailLog?.id === mailId) {
        setSelectedMailLog(prev => prev ? { 
          ...prev, 
          status: 'RESOLVED', 
          resolvedBy: user.name || 'Admin', 
          resolvedAt: new Date().toISOString(),
          delivery: { ...(prev.delivery || { attempts: 1, endTime: new Date(), error: null, leaseExpireTime: null, startTime: new Date() }), state: 'SUCCESS' }
        } : null);
      }
    } catch (err) {
      console.error("Error marking mail resolved:", err);
      alert("Failed to update status. Please try again.");
    }
  };

  const handleMarkAllPendingMailResolved = async () => {
    const pendingLogs = mailLogs.filter(m => (m.delivery?.state || 'PENDING') === 'PENDING' && m.status !== 'RESOLVED');
    if (pendingLogs.length === 0) return;
    if (!window.confirm(`Are you sure you want to mark all ${pendingLogs.length} pending mail logs as Resolved?`)) return;

    try {
      for (const log of pendingLogs) {
        await updateDoc(doc(db, 'mail', log.id), {
          'delivery.state': 'SUCCESS',
          'delivery.info.response': `Bulk resolved by ${user.name || 'Admin'}`,
          status: 'RESOLVED',
          resolvedBy: user.name || 'Admin',
          resolvedAt: new Date().toISOString()
        });
      }
      alert(`Successfully marked ${pendingLogs.length} pending email logs as Resolved.`);
    } catch (err) {
      console.error("Error bulk resolving mail:", err);
      alert("Error resolving some mail logs.");
    }
  };

  const handleDeleteMailLog = async (mailId: string) => {
    if (!window.confirm("Are you sure you want to delete this mail log entry?")) return;
    try {
      await deleteDoc(doc(db, 'mail', mailId));
      if (selectedMailLog?.id === mailId) setSelectedMailLog(null);
    } catch (err) {
      console.error("Error deleting mail log:", err);
      alert("Failed to delete mail log.");
    }
  };

  const handleSendMailResponse = async (log: MailLog) => {
    const replyText = adminMailReplyMap[log.id]?.trim();
    if (!replyText) {
      alert("Please enter a response message before sending.");
      return;
    }

    setIsSendingMailResponseId(log.id);
    try {
      const recipient = Array.isArray(log.to) ? log.to[0] : log.to;

      // 1. Create a outbound reply document in mail collection so recipient receives email
      await addDoc(collection(db, 'mail'), {
        to: recipient,
        replyTo: user.email || 'info@freeatlast.co.uk',
        message: {
          subject: `Re: ${log.message?.subject || 'Hub Support Response'}`,
          text: `Dear Member,\n\n${replyText}\n\nWarm regards,\n${user.name || 'free@last Staff'}`,
          html: `
            <div style="font-family: sans-serif; padding: 25px; color: #2b337e;">
              <h2 style="color: #f47920; margin-top: 0;">free@last Community Support</h2>
              <p>Hello,</p>
              <p>Regarding your recent query <strong>"${log.message?.subject || 'Hub Communication'}"</strong>:</p>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border-left: 4px solid #f47920; margin: 15px 0;">
                <p style="margin: 0; font-size: 15px; color: #1e293b; font-weight: 500;">${replyText}</p>
                <p style="margin-top: 10px; font-size: 11px; color: #64748b; uppercase;">Sent by ${user.name || 'free@last Staff'}</p>
              </div>
              <p style="font-size: 13px; color: #64748b;">If you have any further questions, feel free to drop by the hub or reply directly to this message.</p>
            </div>
          `
        }
      });

      // 2. Mark the original mail log as RESOLVED
      await updateDoc(doc(db, 'mail', log.id), {
        'delivery.state': 'SUCCESS',
        'delivery.info.response': `Responded & Handled by ${user.name || 'Admin'}`,
        status: 'RESOLVED',
        resolvedBy: user.name || 'Admin',
        resolvedAt: new Date().toISOString()
      });

      setAdminMailReplyMap(prev => ({ ...prev, [log.id]: '' }));
      setIsSendingMailResponseId(null);
      if (selectedMailLog?.id === log.id) setSelectedMailLog(null);
      alert(`Response successfully sent to ${recipient} and log marked as Resolved!`);
    } catch (err) {
      console.error("Error sending mail response:", err);
      setIsSendingMailResponseId(null);
      alert("Failed to send response. Please try again.");
    }
  };

  useEffect(() => {
    setConfirmDeleteId(null);
    if (selectedUserDetail) {
      setUniqueNumInput((selectedUserDetail as any).volunteerNumber || '');
      setEditStatus(selectedUserDetail.status || 'pending');
      setEditRole(selectedUserDetail.role || 'member');
      setEditProfileComplete(selectedUserDetail.profileComplete === true);
    } else {
      setUniqueNumInput('');
      setEditStatus('pending');
      setEditRole('member');
      setEditProfileComplete(false);
    }
  }, [selectedUserDetail]);

  const assetLabels: Record<string, string> = {
    YOUTH_HOODIES: "Hero Image (Youth Team)",
    MUDDY_ADVENTURE: "Adventure Image (Resilience)",
    SURFING_BEACH: "Residency Image (Surfing)",
    FIRE_FIGHTERS: "Career Path Image",
    HENNA_ART: "Creative Hub Image",
    PLAYGROUND: "Safe Space Image",
    CAMPFIRE: "Community Session Image",
    GALA_AWARDS: "Celebration Image"
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleFileChange = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        onUpdate(key, compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAnnouncement = async () => {
    try {
      if (editingAnnouncement) {
        await setDoc(doc(db, 'announcements', editingAnnouncement.id), {
          title: editingAnnouncement.title,
          content: editingAnnouncement.content,
          category: editingAnnouncement.category,
          author: editingAnnouncement.author,
          date: editingAnnouncement.date
        });
        setEditingAnnouncement(null);
      } else if (isAddingAnnouncement) {
        if (!newAnnouncement.title) {
          alert("Please enter a title for the update.");
          return;
        }
        if (!newAnnouncement.content) {
          alert("Please enter content for the update.");
          return;
        }

        const addedData = {
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          category: newAnnouncement.category || 'Update',
          author: newAnnouncement.author || 'Management Team',
          date: new Date().toISOString().split('T')[0]
        };
        await addDoc(collection(db, 'announcements'), addedData);
        setIsAddingAnnouncement(false);
        setNewAnnouncement({ title: '', content: '', category: 'Update', author: 'Management Team' });
      }
    } catch (error) {
      console.error("Error saving announcement:", error);
      alert("Failed to save update.");
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!id) {
      alert("Error: Announcement ID is missing.");
      return;
    }
    
    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000); // Reset after 3s
      return;
    }

    try {
      await deleteDoc(doc(db, 'announcements', id));
      setDeletingId(null);
    } catch (error: any) {
      console.error("Error deleting announcement:", error);
      alert("Failed to delete update: " + (error.message || "Unknown error"));
    }
  };

  const handleSaveActivity = async () => {
    try {
      if (editingActivity) {
        const { id, ...data } = editingActivity;
        await setDoc(doc(db, 'activities', id), data);
        setEditingActivity(null);
      } else if (isAddingActivity) {
        if (!newActivity.title) {
          alert("Please enter a session title.");
          return;
        }
        
        const activityToSave = {
          ...newActivity,
          title: newActivity.title,
          description: newActivity.description || '',
          date: newActivity.date || new Date().toISOString().split('T')[0],
          time: newActivity.time || '10:00',
          location: newActivity.location || 'The Hub',
          capacity: newActivity.capacity ?? 20,
          bookedCount: newActivity.bookedCount ?? 0,
          category: newActivity.category || 'community',
          status: newActivity.status || 'upcoming',
          frequency: newActivity.frequency || 'once'
        };
        
        // Clear local draft on success
        localStorage.removeItem('admin_new_activity_draft');

        await addDoc(collection(db, 'activities'), activityToSave);
        setIsAddingActivity(false);
        setNewActivity({
          title: '',
          description: '',
          date: '',
          time: '',
          location: 'The Hub',
          capacity: 20,
          bookedCount: 0,
          category: 'youth',
          status: 'upcoming',
          flickrAlbumUrl: '',
          imageUrl: '',
          frequency: 'once'
        });
      }
    } catch (error) {
      console.error("Error saving activity:", error);
      alert("Failed to save session. Please check your connection.");
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!id) {
      alert("Error: Session ID is missing.");
      return;
    }

    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000); // Reset after 3s
      return;
    }

    try {
      await deleteDoc(doc(db, 'activities', id));
      setDeletingId(null);
    } catch (error: any) {
      console.error("Error deleting activity:", error);
      alert("Failed to delete session: " + (error.message || "Unknown error"));
    }
  };

  const handleSavePartner = async () => {
    try {
      if (editingPartner) {
        const { id, ...data } = editingPartner;
        await setDoc(doc(db, 'partners', id), data);
        setEditingPartner(null);
      } else if (isAddingPartner) {
        if (!newPartner.name) {
          alert("Please enter the partner's name.");
          return;
        }
        if (!newPartner.logo) {
          alert("Please upload or provide a logo for the partner.");
          return;
        }

        const partnerToSave = {
          ...newPartner,
          description: newPartner.description || '',
          details: newPartner.details || '',
          website: newPartner.website || '#',
          stats: newPartner.stats || []
        };

        await addDoc(collection(db, 'partners'), partnerToSave);
        setIsAddingPartner(false);
        setNewPartner({
          name: '',
          description: '',
          logo: '',
          details: '',
          website: '',
          stats: [{ label: '', value: '' }]
        });
      }
    } catch (error) {
      console.error("Error saving partner:", error);
      alert("Failed to save partner.");
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!id) {
      alert("Error: Partner ID is missing.");
      return;
    }

    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'partners', id));
      setDeletingId(null);
    } catch (error: any) {
      console.error("Error deleting partner:", error);
      alert("Failed to delete partner: " + (error.message || "Unknown error"));
    }
  };

  const handleSaveImpactStory = async () => {
    try {
      if (editingImpactStory) {
        const { id, ...data } = editingImpactStory;
        await setDoc(doc(db, 'impact_stories', id), data);
        setEditingImpactStory(null);
      } else if (isAddingImpactStory) {
        if (!newImpactStory.title || !newImpactStory.partnerName) {
          alert("Please enter a title and the partner name.");
          return;
        }

        const storyToSave = {
          ...newImpactStory,
          content: newImpactStory.content || '',
          image: newImpactStory.image || '',
        };

        await addDoc(collection(db, 'impact_stories'), storyToSave);
        setIsAddingImpactStory(false);
        setNewImpactStory({
          title: '',
          content: '',
          partnerName: '',
          image: '',
        });
      }
    } catch (error) {
      console.error("Error saving impact story:", error);
      alert("Failed to save impact story.");
    }
  };

  const handleDeleteImpactStory = async (id: string) => {
    if (!id) {
      alert("Error: Story ID is missing.");
      return;
    }

    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'impact_stories', id));
      setDeletingId(null);
    } catch (error: any) {
      console.error("Error deleting impact story:", error);
      alert("Failed to delete impact story: " + (error.message || "Unknown error"));
    }
  };

  const [adminReplyTextMap, setAdminReplyTextMap] = useState<{ [id: string]: string }>({});
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);
  const [inquiryFilter, setInquiryFilter] = useState<'all' | 'new' | 'replied'>('all');

  const handleUpdateInquiryStatus = async (id: string, status: 'new' | 'read' | 'contacted' | 'replied') => {
    try {
      await updateDoc(doc(db, 'inquiries', id), { status });
    } catch (error) {
      console.error("Error updating inquiry status:", error);
    }
  };

  const handleSendAdminReply = async (inquiry: Inquiry) => {
    const replyMsg = adminReplyTextMap[inquiry.id]?.trim();
    if (!replyMsg) {
      alert("Please enter a response message before sending.");
      return;
    }

    setSendingReplyId(inquiry.id);
    try {
      const adminReplyItem = {
        sender: 'admin' as const,
        senderName: user.name || 'free@last Admin',
        message: replyMsg,
        timestamp: new Date().toISOString()
      };

      // 1. Update inquiry document in Firestore
      await updateDoc(doc(db, 'inquiries', inquiry.id), {
        status: 'replied',
        reply: replyMsg,
        repliedAt: new Date().toISOString(),
        repliedBy: user.name || 'free@last Admin',
        replies: arrayUnion(adminReplyItem)
      });

      // 2. Trigger email to member if email is available
      const recipientEmail = inquiry.email || inquiry.targetEmail;
      if (recipientEmail && recipientEmail.includes('@')) {
        try {
          await addDoc(collection(db, 'mail'), {
            to: recipientEmail,
            message: {
              subject: `free@last Response: ${inquiry.type || 'Question'}`,
              text: `Dear ${inquiry.name},\n\nThank you for reaching out to free@last.\n\nStaff Response:\n${replyMsg}\n\nYour Original Question:\n"${inquiry.message}"\n\nWarm regards,\nfree@last Nechells Team`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; color: #2b337e;">
                  <h2 style="color: #f47920;">free@last Member Support Response</h2>
                  <p>Dear <strong>${inquiry.name}</strong>,</p>
                  <p>Thank you for reaching out to free@last. Here is the response to your query from our team:</p>
                  <div style="background-color: #ecfdf5; padding: 18px; border-radius: 12px; border-left: 4px solid #10b981; margin: 15px 0;">
                    <p style="margin: 0; font-size: 15px; color: #064e3b; font-weight: 500;">${replyMsg}</p>
                    <p style="margin-top: 10px; font-size: 11px; color: #047857; text-transform: uppercase;">Responded by ${user.name || 'free@last Team'}</p>
                  </div>
                  <div style="background-color: #f8fafc; padding: 12px; border-radius: 8px; color: #64748b; font-size: 13px;">
                    <p style="margin: 0;"><strong>Original Query (${inquiry.type || 'General'}):</strong></p>
                    <p style="margin: 5px 0 0 0; italic;">"${inquiry.message}"</p>
                  </div>
                  <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">You can also view this response inside your free@last member account dashboard anytime.</p>
                </div>
              `
            }
          });
        } catch (mailErr) {
          console.warn("Mail dispatch warning:", mailErr);
        }
      }

      setAdminReplyTextMap(prev => ({ ...prev, [inquiry.id]: '' }));
      setSendingReplyId(null);
    } catch (error: any) {
      console.error("Error sending admin reply:", error);
      setSendingReplyId(null);
      alert("Failed to send response: " + (error.message || "Unknown error"));
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!id) {
      alert("Error: Inquiry ID is missing.");
      return;
    }

    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'inquiries', id));
      setDeletingId(null);
    } catch (error: any) {
      console.error("Error deleting inquiry:", error);
      alert("Failed to delete inquiry: " + (error.message || "Unknown error"));
    }
  };

  const handleSaveAlbum = async () => {
    try {
      if (editingAlbum) {
        const { id, ...data } = editingAlbum;
        await setDoc(doc(db, 'gallery_albums', id), data);
        setEditingAlbum(null);
      } else if (isAddingAlbum) {
        if (!newAlbum.title || !newAlbum.flickrAlbumUrl) {
          alert("Please enter a title and Flickr URL.");
          return;
        }

        const albumToSave = {
          ...newAlbum,
          description: newAlbum.description || '',
          date: newAlbum.date || new Date().toISOString().split('T')[0],
          category: newAlbum.category || 'youth',
          imageUrl: newAlbum.imageUrl || ''
        };

        await addDoc(collection(db, 'gallery_albums'), albumToSave);
        setIsAddingAlbum(false);
        setNewAlbum({
          title: '',
          description: '',
          date: '',
          category: 'youth',
          flickrAlbumUrl: '',
          imageUrl: ''
        });
      }
    } catch (error) {
      console.error("Error saving album:", error);
      alert("Failed to save gallery album.");
    }
  };

  const handleDeleteAlbum = async (id: string) => {
    if (!id) {
      alert("Error: Album ID is missing.");
      return;
    }

    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'gallery_albums', id));
      setDeletingId(null);
    } catch (error: any) {
      console.error("Error deleting album:", error);
      alert("Failed to delete archive album: " + (error.message || "Unknown error"));
    }
  };

  const handleDownloadBookingsCSV = () => {
    if (bookings.length === 0) {
      alert("No bookings to export.");
      return;
    }

    const headers = ["Session Title", "Session Date", "Session Time", "Participant Name", "Booker Name", "Booker Mobile", "Booking Date"];
    const rows = bookings.map(b => [
      b.sessionTitle,
      b.sessionDate,
      b.sessionTime,
      b.participantName,
      b.bookerName,
      b.bookerMobile,
      b.bookingDate?.toDate ? b.bookingDate.toDate().toLocaleString() : 'Recent'
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `freeatlast_bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getParticipantSurnameAndFirstname = (fullName: string) => {
    const cleanName = (fullName || '').trim();
    if (!cleanName) return { surname: 'Anonymous', firstname: '', display: 'Anonymous' };
    const parts = cleanName.split(/\s+/);
    if (parts.length === 1) {
      return { surname: parts[0], firstname: '', display: parts[0] };
    }
    const surname = parts[parts.length - 1];
    const firstname = parts.slice(0, parts.length - 1).join(' ');
    return { surname, firstname, display: `${surname}, ${firstname}` };
  };

  const getBookingDateObj = (b: Booking): Date => {
    if (b.bookingDate) {
      if (typeof b.bookingDate.toDate === 'function') {
        return b.bookingDate.toDate();
      }
      const d = new Date(b.bookingDate);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date(b.sessionDate); // fallback
  };

  const handleDownloadActivityBookingsCSV = (activityTitle: string, bookingsList: Booking[]) => {
    if (bookingsList.length === 0) {
      alert("No bookings to export for this timeframe.");
      return;
    }
    const headers = ["Participant Surname", "Participant Firstname", "Booker Name", "Booker Mobile", "Booking Date", "Session Title", "Session Date", "Session Time", "Attendance Status"];
    const rows = bookingsList.map(b => {
      const nameInfo = getParticipantSurnameAndFirstname(b.participantName);
      const bDate = b.bookingDate?.toDate ? b.bookingDate.toDate().toLocaleString() : b.bookingDate || 'Recent';
      const attendance = b.attended === true ? 'Attended' : b.attended === false ? 'Absent' : 'Unmarked';
      return [
        nameInfo.surname,
        nameInfo.firstname,
        b.bookerName || 'N/A',
        b.bookerMobile || 'N/A',
        bDate,
        b.sessionTitle,
        b.sessionDate,
        b.sessionTime,
        attendance
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `freeatlast_registrations_${activityTitle.toLowerCase().replace(/\s+/g, '_')}_${bookingTimeframeFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: UserStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const handleAdminUpdateUser = async (userId: string, newStatus: UserStatus, newRole: string, newVolunteerNum: string, profileComplete: boolean) => {
    try {
      // Automatically bypass / mark complete if assigned as friend or approved team member
      let finalProfileComplete = profileComplete;
      let finalStatus = newStatus;
      if (newRole === 'friend') {
        finalProfileComplete = true;
        if (newStatus === 'pending') {
          finalStatus = 'approved';
        }
      } else if (newRole === 'team' && newStatus === 'approved') {
        finalProfileComplete = true;
      }
      
      const updatedFields: any = {
        status: finalStatus,
        role: newRole,
        volunteerNumber: newVolunteerNum.trim(),
        profileComplete: finalProfileComplete
      };

      if (newRole === 'friend' && (!selectedUserDetail?.profile || selectedUserDetail?.profile.registrationType !== 'friend')) {
        updatedFields.profile = {
          registrationType: 'friend' as any,
          parentName: selectedUserDetail?.name || '',
          parentEmail: selectedUserDetail?.email || '',
          parentMobile: selectedUserDetail?.profile?.parentMobile || '',
          businessName: (selectedUserDetail?.profile as any)?.businessName || '',
          isFriendSignup: true,
          dataConsent: true
        };
      }

      await updateDoc(doc(db, 'users', userId), updatedFields);
      
      if (selectedUserDetail && selectedUserDetail.id === userId) {
        setSelectedUserDetail({
          ...selectedUserDetail,
          ...updatedFields,
          status: finalStatus,
          role: newRole,
          volunteerNumber: newVolunteerNum.trim(),
          profileComplete: finalProfileComplete
        } as any);
      }
    } catch (error) {
      console.error("Error updating user details:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      setSelectedUserDetail(null);
      setConfirmDeleteId(null);
      alert("User account permanently deleted.");
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const getSurnameAndFirstname = (userItemOrName: User | string, profileArg?: MemberProfile) => {
    let fullName = typeof userItemOrName === 'string' ? userItemOrName : userItemOrName.name || '';
    let profile = typeof userItemOrName === 'object' ? userItemOrName.profile : profileArg;

    // 1. If family registration and familyName is stored
    if (profile?.familyName?.trim()) {
      const surname = profile.familyName.trim();
      const parentName = (profile.parentName || '').trim();
      const firstname = parentName.replace(new RegExp(`^${surname}[,\\s]*`, 'i'), '').trim() || parentName;
      return {
        surname: surname,
        firstname: firstname,
        display: firstname ? `${surname.toUpperCase()}, ${firstname}` : surname.toUpperCase()
      };
    }

    // 2. If fullName has a comma (e.g. "Smith, John")
    const cleanName = (fullName || '').trim();
    if (!cleanName) return { surname: 'Anonymous', firstname: '', display: 'Anonymous' };

    if (cleanName.includes(',')) {
      const [sur, ...firstParts] = cleanName.split(',');
      const surname = sur.trim();
      const firstname = firstParts.join(',').trim();
      return {
        surname,
        firstname,
        display: `${surname.toUpperCase()}, ${firstname}`
      };
    }

    // 3. Split by whitespace - last token is surname
    const parts = cleanName.split(/\s+/);
    if (parts.length === 1) {
      return { surname: parts[0], firstname: '', display: parts[0].toUpperCase() };
    }
    const surname = parts[parts.length - 1];
    const firstname = parts.slice(0, parts.length - 1).join(' ');
    return { surname, firstname, display: `${surname.toUpperCase()}, ${firstname}` };
  };

  const getUserAttendanceStats = (userId: string) => {
    const userB = (bookings || []).filter(b => b.userId === userId);
    const activeB = userB.filter(b => b.status !== 'cancelled');
    const totalBooked = activeB.length;
    const totalCancelled = userB.filter(b => b.status === 'cancelled').length;
    const attended = activeB.filter(b => b.attended === true);
    const totalAttended = attended.length;
    const totalAbsent = activeB.filter(b => b.attended === false).length;
    
    let lastAttendedStr = 'Never';
    let daysSinceLastAttendance = null;
    let hasLongAbsence = false;
    
    if (attended.length > 0) {
      const sortedAttended = [...attended].sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
      const lastSession = sortedAttended[0];
      const lastDateObj = new Date(lastSession.sessionDate);
      lastAttendedStr = lastDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      
      const diffTime = Math.abs(new Date().getTime() - lastDateObj.getTime());
      daysSinceLastAttendance = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastAttendance > 30) {
        hasLongAbsence = true;
      }
    } else if (totalBooked > 0) {
      hasLongAbsence = true;
    }
    
    return {
      totalBooked,
      totalCancelled,
      totalAttended,
      totalAbsent,
      lastAttendedStr,
      daysSinceLastAttendance,
      hasLongAbsence
    };
  };

  const formatRegistrationDate = (userItem: User) => {
    if (userItem.registeredAt) {
      return new Date(userItem.registeredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if ((userItem as any).photoPolicyAgreedAt) {
      return new Date((userItem as any).photoPolicyAgreedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return 'Pre-existing';
  };

  const handleUpdateBookingAttendance = async (bookingId: string, attendedStatus: boolean | null) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, { attended: attendedStatus });
    } catch (error) {
      console.error("Error updating booking attendance:", error);
    }
  };

  const filteredUsers = users.filter(u => {
    const q = userSearchQuery.toLowerCase();
    if (!q) return true;
    
    const basic = (u.name || '').toLowerCase().includes(q) || 
                 (u.email || '').toLowerCase().includes(q) || 
                 (u.department || '').toLowerCase().includes(q) || 
                 (u.role || '').toLowerCase().includes(q) ||
                 (u.profile?.familyName || '').toLowerCase().includes(q) ||
                 (u.profile?.parentName || '').toLowerCase().includes(q);
    
    if (basic) return true;

    if (u.profile) {
      if (u.profile.registrationType === 'family') {
        return u.profile.children?.some(c => 
          c.name.toLowerCase().includes(q) || 
          c.dietaryAllergies.toLowerCase().includes(q) || 
          c.medicalConditions.toLowerCase().includes(q) ||
          c.collectionContacts?.some(cc => cc.name.toLowerCase().includes(q) || cc.mobile.includes(q))
        );
      } else if (u.profile.registrationType === 'teenager' && u.profile.teenagerDetails) {
        const td = u.profile.teenagerDetails;
        return td.name.toLowerCase().includes(q) || 
               td.dietaryAllergies.toLowerCase().includes(q) || 
               td.medicalConditions.toLowerCase().includes(q);
      }
    }
    return false;
  });

  const isFriendUser = (u: User) => {
    return u.role === 'friend' || u.profile?.registrationType === 'friend' || u.profile?.isFriendSignup === true;
  };

  const isMemberUser = (u: User) => {
    return (u.role === 'member' || !u.role) && !isFriendUser(u) && u.role !== 'team' && u.role !== 'admin';
  };

  const subTabFilteredUsers = filteredUsers.filter(u => {
    if (activeUserSubTab === 'all') return true;
    if (activeUserSubTab === 'friend') return isFriendUser(u);
    if (activeUserSubTab === 'member') return isMemberUser(u);
    return u.role === activeUserSubTab;
  });

  const sortedSubTabUsers = [...subTabFilteredUsers].sort((a, b) => {
    const aInfo = getSurnameAndFirstname(a);
    const bInfo = getSurnameAndFirstname(b);
    return aInfo.surname.localeCompare(bInfo.surname, 'en', { sensitivity: 'base' }) || 
           aInfo.firstname.localeCompare(bInfo.firstname, 'en', { sensitivity: 'base' });
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
        <div>
          <h1 style={{ color: COLORS.secondary }} className="text-5xl font-bold brand-heading uppercase tracking-tight">Admin Portal</h1>
          <p className="text-gray-500 text-lg font-light mt-2">Manage your centre's content, sessions, and imagery.</p>
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex flex-wrap gap-4 mb-16 border-b border-gray-100 pb-8">
        {[
          { id: 'activities', label: 'Session Management', icon: <Icons.Calendar /> },
          { id: 'bookings', label: 'Session Bookings', icon: <Icons.Clock /> },
          { id: 'wellbeing', label: 'Wellbeing Monitor', icon: <Icons.Heart /> },
          { id: 'social-impact', label: 'Founder Impact Lab 🌟', icon: <Icons.Shield /> },
          { id: 'newsletter', label: 'Newsletter Hub 📩', icon: <Icons.Megaphone /> },
          { id: 'needs', label: 'Center Needs 📍', icon: <Icons.Megaphone /> },
          { id: 'updates', label: 'Centre Updates', icon: <Icons.Megaphone /> },
          { id: 'partners', label: 'Partner Network', icon: <Icons.Briefcase /> },
          { id: 'impact', label: 'Collective Impact', icon: <Icons.Play /> },
          { id: 'inquiries', label: 'Inquiries', icon: <Icons.Heart /> },
          { id: 'rally', label: 'Impact Rally', icon: <Icons.Shield /> },
          { id: 'archive', label: 'Photo Archive', icon: <Icons.Camera /> },
          { id: 'users', label: 'User Hub', icon: <Icons.User /> },
          { id: 'mail', label: 'Mail Monitor', icon: <Icons.Megaphone /> },
          { id: 'warnings', label: 'Warnings & Alerts ⚠️', icon: <Icons.AlertTriangle /> },
          { id: 'images', label: 'Brand Images', icon: <Icons.Camera /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id as any)}
            style={{ 
              backgroundColor: activeAdminTab === tab.id ? COLORS.secondary : '#f8fafc',
              color: activeAdminTab === tab.id ? '#ffffff' : COLORS.secondary
            }}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-xs brand-heading uppercase tracking-widest transition-all ${
              activeAdminTab === tab.id ? 'shadow-xl scale-105' : 'hover:bg-slate-100'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeAdminTab === 'wellbeing' && (
        <div className="animate-fadeIn">
          <MemberWellbeing user={user} logs={wellbeingLogs} allUsers={users} />
        </div>
      )}

      {activeAdminTab === 'social-impact' && (
        <div className="animate-fadeIn">
          <SocialImpactPanel 
            users={users}
            teamLogs={teamLogs}
            wellbeingLogs={wellbeingLogs}
            bookings={bookings}
            caseStudyRequests={caseStudyRequests}
            caseStudies={caseStudies}
          />
        </div>
      )}

      {activeAdminTab === 'users' && (
        <div className="animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-6">
            <div>
              <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-tight">User Hub</h2>
              <p className="text-gray-500 font-light mt-1">Directory of all members and team members with full profile details.</p>
            </div>
            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Icons.Plus className="rotate-45" /> {/* Using Plus rotated as a search icon if search not in Icons */}
                </div>
                <input 
                  type="text"
                  placeholder="Search name, allergy, consent..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full sm:w-80 pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-brand-orange outline-none shadow-sm transition-all text-sm font-medium"
                />
              </div>
              <button 
                onClick={() => {
                  const headers = ["Surname", "Firstname", "Role", "Email", "Department", "Status", "Registration Date", "Sessions Booked", "Sessions Attended", "Sessions Absent", "Last Attended Date", "Allergies", "Medical", "Consent"];
                  const rows = users.map(u => {
                    let allergies = "N/A";
                    let medical = "N/A";
                    let consent = "N/A";
                    
                    if (u.profile?.registrationType === 'family') {
                      allergies = u.profile.children?.map(c => `${c.name}: ${c.dietaryAllergies}`).join("; ") || "None";
                      medical = u.profile.children?.map(c => `${c.name}: ${c.medicalConditions}`).join("; ") || "None";
                      consent = u.profile.dataConsent ? "Yes" : "No";
                    } else if (u.profile?.registrationType === 'teenager' && u.profile.teenagerDetails) {
                      allergies = u.profile.teenagerDetails.dietaryAllergies || "None";
                      medical = u.profile.teenagerDetails.medicalConditions || "None";
                      consent = u.profile.dataConsent ? "Yes" : "No";
                    }
                    
                    const nameInfo = getSurnameAndFirstname(u);
                    const stats = getUserAttendanceStats(u.id);
                    const regDate = formatRegistrationDate(u);
                    
                    return [
                      nameInfo.surname,
                      nameInfo.firstname,
                      u.role,
                      u.email,
                      u.department || "N/A",
                      u.status || "N/A",
                      regDate,
                      stats.totalBooked.toString(),
                      stats.totalAttended.toString(),
                      stats.totalAbsent.toString(),
                      stats.lastAttendedStr,
                      allergies,
                      medical,
                      consent
                    ];
                  });

                  const csvContent = [
                    headers.join(","),
                    ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(","))
                  ].join("\n");

                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.setAttribute("href", url);
                  link.setAttribute("download", `freeatlast_users_${new Date().toISOString().split('T')[0]}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs brand-heading uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
              >
                <Icons.Camera /> Export CSV
              </button>
            </div>
          </div>

          {/* Separation into different user signups Sub-tabs */}
          <div className="flex flex-wrap gap-2 mb-8 bg-slate-50 p-2 rounded-3xl w-fit border border-slate-100 shadow-sm">
            {[
              { id: 'member', label: 'Members' },
              { id: 'team', label: 'Team Members' },
              { id: 'friend', label: 'Friends Of' },
              { id: 'admin', label: 'Admins' },
              { id: 'all', label: 'All Signups' }
            ].map(tab => {
              const count = tab.id === 'all' 
                ? users.length 
                : tab.id === 'friend'
                  ? users.filter(u => isFriendUser(u)).length
                  : tab.id === 'member'
                    ? users.filter(u => isMemberUser(u)).length
                    : users.filter(u => u.role === tab.id).length;
              const isActive = activeUserSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveUserSubTab(tab.id as any)}
                  className={`px-5 py-3 rounded-2xl font-bold text-xs brand-heading uppercase tracking-wider transition-all flex items-center gap-2 ${
                    isActive 
                      ? 'bg-white text-brand-orange shadow-md' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
                >
                  {tab.label}
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive ? 'bg-brand-orange/15 text-brand-orange' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-6 text-[10px] font-black brand-heading uppercase tracking-[0.2em] text-slate-400">Surname, First Name / Account</th>
                  <th className="p-6 text-[10px] font-black brand-heading uppercase tracking-[0.2em] text-slate-400">Email / Role</th>
                  <th className="p-6 text-[10px] font-black brand-heading uppercase tracking-[0.2em] text-slate-400">Registration Date</th>
                  <th className="p-6 text-[10px] font-black brand-heading uppercase tracking-[0.2em] text-slate-400">Attendance & Activity</th>
                  <th className="p-6 text-[10px] font-black brand-heading uppercase tracking-[0.2em] text-slate-400">Status / Consent</th>
                  <th className="p-6 text-[10px] font-black brand-heading uppercase tracking-[0.2em] text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSubTabUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center text-slate-400 font-bold brand-heading uppercase text-sm">No matching users found</td>
                  </tr>
                ) : (
                  sortedSubTabUsers.map((userItem) => {
                    const nameInfo = getSurnameAndFirstname(userItem);
                    const stats = getUserAttendanceStats(userItem.id);
                    const regDate = formatRegistrationDate(userItem);
                    return (
                      <tr key={userItem.id} className="border-b border-gray-50 hover:bg-slate-50/50 transition-colors group">
                        <td className="p-6">
                          <div className="font-bold text-brand-dark-blue brand-heading flex items-center gap-2">
                            {nameInfo.display}
                            {(userItem as any).volunteerNumber && (
                              <span className="text-[9px] font-black bg-brand-orange/15 text-brand-orange px-2 py-0.5 rounded-md uppercase tracking-wider brand-heading">
                                ID: {(userItem as any).volunteerNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                            {userItem.profile?.familyName ? `Family: ${userItem.profile.familyName}` : (userItem.department || 'N/A')}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="text-xs font-medium text-slate-600">{userItem.email}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{userItem.role}</div>
                        </td>
                        <td className="p-6 text-xs text-slate-600 font-medium">
                          {regDate}
                        </td>
                        <td className="p-6">
                          <div className="text-xs font-bold text-slate-700">
                            Attended: <span className="text-green-600">{stats.totalAttended}</span> / <span className="text-slate-400">{stats.totalBooked}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Last: <span className="font-medium text-slate-600">{stats.lastAttendedStr}</span>
                          </div>
                          {stats.hasLongAbsence && (
                            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[8px] font-black bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                              ⚠️ Absence Alert {stats.daysSinceLastAttendance ? `(${stats.daysSinceLastAttendance}d)` : ''}
                            </span>
                          )}
                        </td>
                        <td className="p-6">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider w-fit ${
                              userItem.status === 'approved' ? 'bg-green-100 text-green-600' :
                              userItem.status === 'rejected' ? 'bg-red-100 text-red-600' :
                              'bg-orange-100 text-orange-600'
                            }`}>
                              {userItem.status === 'approved' ? 'Approved' : (userItem.status === 'rejected' ? 'Rejected' : 'Pending Home Visit')}
                            </span>
                            {userItem.profile && (
                              <span className={`text-[8px] font-bold uppercase tracking-widest p-1 rounded w-fit ${userItem.profile.dataConsent ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                                {userItem.profile.dataConsent ? 'Data Authorized' : 'NO CONSENT'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex flex-wrap gap-2">
                            <button 
                              onClick={() => setSelectedUserDetail(userItem)}
                              className="px-3.5 py-1.5 bg-brand-light-blue text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-sm"
                            >
                              View Details
                            </button>
                            {userItem.status !== 'approved' && (
                              <button 
                                onClick={() => handleUpdateUserStatus(userItem.id, 'approved')}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-sm flex items-center gap-1"
                                title={userItem.role === 'member' ? "Mark Home Visit Done & Approve" : "Approve Account"}
                              >
                                <Icons.Check className="w-3 h-3" /> Approve {userItem.role === 'member' ? '(Home Visit)' : ''}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeAdminTab === 'bookings' && (
        <div className="animate-fadeIn">
          {/* Main Bookings Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
              <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-tight">Session Registrations</h2>
              <p className="text-gray-500 font-light mt-1">Organize bookings by activity, track attendance, and filter registers over time.</p>
            </div>
            
            {/* View Switcher Sub-tabs */}
            <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 shadow-sm w-fit">
              <button
                onClick={() => {
                  setActiveBookingView('by-activity');
                  setSelectedActivityId(null);
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs brand-heading uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeBookingView === 'by-activity'
                    ? 'bg-white text-brand-orange shadow-md'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                By Activity Registers
              </button>
              <button
                onClick={() => setActiveBookingView('all-log')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs brand-heading uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeBookingView === 'all-log'
                    ? 'bg-white text-brand-orange shadow-md'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Live Bookings Log
              </button>
            </div>
          </div>

          {activeBookingView === 'by-activity' ? (
            /* By-Activity Registers View */
            selectedActivityId === null ? (
              /* 1. Activities List Selection Grid */
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <div className="relative w-full md:max-w-md">
                    <input
                      type="text"
                      placeholder="Search activities by title..."
                      value={activitySearchQuery}
                      onChange={(e) => setActivitySearchQuery(e.target.value)}
                      className="w-full px-5 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all shadow-sm"
                    />
                  </div>
                  <div className="text-right text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Total Activities with Registrations: {
                      Array.from(new Set(bookings.map(b => b.sessionId))).length
                    }
                  </div>
                </div>

                {(() => {
                  const uniqueSessionIds = Array.from(new Set(bookings.map(b => b.sessionId)));
                  const activitiesList = uniqueSessionIds.map(sid => {
                    const act = activities.find(a => a.id === sid);
                    const sessionBookings = bookings.filter(b => b.sessionId === sid);
                    if (act) {
                      return {
                        ...act,
                        bookingsCount: sessionBookings.length,
                        bookingsList: sessionBookings
                      };
                    } else {
                      const firstB = sessionBookings[0];
                      return {
                        id: sid,
                        title: firstB?.sessionTitle || 'Unknown Session',
                        description: 'Historical registration recording',
                        date: firstB?.sessionDate || '',
                        time: firstB?.sessionTime || '',
                        location: 'Unknown',
                        capacity: 0,
                        bookedCount: sessionBookings.length,
                        category: 'community' as const,
                        status: 'past' as const,
                        bookingsCount: sessionBookings.length,
                        bookingsList: sessionBookings
                      };
                    }
                  });

                  // Filter by Search Query
                  const filteredActivitiesList = activitiesList.filter(act => {
                    if (!activitySearchQuery) return true;
                    return act.title.toLowerCase().includes(activitySearchQuery.toLowerCase());
                  });

                  // Sort: newest session date first
                  const sortedActivitiesList = [...filteredActivitiesList].sort((a, b) => {
                    return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
                  });

                  if (sortedActivitiesList.length === 0) {
                    return (
                      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-16 text-center">
                        <p className="text-slate-400 font-bold brand-heading uppercase text-xs tracking-widest">No activities with bookings found</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {sortedActivitiesList.map((act) => {
                        const attendedCount = act.bookingsList.filter(b => b.attended === true).length;
                        const absentCount = act.bookingsList.filter(b => b.attended === false).length;
                        const unmarkedCount = act.bookingsList.filter(b => b.attended === undefined || b.attended === null).length;
                        
                        return (
                          <div 
                            key={act.id} 
                            onClick={() => {
                              setSelectedActivityId(act.id);
                              setBookingTimeframeFilter('all');
                              setBookingSearchQuery('');
                            }}
                            className="bg-white rounded-[2rem] border border-slate-100 hover:border-brand-orange/30 p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex justify-between items-start gap-4 mb-4">
                                <span className="inline-block px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-brand-orange/10 text-brand-orange brand-heading">
                                  {act.category}
                                </span>
                                <span className={`inline-block px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                  act.status === 'upcoming' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {act.status}
                                </span>
                              </div>

                              <h3 className="font-extrabold text-brand-dark-blue brand-heading text-base leading-tight group-hover:text-brand-orange transition-colors line-clamp-2">
                                {act.title}
                              </h3>
                              
                              <p className="text-slate-400 font-medium text-[10px] mt-2 flex items-center gap-1.5 uppercase tracking-wider">
                                📅 {act.date ? new Date(act.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible'}
                                <span className="text-slate-300">•</span>
                                🕒 {act.time || 'N/A'}
                              </p>

                              {act.location && act.location !== 'Unknown' && (
                                <p className="text-slate-400 text-[10px] mt-1 line-clamp-1">
                                  📍 {act.location}
                                </p>
                              )}
                            </div>

                            <div className="mt-6 pt-5 border-t border-slate-50">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-xs text-slate-500 font-medium">Total Bookings</span>
                                <span className="px-3 py-1 bg-slate-100 text-slate-700 font-black rounded-lg text-xs">
                                  {act.bookingsCount}
                                </span>
                              </div>
                              
                              {/* Quick Attendance Breakdown */}
                              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                                <div className="bg-green-50/50 p-1.5 rounded-lg border border-green-100/50 text-green-600">
                                  <div>{attendedCount}</div>
                                  <div className="text-[8px] uppercase tracking-wider font-extrabold text-green-500/80">Attended</div>
                                </div>
                                <div className="bg-red-50/50 p-1.5 rounded-lg border border-red-100/50 text-red-500">
                                  <div>{absentCount}</div>
                                  <div className="text-[8px] uppercase tracking-wider font-extrabold text-red-400">Absent</div>
                                </div>
                                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-slate-500">
                                  <div>{unmarkedCount}</div>
                                  <div className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Unmarked</div>
                                </div>
                              </div>

                              <button
                                style={{ color: COLORS.secondary }}
                                className="w-full mt-4 text-center py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl font-bold text-[10px] brand-heading uppercase tracking-widest transition-all border border-slate-100/50 group-hover:bg-brand-orange group-hover:text-white group-hover:border-transparent"
                              >
                                Open Recording Table →
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* 2. Detailed Recording Table for Selected Activity */
              (() => {
                const selectedActivity = activities.find(a => a.id === selectedActivityId) || {
                  id: selectedActivityId,
                  title: bookings.find(b => b.sessionId === selectedActivityId)?.sessionTitle || "Unknown Session",
                  date: bookings.find(b => b.sessionId === selectedActivityId)?.sessionDate || "",
                  time: bookings.find(b => b.sessionId === selectedActivityId)?.sessionTime || "",
                  location: 'N/A',
                  capacity: 0,
                  category: 'community' as const,
                  status: 'past' as const,
                  description: 'Historical registration recording'
                };

                const allBookingsForActivity = bookings.filter(b => b.sessionId === selectedActivityId);

                // Apply timeframe and search filters
                const now = new Date();
                const filteredBookingsForActivity = allBookingsForActivity.filter(b => {
                  // Timeframe filter
                  if (bookingTimeframeFilter !== 'all') {
                    const bDate = getBookingDateObj(b);
                    const diffTime = now.getTime() - bDate.getTime();
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);
                    if (bookingTimeframeFilter === 'week' && diffDays > 7) return false;
                    if (bookingTimeframeFilter === 'month' && diffDays > 30) return false;
                    if (bookingTimeframeFilter === 'year' && diffDays > 365) return false;
                  }

                  // Search query filter
                  if (bookingSearchQuery) {
                    const query = bookingSearchQuery.toLowerCase();
                    const participantMatch = b.participantName?.toLowerCase().includes(query);
                    const bookerMatch = b.bookerName?.toLowerCase().includes(query);
                    return participantMatch || bookerMatch;
                  }

                  return true;
                });

                // Sort: Alphabetical order (surname first)
                const sortedBookingsForActivity = [...filteredBookingsForActivity].sort((a, b) => {
                  const aInfo = getParticipantSurnameAndFirstname(a.participantName);
                  const bInfo = getParticipantSurnameAndFirstname(b.participantName);
                  return aInfo.surname.localeCompare(bInfo.surname, 'en', { sensitivity: 'base' }) || 
                         aInfo.firstname.localeCompare(bInfo.firstname, 'en', { sensitivity: 'base' });
                });

                // Attendance stats for filtered list
                const stats = {
                  totalBooked: filteredBookingsForActivity.length,
                  totalAttended: filteredBookingsForActivity.filter(b => b.attended === true).length,
                  totalAbsent: filteredBookingsForActivity.filter(b => b.attended === false).length,
                  totalUnmarked: filteredBookingsForActivity.filter(b => b.attended === undefined || b.attended === null).length
                };

                return (
                  <div className="space-y-8">
                    {/* Activity Header Controls */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <button
                        onClick={() => setSelectedActivityId(null)}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs brand-heading uppercase tracking-wider transition-all flex items-center gap-2 border border-slate-200"
                      >
                        ← Back to Sessions List
                      </button>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleDownloadActivityBookingsCSV(selectedActivity.title, sortedBookingsForActivity)}
                          style={{ backgroundColor: COLORS.secondary }}
                          className="px-6 py-2.5 text-white rounded-xl font-bold text-xs brand-heading uppercase tracking-widest transition-all shadow-md hover:brightness-110 active:scale-95 flex items-center gap-2"
                        >
                          <Icons.Camera /> Export Register CSV
                        </button>
                      </div>
                    </div>

                    {/* Activity Details Banner */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-brand-orange/15 text-brand-orange brand-heading">
                              {selectedActivity.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                              Session Register
                            </span>
                          </div>
                          <h3 className="text-2xl font-black text-brand-dark-blue brand-heading uppercase tracking-tight">
                            {selectedActivity.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-slate-400 text-xs font-semibold mt-2 uppercase tracking-wide">
                            <span>📅 {selectedActivity.date ? new Date(selectedActivity.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Flexible'}</span>
                            <span className="text-slate-200">•</span>
                            <span>🕒 {selectedActivity.time || 'N/A'}</span>
                            {selectedActivity.location && selectedActivity.location !== 'Unknown' && (
                              <>
                                <span className="text-slate-200">•</span>
                                <span>📍 {selectedActivity.location}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Stats Dashboard for selected activity */}
                        <div className="grid grid-cols-4 gap-3 w-full md:w-auto min-w-[320px]">
                          <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
                            <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">Booked</p>
                            <p className="text-lg font-black text-slate-700 mt-1">{stats.totalBooked}</p>
                          </div>
                          <div className="bg-green-50/50 border border-green-100/50 p-3 rounded-2xl text-center">
                            <p className="text-[8px] text-green-500 font-extrabold uppercase tracking-widest">Attended</p>
                            <p className="text-lg font-black text-green-600 mt-1">{stats.totalAttended}</p>
                          </div>
                          <div className="bg-red-50/50 border border-red-100/50 p-3 rounded-2xl text-center">
                            <p className="text-[8px] text-red-500 font-extrabold uppercase tracking-widest">Absent</p>
                            <p className="text-lg font-black text-red-600 mt-1">{stats.totalAbsent}</p>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
                            <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">Pending</p>
                            <p className="text-lg font-black text-slate-500 mt-1">{stats.totalUnmarked}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recording Table Filters & Search */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                      
                      {/* Timeframe selector: week, month, year, all */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500 font-bold brand-heading uppercase tracking-wider mr-2">Booked Over:</span>
                        {[
                          { id: 'all', label: 'All Time' },
                          { id: 'week', label: 'Last Week' },
                          { id: 'month', label: 'Last Month' },
                          { id: 'year', label: 'Last Year' }
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => setBookingTimeframeFilter(t.id as any)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold brand-heading uppercase tracking-wider transition-all border ${
                              bookingTimeframeFilter === t.id 
                                ? 'bg-white border-brand-orange text-brand-orange shadow-sm' 
                                : 'bg-white/50 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {/* Registrant Search input */}
                      <div className="relative w-full md:max-w-xs">
                        <input
                          type="text"
                          placeholder="Search participants..."
                          value={bookingSearchQuery}
                          onChange={(e) => setBookingSearchQuery(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Dedicated Recording Table */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Participant (Surname First)</th>
                              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Booker & Contact Info</th>
                              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Registration Date</th>
                              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading text-center">Attendance Registry Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {sortedBookingsForActivity.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-bold brand-heading uppercase tracking-widest text-xs">
                                  No registered participants found for this filter
                                </td>
                              </tr>
                            ) : (
                              sortedBookingsForActivity.map((b) => {
                                const nameInfo = getParticipantSurnameAndFirstname(b.participantName);
                                const bookingDateStr = b.bookingDate?.toDate ? b.bookingDate.toDate().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
                                
                                return (
                                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                      <p className="text-brand-dark-blue font-black brand-heading text-sm">{nameInfo.display}</p>
                                      <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wider">ID: {b.id.slice(-6)}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                      <p className="text-slate-700 text-xs font-semibold">{b.bookerName || 'N/A'}</p>
                                      {b.bookerMobile && (
                                        <a href={`tel:${b.bookerMobile}`} style={{ color: COLORS.orange }} className="text-[10px] font-bold hover:underline">
                                          📞 {b.bookerMobile}
                                        </a>
                                      )}
                                    </td>
                                    <td className="px-8 py-5 text-xs font-semibold text-slate-500">
                                      {bookingDateStr}
                                    </td>
                                    <td className="px-8 py-5">
                                      <div className="flex justify-center items-center gap-2">
                                        <button
                                          onClick={() => handleUpdateBookingAttendance(b.id, true)}
                                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                            b.attended === true 
                                              ? 'bg-green-500 text-white shadow-sm scale-105' 
                                              : 'bg-slate-100 hover:bg-green-50 text-slate-600 hover:text-green-600'
                                          }`}
                                        >
                                          ✓ Attended
                                        </button>
                                        <button
                                          onClick={() => handleUpdateBookingAttendance(b.id, false)}
                                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                            b.attended === false 
                                              ? 'bg-red-500 text-white shadow-sm scale-105' 
                                              : 'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600'
                                          }`}
                                        >
                                          ✗ Absent
                                        </button>
                                        <button
                                          onClick={() => handleUpdateBookingAttendance(b.id, null)}
                                          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
                                            b.attended === undefined || b.attended === null
                                              ? 'bg-slate-300 text-slate-700' 
                                              : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                                          }`}
                                        >
                                          Reset
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()
            )
          ) : (
            /* Traditional Live Bookings Log View */
            <div className="space-y-8">
              <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-brand-dark-blue brand-heading uppercase">Live Bookings Feed</h3>
                  <p className="text-xs text-slate-400">All registrations listed sequentially as they arrive.</p>
                </div>
                <button 
                  onClick={handleDownloadBookingsCSV}
                  style={{ backgroundColor: COLORS.secondary }}
                  className="px-6 py-2.5 text-white rounded-xl font-bold text-xs brand-heading uppercase tracking-widest transition-all shadow-md hover:brightness-110 active:scale-95 flex items-center gap-2"
                >
                  <Icons.Camera /> Download All CSV
                </button>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Session</th>
                        <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Date/Time</th>
                        <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Participant</th>
                        <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Booker</th>
                        <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Contact</th>
                        <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Booking Made</th>
                        <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading text-center">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {bookings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-8 py-20 text-center text-slate-400 font-bold brand-heading uppercase tracking-widest text-xs">No registrations found</td>
                        </tr>
                      ) : (
                        bookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-6">
                              <p className="text-brand-dark-blue font-bold brand-heading text-sm">{booking.sessionTitle}</p>
                              <p className="text-[10px] text-slate-400 font-bold brand-heading uppercase mt-1">ID: {booking.sessionId.slice(-6)}</p>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-slate-600 font-bold text-xs">{new Date(booking.sessionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                              <p className="text-[10px] text-slate-400 font-bold brand-heading uppercase">{booking.sessionTime}</p>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-brand-dark-blue font-bold text-sm tracking-tight">{booking.participantName}</p>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-slate-500 text-xs font-light">{booking.bookerName}</p>
                            </td>
                            <td className="px-8 py-6">
                              <p style={{ color: COLORS.orange }} className="font-bold text-xs">{booking.bookerMobile}</p>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-[10px] text-slate-400 font-bold brand-heading uppercase">
                                {booking.bookingDate?.toDate ? booking.bookingDate.toDate().toLocaleString() : 'Recent'}
                              </p>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex justify-center items-center gap-2">
                                <button
                                  onClick={() => handleUpdateBookingAttendance(booking.id, true)}
                                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
                                    booking.attended === true 
                                      ? 'bg-green-500 text-white shadow-sm' 
                                      : 'bg-slate-100 hover:bg-green-50 text-slate-600 hover:text-green-600'
                                  }`}
                                >
                                  ✓ Attended
                                </button>
                                <button
                                  onClick={() => handleUpdateBookingAttendance(booking.id, false)}
                                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
                                    booking.attended === false 
                                      ? 'bg-red-500 text-white shadow-sm' 
                                      : 'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600'
                                  }`}
                                >
                                  ✗ Absent
                                </button>
                                <button
                                  onClick={() => handleUpdateBookingAttendance(booking.id, null)}
                                  className={`px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
                                    booking.attended === undefined || booking.attended === null
                                      ? 'bg-slate-300 text-slate-700' 
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                                  }`}
                                >
                                  Reset
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeAdminTab === 'images' && (
        <div className="animate-fadeIn">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-tight">Image Gallery</h2>
              <p className="text-gray-500 font-light mt-1">Replace stock photos with your own community pictures.</p>
            </div>
            <button 
              onClick={onReset}
              className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-[10px] brand-heading uppercase tracking-widest transition-all"
            >
              Reset to Stock
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.keys(assets).map((key) => (
              <div key={key} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm group hover:shadow-xl transition-all">
                <div className="h-48 relative overflow-hidden bg-slate-100">
                  <img 
                    src={assets[key]} 
                    alt={key} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label className="cursor-pointer bg-white text-brand-dark-blue px-6 py-2 rounded-xl font-bold text-xs brand-heading uppercase tracking-widest hover:bg-brand-orange hover:text-white transition-all shadow-xl">
                      Change Image
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(key, e)} 
                      />
                    </label>
                  </div>
                </div>
                <div className="p-6">
                  <h3 style={{ color: COLORS.secondary }} className="font-bold brand-heading uppercase text-sm tracking-wider mb-1">
                    {assetLabels[key] || key}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-medium">Currently: {assets[key].startsWith('data:') ? 'Local Custom Image' : 'Stock URL'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeAdminTab === 'partners' && (
        <div className="animate-fadeIn">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-tight">Partner Network</h2>
              <p className="text-gray-500 font-light mt-1">Manage the organizations that support free@last.</p>
            </div>
            <button 
              onClick={() => setIsAddingPartner(true)}
              style={{ backgroundColor: COLORS.orange }}
              className="px-8 py-3 text-white rounded-xl font-bold text-xs brand-heading uppercase tracking-widest transition-all shadow-lg hover:brightness-110 active:scale-95 flex items-center gap-2"
            >
              <Icons.Plus /> Add New Partner
            </button>
          </div>

          <div className="space-y-6">
            {(isAddingPartner || editingPartner) && (
              <div className="bg-slate-50 p-10 rounded-[2.5rem] border-2 border-brand-orange/20 animate-slideIn mb-12">
                <h3 className="text-xl font-bold brand-heading uppercase text-brand-dark-blue mb-8">
                  {editingPartner ? "Edit Partner" : "Create New Partner"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Partner Name</label>
                    <input 
                      type="text"
                      value={editingPartner ? editingPartner.name : newPartner.name}
                      onChange={(e) => editingPartner ? setEditingPartner({...editingPartner, name: e.target.value}) : setNewPartner({...newPartner, name: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all"
                      placeholder="e.g. Deloitte"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Website URL</label>
                    <input 
                      type="text"
                      value={editingPartner ? editingPartner.website : newPartner.website}
                      onChange={(e) => editingPartner ? setEditingPartner({...editingPartner, website: e.target.value}) : setNewPartner({...newPartner, website: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Short Description (Sub-text)</label>
                    <input 
                      type="text"
                      value={editingPartner ? editingPartner.description : newPartner.description}
                      onChange={(e) => editingPartner ? setEditingPartner({...editingPartner, description: e.target.value}) : setNewPartner({...newPartner, description: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all"
                      placeholder="e.g. pro-bono support, volunteering, sharing influence"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Deep Impact Details</label>
                    <textarea 
                      value={editingPartner ? editingPartner.details : newPartner.details}
                      onChange={(e) => editingPartner ? setEditingPartner({...editingPartner, details: e.target.value}) : setNewPartner({...newPartner, details: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all h-32 resize-none"
                      placeholder="Tell the full story of our shared work..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Logo / Image URL</label>
                    <div className="flex gap-4">
                      <input 
                        type="text"
                        value={editingPartner ? editingPartner.logo : newPartner.logo}
                        onChange={(e) => editingPartner ? setEditingPartner({...editingPartner, logo: e.target.value}) : setNewPartner({...newPartner, logo: e.target.value})}
                        className="flex-grow px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all"
                        placeholder="Image URL or Base64"
                      />
                      <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 px-6 py-4 rounded-xl flex items-center justify-center transition-all">
                        <Icons.Camera />
                        <input 
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const compressed = await compressImage(reader.result as string);
                                if (editingPartner) setEditingPartner({...editingPartner, logo: compressed});
                                else setNewPartner({...newPartner, logo: compressed});
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Impact Statistics</label>
                    <div className="space-y-3">
                      {(editingPartner?.stats || newPartner?.stats || []).map((stat, i) => (
                        <div key={i} className="flex gap-2">
                          <input 
                            placeholder="Value (e.g. 500+)"
                            value={stat.value}
                            onChange={(e) => {
                              const stats = [...(editingPartner?.stats || newPartner?.stats || [])];
                              stats[i].value = e.target.value;
                              if (editingPartner) setEditingPartner({...editingPartner, stats});
                              else setNewPartner({...newPartner, stats});
                            }}
                            className="w-1/3 px-4 py-2 rounded-lg border border-gray-200 outline-none"
                          />
                          <input 
                            placeholder="Label (e.g. Toys Donated)"
                            value={stat.label}
                            onChange={(e) => {
                              const stats = [...(editingPartner?.stats || newPartner?.stats || [])];
                              stats[i].label = e.target.value;
                              if (editingPartner) setEditingPartner({...editingPartner, stats});
                              else setNewPartner({...newPartner, stats});
                            }}
                            className="flex-grow px-4 py-2 rounded-lg border border-gray-200 outline-none"
                          />
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          const stats = [...(editingPartner?.stats || newPartner?.stats || []), { label: '', value: '' }];
                          if (editingPartner) setEditingPartner({...editingPartner, stats});
                          else setNewPartner({...newPartner, stats});
                        }}
                        className="text-[9px] font-bold uppercase tracking-widest text-brand-orange brand-heading"
                      >
                        + Add Statistic
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handleSavePartner}
                    style={{ backgroundColor: COLORS.orange }}
                    className="px-10 py-4 text-white rounded-xl font-bold text-xs brand-heading uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95"
                  >
                    Save Partner
                  </button>
                  <button 
                    onClick={() => { setEditingPartner(null); setIsAddingPartner(false); }}
                    className="px-10 py-4 bg-slate-200 text-slate-600 rounded-xl font-bold text-xs brand-heading uppercase tracking-widest hover:bg-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {partners.map((partner) => (
                <div key={partner.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
                  <img 
                    src={partner.logo} 
                    alt="" 
                    className="w-20 h-20 object-cover rounded-2xl border border-gray-100" 
                  />
                  <div className="flex-grow">
                    <h3 style={{ color: COLORS.secondary }} className="text-xl font-bold brand-heading mb-1">{partner.name}</h3>
                    <p className="text-xs text-gray-500 font-light line-clamp-1">{partner.description}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => setEditingPartner(partner)}
                      className="px-4 py-2 bg-slate-50 text-slate-400 hover:text-brand-orange hover:bg-brand-orange/10 rounded-lg font-bold text-[9px] brand-heading uppercase tracking-widest transition-all"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeletePartner(partner.id)}
                      className={`px-4 py-2 rounded-lg font-bold text-[9px] brand-heading uppercase tracking-widest transition-all ${
                        deletingId === partner.id 
                          ? 'bg-red-600 text-white animate-pulse' 
                          : 'bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                    >
                      {deletingId === partner.id ? 'Confirm?' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'impact' && (
        <div className="animate-fadeIn">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-tight">Collective Impact Stories</h2>
              <p className="text-gray-500 font-light mt-1">Share the outcomes and successes of our work with partners.</p>
            </div>
            <button 
              onClick={() => setIsAddingImpactStory(true)}
              style={{ backgroundColor: COLORS.orange }}
              className="px-8 py-3 text-white rounded-xl font-bold text-xs brand-heading uppercase tracking-widest transition-all shadow-lg hover:brightness-110 active:scale-95 flex items-center gap-2"
            >
              <Icons.Plus /> New Story
            </button>
          </div>

          <div className="space-y-6">
            {(isAddingImpactStory || editingImpactStory) && (
              <div className="bg-slate-50 p-10 rounded-[2.5rem] border-2 border-brand-orange/20 animate-slideIn mb-12">
                <h3 className="text-xl font-bold brand-heading uppercase text-brand-dark-blue mb-8">
                  {editingImpactStory ? "Edit Story" : "Create New Story"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Story Title</label>
                    <input 
                      type="text"
                      value={editingImpactStory ? editingImpactStory.title : newImpactStory.title}
                      onChange={(e) => editingImpactStory ? setEditingImpactStory({...editingImpactStory, title: e.target.value}) : setNewImpactStory({...newImpactStory, title: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all"
                      placeholder="e.g. Transforming Youth Spaces"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Partner Name</label>
                    <input 
                      type="text"
                      value={editingImpactStory ? editingImpactStory.partnerName : newImpactStory.partnerName}
                      onChange={(e) => editingImpactStory ? setEditingImpactStory({...editingImpactStory, partnerName: e.target.value}) : setNewImpactStory({...newImpactStory, partnerName: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all"
                      placeholder="e.g. Deloitte"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Story Content</label>
                    <textarea 
                      value={editingImpactStory ? editingImpactStory.content : newImpactStory.content}
                      onChange={(e) => editingImpactStory ? setEditingImpactStory({...editingImpactStory, content: e.target.value}) : setNewImpactStory({...newImpactStory, content: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all h-32 resize-none"
                      placeholder="Describe the impact we made together..."
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Story Image URL</label>
                    <div className="flex gap-4">
                      <input 
                        type="text"
                        value={editingImpactStory ? editingImpactStory.image : newImpactStory.image}
                        onChange={(e) => editingImpactStory ? setEditingImpactStory({...editingImpactStory, image: e.target.value}) : setNewImpactStory({...newImpactStory, image: e.target.value})}
                        className="flex-grow px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange outline-none transition-all"
                        placeholder="Image URL or Base64"
                      />
                      <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 px-6 py-4 rounded-xl flex items-center justify-center transition-all">
                        <Icons.Camera />
                        <input 
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const compressed = await compressImage(reader.result as string);
                                if (editingImpactStory) setEditingImpactStory({...editingImpactStory, image: compressed});
                                else setNewImpactStory({...newImpactStory, image: compressed});
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handleSaveImpactStory}
                    style={{ backgroundColor: COLORS.orange }}
                    className="px-10 py-4 text-white rounded-xl font-bold text-xs brand-heading uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95"
                  >
                    Save Story
                  </button>
                  <button 
                    onClick={() => { setEditingImpactStory(null); setIsAddingImpactStory(false); }}
                    className="px-10 py-4 bg-slate-200 text-slate-600 rounded-xl font-bold text-xs brand-heading uppercase tracking-widest hover:bg-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {impactStories.map((story) => (
                <div key={story.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col group hover:shadow-md transition-all">
                  <div className="flex items-center gap-6 mb-4">
                    <img 
                      src={story.image || "https://picsum.photos/seed/impact/200/200"} 
                      alt="" 
                      className="w-20 h-20 object-cover rounded-2xl border border-gray-100" 
                    />
                    <div className="flex-grow">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-brand-orange brand-heading">{story.partnerName}</span>
                      <h3 style={{ color: COLORS.secondary }} className="text-xl font-bold brand-heading mb-1">{story.title}</h3>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 font-light line-clamp-2 mb-6">{story.content}</p>
                  <div className="flex gap-3 mt-auto">
                    <button 
                      onClick={() => setEditingImpactStory(story)}
                      className="flex-grow px-4 py-2 bg-slate-50 text-slate-400 hover:text-brand-orange hover:bg-brand-orange/10 rounded-lg font-bold text-[9px] brand-heading uppercase tracking-widest transition-all"
                    >
                      Edit Story
                    </button>
                    <button 
                      onClick={() => handleDeleteImpactStory(story.id)}
                      className={`px-4 py-2 rounded-lg font-bold text-[9px] brand-heading uppercase tracking-widest transition-all ${
                        deletingId === story.id 
                          ? 'bg-red-600 text-white animate-pulse' 
                          : 'bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                    >
                      {deletingId === story.id ? 'Confirm?' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'inquiries' && (
        <div className="animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-tight">Member Questions & Inquiries</h2>
              <p className="text-gray-500 font-light mt-1">Review and respond directly to questions and queries from hub members and site visitors.</p>
            </div>
            
            {/* Quick Metrics */}
            <div className="flex gap-3">
              <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 brand-heading block">Total</span>
                <span className="text-xl font-bold text-brand-dark-blue brand-heading">{inquiries.length}</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-2xl text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 brand-heading block">Pending Reply</span>
                <span className="text-xl font-bold text-amber-600 brand-heading">
                  {inquiries.filter(i => i.status === 'new' || i.status === 'read').length}
                </span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 brand-heading block">Replied</span>
                <span className="text-xl font-bold text-emerald-600 brand-heading">
                  {inquiries.filter(i => i.status === 'replied').length}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setInquiryFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest brand-heading transition-all ${
                inquiryFilter === 'all'
                  ? 'bg-brand-dark-blue text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              All Questions ({inquiries.length})
            </button>
            <button
              onClick={() => setInquiryFilter('new')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest brand-heading transition-all ${
                inquiryFilter === 'new'
                  ? 'bg-brand-orange text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              Awaiting Reply ({inquiries.filter(i => i.status === 'new' || i.status === 'read').length})
            </button>
            <button
              onClick={() => setInquiryFilter('replied')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest brand-heading transition-all ${
                inquiryFilter === 'replied'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              Replied ({inquiries.filter(i => i.status === 'replied').length})
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {inquiries.length === 0 ? (
              <div className="bg-slate-50 rounded-[2rem] p-16 text-center border-2 border-dashed border-slate-200">
                <Icons.Heart className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-400 font-bold brand-heading uppercase tracking-widest text-sm">No questions or inquiries recorded</p>
              </div>
            ) : (
              inquiries
                .filter(inquiry => {
                  if (inquiryFilter === 'new') return inquiry.status === 'new' || inquiry.status === 'read';
                  if (inquiryFilter === 'replied') return inquiry.status === 'replied';
                  return true;
                })
                .map((inquiry) => (
                  <div 
                    key={inquiry.id} 
                    className={`p-8 rounded-[2rem] border transition-all ${
                      inquiry.status === 'new' 
                        ? 'bg-brand-orange/5 border-brand-orange/30 shadow-sm' 
                        : inquiry.status === 'replied'
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-white border-slate-100 hover:shadow-md'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                      <div className="flex-grow">
                        {/* Header Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest brand-heading ${
                            inquiry.status === 'replied' ? 'bg-emerald-600 text-white' : 
                            inquiry.status === 'new' ? 'bg-brand-orange text-white' : 
                            inquiry.status === 'read' ? 'bg-blue-600 text-white' : 
                            'bg-green-500 text-white'
                          }`}>
                            {inquiry.status === 'replied' ? 'Replied' : inquiry.status}
                          </span>
                          <span className="px-3 py-1 bg-brand-dark-blue/10 text-brand-dark-blue rounded-lg text-[9px] font-bold uppercase tracking-widest brand-heading">
                            {inquiry.type || 'General'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold brand-heading uppercase ml-auto sm:ml-0">
                            {inquiry.timestamp?.toDate ? inquiry.timestamp.toDate().toLocaleString() : 'Recent'}
                          </span>
                        </div>

                        {/* Person Info */}
                        <div className="mb-4">
                          <h3 className="text-2xl font-bold brand-heading text-brand-dark-blue flex items-center gap-2">
                            {inquiry.name}
                            {inquiry.userId && (
                              <span className="text-[10px] font-bold bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full uppercase">
                                Registered Member
                              </span>
                            )}
                          </h3>
                          <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500 mt-1">
                            {inquiry.email && <span className="text-brand-dark-blue">✉ {inquiry.email}</span>}
                            {inquiry.mobile && <span className="text-brand-orange">📱 {inquiry.mobile}</span>}
                          </div>
                        </div>

                        {/* Question Text */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 italic text-slate-700 font-medium leading-relaxed mb-6 shadow-2xs">
                          "{inquiry.message}"
                        </div>

                        {/* Discussion / Response History */}
                        {(inquiry.reply || (inquiry.replies && inquiry.replies.length > 0)) && (
                          <div className="mb-6 p-5 bg-emerald-50/80 rounded-2xl border border-emerald-200">
                            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-widest brand-heading mb-3 flex items-center gap-1.5">
                              <Icons.Check className="w-4 h-4 text-emerald-600" />
                              Staff Response History
                            </h4>
                            
                            {inquiry.reply && (!inquiry.replies || inquiry.replies.length === 0) && (
                              <div className="text-xs text-emerald-950 leading-relaxed font-medium">
                                <p className="mb-1 text-[10px] font-bold text-emerald-700 uppercase brand-heading">
                                  Responded by {inquiry.repliedBy || 'free@last Staff'} {inquiry.repliedAt ? `on ${new Date(inquiry.repliedAt).toLocaleString()}` : ''}
                                </p>
                                <p className="bg-white p-3.5 rounded-xl border border-emerald-100">{inquiry.reply}</p>
                              </div>
                            )}

                            {inquiry.replies && inquiry.replies.map((rep, rIdx) => (
                              <div 
                                key={rIdx} 
                                className={`mb-2 p-3.5 rounded-xl text-xs leading-relaxed ${
                                  rep.sender === 'admin'
                                    ? 'bg-white text-emerald-950 border border-emerald-200'
                                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1 text-[9.5px] font-bold uppercase brand-heading opacity-70">
                                  <span>{rep.senderName} ({rep.sender === 'admin' ? 'Staff' : 'Member'})</span>
                                  <span>{rep.timestamp ? new Date(rep.timestamp).toLocaleString() : ''}</span>
                                </div>
                                <p className="font-medium">{rep.message}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Admin Response Composer */}
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-600 mb-2 brand-heading flex items-center gap-2">
                            <Icons.Reply className="w-4 h-4 text-brand-orange" />
                            Send Staff Response to {inquiry.name}
                          </label>
                          <textarea
                            rows={3}
                            placeholder={`Type your reply to ${inquiry.name} here... (This will be visible in their member portal and emailed to them)`}
                            value={adminReplyTextMap[inquiry.id] || ''}
                            onChange={e => setAdminReplyTextMap({ ...adminReplyTextMap, [inquiry.id]: e.target.value })}
                            className="w-full p-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-brand-orange leading-relaxed resize-none mb-3"
                          ></textarea>
                          
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleSendAdminReply(inquiry)}
                              disabled={sendingReplyId === inquiry.id || !adminReplyTextMap[inquiry.id]?.trim()}
                              style={{ backgroundColor: COLORS.secondary }}
                              className="px-6 py-2.5 text-white rounded-xl font-bold text-xs uppercase tracking-widest brand-heading hover:bg-brand-orange transition-all shadow-md flex items-center gap-2 disabled:opacity-40"
                            >
                              {sendingReplyId === inquiry.id ? (
                                <span>Sending Response...</span>
                              ) : (
                                <>
                                  <Icons.Send className="w-3.5 h-3.5" />
                                  <span>Send Reply & Email</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Action Menu */}
                      <div className="flex flex-col gap-2 min-w-[180px]">
                        {inquiry.status === 'new' && (
                          <button 
                            onClick={() => handleUpdateInquiryStatus(inquiry.id, 'read')}
                            className="w-full px-5 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl font-bold text-[10px] brand-heading uppercase tracking-widest hover:border-brand-orange hover:text-brand-orange transition-all"
                          >
                            Mark Under Review
                          </button>
                        )}
                        {inquiry.status !== 'contacted' && (
                          <button 
                            onClick={() => handleUpdateInquiryStatus(inquiry.id, 'contacted')}
                            className="w-full px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-[10px] brand-heading uppercase tracking-widest hover:bg-slate-200 transition-all"
                          >
                            Mark Contacted
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteInquiry(inquiry.id)}
                          className={`w-full px-5 py-2.5 rounded-xl font-bold text-[10px] brand-heading uppercase tracking-widest transition-all ${
                            deletingId === inquiry.id 
                              ? 'bg-red-600 text-white animate-pulse' 
                              : 'bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50'
                          }`}
                        >
                          {deletingId === inquiry.id ? 'Confirm Delete?' : 'Delete Inquiry'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {activeAdminTab === 'rally' && (
        <div className="animate-fadeIn">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-tight">Collective Impact Rally</h2>
              <p className="text-gray-500 font-light mt-1">Real-time aggregate data of team contributions and social value.</p>
            </div>
            <div className="text-right">
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest brand-heading mb-1">Assumption</div>
               <div className="text-xs font-bold text-brand-dark-blue px-4 py-2 bg-slate-100 rounded-lg">1 Hour = £15 Social Value</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              { label: 'Weekly Rally (7d)', hours: teamLogs.filter(l => new Date(l.date) >= new Date(Date.now() - 7 * 86400000)).reduce((s, l) => s + l.hours, 0) },
              { label: 'Monthly Rally (30d)', hours: teamLogs.filter(l => new Date(l.date) >= new Date(Date.now() - 30 * 86400000)).reduce((s, l) => s + l.hours, 0) },
              { label: 'All-Time Impact', hours: teamLogs.reduce((s, l) => s + l.hours, 0) }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] brand-heading mb-4">{stat.label}</div>
                <div style={{ color: COLORS.orange }} className="text-5xl font-bold brand-heading mb-2">{stat.hours} <span className="text-sm opacity-50 uppercase tracking-tighter">hrs</span></div>
                <div style={{ color: COLORS.green }} className="text-xl font-bold brand-heading">£{(stat.hours * 15).toLocaleString()}</div>
                <div className="text-[10px] text-slate-300 font-medium uppercase tracking-widest mt-2">Social Value</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
               <h3 className="text-sm font-bold brand-heading uppercase tracking-widest text-brand-dark-blue">Recent Team Sessions</h3>
               <button 
                 onClick={() => {
                   const headers = ["Date", "Member", "Session", "Hours", "Value", "Attendees"];
                   const csv = [
                     headers.join(","),
                     ...teamLogs.map(l => [
                       l.date,
                       l.teamMemberName || "Unknown",
                       l.sessionName,
                       l.hours,
                       `£${l.hours * 15}`,
                       l.attendeesCount
                     ].join(","))
                   ].join("\n");
                   const blob = new Blob([csv], { type: 'text/csv' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = `impact_rally_${new Date().toISOString().split('T')[0]}.csv`;
                   a.click();
                 }}
                 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-brand-orange transition-colors brand-heading flex items-center gap-2"
               >
                 <Icons.Camera /> Export Report
               </button>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="border-b border-slate-100 bg-slate-50/30">
                     <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Team Member</th>
                     <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Session Details</th>
                     <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Hours</th>
                     <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Impact Value</th>
                     <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading text-right">Date</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {teamLogs.length === 0 ? (
                     <tr>
                       <td colSpan={5} className="px-8 py-16 text-center text-slate-300 font-bold brand-heading uppercase tracking-widest text-xs italic">No session logs found yet.</td>
                     </tr>
                   ) : (
                     teamLogs.map(log => (
                       <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                         <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                             <div style={{ backgroundColor: COLORS.secondary }} className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold font-mono">
                               {(log.teamMemberName || 'U')[0].toUpperCase()}
                             </div>
                             <p className="text-brand-dark-blue font-bold text-sm">{log.teamMemberName || "Anonymous"}</p>
                           </div>
                         </td>
                         <td className="px-8 py-6">
                           <div className="flex items-center gap-2 mb-0.5">
                             <p className="text-slate-700 font-bold text-xs">{log.sessionName}</p>
                             <span className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase font-black tracking-widest">{log.category}</span>
                           </div>
                           <p className="text-[10px] text-slate-400 italic line-clamp-1">"{log.outcome}"</p>
                         </td>
                         <td className="px-8 py-6">
                           <p className="text-brand-dark-blue font-bold text-xs">{log.hours} <span className="opacity-40 font-normal">hrs</span></p>
                         </td>
                         <td className="px-8 py-6">
                           <p style={{ color: COLORS.green }} className="font-bold text-sm tracking-tight">£{(log.hours * 15).toLocaleString()}</p>
                         </td>
                         <td className="px-8 py-6 text-right">
                           <p className="text-[10px] text-slate-400 font-bold brand-heading uppercase">{new Date(log.date).toLocaleDateString('en-GB')}</p>
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'updates' && (
        <div className="animate-fadeIn">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-tight">News Feed</h2>
              <p className="text-gray-500 font-light mt-1">Manage the news and updates displayed on the homepage.</p>
            </div>
            <button 
              onClick={() => setIsAddingAnnouncement(true)}
              style={{ backgroundColor: COLORS.orange }}
              className="px-8 py-3 text-white rounded-xl font-bold text-xs brand-heading uppercase tracking-widest transition-all shadow-lg hover:brightness-110 active:scale-95 flex items-center gap-2"
            >
              <Icons.Plus /> New Update
            </button>
          </div>

          <div className="space-y-6">
            {(isAddingAnnouncement || editingAnnouncement) && (
              <div className="bg-slate-50 p-10 rounded-[2.5rem] border-2 border-brand-orange/20 animate-slideIn">
                <h3 className="text-xl font-bold brand-heading uppercase text-brand-dark-blue mb-8">
                  {editingAnnouncement ? "Edit Update" : "Create New Update"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Title</label>
                    <input 
                      type="text"
                      value={editingAnnouncement ? editingAnnouncement.title : newAnnouncement.title}
                      onChange={(e) => editingAnnouncement ? setEditingAnnouncement({...editingAnnouncement, title: e.target.value}) : setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                      placeholder="e.g. Summer Camp 2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Category</label>
                    <select 
                      value={editingAnnouncement ? editingAnnouncement.category : newAnnouncement.category}
                      onChange={(e) => editingAnnouncement ? setEditingAnnouncement({...editingAnnouncement, category: e.target.value as any}) : setNewAnnouncement({...newAnnouncement, category: e.target.value as any})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                    >
                      <option value="Update">Update</option>
                      <option value="News">News</option>
                      <option value="Event">Event</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Content</label>
                    <textarea 
                      value={editingAnnouncement ? editingAnnouncement.content : newAnnouncement.content}
                      onChange={(e) => editingAnnouncement ? setEditingAnnouncement({...editingAnnouncement, content: e.target.value}) : setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all h-32 resize-none"
                      placeholder="What's happening?"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Author</label>
                    <input 
                      type="text"
                      value={editingAnnouncement ? editingAnnouncement.author : newAnnouncement.author}
                      onChange={(e) => editingAnnouncement ? setEditingAnnouncement({...editingAnnouncement, author: e.target.value}) : setNewAnnouncement({...newAnnouncement, author: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handleSaveAnnouncement}
                    style={{ backgroundColor: COLORS.orange }}
                    className="px-10 py-4 text-white rounded-xl font-bold text-xs brand-heading uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95"
                  >
                    Save Update
                  </button>
                  <button 
                    onClick={() => { setEditingAnnouncement(null); setIsAddingAnnouncement(false); }}
                    className="px-10 py-4 bg-slate-200 text-slate-600 rounded-xl font-bold text-xs brand-heading uppercase tracking-widest hover:bg-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              {announcements.map((ann) => (
                <div key={ann.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 group hover:shadow-md transition-all">
                  <div className="flex-grow">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-100 text-slate-500 px-3 py-1 rounded-lg brand-heading">{ann.category}</span>
                      <span className="text-[10px] font-bold text-slate-400 brand-heading uppercase">{new Date(ann.date).toLocaleDateString()}</span>
                    </div>
                    <h3 style={{ color: COLORS.secondary }} className="text-xl font-bold brand-heading mb-1">{ann.title}</h3>
                    <p className="text-sm text-gray-500 font-light truncate max-w-2xl">{ann.content}</p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button 
                      onClick={() => setEditingAnnouncement(ann)}
                      className="px-6 py-3 bg-slate-50 text-slate-400 hover:text-brand-orange hover:bg-brand-orange/10 rounded-xl font-bold text-[10px] brand-heading uppercase tracking-widest transition-all"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className={`px-6 py-3 rounded-xl font-bold text-[10px] brand-heading uppercase tracking-widest transition-all ${
                        deletingId === ann.id 
                          ? 'bg-red-600 text-white animate-pulse' 
                          : 'bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                    >
                      {deletingId === ann.id ? 'Confirm Delete?' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'archive' && (
        <div className="animate-fadeIn">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-tight">Photo Archive</h2>
              <p className="text-gray-500 font-light mt-1">Manage old photo collections and historical events.</p>
            </div>
            <button 
              onClick={() => setIsAddingAlbum(true)}
              style={{ backgroundColor: COLORS.orange }}
              className="px-8 py-3 text-white rounded-xl font-bold text-xs brand-heading uppercase tracking-widest transition-all shadow-lg hover:brightness-110 active:scale-95 flex items-center gap-2"
            >
              <Icons.Plus /> New Archive Album
            </button>
          </div>

          <div className="space-y-6">
            {(isAddingAlbum || editingAlbum) && (
              <div className="bg-slate-50 p-10 rounded-[2.5rem] border-2 border-brand-orange/20 animate-slideIn">
                <h3 className="text-xl font-bold brand-heading uppercase text-brand-dark-blue mb-8">
                  {editingAlbum ? "Edit Archive Album" : "Create Archive Album"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Event Title</label>
                    <input 
                      type="text"
                      value={editingAlbum ? editingAlbum.title : newAlbum.title}
                      onChange={(e) => editingAlbum ? setEditingAlbum({...editingAlbum, title: e.target.value}) : setNewAlbum({...newAlbum, title: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                      placeholder="e.g. Community Day 2018"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Category</label>
                    <select 
                      value={editingAlbum ? editingAlbum.category : newAlbum.category}
                      onChange={(e) => editingAlbum ? setEditingAlbum({...editingAlbum, category: e.target.value as any}) : setNewAlbum({...newAlbum, category: e.target.value as any})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                    >
                      <option value="youth">Youth</option>
                      <option value="community">Community</option>
                      <option value="sports">Sports</option>
                      <option value="education">Education</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Event Date</label>
                    <input 
                      type="date"
                      value={editingAlbum ? editingAlbum.date : newAlbum.date}
                      onChange={(e) => editingAlbum ? setEditingAlbum({...editingAlbum, date: e.target.value}) : setNewAlbum({...newAlbum, date: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Flickr Album URL</label>
                    <input 
                      type="text"
                      value={editingAlbum ? editingAlbum.flickrAlbumUrl : newAlbum.flickrAlbumUrl}
                      onChange={(e) => editingAlbum ? setEditingAlbum({...editingAlbum, flickrAlbumUrl: e.target.value}) : setNewAlbum({...newAlbum, flickrAlbumUrl: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                      placeholder="https://flickr.com/photos/..."
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Description</label>
                    <textarea 
                      value={editingAlbum ? editingAlbum.description : newAlbum.description}
                      onChange={(e) => editingAlbum ? setEditingAlbum({...editingAlbum, description: e.target.value}) : setNewAlbum({...newAlbum, description: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all h-32 resize-none"
                      placeholder="Briefly describe the collection..."
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Preview Image</label>
                    <div className="flex flex-col md:flex-row items-start gap-4">
                      {(editingAlbum?.imageUrl || newAlbum?.imageUrl) && (
                        <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white shrink-0">
                          <img 
                            src={editingAlbum ? editingAlbum.imageUrl : newAlbum.imageUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-grow w-full space-y-4">
                        <div className="flex gap-4">
                          <label className="flex-1 cursor-pointer bg-white border border-gray-200 text-brand-dark-blue px-6 py-4 rounded-xl font-bold text-xs brand-heading uppercase tracking-widest hover:bg-slate-50 transition-all text-center">
                            {editingAlbum?.imageUrl || newAlbum?.imageUrl ? 'Change Photo' : 'Upload Archive Photo'}
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = async () => {
                                    const compressed = await compressImage(reader.result as string);
                                    if (editingAlbum) setEditingAlbum({...editingAlbum, imageUrl: compressed});
                                    else setNewAlbum({...newAlbum, imageUrl: compressed});
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }} 
                            />
                          </label>
                          {(editingAlbum?.imageUrl || newAlbum?.imageUrl) && (
                            <button 
                              onClick={() => {
                                if (editingAlbum) setEditingAlbum({...editingAlbum, imageUrl: ''});
                                else setNewAlbum({...newAlbum, imageUrl: ''});
                              }}
                              className="px-6 py-4 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                            >
                              <span className="text-xs font-bold uppercase brand-heading">Remove</span>
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-[9px] text-gray-400 uppercase font-bold brand-heading">Image URL</p>
                            <input 
                              type="text"
                              value={editingAlbum ? editingAlbum.imageUrl : newAlbum.imageUrl}
                              onChange={(e) => editingAlbum ? setEditingAlbum({...editingAlbum, imageUrl: e.target.value}) : setNewAlbum({...newAlbum, imageUrl: e.target.value})}
                              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all text-xs"
                              placeholder="https://..."
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[9px] text-gray-400 uppercase font-bold brand-heading">Quick Pick from Brand Images</p>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(assets).map(([key, url]) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => {
                                    if (editingAlbum) setEditingAlbum({...editingAlbum, imageUrl: url as string});
                                    else setNewAlbum({...newAlbum, imageUrl: url as string});
                                  }}
                                  className={`w-8 h-8 rounded-md overflow-hidden border-2 transition-all shrink-0 ${
                                    (editingAlbum ? editingAlbum.imageUrl : newAlbum.imageUrl) === url ? 'border-brand-orange scale-110' : 'border-transparent hover:border-slate-300'
                                  }`}
                                  title={assetLabels[key] || key}
                                >
                                  <img src={url as string} className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handleSaveAlbum}
                    style={{ backgroundColor: COLORS.secondary }}
                    className="px-10 py-4 text-white rounded-2xl font-black text-xs brand-heading uppercase tracking-[0.2em] shadow-xl hover:brightness-110 transition-all"
                  >
                    {editingAlbum ? "Update Collection" : "Save to Archive"}
                  </button>
                  <button 
                    onClick={() => { setEditingAlbum(null); setIsAddingAlbum(false); }}
                    className="px-10 py-4 bg-slate-200 text-slate-600 rounded-2xl font-black text-xs brand-heading uppercase tracking-[0.2em] hover:bg-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {galleryAlbums.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold brand-heading uppercase tracking-widest text-xs">No archive albums found.</p>
                </div>
              ) : (
                galleryAlbums.map((album) => (
                  <div key={album.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 group hover:shadow-xl transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 overflow-hidden shrink-0">
                        {album.imageUrl ? <img src={album.imageUrl} className="w-full h-full object-cover" /> : <Icons.Camera />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-3 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-black uppercase tracking-widest">{album.category}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(album.date).getFullYear()}</span>
                        </div>
                        <h4 className="text-lg font-bold brand-heading text-brand-dark-blue">{album.title}</h4>
                        <p className="text-xs text-gray-500 line-clamp-1">{album.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button 
                        onClick={() => setEditingAlbum(album)}
                        className="px-6 py-3 bg-slate-50 text-slate-400 hover:text-brand-orange hover:bg-brand-orange/10 rounded-xl font-bold text-[10px] brand-heading uppercase tracking-widest transition-all"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteAlbum(album.id)}
                        className={`px-6 py-3 rounded-xl font-bold text-[10px] brand-heading uppercase tracking-widest transition-all ${
                          deletingId === album.id 
                            ? 'bg-red-600 text-white animate-pulse' 
                            : 'bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                      >
                        {deletingId === album.id ? 'Confirm?' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )))}
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'activities' && (
        <div className="animate-fadeIn">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-tight">Session Management</h2>
              <p className="text-gray-500 font-light mt-1">Add sessions, track bookings, and link Flickr albums.</p>
            </div>
            <button 
              onClick={() => {
                setEditingActivity(null);
                setIsAddingActivity(true);
              }}
              style={{ backgroundColor: COLORS.orange }}
              className="px-8 py-3 text-white rounded-xl font-bold text-xs brand-heading uppercase tracking-widest transition-all shadow-lg hover:brightness-110 active:scale-95 flex items-center gap-2"
            >
              <Icons.Plus /> Add New Session
            </button>
          </div>

          <div className="space-y-6">
            {(isAddingActivity || editingActivity) && (
              <div className="bg-slate-50 p-10 rounded-[2.5rem] border-2 border-brand-orange/20 animate-slideIn">
                <h3 className="text-xl font-bold brand-heading uppercase text-brand-dark-blue mb-8">
                  {editingActivity ? "Edit Session" : "Create New Session"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Session Title</label>
                    <input 
                      type="text"
                      value={editingActivity ? editingActivity.title : newActivity.title}
                      onChange={(e) => editingActivity ? setEditingActivity({...editingActivity, title: e.target.value}) : setNewActivity({...newActivity, title: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Category</label>
                    <select 
                      value={editingActivity ? editingActivity.category : newActivity.category}
                      onChange={(e) => editingActivity ? setEditingActivity({...editingActivity, category: e.target.value as any}) : setNewActivity({...newActivity, category: e.target.value as any})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                    >
                      <option value="youth">Youth</option>
                      <option value="community">Community</option>
                      <option value="sports">Sports</option>
                      <option value="education">Education</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Session Description</label>
                    <textarea 
                      value={editingActivity ? editingActivity.description : newActivity.description}
                      onChange={(e) => editingActivity ? setEditingActivity({...editingActivity, description: e.target.value}) : setNewActivity({...newActivity, description: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all h-24 resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Date</label>
                    <input 
                      type="date"
                      value={editingActivity ? editingActivity.date : newActivity.date}
                      onChange={(e) => editingActivity ? setEditingActivity({...editingActivity, date: e.target.value}) : setNewActivity({...newActivity, date: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Time</label>
                    <input 
                      type="text"
                      value={editingActivity ? editingActivity.time : newActivity.time}
                      onChange={(e) => editingActivity ? setEditingActivity({...editingActivity, time: e.target.value}) : setNewActivity({...newActivity, time: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                      placeholder="e.g. 16:00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Frequency</label>
                    <select 
                      value={editingActivity ? (editingActivity.frequency || 'once') : (newActivity.frequency || 'once')}
                      onChange={(e) => editingActivity ? setEditingActivity({...editingActivity, frequency: e.target.value as any}) : setNewActivity({...newActivity, frequency: e.target.value as any})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                    >
                      <option value="once">One-time Session</option>
                      <option value="weekly">Weekly Recurring</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Display Status</label>
                    <select 
                      value={editingActivity ? editingActivity.status : newActivity.status}
                      onChange={(e) => editingActivity ? setEditingActivity({...editingActivity, status: e.target.value as any}) : setNewActivity({...newActivity, status: e.target.value as any})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                    >
                      <option value="upcoming">Upcoming (Bookable)</option>
                      <option value="past">Past (Gallery)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Flickr Album URL (Optional)</label>
                    <input 
                      type="text"
                      value={editingActivity ? editingActivity.flickrAlbumUrl : newActivity.flickrAlbumUrl}
                      onChange={(e) => editingActivity ? setEditingActivity({...editingActivity, flickrAlbumUrl: e.target.value}) : setNewActivity({...newActivity, flickrAlbumUrl: e.target.value})}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                      placeholder="https://flic.kr/s/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Maximum Capacity</label>
                    <input 
                      type="number"
                      value={(editingActivity ? editingActivity.capacity : newActivity.capacity) ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        editingActivity 
                          ? setEditingActivity({...editingActivity, capacity: isNaN(val) ? 0 : val}) 
                          : setNewActivity({...newActivity, capacity: isNaN(val) ? 0 : val});
                      }}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Manual Booked Tracker</label>
                    <input 
                      type="number"
                      value={(editingActivity ? editingActivity.bookedCount : newActivity.bookedCount) ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        editingActivity 
                          ? setEditingActivity({...editingActivity, bookedCount: isNaN(val) ? 0 : val}) 
                          : setNewActivity({...newActivity, bookedCount: isNaN(val) ? 0 : val});
                      }}
                      className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading">Session Image (Optional)</label>
                    <div className="flex items-center gap-4">
                      {(editingActivity?.imageUrl || newActivity?.imageUrl) && (
                        <img 
                          src={editingActivity ? editingActivity.imageUrl : newActivity.imageUrl} 
                          alt="Preview" 
                          className="w-16 h-16 object-cover rounded-xl shadow-sm border border-gray-100"
                        />
                      )}
                      <label className="flex-grow cursor-pointer bg-white border border-gray-200 text-brand-dark-blue px-6 py-4 rounded-xl font-bold text-xs brand-heading uppercase tracking-widest hover:bg-slate-50 transition-all text-center">
                        {editingActivity?.imageUrl || newActivity?.imageUrl ? 'Change Session Photo' : 'Upload Session Photo'}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const compressed = await compressImage(reader.result as string);
                                if (editingActivity) setEditingActivity({...editingActivity, imageUrl: compressed});
                                else setNewActivity({...newActivity, imageUrl: compressed});
                              };
                              reader.readAsDataURL(file);
                            }
                          }} 
                        />
                      </label>
                      {(editingActivity?.imageUrl || newActivity?.imageUrl) && (
                        <button 
                          onClick={() => {
                            if (editingActivity) setEditingActivity({...editingActivity, imageUrl: undefined});
                            else setNewActivity({...newActivity, imageUrl: undefined});
                          }}
                          className="px-4 py-4 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                        >
                          <span className="text-xs font-bold uppercase brand-heading">Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handleSaveActivity}
                    style={{ backgroundColor: COLORS.orange }}
                    className="px-10 py-4 text-white rounded-xl font-bold text-xs brand-heading uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95"
                  >
                    Save Session
                  </button>
                  <button 
                    onClick={() => { setEditingActivity(null); setIsAddingActivity(false); }}
                    className="px-10 py-4 bg-slate-200 text-slate-600 rounded-xl font-bold text-xs brand-heading uppercase tracking-widest hover:bg-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              {activities.map((act) => (
                <div key={act.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 group hover:shadow-md transition-all">
                  {act.imageUrl && (
                    <img 
                      src={act.imageUrl} 
                      alt="" 
                      className="w-24 h-24 object-cover rounded-2xl hidden md:block border border-gray-100" 
                    />
                  )}
                  <div className="flex-grow">
                    <div className="flex items-center gap-4 mb-3">
                      <span style={{ backgroundColor: act.status === 'upcoming' ? COLORS.green + '20' : COLORS.secondary + '20', color: act.status === 'upcoming' ? COLORS.green : COLORS.secondary }} className="text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg brand-heading">
                        {act.status}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-100 text-slate-500 px-3 py-1 rounded-lg brand-heading">
                        {act.category}
                      </span>
                      {act.frequency === 'weekly' && (
                        <span className="text-[9px] font-bold uppercase tracking-widest bg-brand-orange/10 text-brand-orange px-3 py-1 rounded-lg brand-heading">
                          Weekly
                        </span>
                      )}
                      {act.frequency === 'weekly' ? (
                        <span className="text-[10px] font-bold text-slate-400 brand-heading uppercase">
                          Next: {(() => {
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            let occ = parseLocalDate(act.date);
                            while (occ < today) occ.setDate(occ.getDate() + 7);
                            return occ.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                          })()} @ {act.time}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 brand-heading uppercase">
                          {parseLocalDate(act.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} @ {act.time}
                        </span>
                      )}
                    </div>
                    <h3 style={{ color: COLORS.secondary }} className="text-xl font-bold brand-heading mb-1">{act.title}</h3>
                    <div className="flex items-center gap-6 mt-2">
                      <div className="px-3 py-1 bg-brand-orange/5 border border-brand-orange/20 rounded-lg">
                        <p className="text-[10px] font-bold text-brand-orange uppercase tracking-widest brand-heading">
                          Booking Status: {(() => {
                            if (act.frequency !== 'weekly') return act.bookedCount;
                            
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            let occ = parseLocalDate(act.date);
                            while (occ < today) occ.setDate(occ.getDate() + 7);
                            const effectiveDate = formatLocalDateStr(occ);
                            
                            return (bookings || []).filter(b => b.sessionId === act.id && b.sessionDate === effectiveDate).length;
                          })()} / {act.capacity} Booked
                        </p>
                      </div>
                      {act.flickrAlbumUrl && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-brand-light-blue uppercase tracking-widest brand-heading">
                          <Icons.Camera /> Album Linked
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button 
                      onClick={() => {
                        setIsAddingActivity(false);
                        setEditingActivity(act);
                      }}
                      className="px-6 py-3 bg-brand-orange text-white rounded-xl font-bold text-[10px] brand-heading uppercase tracking-widest transition-all shadow-md hover:brightness-110 active:scale-95"
                    >
                      Update / Track
                    </button>
                    <button 
                      onClick={() => handleDeleteActivity(act.id)}
                      className={`px-4 py-3 rounded-xl font-bold text-[10px] brand-heading uppercase tracking-widest transition-all ${
                        deletingId === act.id 
                          ? 'bg-red-600 text-white animate-pulse' 
                          : 'bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                    >
                      {deletingId === act.id ? 'Confirm?' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-20 p-12 bg-brand-dark-blue rounded-[3rem] text-white text-center relative overflow-hidden">
        <div style={{ backgroundColor: COLORS.orange }} className="absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20"></div>
        <h2 className="text-3xl font-bold brand-heading uppercase tracking-widest mb-4">Admin Dashboard</h2>
        <p className="text-white/70 max-w-2xl mx-auto font-light leading-relaxed">
          Use the tabs above to manage different aspects of the centre. Updates appear on the home page, sessions appear in booking/gallery, and brand images allow you to customise the site's look.
        </p>
      </div>

      {/* User Details Modal */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark-blue/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl relative">
            <button 
              onClick={() => setSelectedUserDetail(null)}
              className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-all z-10"
            >
              <Icons.Plus className="rotate-45" />
            </button>

            <div className="p-8 md:p-16">
              <div className="flex flex-col md:flex-row items-start gap-8 mb-12 border-b border-slate-100 pb-12">
                <div className="w-24 h-24 bg-brand-orange/10 rounded-3xl flex items-center justify-center text-brand-orange">
                  <Icons.User className="w-12 h-12" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h2 style={{ color: COLORS.secondary }} className="text-4xl font-bold brand-heading uppercase tracking-tight">{selectedUserDetail.name || 'Account Details'}</h2>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest brand-heading ${
                      selectedUserDetail.status === 'approved' ? 'bg-green-100 text-green-600' :
                      selectedUserDetail.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      'bg-orange-100 text-orange-600'
                    }`}>
                      {selectedUserDetail.status || 'pending'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-lg font-light">{selectedUserDetail.email} • {selectedUserDetail.role.toUpperCase()}</p>
                  {selectedUserDetail.department && (
                    <p className="inline-block mt-4 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-[10px] brand-heading uppercase tracking-widest">
                      {selectedUserDetail.department} Dept
                    </p>
                  )}
                </div>
              </div>

              {/* TOP SUMMARY: Rapid Emergency Access, Safeguarding, Authorized Collectors & Health */}
              {selectedUserDetail.profile && (
                <div className="mb-12 bg-gradient-to-br from-red-50/70 via-orange-50/50 to-amber-50/50 border-2 border-brand-orange/40 rounded-[2.5rem] p-6 md:p-8 shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-brand-orange/20 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-orange text-white rounded-xl flex items-center justify-center shadow-md">
                        <Icons.ShieldAlert className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black brand-heading uppercase tracking-wider text-brand-dark-blue flex items-center gap-2">
                          Emergency, Collection & Safeguarding Summary
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Critical rapid-access details for staff: authorized collection contacts, parent mobiles, dietary needs, and medical consents.
                        </p>
                      </div>
                    </div>
                    {selectedUserDetail.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await handleAdminUpdateUser(selectedUserDetail.id, 'approved', editRole, uniqueNumInput, true);
                          alert("Home visit confirmed! Member approved.");
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-[10px] brand-heading uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <Icons.Check className="w-4 h-4" /> Mark Home Visit Done & Approve
                      </button>
                    )}
                  </div>

                  {/* Primary Parent / Emergency Mobile & Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/90 rounded-2xl border border-orange-100 mb-6 shadow-sm">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Primary Contact</p>
                      <p className="font-bold text-xs text-brand-dark-blue">{selectedUserDetail.profile.parentName || selectedUserDetail.name}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Emergency Mobile</p>
                      {selectedUserDetail.profile.parentMobile ? (
                        <a href={`tel:${selectedUserDetail.profile.parentMobile}`} className="font-bold text-xs text-brand-orange hover:underline flex items-center gap-1">
                          <Icons.PhoneCall className="w-3.5 h-3.5" /> {selectedUserDetail.profile.parentMobile}
                        </a>
                      ) : (
                        <p className="text-xs text-slate-400 font-medium">None listed</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Address & Postcode</p>
                      <p className="font-bold text-xs text-brand-dark-blue truncate">
                        {selectedUserDetail.profile.address || 'N/A'}{selectedUserDetail.profile.postcode ? `, ${selectedUserDetail.profile.postcode}` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Consents Status</p>
                      <div className="flex flex-wrap gap-1">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${selectedUserDetail.profile.medicalConsent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          Med: {selectedUserDetail.profile.medicalConsent ? 'YES' : 'NO'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${selectedUserDetail.profile.mediaConsent ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          Photo: {selectedUserDetail.profile.mediaConsent ? 'YES' : 'NO'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Children Safeguarding Breakdown (Authorized Collection Contacts 1, 2, 3 + Mobiles, Dietary, Medical) */}
                  {selectedUserDetail.profile.registrationType === 'family' && selectedUserDetail.profile.children && selectedUserDetail.profile.children.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Children Collection Permissions (Up to 3 Authorized Adults) & Health Data:
                      </p>
                      <div className="grid grid-cols-1 gap-4">
                        {selectedUserDetail.profile.children.map((child, cIdx) => {
                          // Extract collection contacts
                          let contacts: AuthorizedCollector[] = child.collectionContacts || [];
                          if (contacts.length === 0 && child.collectionPermissions) {
                            contacts = child.collectionPermissions.map(p => {
                              const match = p.match(/^(.+?)\s*\((.+?)\)$/);
                              if (match) return { name: match[1].trim(), mobile: match[2].trim() };
                              return { name: p.trim(), mobile: '' };
                            });
                          }
                          const displayContacts = [
                            contacts[0] || { name: '', mobile: '' },
                            contacts[1] || { name: '', mobile: '' },
                            contacts[2] || { name: '', mobile: '' }
                          ].slice(0, 3);

                          return (
                            <div key={cIdx} className="bg-white p-5 rounded-2xl border-2 border-orange-100 shadow-sm space-y-4">
                              <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-7 h-7 rounded-lg bg-brand-dark-blue text-white flex items-center justify-center font-bold text-xs">
                                    {cIdx + 1}
                                  </span>
                                  <h4 className="font-bold text-base text-brand-dark-blue brand-heading">{child.name}</h4>
                                  <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">
                                    Age: {child.age || 'N/A'} (DOB: {child.dob || 'N/A'})
                                  </span>
                                </div>
                                {child.ownMobile && (
                                  <div className="text-xs text-slate-500 font-medium">
                                    Child's Mobile (Secondary aged): <a href={`tel:${child.ownMobile}`} className="font-bold text-brand-orange hover:underline">{child.ownMobile}</a>
                                  </div>
                                )}
                              </div>

                              {/* 3 Authorized Collection Contacts */}
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-brand-orange mb-2 flex items-center gap-1.5">
                                  <Icons.UserCheck className="w-3.5 h-3.5" /> Authorized Collection Contacts & Mobiles (3 People)
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  {displayContacts.map((contact, slotIdx) => (
                                    <div key={slotIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">
                                        Collector {slotIdx + 1}
                                      </span>
                                      <p className="font-bold text-xs text-brand-dark-blue truncate">
                                        {contact.name || <span className="text-slate-400 font-normal italic">Not specified</span>}
                                      </p>
                                      {contact.mobile ? (
                                        <a href={`tel:${contact.mobile}`} className="text-[11px] font-bold text-brand-orange hover:underline flex items-center gap-1">
                                          <Icons.Phone className="w-3 h-3" /> {contact.mobile}
                                        </a>
                                      ) : (
                                        <p className="text-[10px] text-slate-400 font-light">No mobile recorded</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Dietary & Medical for this child */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div className="p-3 bg-orange-50/80 border border-orange-100 rounded-xl">
                                  <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest block mb-0.5">
                                    Dietary Requirements & Allergies
                                  </span>
                                  <p className="text-xs font-semibold text-brand-dark-blue">
                                    {child.dietaryAllergies || 'None declared'}
                                  </p>
                                </div>
                                <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl">
                                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-0.5">
                                    Medical Conditions & Medication
                                  </span>
                                  <p className="text-xs font-semibold text-brand-dark-blue">
                                    {child.medicalConditions || 'None declared'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Teenager Safeguarding & Health */}
                  {selectedUserDetail.profile.registrationType === 'teenager' && selectedUserDetail.profile.teenagerDetails && (
                    <div className="bg-white p-5 rounded-2xl border-2 border-orange-100 shadow-sm space-y-4">
                      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-2">
                        <h4 className="font-bold text-base text-brand-dark-blue brand-heading">{selectedUserDetail.profile.teenagerDetails.name}</h4>
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">
                          Age: {selectedUserDetail.profile.teenagerDetails.age} (DOB: {selectedUserDetail.profile.teenagerDetails.dob || 'N/A'})
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Teenager Mobile</p>
                          {selectedUserDetail.profile.teenagerDetails.teenagerMobile ? (
                            <a href={`tel:${selectedUserDetail.profile.teenagerDetails.teenagerMobile}`} className="font-bold text-xs text-brand-orange hover:underline flex items-center gap-1">
                              <Icons.Phone className="w-3 h-3" /> {selectedUserDetail.profile.teenagerDetails.teenagerMobile}
                            </a>
                          ) : (
                            <p className="text-xs text-slate-400">None</p>
                          )}
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Parent Name</p>
                          <p className="font-bold text-xs text-brand-dark-blue">{selectedUserDetail.profile.parentName || 'N/A'}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Parent Emergency Mobile</p>
                          {selectedUserDetail.profile.parentMobile ? (
                            <a href={`tel:${selectedUserDetail.profile.parentMobile}`} className="font-bold text-xs text-brand-orange hover:underline flex items-center gap-1">
                              <Icons.PhoneCall className="w-3 h-3" /> {selectedUserDetail.profile.parentMobile}
                            </a>
                          ) : (
                            <p className="text-xs text-slate-400">None</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-orange-50/80 border border-orange-100 rounded-xl">
                          <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest block mb-0.5">Dietary Requirements & Allergies</span>
                          <p className="text-xs font-semibold text-brand-dark-blue">{selectedUserDetail.profile.teenagerDetails.dietaryAllergies || 'None declared'}</p>
                        </div>
                        <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl">
                          <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-0.5">Medical Conditions & Medication</span>
                          <p className="text-xs font-semibold text-brand-dark-blue">{selectedUserDetail.profile.teenagerDetails.medicalConditions || 'None declared'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Core Settings Panel */}
              <div className="bg-orange-50/50 rounded-[2rem] border-2 border-brand-orange/20 p-8 mb-12">
                <h3 className="text-xs font-black brand-heading uppercase tracking-widest text-brand-orange mb-6 flex items-center gap-2">
                  <Icons.Key className="w-4 h-4" /> Administration Controls
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                  <div>
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-2">Account Status</label>
                    <select 
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value as UserStatus)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-brand-dark-blue outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-2">User Access Role</label>
                    <select 
                      value={editRole}
                      onChange={e => setEditRole(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-brand-dark-blue outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                    >
                      <option value="member">member</option>
                      <option value="friend">friend</option>
                      <option value="team">team</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-2">Consent & Registration Form</label>
                    <select 
                      value={editProfileComplete ? 'complete' : 'incomplete'}
                      onChange={e => setEditProfileComplete(e.target.value === 'complete')}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-brand-dark-blue outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                    >
                      <option value="complete">Completed / Bypassed</option>
                      <option value="incomplete">Needs Registration Form</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-2">Unique Volunteer ID / Code</label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-brand-dark-blue outline-none placeholder:text-gray-300 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                      value={uniqueNumInput}
                      onChange={e => setUniqueNumInput(e.target.value)}
                      placeholder="Assign unique code to approve/track"
                    />
                  </div>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-slate-100">
                  {confirmDeleteId === selectedUserDetail.id ? (
                    <div className="bg-red-50/80 border border-red-100 p-4 rounded-2xl w-full sm:max-w-md animate-fadeIn">
                      <p className="text-red-700 text-xs font-bold leading-relaxed mb-3">
                        ⚠️ Permanent Deletion: This deletes their database profile completely. Note: Because of secure client-side constraints, their auth credentials remain in Firebase. If they sign up again with this same email, they must use their original password (or reset it via "Forgot Password"). Are you sure?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(selectedUserDetail.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold brand-heading uppercase tracking-wider text-[9px] rounded-lg active:scale-95 transition-all shadow-sm"
                        >
                          Confirm & Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold brand-heading uppercase tracking-wider text-[9px] rounded-lg transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(selectedUserDetail.id)}
                      className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold brand-heading uppercase tracking-widest text-[10px] rounded-xl active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Icons.Trash className="w-3.5 h-3.5" /> Delete User Account
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      await handleAdminUpdateUser(selectedUserDetail.id, editStatus, editRole, uniqueNumInput, editProfileComplete);
                      alert("User account saved successfully!");
                    }}
                    className="px-6 py-3 bg-brand-orange text-white font-bold brand-heading uppercase tracking-widest text-[10px] rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>

              {isFriendUser(selectedUserDetail) ? (
                <div className="bg-slate-50 p-8 rounded-[2rem] space-y-6">
                  <h3 style={{ color: COLORS.orange }} className="text-xs font-black brand-heading uppercase tracking-widest">Friend Profile Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Name</p>
                      <p className="font-bold text-brand-dark-blue">{selectedUserDetail.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Email Address</p>
                      <p className="font-bold text-brand-dark-blue">{selectedUserDetail.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Mobile Number</p>
                      <p className="font-bold text-brand-dark-blue">{(selectedUserDetail.profile as any)?.mobileNumber || selectedUserDetail.profile?.parentMobile || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Business / Network Name</p>
                      <p className="font-bold text-brand-dark-blue">{(selectedUserDetail.profile as any)?.businessName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Account Role</p>
                      <p className="font-bold text-brand-orange uppercase">Friend Of free@last</p>
                    </div>
                  </div>
                </div>
              ) : !selectedUserDetail.profile ? (
                <div className="bg-slate-50 p-12 rounded-[2rem] text-center">
                  <p className="text-slate-400 font-bold brand-heading uppercase text-sm tracking-widest">No registration profile found yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-12">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h3 style={{ color: COLORS.orange }} className="text-xs font-black brand-heading uppercase tracking-widest mb-6">Contact & Status</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Registration Type</p>
                          <p className="font-bold text-brand-dark-blue capitalize">{selectedUserDetail.profile.registrationType}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Living With</p>
                          <p className="font-bold text-brand-dark-blue">{selectedUserDetail.profile.livingWith || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Parent Mobile</p>
                          <p className="font-bold text-brand-dark-blue">{selectedUserDetail.profile.parentMobile || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Parent Email</p>
                          <p className="font-bold text-brand-dark-blue truncate">{selectedUserDetail.profile.parentEmail || 'N/A'}</p>
                        </div>
                        {selectedUserDetail.profile.ethnicity && (
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Ethnicity</p>
                            <p className="font-bold text-brand-dark-blue">{selectedUserDetail.profile.ethnicity}</p>
                          </div>
                        )}
                        {selectedUserDetail.profile.religion && (
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Religion / Faith</p>
                            <p className="font-bold text-brand-dark-blue">{selectedUserDetail.profile.religion}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Address */}
                    <div className="bg-slate-50 p-8 rounded-3xl">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Residential Address</h3>
                      <p className="text-brand-dark-blue font-medium leading-relaxed italic">
                        {selectedUserDetail.profile.address || 'Address not provided'}
                      </p>
                    </div>

                    {/* Consent Tracking */}
                    <div className="space-y-4">
                      <h3 style={{ color: COLORS.orange }} className="text-xs font-black brand-heading uppercase tracking-widest mb-6">Legal Consents</h3>
                      <div className="flex flex-wrap gap-4">
                        <div className={`px-6 py-4 rounded-2xl flex items-center gap-3 ${selectedUserDetail.profile.dataConsent ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          <div className={`w-3 h-3 rounded-full ${selectedUserDetail.profile.dataConsent ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="font-bold text-[10px] brand-heading uppercase tracking-widest">Data Processing</span>
                        </div>
                        <div className={`px-6 py-4 rounded-2xl flex items-center gap-3 ${selectedUserDetail.profile.mediaConsent ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          <div className={`w-3 h-3 rounded-full ${selectedUserDetail.profile.mediaConsent ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="font-bold text-[10px] brand-heading uppercase tracking-widest">Media/Photos</span>
                        </div>
                        <div className={`px-6 py-4 rounded-2xl flex items-center gap-3 ${selectedUserDetail.profile.medicalConsent ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          <div className={`w-3 h-3 rounded-full ${selectedUserDetail.profile.medicalConsent ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="font-bold text-[10px] brand-heading uppercase tracking-widest">First Aid/Medical</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Registered Individuals (Children or Teenager) */}
                  <div className="space-y-6">
                    <h3 style={{ color: COLORS.secondary }} className="text-xs font-black brand-heading uppercase tracking-widest">Individual Details (Health & Safety)</h3>
                    
                    {selectedUserDetail.profile.registrationType === 'family' ? (
                      <div className="space-y-4">
                        {selectedUserDetail.profile.children?.map((child, idx) => (
                          <div key={idx} className="bg-white border-2 border-slate-100 p-8 rounded-[2rem] shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                              <h4 className="text-xl font-bold brand-heading text-brand-dark-blue">{child.name}</h4>
                              <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded text-slate-500 uppercase tracking-widest">Age: {child.age}</span>
                            </div>
                            <div className="space-y-4">
                              {(child.ethnicity || child.religion) && (
                                <div className="flex flex-wrap gap-2 pb-2">
                                  {child.ethnicity && (
                                    <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                      Ethnicity: {child.ethnicity}
                                    </span>
                                  )}
                                  {child.religion && (
                                    <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                      Religion: {child.religion}
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                                <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Allergies / Dietary</p>
                                <p className="text-xs font-medium text-brand-dark-blue italic">{child.dietaryAllergies || 'No specific requests listed'}</p>
                              </div>
                              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Medical / Health</p>
                                <p className="text-xs font-medium text-brand-dark-blue italic">{child.medicalConditions || 'No conditions declared'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      selectedUserDetail.profile.teenagerDetails && (
                        <div className="bg-white border-4 border-brand-orange/10 p-10 rounded-[2.5rem] shadow-lg">
                          <h4 className="text-2xl font-bold brand-heading text-brand-dark-blue mb-8">{selectedUserDetail.profile.teenagerDetails.name}</h4>
                          <div className="space-y-6">
                            {(selectedUserDetail.profile.teenagerDetails.ethnicity || selectedUserDetail.profile.teenagerDetails.religion) && (
                              <div className="flex flex-wrap gap-2">
                                {selectedUserDetail.profile.teenagerDetails.ethnicity && (
                                  <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl uppercase tracking-wider text-[9px] brand-heading">
                                    Ethnicity: {selectedUserDetail.profile.teenagerDetails.ethnicity}
                                  </span>
                                )}
                                {selectedUserDetail.profile.teenagerDetails.religion && (
                                  <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl uppercase tracking-wider text-[9px] brand-heading">
                                    Religion: {selectedUserDetail.profile.teenagerDetails.religion}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Age</p>
                                <p className="text-sm font-bold text-brand-dark-blue">{selectedUserDetail.profile.teenagerDetails.age}</p>
                              </div>
                              <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mobile</p>
                                <p className="text-sm font-bold text-brand-dark-blue">{selectedUserDetail.profile.teenagerDetails.teenagerMobile || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100">
                              <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2 px-1">Allergies / Dietary</p>
                              <p className="text-sm font-medium text-brand-dark-blue leading-relaxed italic">{selectedUserDetail.profile.teenagerDetails.dietaryAllergies || 'No specific requests listed'}</p>
                            </div>
                            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 px-1">Medical / Health</p>
                              <p className="text-sm font-medium text-brand-dark-blue leading-relaxed italic">{selectedUserDetail.profile.teenagerDetails.medicalConditions || 'No conditions declared'}</p>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Session History & Attendance Registry */}
              <div className="mt-12 border-t border-slate-100 pt-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                  <div>
                    <h3 style={{ color: COLORS.secondary }} className="text-2xl font-bold brand-heading uppercase tracking-tight">Session History & Attendance Registry</h3>
                    <p className="text-gray-500 font-light mt-1">Record and view attendance history for this user's booked sessions.</p>
                  </div>
                  <div className="flex gap-4">
                    {(() => {
                      const stats = getUserAttendanceStats(selectedUserDetail.id);
                      return (
                        <div className="flex items-center gap-3 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                          <div className="text-center">
                            <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Booked</p>
                            <p className="font-bold text-slate-700">{stats.totalBooked}</p>
                          </div>
                          <div className="h-6 w-px bg-slate-200"></div>
                          <div className="text-center">
                            <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest text-green-600">Attended</p>
                            <p className="font-bold text-green-600">{stats.totalAttended}</p>
                          </div>
                          <div className="h-6 w-px bg-slate-200"></div>
                          <div className="text-center">
                            <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest text-red-600">Absent</p>
                            <p className="font-bold text-red-500">{stats.totalAbsent}</p>
                          </div>
                          <div className="h-6 w-px bg-slate-200"></div>
                          <div className="text-center">
                            <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest text-orange-500">Cancelled</p>
                            <p className="font-bold text-orange-500">{stats.totalCancelled || 0}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {(() => {
                  const userBookings = (bookings || []).filter(b => b.userId === selectedUserDetail.id);
                  if (userBookings.length === 0) {
                    return (
                      <div className="bg-slate-50 p-12 rounded-[2rem] text-center border border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold brand-heading uppercase text-xs tracking-widest">No session bookings recorded for this account</p>
                      </div>
                    );
                  }

                  const sortedUserBookings = [...userBookings].sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());

                  return (
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Session Details</th>
                              <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Date & Time</th>
                              <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Participant</th>
                              <th className="px-6 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest brand-heading text-center">Attendance Registry Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {sortedUserBookings.map((b) => (
                              <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <p className="text-brand-dark-blue font-bold text-sm">{b.sessionTitle}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">ID: {b.sessionId.slice(-6)}</p>
                                </td>
                                <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                                  {new Date(b.sessionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  <span className="block text-[10px] text-slate-400 font-normal">{b.sessionTime}</span>
                                </td>
                                <td className="px-6 py-4 text-xs font-medium text-slate-700">
                                  {b.participantName}
                                </td>
                                <td className="px-6 py-4">
                                  {b.status === 'cancelled' ? (
                                    <div className="flex justify-center">
                                      <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-500 border border-red-100">
                                        Cancelled by Member
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex justify-center items-center gap-2">
                                      <button
                                        onClick={() => handleUpdateBookingAttendance(b.id, true)}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
                                          b.attended === true 
                                            ? 'bg-green-500 text-white shadow-sm' 
                                            : 'bg-slate-100 hover:bg-green-50 text-slate-600 hover:text-green-600'
                                        }`}
                                      >
                                        ✓ Attended
                                      </button>
                                      <button
                                        onClick={() => handleUpdateBookingAttendance(b.id, false)}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
                                          b.attended === false 
                                            ? 'bg-red-500 text-white shadow-sm' 
                                            : 'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600'
                                        }`}
                                      >
                                        ✗ Absent
                                      </button>
                                      <button
                                        onClick={() => handleUpdateBookingAttendance(b.id, null)}
                                        className={`px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
                                          b.attended === undefined || b.attended === null
                                            ? 'bg-slate-300 text-slate-700' 
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                                        }`}
                                      >
                                        Reset
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeAdminTab === 'mail' && (
        <div className="animate-fadeIn">
          {/* Top Header & Metrics */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-tight">Mail & Email Communications Hub</h2>
              <p className="text-gray-500 font-light mt-1">Review system email notifications, respond directly to recipients, or manage pending delivery logs.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 brand-heading block">Total Emails</span>
                <span className="text-xl font-bold text-brand-dark-blue brand-heading">{mailLogs.length}</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-2xl text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 brand-heading block">Pending Action</span>
                <span className="text-xl font-bold text-amber-600 brand-heading">
                  {mailLogs.filter(m => (m.delivery?.state || 'PENDING') === 'PENDING' && m.status !== 'RESOLVED').length}
                </span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 brand-heading block">Resolved / Sent</span>
                <span className="text-xl font-bold text-emerald-600 brand-heading">
                  {mailLogs.filter(m => m.delivery?.state === 'SUCCESS' || m.status === 'RESOLVED').length}
                </span>
              </div>
              <div className="bg-red-50 border border-red-200 px-4 py-2.5 rounded-2xl text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-700 brand-heading block">Delivery Error</span>
                <span className="text-xl font-bold text-red-600 brand-heading">
                  {mailLogs.filter(m => m.delivery?.state === 'ERROR').length}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Bar, Search & Bulk Action */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setMailFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest brand-heading transition-all ${
                  mailFilter === 'all' ? 'bg-brand-dark-blue text-white shadow-xs' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                All Emails ({mailLogs.length})
              </button>
              <button
                onClick={() => setMailFilter('pending')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest brand-heading transition-all ${
                  mailFilter === 'pending' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                ⏳ Pending Action ({mailLogs.filter(m => (m.delivery?.state || 'PENDING') === 'PENDING' && m.status !== 'RESOLVED').length})
              </button>
              <button
                onClick={() => setMailFilter('resolved')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest brand-heading transition-all ${
                  mailFilter === 'resolved' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                ✓ Resolved / Sent ({mailLogs.filter(m => m.delivery?.state === 'SUCCESS' || m.status === 'RESOLVED').length})
              </button>
              <button
                onClick={() => setMailFilter('error')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest brand-heading transition-all ${
                  mailFilter === 'error' ? 'bg-red-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                ⚠️ Errors ({mailLogs.filter(m => m.delivery?.state === 'ERROR').length})
              </button>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search mail by recipient or subject..."
                value={mailSearchQuery}
                onChange={e => setMailSearchQuery(e.target.value)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs w-full md:w-64 focus:outline-none focus:border-brand-orange bg-white"
              />

              {mailLogs.some(m => (m.delivery?.state || 'PENDING') === 'PENDING' && m.status !== 'RESOLVED') && (
                <button
                  onClick={handleMarkAllPendingMailResolved}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest brand-heading bg-slate-800 hover:bg-slate-900 text-white transition-all shrink-0"
                >
                  Mark All Pending as Handled
                </button>
              )}
            </div>
          </div>

          {/* Table / List View */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Recipient</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Subject & Message</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Status</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Date / Details</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(() => {
                    const filtered = mailLogs.filter(log => {
                      const isResolved = log.status === 'RESOLVED' || log.delivery?.state === 'SUCCESS';
                      const isPending = (log.delivery?.state || 'PENDING') === 'PENDING' && log.status !== 'RESOLVED';
                      const isErr = log.delivery?.state === 'ERROR';

                      if (mailFilter === 'pending' && !isPending) return false;
                      if (mailFilter === 'resolved' && !isResolved) return false;
                      if (mailFilter === 'error' && !isErr) return false;

                      if (mailSearchQuery) {
                        const q = mailSearchQuery.toLowerCase();
                        const rec = (Array.isArray(log.to) ? log.to.join(', ') : log.to || '').toLowerCase();
                        const subj = (log.message?.subject || '').toLowerCase();
                        const txt = (log.message?.text || '').toLowerCase();
                        return rec.includes(q) || subj.includes(q) || txt.includes(q);
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="px-8 py-16 text-center text-slate-400 font-bold brand-heading uppercase tracking-widest text-xs">
                            No emails matching current criteria
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map(log => {
                      const recipientStr = Array.isArray(log.to) ? log.to.join(', ') : log.to || 'Unknown';
                      const isResolved = log.status === 'RESOLVED' || log.delivery?.state === 'SUCCESS';
                      const isPending = (log.delivery?.state || 'PENDING') === 'PENDING' && log.status !== 'RESOLVED';
                      const isErr = log.delivery?.state === 'ERROR';

                      const mailtoUrl = `mailto:${encodeURIComponent(recipientStr)}?subject=${encodeURIComponent(`Re: ${log.message?.subject || 'free@last Hub Query'}`)}&body=${encodeURIComponent(`Dear Member,\n\nIn response to your query regarding "${log.message?.subject || 'Community Hub'}":\n\n[Type your response message here]\n\nWarm regards,\nfree@last Nechells Team`)}`;

                      return (
                        <tr key={log.id} className={`hover:bg-slate-50/70 transition-colors ${isPending ? 'bg-amber-50/15' : ''}`}>
                          <td className="px-6 py-5">
                            <p className="text-brand-dark-blue font-bold text-xs">{recipientStr}</p>
                            {log.replyTo && <p className="text-[10px] text-slate-400">Reply-to: {log.replyTo}</p>}
                          </td>
                          <td className="px-6 py-5 max-w-sm">
                            <p className="text-brand-dark-blue font-bold text-xs truncate">{log.message?.subject || 'No Subject'}</p>
                            <p className="text-slate-500 text-[11px] line-clamp-1 italic mt-0.5 font-light">
                              {log.message?.text || (log.message?.html ? log.message.html.replace(/<[^>]+>/g, '') : '') || 'No text snippet'}
                            </p>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`px-3 py-1 rounded-full text-[9.5px] font-bold uppercase tracking-widest ${
                              isResolved ? 'bg-emerald-100 text-emerald-700' :
                              isErr ? 'bg-red-100 text-red-600' :
                              'bg-amber-100 text-amber-800 animate-pulse'
                            }`}>
                              {isResolved ? (log.status === 'RESOLVED' ? 'RESOLVED' : 'DELIVERED') : isErr ? 'ERROR' : 'PENDING ACTION'}
                            </span>
                            {log.resolvedBy && (
                              <p className="text-[9px] text-slate-400 mt-1">by {log.resolvedBy}</p>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-slate-500 text-[10px] font-medium">
                              {log.delivery?.endTime ? new Date(log.delivery.endTime.toDate ? log.delivery.endTime.toDate() : log.delivery.endTime).toLocaleString() : 'Logged in hub'}
                            </p>
                            {log.delivery?.error && (
                              <p className="text-red-500 text-[9.5px] font-medium truncate max-w-[140px]">{log.delivery.error}</p>
                            )}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* View / Respond Modal Button */}
                              <button
                                onClick={() => setSelectedMailLog(log)}
                                className="px-3 py-1.5 bg-brand-dark-blue text-white rounded-lg text-[10px] font-bold uppercase tracking-wider brand-heading hover:bg-brand-orange transition-all"
                              >
                                View & Reply
                              </button>

                              {/* Desktop Mail Client Shortcut */}
                              <a
                                href={mailtoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                                title="Open in Desktop Email App (Outlook / Mail)"
                              >
                                <Icons.Mail className="w-3.5 h-3.5" />
                              </a>

                              {/* Quick Mark Resolved */}
                              {!isResolved && (
                                <button
                                  onClick={() => handleMarkMailResolved(log.id)}
                                  className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-[9.5px] font-bold uppercase tracking-wider transition-all"
                                  title="Mark as Handled / Resolved"
                                >
                                  ✓ Resolve
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteMailLog(log.id)}
                                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                title="Delete Log"
                              >
                                <Icons.Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Help Banner */}
          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-lg border border-slate-800">
            <h3 className="text-brand-orange font-bold text-lg flex items-center gap-2 mb-2 brand-heading uppercase">
              <Icons.Shield className="w-5 h-5" />
              Email & Notification Guidance for free@last Staff
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed font-light">
              System emails generated by hub features (such as urgent wellbeing alerts, registration notices, and partner inquiries) enter this queue.
              You can click <strong>"View & Reply"</strong> on any entry to compose a direct reply email right from this dashboard, click the email icon to launch your computer's mail application (Outlook/Gmail), or click <strong>"Mark as Handled"</strong> to update the status to Resolved.
            </p>
          </div>

          {/* Selected Mail Inspector & Reply Modal */}
          {selectedMailLog && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-2xl w-full p-8 relative overflow-hidden max-h-[90vh] flex flex-col">
                <button
                  onClick={() => setSelectedMailLog(null)}
                  className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                >
                  ✕
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    selectedMailLog.status === 'RESOLVED' || selectedMailLog.delivery?.state === 'SUCCESS'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedMailLog.status === 'RESOLVED' ? 'RESOLVED' : selectedMailLog.delivery?.state || 'PENDING ACTION'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {selectedMailLog.delivery?.endTime ? new Date(selectedMailLog.delivery.endTime.toDate ? selectedMailLog.delivery.endTime.toDate() : selectedMailLog.delivery.endTime).toLocaleString() : ''}
                  </span>
                </div>

                <h3 className="text-2xl font-bold brand-heading text-brand-dark-blue mb-1">
                  {selectedMailLog.message?.subject || 'Email Communication'}
                </h3>
                <p className="text-xs text-slate-500 font-semibold mb-6">
                  To: <span className="text-brand-orange font-bold">{Array.isArray(selectedMailLog.to) ? selectedMailLog.to.join(', ') : selectedMailLog.to}</span>
                </p>

                {/* Email Content Snippet */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 overflow-y-auto max-h-48 text-sm text-slate-700 leading-relaxed font-light mb-6">
                  {selectedMailLog.message?.text ? (
                    <p className="whitespace-pre-wrap">{selectedMailLog.message.text}</p>
                  ) : selectedMailLog.message?.html ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedMailLog.message.html }} />
                  ) : (
                    <p className="italic text-slate-400">No message content available</p>
                  )}
                </div>

                {/* Admin Response Composer */}
                <div className="bg-brand-dark-blue/5 p-6 rounded-2xl border border-brand-dark-blue/10 flex-grow">
                  <label className="block text-xs font-bold uppercase tracking-widest text-brand-dark-blue mb-2 brand-heading flex items-center gap-2">
                    <Icons.Send className="w-4 h-4 text-brand-orange" />
                    Reply to {Array.isArray(selectedMailLog.to) ? selectedMailLog.to[0] : selectedMailLog.to}
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Write your email response here... (This will dispatch a reply and update status to Resolved)"
                    value={adminMailReplyMap[selectedMailLog.id] || ''}
                    onChange={e => setAdminMailReplyMap({ ...adminMailReplyMap, [selectedMailLog.id]: e.target.value })}
                    className="w-full p-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-brand-orange leading-relaxed resize-none mb-4"
                  ></textarea>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <a
                      href={`mailto:${encodeURIComponent(Array.isArray(selectedMailLog.to) ? selectedMailLog.to[0] : selectedMailLog.to)}?subject=${encodeURIComponent(`Re: ${selectedMailLog.message?.subject || 'free@last Hub'}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold brand-heading uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <Icons.Mail className="w-3.5 h-3.5" />
                      <span>Open Outlook/Email App</span>
                    </a>

                    <div className="flex items-center gap-2">
                      {selectedMailLog.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleMarkMailResolved(selectedMailLog.id)}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold brand-heading uppercase tracking-wider transition-all"
                        >
                          ✓ Mark Resolved
                        </button>
                      )}
                      <button
                        onClick={() => handleSendMailResponse(selectedMailLog)}
                        disabled={isSendingMailResponseId === selectedMailLog.id || !adminMailReplyMap[selectedMailLog.id]?.trim()}
                        style={{ backgroundColor: COLORS.secondary }}
                        className="px-6 py-2.5 text-white rounded-xl text-xs font-bold brand-heading uppercase tracking-wider hover:bg-brand-orange transition-all shadow-md flex items-center gap-2 disabled:opacity-40"
                      >
                        {isSendingMailResponseId === selectedMailLog.id ? (
                          <span>Sending...</span>
                        ) : (
                          <>
                            <Icons.Send className="w-3.5 h-3.5" />
                            <span>Send Reply Email</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeAdminTab === 'warnings' && (
        <div className="animate-fadeIn">
          <div className="mb-12">
            <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-tight">System Warnings & Alerts</h2>
            <p className="text-gray-500 font-light mt-1">Real-time auditing of registration blocks, postcode exceptions, and confirmed dietary/allergy booking conflicts.</p>
          </div>

          {warnings.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-100 rounded-[2.5rem] p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <Icons.Check className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-emerald-900 brand-heading uppercase">All Clear!</h3>
              <p className="text-emerald-700 font-light text-sm max-w-md mx-auto">No security violations, postcode exceptions, or active dietary booking conflicts have been logged.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {warnings.map((warn: any) => {
                const isDiet = warn.type === 'dietary_conflict_confirmed';
                const isBlocked = warn.type === 'member_registration_blocked';
                
                return (
                  <div 
                    key={warn.id}
                    className={`bg-white border-2 rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between gap-6 ${
                      isDiet ? 'border-amber-100' : isBlocked ? 'border-rose-100' : 'border-slate-100'
                    }`}
                  >
                    <div className="flex items-start gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                        isDiet ? 'bg-amber-50 text-amber-600' : isBlocked ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'
                      }`}>
                        {isDiet ? (
                          <Icons.AlertTriangle className="h-7 w-7" />
                        ) : (
                          <Icons.Shield className="h-7 w-7" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full ${
                            isDiet ? 'bg-amber-100 text-amber-800' : isBlocked ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {isDiet ? 'Dietary Override' : 'Registration Stopped'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {warn.timestamp ? new Date(warn.timestamp).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-slate-800 brand-heading uppercase tracking-tight">
                          {warn.title}
                        </h4>
                        <p className="text-slate-600 font-light text-sm max-w-2xl">
                          {warn.message}
                        </p>
                        
                        {warn.details && (
                          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mt-4 text-xs font-mono text-slate-600 space-y-1">
                            {warn.details.address && <p><strong>Address:</strong> {warn.details.address}</p>}
                            {warn.details.postcode && <p><strong>Postcode:</strong> {warn.details.postcode}</p>}
                            {warn.details.foodChoice && <p><strong>Food Chosen:</strong> {warn.details.foodChoice}</p>}
                            {warn.details.sessionTitle && <p><strong>Activity:</strong> {warn.details.sessionTitle}</p>}
                            {warn.details.bookerName && <p><strong>Booked By:</strong> {warn.details.bookerName}</p>}
                            {warn.details.bookerMobile && <p><strong>Contact Mobile:</strong> {warn.details.bookerMobile}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex md:flex-col justify-end items-end shrink-0 pt-4 md:pt-0">
                      <button
                        onClick={async () => {
                          if (confirm("Are you sure you want to dismiss this warning?")) {
                            try {
                              await deleteDoc(doc(db, 'warnings', warn.id));
                            } catch (err) {
                              console.error("Failed to delete warning:", err);
                            }
                          }
                        }}
                        className="px-6 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all uppercase brand-heading tracking-wider"
                      >
                        Dismiss Alert
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeAdminTab === 'newsletter' && (
        <div className="animate-fadeIn">
          <AdminNewsletterManager />
        </div>
      )}

      {activeAdminTab === 'needs' && (
        <div className="animate-fadeIn">
          <AdminNeedsManager />
        </div>
      )}
    </div>
  );
};
