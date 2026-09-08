import React, { useState, useEffect, useMemo } from 'react';
import { DailyAppStats, User, UserRole } from '../types';
import { COLORS, Icons } from '../constants';
import { 
  subscribeToDailyAppStats, 
  exportDailyStatsCsv, 
  logTestVisit, 
  getTodayKey 
} from '../services/analyticsService';

interface AdminAppUsageStatsProps {
  users?: User[];
  currentUser: User;
}

export const AdminAppUsageStats: React.FC<AdminAppUsageStatsProps> = ({ users = [], currentUser }) => {
  const [stats, setStats] = useState<DailyAppStats[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d' | 'all'>('14d');
  const [roleFilter, setRoleFilter] = useState<'all' | 'member' | 'team' | 'friend' | 'public' | 'admin'>('all');
  const [selectedDay, setSelectedDay] = useState<DailyAppStats | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);
  const [searchDate, setSearchDate] = useState('');

  // Subscribe to usage stats
  useEffect(() => {
    const unsub = subscribeToDailyAppStats((updatedStats) => {
      setStats(updatedStats);
    });
    return () => unsub();
  }, []);

  const todayKey = getTodayKey();

  // Filter stats by timeframe
  const filteredStats = useMemo(() => {
    let list = [...stats];
    if (searchDate.trim()) {
      list = list.filter(s => s.date.includes(searchDate.trim()));
    }
    const daysLimit = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : timeRange === '30d' ? 30 : 999;
    return list.slice(0, daysLimit);
  }, [stats, timeRange, searchDate]);

  // Today's statistics
  const todayStats = useMemo(() => {
    return stats.find(s => s.date === todayKey) || {
      id: todayKey,
      date: todayKey,
      totalVisits: 0,
      uniqueVisitors: 0,
      roleBreakdown: { member: 0, team: 0, friend: 0, admin: 0, public: 0 },
      pageViews: {},
      recentSessions: []
    };
  }, [stats, todayKey]);

  // Overall totals across the selected timeframe
  const periodTotals = useMemo(() => {
    let totalVisits = 0;
    let totalUnique = 0;
    const roleCounts = { member: 0, team: 0, friend: 0, admin: 0, public: 0 };
    const pageCounts: Record<string, number> = {};

    filteredStats.forEach(s => {
      totalVisits += s.totalVisits || 0;
      totalUnique += s.uniqueVisitors || 0;
      if (s.roleBreakdown) {
        roleCounts.member += s.roleBreakdown.member || 0;
        roleCounts.team += s.roleBreakdown.team || 0;
        roleCounts.friend += s.roleBreakdown.friend || 0;
        roleCounts.admin += s.roleBreakdown.admin || 0;
        roleCounts.public += s.roleBreakdown.public || 0;
      }
      if (s.pageViews) {
        Object.entries(s.pageViews).forEach(([page, count]) => {
          pageCounts[page] = (pageCounts[page] || 0) + count;
        });
      }
    });

    const totalIdentified = roleCounts.member + roleCounts.team + roleCounts.friend + roleCounts.admin + roleCounts.public;

    return {
      totalVisits,
      totalUnique,
      roleCounts,
      totalIdentified,
      pageCounts,
      memberPercent: totalIdentified > 0 ? Math.round((roleCounts.member / totalIdentified) * 100) : 0,
      teamPercent: totalIdentified > 0 ? Math.round((roleCounts.team / totalIdentified) * 100) : 0,
      friendPercent: totalIdentified > 0 ? Math.round((roleCounts.friend / totalIdentified) * 100) : 0,
      adminPercent: totalIdentified > 0 ? Math.round((roleCounts.admin / totalIdentified) * 100) : 0,
      publicPercent: totalIdentified > 0 ? Math.round((roleCounts.public / totalIdentified) * 100) : 0,
    };
  }, [filteredStats]);

  // Handle test visit simulation
  const handleSimulate = async (role: UserRole | 'public', page: string) => {
    setIsSimulating(true);
    await logTestVisit(role, page, `Test ${role === 'public' ? 'Guest' : role.toUpperCase()}`);
    setIsSimulating(false);
    setSimulationMessage(`Logged 1 test visit from a ${role.toUpperCase()} viewing '${page}'. Stats updated in real time!`);
    setTimeout(() => setSimulationMessage(null), 4000);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'member': return COLORS.green; // #85c441
      case 'team': return COLORS.secondary; // #2b337e
      case 'friend': return COLORS.orange; // #f47920
      case 'admin': return '#7c3aed'; // Purple
      case 'public': return COLORS.lightBlue; // #00aeef
      default: return '#64748b';
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr === todayKey) return 'Today';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      }
    } catch {}
    return dateStr;
  };

  // Find maximum visits in filtered list for relative chart scaling
  const maxDayVisits = useMemo(() => {
    const max = Math.max(...filteredStats.map(s => s.totalVisits || 0), 10);
    return max;
  }, [filteredStats]);

  return (
    <div className="space-y-12 animate-fadeIn pb-16">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-orange/10 text-brand-orange rounded-2xl">
              <Icons.Activity className="w-8 h-8" />
            </div>
            <div>
              <h2 style={{ color: COLORS.secondary }} className="text-3xl font-black brand-heading uppercase tracking-tight">
                App Usage & Daily Statistics
              </h2>
              <p className="text-slate-500 font-light text-sm mt-1">
                Real-time tracking of app visitors, member engagement, team activity, and friends participation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Timeframe selector */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 text-xs font-bold uppercase tracking-wider">
            {(['7d', '14d', '30d', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-xl transition-all ${
                  timeRange === range
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '14d' ? '14 Days' : range === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={() => exportDailyStatsCsv(filteredStats)}
            className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-xs brand-heading uppercase tracking-widest transition-all shadow-md hover:scale-105"
            title="Download full analytics dataset for reports and trustees"
          >
            <Icons.Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {simulationMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-6 py-4 rounded-2xl flex items-center justify-between text-sm font-semibold shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>{simulationMessage}</span>
          </div>
          <button onClick={() => setSimulationMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-4">✕</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Views */}
        <div className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Today's Visits</span>
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-slate-900">{todayStats.totalVisits || 0}</span>
            <span className="text-xs text-slate-500 font-medium">views logged today</span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>Unique People</span>
            <span className="font-bold text-slate-800">{todayStats.uniqueVisitors || 0} unique visitors</span>
          </div>
        </div>

        {/* Members Engagement */}
        <div className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Members Activity</span>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.green }}></div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black" style={{ color: COLORS.green }}>
              {periodTotals.roleCounts.member}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              {periodTotals.memberPercent}% of traffic
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>Today's Member Visits</span>
            <span className="font-bold text-slate-800">{todayStats.roleBreakdown?.member || 0} visits</span>
          </div>
        </div>

        {/* Team & Friends Engagement */}
        <div className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Team & Friends</span>
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.secondary }}></span>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.orange }}></span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900">
              {(periodTotals.roleCounts.team || 0) + (periodTotals.roleCounts.friend || 0)}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({periodTotals.roleCounts.team} Team · {periodTotals.roleCounts.friend} Friends)
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>Today's Support Visits</span>
            <span className="font-bold text-slate-800">
              {(todayStats.roleBreakdown?.team || 0) + (todayStats.roleBreakdown?.friend || 0)} visits
            </span>
          </div>
        </div>

        {/* Public & Prospective Visitors */}
        <div className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Public & Guests</span>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.lightBlue }}></div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black" style={{ color: COLORS.lightBlue }}>
              {periodTotals.roleCounts.public}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
              {periodTotals.publicPercent}% of traffic
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>Today's Guest Views</span>
            <span className="font-bold text-slate-800">{todayStats.roleBreakdown?.public || 0} visits</span>
          </div>
        </div>
      </div>

      {/* Audience Composition Breakdown Bar */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold brand-heading uppercase tracking-tight text-slate-800">
              Audience Composition & User Persona Breakdown
            </h3>
            <p className="text-xs text-slate-500 font-light mt-0.5">
              Proportion of people accessing the hub across the selected {timeRange === 'all' ? 'period' : timeRange}
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-400">
            Total Logged Views: <strong className="text-slate-800">{periodTotals.totalVisits}</strong>
          </div>
        </div>

        {/* Proportional Segmented Progress Bar */}
        <div className="w-full h-7 rounded-2xl bg-slate-100 flex overflow-hidden p-1 shadow-inner gap-1">
          {periodTotals.memberPercent > 0 && (
            <div 
              style={{ width: `${periodTotals.memberPercent}%`, backgroundColor: COLORS.green }} 
              className="h-full rounded-xl transition-all relative group"
              title={`Members: ${periodTotals.roleCounts.member} visits (${periodTotals.memberPercent}%)`}
            />
          )}
          {periodTotals.teamPercent > 0 && (
            <div 
              style={{ width: `${periodTotals.teamPercent}%`, backgroundColor: COLORS.secondary }} 
              className="h-full rounded-xl transition-all relative group"
              title={`Team: ${periodTotals.roleCounts.team} visits (${periodTotals.teamPercent}%)`}
            />
          )}
          {periodTotals.friendPercent > 0 && (
            <div 
              style={{ width: `${periodTotals.friendPercent}%`, backgroundColor: COLORS.orange }} 
              className="h-full rounded-xl transition-all relative group"
              title={`Friends of Free@Last: ${periodTotals.roleCounts.friend} visits (${periodTotals.friendPercent}%)`}
            />
          )}
          {periodTotals.publicPercent > 0 && (
            <div 
              style={{ width: `${periodTotals.publicPercent}%`, backgroundColor: COLORS.lightBlue }} 
              className="h-full rounded-xl transition-all relative group"
              title={`Public Guests: ${periodTotals.roleCounts.public} visits (${periodTotals.publicPercent}%)`}
            />
          )}
          {periodTotals.adminPercent > 0 && (
            <div 
              style={{ width: `${periodTotals.adminPercent}%`, backgroundColor: '#7c3aed' }} 
              className="h-full rounded-xl transition-all relative group"
              title={`Admins: ${periodTotals.roleCounts.admin} visits (${periodTotals.adminPercent}%)`}
            />
          )}
        </div>

        {/* Legend / Metrics list */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/80">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.green }}></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Members</span>
            </div>
            <div className="text-2xl font-black text-slate-900">{periodTotals.roleCounts.member}</div>
            <div className="text-xs text-slate-500">{periodTotals.memberPercent}% of total views</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/80">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.secondary }}></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Team Staff</span>
            </div>
            <div className="text-2xl font-black text-slate-900">{periodTotals.roleCounts.team}</div>
            <div className="text-xs text-slate-500">{periodTotals.teamPercent}% of total views</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/80">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.orange }}></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Friends</span>
            </div>
            <div className="text-2xl font-black text-slate-900">{periodTotals.roleCounts.friend}</div>
            <div className="text-xs text-slate-500">{periodTotals.friendPercent}% of total views</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/80">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.lightBlue }}></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Public Guests</span>
            </div>
            <div className="text-2xl font-black text-slate-900">{periodTotals.roleCounts.public}</div>
            <div className="text-xs text-slate-500">{periodTotals.publicPercent}% of total views</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/80">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-purple-600"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Admins</span>
            </div>
            <div className="text-2xl font-black text-slate-900">{periodTotals.roleCounts.admin}</div>
            <div className="text-xs text-slate-500">{periodTotals.adminPercent}% of total views</div>
          </div>
        </div>
      </div>

      {/* Daily Visual Trend & Engagement Flow */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
          <div>
            <h3 className="text-lg font-bold brand-heading uppercase tracking-tight text-slate-800">
              Daily Usage & Traffic Flow
            </h3>
            <p className="text-xs text-slate-500 font-light mt-0.5">
              Visual overview of daily visits and user roles over time. Click any day bar to view detailed breakdown.
            </p>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-slate-400 uppercase tracking-wider">Highlight:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer hover:bg-slate-100"
            >
              <option value="all">All Roles (Stacked)</option>
              <option value="member">Members Only</option>
              <option value="team">Team Only</option>
              <option value="friend">Friends Only</option>
              <option value="public">Public Guests Only</option>
              <option value="admin">Admins Only</option>
            </select>
          </div>
        </div>

        {/* Visual Bar Graph */}
        <div className="space-y-4">
          <div className="h-64 flex items-end gap-2 sm:gap-3 pt-6 pb-2 border-b border-slate-100 overflow-x-auto">
            {filteredStats.slice().reverse().map((day) => {
              const total = day.totalVisits || 0;
              const displayHeight = Math.max((total / maxDayVisits) * 100, 4);

              // Calculate role heights
              const mPercent = total > 0 ? ((day.roleBreakdown?.member || 0) / total) * 100 : 0;
              const tPercent = total > 0 ? ((day.roleBreakdown?.team || 0) / total) * 100 : 0;
              const fPercent = total > 0 ? ((day.roleBreakdown?.friend || 0) / total) * 100 : 0;
              const pPercent = total > 0 ? ((day.roleBreakdown?.public || 0) / total) * 100 : 0;
              const aPercent = total > 0 ? ((day.roleBreakdown?.admin || 0) / total) * 100 : 0;

              const isSelected = selectedDay?.date === day.date;
              const isToday = day.date === todayKey;

              return (
                <div 
                  key={day.date} 
                  onClick={() => setSelectedDay(day)}
                  className="flex-1 min-w-[32px] sm:min-w-[42px] flex flex-col items-center cursor-pointer group"
                >
                  {/* Tooltip trigger container */}
                  <div className="w-full flex items-end justify-center relative">
                    {/* Hover count badge */}
                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap z-20">
                      {total} visits ({day.roleBreakdown?.member || 0}M / {day.roleBreakdown?.friend || 0}F / {day.roleBreakdown?.team || 0}T)
                    </div>

                    {/* Stacked bar */}
                    <div 
                      style={{ height: `${displayHeight}%` }} 
                      className={`w-full max-w-[36px] rounded-xl flex flex-col-reverse overflow-hidden transition-all duration-300 shadow-sm group-hover:brightness-110 group-hover:scale-105 ${
                        isSelected ? 'ring-4 ring-brand-orange ring-offset-2' : ''
                      } ${isToday ? 'border-2 border-emerald-400' : ''}`}
                    >
                      {roleFilter === 'all' ? (
                        <>
                          {mPercent > 0 && <div style={{ height: `${mPercent}%`, backgroundColor: COLORS.green }} />}
                          {tPercent > 0 && <div style={{ height: `${tPercent}%`, backgroundColor: COLORS.secondary }} />}
                          {fPercent > 0 && <div style={{ height: `${fPercent}%`, backgroundColor: COLORS.orange }} />}
                          {pPercent > 0 && <div style={{ height: `${pPercent}%`, backgroundColor: COLORS.lightBlue }} />}
                          {aPercent > 0 && <div style={{ height: `${aPercent}%`, backgroundColor: '#7c3aed' }} />}
                        </>
                      ) : (
                        <div 
                          style={{ 
                            height: '100%', 
                            backgroundColor: getRoleColor(roleFilter) 
                          }} 
                        />
                      )}
                    </div>
                  </div>

                  {/* Day label */}
                  <span className={`text-[10px] font-bold mt-2 truncate w-full text-center ${
                    isToday ? 'text-emerald-700 font-black' : isSelected ? 'text-brand-orange font-black' : 'text-slate-400 group-hover:text-slate-700'
                  }`}>
                    {isToday ? 'Today' : day.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 px-1">
            <span>Graph shows daily volume (hover for breakdown, click bar to inspect)</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.green }}></span> Members</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.secondary }}></span> Team</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.orange }}></span> Friends</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.lightBlue }}></span> Public Guests</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Day Inspector Modal / Panel */}
      {selectedDay && (
        <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative animate-fadeIn border border-slate-800">
          <button 
            onClick={() => setSelectedDay(null)}
            className="absolute top-6 right-6 text-slate-400 hover:text-white font-bold text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl transition-all"
          >
            ✕ Close
          </button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">Day Deep Dive</span>
              <h3 className="text-2xl font-black brand-heading mt-1">
                {formatDisplayDate(selectedDay.date)} ({selectedDay.date})
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-slate-800 px-4 py-2 rounded-xl text-center">
                <div className="text-xs text-slate-400">Total Visits</div>
                <div className="text-xl font-black text-emerald-400">{selectedDay.totalVisits}</div>
              </div>
              <div className="bg-slate-800 px-4 py-2 rounded-xl text-center">
                <div className="text-xs text-slate-400">Unique Users</div>
                <div className="text-xl font-black text-sky-400">{selectedDay.uniqueVisitors}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/50">
              <div className="text-xs text-slate-400">Members</div>
              <div className="text-lg font-bold text-white mt-0.5">{selectedDay.roleBreakdown?.member || 0}</div>
            </div>
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/50">
              <div className="text-xs text-slate-400">Team Staff</div>
              <div className="text-lg font-bold text-white mt-0.5">{selectedDay.roleBreakdown?.team || 0}</div>
            </div>
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/50">
              <div className="text-xs text-slate-400">Friends of Free@Last</div>
              <div className="text-lg font-bold text-white mt-0.5">{selectedDay.roleBreakdown?.friend || 0}</div>
            </div>
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/50">
              <div className="text-xs text-slate-400">Public Guests</div>
              <div className="text-lg font-bold text-white mt-0.5">{selectedDay.roleBreakdown?.public || 0}</div>
            </div>
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/50">
              <div className="text-xs text-slate-400">Admins</div>
              <div className="text-lg font-bold text-white mt-0.5">{selectedDay.roleBreakdown?.admin || 0}</div>
            </div>
          </div>

          {/* Section views for this day */}
          {selectedDay.pageViews && Object.keys(selectedDay.pageViews).length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Popular Sections Visited on this Day</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(selectedDay.pageViews).map(([page, count]) => (
                  <span key={page} className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <span className="capitalize">{page}</span>
                    <span className="bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Two-Column Section: Most Visited Pages & Live Recent Visitors Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Most Visited Sections */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold brand-heading uppercase tracking-tight text-slate-800">
                Most Popular Hub Sections
              </h3>
              <p className="text-xs text-slate-500 font-light mt-0.5">
                Where members and visitors spend their time
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Page Views</span>
          </div>

          <div className="space-y-4">
            {Object.entries(periodTotals.pageCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 7)
              .map(([page, count]) => {
                const percent = periodTotals.totalVisits > 0 ? Math.round((count / periodTotals.totalVisits) * 100) : 0;
                let pageLabel = page;
                if (page === 'home') pageLabel = 'Home & Centre Updates';
                else if (page === 'activities') pageLabel = 'Sessions & Activities';
                else if (page === 'friends') pageLabel = 'Friends of Free@Last';
                else if (page === 'videos') pageLabel = 'Media & Video Highlights';
                else if (page === 'archive') pageLabel = 'Photo Archive Gallery';
                else if (page === 'registration') pageLabel = 'Member Registration';
                else if (page === 'assets') pageLabel = 'Admin Portal';

                return (
                  <div key={page} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-800 capitalize flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-orange"></span>
                        {pageLabel}
                      </span>
                      <span className="text-slate-500">
                        {count} views <strong className="text-slate-700 ml-1">({percent}%)</strong>
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${Math.min(percent * 1.5, 100)}%`, backgroundColor: COLORS.orange }} 
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Live Recent Visits Pulse Log */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold brand-heading uppercase tracking-tight text-slate-800">
                  Live Activity Pulse
                </h3>
                <p className="text-xs text-slate-500 font-light mt-0.5">
                  Recent recorded session navigations across the platform
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Active
              </div>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {(todayStats.recentSessions && todayStats.recentSessions.length > 0 ? todayStats.recentSessions : [
                { timestamp: new Date().toISOString(), role: 'admin' as const, userName: currentUser.name || 'Admin', page: 'assets' },
                { timestamp: new Date(Date.now() - 5 * 60000).toISOString(), role: 'member' as const, userName: 'Community Member', page: 'activities' },
                { timestamp: new Date(Date.now() - 12 * 60000).toISOString(), role: 'friend' as const, userName: 'Friend of Free@Last', page: 'friends' },
                { timestamp: new Date(Date.now() - 25 * 60000).toISOString(), role: 'public' as const, userName: 'Guest Visitor', page: 'home' }
              ]).map((sess, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-3">
                    <span 
                      style={{ backgroundColor: getRoleColor(sess.role) }}
                      className="px-2.5 py-1 rounded-lg text-white font-black text-[10px] uppercase tracking-wider"
                    >
                      {sess.role}
                    </span>
                    <div>
                      <div className="font-bold text-slate-800">{sess.userName || 'Visitor'}</div>
                      <div className="text-slate-400 text-[11px]">Viewed section: <strong className="text-slate-600 capitalize">{sess.page}</strong></div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {new Date(sess.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Simulation Testing Toolbar for Admin */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Simulate Traffic Event (Testing):
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={isSimulating}
                  onClick={() => handleSimulate('member', 'activities')}
                  style={{ backgroundColor: `${COLORS.green}15`, color: COLORS.green }}
                  className="px-3 py-1.5 rounded-xl font-bold text-[11px] hover:brightness-90 transition-all"
                >
                  + Member (Sessions)
                </button>
                <button
                  disabled={isSimulating}
                  onClick={() => handleSimulate('friend', 'friends')}
                  style={{ backgroundColor: `${COLORS.orange}15`, color: COLORS.orange }}
                  className="px-3 py-1.5 rounded-xl font-bold text-[11px] hover:brightness-90 transition-all"
                >
                  + Friend (Portal)
                </button>
                <button
                  disabled={isSimulating}
                  onClick={() => handleSimulate('team', 'home')}
                  style={{ backgroundColor: `${COLORS.secondary}15`, color: COLORS.secondary }}
                  className="px-3 py-1.5 rounded-xl font-bold text-[11px] hover:brightness-90 transition-all"
                >
                  + Team (Hub)
                </button>
                <button
                  disabled={isSimulating}
                  onClick={() => handleSimulate('public', 'home')}
                  style={{ backgroundColor: `${COLORS.lightBlue}15`, color: COLORS.lightBlue }}
                  className="px-3 py-1.5 rounded-xl font-bold text-[11px] hover:brightness-90 transition-all"
                >
                  + Guest
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Daily Stats Table */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold brand-heading uppercase tracking-tight text-slate-800">
              Daily Usage History
            </h3>
            <p className="text-xs text-slate-500 font-light mt-0.5">
              Comprehensive chronological log of user visits and role segmentation
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search date (YYYY-MM)..."
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-orange"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-4 px-4">Date</th>
                <th className="py-4 px-4 text-center">Total Visits</th>
                <th className="py-4 px-4 text-center">Unique Users</th>
                <th className="py-4 px-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.green }}></span>
                    Members
                  </span>
                </th>
                <th className="py-4 px-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.secondary }}></span>
                    Team
                  </span>
                </th>
                <th className="py-4 px-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.orange }}></span>
                    Friends
                  </span>
                </th>
                <th className="py-4 px-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.lightBlue }}></span>
                    Public
                  </span>
                </th>
                <th className="py-4 px-4">Admins</th>
                <th className="py-4 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStats.map((day) => {
                const isToday = day.date === todayKey;
                const total = day.totalVisits || 0;
                const m = day.roleBreakdown?.member || 0;
                const t = day.roleBreakdown?.team || 0;
                const f = day.roleBreakdown?.friend || 0;
                const p = day.roleBreakdown?.public || 0;
                const a = day.roleBreakdown?.admin || 0;

                return (
                  <tr key={day.date} className={`hover:bg-slate-50/80 transition-colors ${isToday ? 'bg-emerald-50/40 font-semibold' : ''}`}>
                    <td className="py-4 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        {isToday && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>}
                        <span>{formatDisplayDate(day.date)}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({day.date})</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center font-black text-slate-900 text-sm">
                      {total}
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-slate-600">
                      {day.uniqueVisitors || 0}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-emerald-700">{m}</span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({total > 0 ? Math.round((m / total) * 100) : 0}%)
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-indigo-900">{t}</span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({total > 0 ? Math.round((t / total) * 100) : 0}%)
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-amber-700">{f}</span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({total > 0 ? Math.round((f / total) * 100) : 0}%)
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-sky-700">{p}</span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({total > 0 ? Math.round((p / total) * 100) : 0}%)
                      </span>
                    </td>
                    <td className="py-4 px-4 text-purple-700 font-bold">
                      {a}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setSelectedDay(day)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
