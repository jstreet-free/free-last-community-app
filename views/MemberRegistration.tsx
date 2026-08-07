
import React, { useState, useEffect } from 'react';
import { User, MemberProfile, ChildProfile } from '../types';
import { Icons, COLORS } from '../constants';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface MemberRegistrationProps {
  user: User;
  onComplete: (profile: MemberProfile) => void;
}

type Step = 'type' | 'parent' | 'teenager' | 'children' | 'consent';

export const MemberRegistration: React.FC<MemberRegistrationProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState<Step>(user.profile ? 'parent' : 'type');
  const [registrationType, setRegistrationType] = useState<'family' | 'teenager' | null>(() => {
    const initial = user.profile?.registrationType;
    return initial === 'family' || initial === 'teenager' ? initial : null;
  });
  
  const [isBlocked, setIsBlocked] = useState(false);

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
    medicalConsent: user.profile?.medicalConsent || false,
    mediaConsent: user.profile?.mediaConsent || false,
    ethnicity: user.profile?.teenagerDetails?.ethnicity || '',
    religion: user.profile?.teenagerDetails?.religion || '',
  });

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
    collectionPermissions: ['', '', '', '', ''],
    ethnicity: '',
    religion: '',
  });

  const [editingChildIndex, setEditingChildIndex] = useState<number | null>(null);

  const startEditChild = (index: number) => {
    const childToEdit = children[index];
    setCurrentChild({
      ...childToEdit,
      collectionPermissions: childToEdit.collectionPermissions ? [...childToEdit.collectionPermissions, '', '', '', '', ''].slice(0, 5) : ['', '', '', '', '']
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
    
    const newChild: ChildProfile = {
      ...(currentChild as ChildProfile),
      collectionPermissions: currentChild.collectionPermissions?.filter(name => name.trim() !== '') || []
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
      collectionPermissions: ['', '', '', '', ''],
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
        teenagerDetails: teenagerInfo,
        dataConsent
      });
    } else {
      if (children.length === 0) {
        setError("Please add at least one child to your family registration.");
        return;
      }
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
        children,
        dataConsent
      });
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
            <div className="text-center mb-12">
              <h2 style={{ color: COLORS.secondary }} className="text-3xl font-bold brand-heading uppercase tracking-widest mb-4">Welcome to free@last</h2>
              <p className="text-gray-500">How would you like to register today?</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <button 
                onClick={() => { setRegistrationType('family'); setStep('parent'); }}
                className="group p-10 bg-white border-4 border-gray-100 rounded-[3rem] hover:border-brand-orange transition-all text-left shadow-xl hover:shadow-2xl active:scale-95"
              >
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 text-brand-orange group-hover:scale-110 transition-transform">
                  <Icons.User />
                </div>
                <h3 className="text-2xl font-bold brand-heading uppercase mb-2">Family Registration</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Register yourself as a parent and add your children who will be visiting the centre.</p>
              </button>
              <button 
                onClick={() => { setRegistrationType('teenager'); setStep('parent'); }}
                className="group p-10 bg-white border-4 border-gray-100 rounded-[3rem] hover:border-brand-light-blue transition-all text-left shadow-xl hover:shadow-2xl active:scale-95"
              >
                <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center mb-6 text-brand-light-blue group-hover:scale-110 transition-transform">
                  <Icons.Activity />
                </div>
                <h3 className="text-2xl font-bold brand-heading uppercase mb-2">Teenager (15+)</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Register yourself as an individual member (for those aged 15 and over).</p>
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
              <SectionTitle icon={<Icons.Plus />} title="Add Family Members" />
              <p className="text-gray-500 mb-8">Please add details for each child who will be attending the centre.</p>
              
              {/* List of added children */}
              {children.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                  {children.map((child, idx) => (
                    <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <h4 className="font-bold text-brand-dark-blue brand-heading uppercase">{child.name}</h4>
                        <p className="text-xs text-gray-400">Age: {child.age} • {child.schoolCollege}</p>
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
                  ))}
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
                    <InputLabel>Child's Mobile - Step Up & Seniors only</InputLabel>
                    <input 
                      type="tel"
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-brand-orange outline-none font-bold"
                      value={currentChild.ownMobile}
                      onChange={e => setCurrentChild({...currentChild, ownMobile: e.target.value})}
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

                  <div className="space-y-4">
                    <InputLabel>Adults permitted to collect this child (Up to 5 names)</InputLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {currentChild.collectionPermissions?.map((name, idx) => (
                        <input 
                          key={idx}
                          type="text"
                          placeholder={`Adult ${idx + 1}`}
                          className="p-3 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none text-sm font-bold"
                          value={name}
                          onChange={e => {
                            const newPerms = [...(currentChild.collectionPermissions || [])];
                            newPerms[idx] = e.target.value;
                            setCurrentChild({...currentChild, collectionPermissions: newPerms});
                          }}
                        />
                      ))}
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
                        collectionPermissions: ['', '', '', '', ''],
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
