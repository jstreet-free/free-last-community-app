
export type UserRole = 'member' | 'team' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface ChildProfile {
  name: string;
  dob: string;
  age: number;
  address?: string; // if they don't live with person completing form
  ownMobile?: string;
  ownEmail?: string;
  schoolCollege: string;
  dietaryAllergies: string;
  medicalConditions: string;
  medication: string;
  canSwim: boolean;
  swimDistance: string;
  medicalConsent: boolean; // emergency services permission
  mediaConsent: boolean; // photo/video consent
  collectionPermissions: string[]; // up to 5 names
}

export interface MemberProfile {
  registrationType: 'family' | 'teenager';
  familyName?: string; // for family
  address: string;
  parentEmail: string;
  parentMobile: string;
  livingWith: string;
  
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
  flickrAlbumUrl?: string;
  status: 'upcoming' | 'past';
  imageUrl?: string;
}

export interface TeamLog {
  id: string;
  teamMemberId: string;
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
  date: string;
  emotion: string;
  impactText: string;
  aiResponse?: string;
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

export interface Inquiry {
  id: string;
  name: string;
  mobile: string;
  message: string;
  type: string;
  timestamp: any;
  status: 'new' | 'read' | 'contacted';
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
}
