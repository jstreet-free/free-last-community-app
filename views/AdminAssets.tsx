
import React, { useState } from 'react';
import { Icons, COLORS } from '../constants';
import { Announcement, Activity as ActivityType, Partner, ImpactStory, Inquiry, Booking, User, UserStatus, GalleryAlbum, TeamLog, MailLog } from '../types';

import { db } from '../services/firebase';
import { doc, setDoc, deleteDoc, collection, addDoc, updateDoc } from 'firebase/firestore';

interface AdminAssetsProps {
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
  galleryAlbums: GalleryAlbum[];
  mailLogs?: MailLog[];
}

export const AdminAssets: React.FC<AdminAssetsProps> = ({ 
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
  galleryAlbums,
  mailLogs = [],
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'images' | 'updates' | 'activities' | 'partners' | 'impact' | 'inquiries' | 'bookings' | 'users' | 'rally' | 'archive' | 'mail'>(() => {
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
  const [selectedUserDetail, setSelectedUserDetail] = useState<User | null>(null);

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

  const handleUpdateInquiryStatus = async (id: string, status: 'new' | 'read' | 'contacted') => {
    try {
      await updateDoc(doc(db, 'inquiries', id), { status });
    } catch (error) {
      console.error("Error updating inquiry status:", error);
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

  const handleUpdateUserStatus = async (userId: string, newStatus: UserStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const filteredUsers = users.filter(u => {
    const q = userSearchQuery.toLowerCase();
    if (!q) return true;
    
    const basic = (u.name || '').toLowerCase().includes(q) || 
                 (u.email || '').toLowerCase().includes(q) || 
                 (u.department || '').toLowerCase().includes(q) || 
                 (u.role || '').toLowerCase().includes(q);
    
    if (basic) return true;

    if (u.profile) {
      if (u.profile.registrationType === 'family') {
        return u.profile.children?.some(c => 
          c.name.toLowerCase().includes(q) || 
          c.dietaryAllergies.toLowerCase().includes(q) || 
          c.medicalConditions.toLowerCase().includes(q)
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
          { id: 'updates', label: 'Centre Updates', icon: <Icons.Megaphone /> },
          { id: 'partners', label: 'Partner Network', icon: <Icons.Briefcase /> },
          { id: 'impact', label: 'Collective Impact', icon: <Icons.Play /> },
          { id: 'inquiries', label: 'Inquiries', icon: <Icons.Heart /> },
          { id: 'rally', label: 'Impact Rally', icon: <Icons.Shield /> },
          { id: 'archive', label: 'Photo Archive', icon: <Icons.Camera /> },
          { id: 'users', label: 'User Hub', icon: <Icons.User /> },
          { id: 'mail', label: 'Mail Monitor', icon: <Icons.Megaphone /> },
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
                  const headers = ["Name", "Role", "Email", "Department", "Status", "Allergies", "Medical", "Consent"];
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
                    
                    return [
                      u.name || "Anonymous",
                      u.role,
                      u.email,
                      u.department || "N/A",
                      u.status || "N/A",
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

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-6 text-[10px] font-black brand-heading uppercase tracking-[0.2em] text-slate-400">Name / Dept</th>
                  <th className="p-6 text-[10px] font-black brand-heading uppercase tracking-[0.2em] text-slate-400">Email / Role</th>
                  <th className="p-6 text-[10px] font-black brand-heading uppercase tracking-[0.2em] text-slate-400">Status / Consent</th>
                  <th className="p-6 text-[10px] font-black brand-heading uppercase tracking-[0.2em] text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-20 text-center text-slate-400 font-bold brand-heading uppercase text-sm">No matching users found</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-50 hover:bg-slate-50/50 transition-colors group">
                      <td className="p-6">
                        <div className="font-bold text-brand-dark-blue brand-heading">{user.name || 'Anonymous'}</div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{user.department || 'N/A'}</div>
                      </td>
                      <td className="p-6">
                        <div className="text-xs font-medium text-slate-600">{user.email}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user.role}</div>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider w-fit ${
                            user.status === 'approved' ? 'bg-green-100 text-green-600' :
                            user.status === 'rejected' ? 'bg-red-100 text-red-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                            {user.status || 'pending'}
                          </span>
                          {user.profile && (
                            <span className={`text-[8px] font-bold uppercase tracking-widest p-1 rounded ${user.profile.dataConsent ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                              {user.profile.dataConsent ? 'Data Authorized' : 'NO CONSENT'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => setSelectedUserDetail(user)}
                            className="px-4 py-2 bg-brand-light-blue text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-sm"
                          >
                            View Details
                          </button>
                          {user.role === 'team' && user.status !== 'approved' && (
                            <button 
                              onClick={() => handleUpdateUserStatus(user.id, 'approved')}
                              className="px-4 py-2 bg-green-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-sm"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeAdminTab === 'bookings' && (
        <div className="animate-fadeIn">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-tight">Session Registrations</h2>
              <p className="text-gray-500 font-light mt-1">Live log of all upcoming and past session bookings.</p>
            </div>
            <button 
              onClick={handleDownloadBookingsCSV}
              style={{ backgroundColor: COLORS.secondary }}
              className="px-8 py-3 text-white rounded-xl font-bold text-xs brand-heading uppercase tracking-widest transition-all shadow-lg hover:brightness-110 active:scale-95 flex items-center gap-2"
            >
              <Icons.Camera /> Download CSV
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold brand-heading uppercase tracking-widest text-xs">No registrations found</td>
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
          <div className="mb-12">
            <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-tight">User Inquiries</h2>
            <p className="text-gray-500 font-light mt-1">Review "Get Involved" requests from the homepage.</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {inquiries.length === 0 ? (
              <div className="bg-slate-50 rounded-[2rem] p-16 text-center border-2 border-dashed border-slate-200">
                <Icons.Heart className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-400 font-bold brand-heading uppercase tracking-widest text-sm">No inquiries yet</p>
              </div>
            ) : (
              inquiries.map((inquiry) => (
                <div key={inquiry.id} className={`p-8 rounded-[2rem] border transition-all ${inquiry.status === 'new' ? 'bg-brand-orange/5 border-brand-orange/20 shadow-sm' : 'bg-white border-slate-100 hover:shadow-md'}`}>
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest brand-heading ${
                          inquiry.status === 'new' ? 'bg-brand-orange text-white' : 
                          inquiry.status === 'read' ? 'bg-slate-100 text-slate-400' : 
                          'bg-green-500 text-white'
                        }`}>
                          {inquiry.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold brand-heading uppercase">
                          {inquiry.timestamp?.toDate ? inquiry.timestamp.toDate().toLocaleString() : 'Recent'}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold brand-heading text-brand-dark-blue mb-2">{inquiry.name}</h3>
                      <p className="text-brand-orange font-bold text-sm mb-4">{inquiry.mobile}</p>
                      <div className="bg-slate-50 p-6 rounded-2xl italic text-slate-600 font-light leading-relaxed">
                        "{inquiry.message}"
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      {inquiry.status === 'new' && (
                        <button 
                          onClick={() => handleUpdateInquiryStatus(inquiry.id, 'read')}
                          className="w-full px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-bold text-[10px] brand-heading uppercase tracking-widest hover:border-brand-orange hover:text-brand-orange transition-all"
                        >
                          Mark as Read
                        </button>
                      )}
                      {inquiry.status !== 'contacted' && (
                        <button 
                          onClick={() => handleUpdateInquiryStatus(inquiry.id, 'contacted')}
                          className="w-full px-6 py-3 bg-green-500 text-white rounded-xl font-bold text-[10px] brand-heading uppercase tracking-widest hover:brightness-110 transition-all shadow-md"
                        >
                          Mark Contacted
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteInquiry(inquiry.id)}
                        className={`w-full px-6 py-3 rounded-xl font-bold text-[10px] brand-heading uppercase tracking-widest transition-all ${
                          deletingId === inquiry.id 
                            ? 'bg-red-600 text-white animate-pulse' 
                            : 'bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                      >
                        {deletingId === inquiry.id ? 'Confirm?' : 'Delete Record'}
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
                            let occ = new Date(act.date);
                            occ.setHours(0,0,0,0);
                            while (occ < today) occ.setDate(occ.getDate() + 7);
                            return occ.toLocaleDateString();
                          })()} @ {act.time}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 brand-heading uppercase">
                          {new Date(act.date).toLocaleDateString()} @ {act.time}
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
                            let occ = new Date(act.date);
                            occ.setHours(0,0,0,0);
                            while (occ < today) occ.setDate(occ.getDate() + 7);
                            const effectiveDate = occ.toISOString().split('T')[0];
                            
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

              {!selectedUserDetail.profile && (
                <div className="bg-slate-50 p-12 rounded-[2rem] text-center">
                  <p className="text-slate-400 font-bold brand-heading uppercase text-sm tracking-widest">No registration profile found yet</p>
                </div>
              )}

              {selectedUserDetail.profile && (
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
            </div>
          </div>
        </div>
      )}
      {activeAdminTab === 'mail' && (
        <div className="animate-fadeIn">
          <div className="mb-12">
            <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-tight">Mail Delivery Monitor</h2>
            <p className="text-gray-500 font-light mt-1">Status of system-triggered emails (Bookings, Inquiries, etc).</p>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Recipient</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Subject</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Status</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Last Update</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Details/Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {mailLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold brand-heading uppercase tracking-widest text-xs">No mail logs found</td>
                    </tr>
                  ) : (
                    mailLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <p className="text-slate-600 font-bold text-xs">{Array.isArray(log.to) ? log.to.join(', ') : log.to}</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-brand-dark-blue font-bold text-xs">{log.message.subject}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            log.delivery?.state === 'SUCCESS' ? 'bg-green-100 text-green-600' :
                            log.delivery?.state === 'ERROR' ? 'bg-red-100 text-red-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                            {log.delivery?.state || 'PENDING'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-slate-400 text-[10px] font-medium">
                            {log.delivery?.endTime ? new Date(log.delivery.endTime.toDate ? log.delivery.endTime.toDate() : log.delivery.endTime).toLocaleString() : 'Waiting...'}
                          </p>
                        </td>
                        <td className="px-8 py-6">
                          {log.delivery?.error ? (
                            <p className="text-red-500 text-[10px] font-medium max-w-xs break-words">{log.delivery.error}</p>
                          ) : (
                            <p className="text-slate-400 text-[10px] italic">No errors reported</p>
                          )}
                          {log.delivery?.info?.response && (
                            <p className="text-slate-500 text-[9px] mt-1">{log.delivery.info.response}</p>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-8 bg-blue-50 p-8 rounded-3xl border border-blue-100">
            <h3 className="text-blue-900 font-bold flex items-center gap-2 mb-2">
              <Icons.Shield className="w-5 h-5" />
              Developer Guidance for info@freeatlast.co.uk
            </h3>
            <p className="text-blue-700 text-sm leading-relaxed">
              If status is <strong>PENDING</strong> for more than 5 minutes, the Firebase extension might be missing SMTP credentials in the console. 
              If status is <strong>ERROR</strong>, check the "Details/Errors" column above for specific mail server reject messages (e.g. invalid password or unauthorized IP).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
