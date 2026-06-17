'use client';

import React from 'react';

interface LoginScreenProps {
  secretInput: string;
  setSecretInput: (val: string) => void;
  loginError: string | null;
  handleLogin: (e: React.FormEvent) => void;
}

export default function LoginScreen({
  secretInput,
  setSecretInput,
  loginError,
  handleLogin,
}: LoginScreenProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#07070a] overflow-hidden text-slate-100 px-4">
      {/* Ambient Gradient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md backdrop-blur-xl bg-white/[0.02] border border-white/[0.08] p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl bg-white/[0.04] border border-white/10 mb-4 shadow-inner">
            <svg className="w-8 h-8 text-purple-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">EchoFilter Admin</h1>
          <p className="text-sm text-slate-400 mt-2">Enter secret key to access dashboard metrics</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="secret" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Admin Secret</label>
            <input
              id="secret"
              type="password"
              placeholder="Enter secret (default: admin123)"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-slate-600 text-white text-center font-semibold tracking-widest"
            />
          </div>

          {loginError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:brightness-110 active:scale-[0.98] cursor-pointer"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
