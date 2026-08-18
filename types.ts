
export type UserRole = 'member' | 'team' | 'admin' | 'friend';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface FriendProfile {
  mobileNumber: string;
  businessName?: string;
}

export interface AuthorizedCollector {
  name: string;
  mobile: string;
}

export interface ChildProfile {
  name: string;
  dob: string;
  age: number;
  address?: string; // if they don't live with person completing form
  ownMobile?: string; // Secondary aged only
  ownEmail?: string;
  schoolCollege: string;
  dietaryAllergies: string;
  medicalConditions: string;
  medication: string;
  canSwim: boolean;
  swimDistance: string;
  medicalConsent: boolean; // emergency services permission
  mediaConsent: boolean; // photo/video consent
  collectionPermissions?: string[]; // legacy list of names
  collectionContacts?: AuthorizedCollector[]; // up to 3 authorized collectors with name and emergency contact mobile
  ethnicity?: string;
  religion?: string;
}

export interface MemberProfile {
  registrationType: 'family' | 'teenager' | 'friend';
  parentName: string;
  familyName?: string; // for family
  address: string;
  postcode?: string;
  isFriendSignup?: boolean;
  parentEmail: string;
  parentMobile: string;
  livingWith: string;
  ethnicity?: string;
  religion?: string;
  
  // For Teenager mode
  teenagerDetails?: {
    name: string;
    dob: string;
    age: number;
    ownMobile: string;
    ownEmail: string;
    schoolCollege: string;
    dietaryAllergies: string;
    medicalConditions: string;
    medication: string;
    canSwim: boolean;
    swimDistance: string;
    parentName?: string; // if under 18
    parentMobile?: string; // if under 18
    medicalConsent: boolean;
    mediaConsent: boolean;
    ethnicity?: string;
    religion?: string;
  };

  // For Family mode
  children?: ChildProfile[];
  
  dataConsent: boolean; // general GDPR
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  profileComplete?: boolean;
  profile?: MemberProfile;
  status?: UserStatus;
  department?: string;
  registeredAt?: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  bookedCount: number;
  category: 'youth' | 'community' | 'sports' | 'education';
  frequency?: 'once' | 'weekly';
  flickrAlbumUrl?: string;
  status: 'upcoming' | 'past';
  imageUrl?: string;
  includesFood?: boolean;
  foodOptions?: string;
}

export interface TeamLog {
  id: string;
  teamMemberId: string;
  teamMemberName: string;
  date: string;
  hours: number;
  sessionName: string;
  category: string;
  description: string;
  attendeesCount: number;
  outcome: string;
}

export interface MoodLog {
  id: string;
  memberId: string;
  memberName: string;
  memberPhone?: string;
  memberEmail?: string;
  date: string;
  emotion: string;
  impactText: string;
  aiResponse?: string;
  isUrgent?: boolean;
  staffResponse?: string;
  staffRespondedAt?: string;
  staffRespondedBy?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  category: 'News' | 'Update' | 'Event';
}

export interface Partner {
  id: string;
  name: string;
  logo: string;
  description: string;
  details?: string;
  website?: string;
  stats?: { label: string; value: string }[];
}

export interface ImpactStory {
  id: string;
  partnerName: string;
  title: string;
  content: string;
  image: string;
}

export interface InquiryReply {
  id?: string;
  sender: 'member' | 'admin';
  senderName: string;
  message: string;
  timestamp: string;
}

export interface Inquiry {
  id: string;
  name: string;
  email?: string;
  mobile: string;
  message: string;
  type: string;
  timestamp: any;
  status: 'new' | 'read' | 'contacted' | 'replied';
  targetEmail: string;
  userId?: string;
  reply?: string;
  repliedAt?: any;
  repliedBy?: string;
  replies?: InquiryReply[];
}

export interface MailLog {
  id: string;
  to: string | string[];
  message: {
    subject: string;
    text: string;
    html: string;
  };
  delivery?: {
    attempts: number;
    endTime: any;
    error: string | null;
    leaseExpireTime: any;
    startTime: any;
    state: 'SUCCESS' | 'ERROR' | 'PROCESSING' | 'PENDING';
    info?: {
      messageId: string;
      accepted: string[];
      rejected: string[];
      pending: string[];
      response: string;
    }
  };
  status?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  replyTo?: string;
}

export interface Booking {
  id: string;
  bookerName: string;
  participantName: string;
  bookerMobile: string;
  bookingDate: any;
  sessionTitle: string;
  sessionDate: string;
  sessionTime: string;
  sessionId: string;
  userId: string;
  attended?: boolean | null;
  status?: 'booked' | 'cancelled';
  foodChoice?: string;
  foodConflictConfirmed?: boolean;
  foodConflictWarningRaised?: boolean;
}

export interface GalleryAlbum {
  id: string;
  title: string;
  description: string;
  date: string;
  category: 'youth' | 'community' | 'sports' | 'education';
  flickrAlbumUrl: string;
  imageUrl?: string;
}

export interface CaseStudyRequest {
  id: string;
  title: string;
  prompt: string;
  date: string;
  isActive: boolean;
  creatorId: string;
}

export interface CaseStudy {
  id: string;
  requestId: string;
  requestTitle: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  content: string;
  date: string;
  status: 'approved' | 'pending';
  category?: string;
  aiSummary?: string;
  sentimentScore?: number;
}

export interface NewsletterSubscriber {
  id: string;
  name: string;
  email: string;
  subscribedAt: any;
}

export interface Newsletter {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  links?: { title: string; url: string }[];
  sentAt: any;
  recipientCount: number;
}

export interface FriendNeed {
  id: string;
  title: string;
  description: string;
  category: 'volunteers' | 'resources' | 'finance' | 'events' | 'sponsorship';
  date: string;
  sentStatus: 'draft' | 'sent';
  sentAt?: any;
}

export interface FriendOffer {
  id: string;
  friendName: string;
  friendEmail: string;
  friendMobile: string;
  businessName?: string;
  category: 'volunteering' | 'resources' | 'equipment' | 'sale-items' | 'money' | 'sponsorship' | 'other';
  description: string;
  date: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface YouTubeVideo {
  id: string;
  title: string;
  url: string;
  description?: string;
  addedAt: string;
}

export interface AdminWarning {
  id: string;
  type: 'member_registration_blocked' | 'food_allergy_conflict';
  title: string;
  message: string;
  personName: string;
  userEmail: string;
  details?: any;
  timestamp: string;
}


