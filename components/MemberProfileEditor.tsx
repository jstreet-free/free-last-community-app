import React, { useState } from 'react';
import { User, MemberProfile, ChildProfile, AuthorizedCollector } from '../types';
import { COLORS } from '../constants';
import * as Icons from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface MemberProfileEditorProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (updatedUser: User) => void;
}

export const MemberProfileEditor: React.FC<MemberProfileEditorProps> = ({ user, onClose, onUpdateUser }) => {
  const isFamily = user.profile?.registrationType === 'family' || (!user.profile?.registrationType && user.role === 'member');
  const isTeenager = user.profile?.registrationType === 'teenager';

  const [activeTab, setActiveTab] = useState<'contact' | 'children' | 'teenager'>('contact');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // General & Parent details
  const [familyName, setFamilyName] = useState(user.profile?.familyName || '');
  const [parentName, setParentName] = useState(user.profile?.parentName || user.name || '');
  const [parentMobile, setParentMobile] = useState(user.profile?.parentMobile || '');
  const [parentEmail, setParentEmail] = useState(user.profile?.parentEmail || user.email || '');
  const [address, setAddress] = useState(user.profile?.address || '');
  const [postcode, setPostcode] = useState(user.profile?.postcode || '');
  const [livingWith, setLivingWith] = useState(user.profile?.livingWith || '');
  const [ethnicity, setEthnicity] = useState(user.profile?.ethnicity || '');
  const [religion, setReligion] = useState(user.profile?.religion || '');

  // Children state for family accounts
  const [children, setChildren] = useState<ChildProfile[]>(() => {
    return (user.profile?.children || []).map(child => {
      // Ensure collectionContacts is populated
      let contacts: AuthorizedCollector[] = child.collectionContacts || [];
      if (contacts.length === 0 && child.collectionPermissions && child.collectionPermissions.length > 0) {
        contacts = child.collectionPermissions.map(p => {
          // Check if format is "Name (07xxx)"
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
    teenagerMobile: user.profile?.teenagerDetails?.teenagerMobile || '',
    teenagerEmail: user.profile?.teenagerDetails?.teenagerEmail || user.email || '',
    schoolCollege: user.profile?.teenagerDetails?.schoolCollege || '',
    dietaryAllergies: user.profile?.teenagerDetails?.dietaryAllergies || '',
    medicalConditions: user.profile?.teenagerDetails?.medicalConditions || '',
    medication: user.profile?.teenagerDetails?.medication || '',
    canSwim: user.profile?.teenagerDetails?.canSwim || false,
    swimDistance: user.profile?.teenagerDetails?.swimDistance || '',
    parentName: user.profile?.parentName || '',
    parentMobile: user.profile?.parentMobile || '',
    medicalConsent: user.profile?.medicalConsent || false,
    mediaConsent: user.profile?.mediaConsent || false,
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
    return age;
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
          address,
          postcode,
          livingWith,
          ethnicity,
          religion,
          dataConsent: user.profile?.dataConsent ?? true,
          teenagerDetails: {
            ...teenagerDetails,
            age: calculateAge(teenagerDetails.dob)
          }
        };
        newDisplayName = teenagerDetails.name || user.name;
      } else {
        if (children.length === 0 && isFamily) {
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
          dataConsent: user.profile?.dataConsent ?? true,
          children: children
        };

        if (familyName && parentName) {
          newDisplayName = `${familyName.toUpperCase()}, ${parentName}`;
        } else if (parentName) {
          newDisplayName = parentName;
        }
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
      setSuccessMessage("Your profile and emergency contact details have been updated successfully!");
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error("Error saving profile:", err);
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
                Update your contact information, phone numbers, children, and authorized collection contacts.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 px-6 md:px-8 bg-slate-50/70 flex-shrink-0 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`py-3.5 px-5 font-bold text-xs brand-heading uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'contact' 
                ? 'border-brand-orange text-brand-orange bg-white rounded-t-xl shadow-sm' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icons.Phone className="w-4 h-4" /> Personal & Contact Info
          </button>
          
          {isFamily && (
            <button
              type="button"
              onClick={() => setActiveTab('children')}
              className={`py-3.5 px-5 font-bold text-xs brand-heading uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'children' 
                  ? 'border-brand-orange text-brand-orange bg-white rounded-t-xl shadow-sm' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icons.Users className="w-4 h-4" /> Children & Collection ({children.length})
            </button>
          )}

          {isTeenager && (
            <button
              type="button"
              onClick={() => setActiveTab('teenager')}
              className={`py-3.5 px-5 font-bold text-xs brand-heading uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'teenager' 
                  ? 'border-brand-orange text-brand-orange bg-white rounded-t-xl shadow-sm' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icons.User className="w-4 h-4" /> Teenager Details
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
                  Your registration has been received! Our team will conduct a friendly home visit to verify details and activate your membership for bookings and photo access.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Tab 1: Contact Details */}
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
                      Primary Contact Mobile Number <span className="text-brand-orange">*</span>
                    </label>
                    <input 
                      type="tel"
                      required
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={parentMobile}
                      onChange={e => setParentMobile(e.target.value)}
                      placeholder="e.g. 07123 456789"
                    />
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
                      Residential Address <span className="text-brand-orange">*</span>
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
                      Living With (e.g. Both Parents, Mother, Foster)
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
                      Ethnicity
                    </label>
                    <input 
                      type="text"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={ethnicity}
                      onChange={e => setEthnicity(e.target.value)}
                      placeholder="e.g. Asian Pakistani, Black British, White"
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
                      placeholder="e.g. Muslim, Christian, None"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Children & Collection Contacts */}
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
                      {children.map((child, idx) => (
                        <div 
                          key={idx} 
                          className={`p-5 rounded-2xl border-2 transition-all ${
                            editingChildIndex === idx 
                              ? 'border-brand-orange bg-orange-50/50 shadow-md' 
                              : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-bold text-base text-brand-dark-blue brand-heading">{child.name}</h4>
                              <p className="text-xs text-slate-400 font-medium">DOB: {child.dob} • Age {child.age || calculateAge(child.dob)}</p>
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
                            {child.dietaryAllergies && (
                              <p className="text-[11px] bg-orange-100/60 text-orange-900 p-2 rounded-lg font-medium">
                                <strong>Dietary:</strong> {child.dietaryAllergies}
                              </p>
                            )}
                            {child.medicalConditions && (
                              <p className="text-[11px] bg-blue-100/60 text-blue-900 p-2 rounded-lg font-medium">
                                <strong>Medical:</strong> {child.medicalConditions}
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
                      ))}
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
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Age</label>
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
                        Child's Mobile (Secondary aged only)
                      </label>
                      <input 
                        type="tel"
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-brand-dark-blue focus:border-brand-orange"
                        value={currentChild.ownMobile || ''}
                        onChange={e => setCurrentChild({ ...currentChild, ownMobile: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">School / College</label>
                      <input 
                        type="text"
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-brand-dark-blue focus:border-brand-orange"
                        value={currentChild.schoolCollege || ''}
                        onChange={e => setCurrentChild({ ...currentChild, schoolCollege: e.target.value })}
                        placeholder="e.g. Heartlands Academy"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Dietary Requirements & Allergies</label>
                      <textarea 
                        rows={2}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-xs text-brand-dark-blue focus:border-brand-orange"
                        value={currentChild.dietaryAllergies || ''}
                        onChange={e => setCurrentChild({ ...currentChild, dietaryAllergies: e.target.value })}
                        placeholder="e.g. Nut allergy, Halal only, Gluten free..."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Medical Conditions & Medications</label>
                      <textarea 
                        rows={2}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-xs text-brand-dark-blue focus:border-brand-orange"
                        value={currentChild.medicalConditions || ''}
                        onChange={e => setCurrentChild({ ...currentChild, medicalConditions: e.target.value })}
                        placeholder="e.g. Asthma (carries inhaler), ADHD, None..."
                      />
                    </div>
                  </div>

                  {/* 3 Authorized Collection Contacts */}
                  <div className="pt-4 border-t border-slate-200">
                    <label className="text-[11px] font-black uppercase tracking-widest text-brand-dark-blue block mb-1">
                      Adults Permitted to Collect Child & Emergency Mobiles (3 People)
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
                      <span className="text-xs font-medium text-slate-700">Emergency Medical Consent</span>
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
                    className="w-full py-3 bg-brand-dark-blue hover:bg-slate-800 text-white rounded-xl font-bold text-xs brand-heading uppercase tracking-wider transition-all active:scale-95 shadow-md"
                  >
                    {editingChildIndex !== null ? 'Update Child in List' : '+ Add Child to List'}
                  </button>
                </div>
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

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Teenager Mobile Number
                    </label>
                    <input 
                      type="tel"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={teenagerDetails.teenagerMobile}
                      onChange={e => setTeenagerDetails({ ...teenagerDetails, teenagerMobile: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Parent / Guardian Name
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
                      Parent Emergency Mobile
                    </label>
                    <input 
                      type="tel"
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue text-sm"
                      value={teenagerDetails.parentMobile}
                      onChange={e => setTeenagerDetails({ ...teenagerDetails, parentMobile: e.target.value })}
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
                    />
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
                Close Without Saving
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
