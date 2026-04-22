
import React from 'react';
import { Activity, Announcement, Partner, ImpactStory } from './types';

export const COLORS = {
  green: '#85c441',
  orange: '#f47920',
  lightBlue: '#00aeef',
  darkBlue: '#2b337e',
  yellow: '#ffd600',
  primary: '#f47920', // Mapping primary to brand orange
  secondary: '#2b337e', // Mapping secondary to brand dark blue
};

export const IMAGES = {
  YOUTH_HOODIES: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=80",
  MUDDY_ADVENTURE: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1600&q=80",
  SURFING_BEACH: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1600&q=80",
  FIRE_FIGHTERS: "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?auto=format&fit=crop&w=1600&q=80",
  HENNA_ART: "https://images.unsplash.com/photo-1544928147-7972fc03f373?auto=format&fit=crop&w=800&q=80",
  PLAYGROUND: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=1600&q=80",
  CAMPFIRE: "https://images.unsplash.com/photo-1496307653780-42ee777d4833?auto=format&fit=crop&w=800&q=80",
  GALA_AWARDS: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1600&q=80"
};

export const SAMPLE_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'New Community Hub Opening Times',
    content: 'We are excited to announce that from next week, our Hub will be open until 8 PM on weekdays to support more community evening activities!',
    date: '2024-05-15',
    author: 'Management Team',
    category: 'Update'
  },
  {
    id: '2',
    title: 'Annual Summer Fair Announced',
    content: 'Save the date! Our annual Nechells Summer Fair is returning on July 20th. Expect live music, food stalls, and games for all the family.',
    date: '2024-05-10',
    author: 'Events Committee',
    category: 'Event'
  }
];

export const SAMPLE_PARTNERS: Partner[] = [
  { 
    id: 'p1', 
    name: 'Deloitte', 
    logo: 'https://images.unsplash.com/photo-1620288627223-53302f4e8c74?auto=format&fit=crop&w=400&q=80', 
    description: 'volunteering for activities, ongoing fundraising, governance support and sharing influence',
    details: 'Deloitte has been a cornerstone partner for the Nechells Hub, providing professional expertise to our governance board and direct volunteer support for our weekly youth sessions. Their commitment extends beyond financial aid, embedding their team within our community to share influence and advocate for Nechells youth.',
    website: 'https://www2.deloitte.com/uk/en.html',
    stats: [
      { label: 'Volunteers', value: '45+' },
      { label: 'Fundraising', value: '£12k+' },
      { label: 'Board Members', value: '2' }
    ]
  },
  { 
    id: 'p2', 
    name: 'Booghe Toys', 
    logo: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=400&q=80', 
    description: 'new experiences, sharing influence, product reviews',
    details: 'Booghe Toys brings the magic of play to our children. Through their partnership, we provide brand new experiences including technology workshops and toy review panels, giving our young people a voice in the products they love.',
    website: 'https://www.booghe.co.uk/',
    stats: [
      { label: 'Toys Donated', value: '500+' },
      { label: 'Workshops', value: '12' },
      { label: 'Young Reviewers', value: '30' }
    ]
  },
  { 
    id: 'p3', 
    name: 'Sunrise Networks', 
    logo: 'https://images.unsplash.com/photo-1558444479-c8a51e9b2750?auto=format&fit=crop&w=400&q=80', 
    description: '20+ businesses providing long term relational support, raising funds, pro-bono work and introductions',
    details: 'Sunrise Networks is a powerful collective of local businesses dedicated to Nechells. They provide a network of support that bridges the gap between the corporate world and our community, offering everything from legal advice to direct introductions for job seekers.',
    website: 'https://sunrisenetworks.co.uk/',
    stats: [
      { label: 'Businesses', value: '22' },
      { label: 'Pro-Bono Hours', value: '200+' },
      { label: 'Job Placements', value: '15' }
    ]
  },
  { 
    id: 'p4', 
    name: 'Gowlings', 
    logo: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80', 
    description: 'pro-bono support, volunteering, sharing influence',
    details: 'Gowlings provides critical legal support and corporate volunteering. Their team regularly visits the hub to mentor our teenagers on career paths in law and professional services, while their influence helps us secure and protect our community assets.',
    website: 'https://gowlingwlg.com/',
    stats: [
      { label: 'Legal Support', value: '£25k' },
      { label: 'Mentors', value: '10' },
      { label: 'Years Partnered', value: '3' }
    ]
  },
  { 
    id: 'p5', 
    name: 'Additional Partner 1', 
    logo: 'https://picsum.photos/seed/p5/400/400', 
    description: 'Community outreach and local support initiatives.',
    details: 'This partner focuses on hyper-local outreach, ensuring that the hardest-to-reach families in Nechells are connected with our services.',
    website: '#',
    stats: [
      { label: 'Families Helped', value: '50' },
      { label: 'Outreach Events', value: '5' }
    ]
  },
  { 
    id: 'p6', 
    name: 'Additional Partner 2', 
    logo: 'https://picsum.photos/seed/p6/400/400', 
    description: 'Sports equipment and active lifestyle coaching.',
    details: 'Providing the tools and training necessary to keep our youth active and healthy through organized sports and individual coaching.',
    website: '#',
    stats: [
      { label: 'Equipment Value', value: '£5k' },
      { label: 'Coaching Hours', value: '150' }
    ]
  },
  { 
    id: 'p7', 
    name: 'Additional Partner 3', 
    logo: 'https://picsum.photos/seed/p7/400/400', 
    description: 'Technology grants and digital skills workshops.',
    details: 'Closing the digital divide by providing laptops and training to students who lack access to technology at home.',
    website: '#',
    stats: [
      { label: 'Laptops Donated', value: '25' },
      { label: 'Digital Literacy', value: '95%' }
    ]
  },
  { 
    id: 'p8', 
    name: 'Additional Partner 4', 
    logo: 'https://picsum.photos/seed/p8/400/400', 
    description: 'Mental health advocacy and wellbeing resources.',
    details: 'Ensuring our members have access to the counseling and emotional support they need to navigate life challenges.',
    website: '#',
    stats: [
      { label: 'Counseling Sessions', value: '100+' },
      { label: 'Wellbeing Toolkits', value: '200' }
    ]
  },
];

export const SAMPLE_IMPACT_STORIES: ImpactStory[] = [
  {
    id: 's1',
    partnerName: 'Local Business Network',
    title: 'Celebrating Excellence: Nechells Gala',
    content: 'Our gala evening brought together partners and youth to celebrate achievements. Over 50 awards were presented for leadership and community spirit.',
    image: IMAGES.GALA_AWARDS
  },
  {
    id: 's2',
    partnerName: 'West Midlands Fire Service',
    title: 'Future Heroes: Skills Training',
    content: 'Young people are gaining practical life-saving skills and exploring careers in the emergency services.',
    image: IMAGES.FIRE_FIGHTERS
  }
];

export const SAMPLE_ACTIVITIES: Activity[] = [
  {
    id: '1',
    title: 'Youth Creative Hub',
    description: 'Express yourself through art, design, and henna sessions in a supportive environment.',
    date: '2024-05-20',
    time: '16:00',
    location: 'The Hub',
    capacity: 25,
    bookedCount: 18,
    category: 'youth',
    status: 'upcoming'
  },
  {
    id: '2',
    title: 'Outdoor Adventure Club',
    description: 'Engaging in canoeing, hiking, and rock climbing to build teamwork and confidence.',
    date: '2024-05-21',
    time: '09:00',
    location: 'Main Reception',
    capacity: 15,
    bookedCount: 12,
    category: 'sports',
    status: 'upcoming'
  },
  {
    id: '3',
    title: 'Public Services Path',
    description: 'Specialized training sessions with local partners like the Fire Service to build career-ready skills.',
    date: '2024-05-22',
    time: '10:30',
    location: 'Training Suite',
    capacity: 10,
    bookedCount: 4,
    category: 'education',
    status: 'upcoming'
  },
  {
    id: '4',
    title: 'Community Beach Campfire',
    description: 'A time for reflection, connection, and conversation over a warm cuppa.',
    date: '2024-05-23',
    time: '18:30',
    location: 'Beach Basecamp',
    capacity: 40,
    bookedCount: 32,
    category: 'community',
    status: 'upcoming'
  },
  {
    id: 'p1',
    title: 'Easter Youth Arts Festival',
    description: 'A celebration of creativity featuring works from our talented young members.',
    date: '2024-04-10',
    time: '14:00',
    location: 'The Hub',
    capacity: 100,
    bookedCount: 85,
    category: 'youth',
    flickrAlbumUrl: 'https://flic.kr/s/aHBqjCQB31',
    status: 'past'
  },
  {
    id: 'p2',
    title: 'Spring Adventure Weekend',
    description: 'Our first major outdoor trip of the year to the Peak District.',
    date: '2024-03-15',
    time: '08:00',
    location: 'Peak District',
    capacity: 20,
    bookedCount: 20,
    category: 'sports',
    flickrAlbumUrl: 'https://www.flickr.com/photos/tags/adventure',
    status: 'past'
  }
];

export const Icons = {
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
  ),
  Clock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  Heart: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
  ),
  LogOut: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
  ),
  LogIn: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 5 12 10 7"/><line x1="15" x2="5" y1="12" y2="12"/></svg>
  ),
  Key: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3L15.5 7.5z"/></svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  Play: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
  ),
  Camera: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
  ),
  Megaphone: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 13v-2Z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
  ),
  Briefcase: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>
  ),
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
  Settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
  ),
  Activity: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  ),
  Phone: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
  ),
  Mail: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><rect width="20" height="16" x="2" y="4" rx="2"/></svg>
  ),
  MapPin: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
  ),
  Stethoscope: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2a.3.3 0 0 0-.2.3Z"/><path d="M10 2a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-4Z"/><path d="M8 10v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V10"/><path d="M12 12v5"/></svg>
  ),
  Logo: ({ className = "h-8", reversed = false }: { className?: string, reversed?: boolean }) => (
    <div className={`flex items-center font-bold tracking-tight text-3xl select-none leading-none ${className}`} style={{ fontFamily: "'Dosis', sans-serif" }}>
      <span style={{ color: reversed ? '#ffffff' : COLORS.secondary }}>free</span>
      <span style={{ color: COLORS.primary }}>@</span>
      <span style={{ color: reversed ? '#ffffff' : COLORS.secondary }}>last</span>
    </div>
  )
};
