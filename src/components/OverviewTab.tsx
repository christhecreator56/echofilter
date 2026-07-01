'use client';

import React from 'react';

interface TopUser {
  userId: string;
  callsCount: number;
  creditsUsed: number;
}

interface DailyStat {
  date: string;
  callsCount: number;
  creditsUsed: number;
}

interface DashboardStats {
  tableExists: boolean;
  totalUsers: number;
  totalCalls: number;
  totalCreditsUsed: number;
  groqKeyConfigured: boolean;
  groqKeyStatus: string;
  topUsers: TopUser[];
  dailyStats: DailyStat[];
}

interface OverviewTabProps {
  stats: DashboardStats;
  maxCredits: number;
  maxCalls: number;
  sqlSchemaText: string;
  copying: boolean;
  copySqlToClipboard: () => void;
  setActiveTab: (tab: 'overview' | 'settings') => void;
}

export default function OverviewTab({
  stats,
  maxCredits,
  maxCalls,
  sqlSchemaText,
  copying,
  copySqlToClipboard,
  setActiveTab,
}: OverviewTabProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Supabase migration alert */}
      {stats.tableExists === false && (
        <div className="p-6 backdrop-blur-xl bg-amber-500/[0.03] border border-amber-500/20 text-amber-100 rounded-2xl shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="text-lg font-bold text-white">Supabase Schema Migration Required</h3>
              <p className="text-sm text-slate-300">
                The dashboard is connected, but the <code className="px-1.5 py-0.5 rounded bg-white/[0.07] text-amber-300 font-mono text-xs">usage_logs</code> table is missing.
                Run the SQL commands below in your <a href="https://supabase.com/" target="_blank" rel="noopener noreferrer" className="underline text-cyan-400 hover:text-cyan-300">Supabase SQL Editor</a>, then refresh.
              </p>
              <div className="relative mt-4 bg-[#0a0a0f] border border-white/10 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto">
                <pre>{sqlSchemaText}</pre>
                <button
                  onClick={copySqlToClipboard}
                  className="absolute top-3 right-3 p-1.5 rounded-md bg-white/[0.05] border border-white/10 hover:bg-white/10 text-xs text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copying ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                      <span>Copy SQL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-auto">
        
        {/* 1. Bento Item: KPI Card Users */}
        <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.06] p-6 rounded-2xl relative overflow-hidden group flex flex-col justify-between h-40">
          <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-cyan-500/0 via-cyan-500/40 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Consumers</p>
              <h4 className="text-3xl font-extrabold text-white mt-1.5 tracking-tight">{stats.totalUsers}</h4>
            </div>
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20c-1.602 0-3.136-.33-4.533-.924a9.005 9.005 0 01-1.247-.696 4.125 4.125 0 017.523-2.476A9.03 9.03 0 0015 19.128zm0 0c0-1.113-.285-2.16-.786-3.07M15 7.5a3 3 0 11-6 0 3 3 0 016 0zm6 2.25a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Active Identity Registry
          </span>
        </div>

        {/* 2. Bento Item: KPI Card Total Audits */}
        <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.06] p-6 rounded-2xl relative overflow-hidden group flex flex-col justify-between h-40">
          <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-blue-500/0 via-blue-500/40 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Audits</p>
              <h4 className="text-3xl font-extrabold text-white mt-1.5 tracking-tight">{stats.totalCalls}</h4>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            Transcripts Deciphered
          </span>
        </div>

        {/* 3. Bento Item: KPI Card Credits Consumed */}
        <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.06] p-6 rounded-2xl relative overflow-hidden group flex flex-col justify-between h-40">
          <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estimated Cost</p>
              <h4 className="text-3xl font-extrabold text-white mt-1.5 tracking-tight">${stats.totalCreditsUsed.toFixed(2)}</h4>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.214-.11a3.65 3.65 0 00.183-.37c.347-.836.347-1.765 0-2.602a3.673 3.673 0 00-.285-.542l-.112-.17a3.002 3.002 0 00-3.327-.584M21 18H3m14-9.3c0-2.6-2.1-4.7-4.7-4.7M10 3v4c0 1.1-.9 2-2 2H4" />
              </svg>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            Est Server Charge Log
          </span>
        </div>

        {/* 4. Bento Item: Wide Daily Chart */}
        <div className="md:col-span-2 backdrop-blur-md bg-white/[0.02] border border-white/[0.06] p-6 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-white">Daily Credits vs Queries</h3>
              <p className="text-[11px] text-slate-400">Telemetry logs mapped per UTC calendar date</p>
            </div>
            <div className="flex gap-3 text-[10px] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.5)]"></span>
                Credits
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded bg-blue-500/20 border border-blue-500/50"></span>
                Calls
              </span>
            </div>
          </div>

          <div className="w-full h-56 bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col justify-end">
            {stats.dailyStats && stats.dailyStats.length > 0 ? (
              <div className="w-full h-full flex flex-col justify-between">
                
                <div className="flex-1 flex items-end justify-around gap-3 px-2 border-b border-white/10 pb-2">
                  {stats.dailyStats.map((d, i) => {
                    const creditPct = (d.creditsUsed / maxCredits) * 100;
                    const callsPct = (d.callsCount / maxCalls) * 100;

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end max-w-[45px]">
                        <div className="absolute bottom-full mb-2 bg-slate-900 border border-white/10 text-[9px] text-white px-2 py-1.5 rounded-lg shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 flex flex-col gap-0.5 font-mono">
                          <span className="font-bold text-slate-300">{d.date}</span>
                          <span className="text-cyan-400">Spend: ${d.creditsUsed.toFixed(2)}</span>
                          <span className="text-blue-400 font-medium">Audits: {d.callsCount}</span>
                        </div>

                        <div className="w-full flex items-end gap-1 h-full">
                          {/* Calls bar */}
                          <div
                            style={{ height: `${Math.max(callsPct, 4)}%` }}
                            className="flex-1 bg-blue-500/10 border border-blue-500/30 rounded-t-sm transition-all duration-300 group-hover:brightness-125"
                          ></div>
                          {/* Credits bar */}
                          <div
                            style={{ height: `${Math.max(creditPct, 4)}%` }}
                            className="flex-1 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-sm transition-all duration-300 group-hover:brightness-125 group-hover:shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-around gap-2 px-2 pt-2 text-[9px] text-slate-500 font-mono">
                  {stats.dailyStats.map((d, i) => {
                    const parts = d.date.split('-');
                    return (
                      <span key={i} className="flex-1 text-center truncate max-w-[45px]">
                        {parts.length > 2 ? `${parts[1]}/${parts[2]}` : d.date}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <svg className="w-7 h-7 text-slate-600 mb-2 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>No log telemetry found yet. Scan some YouTube videos to populate.</span>
              </div>
            )}
          </div>
        </div>

        {/* 5. Bento Item: Config Status & Quick Key */}
        <div className="backdrop-blur-md bg-gradient-to-br from-cyan-900/10 to-blue-900/5 border border-white/[0.06] p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between group">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Server Key Info</h3>
            <p className="text-[11px] text-slate-400 leading-normal">Operational status of the server fallback key credentials.</p>
          </div>
          <div className="my-4 space-y-3">
            <div className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04]">
              <span className="text-slate-400">Current Key:</span>
              <span className="font-semibold text-slate-200">{stats.groqKeyStatus}</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04]">
              <span className="text-slate-400">Admin Secret:</span>
              <span className="font-semibold text-cyan-400">Configured</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="w-full py-2 bg-white/[0.04] border border-white/10 hover:bg-white/10 rounded-xl text-xs font-semibold transition-all text-slate-300 flex items-center justify-center gap-1 cursor-pointer"
          >
            Manage Settings
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* 6. Bento Item: Leaderboard */}
        <div className="md:col-span-3 backdrop-blur-md bg-white/[0.01] border border-white/[0.05] p-6 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Top Active Client Registries</h3>
              <p className="text-[11px] text-slate-400">Identities logging the highest aggregate credit queries</p>
            </div>
            <span className="text-[10px] bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded-full text-slate-400 font-mono">
              Top 10 Nodes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-4">User Identity ID</th>
                  <th className="py-2.5 px-4 text-center">Requests Sent</th>
                  <th className="py-2.5 px-4 text-right">Aggregate Costs</th>
                </tr>
              </thead>
              <tbody>
                {stats.topUsers && stats.topUsers.length > 0 ? (
                  stats.topUsers.map((user, i) => (
                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-300">{user.userId}</td>
                      <td className="py-3 px-4 text-center font-medium text-slate-200">{user.callsCount}</td>
                      <td className="py-3 px-4 text-right text-cyan-400 font-bold">${user.creditsUsed.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 px-4 text-center text-slate-500">
                      No client metrics logged. Auditing events via Chrome extension will generate rows.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
