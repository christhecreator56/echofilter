'use client';

import React from 'react';

interface CredentialsTabProps {
  groqKeyInput: string;
  setGroqKeyInput: (val: string) => void;
  showGroqKey: boolean;
  setShowGroqKey: (val: boolean) => void;
  configLoading: boolean;
  configSuccess: string | null;
  configError: string | null;
  handleUpdateConfig: (e: React.FormEvent) => void;
}

export default function CredentialsTab({
  groqKeyInput,
  setGroqKeyInput,
  showGroqKey,
  setShowGroqKey,
  configLoading,
  configSuccess,
  configError,
  handleUpdateConfig,
}: CredentialsTabProps) {
  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      
      {/* Form Card */}
      <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.06] p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-purple-600 to-blue-600"></div>
        
        <div className="mb-6">
          <h3 className="text-base font-bold text-white">Server Groq API Configuration</h3>
          <p className="text-xs text-slate-400">Update fallback credentials stored on server environment. This changes process variables immediately.</p>
        </div>

        <form onSubmit={handleUpdateConfig} className="space-y-5">
          <div>
            <label htmlFor="apiKey" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Groq Key String</label>
            <div className="relative">
              <input
                id="apiKey"
                type={showGroqKey ? 'text' : 'password'}
                placeholder="gsk_..."
                value={groqKeyInput}
                onChange={(e) => setGroqKeyInput(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-xs text-white font-mono placeholder:text-slate-700"
              />
              <button
                type="button"
                onClick={() => setShowGroqKey(!showGroqKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {showGroqKey ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.815 7.815L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {configSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{configSuccess}</span>
            </div>
          )}

          {configError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>{configError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={configLoading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all duration-300 cursor-pointer shadow-[0_0_15px_rgba(147,51,234,0.15)] flex items-center justify-center gap-2"
          >
            {configLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                <span>Modifying Server Config...</span>
              </>
            ) : (
              <span>Save API Configuration</span>
            )}
          </button>
        </form>
      </div>

      {/* Security warning card */}
      <div className="backdrop-blur-md bg-white/[0.01] border border-white/[0.04] p-5 rounded-2xl space-y-3">
        <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          Credentials Advisory
        </h4>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Saving key configurations directly modifies the <code className="text-pink-400">.env.local</code> file in your workspace directory. Ensure that you do not commit raw keys to public repositories.
        </p>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          To modify the dashboard access password itself, configure the <code className="text-slate-200 font-semibold font-mono bg-white/5 px-1 py-0.5 rounded">ADMIN_SECRET</code> key in your server environment configuration variables.
        </p>
      </div>

    </div>
  );
}
