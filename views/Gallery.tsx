
import React, { useState } from 'react';
import { SAMPLE_ACTIVITIES, Icons, COLORS } from '../constants';
import { User, Activity } from '../types';

interface GalleryProps {
  user: User | null;
  assets: any;
  hasConfirmedPhotoPolicy: boolean;
  activities: Activity[];
}

export const Gallery: React.FC<GalleryProps> = ({ user, assets, hasConfirmedPhotoPolicy, activities }) => {
  const [filter, setFilter] = useState<'all' | 'youth' | 'community' | 'sports' | 'education'>('all');

  const pastActivities = activities.filter(a => a.status === 'past');
  
  const filteredActivities = filter === 'all' 
    ? pastActivities 
    : pastActivities.filter(a => a.category === filter);

  const getActivityImage = (activity: Activity) => {
    if (activity.imageUrl) return activity.imageUrl;
    const images: Record<string, string> = {
      'p1': assets.HENNA_ART,
      'p2': assets.MUDDY_ADVENTURE,
    };
    return images[activity.id] || assets.YOUTH_HOODIES;
  };

  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'youth': return COLORS.orange;
      case 'sports': return COLORS.green;
      case 'education': return COLORS.lightBlue;
      case 'community': return COLORS.yellow;
      default: return COLORS.secondary;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
        <div>
          <h1 style={{ color: COLORS.secondary }} className="text-5xl font-bold mb-4 brand-heading uppercase tracking-tight">Activity Gallery</h1>
          <p className="text-gray-500 text-lg font-light">Look back at our past events and memories through our community photo albums.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {['all', 'youth', 'community', 'sports', 'education'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              style={{ 
                backgroundColor: filter === f ? COLORS.secondary : '#ffffff',
                color: filter === f ? '#ffffff' : COLORS.secondary,
                borderColor: COLORS.secondary
              }}
              className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border-2 brand-heading ${
                filter === f ? 'shadow-lg scale-105' : 'hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <div className="flex justify-center mb-6 opacity-20"><Icons.Camera /></div>
          <h3 className="text-xl font-bold text-slate-400 brand-heading uppercase tracking-widest">No albums found for this category</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredActivities.map((activity) => {
            const catColor = getCategoryColor(activity.category);

            return (
              <div key={activity.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-xl transition-all group">
                <div className="h-64 relative overflow-hidden">
                  <img 
                    src={getActivityImage(activity)} 
                    alt={activity.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div style={{ backgroundColor: catColor }} className="absolute top-4 left-4 text-white px-4 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-lg brand-heading">
                    {activity.category}
                  </div>
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white/90 p-4 rounded-full shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                      <Icons.Camera />
                    </div>
                  </div>
                </div>
                
                <div className="p-8 flex-grow flex flex-col">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 brand-heading uppercase tracking-widest mb-3">
                    <Icons.Calendar />
                    <span>{new Date(activity.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
                  </div>
                  <h3 style={{ color: COLORS.secondary }} className="text-xl font-bold mb-4 brand-heading">{activity.title}</h3>
                  <p className="text-gray-500 mb-8 text-sm font-light leading-relaxed line-clamp-2">{activity.description}</p>
                  
                  <div className="mt-auto">
                    {hasConfirmedPhotoPolicy ? (
                      <a 
                        href={activity.flickrAlbumUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ backgroundColor: COLORS.lightBlue, color: '#ffffff' }}
                        className="flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest brand-heading hover:brightness-110 transition-all shadow-lg"
                      >
                        <Icons.Camera /> View Flickr Album
                      </a>
                    ) : (
                      <div className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest brand-heading border border-gray-200">
                        <Icons.Shield /> Policy Required
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
