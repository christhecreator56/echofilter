'use client';

import React from 'react';

interface SidebarStats {
  groqKeyConfigured: boolean;
  groqKeyStatus: string;
}

interface DashboardSidebarProps {
  activeTab: 'overview' | 'settings';
  setActiveTab: (tab: 'overview' | 'settings') => void;
  stats: SidebarStats | null;
  handleLogout: () => void;
}

export default function DashboardSidebar({
  activeTab,
  setActiveTab,
  stats,
  handleLogout,
}: DashboardSidebarProps) {
  return (
    <aside className="w-full md:w-64 flex-shrink-0 backdrop-blur-xl bg-[#09090e]/80 border-b md:border-b-0 md:border-r border-white/[0.06] flex flex-col z-30 sticky top-0 md:h-screen animate-fade-in">
      
      {/* Brand Header */}
      <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-tight text-white">EchoFilter</h2>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Admin Panel</p>
          </div>
        </div>

        <span className="md:hidden text-xs bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
          v1.1
        </span>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 p-4 space-y-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-white/[0.04] text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.02)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border border-transparent'
          }`}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          Overview
        </button>
        
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-white/[0.04] text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.02)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border border-transparent'
          }`}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Credentials
        </button>
      </nav>

      {/* Sidebar Status Info footer */}
      <div className="p-4 border-t border-white/[0.06] space-y-4">
        {stats && (
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 font-sans">
            <span className="text-slate-500 uppercase tracking-wide font-bold text-[9px]">Server API Integration</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${stats.groqKeyConfigured ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`}></span>
              Groq Key: <span className="font-semibold text-slate-200">{stats.groqKeyStatus}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs bg-white/[0.04] border border-white/10 hover:bg-white/10 text-slate-300 rounded-lg transition-all active:scale-[0.97] cursor-pointer font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Disconnect Admin
        </button>
      </div>
    </aside>
  );
}
