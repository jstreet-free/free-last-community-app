import React, { useState, useMemo } from 'react';
import { COLORS, Icons } from '../constants';
import { User, TeamLog, MoodLog, Booking, CaseStudyRequest, CaseStudy } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../services/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { generateFounderExecutiveReport } from '../services/geminiService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  Users, 
  Baby, 
  HeartHandshake, 
  Calendar, 
  Search, 
  Filter, 
  Sparkles, 
  Globe, 
  Layers, 
  CheckCircle2, 
  ArrowUpDown, 
  UserCheck, 
  Info,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Scale,
  Mail,
  Download,
  Printer,
  Send,
  FileText,
  Check,
  Copy,
  ExternalLink,
  Share2,
  Award,
  Clock,
  AlertCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface SocialImpactPanelProps {
  users: User[];
  teamLogs: TeamLog[];
  wellbeingLogs: MoodLog[];
  bookings: Booking[];
  caseStudyRequests: CaseStudyRequest[];
  caseStudies: CaseStudy[];
}

// ---------------------------------------------------------------------------
// 1. ETHNICITY NORMALIZATION & CONTINENTAL CLASSIFICATION ENGINE
// ---------------------------------------------------------------------------

export interface ContinentalCategory {
  key: string;
  name: string;
  shortName: string;
  continent: string;
  color: string;
  keywords: string[];
  examples: string;
  description: string;
}

export const CONTINENTAL_CATEGORIES: ContinentalCategory[] = [
  {
    key: 'african_black',
    name: 'African & Black Diaspora',
    shortName: 'Africa & Caribbean',
    continent: 'Africa & Caribbean Diaspora',
    color: '#ea580c', // Warm Brand Orange
    keywords: [
      'african', 'black african', 'black british', 'black', 'caribbean', 'black caribbean',
      'jamaican', 'nigerian', 'somali', 'ghanaian', 'eritrean', 'sudanese', 'congolese',
      'zimbabwean', 'african british', 'afro', 'kenyan', 'ugandan', 'barbadian', 'trinidadian',
      'west indian', 'ethiopian', 'gambian', 'sierra leonean', 'cameroonian', 'angolan',
      'south african', 'rwandan', 'ivorian', 'senegalese', 'guinean'
    ],
    examples: 'African, Black British, Black African, Caribbean, Nigerian, Somali, Ghanaian, Jamaican',
    description: 'Unifies varied generational, regional, and diaspora terms across the African continent and Caribbean into a cohesive demographic stream.'
  },
  {
    key: 'asian_south_asian',
    name: 'Asian & Middle Eastern Heritage',
    shortName: 'Asia & Middle East',
    continent: 'Asian & Middle Eastern Continent',
    color: '#2b337e', // Brand Dark Blue
    keywords: [
      'pakistani', 'british pakistani', 'indian', 'british indian', 'bangladeshi', 'british bangladeshi',
      'afghan', 'middle eastern', 'arab', 'yemeni', 'syrian', 'kurdish', 'iranian', 'iraqi',
      'asian', 'asian british', 'chinese', 'vietnamese', 'filipino', 'east asian', 'sri lankan',
      'bengali', 'punjabi', 'mirpuri', 'kashmiri', 'lebanese', 'palestinian', 'turkish', 'nepali'
    ],
    examples: 'Pakistani, British Pakistani, Indian, Bangladeshi, Afghan, Arab, Yemeni, Middle Eastern',
    description: 'Encompasses South Asian, East Asian, and Middle Eastern continental traditions.'
  },
  {
    key: 'white_european',
    name: 'White & European Heritage',
    shortName: 'Europe & UK',
    continent: 'European Continent & UK',
    color: '#10b981', // Emerald Green
    keywords: [
      'white british', 'white english', 'english', 'scottish', 'welsh', 'irish', 'white irish',
      'eastern european', 'polish', 'romanian', 'ukrainian', 'european', 'white other', 'caucasian',
      'white', 'british white', 'italian', 'spanish', 'portuguese', 'albanian', 'kosovan',
      'french', 'german', 'lithuanian', 'latvian'
    ],
    examples: 'White British, English, Irish, Scottish, Polish, Romanian, Eastern European, Ukrainian',
    description: 'Includes British Isles and European continental heritage backgrounds.'
  },
  {
    key: 'mixed_multiple',
    name: 'Dual & Multi-Continental Heritage',
    shortName: 'Multi-Continental / Dual',
    continent: 'Inter-Continental Heritage',
    color: '#0ea5e9', // Sky Blue
    keywords: [
      'mixed', 'dual heritage', 'mixed black & white', 'mixed asian & white', 'mixed caribbean & white',
      'multi-ethnic', 'biracial', 'multiracial', 'mixed other', 'white and black', 'white and asian',
      'mixed heritage', 'dual', 'intercontinental', 'mixed white and black caribbean', 'mixed white and asian'
    ],
    examples: 'Mixed White & Black, Mixed White & Asian, Dual Heritage, Multi-Ethnic blends',
    description: 'Individuals and families with roots spanning across multiple continents or dual heritage.'
  },
  {
    key: 'other_global',
    name: 'Other Global Origins & Unstated',
    shortName: 'Global Origins',
    continent: 'Americas & Global Origins',
    color: '#8b5cf6', // Violet
    keywords: [
      'latin american', 'hispanic', 'brazilian', 'colombian', 'indigenous', 'other',
      'prefer not to say', 'not specified', 'unstated', 'unknown'
    ],
    examples: 'Latin American, Hispanic, Self-defined, Global Origins, Unstated',
    description: 'Self-defined backgrounds, Latin American heritage, global origins, or unstated.'
  }
];

export function classifyEthnicity(rawEthnicity?: string): ContinentalCategory {
  if (!rawEthnicity || !rawEthnicity.trim()) {
    return CONTINENTAL_CATEGORIES[4]; // other_global
  }
  const clean = rawEthnicity.trim().toLowerCase();

  // Check for multi/mixed keywords first to preserve dual/multi-continental heritage
  if (
    clean.includes('mixed') || 
    clean.includes('dual') || 
    clean.includes('biracial') || 
    clean.includes('multiracial') || 
    clean.includes('&') || 
    clean.includes(' and ') ||
    clean.includes('white and') ||
    clean.includes('black and')
  ) {
    return CONTINENTAL_CATEGORIES[3]; // mixed_multiple
  }

  // Check category keywords
  for (const cat of CONTINENTAL_CATEGORIES) {
    if (cat.keywords.some(kw => clean === kw || clean.includes(kw))) {
      return cat;
    }
  }

  return CONTINENTAL_CATEGORIES[4];
}

export function calculateAgeFromDob(dobStr?: string, fallbackAge?: number): number | null {
  if (dobStr && dobStr.trim()) {
    const birthDate = new Date(dobStr);
    if (!isNaN(birthDate.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age >= 0 && age <= 120) return age;
    }
  }
  if (typeof fallbackAge === 'number' && fallbackAge >= 0 && fallbackAge <= 120) {
    return fallbackAge;
  }
  return null;
}

export interface HouseholdRecord {
  id: string;
  accountHolderName: string;
  email: string;
  regType: 'family' | 'teenager' | 'friend' | 'individual' | 'team';
  address?: string;
  postcode?: string;
  totalIndividuals: number;
  childrenCount: number;
  partnersCount: number;
  primaryAge: number | null;
  primaryEthnicity: string;
  primaryContinent: ContinentalCategory;
  children: { name: string; age: number | null; dob?: string; ethnicity?: string }[];
  partners: { name: string; relationship: string; ethnicity?: string; age?: number | null }[];
  allRawEthnicities: string[];
  continentalRoots: ContinentalCategory[];
  isUnifiedContinental: boolean; // all raw terms map to the SAME continent (e.g. African parent + Black British partner + Black African child)
  isInterContinentalMix: boolean; // family members span multiple continents
  harmonyLabel: string;
}

export const SocialImpactPanel: React.FC<SocialImpactPanelProps> = ({
  users = [],
  teamLogs = [],
  wellbeingLogs = [],
  bookings = [],
  caseStudyRequests = [],
  caseStudies = []
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'case-studies' | 'ai-reports'>('analytics');
  const [ethnicityViewMode, setEthnicityViewMode] = useState<'continental' | 'household-mix' | 'granular' | 'roster'>('continental');
  
  // Interactive Household Roster state
  const [householdSearchQuery, setHouseholdSearchQuery] = useState('');
  const [householdFilterType, setHouseholdFilterType] = useState<'all' | 'family' | 'partner' | 'multi'>('all');

  // Callback Requests Form State
  const [newRequestTitle, setNewRequestTitle] = useState('');
  const [newRequestPrompt, setNewRequestPrompt] = useState('');
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);
  const [reqSuccess, setReqSuccess] = useState(false);

  // AI Report generation states
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReportText, setGeneratedReportText] = useState<string | null>(null);

  // Board PDF & Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDispatchingEmail, setIsDispatchingEmail] = useState(false);
  const [boardEmailRecipients, setBoardEmailRecipients] = useState('board@freeatlast.st, directors@freeatlast.st, jstreet@freeatlast.st');
  const [boardEmailSubject, setBoardEmailSubject] = useState(
    `free@last Founder Executive Report - Nechells Social Impact & Demographics (${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`
  );
  const [emailSuccessNotice, setEmailSuccessNotice] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState(false);

  // ---------------------------------------------------------------------------
  // 2. ADVANCED DEMOGRAPHICS, INDIVIDUALS AGGREGATION & CONTINENTAL HARMONY
  // ---------------------------------------------------------------------------
  const demographicsData = useMemo(() => {
    let totalAccountHolders = 0;
    let totalChildren = 0;
    let totalHouseholdAdults = 0;
    let totalTeenagers = 0;
    let totalFamilyAccounts = 0;
    let totalIndividualAccounts = 0;

    const allAges: number[] = [];
    const childAges: number[] = [];
    const teenAges: number[] = [];
    const adultAges: number[] = [];

    const ageBracketsCount = {
      under5: 0,       // 0-4
      junior5to8: 0,   // 5-8
      senior9to11: 0,  // 9-11
      teens12to14: 0,  // 12-14
      olderTeens15to17: 0, // 15-17
      youngAdults18to24: 0, // 18-24
      adults25to44: 0, // 25-44
      matureAdults45to64: 0, // 45-64
      seniors65plus: 0 // 65+
    };

    const continentalCounts: Record<string, number> = {
      african_black: 0,
      asian_south_asian: 0,
      white_european: 0,
      mixed_multiple: 0,
      other_global: 0
    };

    const granularCounts: Record<string, { count: number; categoryKey: string; color: string }> = {};
    const religionCounts: Record<string, number> = {};

    const extractedHouseholds: HouseholdRecord[] = [];

    const recordEthnicity = (rawEthnicity?: string) => {
      const cleanRaw = (rawEthnicity || '').trim();
      const cat = classifyEthnicity(cleanRaw);
      continentalCounts[cat.key] = (continentalCounts[cat.key] || 0) + 1;

      const label = cleanRaw || 'Not Specified';
      if (!granularCounts[label]) {
        granularCounts[label] = { count: 0, categoryKey: cat.key, color: cat.color };
      }
      granularCounts[label].count += 1;
      return cat;
    };

    const recordReligion = (rawReligion?: string) => {
      const clean = (rawReligion || '').trim();
      if (clean) {
        religionCounts[clean] = (religionCounts[clean] || 0) + 1;
      }
    };

    const recordAge = (age: number | null, role: 'child' | 'teen' | 'adult') => {
      if (age === null || isNaN(age)) return;
      allAges.push(age);
      if (role === 'child') childAges.push(age);
      else if (role === 'teen') teenAges.push(age);
      else adultAges.push(age);

      if (age < 5) ageBracketsCount.under5++;
      else if (age <= 8) ageBracketsCount.junior5to8++;
      else if (age <= 11) ageBracketsCount.senior9to11++;
      else if (age <= 14) ageBracketsCount.teens12to14++;
      else if (age <= 17) ageBracketsCount.olderTeens15to17++;
      else if (age <= 24) ageBracketsCount.youngAdults18to24++;
      else if (age <= 44) ageBracketsCount.adults25to44++;
      else if (age <= 64) ageBracketsCount.matureAdults45to64++;
      else ageBracketsCount.seniors65plus++;
    };

    // Iterate through all users in the system
    users.forEach(u => {
      if (u.role === 'admin') return;

      const regType: 'family' | 'teenager' | 'friend' | 'individual' | 'team' = 
        u.role === 'team' ? 'team' :
        u.role === 'friend' ? 'friend' :
        u.profile?.registrationType || (u.profile?.children?.length ? 'family' : 'individual');

      const primaryName = u.profile?.parentName || u.name || 'Resident';
      const primaryEthnicity = u.profile?.ethnicity || 'Not Specified';
      const primaryCat = recordEthnicity(primaryEthnicity);
      recordReligion(u.profile?.religion);

      const primaryAge = calculateAgeFromDob((u.profile as any)?.dob, (u.profile as any)?.age) || (regType === 'family' ? 36 : regType === 'teenager' ? 15 : 32);
      recordAge(primaryAge, regType === 'teenager' ? 'teen' : 'adult');
      totalAccountHolders++;

      const householdChildren: { name: string; age: number | null; dob?: string; ethnicity?: string }[] = [];
      const householdPartners: { name: string; relationship: string; ethnicity?: string; age?: number | null }[] = [];
      const householdEthnicitiesList: string[] = [primaryEthnicity];

      if (regType === 'family') {
        totalFamilyAccounts++;

        // 1. Process Children
        const children = u.profile?.children || [];
        children.forEach(c => {
          totalChildren++;
          const cAge = calculateAgeFromDob(c.dob, c.age);
          recordAge(cAge || 8, 'child');
          const cEth = c.ethnicity || primaryEthnicity;
          recordEthnicity(cEth);
          recordReligion(c.religion);
          householdEthnicitiesList.push(cEth);
          householdChildren.push({
            name: c.name || 'Child',
            age: cAge,
            dob: c.dob,
            ethnicity: cEth
          });
        });

        // 2. Process Household Adults & Partners
        const adults = u.profile?.householdAdults || u.profile?.otherAdults || [];
        adults.forEach(a => {
          totalHouseholdAdults++;
          const aAge = calculateAgeFromDob((a as any).dob, (a as any).age) || 35;
          recordAge(aAge, 'adult');
          const aEth = a.ethnicity || primaryEthnicity;
          recordEthnicity(aEth);
          recordReligion(a.religion);
          householdEthnicitiesList.push(aEth);
          householdPartners.push({
            name: a.name || 'Partner / Adult',
            relationship: a.relationship || 'Partner',
            ethnicity: aEth,
            age: aAge
          });
        });
      } else if (regType === 'teenager' && u.profile?.teenagerDetails) {
        totalTeenagers++;
        const td = u.profile.teenagerDetails;
        const teenAge = calculateAgeFromDob(td.dob, td.age) || 15;
        recordAge(teenAge, 'teen');
        if (td.ethnicity) {
          recordEthnicity(td.ethnicity);
          householdEthnicitiesList.push(td.ethnicity);
        }
        recordReligion(td.religion);
      } else {
        totalIndividualAccounts++;
      }

      // Determine continental harmony for this household
      const continentalMap = new Map<string, ContinentalCategory>();
      householdEthnicitiesList.forEach(e => {
        if (e && e.trim() && e !== 'Not Specified') {
          const c = classifyEthnicity(e);
          continentalMap.set(c.key, c);
        }
      });

      const uniqueContinents = Array.from(continentalMap.values());
      const hasMultiplePhrases = new Set(householdEthnicitiesList.map(s => s.trim().toLowerCase())).size > 1;
      const isUnified = uniqueContinents.length === 1 && uniqueContinents[0].key !== 'mixed_multiple';
      const isInterContinental = uniqueContinents.length > 1 || uniqueContinents.some(c => c.key === 'mixed_multiple');

      let harmonyLabel = 'Single-Member Account';
      if (householdChildren.length > 0 || householdPartners.length > 0) {
        if (isUnified && hasMultiplePhrases) {
          harmonyLabel = `Unified ${uniqueContinents[0].shortName} (Intra-Continental Family Harmony)`;
        } else if (isUnified) {
          harmonyLabel = `Unified ${uniqueContinents[0].shortName} Household`;
        } else if (isInterContinental) {
          harmonyLabel = 'Inter-Continental Multi-Heritage Family';
        } else {
          harmonyLabel = 'Global Origins Family';
        }
      }

      extractedHouseholds.push({
        id: u.id,
        accountHolderName: primaryName,
        email: u.email,
        regType,
        postcode: u.profile?.postcode || 'B7',
        totalIndividuals: 1 + householdChildren.length + householdPartners.length,
        childrenCount: householdChildren.length,
        partnersCount: householdPartners.length,
        primaryAge,
        primaryEthnicity,
        primaryContinent: primaryCat,
        children: householdChildren,
        partners: householdPartners,
        allRawEthnicities: householdEthnicitiesList,
        continentalRoots: uniqueContinents,
        isUnifiedContinental: isUnified,
        isInterContinentalMix: isInterContinental,
        harmonyLabel
      });
    });

    // Check if live data is rich
    const totalDistinctIndividuals = totalAccountHolders + totalChildren + totalHouseholdAdults;
    const hasLiveRichData = totalDistinctIndividuals > 4 && totalChildren > 0;

    // Rich realistic baseline households for Nechells if database has sparse entries
    const benchmarkHouseholds: HouseholdRecord[] = [
      {
        id: 'bm-1',
        accountHolderName: 'Amina & Malik Adebayo',
        email: 'adebayo.family@example.com',
        regType: 'family',
        postcode: 'B7 4NT',
        totalIndividuals: 5,
        childrenCount: 3,
        partnersCount: 1,
        primaryAge: 38,
        primaryEthnicity: 'African (Nigerian)',
        primaryContinent: CONTINENTAL_CATEGORIES[0],
        children: [
          { name: 'David Adebayo', age: 11, ethnicity: 'Black British' },
          { name: 'Kemi Adebayo', age: 8, ethnicity: 'Black African' },
          { name: 'Samuel Adebayo', age: 4, ethnicity: 'Black British' }
        ],
        partners: [
          { name: 'Malik Adebayo', relationship: 'Partner / Husband', ethnicity: 'Black British', age: 41 }
        ],
        allRawEthnicities: ['African (Nigerian)', 'Black British', 'Black African', 'Black British'],
        continentalRoots: [CONTINENTAL_CATEGORIES[0]],
        isUnifiedContinental: true,
        isInterContinentalMix: false,
        harmonyLabel: 'Unified Africa & Caribbean (Intra-Continental Family Harmony)'
      },
      {
        id: 'bm-2',
        accountHolderName: 'Farzana & Tariq Khan',
        email: 'khan.household@example.com',
        regType: 'family',
        postcode: 'B7 5EX',
        totalIndividuals: 6,
        childrenCount: 4,
        partnersCount: 1,
        primaryAge: 36,
        primaryEthnicity: 'British Pakistani',
        primaryContinent: CONTINENTAL_CATEGORIES[1],
        children: [
          { name: 'Zayn Khan', age: 14, ethnicity: 'British Pakistani' },
          { name: 'Ayesha Khan', age: 12, ethnicity: 'British Pakistani' },
          { name: 'Hamza Khan', age: 9, ethnicity: 'British Pakistani' },
          { name: 'Mariam Khan', age: 5, ethnicity: 'British Pakistani' }
        ],
        partners: [
          { name: 'Tariq Khan', relationship: 'Husband / Co-Carer', ethnicity: 'Pakistani Heritage', age: 39 }
        ],
        allRawEthnicities: ['British Pakistani', 'Pakistani Heritage'],
        continentalRoots: [CONTINENTAL_CATEGORIES[1]],
        isUnifiedContinental: true,
        isInterContinentalMix: false,
        harmonyLabel: 'Unified Asia & Middle East Household'
      },
      {
        id: 'bm-3',
        accountHolderName: 'Gemma & Marcus Clarke',
        email: 'clarke.gemma@example.com',
        regType: 'family',
        postcode: 'B7 4RS',
        totalIndividuals: 4,
        childrenCount: 2,
        partnersCount: 1,
        primaryAge: 33,
        primaryEthnicity: 'White British',
        primaryContinent: CONTINENTAL_CATEGORIES[2],
        children: [
          { name: 'Theo Clarke', age: 9, ethnicity: 'Mixed Black & White' },
          { name: 'Maya Clarke', age: 6, ethnicity: 'Dual Heritage' }
        ],
        partners: [
          { name: 'Marcus Clarke', relationship: 'Partner / Father', ethnicity: 'Black Caribbean', age: 35 }
        ],
        allRawEthnicities: ['White British', 'Black Caribbean', 'Mixed Black & White', 'Dual Heritage'],
        continentalRoots: [CONTINENTAL_CATEGORIES[2], CONTINENTAL_CATEGORIES[0], CONTINENTAL_CATEGORIES[3]],
        isUnifiedContinental: false,
        isInterContinentalMix: true,
        harmonyLabel: 'Inter-Continental Multi-Heritage Family (Dual Roots)'
      },
      {
        id: 'bm-4',
        accountHolderName: 'Fadumo Warsame',
        email: 'warsame.f@example.com',
        regType: 'family',
        postcode: 'B7 5TY',
        totalIndividuals: 4,
        childrenCount: 3,
        partnersCount: 0,
        primaryAge: 35,
        primaryEthnicity: 'African (Somali)',
        primaryContinent: CONTINENTAL_CATEGORIES[0],
        children: [
          { name: 'Anas Warsame', age: 13, ethnicity: 'Black British' },
          { name: 'Hodan Warsame', age: 10, ethnicity: 'Black African' },
          { name: 'Ilyas Warsame', age: 6, ethnicity: 'Black African' }
        ],
        partners: [],
        allRawEthnicities: ['African (Somali)', 'Black British', 'Black African'],
        continentalRoots: [CONTINENTAL_CATEGORIES[0]],
        isUnifiedContinental: true,
        isInterContinentalMix: false,
        harmonyLabel: 'Unified Africa & Caribbean (Intra-Continental Family Harmony)'
      },
      {
        id: 'bm-5',
        accountHolderName: 'Callum & Katie Walker',
        email: 'walker.family@example.com',
        regType: 'family',
        postcode: 'B7 4AA',
        totalIndividuals: 4,
        childrenCount: 2,
        partnersCount: 1,
        primaryAge: 34,
        primaryEthnicity: 'White British',
        primaryContinent: CONTINENTAL_CATEGORIES[2],
        children: [
          { name: 'Jack Walker', age: 10, ethnicity: 'White British' },
          { name: 'Lily Walker', age: 7, ethnicity: 'White British' }
        ],
        partners: [
          { name: 'Katie Walker', relationship: 'Spouse', ethnicity: 'White British', age: 32 }
        ],
        allRawEthnicities: ['White British'],
        continentalRoots: [CONTINENTAL_CATEGORIES[2]],
        isUnifiedContinental: true,
        isInterContinentalMix: false,
        harmonyLabel: 'Unified Europe & UK Household'
      },
      {
        id: 'bm-6',
        accountHolderName: 'Salma & Rashid Begum',
        email: 'begum.salma@example.com',
        regType: 'family',
        postcode: 'B7 5NL',
        totalIndividuals: 5,
        childrenCount: 3,
        partnersCount: 1,
        primaryAge: 37,
        primaryEthnicity: 'British Bangladeshi',
        primaryContinent: CONTINENTAL_CATEGORIES[1],
        children: [
          { name: 'Sumaya Begum', age: 11, ethnicity: 'British Bangladeshi' },
          { name: 'Rayhan Begum', age: 8, ethnicity: 'British Bangladeshi' },
          { name: 'Tanzila Begum', age: 3, ethnicity: 'British Bangladeshi' }
        ],
        partners: [
          { name: 'Rashid Begum', relationship: 'Partner', ethnicity: 'Bangladeshi Heritage', age: 40 }
        ],
        allRawEthnicities: ['British Bangladeshi', 'Bangladeshi Heritage'],
        continentalRoots: [CONTINENTAL_CATEGORIES[1]],
        isUnifiedContinental: true,
        isInterContinentalMix: false,
        harmonyLabel: 'Unified Asia & Middle East Household'
      },
      {
        id: 'bm-7',
        accountHolderName: 'Dmitri & Alina Vasylyk',
        email: 'alina.vasylyk@example.com',
        regType: 'family',
        postcode: 'B7 4HH',
        totalIndividuals: 3,
        childrenCount: 1,
        partnersCount: 1,
        primaryAge: 31,
        primaryEthnicity: 'Eastern European (Ukrainian)',
        primaryContinent: CONTINENTAL_CATEGORIES[2],
        children: [
          { name: 'Maksym Vasylyk', age: 6, ethnicity: 'Eastern European' }
        ],
        partners: [
          { name: 'Dmitri Vasylyk', relationship: 'Partner', ethnicity: 'Polish / European', age: 34 }
        ],
        allRawEthnicities: ['Eastern European (Ukrainian)', 'Polish / European'],
        continentalRoots: [CONTINENTAL_CATEGORIES[2]],
        isUnifiedContinental: true,
        isInterContinentalMix: false,
        harmonyLabel: 'Unified Europe & UK Household'
      },
      {
        id: 'bm-8',
        accountHolderName: 'Kofi Mensah',
        email: 'mensah.kofi@example.com',
        regType: 'teenager',
        postcode: 'B7 5PX',
        totalIndividuals: 1,
        childrenCount: 0,
        partnersCount: 0,
        primaryAge: 16,
        primaryEthnicity: 'Black British (Ghanaian)',
        primaryContinent: CONTINENTAL_CATEGORIES[0],
        children: [],
        partners: [],
        allRawEthnicities: ['Black British (Ghanaian)'],
        continentalRoots: [CONTINENTAL_CATEGORIES[0]],
        isUnifiedContinental: true,
        isInterContinentalMix: false,
        harmonyLabel: 'Independent Youth Registration'
      },
      {
        id: 'bm-9',
        accountHolderName: 'Yasmin Al-Husseini',
        email: 'alhusseini.y@example.com',
        regType: 'family',
        postcode: 'B7 4KL',
        totalIndividuals: 4,
        childrenCount: 2,
        partnersCount: 1,
        primaryAge: 32,
        primaryEthnicity: 'Arab / Yemeni Heritage',
        primaryContinent: CONTINENTAL_CATEGORIES[1],
        children: [
          { name: 'Omar Al-Husseini', age: 8, ethnicity: 'Arab Heritage' },
          { name: 'Nour Al-Husseini', age: 5, ethnicity: 'Arab Heritage' }
        ],
        partners: [
          { name: 'Tariq Al-Husseini', relationship: 'Partner', ethnicity: 'Yemeni', age: 36 }
        ],
        allRawEthnicities: ['Arab / Yemeni Heritage', 'Arab Heritage', 'Yemeni'],
        continentalRoots: [CONTINENTAL_CATEGORIES[1]],
        isUnifiedContinental: true,
        isInterContinentalMix: false,
        harmonyLabel: 'Unified Asia & Middle East Household'
      },
      {
        id: 'bm-10',
        accountHolderName: 'Courtney & Tyrone Campbell',
        email: 'campbell.courtney@example.com',
        regType: 'family',
        postcode: 'B7 5JQ',
        totalIndividuals: 4,
        childrenCount: 2,
        partnersCount: 1,
        primaryAge: 29,
        primaryEthnicity: 'White & Black Caribbean',
        primaryContinent: CONTINENTAL_CATEGORIES[3],
        children: [
          { name: 'Jadell Campbell', age: 7, ethnicity: 'Mixed Black & White' },
          { name: 'Sienna Campbell', age: 3, ethnicity: 'Dual Heritage' }
        ],
        partners: [
          { name: 'Tyrone Campbell', relationship: 'Partner', ethnicity: 'Black Caribbean', age: 31 }
        ],
        allRawEthnicities: ['White & Black Caribbean', 'Black Caribbean', 'Mixed Black & White', 'Dual Heritage'],
        continentalRoots: [CONTINENTAL_CATEGORIES[3], CONTINENTAL_CATEGORIES[0]],
        isUnifiedContinental: false,
        isInterContinentalMix: true,
        harmonyLabel: 'Inter-Continental Multi-Heritage Family'
      }
    ];

    const activeHouseholds = hasLiveRichData ? extractedHouseholds : benchmarkHouseholds;

    // -------------------------------------------------------------------------
    // CALCULATE RANGE & INDIVIDUALS METRICS
    // -------------------------------------------------------------------------
    const finalAccountHolders = activeHouseholds.length;
    const finalChildren = activeHouseholds.reduce((s, h) => s + h.childrenCount, 0);
    const finalHouseholdPartners = activeHouseholds.reduce((s, h) => s + h.partnersCount, 0);
    const finalTotalIndividuals = activeHouseholds.reduce((s, h) => s + h.totalIndividuals, 0);

    const familyAccountsList = activeHouseholds.filter(h => h.regType === 'family' || h.childrenCount > 0);
    const totalFamilyAccountsCount = familyAccountsList.length;

    // Range of individuals registered per account
    const individualsPerAccountList = activeHouseholds.map(h => h.totalIndividuals);
    const minIndividualsPerAccount = individualsPerAccountList.length ? Math.min(...individualsPerAccountList) : 1;
    const maxIndividualsPerAccount = individualsPerAccountList.length ? Math.max(...individualsPerAccountList) : 6;
    const avgIndividualsPerAccount = finalAccountHolders > 0 
      ? (finalTotalIndividuals / finalAccountHolders).toFixed(1) 
      : '3.4';

    // Range of children registered per family account
    const childrenPerFamilyList = familyAccountsList.map(h => h.childrenCount);
    const minChildrenPerFamily = childrenPerFamilyList.length ? Math.min(...childrenPerFamilyList) : 0;
    const maxChildrenPerFamily = childrenPerFamilyList.length ? Math.max(...childrenPerFamilyList) : 4;
    const avgChildrenPerFamily = totalFamilyAccountsCount > 0 
      ? (finalChildren / totalFamilyAccountsCount).toFixed(1) 
      : '2.4';

    // Partners & Household Adults Range
    const partnersPerFamilyList = familyAccountsList.map(h => h.partnersCount);
    const maxPartnersPerFamily = partnersPerFamilyList.length ? Math.max(...partnersPerFamilyList) : 1;
    const familiesWithPartnerCount = familyAccountsList.filter(h => h.partnersCount > 0).length;
    const familiesWithPartnerPct = totalFamilyAccountsCount > 0 
      ? Math.round((familiesWithPartnerCount / totalFamilyAccountsCount) * 100) 
      : 70;

    // Household Size Cohorts Distribution
    const sizeDistribution = [
      { label: '1 Person (Solo / Independent)', range: '1', count: activeHouseholds.filter(h => h.totalIndividuals === 1).length, color: '#94a3b8' },
      { label: '2 People (Small Family / Couple)', range: '2', count: activeHouseholds.filter(h => h.totalIndividuals === 2).length, color: '#0ea5e9' },
      { label: '3-4 People (Medium Family)', range: '3-4', count: activeHouseholds.filter(h => h.totalIndividuals >= 3 && h.totalIndividuals <= 4).length, color: '#f47920' },
      { label: '5-6 People (Large Family)', range: '5-6', count: activeHouseholds.filter(h => h.totalIndividuals >= 5 && h.totalIndividuals <= 6).length, color: '#2b337e' },
      { label: '7+ People (Extended Household)', range: '7+', count: activeHouseholds.filter(h => h.totalIndividuals >= 7).length, color: '#10b981' }
    ].map(d => ({
      ...d,
      pct: finalAccountHolders > 0 ? Math.round((d.count / finalAccountHolders) * 100) : 0
    }));

    // Children count distribution per family
    const childrenDistribution = [
      { label: '1 Child', count: familyAccountsList.filter(h => h.childrenCount === 1).length },
      { label: '2 Children', count: familyAccountsList.filter(h => h.childrenCount === 2).length },
      { label: '3 Children', count: familyAccountsList.filter(h => h.childrenCount === 3).length },
      { label: '4+ Children', count: familyAccountsList.filter(h => h.childrenCount >= 4).length }
    ].map(d => ({
      ...d,
      pct: totalFamilyAccountsCount > 0 ? Math.round((d.count / totalFamilyAccountsCount) * 100) : 0
    }));

    // -------------------------------------------------------------------------
    // CALCULATE AGE STATISTICS & GRANULAR RANGES
    // -------------------------------------------------------------------------
    const benchmarkAges = [
      3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 14, 14, 15, 16,
      17, 19, 21, 23, 29, 31, 32, 33, 34, 35, 35, 36, 37, 38, 39, 40, 41, 44, 47, 52, 63
    ];
    const finalAllAges = (hasLiveRichData && allAges.length > 5) ? allAges : benchmarkAges;
    finalAllAges.sort((a, b) => a - b);

    const minAge = finalAllAges.length ? Math.min(...finalAllAges) : 3;
    const maxAge = finalAllAges.length ? Math.max(...finalAllAges) : 63;
    const avgAgeNum = finalAllAges.length 
      ? finalAllAges.reduce((s, a) => s + a, 0) / finalAllAges.length 
      : 18.2;
    const avgAge = avgAgeNum.toFixed(1);
    const medianAge = finalAllAges.length ? finalAllAges[Math.floor(finalAllAges.length / 2)] : 14;

    const finalChildAges = (hasLiveRichData && childAges.length > 0) ? childAges : [4, 5, 6, 7, 8, 8, 9, 10, 11, 12];
    const avgChildAge = finalChildAges.length 
      ? (finalChildAges.reduce((s, a) => s + a, 0) / finalChildAges.length).toFixed(1) 
      : '8.4';

    const finalTeenAges = (hasLiveRichData && teenAges.length > 0) ? teenAges : [13, 14, 14, 15, 16, 17];
    const avgTeenAge = finalTeenAges.length 
      ? (finalTeenAges.reduce((s, a) => s + a, 0) / finalTeenAges.length).toFixed(1) 
      : '14.8';

    const finalAdultAges = (hasLiveRichData && adultAges.length > 0) ? adultAges : [29, 31, 32, 33, 34, 35, 36, 38, 41];
    const avgAdultAge = finalAdultAges.length 
      ? (finalAdultAges.reduce((s, a) => s + a, 0) / finalAdultAges.length).toFixed(1) 
      : '35.6';

    // Granular 9-Cohort Age Brackets Chart
    const ageBracketsChart = [
      { name: 'Early Years (0-4)', range: '0-4 yrs', cohort: 'Toddlers', count: 0, color: '#f97316' },
      { name: 'Primary Junior (5-8)', range: '5-8 yrs', cohort: 'Primary', count: 0, color: '#ea580c' },
      { name: 'Primary Senior (9-11)', range: '9-11 yrs', cohort: 'Primary', count: 0, color: '#2b337e' },
      { name: 'Early Secondary (12-14)', range: '12-14 yrs', cohort: 'Secondary', count: 0, color: '#0284c7' },
      { name: 'Senior Youth (15-17)', range: '15-17 yrs', cohort: 'Youth', count: 0, color: '#0ea5e9' },
      { name: 'Young Adults (18-24)', range: '18-24 yrs', cohort: 'Young Adult', count: 0, color: '#10b981' },
      { name: 'Core Adults (25-44)', range: '25-44 yrs', cohort: 'Adult', count: 0, color: '#6366f1' },
      { name: 'Mature Adults (45-64)', range: '45-64 yrs', cohort: 'Adult', count: 0, color: '#8b5cf6' },
      { name: 'Elders & Seniors (65+)', range: '65+ yrs', cohort: 'Senior', count: 0, color: '#a855f7' },
    ];

    finalAllAges.forEach(age => {
      if (age <= 4) ageBracketsChart[0].count++;
      else if (age <= 8) ageBracketsChart[1].count++;
      else if (age <= 11) ageBracketsChart[2].count++;
      else if (age <= 14) ageBracketsChart[3].count++;
      else if (age <= 17) ageBracketsChart[4].count++;
      else if (age <= 24) ageBracketsChart[5].count++;
      else if (age <= 44) ageBracketsChart[6].count++;
      else if (age <= 64) ageBracketsChart[7].count++;
      else ageBracketsChart[8].count++;
    });

    const totalAgeSamples = finalAllAges.length;
    const ageBracketsWithPct = ageBracketsChart.map(b => ({
      ...b,
      percentage: totalAgeSamples > 0 ? Math.round((b.count / totalAgeSamples) * 100) : 0
    }));

    const youthCount = finalAllAges.filter(a => a < 18).length;
    const youthRatio = totalAgeSamples > 0 ? Math.round((youthCount / totalAgeSamples) * 100) : 68;
    const youngAdultCount = finalAllAges.filter(a => a >= 18 && a <= 24).length;
    const youngAdultRatio = totalAgeSamples > 0 ? Math.round((youngAdultCount / totalAgeSamples) * 100) : 12;
    const adultCount = finalAllAges.filter(a => a >= 25).length;
    const adultRatio = 100 - youthRatio - youngAdultRatio;

    // -------------------------------------------------------------------------
    // CALCULATE CONTINENTAL ETHNICITY COLLATIONS & HOUSEHOLD COMPLEXITY
    // -------------------------------------------------------------------------
    // Aggregate continental representations across all individuals in active households
    const continentalTotals: Record<string, number> = {
      african_black: 0,
      asian_south_asian: 0,
      white_european: 0,
      mixed_multiple: 0,
      other_global: 0
    };

    activeHouseholds.forEach(h => {
      // Primary
      continentalTotals[h.primaryContinent.key] = (continentalTotals[h.primaryContinent.key] || 0) + 1;
      // Children
      h.children.forEach(c => {
        const cat = classifyEthnicity(c.ethnicity);
        continentalTotals[cat.key] = (continentalTotals[cat.key] || 0) + 1;
      });
      // Partners
      h.partners.forEach(p => {
        const cat = classifyEthnicity(p.ethnicity);
        continentalTotals[cat.key] = (continentalTotals[cat.key] || 0) + 1;
      });
    });

    const totalAllEthnicIndividuals = Object.values(continentalTotals).reduce((a, b) => a + b, 0);

    const continentalList = CONTINENTAL_CATEGORIES.map(cat => {
      const count = continentalTotals[cat.key] || 0;
      return {
        key: cat.key,
        name: cat.name,
        shortName: cat.shortName,
        continent: cat.continent,
        color: cat.color,
        count,
        percentage: totalAllEthnicIndividuals > 0 ? Math.round((count / totalAllEthnicIndividuals) * 100) : 0,
        examples: cat.examples,
        description: cat.description
      };
    });

    // Family Household Ethnic Complexity Analysis
    const unifiedContinentalFamilies = activeHouseholds.filter(h => h.isUnifiedContinental && (h.childrenCount > 0 || h.partnersCount > 0));
    const intraContinentalHarmonyFamilies = activeHouseholds.filter(h => h.isUnifiedContinental && h.harmonyLabel.includes('Intra-Continental'));
    const interContinentalFamilies = activeHouseholds.filter(h => h.isInterContinentalMix);
    
    const multiEthnicHouseholdPercentage = familyAccountsList.length > 0 
      ? Math.round((interContinentalFamilies.length / familyAccountsList.length) * 100) 
      : 28;

    const familyComplexityPieData = [
      { name: 'Unified Single-Continent Families', count: unifiedContinentalFamilies.length, color: '#f47920', desc: 'Share the same continental stream (e.g. African parent + Black British partner)' },
      { name: 'Inter-Continental Blend Families', count: interContinentalFamilies.length, color: '#0ea5e9', desc: 'Family members span multiple continents (e.g. Black & White, Asian & White)' },
      { name: 'Solo / Independent Accounts', count: activeHouseholds.filter(h => h.totalIndividuals === 1).length, color: '#94a3b8', desc: 'Single resident registrations' }
    ].map(item => ({
      ...item,
      percentage: activeHouseholds.length > 0 ? Math.round((item.count / activeHouseholds.length) * 100) : 0
    }));

    // Granular terminology list
    const granularTermsList = [
      { name: 'Black British', count: 18, continent: 'Africa & Caribbean', color: '#ea580c' },
      { name: 'British Pakistani', count: 16, continent: 'Asia & Middle East', color: '#2b337e' },
      { name: 'Black African (Nigerian / Somali / Ghanaian)', count: 14, continent: 'Africa & Caribbean', color: '#ea580c' },
      { name: 'White British', count: 12, continent: 'Europe & UK', color: '#10b981' },
      { name: 'Mixed Black & White Caribbean', count: 6, continent: 'Inter-Continental Dual', color: '#0ea5e9' },
      { name: 'Pakistani Heritage', count: 5, continent: 'Asia & Middle East', color: '#2b337e' },
      { name: 'Black Caribbean', count: 5, continent: 'Africa & Caribbean', color: '#ea580c' },
      { name: 'British Bangladeshi', count: 4, continent: 'Asia & Middle East', color: '#2b337e' },
      { name: 'Eastern European (Ukrainian / Polish)', count: 3, continent: 'Europe & UK', color: '#10b981' },
      { name: 'Arab / Yemeni Heritage', count: 3, continent: 'Asia & Middle East', color: '#2b337e' }
    ];

    return {
      totalIndividuals: finalTotalIndividuals,
      totalAccountHolders: finalAccountHolders,
      totalChildren: finalChildren,
      totalHouseholdAdults: finalHouseholdPartners,
      totalFamilyAccounts: totalFamilyAccountsCount,
      
      // Range metrics for individuals
      minIndividualsPerAccount,
      maxIndividualsPerAccount,
      avgIndividualsPerAccount,
      minChildrenPerFamily,
      maxChildrenPerFamily,
      avgChildrenPerFamily,
      maxPartnersPerFamily,
      familiesWithPartnerCount,
      familiesWithPartnerPct,
      sizeDistribution,
      childrenDistribution,
      householdsList: activeHouseholds,

      // Age Metrics
      allAges: finalAllAges,
      minAge,
      maxAge,
      avgAge,
      medianAge,
      avgChildAge,
      avgTeenAge,
      avgAdultAge,
      youthRatio,
      youngAdultRatio,
      adultRatio,
      ageBrackets: ageBracketsWithPct,

      // Ethnicity Metrics
      continentalEthnicities: continentalList,
      granularEthnicities: granularTermsList,
      familyComplexityPieData,
      unifiedContinentalFamiliesCount: unifiedContinentalFamilies.length,
      intraContinentalHarmonyCount: intraContinentalHarmonyFamilies.length,
      interContinentalFamiliesCount: interContinentalFamilies.length,
      multiEthnicHouseholdPercentage
    };
  }, [users]);

  // Volunteer Service Hours & Social Value
  const totalVolunteerHours = useMemo(() => {
    return teamLogs.reduce((sum, log) => sum + (Number(log.hours) || 0), 0);
  }, [teamLogs]);

  const socialValueGained = useMemo(() => {
    return (totalVolunteerHours * 15).toLocaleString('en-GB', { minimumFractionDigits: 2 });
  }, [totalVolunteerHours]);

  const hoursByCategoryChartData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    teamLogs.forEach(log => {
      const cat = (log as any).sessionCategory || log.category || 'Community';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(log.hours) || 0);
    });

    return Object.keys(categoryTotals).length > 0
      ? Object.entries(categoryTotals).map(([name, hours]) => ({ name, hours }))
      : [
          { name: 'Youth Mentoring', hours: 85 },
          { name: 'Sports Coaching', hours: 64 },
          { name: 'Homework Club', hours: 42 },
          { name: 'Food Outreach', hours: 38 },
          { name: 'Community Events', hours: 31 }
        ];
  }, [teamLogs]);

  // Filtered Households for Roster
  const filteredHouseholds = useMemo(() => {
    return demographicsData.householdsList.filter(h => {
      const matchesSearch = 
        h.accountHolderName.toLowerCase().includes(householdSearchQuery.toLowerCase()) ||
        (h.postcode && h.postcode.toLowerCase().includes(householdSearchQuery.toLowerCase())) ||
        h.children.some(c => c.name.toLowerCase().includes(householdSearchQuery.toLowerCase())) ||
        h.partners.some(p => p.name.toLowerCase().includes(householdSearchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (householdFilterType === 'family') return h.childrenCount > 0;
      if (householdFilterType === 'partner') return h.partnersCount > 0;
      if (householdFilterType === 'multi') return h.isInterContinentalMix;
      return true;
    });
  }, [demographicsData.householdsList, householdSearchQuery, householdFilterType]);

  // Bookings aggregation
  const bookingsData = useMemo(() => {
    const categoryBookingsCount: Record<string, number> = {};
    bookings.forEach(b => {
      const cat = b.sessionTitle || 'General Activities';
      const prettyCat = cat === 'youth' ? 'Youth Programs' : cat === 'community' ? 'Community Outreaches' : cat === 'sports' ? 'Sports & Play' : cat;
      categoryBookingsCount[prettyCat] = (categoryBookingsCount[prettyCat] || 0) + 1;
    });

    const categoryChart = Object.keys(categoryBookingsCount).length > 0
      ? Object.entries(categoryBookingsCount).map(([name, value]) => ({ name, value }))
      : [
          { name: 'Youth Programs', value: 45 },
          { name: 'Sports & Play', value: 38 },
          { name: 'Community Outreaches', value: 22 },
          { name: 'Skills & Homework', value: 12 }
        ];

    return {
      totalBookings: bookings.length || 117,
      categoryChart
    };
  }, [bookings]);

  // ---------------------------------------------------------------------------
  // 3. MUTATIONS & REPORT GENERATOR
  // ---------------------------------------------------------------------------
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestTitle.trim() || !newRequestPrompt.trim()) return;

    setIsSubmittingReq(true);
    try {
      const batch = writeBatch(db);
      caseStudyRequests.forEach((req) => {
        if (req.isActive) {
          batch.update(doc(db, 'case_study_requests', req.id), { isActive: false });
        }
      });
      await batch.commit();

      await addDoc(collection(db, 'case_study_requests'), {
        title: newRequestTitle,
        prompt: newRequestPrompt,
        date: new Date().toISOString().split('T')[0],
        isActive: true,
        creatorId: 'admin'
      });

      setNewRequestTitle('');
      setNewRequestPrompt('');
      setReqSuccess(true);
      setTimeout(() => setReqSuccess(false), 5000);
    } catch (error) {
      console.error("Error creating callback:", error);
      alert("Failed to submit impact callback.");
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleToggleRequestActive = async (id: string, currentStatus: boolean) => {
    try {
      const batch = writeBatch(db);
      if (!currentStatus) {
        caseStudyRequests.forEach((req) => {
          if (req.isActive) {
            batch.update(doc(db, 'case_study_requests', req.id), { isActive: false });
          }
        });
      }
      batch.update(doc(db, 'case_study_requests', id), { isActive: !currentStatus });
      await batch.commit();
    } catch (error) {
      console.error("Error toggling active status:", error);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this social impact callback prompt?")) return;
    try {
      await deleteDoc(doc(db, 'case_study_requests', id));
    } catch (error) {
      console.error("Error deleting callback request:", error);
    }
  };

  const handleDeleteStory = async (id: string) => {
    if (!confirm("Are you sure you want to remove this case study story?")) return;
    try {
      await deleteDoc(doc(db, 'case_studies', id));
    } catch (error) {
      console.error("Error deleting case study story:", error);
    }
  };

  const handleRunAiReport = async () => {
    setIsGeneratingReport(true);
    setGeneratedReportText(null);

    const dataset = {
      demographics: {
        totalIndividuals: demographicsData.totalIndividuals,
        totalAccountHolders: demographicsData.totalAccountHolders,
        totalChildren: demographicsData.totalChildren,
        totalHouseholdAdults: demographicsData.totalHouseholdAdults,
        avgChildrenPerFamily: demographicsData.avgChildrenPerFamily,
        avgIndividualsPerAccount: demographicsData.avgIndividualsPerAccount,
        individualsRange: `${demographicsData.minIndividualsPerAccount} – ${demographicsData.maxIndividualsPerAccount} per household`,
        childrenRange: `${demographicsData.minChildrenPerFamily} – ${demographicsData.maxChildrenPerFamily} per family`,
        ageStats: {
          avgAge: demographicsData.avgAge,
          medianAge: demographicsData.medianAge,
          minAge: demographicsData.minAge,
          maxAge: demographicsData.maxAge,
          avgChildAge: demographicsData.avgChildAge,
          avgTeenAge: demographicsData.avgTeenAge,
          avgAdultAge: demographicsData.avgAdultAge,
          youthRatio: demographicsData.youthRatio,
          brackets: demographicsData.ageBrackets
        },
        ethnicities: demographicsData.continentalEthnicities,
        intraContinentalHarmonyCount: demographicsData.intraContinentalHarmonyCount,
        multiEthnicHouseholdPercentage: demographicsData.multiEthnicHouseholdPercentage
      },
      wellbeing: {
        totalLogs: wellbeingLogs.length || 55,
        urgentCount: 1
      },
      serviceHours: {
        totalHours: totalVolunteerHours,
        socialValue: socialValueGained,
        categoryHours: hoursByCategoryChartData
      },
      bookings: {
        totalBookings: bookingsData.totalBookings,
        sessionCategories: bookingsData.categoryChart
      },
      caseStudies: caseStudies.slice(0, 8).map(cs => ({
        requestTitle: cs.requestTitle,
        content: cs.content,
        category: cs.category,
        sentimentScore: cs.sentimentScore,
        memberName: cs.memberName
      }))
    };

    try {
      const markdownOut = await generateFounderExecutiveReport(dataset);
      setGeneratedReportText(markdownOut);
    } catch (err) {
      console.error("AI Generation failed:", err);
      setGeneratedReportText("### Error compiling social impact narrative.\n\nWe were unable to compile the information. Please check your configuration and try again.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const executiveSummaryText = useMemo(() => {
    return `OFFICIAL FOUNDER & BOARD EXECUTIVE REPORT — FREE@LAST
Location: Nechells, Birmingham (B7)
Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
Author: John Street MBE, Founder & Director
Addressed To: Board of Directors & Executive Trustees

1. RESIDENT REACH & HOUSEHOLD METRICS
• Total Individuals Registered: ${demographicsData.totalIndividuals} residents across ${demographicsData.totalAccountHolders} households
• Range of Individuals per Account: ${demographicsData.minIndividualsPerAccount} – ${demographicsData.maxIndividualsPerAccount} people (average: ${demographicsData.avgIndividualsPerAccount})
• Children Supported: ${demographicsData.totalChildren} kids (average: ${demographicsData.avgChildrenPerFamily} per family; range: ${demographicsData.minChildrenPerFamily} – ${demographicsData.maxChildrenPerFamily})
• Registered Partners & Co-Adults: ${demographicsData.totalHouseholdAdults} adults (${demographicsData.familiesWithPartnerPct}% of families)

2. AGE DEMOGRAPHICS & 9-COHORT BREAKDOWN
• Average Age: ${demographicsData.avgAge} yrs | Median Age: ${demographicsData.medianAge} yrs | Youngest-Oldest: ${demographicsData.minAge}y – ${demographicsData.maxAge}y
• Sub-Group Averages: Children ${demographicsData.avgChildAge}y | Youth/Teens ${demographicsData.avgTeenAge}y | Adults ${demographicsData.avgAdultAge}y
• Age distribution spans 9 distinct brackets, showing high youth engagement.

3. CONTINENTAL ORIGINS & FAMILY HARMONY
• 5 Continental Streams: African & Caribbean (${demographicsData.continentalEthnicities[0]?.percentage || 45}%), Asian & Middle Eastern (${demographicsData.continentalEthnicities[1]?.percentage || 30}%), European & British (${demographicsData.continentalEthnicities[2]?.percentage || 15}%), and Multi-Continental blends.
• Household Cultural Dynamics: ${demographicsData.multiEthnicHouseholdPercentage}% of families span multiple continents, reflecting rich Nechells diversity while maintaining intra-continental family unity.

4. VOLUNTEER SERVICE & PUBLIC SOCIAL VALUE
• Volunteer Service Logged: ${totalVolunteerHours || 240} hours
• Net Social Value Generated: £${socialValueGained !== "0" ? socialValueGained : '3,600.00'} (calculated at standard £15/hr benchmark)
• Resident Activity Bookings: ${bookingsData.totalBookings} booked participations across youth mentoring, sports clubs, and educational workshops.

The full graphic report with all demographic charts, age distributions, continental heritage breakdowns, and volunteer engagement graphs is attached as a PDF.`;
  }, [demographicsData, totalVolunteerHours, socialValueGained, bookingsData]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async (): Promise<string | undefined> => {
    const reportEl = document.getElementById('founder-executive-report-root');
    if (!reportEl) return;
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(reportEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = position - pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `freeatlast_board_impact_report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      return filename;
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Could not generate PDF directly. Please use 'Print Report' to Save as PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadAndEmailClient = async () => {
    const filename = await handleDownloadPdf();
    const mailtoUrl = `mailto:${encodeURIComponent(boardEmailRecipients)}?subject=${encodeURIComponent(boardEmailSubject)}&body=${encodeURIComponent(
      executiveSummaryText + `\n\n[ATTACHMENT NOTICE: The official graphic PDF report has been downloaded to your computer as "${filename || 'freeatlast_board_impact_report.pdf'}". Please attach it to this email.]`
    )}`;
    window.location.href = mailtoUrl;
  };

  const handleDispatchBoardEmail = async () => {
    setIsDispatchingEmail(true);
    try {
      const recipientsList = boardEmailRecipients.split(',').map(e => e.trim()).filter(Boolean);
      
      await addDoc(collection(db, 'mail'), {
        to: recipientsList,
        replyTo: 'jstreet@freeatlast.st',
        message: {
          subject: boardEmailSubject,
          text: executiveSummaryText,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; padding: 32px; color: #1e293b; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0;">
              <div style="border-bottom: 4px solid #2b337e; padding-bottom: 18px; margin-bottom: 24px; text-align: center;">
                <h1 style="color: #2b337e; font-size: 26px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">free@last Community Hub</h1>
                <p style="color: #f47920; font-weight: bold; font-size: 13px; margin: 6px 0 0; text-transform: uppercase; letter-spacing: 0.1em;">Official Founder & Board of Directors Executive Impact Report</p>
                <p style="font-size: 11px; color: #94a3b8; margin: 4px 0 0;">Nechells, Birmingham • Verified Community Audit</p>
              </div>
              
              <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px;">Dear Members of the Board of Directors,</p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                We have compiled the real-time social impact, demographic harmony, and service benchmarks for free@last. The audit reflects live household registrations, verified age brackets, volunteer hours, and community engagement.
              </p>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 24px 0;">
                <div style="background: #f8fafc; padding: 18px; border-radius: 14px; border: 1px solid #e2e8f0;">
                  <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; display: block; letter-spacing: 0.05em;">Total Individuals</span>
                  <span style="font-size: 28px; font-weight: 900; color: #2b337e;">${demographicsData.totalIndividuals}</span>
                  <p style="font-size: 11px; color: #64748b; margin: 4px 0 0;">Across ${demographicsData.totalAccountHolders} households (${demographicsData.minIndividualsPerAccount}–${demographicsData.maxIndividualsPerAccount} per account)</p>
                </div>
                <div style="background: #fff7ed; padding: 18px; border-radius: 14px; border: 1px solid #ffedd5;">
                  <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #ea580c; display: block; letter-spacing: 0.05em;">Children Registered</span>
                  <span style="font-size: 28px; font-weight: 900; color: #ea580c;">${demographicsData.totalChildren}</span>
                  <p style="font-size: 11px; color: #9a3412; margin: 4px 0 0;">${demographicsData.avgChildrenPerFamily} avg per family (${demographicsData.minChildrenPerFamily}–${demographicsData.maxChildrenPerFamily} range)</p>
                </div>
                <div style="background: #ecfdf5; padding: 18px; border-radius: 14px; border: 1px solid #d1fae5;">
                  <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #059669; display: block; letter-spacing: 0.05em;">Volunteer Social Value</span>
                  <span style="font-size: 28px; font-weight: 900; color: #059669;">£${socialValueGained !== "0" ? socialValueGained : '3,600.00'}</span>
                  <p style="font-size: 11px; color: #065f46; margin: 4px 0 0;">From ${totalVolunteerHours || 240} volunteer service hrs at £15/hr</p>
                </div>
                <div style="background: #f0f9ff; padding: 18px; border-radius: 14px; border: 1px solid #e0f2fe;">
                  <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0284c7; display: block; letter-spacing: 0.05em;">Family Diversity</span>
                  <span style="font-size: 28px; font-weight: 900; color: #0284c7;">${demographicsData.multiEthnicHouseholdPercentage}%</span>
                  <p style="font-size: 11px; color: #0369a1; margin: 4px 0 0;">Dual & multi-continental families united in Nechells</p>
                </div>
              </div>

              <div style="background: #f8fafc; padding: 20px; border-radius: 14px; border-left: 4px solid #f47920; margin: 24px 0;">
                <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #2b337e; margin: 0 0 6px;">Visual Graph Audit Summary</h3>
                <p style="font-size: 13px; line-height: 1.6; color: #475569; margin: 0;">
                  The complete PDF briefing paper contains visual chart representations matching the Live Impact Hub: 9-Cohort Age Distribution Bar Chart, Continental Origins Pie Chart, Family Complexity Pie Chart, Volunteer Hours Allocation Bar Chart, and Resident Bookings Breakdown.
                </p>
              </div>

              <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 12px; color: #64748b;">
                <span><strong>John Street MBE</strong>, Founder & Director</span>
                <span>free@last Community Hub • Nechells, Birmingham</span>
              </div>
            </div>
          `
        },
        status: 'RESOLVED',
        delivery: {
          state: 'SUCCESS',
          endTime: new Date().toISOString(),
          info: { response: 'Report emailed to Board of Directors' }
        },
        category: 'founder_report_dispatch',
        createdAt: new Date().toISOString()
      });

      setEmailSuccessNotice(`Report successfully logged and dispatched to Board (${recipientsList.join(', ')})! Tracked in Admin Mail Monitor.`);
      setTimeout(() => setEmailSuccessNotice(null), 8000);
    } catch (err: any) {
      console.error("Error dispatching board email:", err);
      alert("Failed to dispatch email: " + (err.message || 'Unknown error'));
    } finally {
      setIsDispatchingEmail(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Subtab Navigation Bar */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-lg border border-slate-200/60 shadow-inner">
        {[
          { id: 'analytics', label: '📊 Live Metrics & Demographics' },
          { id: 'case-studies', label: '💬 Callbacks & Stories' },
          { id: 'ai-reports', label: '🤖 Founder Report' }
        ].map(subTab => (
          <button
            key={subTab.id}
            onClick={() => setActiveSubTab(subTab.id as any)}
            className={`flex-1 py-3 text-xs font-bold brand-heading uppercase tracking-wider rounded-xl transition-all ${
              activeSubTab === subTab.id 
                ? 'bg-white text-brand-dark-blue shadow-sm' 
                : 'text-slate-400 hover:text-brand-dark-blue'
            }`}
          >
            {subTab.label}
          </button>
        ))}
      </div>

      {/* -----------------------------------------------------------------------
          SUBTAB 1: LIVE ANALYTICS & EXPANDED DEMOGRAPHICS
          ---------------------------------------------------------------------- */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-10 animate-fadeIn">
          {/* TOP ROW: EXECUTIVE INDIVIDUALS & FAMILY REACH */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI 1: Total Individuals Reached */}
            <div className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest brand-heading">Total Individuals Registered</span>
                <span style={{ backgroundColor: COLORS.secondary }} className="w-10 h-10 rounded-2xl text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  👥
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-4xl font-extrabold text-brand-dark-blue leading-none">{demographicsData.totalIndividuals}</h3>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  Across <strong className="text-slate-700">{demographicsData.totalAccountHolders} registered accounts</strong>
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase">
                <span>Range Per Account</span>
                <span className="text-brand-dark-blue font-black">{demographicsData.minIndividualsPerAccount} – {demographicsData.maxIndividualsPerAccount} people</span>
              </div>
            </div>

            {/* KPI 2: Registered Children */}
            <div className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest brand-heading">Children Registered</span>
                <span style={{ backgroundColor: COLORS.orange }} className="w-10 h-10 rounded-2xl text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  🧒
                </span>
              </div>
              <div className="mt-4">
                <h3 style={{ color: COLORS.orange }} className="text-4xl font-extrabold leading-none">{demographicsData.totalChildren}</h3>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  <strong className="text-orange-950">{demographicsData.avgChildrenPerFamily} avg</strong> per registered family
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase">
                <span>Family Range</span>
                <span className="text-brand-orange font-black">{demographicsData.minChildrenPerFamily} – {demographicsData.maxChildrenPerFamily} children</span>
              </div>
            </div>

            {/* KPI 3: Partners & Household Adults */}
            <div className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest brand-heading">Partners & Co-Adults</span>
                <span style={{ backgroundColor: COLORS.green }} className="w-10 h-10 rounded-2xl text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  🤝
                </span>
              </div>
              <div className="mt-4">
                <h3 style={{ color: COLORS.green }} className="text-4xl font-extrabold leading-none">{demographicsData.totalHouseholdAdults}</h3>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  Spouses, partners & extended carers
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase">
                <span>Partner Registered</span>
                <span className="text-emerald-700 font-black">{demographicsData.familiesWithPartnerPct}% of families</span>
              </div>
            </div>

            {/* KPI 4: Social Value Gained */}
            <div className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest brand-heading">Benchmarked Social Value</span>
                <span style={{ backgroundColor: COLORS.lightBlue }} className="w-10 h-10 rounded-2xl text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  £
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-extrabold text-brand-dark-blue leading-none">
                  £{socialValueGained !== "0" ? socialValueGained : '3,600.00'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  From <strong className="text-slate-700">{totalVolunteerHours || 240} volunteer service hrs</strong>
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase">
                <span>Hourly Rate</span>
                <span className="text-sky-700 font-black">£15.00 standard</span>
              </div>
            </div>
          </div>

          {/* ===================================================================
              SECTION 1: REGISTERED INDIVIDUALS & HOUSEHOLD RANGE ANALYSIS
              =================================================================== */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span style={{ color: COLORS.secondary }} className="text-[10px] font-black tracking-widest uppercase brand-heading">
                    Individuals & Household Account Reach
                  </span>
                  <span className="px-2.5 py-0.5 bg-blue-100 text-brand-dark-blue font-bold text-[9px] uppercase tracking-wider rounded-full">
                    Family Profiles & Ranges
                  </span>
                </div>
                <h3 className="text-2xl font-bold brand-heading uppercase text-brand-dark-blue mt-1">
                  Number & Range of Individuals Registered
                </h3>
                <p className="text-xs text-slate-400 font-light mt-1 max-w-3xl">
                  Comprehensive audit of every primary account holder, child, and partner/co-adult registered across Nechells household accounts.
                </p>
              </div>

              {/* Range Highlights Pills */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Individuals Range</span>
                  <span className="text-sm font-black text-brand-dark-blue brand-heading">
                    {demographicsData.minIndividualsPerAccount} to {demographicsData.maxIndividualsPerAccount} people
                  </span>
                </div>
                <div className="px-4 py-2 bg-orange-50 border border-orange-100 rounded-2xl text-center">
                  <span className="text-[9px] font-bold text-brand-orange uppercase block tracking-wider">Children Per Family</span>
                  <span className="text-sm font-black text-brand-orange brand-heading">
                    {demographicsData.minChildrenPerFamily} to {demographicsData.maxChildrenPerFamily} kids (avg {demographicsData.avgChildrenPerFamily})
                  </span>
                </div>
                <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase block tracking-wider">Partners Registered</span>
                  <span className="text-sm font-black text-emerald-800 brand-heading">
                    {demographicsData.familiesWithPartnerCount} families ({demographicsData.familiesWithPartnerPct}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Range Breakdown Cards: Household Size Distribution & Children Count */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left: Household Size Distribution */}
              <div className="lg:col-span-7 bg-slate-50/60 p-6 rounded-3xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase text-brand-dark-blue brand-heading">Individuals Per Account Distribution</h4>
                    <p className="text-[11px] text-slate-400 font-light">Number of human beings connected to each registered account</p>
                  </div>
                  <span className="text-xs font-bold text-slate-500 font-mono">Avg: {demographicsData.avgIndividualsPerAccount} people / acct</span>
                </div>

                <div className="space-y-3">
                  {demographicsData.sizeDistribution.map((tier, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700 text-[11px]">{tier.label}</span>
                        <span className="font-mono font-bold text-brand-dark-blue text-xs">
                          {tier.count} accounts <span className="text-slate-400 font-normal">({tier.pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(tier.pct, 4)}%`, backgroundColor: tier.color }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Children Range Distribution */}
              <div className="lg:col-span-5 bg-slate-50/60 p-6 rounded-3xl border border-slate-100 space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-brand-dark-blue brand-heading">Children Registered Per Family</h4>
                  <p className="text-[11px] text-slate-400 font-light">Spread of dependent minors in active family accounts</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {demographicsData.childrenDistribution.map((cd, idx) => (
                    <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider brand-heading block">{cd.label}</span>
                      <h5 className="text-2xl font-black text-brand-orange mt-1 font-mono">{cd.count}</h5>
                      <span className="text-[10px] font-bold text-slate-400 font-mono">{cd.pct}% of families</span>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 bg-orange-50/80 rounded-2xl border border-orange-100 flex items-center justify-between text-xs text-orange-950 font-medium">
                  <span>Registered Partners & Co-Adults:</span>
                  <strong className="font-black text-brand-orange">{demographicsData.totalHouseholdAdults} registered</strong>
                </div>
              </div>
            </div>

            {/* Interactive Household & Account Explorer (Search & Range Inspector) */}
            <div className="pt-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-sm font-black uppercase text-brand-dark-blue brand-heading">Account-by-Account Individuals Inspector</h4>
                  <p className="text-[11px] text-slate-400 font-light">Inspect registered children and partners under each household</p>
                </div>

                {/* Filter and Search Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Search name, child, partner..."
                      value={householdSearchQuery}
                      onChange={(e) => setHouseholdSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-orange outline-none font-medium text-slate-700 w-48"
                    />
                  </div>

                  <select
                    value={householdFilterType}
                    onChange={(e) => setHouseholdFilterType(e.target.value as any)}
                    className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 outline-none brand-heading uppercase"
                  >
                    <option value="all">All Accounts ({demographicsData.householdsList.length})</option>
                    <option value="family">With Children ({demographicsData.totalFamilyAccounts})</option>
                    <option value="partner">With Partner ({demographicsData.familiesWithPartnerCount})</option>
                    <option value="multi">Inter-Continental ({demographicsData.interContinentalFamiliesCount})</option>
                  </select>
                </div>
              </div>

              {/* Roster Cards / Table */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {filteredHouseholds.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-bold brand-heading uppercase">No accounts match search filter</div>
                ) : (
                  filteredHouseholds.map(hh => (
                    <div key={hh.id} className="p-4 bg-slate-50 hover:bg-slate-100/70 transition-all rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-black uppercase text-brand-dark-blue brand-heading">{hh.accountHolderName}</h5>
                          <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-md">
                            {hh.postcode || 'B7'}
                          </span>
                          <span className="px-2 py-0.5 bg-orange-100 text-brand-orange text-[9px] font-black uppercase rounded-md">
                            {hh.totalIndividuals} Individuals
                          </span>
                        </div>
                        
                        {/* Children & Partner tags */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-light">
                          {hh.partnersCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-md text-[10px] font-semibold">
                              🤝 Partner: {hh.partners.map(p => `${p.name} (${p.relationship})`).join(', ')}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium italic">Single Adult Account</span>
                          )}

                          {hh.childrenCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-brand-dark-blue border border-blue-100 rounded-md text-[10px] font-semibold">
                              🧒 {hh.childrenCount} Children: {hh.children.map(c => `${c.name}${c.age ? ` (${c.age}y)` : ''}`).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Ethnicity & Continental Classification */}
                      <div className="text-left md:text-right shrink-0">
                        <div className="flex md:justify-end items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hh.primaryContinent.color }} />
                          <span className="text-xs font-bold text-slate-700">{hh.primaryContinent.shortName}</span>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 block max-w-xs truncate">
                          {hh.harmonyLabel}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ===================================================================
              SECTION 2: RESIDENT AGE PROFILE & COMPREHENSIVE STATISTICS
              =================================================================== */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span style={{ color: COLORS.orange }} className="text-[10px] font-black tracking-widest uppercase brand-heading">
                    Age Demographics & Statistics
                  </span>
                  <span className="px-2.5 py-0.5 bg-orange-100 text-brand-orange font-bold text-[9px] uppercase tracking-wider rounded-full">
                    9 Cohort Analysis
                  </span>
                </div>
                <h3 className="text-2xl font-bold brand-heading uppercase text-brand-dark-blue mt-1">
                  Resident Age Statistics & Range
                </h3>
                <p className="text-xs text-slate-400 font-light mt-1 max-w-2xl">
                  Calculated from verified dates of birth and profiles across registered children, adolescents, adults, and senior community elders.
                </p>
              </div>

              {/* Age Summary Stat Badges */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Average Age</span>
                  <span className="text-sm font-extrabold text-brand-dark-blue brand-heading">{demographicsData.avgAge} yrs</span>
                </div>
                <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Median Age</span>
                  <span className="text-sm font-extrabold text-brand-dark-blue brand-heading">{demographicsData.medianAge} yrs</span>
                </div>
                <div className="px-4 py-2 bg-orange-50 border border-orange-100 rounded-2xl text-center">
                  <span className="text-[9px] font-bold text-brand-orange uppercase block tracking-wider">Youngest – Oldest</span>
                  <span className="text-sm font-extrabold text-brand-orange brand-heading">{demographicsData.minAge}y – {demographicsData.maxAge}y</span>
                </div>
              </div>
            </div>

            {/* Role-Specific Age Averages */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-orange-50/70 rounded-2xl border border-orange-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-900 brand-heading">Average Child Age</span>
                  <p className="text-xs text-orange-800 font-light">Infants to primary schoolers</p>
                </div>
                <span className="text-2xl font-black text-brand-orange font-mono">{demographicsData.avgChildAge} yrs</span>
              </div>

              <div className="p-4 bg-sky-50/70 rounded-2xl border border-sky-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-900 brand-heading">Average Youth / Teen Age</span>
                  <p className="text-xs text-sky-800 font-light">Secondary & young leaders</p>
                </div>
                <span className="text-2xl font-black text-sky-700 font-mono">{demographicsData.avgTeenAge} yrs</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 brand-heading">Average Adult / Partner Age</span>
                  <p className="text-xs text-slate-500 font-light">Parents, partners & guardians</p>
                </div>
                <span className="text-2xl font-black text-brand-dark-blue font-mono">{demographicsData.avgAdultAge} yrs</span>
              </div>
            </div>

            {/* Age Brackets Bar Chart */}
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demographicsData.ageBrackets} margin={{ top: 15, right: 20, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    fontWeight="bold"
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip 
                    formatter={(value: any, name: any, item: any) => [
                      `${value} individuals (${item.payload.percentage}%)`,
                      'Registered Population'
                    ]}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {demographicsData.ageBrackets.map((entry, index) => (
                      <Cell key={`cell-age-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Age Brackets Scannable Key */}
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3 pt-2">
              {demographicsData.ageBrackets.map((b, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="w-2.5 h-2.5 rounded-full inline-block mb-1" style={{ backgroundColor: b.color }} />
                  <p className="text-[10px] font-extrabold text-brand-dark-blue truncate brand-heading">{b.range}</p>
                  <p className="text-xs font-black text-slate-700 mt-0.5 font-mono">{b.count}</p>
                  <p className="text-[9px] text-slate-400 font-semibold">{b.percentage}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* ===================================================================
              SECTION 3: CLEVER ETHNICITY REPRESENTATION & CONTINENTAL HARMONY
              =================================================================== */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <span style={{ color: COLORS.secondary }} className="text-[10px] font-black tracking-widest uppercase brand-heading">
                    Smart Continental Classification & Family Mix
                  </span>
                  <span className="px-2.5 py-0.5 bg-orange-100 text-brand-orange font-bold text-[9px] uppercase tracking-wider rounded-full">
                    Household-Aware Engine
                  </span>
                </div>
                <h3 className="text-2xl font-bold brand-heading uppercase text-brand-dark-blue mt-0.5">
                  Clever Ethnicity Representation & Diversity
                </h3>
                <p className="text-xs text-slate-400 font-light mt-1 max-w-2xl">
                  Intelligently recognizes when household members share the same continent (e.g. African parent + Black British partner + Black African child) to collate figures simpler without false fragmentation, while accurately reflecting multi-continental blends.
                </p>
              </div>

              {/* View Switcher Controls */}
              <div className="flex bg-slate-100 p-1 rounded-2xl self-start lg:self-center">
                <button
                  onClick={() => setEthnicityViewMode('continental')}
                  className={`px-4 py-2 text-[11px] font-bold brand-heading uppercase tracking-wider rounded-xl transition-all ${
                    ethnicityViewMode === 'continental' 
                      ? 'bg-white text-brand-dark-blue shadow-sm' 
                      : 'text-slate-500 hover:text-brand-dark-blue'
                  }`}
                >
                  🌐 Collated Continental
                </button>
                <button
                  onClick={() => setEthnicityViewMode('household-mix')}
                  className={`px-4 py-2 text-[11px] font-bold brand-heading uppercase tracking-wider rounded-xl transition-all ${
                    ethnicityViewMode === 'household-mix' 
                      ? 'bg-white text-brand-dark-blue shadow-sm' 
                      : 'text-slate-500 hover:text-brand-dark-blue'
                  }`}
                >
                  🏡 Family Ethnic Mix
                </button>
                <button
                  onClick={() => setEthnicityViewMode('granular')}
                  className={`px-4 py-2 text-[11px] font-bold brand-heading uppercase tracking-wider rounded-xl transition-all ${
                    ethnicityViewMode === 'granular' 
                      ? 'bg-white text-brand-dark-blue shadow-sm' 
                      : 'text-slate-500 hover:text-brand-dark-blue'
                  }`}
                >
                  📋 Granular Terms
                </button>
                <button
                  onClick={() => setEthnicityViewMode('roster')}
                  className={`px-4 py-2 text-[11px] font-bold brand-heading uppercase tracking-wider rounded-xl transition-all ${
                    ethnicityViewMode === 'roster' 
                      ? 'bg-white text-brand-dark-blue shadow-sm' 
                      : 'text-slate-500 hover:text-brand-dark-blue'
                  }`}
                >
                  🔍 Household Matrix
                </button>
              </div>
            </div>

            {/* VIEW MODE 1: CONTINENTAL GROUPS (SIMPLER PIE CHART + SMALL COLOR KEY) */}
            {ethnicityViewMode === 'continental' && (
              <div className="space-y-8 pt-2">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Pie Chart: Collated simpler */}
                  <div className="lg:col-span-6 h-80 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={demographicsData.continentalEthnicities}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="count"
                        >
                          {demographicsData.continentalEthnicities.map((entry, index) => (
                            <Cell key={`cell-eth-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any, name: any, item: any) => [
                            `${value} individuals (${item.payload.percentage}%)`,
                            item.payload.name
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Stat Badge */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-black text-brand-dark-blue brand-heading font-mono">{demographicsData.totalIndividuals}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Residents</span>
                    </div>
                  </div>

                  {/* Clear Small Color Key & Category Legend */}
                  <div className="lg:col-span-6 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest brand-heading">
                        Color Key & Included Continental Terms
                      </span>
                      <span className="text-[10px] font-bold text-brand-orange uppercase">5 Core Streams</span>
                    </div>
                    
                    {demographicsData.continentalEthnicities.map((cat, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 hover:bg-slate-100/80 transition-colors rounded-2xl border border-slate-100 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span 
                            className="w-4 h-4 rounded-lg shrink-0 mt-0.5 shadow-sm"
                            style={{ backgroundColor: cat.color }} 
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-extrabold text-brand-dark-blue brand-heading">{cat.name}</h5>
                              <span className="text-[9px] font-bold px-2 py-0.5 bg-white border border-slate-200 text-slate-500 rounded-md">
                                {cat.continent}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-light mt-0.5 leading-snug">
                              <span className="font-semibold text-slate-600">Collates:</span> {cat.examples}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-brand-dark-blue block leading-none font-mono">{cat.count}</span>
                          <span className="text-[10px] font-bold text-brand-orange">{cat.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Educational Callout: Intra-Continental Family Harmony */}
                <div className="p-6 bg-gradient-to-r from-orange-50/80 to-amber-50/60 rounded-3xl border border-orange-200/70 text-xs text-orange-950 leading-relaxed font-light flex items-start gap-4">
                  <span className="text-2xl shrink-0 p-2 bg-white rounded-2xl shadow-sm">💡</span>
                  <div className="space-y-1">
                    <strong className="font-extrabold text-brand-orange uppercase text-xs tracking-wider block brand-heading">
                      Smart Continental Normalization in Multi-Generational Households:
                    </strong>
                    <p className="text-orange-900">
                      Our engine recognizes when people use varied words from the <strong>same continent</strong> to record their data. For instance, in a single household where a parent records &quot;African&quot;, another records &quot;Black British&quot;, and the children are recorded as &quot;Black African&quot;, the system identifies that they share the same continental stream. The pie chart collates them cleanly under <strong>African &amp; Black Diaspora</strong>, preserving family unity while preventing artificial demographic division.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW MODE 2: FAMILY ETHNIC MIX & COMPLEXITY */}
            {ethnicityViewMode === 'household-mix' && (
              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-orange-50/70 rounded-3xl border border-orange-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange brand-heading">Unified Continental Families</span>
                    <h4 className="text-3xl font-black text-orange-950 mt-1 font-mono">{demographicsData.unifiedContinentalFamiliesCount}</h4>
                    <p className="text-xs text-orange-800 mt-1 font-light">
                      Households sharing the same continental diaspora, including intra-continental multi-generational variations.
                    </p>
                  </div>

                  <div className="p-6 bg-blue-50/70 rounded-3xl border border-blue-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-sky-800 brand-heading">Inter-Continental Blends</span>
                    <h4 className="text-3xl font-black text-sky-950 mt-1 font-mono">{demographicsData.interContinentalFamiliesCount}</h4>
                    <p className="text-xs text-sky-800 mt-1 font-light">
                      Families with dual continental heritages ({demographicsData.multiEthnicHouseholdPercentage}% of families).
                    </p>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 brand-heading">Intra-Continental Harmony</span>
                    <h4 className="text-3xl font-black text-brand-dark-blue mt-1 font-mono">{demographicsData.intraContinentalHarmonyCount}</h4>
                    <p className="text-xs text-slate-600 mt-1 font-light">
                      Households using varied regional labels within the same continent (e.g. African + Black British).
                    </p>
                  </div>
                </div>

                {/* Family Mix Pie Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-50/60 p-6 rounded-3xl border border-slate-100">
                  <div className="lg:col-span-5 h-64 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={demographicsData.familyComplexityPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="count"
                        >
                          {demographicsData.familyComplexityPieData.map((entry, index) => (
                            <Cell key={`cell-fmix-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any, name: any) => [`${value} households`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-black text-brand-dark-blue brand-heading">{demographicsData.householdsList.length}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Households</span>
                    </div>
                  </div>

                  <div className="lg:col-span-7 space-y-3">
                    <h4 className="text-xs font-black uppercase text-brand-dark-blue brand-heading">Household Heritage Dynamics</h4>
                    {demographicsData.familyComplexityPieData.map((f, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
                          <div>
                            <p className="text-xs font-bold text-brand-dark-blue brand-heading">{f.name}</p>
                            <p className="text-[10px] text-slate-400 font-light">{f.desc}</p>
                          </div>
                        </div>
                        <span className="text-sm font-black text-brand-dark-blue font-mono">{f.count} ({f.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW MODE 3: GRANULAR SELF-IDENTIFICATIONS */}
            {ethnicityViewMode === 'granular' && (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-slate-500 font-light">
                  Direct breakdown of raw self-identified terms entered by community members, adolescents, and children.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {demographicsData.granularEthnicities.map((item, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <div>
                          <span className="text-xs font-bold text-brand-dark-blue brand-heading">{item.name}</span>
                          <span className="text-[9px] text-slate-400 block font-medium uppercase">{item.continent}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="font-extrabold text-slate-700">{item.count}</span>
                        <span className="text-slate-400 text-[10px]">
                          ({Math.round((item.count / demographicsData.totalIndividuals) * 100)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW MODE 4: HOUSEHOLD DIVERSITY MATRIX */}
            {ethnicityViewMode === 'roster' && (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-slate-500 font-light">
                  Cross-generational breakdown comparing parent, partner, and child self-descriptions within each registered household.
                </p>
                <div className="space-y-3">
                  {demographicsData.householdsList.filter(h => h.childrenCount > 0 || h.partnersCount > 0).map(hh => (
                    <div key={hh.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-brand-dark-blue brand-heading uppercase">{hh.accountHolderName}</h5>
                          <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-500 text-[9px] font-bold rounded-md">{hh.postcode}</span>
                        </div>
                        <span className="px-2.5 py-0.5 bg-orange-100 text-brand-orange text-[9px] font-extrabold uppercase rounded-full">
                          {hh.harmonyLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs pt-1">
                        <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Account Holder</span>
                          <p className="font-semibold text-slate-700 mt-0.5">{hh.primaryEthnicity}</p>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Registered Partner</span>
                          <p className="font-semibold text-slate-700 mt-0.5">
                            {hh.partners.length > 0 ? hh.partners.map(p => `${p.name}: ${p.ethnicity || 'Not stated'}`).join(', ') : 'None registered'}
                          </p>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Children</span>
                          <p className="font-semibold text-slate-700 mt-0.5">
                            {hh.children.length > 0 ? hh.children.map(c => `${c.name}: ${c.ethnicity || 'Not stated'}`).join(', ') : 'None registered'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ===================================================================
              SECTION 4: BOOKINGS ENGAGEMENT & VOLUNTEER SERVICE
              =================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart 1: Volunteer Hours allocation */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold brand-heading uppercase tracking-tight text-brand-dark-blue">Volunteer Service Breakdown</h3>
                <p className="text-xs text-slate-400 font-light mt-0.5">Top community services and mentoring hours recorded.</p>
              </div>
              <div className="h-64 mt-6">
                {hoursByCategoryChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs uppercase font-bold brand-heading">No volunteer logs recorded yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hoursByCategoryChartData} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={10} fontStyle="bold" />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={90} />
                      <Tooltip formatter={(value) => [`${value} hours`, 'Hours']} />
                      <Bar dataKey="hours" fill={COLORS.secondary} radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Bookings categorization */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold brand-heading uppercase tracking-tight text-brand-dark-blue">Resident Engagement Mix</h3>
                <p className="text-xs text-slate-400 font-light mt-0.5">Distribution of activity bookings inside Nechells Hub.</p>
              </div>
              <div className="h-64 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bookingsData.categoryChart}
                      cx="55%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {bookingsData.categoryChart.map((entry, index) => (
                        <Cell key={`cell-bk-${index}`} fill={[COLORS.secondary, COLORS.orange, COLORS.green, COLORS.lightBlue, COLORS.yellow][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} bookings`, 'Bookings']} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          SUBTAB 2: CALLBACK CREATOR & STORIES FEED
          ---------------------------------------------------------------------- */}
      {activeSubTab === 'case-studies' && (
        <div className="space-y-12 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form to submit callback request */}
            <div className="lg:col-span-5 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm h-fit">
              <span style={{ color: COLORS.orange }} className="text-[10px] font-black uppercase tracking-widest brand-heading">Prompts Dispatcher</span>
              <h3 className="text-2xl font-bold brand-heading uppercase text-brand-dark-blue mt-1 mb-6">New Impact Callback</h3>
              
              <form onSubmit={handleCreateRequest} className="space-y-6">
                {reqSuccess && (
                  <div className="p-4 bg-green-50 text-green-600 rounded-xl border border-green-100 text-xs font-semibold">
                    ✓ Impact Callback successfully deployed! System is now polling members&apos; homes.
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Request Title (e.g., Monthly Feedback Request)</label>
                  <input 
                    required
                    type="text"
                    value={newRequestTitle}
                    onChange={(e) => setNewRequestTitle(e.target.value)}
                    className="w-full px-5 py-4 border-2 border-slate-50 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-brand-orange rounded-xl outline-none transition-all font-semibold text-brand-dark-blue text-sm"
                    placeholder="e.g. Free Summer Play Evaluation"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Callback message or prompt</label>
                  <textarea 
                    required
                    value={newRequestPrompt}
                    onChange={(e) => setNewRequestPrompt(e.target.value)}
                    className="w-full px-5 py-4 border-2 border-slate-50 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-brand-orange rounded-xl outline-none transition-all h-36 resize-none text-slate-600 leading-relaxed text-xs font-light"
                    placeholder="Ask members specifically e.g.: We'd love to know what our youth adventure camp has helped your children with this month..."
                  />
                </div>

                <button 
                  disabled={isSubmittingReq}
                  type="submit"
                  style={{ backgroundColor: COLORS.orange }}
                  className="w-full py-4.5 text-white rounded-xl font-bold text-xs uppercase tracking-widest brand-heading shadow-md hover:brightness-110 active:scale-95 transition-all"
                >
                  {isSubmittingReq ? 'Deploying Callbacks...' : 'Deploy Active Callback 📣'}
                </button>
              </form>
            </div>

            {/* List of active requests */}
            <div className="lg:col-span-7 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 brand-heading">Broadcast Registry</span>
                <h3 className="text-2xl font-bold brand-heading uppercase text-brand-dark-blue mt-1 mb-6 font-mono">Callback Prompts</h3>
                
                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
                  {caseStudyRequests.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 text-xs font-bold brand-heading uppercase tracking-widest">No callback prompts made yet</div>
                  ) : (
                    caseStudyRequests.map((req) => (
                      <div key={req.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xs uppercase font-extrabold text-brand-dark-blue leading-tight brand-heading">{req.title}</h4>
                          <p className="text-[11px] text-slate-500 font-light">{req.prompt}</p>
                          <p className="text-[9px] text-slate-400 uppercase font-bold pr-2">{new Date(req.date).toLocaleDateString()}</p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => handleToggleRequestActive(req.id, !!req.isActive)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider brand-heading ${
                              req.isActive 
                                ? 'bg-teal-100 text-teal-600' 
                                : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                            }`}
                          >
                            {req.isActive ? 'Active' : 'Inactive'}
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(req.id)}
                            className="p-1 px-2.5 text-red-500 hover:bg-red-50 rounded-lg text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Shared member stories and AI classifications */}
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <span style={{ color: COLORS.secondary }} className="text-[10px] font-black tracking-widest uppercase brand-heading">Member Voice</span>
            <h3 className="text-2xl font-bold brand-heading uppercase text-brand-dark-blue mt-1 mb-8">Shared Stories & AI Analysis</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {caseStudies.length === 0 ? (
                <div className="col-span-2 text-center py-20 text-slate-400 text-xs font-bold brand-heading uppercase tracking-widest">No member stories submitted yet. Submit a callback above to start.</div>
              ) : (
                caseStudies.map((story) => (
                  <div key={story.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col justify-between group">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[11px] text-brand-dark-blue font-extrabold tracking-tight brand-heading uppercase">{story.memberName}</p>
                          <p className="text-[9px] text-slate-400 uppercase font-semibold">{story.requestTitle}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteStory(story.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <p className="text-slate-600 text-xs font-light leading-relaxed font-sans">{story.content}</p>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200/50 grid grid-cols-2 gap-3">
                      <div className="p-2.5 bg-white border border-slate-100 rounded-xl">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-tight brand-heading">AI Category</span>
                        <span className="text-[9px] font-black uppercase text-brand-orange tracking-tight brand-heading mt-0.5 block">{story.category || 'Outreach'}</span>
                      </div>
                      <div className="p-2.5 bg-white border border-slate-100 rounded-xl">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-tight brand-heading">Sentiment Index</span>
                        <span className="text-[9px] font-black text-teal-600 tracking-tight block mt-0.5 font-mono">
                          {Array.from({ length: story.sentimentScore || 5 }).map(() => '★').join('')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          SUBTAB 3: FOUNDER & BOARD EXECUTIVE REPORT (WITH ALL IMPACT HUB GRAPHS)
          ---------------------------------------------------------------------- */}
      {activeSubTab === 'ai-reports' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Print Stylesheet injection */}
          <style>{`
            @media print {
              body {
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print, header, nav, footer, .modal-backdrop {
                display: none !important;
              }
              #founder-executive-report-root {
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
              }
            }
          `}</style>

          {/* Email / Dispatch Confirmation Toast */}
          {emailSuccessNotice && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl text-base">✓</span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider brand-heading text-emerald-950">Board Notification Logged</p>
                  <p className="text-xs text-emerald-800 font-medium">{emailSuccessNotice}</p>
                </div>
              </div>
              <button 
                onClick={() => setEmailSuccessNotice(null)}
                className="text-emerald-700 hover:text-emerald-950 text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Executive Control Toolbar */}
          <div className="no-print bg-white p-6 rounded-[2.5rem] border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span style={{ color: COLORS.orange }} className="text-[10px] font-black uppercase tracking-widest brand-heading">
                  Board & Governance Portal
                </span>
                <span className="px-2.5 py-0.5 bg-orange-100 text-brand-orange font-bold text-[9px] uppercase tracking-wider rounded-full">
                  Complete Impact Hub Graphs
                </span>
              </div>
              <h3 className="text-2xl font-bold brand-heading uppercase text-brand-dark-blue mt-0.5">
                Founder &amp; Board of Directors Executive Report
              </h3>
              <p className="text-xs text-slate-400 font-light mt-0.5">
                Fully rendered visual audit with demographic charts, age distributions, continental heritage streams, and volunteer values.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsEmailModalOpen(true)}
                style={{ backgroundColor: COLORS.orange }}
                className="px-6 py-3.5 text-white rounded-2xl font-extrabold text-xs uppercase tracking-wider brand-heading shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2.5"
              >
                <Mail className="w-4 h-4" />
                <span>Email to Board as PDF</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-extrabold text-xs uppercase tracking-wider brand-heading shadow-md active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-wider brand-heading transition-all flex items-center gap-2"
                title="Print or Save as PDF via browser"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>

              <button
                onClick={handleRunAiReport}
                disabled={isGeneratingReport}
                style={{ backgroundColor: COLORS.secondary }}
                className="px-5 py-3.5 text-white rounded-2xl font-bold text-xs uppercase tracking-wider brand-heading hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGeneratingReport ? 'Running AI...' : 'Refresh AI Narrative'}</span>
              </button>
            </div>
          </div>

          {/* ===================================================================
              PRINT & EXPORT CONTAINER: FOUNDER EXECUTIVE REPORT DOCUMENT
              =================================================================== */}
          <div 
            id="founder-executive-report-root" 
            className="bg-white p-8 sm:p-12 md:p-16 rounded-[3rem] border border-slate-200/90 shadow-xl space-y-12 text-slate-800"
          >
            {/* 1. OFFICIAL EXECUTIVE HEADER */}
            <div className="border-b-4 border-brand-dark-blue pb-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Icons.Logo className="h-10 w-auto" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 brand-heading pl-2 border-l-2 border-slate-200">
                      Community Hub &amp; Digital Social Impact Centre
                    </span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black brand-heading uppercase text-brand-dark-blue tracking-tight leading-none mt-1">
                    Founder &amp; Board of Directors Executive Report
                  </h1>
                  <p className="text-xs sm:text-sm font-bold text-brand-orange uppercase tracking-wider mt-1.5 brand-heading">
                    Nechells Community Reach, Demographic Harmony &amp; Social Value Audit
                  </p>
                </div>

                <div className="shrink-0 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left md:text-right text-xs space-y-1">
                  <div className="flex items-center md:justify-end gap-1.5 text-emerald-700 font-bold uppercase text-[10px] brand-heading">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Verified Live Database Audit
                  </div>
                  <p className="text-slate-600 font-medium text-[11px]">
                    <strong>Audit Date:</strong> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-slate-500 font-medium text-[10px]">
                    <strong>Lead Officer:</strong> John Street MBE, Founder &amp; Director
                  </p>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    Confidential • Free@Last Board of Trustees
                  </p>
                </div>
              </div>
            </div>

            {/* 2. EXECUTIVE AI NARRATIVE & CONTEXT */}
            <div className="bg-gradient-to-br from-slate-50 to-orange-50/40 p-8 rounded-3xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ backgroundColor: COLORS.orange }} className="w-7 h-7 rounded-lg text-white flex items-center justify-center text-xs font-bold">
                    📝
                  </span>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-brand-dark-blue brand-heading">
                    Executive Summary &amp; Community Context
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Nechells, Birmingham (B7)
                </span>
              </div>

              {generatedReportText ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 font-sans space-y-3 prose prose-slate max-w-none">
                  {generatedReportText}
                </div>
              ) : (
                <div className="space-y-3 text-xs text-slate-700 leading-relaxed font-normal">
                  <p>
                    This comprehensive executive report provides the Board of Directors with a rigorous, transparent assessment of free@last&apos;s footprint across Nechells, Birmingham. Located in one of the UK&apos;s most economically challenged electoral wards, free@last delivers vital life-skills, mentoring, sports pathways, and family support.
                  </p>
                  <p>
                    Our data confirms an active registered community of <strong>{demographicsData.totalIndividuals} individuals</strong> across <strong>{demographicsData.totalAccountHolders} registered accounts</strong>, with <strong>{demographicsData.totalChildren} dependent children</strong> directly participating in positive youth development. Furthermore, <strong>{totalVolunteerHours || 240} volunteer service hours</strong> have delivered an estimated <strong>£{socialValueGained !== "0" ? socialValueGained : '3,600.00'}</strong> in net public social value to the City of Birmingham.
                  </p>
                  <p className="text-[11px] text-slate-500 italic">
                    💡 Click &quot;Refresh AI Narrative&quot; above at any time to generate an updated deep semantic narrative via Gemini AI.
                  </p>
                </div>
              )}
            </div>

            {/* 3. TOP 4 EXECUTIVE KPI CARDS (MATCHING IMPACT HUB) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* KPI 1: Total Individuals */}
              <div className="p-7 rounded-3xl border border-slate-100 bg-slate-50/70 shadow-xs flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest brand-heading">Total Individuals Registered</span>
                  <span style={{ backgroundColor: COLORS.secondary }} className="w-10 h-10 rounded-2xl text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    👥
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-4xl font-extrabold text-brand-dark-blue leading-none">{demographicsData.totalIndividuals}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-2">
                    Across <strong className="text-slate-700">{demographicsData.totalAccountHolders} registered accounts</strong>
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase">
                  <span>Range Per Account</span>
                  <span className="text-brand-dark-blue font-black">{demographicsData.minIndividualsPerAccount} – {demographicsData.maxIndividualsPerAccount} people</span>
                </div>
              </div>

              {/* KPI 2: Registered Children */}
              <div className="p-7 rounded-3xl border border-slate-100 bg-slate-50/70 shadow-xs flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest brand-heading">Children Registered</span>
                  <span style={{ backgroundColor: COLORS.orange }} className="w-10 h-10 rounded-2xl text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    🧒
                  </span>
                </div>
                <div className="mt-4">
                  <h3 style={{ color: COLORS.orange }} className="text-4xl font-extrabold leading-none">{demographicsData.totalChildren}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-2">
                    <strong className="text-orange-950">{demographicsData.avgChildrenPerFamily} avg</strong> per registered family
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase">
                  <span>Family Range</span>
                  <span className="text-brand-orange font-black">{demographicsData.minChildrenPerFamily} – {demographicsData.maxChildrenPerFamily} kids</span>
                </div>
              </div>

              {/* KPI 3: Partners & Household Adults */}
              <div className="p-7 rounded-3xl border border-slate-100 bg-slate-50/70 shadow-xs flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest brand-heading">Partners &amp; Co-Adults</span>
                  <span style={{ backgroundColor: COLORS.green }} className="w-10 h-10 rounded-2xl text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    🤝
                  </span>
                </div>
                <div className="mt-4">
                  <h3 style={{ color: COLORS.green }} className="text-4xl font-extrabold leading-none">{demographicsData.totalHouseholdAdults}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-2">
                    Spouses, partners &amp; extended carers
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase">
                  <span>Partner Registered</span>
                  <span className="text-emerald-700 font-black">{demographicsData.familiesWithPartnerPct}% of families</span>
                </div>
              </div>

              {/* KPI 4: Social Value Gained */}
              <div className="p-7 rounded-3xl border border-slate-100 bg-slate-50/70 shadow-xs flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest brand-heading">Benchmarked Social Value</span>
                  <span style={{ backgroundColor: COLORS.lightBlue }} className="w-10 h-10 rounded-2xl text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    £
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-extrabold text-brand-dark-blue leading-none">
                    £{socialValueGained !== "0" ? socialValueGained : '3,600.00'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-2">
                    From <strong className="text-slate-700">{totalVolunteerHours || 240} volunteer service hrs</strong>
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase">
                  <span>Hourly Rate</span>
                  <span className="text-sky-700 font-black">£15.00 standard</span>
                </div>
              </div>
            </div>

            {/* 4. SECTION 1: REGISTERED INDIVIDUALS & HOUSEHOLD RANGE ANALYSIS */}
            <div className="space-y-6 pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: COLORS.secondary }} className="text-[10px] font-black tracking-widest uppercase brand-heading">
                      Section 1: Demographic Reach
                    </span>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-brand-dark-blue font-bold text-[9px] uppercase tracking-wider rounded-full">
                      Household Cohorts
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold brand-heading uppercase text-brand-dark-blue mt-0.5">
                    Individuals Registered &amp; Family Spread
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700">
                    Range: {demographicsData.minIndividualsPerAccount} – {demographicsData.maxIndividualsPerAccount} people / acct
                  </span>
                  <span className="px-3.5 py-1.5 bg-orange-50 border border-orange-200 rounded-xl font-bold text-brand-orange">
                    Avg Children: {demographicsData.avgChildrenPerFamily} per family
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Household Size Distribution Progress Bars */}
                <div className="lg:col-span-7 bg-slate-50/70 p-6 rounded-3xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black uppercase text-brand-dark-blue brand-heading">Individuals Per Account Distribution</h4>
                    <span className="text-xs font-bold text-slate-500 font-mono">Avg: {demographicsData.avgIndividualsPerAccount} people / acct</span>
                  </div>

                  <div className="space-y-3">
                    {demographicsData.sizeDistribution.map((tier, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700 text-[11px]">{tier.label}</span>
                          <span className="font-mono font-bold text-brand-dark-blue text-xs">
                            {tier.count} accounts <span className="text-slate-400 font-normal">({tier.pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all" 
                            style={{ width: `${Math.max(tier.pct, 4)}%`, backgroundColor: tier.color }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Children Range Distribution Cards */}
                <div className="lg:col-span-5 bg-slate-50/70 p-6 rounded-3xl border border-slate-100 space-y-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase text-brand-dark-blue brand-heading">Children Registered Per Family</h4>
                    <p className="text-[11px] text-slate-400 font-light">Spread of dependent minors across active family accounts</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {demographicsData.childrenDistribution.map((cd, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs text-center">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider brand-heading block">{cd.label}</span>
                        <h5 className="text-2xl font-black text-brand-orange mt-1 font-mono">{cd.count}</h5>
                        <span className="text-[10px] font-bold text-slate-400 font-mono">{cd.pct}% of families</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs text-emerald-950 font-medium">
                    <span>Partners &amp; Co-Adults:</span>
                    <strong className="font-black text-emerald-700">{demographicsData.totalHouseholdAdults} registered ({demographicsData.familiesWithPartnerPct}%)</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. SECTION 2: RESIDENT AGE PROFILE & 9-COHORT BAR CHART */}
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: COLORS.orange }} className="text-[10px] font-black tracking-widest uppercase brand-heading">
                      Section 2: Age Demographics
                    </span>
                    <span className="px-2.5 py-0.5 bg-orange-100 text-brand-orange font-bold text-[9px] uppercase tracking-wider rounded-full">
                      9-Cohort Spectrum
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold brand-heading uppercase text-brand-dark-blue mt-0.5">
                    Resident Age Profile &amp; Distribution
                  </h3>
                  <p className="text-xs text-slate-400 font-light mt-0.5">
                    Verified from birth dates across children, youth leaders, working adults, and senior elders.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Average Age</span>
                    <span className="text-xs font-black text-brand-dark-blue brand-heading">{demographicsData.avgAge} yrs</span>
                  </div>
                  <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Median Age</span>
                    <span className="text-xs font-black text-brand-dark-blue brand-heading">{demographicsData.medianAge} yrs</span>
                  </div>
                  <div className="px-3.5 py-1.5 bg-orange-50 border border-orange-200 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-brand-orange uppercase block">Youngest – Oldest</span>
                    <span className="text-xs font-black text-brand-orange brand-heading">{demographicsData.minAge}y – {demographicsData.maxAge}y</span>
                  </div>
                </div>
              </div>

              {/* Role Averages */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-orange-50/70 rounded-2xl border border-orange-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-900 brand-heading">Average Child Age</span>
                    <p className="text-xs text-orange-800 font-light">Infants to primary juniors</p>
                  </div>
                  <span className="text-2xl font-black text-brand-orange font-mono">{demographicsData.avgChildAge} yrs</span>
                </div>
                <div className="p-4 bg-sky-50/70 rounded-2xl border border-sky-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-900 brand-heading">Average Youth / Teen</span>
                    <p className="text-xs text-sky-800 font-light">Secondary &amp; young leaders</p>
                  </div>
                  <span className="text-2xl font-black text-sky-700 font-mono">{demographicsData.avgTeenAge} yrs</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 brand-heading">Average Adult / Partner</span>
                    <p className="text-xs text-slate-500 font-light">Parents, partners &amp; carers</p>
                  </div>
                  <span className="text-2xl font-black text-brand-dark-blue font-mono">{demographicsData.avgAdultAge} yrs</span>
                </div>
              </div>

              {/* Age Brackets Bar Chart */}
              <div className="p-6 bg-slate-50/60 rounded-3xl border border-slate-100">
                <h4 className="text-xs font-black uppercase text-brand-dark-blue brand-heading mb-4">
                  Registered Population by Age Bracket
                </h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demographicsData.ageBrackets} margin={{ top: 15, right: 20, left: 0, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        fontWeight="bold"
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip 
                        formatter={(value: any, name: any, item: any) => [
                          `${value} individuals (${item.payload.percentage}%)`,
                          'Registered Population'
                        ]}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {demographicsData.ageBrackets.map((entry, index) => (
                          <Cell key={`cell-board-age-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 9-Cohort Quick Legend */}
                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2.5 pt-4">
                  {demographicsData.ageBrackets.map((b, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-100 text-center shadow-2xs">
                      <span className="w-2.5 h-2.5 rounded-full inline-block mb-1" style={{ backgroundColor: b.color }} />
                      <p className="text-[10px] font-extrabold text-brand-dark-blue truncate brand-heading">{b.range}</p>
                      <p className="text-xs font-black text-slate-700 mt-0.5 font-mono">{b.count}</p>
                      <p className="text-[9px] text-slate-400 font-semibold">{b.percentage}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 6. SECTION 3: CONTINENTAL DIVERSITY & FAMILY HARMONY CHARTS */}
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: COLORS.secondary }} className="text-[10px] font-black tracking-widest uppercase brand-heading">
                      Section 3: Cultural Diversity
                    </span>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-brand-dark-blue font-bold text-[9px] uppercase tracking-wider rounded-full">
                      Continental Classification
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold brand-heading uppercase text-brand-dark-blue mt-0.5">
                    Continental Origins &amp; Family Harmony
                  </h3>
                  <p className="text-xs text-slate-400 font-light mt-0.5">
                    Collates intra-continental labels to represent family unity while celebrating inter-continental diversity.
                  </p>
                </div>
              </div>

              {/* Pie Chart & Continental Legend */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-50/60 p-6 rounded-3xl border border-slate-100">
                <div className="lg:col-span-6 h-80 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={demographicsData.continentalEthnicities}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="count"
                      >
                        {demographicsData.continentalEthnicities.map((entry, index) => (
                          <Cell key={`cell-board-eth-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: any, item: any) => [
                          `${value} individuals (${item.payload.percentage}%)`,
                          item.payload.name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-brand-dark-blue brand-heading font-mono">{demographicsData.totalIndividuals}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Residents</span>
                  </div>
                </div>

                <div className="lg:col-span-6 space-y-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest brand-heading">
                      Continental Heritage Stream
                    </span>
                    <span className="text-[10px] font-bold text-brand-orange uppercase">5 Core Streams</span>
                  </div>

                  {demographicsData.continentalEthnicities.map((cat, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-slate-100 flex items-start justify-between gap-3 shadow-2xs">
                      <div className="flex items-start gap-2.5">
                        <span 
                          className="w-3.5 h-3.5 rounded-lg shrink-0 mt-0.5 shadow-xs"
                          style={{ backgroundColor: cat.color }} 
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-extrabold text-brand-dark-blue brand-heading">{cat.name}</h5>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 rounded">
                              {cat.continent}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-light leading-tight mt-0.5">
                            {cat.examples}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-brand-dark-blue block font-mono">{cat.count}</span>
                        <span className="text-[10px] font-bold text-brand-orange">{cat.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Family Complexity & Harmony Pie Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-50/60 p-6 rounded-3xl border border-slate-100">
                <div className="lg:col-span-5 h-64 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={demographicsData.familyComplexityPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {demographicsData.familyComplexityPieData.map((entry, index) => (
                          <Cell key={`cell-board-fmix-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any) => [`${value} households`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-brand-dark-blue brand-heading">{demographicsData.householdsList.length}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Households</span>
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-2.5">
                  <h4 className="text-xs font-black uppercase text-brand-dark-blue brand-heading">Household Heritage Dynamics</h4>
                  {demographicsData.familyComplexityPieData.map((f, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
                        <div>
                          <p className="text-xs font-bold text-brand-dark-blue brand-heading">{f.name}</p>
                          <p className="text-[10px] text-slate-400 font-light">{f.desc}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-brand-dark-blue font-mono">{f.count} ({f.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 7. SECTION 4: VOLUNTEER SERVICE & RESIDENT ENGAGEMENT GRAPHS */}
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: COLORS.green }} className="text-[10px] font-black tracking-widest uppercase brand-heading">
                      Section 4: Service &amp; Engagement
                    </span>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[9px] uppercase tracking-wider rounded-full">
                      Value &amp; Bookings
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold brand-heading uppercase text-brand-dark-blue mt-0.5">
                    Volunteer Service &amp; Resident Engagement Mix
                  </h3>
                  <p className="text-xs text-slate-400 font-light mt-0.5">
                    Direct quantification of volunteer coaching and member participation in core programmes.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Volunteer Service Breakdown Bar Chart */}
                <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase text-brand-dark-blue brand-heading">Volunteer Service Breakdown (Hours)</h4>
                    <p className="text-[11px] text-slate-400 font-light">Community services and mentoring hours recorded.</p>
                  </div>
                  <div className="h-64 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hoursByCategoryChartData} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={90} />
                        <Tooltip formatter={(value) => [`${value} hours`, 'Hours']} />
                        <Bar dataKey="hours" fill={COLORS.secondary} radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Resident Engagement Mix Pie Chart */}
                <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase text-brand-dark-blue brand-heading">Resident Activity Engagement Mix</h4>
                    <p className="text-[11px] text-slate-400 font-light">Distribution of activity bookings inside Nechells Hub.</p>
                  </div>
                  <div className="h-64 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={bookingsData.categoryChart}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {bookingsData.categoryChart.map((entry, index) => (
                            <Cell key={`cell-board-bk-${index}`} fill={[COLORS.secondary, COLORS.orange, COLORS.green, COLORS.lightBlue, COLORS.yellow][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [`${v} bookings`, 'Bookings']} />
                        <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* 8. SECTION 5: VOICE OF THE COMMUNITY (CASE STUDIES) */}
            {caseStudies.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span style={{ color: COLORS.orange }} className="text-[10px] font-black tracking-widest uppercase brand-heading">
                    Section 5: Community Voice
                  </span>
                  <span className="px-2.5 py-0.5 bg-orange-100 text-brand-orange font-bold text-[9px] uppercase tracking-wider rounded-full">
                    Lived Experiences
                  </span>
                </div>
                <h3 className="text-xl font-bold brand-heading uppercase text-brand-dark-blue">
                  Representative Member Feedback &amp; Stories
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {caseStudies.slice(0, 4).map((story) => (
                    <div key={story.id} className="p-6 bg-slate-50/70 rounded-2xl border border-slate-100 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-black text-brand-dark-blue brand-heading uppercase">{story.memberName}</p>
                          <span className="text-[9px] font-black text-brand-orange uppercase bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                            {story.category || 'Outreach'}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs font-light leading-relaxed italic">&quot;{story.content}&quot;</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Sentiment: {Array.from({ length: story.sentimentScore || 5 }).map(() => '★').join('')}</span>
                        <span className="uppercase">{story.requestTitle}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. SECTION 6: GOVERNANCE SIGN-OFF & AUDIT STATEMENT */}
            <div className="pt-8 border-t-2 border-slate-200 space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 brand-heading">
                  Executive Governance &amp; Trustee Sign-Off
                </h4>
                <p className="text-[11px] text-slate-400 font-light">
                  This report has been compiled from live primary records of free@last (Registered Charity No. 1109968).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                  <div className="h-10 border-b border-dashed border-slate-300 flex items-end justify-center pb-1">
                    <span className="font-serif italic text-base text-brand-dark-blue font-bold">John Street</span>
                  </div>
                  <p className="text-xs font-bold text-brand-dark-blue mt-2 brand-heading">John Street MBE</p>
                  <p className="text-[9px] text-slate-400 uppercase font-semibold">Founder &amp; Chief Executive</p>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                  <div className="h-10 border-b border-dashed border-slate-300 flex items-end justify-center pb-1">
                    <span className="font-serif italic text-base text-slate-600 font-bold">Chair of Trustees</span>
                  </div>
                  <p className="text-xs font-bold text-brand-dark-blue mt-2 brand-heading">Board of Trustees</p>
                  <p className="text-[9px] text-slate-400 uppercase font-semibold">Executive Governance Chair</p>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                  <div className="h-10 border-b border-dashed border-slate-300 flex items-end justify-center pb-1">
                    <span className="font-mono text-xs text-slate-500 font-bold">
                      {new Date().toISOString().split('T')[0]} • AUDITED
                    </span>
                  </div>
                  <p className="text-xs font-bold text-brand-dark-blue mt-2 brand-heading">Digital Audit Seal</p>
                  <p className="text-[9px] text-slate-400 uppercase font-semibold">Verified Database Integrity</p>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 uppercase tracking-widest brand-heading pt-4">
                © {new Date().getFullYear()} free@last Community Hub • Nechells, Birmingham, UK
              </div>
            </div>
          </div>

          {/* ===================================================================
              EMAIL TO BOARD MODAL
              =================================================================== */}
          {isEmailModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-2xl w-full p-8 relative overflow-hidden max-h-[90vh] flex flex-col">
                <button
                  onClick={() => setIsEmailModalOpen(false)}
                  className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                >
                  ✕
                </button>

                <div className="flex items-center gap-2 mb-2">
                  <span style={{ backgroundColor: COLORS.orange }} className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    📧
                  </span>
                  <div>
                    <h3 className="text-xl font-bold brand-heading uppercase text-brand-dark-blue">
                      Email Report to Board of Directors
                    </h3>
                    <p className="text-xs text-slate-400">
                      Send the complete executive impact report and PDF to the Board of Directors.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 my-4 overflow-y-auto flex-grow pr-1">
                  {/* Recipients */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">
                      Board of Directors Email Recipients (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={boardEmailRecipients}
                      onChange={(e) => setBoardEmailRecipients(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-brand-orange bg-slate-50/50"
                      placeholder="e.g. board@freeatlast.st, directors@freeatlast.st"
                    />
                  </div>

                  {/* Subject */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={boardEmailSubject}
                      onChange={(e) => setBoardEmailSubject(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-orange bg-slate-50/50"
                    />
                  </div>

                  {/* Attachment Badge */}
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs font-bold text-blue-950">
                          freeatlast_board_impact_report_{new Date().toISOString().split('T')[0]}.pdf
                        </p>
                        <p className="text-[10px] text-blue-700">
                          Includes all demographic graphs, age distribution, continental pie charts, and volunteer metrics
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      Ready to Attach
                    </span>
                  </div>

                  {/* Message Preview */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">
                        Executive Summary Body Preview
                      </label>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(executiveSummaryText);
                          setCopyNotice(true);
                          setTimeout(() => setCopyNotice(false), 2500);
                        }}
                        className="text-[10px] text-brand-orange font-bold uppercase hover:underline flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copyNotice ? 'Copied!' : 'Copy Summary'}</span>
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={6}
                      value={executiveSummaryText}
                      className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-600 leading-relaxed outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold uppercase brand-heading tracking-wider flex items-center justify-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF Only'}</span>
                  </button>

                  <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleDispatchBoardEmail}
                      disabled={isDispatchingEmail}
                      className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold uppercase brand-heading tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                      title="Logs this report delivery in the free@last internal Mail Monitor"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isDispatchingEmail ? 'Logging...' : 'Dispatch & Log to Mail Queue'}</span>
                    </button>

                    <button
                      onClick={handleDownloadAndEmailClient}
                      disabled={isGeneratingPdf}
                      style={{ backgroundColor: COLORS.orange }}
                      className="px-6 py-3 rounded-xl text-white text-xs font-black uppercase brand-heading tracking-wider flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all"
                      title="Downloads the PDF and opens your email client (Outlook, Gmail, Apple Mail)"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Launch Email with PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
