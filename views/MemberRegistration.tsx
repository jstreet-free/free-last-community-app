
import React, { useState, useEffect } from 'react';
import { User, MemberProfile, ChildProfile, HouseholdAdult } from '../types';
import { Icons, COLORS } from '../constants';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getHouseholdId, getHouseholdInviteCode, linkAdultAccount, findHousehold } from '../services/householdService';

interface MemberRegistrationProps {
  user: User;
  onComplete: (profile: MemberProfile) => void;
}

type Step = 'type' | 'parent' | 'teenager' | 'children' | 'consent' | 'link_household';

export const MemberRegistration: React.FC<MemberRegistrationProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState<Step>(user.profile ? 'parent' : 'type');
  const [registrationType, setRegistrationType] = useState<'family' | 'teenager' | 'friend' | 'individual' | 'household_adult' | null>(() => {
    return (user.profile?.registrationType as any) || (user.householdRole === 'adult' ? 'household_adult' : null);
  });
  
  const [isBlocked, setIsBlocked] = useState(false);

  // Household Linking state for adult registration
  const [householdLookup, setHouseholdLookup] = useState('');
  const [isSearchingHousehold, setIsSearchingHousehold] = useState(false);
  const [foundHousehold, setFoundHousehold] = useState<User | null>(null);
  const [householdLookupError, setHouseholdLookupError] = useState<string | null>(null);
  const [adultRelationshipToPrimary, setAdultRelationshipToPrimary] = useState('Partner / Spouse');
  const [adultPersonalMobile, setAdultPersonalMobile] = useState('');
  const [adultPersonalName, setAdultPersonalName] = useState(user.name || '');

  // Parent / Common Info
  const [parentInfo, setParentInfo] = useState({
    parentName: user.profile?.parentName || user.name || '',
    familyName: user.profile?.familyName || '',
    address: user.profile?.address || '',
    postcode: user.profile?.postcode || '',
    parentEmail: user.profile?.parentEmail || user.email || '',
    parentMobile: user.profile?.parentMobile || '',
    livingWith: user.profile?.livingWith || '',
    ethnicity: user.profile?.ethnicity || '',
    religion: user.profile?.religion || '',
  });

  // Other Adults in Household
  const [otherAdults, setOtherAdults] = useState<HouseholdAdult[]>(() => {
    return user.profile?.otherAdults || user.profile?.householdAdults || [];
  });
  const [currentAdult, setCurrentAdult] = useState<HouseholdAdult>({
    name: '',
    relationship: 'Partner / Spouse',
    mobile: '',
    email: '',
    hasOwnAccount: true,
  });
  const [editingAdultIndex, setEditingAdultIndex] = useState<number | null>(null);
  const [isAddingAdultFormOpen, setIsAddingAdultFormOpen] = useState(false);

  const handleSaveAdult = () => {
    if (!currentAdult.name.trim()) {
      setError("Please enter the adult's full name.");
      return;
    }
    const adultToSave: HouseholdAdult = {
      ...currentAdult,
      hasOwnAccount: currentAdult.hasOwnAccount ?? true,
      linkedUserEmail: currentAdult.email ? currentAdult.email.trim().toLowerCase() : undefined,
      accountStatus: currentAdult.email ? 'invited' : undefined
    };

    if (editingAdultIndex !== null) {
      const updated = [...otherAdults];
      updated[editingAdultIndex] = adultToSave;
      setOtherAdults(updated);
      setEditingAdultIndex(null);
    } else {
      setOtherAdults([...otherAdults, adultToSave]);
    }
    setCurrentAdult({
      name: '',
      relationship: 'Partner / Spouse',
      mobile: '',
      email: '',
      hasOwnAccount: true,
    });
    setIsAddingAdultFormOpen(false);
    setError(null);
  };

  const handleStartEditAdult = (idx: number) => {
    setCurrentAdult(otherAdults[idx]);
    setEditingAdultIndex(idx);
    setIsAddingAdultFormOpen(true);
  };

  const handleRemoveAdult = (idx: number) => {
    setOtherAdults(otherAdults.filter((_, i) => i !== idx));
  };

  // Teenager Info
  const [teenagerInfo, setTeenagerInfo] = useState({
    name: user.profile?.teenagerDetails?.name || user.name || '',
    dob: user.profile?.teenagerDetails?.dob || '',
    age: user.profile?.teenagerDetails?.age || 0,
    ownMobile: user.profile?.teenagerDetails?.ownMobile || '',
    ownEmail: user.profile?.teenagerDetails?.ownEmail || user.email || '',
    schoolCollege: user.profile?.teenagerDetails?.schoolCollege || '',
    dietaryAllergies: user.profile?.teenagerDetails?.dietaryAllergies || '',
    medicalConditions: user.profile?.teenagerDetails?.medicalConditions || '',
    medication: user.profile?.teenagerDetails?.medication || '',
    canSwim: user.profile?.teenagerDetails?.canSwim || false,
    swimDistance: user.profile?.teenagerDetails?.swimDistance || '',
    parentName: user.profile?.parentName || '',
    parentMobile: user.profile?.parentMobile || '',
    medicalConsent: user.profile?.teenagerDetails?.medicalConsent || false,
    mediaConsent: user.profile?.teenagerDetails?.mediaConsent || false,
    ethnicity: user.profile?.teenagerDetails?.ethnicity || '',
    religion: user.profile?.teenagerDetails?.religion || '',
  });

  const getInitialCollectionContacts = (child?: Partial<ChildProfile>) => {
    if (child?.collectionContacts && child.collectionContacts.length > 0) {
      return [
        child.collectionContacts[0] || { name: '', mobile: '' },
        child.collectionContacts[1] || { name: '', mobile: '' },
        child.collectionContacts[2] || { name: '', mobile: '' },
      ];
    }
    if (child?.collectionPermissions && child.collectionPermissions.length > 0) {
      return [
        { name: child.collectionPermissions[0] || '', mobile: '' },
        { name: child.collectionPermissions[1] || '', mobile: '' },
        { name: child.collectionPermissions[2] || '', mobile: '' },
      ];
    }
    return [
      { name: '', mobile: '' },
      { name: '', mobile: '' },
      { name: '', mobile: '' },
    ];
  };

  // Children Info (for Family mode)
  const [children, setChildren] = useState<ChildProfile[]>(() => {
    return user.profile?.children || [];
  });
  const [currentChild, setCurrentChild] = useState<Partial<ChildProfile>>({
    name: '',
    dob: '',
    age: 0,
    address: '',
    ownMobile: '',
    ownEmail: '',
    schoolCollege: '',
    dietaryAllergies: '',
    medicalConditions: '',
    medication: '',
    canSwim: false,
    swimDistance: '',
    medicalConsent: false,
    mediaConsent: false,
    canWalkHome: false,
    walkHomeOrCollected: 'collected',
    collectionContacts: [
      { name: '', mobile: '' },
      { name: '', mobile: '' },
      { name: '', mobile: '' }
    ],
    collectionPermissions: ['', '', ''],
    ethnicity: '',
    religion: '',
  });

  const [editingChildIndex, setEditingChildIndex] = useState<number | null>(null);

  const startEditChild = (index: number) => {
    const childToEdit = children[index];
    const contacts = getInitialCollectionContacts(childToEdit);
    setCurrentChild({
      ...childToEdit,
      canWalkHome: childToEdit.canWalkHome || childToEdit.walkHomeOrCollected === 'walk_home' || false,
      walkHomeOrCollected: childToEdit.walkHomeOrCollected || (childToEdit.canWalkHome ? 'walk_home' : 'collected'),
      collectionContacts: contacts,
      collectionPermissions: contacts.map(c => c.name)
    });
    setEditingChildIndex(index);
  };

  const [dataConsent, setDataConsent] = useState(user.profile?.dataConsent || false);
  const [error, setError] = useState<string | null>(null);

  // Age calculation helper
  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    if (teenagerInfo.dob) {
      setTeenagerInfo(prev => ({ ...prev, age: calculateAge(prev.dob) }));
    }
  }, [teenagerInfo.dob]);

  useEffect(() => {
    if (currentChild.dob) {
      setCurrentChild(prev => ({ ...prev, age: calculateAge(prev.dob || '') }));
    }
  }, [currentChild.dob]);

  const handleAddChild = () => {
    setError(null);
    if (!currentChild.name || !currentChild.dob) {
      setError("Please enter at least the child's name and date of birth.");
      return;
    }
    
    const validContacts = (currentChild.collectionContacts || [])
      .filter(c => c.name.trim() !== '' || c.mobile.trim() !== '')
      .map(c => ({ name: c.name.trim(), mobile: c.mobile.trim() }));

    const legacyPermissions = validContacts
      .filter(c => c.name !== '')
      .map(c => c.mobile ? `${c.name} (${c.mobile})` : c.name);

    const newChild: ChildProfile = {
      ...(currentChild as ChildProfile),
      canWalkHome: currentChild.canWalkHome || currentChild.walkHomeOrCollected === 'walk_home' || false,
      walkHomeOrCollected: currentChild.canWalkHome || currentChild.walkHomeOrCollected === 'walk_home' ? 'walk_home' : 'collected',
      collectionContacts: validContacts,
      collectionPermissions: legacyPermissions
    };
    
    if (editingChildIndex !== null) {
      const updatedChildren = [...children];
      updatedChildren[editingChildIndex] = newChild;
      setChildren(updatedChildren);
      setEditingChildIndex(null);
    } else {
      setChildren([...children, newChild]);
    }
    
    setCurrentChild({
      name: '',
      dob: '',
      age: 0,
      address: '',
      ownMobile: '',
      ownEmail: '',
      schoolCollege: '',
      dietaryAllergies: '',
      medicalConditions: '',
      medication: '',
      canSwim: false,
      swimDistance: '',
      medicalConsent: false,
      mediaConsent: false,
      canWalkHome: false,
      walkHomeOrCollected: 'collected',
      collectionContacts: [
        { name: '', mobile: '' },
        { name: '', mobile: '' },
        { name: '', mobile: '' }
      ],
      collectionPermissions: ['', '', ''],
      ethnicity: '',
      religion: '',
    });
  };

  const handleRemoveChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const handleRegisterAsFriend = () => {
    onComplete({
      registrationType: 'family',
      parentName: parentInfo.parentName || user.name || '',
      address: parentInfo.address,
      postcode: parentInfo.postcode,
      parentEmail: parentInfo.parentEmail || user.email || '',
      parentMobile: parentInfo.parentMobile,
      livingWith: parentInfo.livingWith,
      isFriendSignup: true,
    } as any);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const address = parentInfo.address || '';
    const postcode = parentInfo.postcode || '';

    const hasNechells = address.toLowerCase().includes('nechells') || postcode.toLowerCase().includes('nechells');
    
    // Check if string contains "Nechells" or B7 postcode
    const hasB7Postcode = (str: string) => {
      const clean = str.trim().toUpperCase();
      if (/\bB7\b/i.test(clean)) return true;
      if (/\bB7\s+\d/i.test(clean)) return true;
      if (/\bB7[45]/i.test(clean) && !/\bB7[0-36-9]/i.test(clean)) return true;
      return false;
    };
    
    const isPostcodeB7 = hasB7Postcode(postcode) || hasB7Postcode(address);
    const isAddressNechells = hasNechells;

    // Allow registration if user has B7 postcode OR lives in Nechells
    if (!isPostcodeB7 && !isAddressNechells) {
      const personName = registrationType === 'teenager' ? teenagerInfo.name : parentInfo.parentName;
      
      const raiseWarning = async () => {
        try {
          await addDoc(collection(db, 'warnings'), {
            type: 'member_registration_blocked',
            title: 'Member Registration Stopped',
            message: `${personName} tried to register as a Member but was stopped because they do not live in Nechells or have a B7 postcode.`,
            personName,
            userEmail: user.email || parentInfo.parentEmail || '',
            details: {
              address,
              postcode,
              registrationType
            },
            timestamp: new Date().toISOString()
          });

          await addDoc(collection(db, 'mail'), {
            to: ['jstreet@freeatlast.co.uk'],
            replyTo: user.email || 'no-reply@freeatlast.co.uk',
            message: {
              subject: `⚠️ WARNING: Member Registration Blocked (${personName})`,
              text: `Warning: A member registration was stopped because they do not live in Nechells or have a B7 postcode.\nName: ${personName}\nEmail: ${user.email || parentInfo.parentEmail}\nAddress: ${address}\nPostcode: ${postcode}\nType: ${registrationType}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; border: 2px solid #e11d48; padding: 20px; border-radius: 15px;">
                  <h2 style="color: #e11d48; margin-top: 0;">⚠️ Member Registration Blocked</h2>
                  <p>A user tried to register as a Member but was stopped because they do not live in Nechells or have a B7 postcode.</p>
                  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                  <div style="background: #fff5f5; padding: 15px; border-radius: 10px; border: 1px solid #fee2e2;">
                    <p style="margin: 5px 0;"><strong>Name:</strong> ${personName}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email || parentInfo.parentEmail}</p>
                    <p style="margin: 5px 0;"><strong>Address:</strong> ${address}</p>
                    <p style="margin: 5px 0;"><strong>Postcode:</strong> ${postcode || 'None'}</p>
                    <p style="margin: 5px 0;"><strong>Registration Type:</strong> ${registrationType}</p>
                    <p style="margin: 5px 0;"><strong>Attempt Date:</strong> ${new Date().toLocaleString()}</p>
                  </div>
                  <p style="font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
                    free@last Hub Automated Security Alert
                  </p>
                </div>
              `
            }
          });
        } catch (err) {
          console.error("Error raising warning:", err);
        }
      };

      raiseWarning();
      setIsBlocked(true);
      return;
    }
    
    if (registrationType === 'teenager') {
      onComplete({
        registrationType: 'teenager',
        parentName: parentInfo.parentName,
        address: parentInfo.address,
        postcode: parentInfo.postcode,
        parentEmail: parentInfo.parentEmail,
        parentMobile: parentInfo.parentMobile,
        livingWith: parentInfo.livingWith,
        ethnicity: parentInfo.ethnicity,
        religion: parentInfo.religion,
        otherAdults,
        householdAdults: otherAdults,
        teenagerDetails: teenagerInfo,
        dataConsent
      });
    } else if (registrationType === 'household_adult') {
      if (!adultPersonalName.trim()) {
        setError("Please enter your full name.");
        return;
      }
      if (!foundHousehold) {
        setError("Please find and link your family household first.");
        return;
      }
      const householdId = getHouseholdId(foundHousehold);
      const primaryName = foundHousehold.profile?.parentName || foundHousehold.name;

      onComplete({
        registrationType: 'family',
        parentName: adultPersonalName.trim(),
        familyName: foundHousehold.profile?.familyName || '',
        parentEmail: user.email || '',
        parentMobile: adultPersonalMobile.trim(),
        address: foundHousehold.profile?.address || '',
        postcode: foundHousehold.profile?.postcode || '',
        livingWith: foundHousehold.profile?.livingWith || '',
        ethnicity: parentInfo.ethnicity || '',
        religion: parentInfo.religion || '',
        householdId,
        householdRole: 'adult',
        primaryMemberId: foundHousehold.id,
        primaryMemberName: primaryName,
        otherAdults: [{
          name: adultPersonalName.trim(),
          relationship: adultRelationshipToPrimary,
          mobile: adultPersonalMobile.trim(),
          email: user.email || '',
          hasOwnAccount: true,
          linkedUserId: user.id,
          linkedUserEmail: user.email || '',
          accountStatus: 'linked'
        }],
        householdAdults: [{
          name: adultPersonalName.trim(),
          relationship: adultRelationshipToPrimary,
          mobile: adultPersonalMobile.trim(),
          email: user.email || '',
          hasOwnAccount: true,
          linkedUserId: user.id,
          linkedUserEmail: user.email || '',
          accountStatus: 'linked'
        }],
        children: foundHousehold.profile?.children || [],
        dataConsent
      });
    } else {
      if (children.length === 0) {
        setError("Please add at least one child to your family registration.");
        return;
      }
      const householdId = getHouseholdId(user);
      onComplete({
        registrationType: 'family',
        parentName: parentInfo.parentName,
        familyName: parentInfo.familyName,
        address: parentInfo.address,
        postcode: parentInfo.postcode,
        parentEmail: parentInfo.parentEmail,
        parentMobile: parentInfo.parentMobile,
        livingWith: parentInfo.livingWith,
        ethnicity: parentInfo.ethnicity,
        religion: parentInfo.religion,
        householdId,
        householdRole: 'primary',
        otherAdults,
        householdAdults: otherAdults,
        children,
        dataConsent
      });
    }
  };

  const handleHouseholdSearch = async () => {
    if (!householdLookup.trim()) {
      setHouseholdLookupError("Please enter a Household ID, Invite Code, or email address.");
      return;
    }
    setIsSearchingHousehold(true);
    setHouseholdLookupError(null);
    try {
      const match = await findHousehold(householdLookup.trim());
      if (match) {
        setFoundHousehold(match);
      } else {
        setFoundHousehold(null);
        setHouseholdLookupError("No registered household found matching that code or email. Please check with your family member.");
      }
    } catch (e: any) {
      setHouseholdLookupError("Error finding household: " + (e.message || "Please try again."));
    } finally {
      setIsSearchingHousehold(false);
    }
  };

  const SectionTitle = ({ icon, title }: { icon: React.ReactNode, title: string }) => (
    <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
      <div style={{ color: COLORS.primary }}>{icon}</div>
      <h3 style={{ color: COLORS.secondary }} className="text-xl font-bold uppercase tracking-widest brand-heading">{title}</h3>
    </div>
  );

  const InputLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 brand-heading">{children}</label>
  );

  const renderStep = () => {
    switch (step) {
      case 'type':
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center mb-10">
              <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-widest mb-3">Welcome to free@last</h2>
              <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
                Choose the registration option that best describes you today.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Option 1: Family Registration */}
              <button 
                type="button"
                onClick={() => { setRegistrationType('family'); setStep('parent'); }}
                className="group p-8 bg-white border-4 border-gray-100 rounded-[2.5rem] hover:border-brand-orange transition-all text-left shadow-lg hover:shadow-2xl active:scale-95 flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-5 text-brand-orange group-hover:scale-110 transition-transform">
                    <Icons.Users className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange block mb-1">Primary Account</span>
                  <h3 className="text-xl font-bold brand-heading uppercase mb-2 text-brand-dark-blue">Family Registration</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    Register yourself as a parent/guardian, add your children, and manage your family household.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-xs font-bold text-brand-orange uppercase tracking-wider">
                  <span>Start Family Account</span> &rarr;
                </div>
              </button>

              {/* Option 2: Join Existing Household (Adult) */}
              <button 
                type="button"
                onClick={() => { setRegistrationType('household_adult'); setStep('link_household'); }}
                className="group p-8 bg-white border-4 border-emerald-100 rounded-[2.5rem] hover:border-emerald-500 transition-all text-left shadow-lg hover:shadow-2xl active:scale-95 flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-5 text-emerald-600 group-hover:scale-110 transition-transform">
                    <Icons.UserPlus className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block mb-1">Household Member</span>
                  <h3 className="text-xl font-bold brand-heading uppercase mb-2 text-brand-dark-blue">Join Existing Household</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    Partner or adult in an already registered household? Link your individual account to your family account to book activities for the kids!
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-emerald-50 flex items-center text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  <span>Link Your Account</span> &rarr;
                </div>
              </button>

              {/* Option 3: Teenager (15+) */}
              <button 
                type="button"
                onClick={() => { setRegistrationType('teenager'); setStep('parent'); }}
                className="group p-8 bg-white border-4 border-gray-100 rounded-[2.5rem] hover:border-brand-light-blue transition-all text-left shadow-lg hover:shadow-2xl active:scale-95 flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 bg-sky-100 rounded-2xl flex items-center justify-center mb-5 text-brand-light-blue group-hover:scale-110 transition-transform">
                    <Icons.Activity className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-light-blue block mb-1">Youth 15+</span>
                  <h3 className="text-xl font-bold brand-heading uppercase mb-2 text-brand-dark-blue">Teenager (15+)</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    Register yourself as an individual youth member (for young people aged 15 and over attending sessions).
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-xs font-bold text-brand-light-blue uppercase tracking-wider">
                  <span>Register Teenager</span> &rarr;
                </div>
              </button>
            </div>
          </div>
        );

      case 'parent':
        return (
          <div className="space-y-8 animate-fadeIn">
            <SectionTitle icon={<Icons.User />} title={registrationType === 'family' ? "Family & Parent Info" : "Parent/Guardian Contact"} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={registrationType === 'family' ? 'md:col-span-1' : 'md:col-span-2'}>
                <InputLabel>Parent/Guardian Full Name</InputLabel>
                <input 
                  type="text" required
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                  value={parentInfo.parentName}
                  onChange={e => setParentInfo({...parentInfo, parentName: e.target.value})}
                  placeholder="e.g. John Smith"
                />
              </div>
              {registrationType === 'family' && (
                <div className="md:col-span-1">
                  <InputLabel>Family Name</InputLabel>
                  <input 
                    type="text" required
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                    value={parentInfo.familyName}
                    onChange={e => setParentInfo({...parentInfo, familyName: e.target.value})}
                    placeholder="e.g. The Smith Family"
                  />
                </div>
              )}
              <div className="md:col-span-1">
                <InputLabel>Home Address</InputLabel>
                <textarea 
                  required rows={2}
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-light"
                  value={parentInfo.address}
                  onChange={e => setParentInfo({...parentInfo, address: e.target.value})}
                  placeholder="Street name & number"
                />
              </div>
              <div className="md:col-span-1">
                <InputLabel>Home Postcode</InputLabel>
                <input 
                  type="text" required
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                  value={parentInfo.postcode || ''}
                  onChange={e => setParentInfo({...parentInfo, postcode: e.target.value})}
                  placeholder="e.g. B7 4AA"
                />
              </div>
              <div>
                <InputLabel>Parent/Guardian Email</InputLabel>
                <input 
                  type="email" required
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                  value={parentInfo.parentEmail}
                  onChange={e => setParentInfo({...parentInfo, parentEmail: e.target.value})}
                />
              </div>
              <div>
                <InputLabel>Parent/Guardian Mobile</InputLabel>
                <input 
                  type="tel" required
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                  value={parentInfo.parentMobile}
                  onChange={e => setParentInfo({...parentInfo, parentMobile: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <InputLabel>Who lives in the house? (e.g. Parents, Siblings, Grandparents)</InputLabel>
                <input 
                  type="text" required
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                  value={parentInfo.livingWith}
                  onChange={e => setParentInfo({...parentInfo, livingWith: e.target.value})}
                />
              </div>
              <div>
                <InputLabel>Ethnicity</InputLabel>
                <input 
                  type="text"
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                  value={parentInfo.ethnicity || ''}
                  onChange={e => setParentInfo({...parentInfo, ethnicity: e.target.value})}
                  placeholder="e.g. White British, Asian British"
                />
              </div>
              <div>
                <InputLabel>Religion / Faith</InputLabel>
                <input 
                  type="text"
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                  value={parentInfo.religion || ''}
                  onChange={e => setParentInfo({...parentInfo, religion: e.target.value})}
                  placeholder="e.g. Christian, None"
                />
              </div>
            </div>

            {/* Household & Family Members Section */}
            {registrationType === 'family' && (
              <div className="pt-8 border-t-2 border-slate-100 space-y-8">
                {/* Section Header with BOTH Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-orange-50/60 via-slate-50 to-emerald-50/60 p-6 rounded-3xl border border-slate-200">
                  <div>
                    <h4 className="text-lg font-bold brand-heading uppercase tracking-widest text-brand-dark-blue flex items-center gap-2">
                      <Icons.Users className="w-5 h-5 text-brand-orange" />
                      Household & Family Members
                    </h4>
                    <p className="text-xs text-slate-500 font-light mt-1 max-w-xl">
                      Add the children who will attend centre activities and sessions, plus any other adults living in the household (who can have their own individual account linked to this family).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setStep('children');
                        setEditingChildIndex(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold brand-heading uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md"
                    >
                      <Icons.Users className="w-4 h-4" />
                      Add Child {children.length > 0 && `(${children.length})`}
                    </button>
                    {!isAddingAdultFormOpen && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentAdult({
                            name: '',
                            relationship: 'Partner / Spouse',
                            mobile: '',
                            email: '',
                            hasOwnAccount: true,
                          });
                          setEditingAdultIndex(null);
                          setIsAddingAdultFormOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-orange hover:bg-orange-600 text-white rounded-xl text-xs font-bold brand-heading uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md"
                      >
                        <Icons.UserPlus className="w-4 h-4" />
                        Add Adult {otherAdults.length > 0 && `(${otherAdults.length})`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-section 1: Children in Family */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h5 className="text-xs font-black uppercase tracking-widest text-brand-dark-blue flex items-center gap-2">
                      <span>👶</span> Children in Household ({children.length})
                    </h5>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setStep('children');
                        setEditingChildIndex(null);
                      }}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1"
                    >
                      <Icons.Plus className="w-3.5 h-3.5" /> Add Another Child
                    </button>
                  </div>

                  {children.length === 0 ? (
                    <div className="p-6 bg-emerald-50/40 border-2 border-dashed border-emerald-200 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-emerald-900 brand-heading uppercase">No Children Added Yet</p>
                        <p className="text-xs text-slate-500 font-light">
                          Please add the children who will attend free@last centre sessions and activity bookings.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setStep('children');
                          setEditingChildIndex(null);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm shrink-0"
                      >
                        + Add Child
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {children.map((child, idx) => (
                        <div key={idx} className="p-4 bg-white border-2 border-slate-100 hover:border-slate-200 rounded-2xl flex items-start justify-between shadow-sm">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 block">
                              Child • {child.age ? `${child.age} yrs` : 'Age pending'}
                            </span>
                            <h5 className="font-bold text-sm text-brand-dark-blue brand-heading">{child.name}</h5>
                            <p className="text-[11px] text-slate-500 font-light">
                              {child.schoolCollege || 'School not specified'} • {child.canWalkHome || child.walkHomeOrCollected === 'walk_home' ? '🚶 Walks home' : '🚗 Collected'}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                startEditChild(idx);
                                setStep('children');
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveChild(idx)}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sub-section 2: Other Adults in Household */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <h5 className="text-xs font-black uppercase tracking-widest text-brand-dark-blue flex items-center gap-2">
                      <span>👤</span> Other Adults Living in Household ({otherAdults.length})
                    </h5>
                    {!isAddingAdultFormOpen && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentAdult({
                            name: '',
                            relationship: 'Partner / Spouse',
                            mobile: '',
                            email: '',
                            hasOwnAccount: true,
                          });
                          setEditingAdultIndex(null);
                          setIsAddingAdultFormOpen(true);
                        }}
                        className="text-xs text-brand-orange hover:text-orange-600 font-bold uppercase tracking-wider flex items-center gap-1"
                      >
                        <Icons.Plus className="w-3.5 h-3.5" /> Add Another Adult
                      </button>
                    )}
                  </div>

                  {otherAdults.length === 0 ? (
                    <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-700 brand-heading uppercase">No Additional Adults Added</p>
                        <p className="text-xs text-slate-500 font-light">
                          If a partner, spouse, or other adult lives in your home, add them here so they can have their own individual account linked to this family.
                        </p>
                      </div>
                      {!isAddingAdultFormOpen && (
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentAdult({
                              name: '',
                              relationship: 'Partner / Spouse',
                              mobile: '',
                              email: '',
                              hasOwnAccount: true,
                            });
                            setEditingAdultIndex(null);
                            setIsAddingAdultFormOpen(true);
                          }}
                          className="px-4 py-2 bg-slate-200 hover:bg-brand-orange hover:text-white text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all"
                        >
                          + Add Adult
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {otherAdults.map((adult, idx) => (
                        <div key={idx} className="p-4 bg-white border-2 border-slate-100 hover:border-slate-200 rounded-2xl flex items-start justify-between shadow-sm">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-brand-orange block">
                              {adult.relationship || 'Household Adult'}
                            </span>
                            <h5 className="font-bold text-sm text-brand-dark-blue brand-heading">{adult.name}</h5>
                            <div className="text-xs text-slate-500 font-mono space-y-0.5">
                              {adult.mobile && <p>📞 {adult.mobile}</p>}
                              {adult.email && <p>✉️ {adult.email}</p>}
                            </div>
                            {adult.hasOwnAccount ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold">
                                🔗 Individual Account Enabled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 bg-slate-100 text-slate-600 rounded-md text-[10px]">
                                Contact Only
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditAdult(idx)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-brand-orange hover:text-white text-slate-700 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAdult(idx)}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Add/Edit Adult Form */}
                  {isAddingAdultFormOpen && (
                    <div className="p-6 bg-white border-2 border-brand-orange/40 rounded-3xl space-y-5 shadow-sm">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <h5 className="text-sm font-bold brand-heading uppercase tracking-wider text-brand-orange flex items-center gap-2">
                          <Icons.UserPlus className="w-4 h-4" />
                          {editingAdultIndex !== null ? `Edit Adult: ${currentAdult.name}` : 'Add Other Adult Living in Household'}
                        </h5>
                        <button
                          type="button"
                          onClick={() => setIsAddingAdultFormOpen(false)}
                          className="text-xs text-gray-400 hover:text-gray-600 font-bold uppercase"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <InputLabel>Adult's Full Name *</InputLabel>
                          <input
                            type="text"
                            placeholder="e.g. Jane Smith"
                            className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold text-xs"
                            value={currentAdult.name}
                            onChange={e => setCurrentAdult({ ...currentAdult, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <InputLabel>Relationship / Role</InputLabel>
                          <input
                            type="text"
                            placeholder="e.g. Partner, Spouse, Grandparent, Aunt, Sibling 18+"
                            className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold text-xs"
                            value={currentAdult.relationship}
                            onChange={e => setCurrentAdult({ ...currentAdult, relationship: e.target.value })}
                          />
                        </div>
                        <div>
                          <InputLabel>Mobile Number (For Emergency / Booking SMS)</InputLabel>
                          <input
                            type="tel"
                            placeholder="e.g. 07123 456789"
                            className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold text-xs"
                            value={currentAdult.mobile || ''}
                            onChange={e => setCurrentAdult({ ...currentAdult, mobile: e.target.value })}
                          />
                        </div>
                        <div>
                          <InputLabel>Email Address (For Account Login & Booking Notifications)</InputLabel>
                          <input
                            type="email"
                            placeholder="e.g. jane@example.com"
                            className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold text-xs"
                            value={currentAdult.email || ''}
                            onChange={e => setCurrentAdult({ ...currentAdult, email: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Individual Account Linking Option */}
                      <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-0.5 w-4 h-4 accent-brand-orange"
                            checked={currentAdult.hasOwnAccount ?? true}
                            onChange={e => setCurrentAdult({ ...currentAdult, hasOwnAccount: e.target.checked })}
                          />
                          <div className="text-xs">
                            <span className="font-bold text-brand-dark-blue block">
                              Enable individual login account for this adult (linked to this family household)
                            </span>
                            <p className="text-slate-500 font-light mt-0.5">
                              Allows {currentAdult.name || 'this adult'} to sign into free@last with their own email ({currentAdult.email || 'enter email above'}) to book sessions for themselves or the household's children, while sharing emergency contacts and family address.
                            </p>
                          </div>
                        </label>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingAdultFormOpen(false)}
                          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold uppercase"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveAdult}
                          className="px-6 py-2 bg-brand-orange text-white rounded-xl text-xs font-bold brand-heading uppercase tracking-wider hover:brightness-110 shadow-sm"
                        >
                          {editingAdultIndex !== null ? 'Save Changes' : 'Save Adult'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-8">
              <button type="button" onClick={() => setStep('type')} className="text-gray-400 font-bold brand-heading uppercase tracking-widest hover:text-gray-600">Back</button>
              <button 
                type="button" 
                onClick={() => setStep(registrationType === 'family' ? 'children' : 'teenager')}
                style={{ backgroundColor: COLORS.secondary }}
                className="text-white px-12 py-4 rounded-xl font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all brand-heading uppercase tracking-widest"
              >
                Next Step
              </button>
            </div>
          </div>
        );

      case 'teenager':
        return (
          <div className="space-y-8 animate-fadeIn">
            <SectionTitle icon={<Icons.Activity />} title="Personal Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <InputLabel>Full Name</InputLabel>
                <input 
                  type="text" required
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                  value={teenagerInfo.name}
                  onChange={e => setTeenagerInfo({...teenagerInfo, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <InputLabel>Date of Birth</InputLabel>
                  <input 
                    type="date" required
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                    value={teenagerInfo.dob}
                    onChange={e => setTeenagerInfo({...teenagerInfo, dob: e.target.value})}
                  />
                </div>
                <div>
                  <InputLabel>Age</InputLabel>
                  <input 
                    type="number" readOnly
                    className="w-full p-4 bg-gray-100 border-2 border-gray-100 rounded-xl outline-none font-bold text-gray-500"
                    value={teenagerInfo.age}
                  />
                </div>
              </div>
              <div>
                <InputLabel>Your Mobile Number</InputLabel>
                <input 
                  type="tel" required
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                  value={teenagerInfo.ownMobile}
                  onChange={e => setTeenagerInfo({...teenagerInfo, ownMobile: e.target.value})}
                />
              </div>
              <div>
                <InputLabel>Your Email</InputLabel>
                <input 
                  type="email" required
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                  value={teenagerInfo.ownEmail}
                  onChange={e => setTeenagerInfo({...teenagerInfo, ownEmail: e.target.value})}
                />
              </div>
              <div>
                <InputLabel>Ethnicity</InputLabel>
                <input 
                  type="text"
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                  value={teenagerInfo.ethnicity || ''}
                  onChange={e => setTeenagerInfo({...teenagerInfo, ethnicity: e.target.value})}
                  placeholder="e.g. White British, Asian British"
                />
              </div>
              <div>
                <InputLabel>Religion / Faith</InputLabel>
                <input 
                  type="text"
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                  value={teenagerInfo.religion || ''}
                  onChange={e => setTeenagerInfo({...teenagerInfo, religion: e.target.value})}
                  placeholder="e.g. Christian, None"
                />
              </div>
              <div className="md:col-span-2">
                <InputLabel>School / College / Employment</InputLabel>
                <input 
                  type="text" required
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                  value={teenagerInfo.schoolCollege}
                  onChange={e => setTeenagerInfo({...teenagerInfo, schoolCollege: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <InputLabel>Dietary Requirements & Allergies</InputLabel>
                <textarea 
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-light"
                  value={teenagerInfo.dietaryAllergies}
                  onChange={e => setTeenagerInfo({...teenagerInfo, dietaryAllergies: e.target.value})}
                />
              </div>
              <div>
                <InputLabel>Medical Conditions</InputLabel>
                <textarea 
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-light"
                  value={teenagerInfo.medicalConditions}
                  onChange={e => setTeenagerInfo({...teenagerInfo, medicalConditions: e.target.value})}
                />
              </div>
              <div>
                <InputLabel>Medication / Additional Needs (SEN)</InputLabel>
                <textarea 
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-light"
                  value={teenagerInfo.medication}
                  onChange={e => setTeenagerInfo({...teenagerInfo, medication: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    className="w-6 h-6 accent-brand-orange"
                    checked={teenagerInfo.canSwim}
                    onChange={e => setTeenagerInfo({...teenagerInfo, canSwim: e.target.checked})}
                  />
                  <span className="text-sm font-bold text-brand-dark-blue brand-heading">Can you swim?</span>
                </label>
                {teenagerInfo.canSwim && (
                  <input 
                    type="text"
                    placeholder="How far? (e.g. 25m)"
                    className="flex-1 p-3 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none text-sm"
                    value={teenagerInfo.swimDistance}
                    onChange={e => setTeenagerInfo({...teenagerInfo, swimDistance: e.target.value})}
                  />
                )}
              </div>
            </div>

            {teenagerInfo.age < 18 && (
              <div className="bg-orange-50 p-8 rounded-[2rem] border border-orange-100 space-y-6">
                <h4 className="text-brand-orange font-bold brand-heading uppercase tracking-widest text-sm">Parental Consent (Required for under 18s)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <InputLabel>Parent Name</InputLabel>
                    <input 
                      type="text" required
                      className="w-full p-4 bg-white border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                      value={teenagerInfo.parentName}
                      onChange={e => setTeenagerInfo({...teenagerInfo, parentName: e.target.value})}
                    />
                  </div>
                  <div>
                    <InputLabel>Parent Mobile</InputLabel>
                    <input 
                      type="tel" required
                      className="w-full p-4 bg-white border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                      value={teenagerInfo.parentMobile}
                      onChange={e => setTeenagerInfo({...teenagerInfo, parentMobile: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 cursor-pointer">
                    <input 
                      type="checkbox" required
                      className="mt-1 w-5 h-5 accent-brand-orange"
                      checked={teenagerInfo.medicalConsent}
                      onChange={e => setTeenagerInfo({...teenagerInfo, medicalConsent: e.target.checked})}
                    />
                    <span className="text-sm text-gray-600 leading-relaxed font-light">
                      I give permission for any necessary medical intervention by the emergency services if required.
                    </span>
                  </label>
                  <label className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 cursor-pointer">
                    <input 
                      type="checkbox"
                      className="mt-1 w-5 h-5 accent-brand-orange"
                      checked={teenagerInfo.mediaConsent}
                      onChange={e => setTeenagerInfo({...teenagerInfo, mediaConsent: e.target.checked})}
                    />
                    <span className="text-sm text-gray-600 leading-relaxed font-light">
                      I give consent for free@last to use photographs or video footage for publicity and social media.
                    </span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-8">
              <button type="button" onClick={() => setStep('parent')} className="text-gray-400 font-bold brand-heading uppercase tracking-widest hover:text-gray-600">Back</button>
              <button 
                type="button" 
                onClick={() => setStep('consent')}
                style={{ backgroundColor: COLORS.secondary }}
                className="text-white px-12 py-4 rounded-xl font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all brand-heading uppercase tracking-widest"
              >
                Next Step
              </button>
            </div>
          </div>
        );

      case 'children':
        return (
          <div className="space-y-12 animate-fadeIn">
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <SectionTitle icon={<Icons.Plus />} title="Add Family Members" />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentChild({
                        name: '',
                        dob: '',
                        age: 0,
                        address: parentInfo.address,
                        ownMobile: '',
                        ownEmail: '',
                        schoolCollege: '',
                        dietaryAllergies: '',
                        medicalConditions: '',
                        medication: '',
                        canSwim: false,
                        swimDistance: '',
                        medicalConsent: false,
                        mediaConsent: false,
                        canWalkHome: false,
                        walkHomeOrCollected: 'collected',
                        collectionContacts: [
                          { name: '', mobile: '' },
                          { name: '', mobile: '' },
                          { name: '', mobile: '' }
                        ],
                        collectionPermissions: ['', '', ''],
                        ethnicity: '',
                        religion: '',
                      });
                      setEditingChildIndex(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold brand-heading uppercase tracking-wider shadow-sm hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Icons.Users className="w-4 h-4" />
                    Add Child
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('parent');
                      setCurrentAdult({
                        name: '',
                        relationship: 'Partner / Spouse',
                        mobile: '',
                        email: '',
                        hasOwnAccount: true,
                      });
                      setEditingAdultIndex(null);
                      setIsAddingAdultFormOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-orange-600 text-white rounded-xl text-xs font-bold brand-heading uppercase tracking-wider shadow-sm hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Icons.UserPlus className="w-4 h-4" />
                    Add Adult {otherAdults.length > 0 && `(${otherAdults.length})`}
                  </button>
                </div>
              </div>
              <p className="text-gray-500 mb-8">Please add details for each child who will be attending the centre.</p>
              
              {/* List of added children */}
              {children.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                  {children.map((child, idx) => {
                    const isWalkHome = child.canWalkHome || child.walkHomeOrCollected === 'walk_home';
                    return (
                      <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between gap-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-brand-dark-blue brand-heading uppercase">{child.name}</h4>
                            <p className="text-xs text-gray-400 font-medium">Age: {child.age} • {child.schoolCollege || 'School not specified'}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              type="button" 
                              onClick={() => startEditChild(idx)}
                              className="px-3 py-1.5 bg-brand-orange text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:brightness-110 transition-all font-sans"
                            >
                              Edit
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveChild(idx)}
                              className="px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all font-sans"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60 text-[10px]">
                          {isWalkHome ? (
                            <span className="px-2.5 py-1 bg-emerald-100/70 text-emerald-800 rounded-lg font-bold flex items-center gap-1">
                              🚶 Can walk home alone (Secondary aged)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-blue-100/70 text-blue-800 rounded-lg font-bold flex items-center gap-1">
                              🚗 Will be collected by authorized adult
                            </span>
                          )}
                          {child.collectionContacts && child.collectionContacts.some(c => c.name) && (
                            <span className="px-2.5 py-1 bg-slate-200/70 text-slate-700 rounded-lg font-medium">
                              👥 {child.collectionContacts.filter(c => c.name).length} collectors listed
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Child Form */}
              <div className="bg-white border-4 border-dashed border-gray-100 p-8 rounded-[2rem] space-y-8">
                <h4 className="text-lg font-bold brand-heading uppercase tracking-widest text-brand-orange">
                  {editingChildIndex !== null ? `Editing Details for ${currentChild.name || 'Child'}` : "New Child Details"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <InputLabel>Child's Name</InputLabel>
                    <input 
                      type="text"
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                      value={currentChild.name}
                      onChange={e => setCurrentChild({...currentChild, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <InputLabel>Date of Birth</InputLabel>
                      <input 
                        type="date"
                        className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                        value={currentChild.dob}
                        onChange={e => setCurrentChild({...currentChild, dob: e.target.value})}
                      />
                    </div>
                    <div>
                      <InputLabel>Age</InputLabel>
                      <input 
                        type="number" readOnly
                        className="w-full p-4 bg-gray-100 border-2 border-gray-100 rounded-xl outline-none font-bold text-gray-500"
                        value={currentChild.age}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <InputLabel>Address (Leave blank if same as family address)</InputLabel>
                    <input 
                      type="text"
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                      value={currentChild.address}
                      onChange={e => setCurrentChild({...currentChild, address: e.target.value})}
                    />
                  </div>
                  <div>
                    <InputLabel>Child's Mobile (Secondary aged only)</InputLabel>
                    <input 
                      type="tel"
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                      value={currentChild.ownMobile}
                      onChange={e => setCurrentChild({...currentChild, ownMobile: e.target.value})}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <InputLabel>Child's Email (Optional)</InputLabel>
                    <input 
                      type="email"
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                      value={currentChild.ownEmail}
                      onChange={e => setCurrentChild({...currentChild, ownEmail: e.target.value})}
                    />
                  </div>
                  <div>
                    <InputLabel>Ethnicity</InputLabel>
                    <input 
                      type="text"
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                      value={currentChild.ethnicity || ''}
                      onChange={e => setCurrentChild({...currentChild, ethnicity: e.target.value})}
                      placeholder="e.g. White British"
                    />
                  </div>
                  <div>
                    <InputLabel>Religion / Faith</InputLabel>
                    <input 
                      type="text"
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                      value={currentChild.religion || ''}
                      onChange={e => setCurrentChild({...currentChild, religion: e.target.value})}
                      placeholder="e.g. Christian, None"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <InputLabel>School / College</InputLabel>
                    <input 
                      type="text"
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                      value={currentChild.schoolCollege}
                      onChange={e => setCurrentChild({...currentChild, schoolCollege: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <InputLabel>Dietary Requirements & Allergies</InputLabel>
                    <textarea 
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-light"
                      value={currentChild.dietaryAllergies}
                      onChange={e => setCurrentChild({...currentChild, dietaryAllergies: e.target.value})}
                    />
                  </div>
                  <div>
                    <InputLabel>Medical Conditions</InputLabel>
                    <textarea 
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-light"
                      value={currentChild.medicalConditions}
                      onChange={e => setCurrentChild({...currentChild, medicalConditions: e.target.value})}
                    />
                  </div>
                  <div>
                    <InputLabel>Medication / Additional Needs (SEN)</InputLabel>
                    <textarea 
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-light"
                      value={currentChild.medication}
                      onChange={e => setCurrentChild({...currentChild, medication: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        className="w-6 h-6 accent-brand-orange"
                        checked={currentChild.canSwim}
                        onChange={e => setCurrentChild({...currentChild, canSwim: e.target.checked})}
                      />
                      <span className="text-sm font-bold text-brand-dark-blue brand-heading">Can they swim?</span>
                    </label>
                    {currentChild.canSwim && (
                      <input 
                        type="text"
                        placeholder="How far? (e.g. 25m)"
                        className="flex-1 p-3 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none text-sm"
                        value={currentChild.swimDistance}
                        onChange={e => setCurrentChild({...currentChild, swimDistance: e.target.value})}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-brand-dark-blue font-bold brand-heading uppercase tracking-widest text-sm">Permissions & Collection</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer">
                      <input 
                        type="checkbox"
                        className="mt-1 w-5 h-5 accent-brand-orange"
                        checked={currentChild.medicalConsent}
                        onChange={e => setCurrentChild({...currentChild, medicalConsent: e.target.checked})}
                      />
                      <span className="text-sm text-gray-600 leading-relaxed font-light">
                        Permission for medical intervention by emergency services.
                      </span>
                    </label>
                    <label className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer">
                      <input 
                        type="checkbox"
                        className="mt-1 w-5 h-5 accent-brand-orange"
                        checked={currentChild.mediaConsent}
                        onChange={e => setCurrentChild({...currentChild, mediaConsent: e.target.checked})}
                      />
                      <span className="text-sm text-gray-600 leading-relaxed font-light">
                        Consent for use of photos and videos by free@last.
                      </span>
                    </label>
                  </div>

                  {/* Secondary Aged Walk Home Checkbox */}
                  <div className="p-5 bg-orange-50/70 border-2 border-brand-orange/30 rounded-2xl space-y-2">
                    <label className="flex items-start gap-3.5 cursor-pointer">
                      <input 
                        type="checkbox"
                        id="canWalkHomeRegCheckbox"
                        className="mt-1 w-5 h-5 accent-brand-orange cursor-pointer shrink-0"
                        checked={currentChild.canWalkHome || currentChild.walkHomeOrCollected === 'walk_home' || false}
                        onChange={e => {
                          const checked = e.target.checked;
                          setCurrentChild({
                            ...currentChild,
                            canWalkHome: checked,
                            walkHomeOrCollected: checked ? 'walk_home' : 'collected'
                          });
                        }}
                      />
                      <div>
                        <span className="text-sm font-bold text-brand-dark-blue brand-heading block">
                          Can your secondary aged child walk home or will they be collected?
                        </span>
                        <span className="text-xs text-slate-600 font-light block mt-0.5 leading-relaxed">
                          Check this box if your secondary aged child (11+) has permission to walk home alone after centre sessions. If unchecked, an authorized adult must collect them.
                        </span>
                      </div>
                    </label>
                    {(currentChild.canWalkHome || currentChild.walkHomeOrCollected === 'walk_home') && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        Child is permitted to walk home alone (Secondary aged). You may still specify authorized adults below in case collection is needed.
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <InputLabel>Adults Permitted to Collect Child & Emergency Mobiles (Up to 3 people)</InputLabel>
                      <p className="text-xs text-slate-500 font-light mt-1">Please provide the full name and an emergency contact mobile number for up to 3 authorized adults.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[0, 1, 2].map((idx) => {
                        const contact = currentChild.collectionContacts?.[idx] || { name: '', mobile: '' };
                        return (
                          <div key={idx} className="p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl space-y-2.5">
                            <span className="text-[10px] font-black text-brand-orange uppercase tracking-wider block">
                              Authorized Adult {idx + 1}
                            </span>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Full Name</label>
                              <input 
                                type="text"
                                placeholder={`e.g. Grandma Sarah`}
                                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-bold focus:border-brand-orange"
                                value={contact.name}
                                onChange={e => {
                                  const newContacts = [...(currentChild.collectionContacts || [
                                    { name: '', mobile: '' },
                                    { name: '', mobile: '' },
                                    { name: '', mobile: '' }
                                  ])];
                                  newContacts[idx] = { ...newContacts[idx], name: e.target.value };
                                  setCurrentChild({
                                    ...currentChild,
                                    collectionContacts: newContacts,
                                    collectionPermissions: newContacts.map(c => c.name)
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Emergency Mobile</label>
                              <input 
                                type="tel"
                                placeholder="e.g. 07123 456789"
                                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-bold focus:border-brand-orange"
                                value={contact.mobile}
                                onChange={e => {
                                  const newContacts = [...(currentChild.collectionContacts || [
                                    { name: '', mobile: '' },
                                    { name: '', mobile: '' },
                                    { name: '', mobile: '' }
                                  ])];
                                  newContacts[idx] = { ...newContacts[idx], mobile: e.target.value };
                                  setCurrentChild({
                                    ...currentChild,
                                    collectionContacts: newContacts,
                                    collectionPermissions: newContacts.map(c => c.name)
                                  });
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handleAddChild}
                  style={{ backgroundColor: editingChildIndex !== null ? COLORS.orange : COLORS.green }}
                  className="w-full text-white py-4 rounded-xl font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all brand-heading uppercase tracking-widest text-sm"
                >
                  {editingChildIndex !== null ? "Save Child Changes" : "Add Child to Family"}
                </button>
                {editingChildIndex !== null && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingChildIndex(null);
                      setCurrentChild({
                        name: '',
                        dob: '',
                        age: 0,
                        address: '',
                        ownMobile: '',
                        ownEmail: '',
                        schoolCollege: '',
                        dietaryAllergies: '',
                        medicalConditions: '',
                        medication: '',
                        canSwim: false,
                        swimDistance: '',
                        medicalConsent: false,
                        mediaConsent: false,
                        collectionContacts: [
                          { name: '', mobile: '' },
                          { name: '', mobile: '' },
                          { name: '', mobile: '' }
                        ],
                        collectionPermissions: ['', '', ''],
                        ethnicity: '',
                        religion: '',
                      });
                    }}
                    className="w-full mt-2 bg-slate-200 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-300 transition-all brand-heading uppercase tracking-widest text-xs"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-8">
              <button type="button" onClick={() => setStep('parent')} className="text-gray-400 font-bold brand-heading uppercase tracking-widest hover:text-gray-600">Back</button>
              <button 
                type="button" 
                onClick={() => {
                  setError(null);
                  if (children.length === 0) {
                    setError("Please add at least one child.");
                    return;
                  }
                  setStep('consent');
                }}
                style={{ backgroundColor: COLORS.secondary }}
                className="text-white px-12 py-4 rounded-xl font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all brand-heading uppercase tracking-widest"
              >
                Next Step
              </button>
            </div>
          </div>
        );

      case 'consent':
        return (
          <div className="space-y-8 animate-fadeIn">
            <SectionTitle icon={<Icons.Shield />} title="Final Consent" />
            <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 space-y-8">
              <div className="space-y-4">
                <label className="flex items-start gap-4 p-6 bg-white rounded-3xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                  <input 
                    type="checkbox" required
                    className="mt-1 w-6 h-6 accent-brand-orange"
                    checked={dataConsent}
                    onChange={e => setDataConsent(e.target.checked)}
                  />
                  <span className="text-sm text-gray-600 leading-relaxed font-light">
                    <strong className="block text-brand-dark-blue brand-heading uppercase text-xs mb-1">Data Protection & GDPR</strong>
                    I agree to free@last holding this personal data securely in accordance with their privacy policy and GDPR regulations. I understand that this information is used to ensure the safety and wellbeing of all members.
                  </span>
                </label>
              </div>

              <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-xs text-blue-700 leading-relaxed">
                  By completing this registration, you are joining the free@last community. We look forward to seeing you at the centre! If you have any questions about how we use your data, please speak to a member of the team.
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-8">
              <button type="button" onClick={() => setStep(registrationType === 'family' ? 'children' : 'teenager')} className="text-gray-400 font-bold brand-heading uppercase tracking-widest hover:text-gray-600">Back</button>
              <button 
                type="submit"
                style={{ backgroundColor: COLORS.orange }}
                className="text-white px-16 py-6 rounded-2xl font-bold text-xl shadow-2xl hover:brightness-110 active:scale-95 transition-all brand-heading uppercase tracking-widest"
              >
                Complete Registration
              </button>
            </div>
          </div>
        );

      case 'link_household':
        return (
          <div className="space-y-8 animate-fadeIn">
            <SectionTitle icon={<Icons.UserCheck />} title="Link Account to Family Household" />
            
            <div className="p-8 bg-emerald-50/60 border-2 border-emerald-200 rounded-[2.5rem] space-y-6">
              <div>
                <h4 className="text-base font-bold brand-heading uppercase text-emerald-900 mb-1">
                  Connect Your Individual Account
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-light">
                  If another adult in your household (e.g. partner, spouse) has already registered a family account with free@last, enter their Family Household Code or their registered email/phone below to connect your account. You will have your own individual login to book activities for the children while sharing family contact records.
                </p>
              </div>

              {/* Household Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Enter Family Household Code (e.g. FAL-H-XXXXXX) or Parent's Email / Phone"
                  className="flex-1 p-4 bg-white border-2 border-emerald-300 rounded-2xl outline-none font-bold text-xs text-brand-dark-blue focus:border-brand-orange shadow-inner"
                  value={householdLookup}
                  onChange={e => {
                    setHouseholdLookup(e.target.value);
                    setHouseholdLookupError(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleHouseholdSearch();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleHouseholdSearch}
                  disabled={isSearchingHousehold}
                  className="px-8 py-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-bold brand-heading uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shrink-0"
                >
                  {isSearchingHousehold ? 'Searching...' : 'Find Household'}
                </button>
              </div>

              {householdLookupError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
                  {householdLookupError}
                </div>
              )}

              {/* Found Household Card */}
              {foundHousehold && (
                <div className="p-6 bg-white border-2 border-emerald-500 rounded-3xl space-y-5 shadow-md animate-fadeIn">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 block">
                        Household Found
                      </span>
                      <h4 className="text-lg font-bold brand-heading uppercase text-brand-dark-blue">
                        {foundHousehold.profile?.familyName || foundHousehold.name}'s Household
                      </h4>
                      <p className="text-xs text-slate-500 font-light mt-0.5">
                        Primary Account Holder: <strong className="text-slate-800">{foundHousehold.profile?.parentName || foundHousehold.name}</strong>
                      </p>
                      <p className="text-xs text-slate-500 font-light">
                        Address: {foundHousehold.profile?.address}, {foundHousehold.profile?.postcode}
                      </p>
                      <p className="text-[11px] font-mono text-emerald-800 font-bold mt-1">
                        Household Code: {getHouseholdInviteCode(foundHousehold)}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                      Verified
                    </span>
                  </div>

                  {/* Children in Household */}
                  {foundHousehold.profile?.children && foundHousehold.profile.children.length > 0 && (
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Children in this household you can book activities for:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {foundHousehold.profile.children.map((child: any, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-slate-100 text-brand-dark-blue rounded-xl text-xs font-bold flex items-center gap-1.5">
                            <Icons.Check className="w-3.5 h-3.5 text-emerald-600" />
                            {child.name} {child.age ? `(${child.age} yrs)` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Adult Details Entry */}
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <h5 className="text-xs font-black uppercase tracking-widest text-brand-dark-blue">
                      Your Individual Account Details
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <InputLabel>Your Full Name *</InputLabel>
                        <input
                          type="text"
                          required
                          placeholder="e.g. John Doe"
                          className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-600 outline-none font-bold text-xs"
                          value={adultPersonalName}
                          onChange={e => setAdultPersonalName(e.target.value)}
                        />
                      </div>
                      <div>
                        <InputLabel>Relationship to Household</InputLabel>
                        <select
                          className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-600 outline-none font-bold text-xs"
                          value={adultRelationshipToPrimary}
                          onChange={e => setAdultRelationshipToPrimary(e.target.value)}
                        >
                          <option value="Partner / Spouse">Partner / Spouse</option>
                          <option value="Co-Parent">Co-Parent</option>
                          <option value="Grandparent">Grandparent</option>
                          <option value="Aunt / Uncle">Aunt / Uncle</option>
                          <option value="Older Sibling 18+">Older Sibling (18+)</option>
                          <option value="Other Adult">Other Adult Household Member</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <InputLabel>Your Personal Mobile Number (For Activity Booking Confirmations & Attendance SMS)</InputLabel>
                        <input
                          type="tel"
                          placeholder="e.g. 07123 456789"
                          className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-600 outline-none font-bold text-xs"
                          value={adultPersonalMobile}
                          onChange={e => setAdultPersonalMobile(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Consent checkbox */}
                    <div className="pt-2">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-0.5 w-5 h-5 accent-emerald-600"
                          checked={dataConsent}
                          onChange={e => setDataConsent(e.target.checked)}
                        />
                        <span className="text-xs text-slate-600 font-light">
                          I agree to link my individual account to <strong>{foundHousehold.profile?.familyName || foundHousehold.name}'s Household</strong> and agree to free@last holding this data securely in accordance with GDPR.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-8">
              <button
                type="button"
                onClick={() => setStep('type')}
                className="text-gray-400 font-bold brand-heading uppercase tracking-widest hover:text-gray-600"
              >
                Back
              </button>
              {foundHousehold && (
                <button
                  type="submit"
                  disabled={!dataConsent || !adultPersonalName.trim()}
                  style={{ backgroundColor: COLORS.secondary }}
                  className="text-white px-12 py-4 rounded-xl font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all brand-heading uppercase tracking-widest disabled:opacity-50"
                >
                  Link Account & Complete Registration
                </button>
              )}
            </div>
          </div>
        );
    }
  };

  if (isBlocked) {
    return (
      <div className="max-w-2xl mx-auto p-12 bg-white rounded-3xl shadow-2xl border-2 border-rose-100 text-center space-y-8 animate-fadeIn">
        <div style={{ backgroundColor: '#fff1f2' }} className="w-24 h-24 rounded-full flex items-center justify-center mx-auto text-rose-500 shadow-inner">
          <Icons.Shield className="h-12 w-12" />
        </div>
        <div className="space-y-4">
          <h2 style={{ color: COLORS.secondary }} className="text-3xl font-black uppercase tracking-tight brand-heading">
            Registration Stopped
          </h2>
          <div className="text-left bg-rose-50/50 p-6 rounded-2xl border border-rose-100/50 text-slate-600 font-light space-y-4">
            <p className="font-bold text-rose-700">
              Only residents who live in Nechells and have a B7 postcode are permitted to register as hub members.
            </p>
            <p className="text-sm">
              We noticed your submitted address or postcode does not meet these criteria. To protect community resources, registrations are limited to:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Residents living within the <strong>Nechells</strong> area.</li>
              <li>Postcodes beginning with <strong>B7</strong>.</li>
              <li>Or individuals who have had a scheduled <strong>Home Visit</strong> from a member of the free@last team.</li>
            </ul>
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <button
            onClick={handleRegisterAsFriend}
            style={{ backgroundColor: COLORS.orange }}
            className="w-full py-5 rounded-2xl text-white font-bold text-base brand-heading uppercase tracking-[0.15em] shadow-lg hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all"
          >
            Sign up as a Friend instead
          </button>
          
          <button
            onClick={() => setIsBlocked(false)}
            className="w-full py-4 rounded-xl text-slate-500 font-semibold text-sm hover:bg-slate-50 transition-all"
          >
            Go Back & Update Address
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-2 md:px-4 py-8 md:py-16">
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] md:max-h-none">
        <div style={{ backgroundColor: COLORS.secondary }} className="p-6 md:p-10 text-white text-center relative shrink-0">
          <div className="absolute top-4 md:top-6 left-6 md:left-10 opacity-20">
            <Icons.Logo reversed className="h-4 md:h-6" />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold brand-heading uppercase tracking-widest mb-1 md:mb-2">Member Registration</h1>
          <div className="flex justify-center gap-1.5 md:gap-2 mt-2 md:mt-4">
            {(['type', 'parent', registrationType === 'family' ? 'children' : 'teenager', 'consent'] as Step[]).map((s, idx) => (
              <div 
                key={s} 
                className={`h-1 md:h-1.5 rounded-full transition-all duration-500 ${
                  step === s ? 'w-6 md:w-8 bg-brand-orange' : 'w-3 md:w-4 bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-10 overflow-y-auto flex-grow">
          {error && (
            <div className="mb-8 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-shake">
              <span className="text-xl">⚠️</span>
              <p className="font-bold brand-heading uppercase text-xs tracking-widest">{error}</p>
            </div>
          )}
          {renderStep()}
        </form>
      </div>
    </div>
  );
};
