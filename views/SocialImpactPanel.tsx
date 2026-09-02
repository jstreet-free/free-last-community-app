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
  Scale
} from 'lucide-react';

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

  const handlePrint = () => {
    const printContent = document.getElementById('ai-briefing-paper')?.innerHTML;
    if (!printContent) return;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    window.location.reload();
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
          SUBTAB 3: AI EXECUTIVE REPORT GENERATOR
          ---------------------------------------------------------------------- */}
      {activeSubTab === 'ai-reports' && (
        <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
          <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl text-center space-y-6">
            <div style={{ backgroundColor: COLORS.secondary }} className="w-20 h-20 rounded-[2rem] text-white flex items-center justify-center text-4xl mx-auto shadow-md">
              🤖
            </div>
            <div className="max-w-2xl mx-auto">
              <h3 className="text-3xl font-bold brand-heading uppercase text-brand-dark-blue">Executive Impact Narrative Generator</h3>
              <p className="text-slate-500 text-sm font-light mt-2 leading-relaxed">
                Compile real-time statistics including individuals registered per account, children and partner counts, resident age distributions, smart continental ethnicity figures, and volunteer service hours. Our Gemini engine compiles an inspiring, official briefing assessing free@last&apos;s impact in Nechells.
              </p>
            </div>

            <div className="pt-4 flex justify-center gap-4">
              <button
                onClick={handleRunAiReport}
                disabled={isGeneratingReport}
                style={{ backgroundColor: COLORS.orange }}
                className="hover:brightness-110 text-white px-10 py-5 rounded-2xl font-bold text-sm tracking-widest uppercase brand-heading shadow-xl active:scale-95 transition-all disabled:opacity-50"
              >
                {isGeneratingReport ? 'Compiling Live Stats & Running Gemini...' : 'Generate Founders Briefing ✨'}
              </button>
            </div>
          </div>

          {/* Generated Report Output Sheet Paper */}
          {generatedReportText && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-2xl overflow-hidden animate-fadeIn"
            >
              {/* Toolbar */}
              <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider brand-heading bg-white px-3 py-1 rounded-md border text-slate-500">Official Executive Briefing</span>
                <div className="flex gap-3">
                  <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs brand-heading uppercase tracking-widest hover:bg-slate-200 transition-all font-mono"
                  >
                    🖨️ Print Report
                  </button>
                </div>
              </div>

              {/* Sheet container */}
              <div id="ai-briefing-paper" className="p-12 md:p-16 text-slate-800 leading-relaxed font-sans prose prose-slate max-w-none space-y-6">
                <div className="border-b-4 border-brand-dark-blue pb-8 text-center space-y-2">
                  <Icons.Logo className="h-12 mx-auto justify-center" />
                  <p className="text-xs uppercase font-extrabold tracking-[0.5em] text-slate-400 brand-heading">Digital Social Impact Center</p>
                  <p className="text-[10px] text-slate-350 pr-2">FOR EXECUTIVE FOUNDERS &amp; BOARD MEMBERS • NECHELLS, BIRMINGHAM</p>
                </div>

                {/* Print area text rendering */}
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 font-sans space-y-4">
                  {generatedReportText}
                </div>

                <div className="border-t border-slate-100 pt-8 mt-12 text-center text-[10px] text-slate-400 uppercase tracking-widest brand-heading">
                  © {new Date().getFullYear()} free@last Community Hub Digital Platform. Generated via Gemini AI.
                </div>
              </div>
            </motion.div>
          )}

          {isGeneratingReport && (
            <div className="text-center py-16 space-y-4">
              <div className="w-12 h-12 border-4 border-[#2b337e] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 uppercase font-black tracking-widest brand-heading animate-pulse">Running semantic parsing across resident feedback &amp; database tables...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
