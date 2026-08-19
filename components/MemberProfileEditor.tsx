import React, { useState } from 'react';
import { User, MemberProfile, ChildProfile, AuthorizedCollector, HouseholdAdult } from '../types';
import { COLORS } from '../constants';
import * as Icons from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { handleFirestoreError, OperationType } from '../services/firestoreUtils';

interface MemberProfileEditorProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (updatedUser: User) => void;
}

export const MemberProfileEditor: React.FC<MemberProfileEditorProps> = ({ user, onClose, onUpdateUser }) => {
  const isFamily = user.profile?.registrationType === 'family' || (!user.profile?.registrationType && user.role === 'member');
  const isTeenager = user.profile?.registrationType === 'teenager';
  const isIndividualOrOther = !isFamily && !isTeenager;

  const [activeTab, setActiveTab] = useState<'contact' | 'children' | 'adults' | 'teenager' | 'medical'>('contact');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // General & Parent / Member details
  const [familyName, setFamilyName] = useState(user.profile?.familyName || '');
  const [parentName, setParentName] = useState(user.profile?.parentName || user.name || '');
  const [parentMobile, setParentMobile] = useState(user.profile?.parentMobile || user.profile?.mobileNumber || '');
  const [parentEmail, setParentEmail] = useState(user.profile?.parentEmail || user.email || '');
  const [address, setAddress] = useState(user.profile?.address || '');
  const [postcode, setPostcode] = useState(user.profile?.postcode || '');
  const [livingWith, setLivingWith] = useState(user.profile?.livingWith || '');
  const [ethnicity, setEthnicity] = useState(user.profile?.ethnicity || '');
  const [religion, setReligion] = useState(user.profile?.religion || '');

  // Other Adults in Household
  const [otherAdults, setOtherAdults] = useState<HouseholdAdult[]>(() => {
    return user.profile?.otherAdults || user.profile?.householdAdults || [];
  });
  const [currentAdult, setCurrentAdult] = useState<HouseholdAdult>({
    name: '',
    relationship: 'Partner / Spouse',
    mobile: '',
    email: '',
  });
  const [editingAdultIndex, setEditingAdultIndex] = useState<number | null>(null);
  const [isAddingAdult, setIsAddingAdult] = useState(false);

  const handleSaveAdultForm = () => {
    if (!currentAdult.name.trim()) {
      setErrorMessage("Please enter the adult's full name.");
      return;
    }
    if (editingAdultIndex !== null) {
      const updated = [...otherAdults];
      updated[editingAdultIndex] = currentAdult;
      setOtherAdults(updated);
      setEditingAdultIndex(null);
    } else {
      setOtherAdults([...otherAdults, currentAdult]);
    }
    setCurrentAdult({
      name: '',
      relationship: 'Partner / Spouse',
      mobile: '',
      email: '',
    });
    setIsAddingAdult(false);
    setErrorMessage(null);
  };

  const handleStartEditAdult = (idx: number) => {
    setCurrentAdult(otherAdults[idx]);
    setEditingAdultIndex(idx);
    setIsAddingAdult(true);
  };

  const handleRemoveAdult = (idx: number) => {
    if (confirm("Are you sure you want to remove this adult from your household details?")) {
      setOtherAdults(otherAdults.filter((_, i) => i !== idx));
    }
  };

  // Individual / Adult Medical & Emergency Contacts
  const [emergencyContactName, setEmergencyContactName] = useState(user.profile?.emergencyContactName || '');
  const [emergencyContactMobile, setEmergencyContactMobile] = useState(user.profile?.emergencyContactMobile || '');
  const [emergencyRelationship, setEmergencyRelationship] = useState(user.profile?.emergencyRelationship || '');
  const [adultMedicalConditions, setAdultMedicalConditions] = useState(user.profile?.medicalConditions || '');
  const [adultMedication, setAdultMedication] = useState(user.profile?.medication || '');
  const [adultDietaryAllergies, setAdultDietaryAllergies] = useState(user.profile?.dietaryAllergies || '');
  const [adultMedicalConsent, setAdultMedicalConsent] = useState(user.profile?.medicalConsent ?? true);
  const [adultMediaConsent, setAdultMediaConsent] = useState(user.profile?.mediaConsent ?? true);

  // Children state for family accounts
  const [children, setChildren] = useState<ChildProfile[]>(() => {
    return (user.profile?.children || []).map(child => {
      let contacts: AuthorizedCollector[] = child.collectionContacts || [];
      if (contacts.length === 0 && child.collectionPermissions && child.collectionPermissions.length > 0) {
        contacts = child.collectionPermissions.map(p => {
          const match = p.match(/^(.+?)\s*\((.+?)\)$/);
          if (match) {
            return { name: match[1].trim(), mobile: match[2].trim() };
          }
          return { name: p.trim(), mobile: '' };
        });
      }
      return {
        ...child,
        collectionContacts: [
          contacts[0] || { name: '', mobile: '' },
          contacts[1] || { name: '', mobile: '' },
          contacts[2] || { name: '', mobile: '' },
        ].slice(0, 3)
      };
    });
  });

  const [editingChildIndex, setEditingChildIndex] = useState<number | null>(null);
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
    collectionContacts: [
      { name: '', mobile: '' },
      { name: '', mobile: '' },
      { name: '', mobile: '' }
    ],
    collectionPermissions: ['', '', ''],
    ethnicity: '',
    religion: '',
  });

  // Teenager state
  const [teenagerDetails, setTeenagerDetails] = useState({
    name: user.profile?.teenagerDetails?.name || user.name || '',
    dob: user.profile?.teenagerDetails?.dob || '',
    age: user.profile?.teenagerDetails?.age || 0,
    teenagerMobile: user.profile?.teenagerDetails?.teenagerMobile || user.profile?.teenagerDetails?.ownMobile || '',
    teenagerEmail: user.profile?.teenagerDetails?.teenagerEmail || user.profile?.teenagerDetails?.ownEmail || user.email || '',
    schoolCollege: user.profile?.teenagerDetails?.schoolCollege || '',
    dietaryAllergies: user.profile?.teenagerDetails?.dietaryAllergies || '',
    medicalConditions: user.profile?.teenagerDetails?.medicalConditions || '',
    medication: user.profile?.teenagerDetails?.medication || '',
    canSwim: user.profile?.teenagerDetails?.canSwim || false,
    swimDistance: user.profile?.teenagerDetails?.swimDistance || '',
    parentName: user.profile?.teenagerDetails?.parentName || user.profile?.parentName || '',
    parentMobile: user.profile?.teenagerDetails?.parentMobile || user.profile?.parentMobile || '',
    medicalConsent: user.profile?.teenagerDetails?.medicalConsent ?? user.profile?.medicalConsent ?? true,
    mediaConsent: user.profile?.teenagerDetails?.mediaConsent ?? user.profile?.mediaConsent ?? true,
    ethnicity: user.profile?.teenagerDetails?.ethnicity || '',
    religion: user.profile?.teenagerDetails?.religion || '',
  });

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  };

  const handleStartEditChild = (index: number) => {
    const child = children[index];
    const rawContacts = child.collectionContacts || [];
    const contacts: AuthorizedCollector[] = [
      rawContacts[0] || { name: '', mobile: '' },
      rawContacts[1] || { name: '', mobile: '' },
      rawContacts[2] || { name: '', mobile: '' },
    ];
    setCurrentChild({
      ...child,
      canWalkHome: child.canWalkHome || child.walkHomeOrCollected === 'walk_home' || false,
      walkHomeOrCollected: child.walkHomeOrCollected || (child.canWalkHome ? 'walk_home' : 'collected'),
      collectionContacts: contacts,
      collectionPermissions: contacts.map(c => c.name)
    });
    setEditingChildIndex(index);
  };

  const handleSaveChildForm = () => {
    setErrorMessage(null);
    if (!currentChild.name?.trim() || !currentChild.dob) {
      setErrorMessage("Please provide child's full name and date of birth.");
      return;
    }

    const calculatedAge = calculateAge(currentChild.dob);
    const validContacts = (currentChild.collectionContacts || [])
      .filter(c => c.name.trim() !== '' || c.mobile.trim() !== '')
      .map(c => ({ name: c.name.trim(), mobile: c.mobile.trim() }));

    const legacyPerms = validContacts
      .filter(c => c.name !== '')
      .map(c => c.mobile ? `${c.name} (${c.mobile})` : c.name);

    const isWalkHome = Boolean(currentChild.canWalkHome || currentChild.walkHomeOrCollected === 'walk_home');

    const updatedChild: ChildProfile = {
      name: currentChild.name.trim(),
      dob: currentChild.dob,
      age: calculatedAge,
      address: currentChild.address || '',
      ownMobile: currentChild.ownMobile || '',
      ownEmail: currentChild.ownEmail || '',
      schoolCollege: currentChild.schoolCollege || '',
      dietaryAllergies: currentChild.dietaryAllergies || '',
      medicalConditions: currentChild.medicalConditions || '',
      medication: currentChild.medication || '',
      canSwim: Boolean(currentChild.canSwim),
      swimDistance: currentChild.swimDistance || '',
      medicalConsent: Boolean(currentChild.medicalConsent),
      mediaConsent: Boolean(currentChild.mediaConsent),
      canWalkHome: isWalkHome,
      walkHomeOrCollected: isWalkHome ? 'walk_home' : 'collected',
      collectionContacts: validContacts,
      collectionPermissions: legacyPerms,
      ethnicity: currentChild.ethnicity || '',
      religion: currentChild.religion || '',
    };

    if (editingChildIndex !== null) {
      const copy = [...children];
      copy[editingChildIndex] = updatedChild;
      setChildren(copy);
      setEditingChildIndex(null);
    } else {
      setChildren([...children, updatedChild]);
    }

    // Reset current child form
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
    if (confirm("Are you sure you want to remove this child from your registration?")) {
      setChildren(children.filter((_, i) => i !== index));
      if (editingChildIndex === index) {
        setEditingChildIndex(null);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let updatedProfile: MemberProfile;
      let newDisplayName = user.name;

      if (isTeenager) {
        updatedProfile = {
          ...(user.profile || {}),
          registrationType: 'teenager',
          parentName: teenagerDetails.parentName || parentName,
          parentMobile: teenagerDetails.parentMobile || parentMobile,
          parentEmail: parentEmail,
          address: address.trim(),
          postcode: postcode.trim(),
          livingWith: livingWith.trim(),
          ethnicity: (teenagerDetails.ethnicity || ethnicity).trim(),
          religion: (teenagerDetails.religion || religion).trim(),
          otherAdults,
          householdAdults: otherAdults,
          dataConsent: user.profile?.dataConsent ?? true,
          teenagerDetails: {
            ...teenagerDetails,
            ownMobile: teenagerDetails.teenagerMobile,
            age: calculateAge(teenagerDetails.dob)
          }
        };
        newDisplayName = teenagerDetails.name || user.name;
      } else if (isFamily) {
        if (children.length === 0) {
          setErrorMessage("Please ensure at least one child profile is registered in your family.");
          setSaving(false);
          return;
        }

        updatedProfile = {
          ...(user.profile || {}),
          registrationType: 'family',
          familyName: familyName.trim(),
          parentName: parentName.trim(),
          parentMobile: parentMobile.trim(),
          parentEmail: parentEmail.trim(),
          address: address.trim(),
          postcode: postcode.trim(),
          livingWith: livingWith.trim(),
          ethnicity: ethnicity.trim(),
          religion: religion.trim(),
          otherAdults,
          householdAdults: otherAdults,
          dataConsent: user.profile?.dataConsent ?? true,
          children: children
        };

        if (familyName && parentName) {
          newDisplayName = `${familyName.toUpperCase()}, ${parentName}`;
        } else if (parentName) {
          newDisplayName = parentName;
        }
      } else {
        // Individual / Adult / Friend / Team
        updatedProfile = {
          ...(user.profile || {}),
          registrationType: user.profile?.registrationType || 'individual',
          parentName: parentName.trim(),
          parentMobile: parentMobile.trim(),
          parentEmail: parentEmail.trim(),
          mobileNumber: parentMobile.trim(),
          address: address.trim(),
          postcode: postcode.trim(),
          livingWith: livingWith.trim(),
          ethnicity: ethnicity.trim(),
          religion: religion.trim(),
          otherAdults,
          householdAdults: otherAdults,
          emergencyContactName: emergencyContactName.trim(),
          emergencyContactMobile: emergencyContactMobile.trim(),
          emergencyRelationship: emergencyRelationship.trim(),
          medicalConditions: adultMedicalConditions.trim(),
          medication: adultMedication.trim(),
          dietaryAllergies: adultDietaryAllergies.trim(),
          medicalConsent: adultMedicalConsent,
          mediaConsent: adultMediaConsent,
          dataConsent: user.profile?.dataConsent ?? true,
        };
        newDisplayName = parentName.trim() || user.name;
      }

      // Update Firestore document
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        name: newDisplayName,
        profile: updatedProfile
      });

      const updatedUserObj: User = {
        ...user,
        name: newDisplayName,
        profile: updatedProfile
      };

      onUpdateUser(updatedUserObj);
      setSuccessMessage("Your profile, phone numbers, and emergency information have been updated successfully!");
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error("Error saving profile:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
      setErrorMessage("Failed to update profile: " + (err?.message || "Please check your network and try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-brand-dark-blue/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border-4 border-white/20 overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div style={{ backgroundColor: COLORS.secondary }} className="p-6 md:p-8 text-white flex justify-between items-center relative flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-orange/20 rounded-2xl flex items-center justify-center text-brand-orange">
              <Icons.UserCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold brand-heading uppercase tracking-tight">
                  My Member Profile
                </h2>
                <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest brand-heading ${
                  user.status === 'approved' ? 'bg-green-500/20 text-green-300' : 'bg-orange-500/20 text-orange-300'
                }`}>
                  {user.status === 'approved' ? 'Approved Member' : 'Pending Home Visit'}
                </span>
              </div>
              <p className="text-white/60 text-xs font-light mt-0.5">
                Update your phone numbers, medical information, children, address, and authorized collection contacts.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
            title="Close"
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 px-6 md:px-8 bg-slate-50/70 flex-shrink-0 gap-2 pt-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`py-3.5 px-5 font-bold text-xs brand-heading uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'contact' 
                ? 'border-brand-orange text-brand-orange bg-white rounded-t-xl shadow-sm' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icons.Phone className="w-4 h-4" /> Personal & Phone Numbers
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('adults')}
            className={`py-3.5 px-5 font-bold text-xs brand-heading uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'adults' 
                ? 'border-brand-orange text-brand-orange bg-white rounded-t-xl shadow-sm' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icons.UserCheck className="w-4 h-4" /> Adults in House ({otherAdults.length})
          </button>
          
          {isFamily && (
            <button
              type="button"
              onClick={() => setActiveTab('children')}
              className={`py-3.5 px-5 font-bold text-xs brand-heading uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'children' 
                  ? 'border-brand-orange text-brand-orange bg-white rounded-t-xl shadow-sm' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icons.Users className="w-4 h-4" /> Children & Medical / Collection ({children.length})
            </button>
          )}

          {isTeenager && (
            <button
              type="button"
              onClick={() => setActiveTab('teenager')}
              className={`py-3.5 px-5 font-bold text-xs brand-heading uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'teenager' 
                  ? 'border-brand-orange text-brand-orange bg-white rounded-t-xl shadow-sm' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icons.User className="w-4 h-4" /> Teenager & Medical Details
            </button>
          )}

          {isIndividualOrOther && (
            <button
              type="button"
              onClick={() => setActiveTab('medical')}
              className={`py-3.5 px-5 font-bold text-xs brand-heading uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'medical' 
                  ? 'border-brand-orange text-brand-orange bg-white rounded-t-xl shadow-sm' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icons.HeartPulse className="w-4 h-4" /> Medical & Emergency Contact
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl flex items-center gap-3 text-sm font-medium animate-fadeIn">
              <Icons.CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3 text-sm font-medium animate-fadeIn">
              <Icons.AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {user.status !== 'approved' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <Icons.Home className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs text-amber-900 brand-heading uppercase tracking-wider">
                  Home Visit Pending
                </p>
                <p className="text-xs text-amber-700 font-light mt-0.5">
                  Your registration has been received! Our team will conduct a friendly home visit to verify details and activate your membership for activity bookings and photo gallery access. You can update your details at any time.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Tab 1: Personal & Phone Numbers */}
            {activeTab === 'contact' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isFamily && (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Family Name / Surname <span className="text-brand-orange">*</span>
                      </label>
                      <input 
                        type="text"
                        required
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                        value={familyName}
                        onChange={e => setFamilyName(e.target.value)}
                        placeholder="e.g. Smith"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      {isFamily ? 'Parent / Guardian Full Name' : 'Full Name'} <span className="text-brand-orange">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={parentName}
                      onChange={e => setParentName(e.target.value)}
                      placeholder="e.g. Sarah Smith"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Primary Contact Mobile Phone Number <span className="text-brand-orange">*</span>
                    </label>
                    <input 
                      type="tel"
                      required
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={parentMobile}
                      onChange={e => setParentMobile(e.target.value)}
                      placeholder="e.g. 07123 456789"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Used for emergency alerts, session updates, and home visit coordination.</span>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Email Address
                    </label>
                    <input 
                      type="email"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={parentEmail}
                      onChange={e => setParentEmail(e.target.value)}
                      placeholder="e.g. parent@email.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Residential Home Address <span className="text-brand-orange">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="e.g. 12 Nechells Park Road"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Postcode <span className="text-brand-orange">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={postcode}
                      onChange={e => setPostcode(e.target.value)}
                      placeholder="e.g. B7 5AA"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Living With (e.g. Both Parents, Mother, Foster, Self)
                    </label>
                    <input 
                      type="text"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={livingWith}
                      onChange={e => setLivingWith(e.target.value)}
                      placeholder="e.g. Mother & Grandparent"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Ethnicity / Cultural Background
                    </label>
                    <input 
                      type="text"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={ethnicity}
                      onChange={e => setEthnicity(e.target.value)}
                      placeholder="e.g. Asian Pakistani, Black British, White British"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Religion / Faith
                    </label>
                    <input 
                      type="text"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={religion}
                      onChange={e => setReligion(e.target.value)}
                      placeholder="e.g. Muslim, Christian, Sikh, None"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Children & Medical / Collection Contacts (Family) */}
            {activeTab === 'children' && isFamily && (
              <div className="space-y-8 animate-fadeIn">
                {/* Existing Children List */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-widest text-brand-dark-blue brand-heading">
                      Registered Children in Family ({children.length})
                    </h3>
                  </div>

                  {children.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 text-xs font-bold brand-heading uppercase">No children added yet. Use the form below to add your child.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {children.map((child, idx) => {
                        const isWalkHome = child.canWalkHome || child.walkHomeOrCollected === 'walk_home';
                        return (
                          <div 
                            key={idx} 
                            className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 ${
                              editingChildIndex === idx 
                                ? 'border-brand-orange bg-orange-50/50 shadow-md' 
                                : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-bold text-base text-brand-dark-blue brand-heading">{child.name}</h4>
                                  <p className="text-xs text-slate-400 font-medium">DOB: {child.dob} • Age {child.age || calculateAge(child.dob)} • {child.schoolCollege || 'School not specified'}</p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditChild(idx)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-brand-orange hover:text-white rounded-lg text-[10px] font-bold brand-heading uppercase transition-all"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveChild(idx)}
                                    className="px-3 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg text-[10px] font-bold brand-heading uppercase transition-all"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2 text-xs text-slate-600">
                                {child.ownMobile && (
                                  <p className="text-[11px] font-bold text-brand-dark-blue">
                                    <strong>Child Mobile:</strong> {child.ownMobile}
                                  </p>
                                )}
                                {child.dietaryAllergies && (
                                  <p className="text-[11px] bg-orange-100/60 text-orange-900 p-2 rounded-lg font-medium">
                                    <strong>Dietary / Allergies:</strong> {child.dietaryAllergies}
                                  </p>
                                )}
                                {child.medicalConditions && (
                                  <p className="text-[11px] bg-blue-100/60 text-blue-900 p-2 rounded-lg font-medium">
                                    <strong>Medical:</strong> {child.medicalConditions} {child.medication ? `(Meds: ${child.medication})` : ''}
                                  </p>
                                )}
                                
                                {/* Collection Contacts Preview */}
                                <div className="pt-2 border-t border-slate-100">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Authorized Collection Contacts:
                                  </p>
                                  {child.collectionContacts && child.collectionContacts.some(c => c.name) ? (
                                    <div className="space-y-1">
                                      {child.collectionContacts.filter(c => c.name).map((c, cIdx) => (
                                        <p key={cIdx} className="text-[11px] font-bold text-brand-dark-blue flex items-center justify-between">
                                          <span>👤 {c.name}</span>
                                          {c.mobile && <span className="text-slate-500 font-mono">{c.mobile}</span>}
                                        </p>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-slate-400 italic">No specific collection contacts listed</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200/60 text-[10px]">
                              {isWalkHome ? (
                                <span className="px-2.5 py-1 bg-emerald-100/70 text-emerald-800 rounded-lg font-bold flex items-center gap-1">
                                  🚶 Can walk home alone (Secondary aged)
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-blue-100/70 text-blue-800 rounded-lg font-bold flex items-center gap-1">
                                  🚗 Will be collected by authorized adult
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Add / Edit Child Form Card */}
                <div className="p-6 bg-slate-50/80 rounded-3xl border-2 border-slate-200/80 space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-widest text-brand-orange brand-heading flex items-center gap-2">
                      <Icons.UserPlus className="w-4 h-4" />
                      {editingChildIndex !== null ? `Editing Details for ${children[editingChildIndex]?.name || 'Child'}` : 'Add a Child to Registration'}
                    </h4>
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
                        className="text-xs text-slate-500 font-bold hover:text-slate-700 brand-heading uppercase tracking-wider"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Child's Full Name</label>
                      <input 
                        type="text"
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-brand-dark-blue focus:border-brand-orange"
                        value={currentChild.name || ''}
                        onChange={e => setCurrentChild({ ...currentChild, name: e.target.value })}
                        placeholder="e.g. Leo Smith"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Date of Birth</label>
                        <input 
                          type="date"
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-brand-dark-blue focus:border-brand-orange"
                          value={currentChild.dob || ''}
                          onChange={e => {
                            const newDob = e.target.value;
                            setCurrentChild({
                              ...currentChild,
                              dob: newDob,
                              age: calculateAge(newDob)
                            });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Calculated Age</label>
                        <input 
                          type="number"
                          readOnly
                          className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-500"
                          value={currentChild.dob ? calculateAge(currentChild.dob) : ''}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                        Child's Mobile Number (Secondary aged youth only)
                      </label>
                      <input 
                        type="tel"
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-brand-dark-blue focus:border-brand-orange"
                        value={currentChild.ownMobile || ''}
                        onChange={e => setCurrentChild({ ...currentChild, ownMobile: e.target.value })}
                        placeholder="e.g. 07987 654321 (Optional)"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">School / College Attended</label>
                      <input 
                        type="text"
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-brand-dark-blue focus:border-brand-orange"
                        value={currentChild.schoolCollege || ''}
                        onChange={e => setCurrentChild({ ...currentChild, schoolCollege: e.target.value })}
                        placeholder="e.g. Heartlands Academy"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                        Dietary Requirements & Allergies
                      </label>
                      <textarea 
                        rows={2}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-xs text-brand-dark-blue focus:border-brand-orange"
                        value={currentChild.dietaryAllergies || ''}
                        onChange={e => setCurrentChild({ ...currentChild, dietaryAllergies: e.target.value })}
                        placeholder="e.g. Severe Peanut Allergy (Carries EpiPen), Halal only, Lactose intolerant..."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                        Medical Conditions & Regular Medications
                      </label>
                      <textarea 
                        rows={2}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-xs text-brand-dark-blue focus:border-brand-orange"
                        value={currentChild.medicalConditions || ''}
                        onChange={e => setCurrentChild({ ...currentChild, medicalConditions: e.target.value })}
                        placeholder="e.g. Asthma (Blue inhaler kept in bag), Diabetes, ADHD, None..."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                        Specific Medication Details
                      </label>
                      <input 
                        type="text"
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-brand-dark-blue focus:border-brand-orange"
                        value={currentChild.medication || ''}
                        onChange={e => setCurrentChild({ ...currentChild, medication: e.target.value })}
                        placeholder="e.g. Salbutamol inhaler 100mcg"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Swimming Ability</label>
                      <div className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-xl">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 accent-brand-orange"
                            checked={currentChild.canSwim || false}
                            onChange={e => setCurrentChild({ ...currentChild, canSwim: e.target.checked })}
                          />
                          Can Swim Confidently
                        </label>
                        {currentChild.canSwim && (
                          <input 
                            type="text"
                            placeholder="Distance (e.g. 25m, 50m)"
                            className="p-1 bg-slate-50 border rounded text-xs outline-none flex-1 font-bold"
                            value={currentChild.swimDistance || ''}
                            onChange={e => setCurrentChild({ ...currentChild, swimDistance: e.target.value })}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Secondary Aged Walk Home Checkbox */}
                  <div className="p-4 bg-orange-50/80 border-2 border-brand-orange/40 rounded-2xl space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        id="canWalkHomeEditorCheckbox"
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
                        <span className="text-xs font-bold text-brand-dark-blue brand-heading block">
                          Can your secondary aged child walk home or will they be collected?
                        </span>
                        <span className="text-[11px] text-slate-600 font-light block mt-0.5 leading-relaxed">
                          Check this box if your secondary aged child (11+) is allowed to walk home alone after centre sessions. If unchecked, an authorized adult must collect them.
                        </span>
                      </div>
                    </label>
                    {(currentChild.canWalkHome || currentChild.walkHomeOrCollected === 'walk_home') && (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[11px] font-semibold flex items-center gap-1.5">
                        <Icons.Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Child is permitted to walk home alone (Secondary aged). You may still specify authorized adults below in case collection is needed.
                      </div>
                    )}
                  </div>

                  {/* 3 Authorized Collection Contacts */}
                  <div className="pt-4 border-t border-slate-200">
                    <label className="text-[11px] font-black uppercase tracking-widest text-brand-dark-blue block mb-1">
                      Adults Permitted to Collect Child & Emergency Contact Mobiles (Up to 3 People)
                    </label>
                    <p className="text-[11px] text-slate-500 font-light mb-4">
                      Please specify up to 3 authorized people who are permitted to collect this child and their emergency contact mobile number.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[0, 1, 2].map((idx) => {
                        const contact = currentChild.collectionContacts?.[idx] || { name: '', mobile: '' };
                        return (
                          <div key={idx} className="p-3.5 bg-white border-2 border-slate-200 rounded-2xl space-y-2">
                            <span className="text-[9px] font-black text-brand-orange uppercase tracking-wider block">
                              Authorized Adult {idx + 1}
                            </span>
                            <div>
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Full Name</label>
                              <input 
                                type="text"
                                placeholder="Full Name"
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-bold focus:border-brand-orange"
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
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Emergency Mobile</label>
                              <input 
                                type="tel"
                                placeholder="07xxx xxxxxx"
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-bold focus:border-brand-orange"
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

                  {/* Consents for Child */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer">
                      <input 
                        type="checkbox"
                        className="w-4 h-4 accent-brand-orange"
                        checked={currentChild.medicalConsent}
                        onChange={e => setCurrentChild({ ...currentChild, medicalConsent: e.target.checked })}
                      />
                      <span className="text-xs font-medium text-slate-700">Emergency Medical Treatment Consent</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer">
                      <input 
                        type="checkbox"
                        className="w-4 h-4 accent-brand-orange"
                        checked={currentChild.mediaConsent}
                        onChange={e => setCurrentChild({ ...currentChild, mediaConsent: e.target.checked })}
                      />
                      <span className="text-xs font-medium text-slate-700">Photo & Media Consent</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveChildForm}
                    className="w-full py-3.5 bg-brand-dark-blue hover:bg-slate-800 text-white rounded-xl font-bold text-xs brand-heading uppercase tracking-wider transition-all active:scale-95 shadow-md"
                  >
                    {editingChildIndex !== null ? '✓ Update Child in List' : '+ Add Child to Family List'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Adults in Household */}
            {activeTab === 'adults' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-brand-dark-blue brand-heading flex items-center gap-2">
                      <Icons.UserCheck className="w-4 h-4 text-brand-orange" />
                      Other Adults Living in the House ({otherAdults.length})
                    </h3>
                    <p className="text-xs text-slate-500 font-light mt-0.5">
                      Record details for spouse, partner, grandparents, or other adults (18+) living in your household.
                    </p>
                  </div>

                  {!isAddingAdult && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentAdult({
                          name: '',
                          relationship: 'Partner / Spouse',
                          mobile: '',
                          email: '',
                        });
                        setEditingAdultIndex(null);
                        setIsAddingAdult(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-brand-orange text-white rounded-xl text-xs font-bold brand-heading uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-sm"
                    >
                      <Icons.Plus className="w-4 h-4" />
                      Add Adult
                    </button>
                  )}
                </div>

                {/* List of Registered Adults */}
                {otherAdults.length === 0 && !isAddingAdult ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 text-xs font-bold brand-heading uppercase">No other adults added yet.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentAdult({
                          name: '',
                          relationship: 'Partner / Spouse',
                          mobile: '',
                          email: '',
                        });
                        setEditingAdultIndex(null);
                        setIsAddingAdult(true);
                      }}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-brand-orange hover:text-white rounded-xl text-xs font-bold uppercase transition-all"
                    >
                      <Icons.Plus className="w-3.5 h-3.5" /> Add First Adult
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {otherAdults.map((adult, idx) => (
                      <div 
                        key={idx} 
                        className={`p-5 rounded-2xl border-2 transition-all flex items-start justify-between ${
                          editingAdultIndex === idx 
                            ? 'border-brand-orange bg-orange-50/50 shadow-md' 
                            : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-brand-orange block">
                            {adult.relationship || 'Household Adult'}
                          </span>
                          <h4 className="font-bold text-base text-brand-dark-blue brand-heading">{adult.name}</h4>
                          <div className="text-xs text-slate-500 font-mono space-y-0.5 pt-1">
                            {adult.mobile && <p>📞 {adult.mobile}</p>}
                            {adult.email && <p>✉️ {adult.email}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditAdult(idx)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-brand-orange hover:text-white rounded-lg text-[10px] font-bold brand-heading uppercase transition-all"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdult(idx)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg text-[10px] font-bold brand-heading uppercase transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Add / Edit Adult Form */}
                {isAddingAdult && (
                  <div className="p-6 bg-slate-50/80 rounded-3xl border-2 border-slate-200/80 space-y-5">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <h4 className="text-xs font-black uppercase tracking-widest text-brand-orange brand-heading flex items-center gap-2">
                        <Icons.UserCheck className="w-4 h-4" />
                        {editingAdultIndex !== null ? `Edit Adult: ${currentAdult.name}` : 'Add Other Adult Living in Household'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingAdult(false);
                          setEditingAdultIndex(null);
                        }}
                        className="text-xs text-slate-500 font-bold hover:text-slate-700 uppercase"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                          Adult's Full Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Jane Smith"
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-brand-dark-blue focus:border-brand-orange"
                          value={currentAdult.name}
                          onChange={e => setCurrentAdult({ ...currentAdult, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                          Relationship / Role
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Partner, Grandparent, Aunt, Sibling 18+"
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-brand-dark-blue focus:border-brand-orange"
                          value={currentAdult.relationship}
                          onChange={e => setCurrentAdult({ ...currentAdult, relationship: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                          Mobile Number (Optional)
                        </label>
                        <input
                          type="tel"
                          placeholder="e.g. 07123 456789"
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-brand-dark-blue focus:border-brand-orange"
                          value={currentAdult.mobile || ''}
                          onChange={e => setCurrentAdult({ ...currentAdult, mobile: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                          Email Address (Optional)
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. jane@example.com"
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-brand-dark-blue focus:border-brand-orange"
                          value={currentAdult.email || ''}
                          onChange={e => setCurrentAdult({ ...currentAdult, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingAdult(false);
                          setEditingAdultIndex(null);
                        }}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAdultForm}
                        className="px-6 py-2 bg-brand-orange text-white rounded-xl text-xs font-bold brand-heading uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-sm"
                      >
                        {editingAdultIndex !== null ? '✓ Update Adult' : '+ Add Adult to House'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Teenager Details */}
            {activeTab === 'teenager' && isTeenager && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Full Name
                    </label>
                    <input 
                      type="text"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={teenagerDetails.name}
                      onChange={e => setTeenagerDetails({ ...teenagerDetails, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Date of Birth
                      </label>
                      <input 
                        type="date"
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                        value={teenagerDetails.dob}
                        onChange={e => {
                          const newDob = e.target.value;
                          setTeenagerDetails({
                            ...teenagerDetails,
                            dob: newDob,
                            age: calculateAge(newDob)
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Age
                      </label>
                      <input 
                        type="number"
                        readOnly
                        className="w-full p-4 bg-slate-100 border-2 border-slate-100 rounded-xl outline-none font-bold text-slate-500 text-sm"
                        value={teenagerDetails.dob ? calculateAge(teenagerDetails.dob) : teenagerDetails.age || ''}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Teenager's Own Mobile Number <span className="text-brand-orange">*</span>
                    </label>
                    <input 
                      type="tel"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={teenagerDetails.teenagerMobile}
                      onChange={e => setTeenagerDetails({ ...teenagerDetails, teenagerMobile: e.target.value })}
                      placeholder="e.g. 07123 456789"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      School / College Attended
                    </label>
                    <input 
                      type="text"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={teenagerDetails.schoolCollege}
                      onChange={e => setTeenagerDetails({ ...teenagerDetails, schoolCollege: e.target.value })}
                      placeholder="e.g. South & City College"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Parent / Guardian Name (Emergency Contact)
                    </label>
                    <input 
                      type="text"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={teenagerDetails.parentName}
                      onChange={e => setTeenagerDetails({ ...teenagerDetails, parentName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Parent Emergency Contact Mobile <span className="text-brand-orange">*</span>
                    </label>
                    <input 
                      type="tel"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={teenagerDetails.parentMobile}
                      onChange={e => setTeenagerDetails({ ...teenagerDetails, parentMobile: e.target.value })}
                      placeholder="e.g. 07700 900123"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Dietary Requirements & Allergies
                    </label>
                    <textarea 
                      rows={2}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none text-brand-dark-blue text-sm"
                      value={teenagerDetails.dietaryAllergies}
                      onChange={e => setTeenagerDetails({ ...teenagerDetails, dietaryAllergies: e.target.value })}
                      placeholder="e.g. Peanut allergy, Halal only..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Medical Conditions & Medications
                    </label>
                    <textarea 
                      rows={2}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none text-brand-dark-blue text-sm"
                      value={teenagerDetails.medicalConditions}
                      onChange={e => setTeenagerDetails({ ...teenagerDetails, medicalConditions: e.target.value })}
                      placeholder="e.g. Asthma, EpiPen, None..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Swimming Ability</label>
                    <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox"
                          className="w-4 h-4 accent-brand-orange"
                          checked={teenagerDetails.canSwim || false}
                          onChange={e => setTeenagerDetails({ ...teenagerDetails, canSwim: e.target.checked })}
                        />
                        Can Swim Confidently
                      </label>
                      {teenagerDetails.canSwim && (
                        <input 
                          type="text"
                          placeholder="Distance (e.g. 50m)"
                          className="p-1 bg-white border rounded text-xs outline-none flex-1 font-bold"
                          value={teenagerDetails.swimDistance || ''}
                          onChange={e => setTeenagerDetails({ ...teenagerDetails, swimDistance: e.target.value })}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 justify-center">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input 
                        type="checkbox"
                        className="w-4 h-4 accent-brand-orange"
                        checked={teenagerDetails.medicalConsent}
                        onChange={e => setTeenagerDetails({ ...teenagerDetails, medicalConsent: e.target.checked })}
                      />
                      Emergency Medical Treatment Consent
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input 
                        type="checkbox"
                        className="w-4 h-4 accent-brand-orange"
                        checked={teenagerDetails.mediaConsent}
                        onChange={e => setTeenagerDetails({ ...teenagerDetails, mediaConsent: e.target.checked })}
                      />
                      Photo & Video Media Consent
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Individual / Adult Medical & Emergency */}
            {activeTab === 'medical' && isIndividualOrOther && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Emergency Contact Full Name <span className="text-brand-orange">*</span>
                    </label>
                    <input 
                      type="text"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={emergencyContactName}
                      onChange={e => setEmergencyContactName(e.target.value)}
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Emergency Contact Mobile Phone <span className="text-brand-orange">*</span>
                    </label>
                    <input 
                      type="tel"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={emergencyContactMobile}
                      onChange={e => setEmergencyContactMobile(e.target.value)}
                      placeholder="e.g. 07123 456789"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Relationship to You
                    </label>
                    <input 
                      type="text"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={emergencyRelationship}
                      onChange={e => setEmergencyRelationship(e.target.value)}
                      placeholder="e.g. Partner, Parent, Sibling, Friend"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Dietary Requirements & Allergies
                    </label>
                    <textarea 
                      rows={2}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none text-brand-dark-blue text-sm"
                      value={adultDietaryAllergies}
                      onChange={e => setAdultDietaryAllergies(e.target.value)}
                      placeholder="e.g. Vegetarian, Halal, Nut allergy..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Medical Conditions & Regular Medication
                    </label>
                    <textarea 
                      rows={2}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none text-brand-dark-blue text-sm"
                      value={adultMedicalConditions}
                      onChange={e => setAdultMedicalConditions(e.target.value)}
                      placeholder="e.g. Asthma, High blood pressure, None..."
                    />
                  </div>

                  <div className="flex flex-col gap-2 justify-center">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input 
                        type="checkbox"
                        className="w-4 h-4 accent-brand-orange"
                        checked={adultMedicalConsent}
                        onChange={e => setAdultMedicalConsent(e.target.checked)}
                      />
                      Emergency Medical Treatment Consent
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input 
                        type="checkbox"
                        className="w-4 h-4 accent-brand-orange"
                        checked={adultMediaConsent}
                        onChange={e => setAdultMediaConsent(e.target.checked)}
                      />
                      Photo & Video Media Consent
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs brand-heading uppercase tracking-widest transition-all"
              >
                Close
              </button>

              <button
                type="submit"
                disabled={saving}
                style={{ backgroundColor: COLORS.orange }}
                className="w-full sm:w-auto px-8 py-3.5 text-white rounded-xl font-bold text-xs brand-heading uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Icons.Loader className="w-4 h-4 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <Icons.Save className="w-4 h-4" /> Save Profile Details
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
