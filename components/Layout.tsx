
import React from 'react';
import { User } from '../types';
import { Icons, COLORS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenProfileModal?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeTab, setActiveTab, onOpenProfileModal }) => {
  const isFriend = user?.role === 'friend';
  const navItems = isFriend
    ? [
        { id: 'home', label: 'Home', icon: <div className="font-bold text-lg">@</div>, mobileLabel: 'Home' },
        { id: 'gallery', label: 'Photos', icon: <Icons.Camera />, mobileLabel: 'Photos' },
        { id: 'friends', label: 'Friends of', icon: <Icons.Shield />, mobileLabel: 'Friends' },
      ]
    : [
        { id: 'home', label: 'Home', icon: <div className="font-bold text-lg">@</div>, mobileLabel: 'Home' },
        { id: 'activities', label: 'Activities', icon: <Icons.Calendar />, mobileLabel: 'Activities' },
        { id: 'gallery', label: 'Gallery', icon: <Icons.Camera />, mobileLabel: 'Gallery' },
        { id: 'friends', label: 'Friends of', icon: <Icons.Shield />, mobileLabel: 'Friends' },
        { id: 'videos', label: 'Videos', icon: <Icons.Play />, mobileLabel: 'Videos' },
        { id: 'partners', label: 'Partners', icon: <Icons.Briefcase />, mobileLabel: 'Partners' },
        ...((user?.role === 'team' && user?.status === 'approved') || user?.role === 'admin' ? [{ id: 'team', label: 'Team Logs', icon: <Icons.Clock />, mobileLabel: 'Team' }] : []),
        ...(user ? [{ id: 'wellbeing', label: 'My Wellbeing', icon: <Icons.Heart />, mobileLabel: 'Wellbeing' }] : []),
        ...(user?.role === 'admin' ? [{ id: 'assets', label: 'Management', icon: <Icons.Settings />, mobileLabel: 'Manage' }] : []),
        ...(!user ? [{ id: 'login', label: 'Sign In', icon: <Icons.LogIn />, mobileLabel: 'Login' }] : []),
      ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Universal Header - Dark Blue as per Guidelines */}
      <header style={{ backgroundColor: COLORS.secondary }} className="sticky top-0 z-[60] h-16 md:h-20 flex items-center shadow-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('home')}>
             <Icons.Logo className="h-6 md:h-8 group-hover:scale-105 transition-transform" reversed />
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{ 
                  color: activeTab === item.id ? '#ffffff' : 'rgba(255,255,255,0.7)',
                  backgroundColor: activeTab === item.id ? COLORS.primary : 'transparent'
                }}
                className={`px-5 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all duration-200 hover:text-white brand-heading ${
                  activeTab === item.id ? 'shadow-lg' : 'hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={onOpenProfileModal}
                  className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 group active:scale-95"
                  title="View & Edit My Profile, Emergency Numbers, and Medical Info"
                >
                  <div className="w-6 h-6 rounded-lg bg-brand-orange flex items-center justify-center text-white text-xs font-bold shrink-0">
                    <Icons.User className="w-3.5 h-3.5" />
                  </div>
                  <div className="hidden sm:flex flex-col items-start text-left">
                    <p className="text-xs font-bold text-white leading-tight brand-heading truncate max-w-[130px] group-hover:text-brand-orange transition-colors">
                      {user.name || user.email.split('@')[0]}
                    </p>
                    <span className="text-[9px] text-white/60 font-bold uppercase tracking-wider">
                      Edit Profile
                    </span>
                  </div>
                </button>
                <button 
                  onClick={onLogout}
                  className="p-2.5 bg-white/10 hover:bg-red-600/80 text-white rounded-xl transition-all"
                  title="Logout"
                >
                  <Icons.LogOut />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setActiveTab('login')}
                style={{ backgroundColor: COLORS.primary }}
                className="text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-lg active:scale-95 brand-heading"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col relative">
        {children}
      </main>

      {/* Mobile Nav - Using Brand Palette */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-dark-blue border-t border-white/10 z-50 shadow-2xl">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{ color: activeTab === item.id ? COLORS.primary : 'rgba(255,255,255,0.5)' }}
              className="flex flex-col items-center flex-1 py-1 transition-all"
            >
              <div className={`p-1.5 rounded-xl ${activeTab === item.id ? 'bg-white/10' : ''}`}>
                 {item.icon}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest mt-1 brand-heading">
                {item.mobileLabel}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Footer - Dark Blue Guidelines */}
      <footer style={{ backgroundColor: COLORS.secondary }} className="text-white/60 py-16 hidden md:block border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-2">
              <Icons.Logo className="mb-6 h-10" reversed />
              <p className="text-white/70 max-w-sm text-sm font-light leading-relaxed">
                Empowering children and young people in Nechells since 1999. We are dedicated to freeing potential and transforming lives through consistent, authentic support.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs brand-heading">The Hub</h4>
              <ul className="space-y-3 text-sm font-medium">
                <li><button onClick={() => setActiveTab('home')} className="hover:text-brand-orange transition-colors">Home</button></li>
                <li><button onClick={() => setActiveTab('activities')} className="hover:text-brand-orange transition-colors">Activities</button></li>
                <li><button onClick={() => setActiveTab('gallery')} className="hover:text-brand-orange transition-colors">Gallery</button></li>
                <li><button onClick={() => setActiveTab('partners')} className="hover:text-brand-orange transition-colors">Partners</button></li>
                {!user && <li><button onClick={() => setActiveTab('login')} className="hover:text-brand-orange transition-colors font-bold text-white">Log In / Sign Up</button></li>}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs brand-heading">Support</h4>
              <p className="text-sm mb-2 text-white/90">Nechells Hub, Birmingham</p>
              <p className="text-xs italic mb-4">Registered Charity No. 1101078</p>
              <div className="flex gap-3">
                {['FB', 'IG', 'YT'].map(social => (
                  <div key={social} className="w-8 h-8 bg-white/10 hover:bg-brand-orange hover:text-white rounded-lg flex items-center justify-center text-[9px] font-bold cursor-pointer transition-all border border-white/10 brand-heading">
                    {social}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-white/5 flex justify-between items-center">
            <p className="text-[10px] font-bold uppercase tracking-widest brand-heading">&copy; {new Date().getFullYear()} free@last</p>
            <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest brand-heading">
              <span className="hover:text-white cursor-pointer">Privacy</span>
              <span className="hover:text-white cursor-pointer">Safeguarding</span>
            </div>
          </div>
        </div>
      </footer>
      <div className="md:hidden h-16"></div>
    </div>
  );
};
