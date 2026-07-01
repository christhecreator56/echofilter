'use client';

import React, { useState, useEffect, useCallback } from 'react';
import LoginScreen from '@/components/LoginScreen';
import DashboardSidebar from '@/components/DashboardSidebar';
import OverviewTab from '@/components/OverviewTab';
import CredentialsTab from '@/components/CredentialsTab';

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

export default function AdminDashboard() {
  const [adminSecret, setAdminSecret] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [secretInput, setSecretInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [groqKeyInput, setGroqKeyInput] = useState<string>('');
  const [configLoading, setConfigLoading] = useState<boolean>(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [showGroqKey, setShowGroqKey] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');

  // Memoized stats fetch function to satisfy dependency guidelines
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setStatsError(null);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: {
          'x-admin-secret': adminSecret,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem('echofilter_admin_secret');
          setIsAuthenticated(false);
          throw new Error('Invalid secret key. Please log in again.');
        }
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch telemetry stats.');
      }

      const data = await res.json();
      setStats(data);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'An error occurred.';
      setStatsError(errMessage);
    } finally {
      setLoading(false);
    }
  }, [adminSecret]);

  // Sync token from sessionStorage on mount
  useEffect(() => {
    const savedSecret = sessionStorage.getItem('echofilter_admin_secret');
    if (savedSecret) {
      setTimeout(() => {
        setAdminSecret(savedSecret);
        setSecretInput(savedSecret);
        setIsAuthenticated(true);
      }, 0);
    }
  }, []);

  // Fetch stats when authenticated
  useEffect(() => {
    if (isAuthenticated && adminSecret && !stats) {
      const timer = setTimeout(() => {
        fetchStats();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, adminSecret, stats, fetchStats]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretInput.trim()) {
      setLoginError('Secret key cannot be empty.');
      return;
    }
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: {
          'x-admin-secret': secretInput,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Invalid secret key.');
        }
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to authenticate.');
      }

      const data = await res.json();
      setStats(data);
      setAdminSecret(secretInput);
      setIsAuthenticated(true);
      sessionStorage.setItem('echofilter_admin_secret', secretInput);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'An error occurred during verification.';
      setLoginError(errMessage);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('echofilter_admin_secret');
    setIsAuthenticated(false);
    setAdminSecret('');
    setSecretInput('');
    setStats(null);
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groqKeyInput.trim()) {
      setConfigError('API Key cannot be empty.');
      return;
    }

    setConfigLoading(true);
    setConfigSuccess(null);
    setConfigError(null);

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({ groqApiKey: groqKeyInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update Groq API key.');
      }

      setConfigSuccess('Groq API Key updated successfully!');
      setGroqKeyInput('');
      fetchStats(); // Refresh stats to update indicators
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'An error occurred.';
      setConfigError(errMessage);
    } finally {
      setConfigLoading(false);
    }
  };

  const [copying, setCopying] = useState<boolean>(false);
  const sqlSchemaText = `CREATE TABLE IF NOT EXISTS usage_logs (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    search_query TEXT NOT NULL,
    tokens_used INT NOT NULL DEFAULT 0,
    credits_consumed DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    using_custom_key BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);

-- RPC function to aggregate dashboard stats server-side
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'tableExists', true,
    'totalUsers', COALESCE((SELECT count(DISTINCT user_id)::int FROM usage_logs), 0),
    'totalCalls', COALESCE((SELECT count(*)::int FROM usage_logs), 0),
    'totalCreditsUsed', COALESCE((SELECT round(sum(credits_consumed)::numeric, 2)::float FROM usage_logs), 0.0),
    'topUsers', COALESCE((
      SELECT jsonb_agg(t) FROM (
        SELECT user_id AS "userId", count(*)::int AS "callsCount", round(sum(credits_consumed)::numeric, 2)::float AS "creditsUsed"
        FROM usage_logs
        GROUP BY user_id
        ORDER BY "creditsUsed" DESC, "callsCount" DESC
        LIMIT 10
      ) t
    ), '[]'::jsonb),
    'dailyStats', COALESCE((
      SELECT jsonb_agg(d) FROM (
        SELECT created_at::date::text AS "date", count(*)::int AS "callsCount", round(sum(credits_consumed)::numeric, 2)::float AS "creditsUsed"
        FROM usage_logs
        GROUP BY created_at::date
        ORDER BY "date" ASC
      ) d
    ), '[]'::jsonb)
  ) INTO result;
  
  RETURN result;
END;
$$;`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlSchemaText);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const maxCredits = stats?.dailyStats && stats.dailyStats.length > 0
    ? Math.max(...stats.dailyStats.map(d => d.creditsUsed), 0.1)
    : 1;

  const maxCalls = stats?.dailyStats && stats.dailyStats.length > 0
    ? Math.max(...stats.dailyStats.map(d => d.callsCount), 1)
    : 1;

  if (!isAuthenticated) {
    return (
      <LoginScreen
        secretInput={secretInput}
        setSecretInput={setSecretInput}
        loginError={loginError}
        loginLoading={loginLoading}
        handleLogin={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col md:flex-row relative overflow-hidden font-sans">
      
      {/* Dynamic light sources in background */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* LEFT SIDEBAR NAVIGATION */}
      <DashboardSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        handleLogout={handleLogout}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 md:h-screen overflow-y-auto">
        
        {/* Top Header Panel */}
        <header className="px-6 py-4 md:px-10 border-b border-white/[0.06] flex flex-col sm:flex-row justify-between sm:items-center gap-3 backdrop-blur-md bg-[#07070a]/40">
          <div>
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Live Operations Control</span>
            <h1 className="text-xl font-bold tracking-tight text-white mt-0.5">
              {activeTab === 'overview' ? 'Telemetry Analytics Overview' : 'Server Keys & Configurations'}
            </h1>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-center">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Operational Node
            </span>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-2 bg-white/[0.04] border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer text-slate-300 disabled:opacity-50"
              title="Refresh statistics"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <div className="p-6 md:p-10 flex-1 space-y-8">
          
          {statsError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{statsError}</span>
              </span>
              <button onClick={fetchStats} className="px-3 py-1 bg-white/[0.06] border border-white/10 hover:bg-white/10 text-xs text-white rounded-lg transition-all">Retry</button>
            </div>
          )}

          {loading && !stats ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-10 h-10 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin mb-4"></div>
              <p className="text-sm text-slate-400 font-medium animate-pulse">Synchronizing database log cache...</p>
            </div>
          ) : stats ? (
            activeTab === 'overview' ? (
              <OverviewTab
                stats={stats}
                maxCredits={maxCredits}
                maxCalls={maxCalls}
                sqlSchemaText={sqlSchemaText}
                copying={copying}
                copySqlToClipboard={copySqlToClipboard}
                setActiveTab={setActiveTab}
              />
            ) : (
              <CredentialsTab
                groqKeyInput={groqKeyInput}
                setGroqKeyInput={setGroqKeyInput}
                showGroqKey={showGroqKey}
                setShowGroqKey={setShowGroqKey}
                configLoading={configLoading}
                configSuccess={configSuccess}
                configError={configError}
                handleUpdateConfig={handleUpdateConfig}
              />
            )
          ) : (
            <div className="text-center py-20 text-slate-500 text-sm">
              Telemetry sync unavailable. Verify backend server logs.
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
