'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/* ─── Logo mark ──────────────────────────────────────────────────────────── */
function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 14C6 7 12 3 20 2C28 1 42 4 45 14C48 24 44 38 36 44C28 50 14 46 8 38C2 30 6 21 6 14Z" fill="#e8483a" />
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="22" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif" letterSpacing="-0.5">H</text>
    </svg>
  );
}

/* ─── Feature item for left panel ───────────────────────────────────────── */
function PanelFeature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="mt-0.5 w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0 text-white">
        {icon}
      </div>
      <div>
        <p className="font-display font-semibold text-white text-sm">{title}</p>
        <p className="text-white/60 text-xs leading-relaxed mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

/* ─── Input wrapper with icon ────────────────────────────────────────────── */
function FieldWrapper({
  id, label, type, value, onChange, placeholder, icon, autoComplete,
}: {
  id: string; label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
  icon: React.ReactNode; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const isPw = type === 'password';

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-display font-semibold text-sm text-charcoal-700">
        {label}
      </label>
      <div className={`
        relative flex items-center bg-white border-2 rounded-2xl
        transition-all duration-200
        ${focused
          ? 'border-brand-400 shadow-[0_0_0_4px_rgb(232_72_58_/_0.10)]'
          : 'border-warm-300 hover:border-warm-400'
        }
      `}>
        {/* Leading icon */}
        <span className="absolute left-4 text-charcoal-400 pointer-events-none">{icon}</span>

        <input
          id={id}
          type={isPw && showPw ? 'text' : type}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="
            w-full pl-10 pr-10 py-3.5
            font-body text-[0.9375rem] text-charcoal-900
            placeholder:text-charcoal-400
            bg-transparent rounded-2xl
            focus:outline-none
          "
        />

        {/* Password toggle */}
        {isPw && (
          <button
            type="button"
            onClick={() => setShowPw(p => !p)}
            className="absolute right-4 text-charcoal-400 hover:text-charcoal-600 transition-colors"
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function AdminLogin() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/admin/dashboard');
    }
  };

  return (
    <div className="relative flex min-h-dvh overflow-hidden bg-[#fafaf9]">

      {/* ── Left brand panel (hidden on mobile) ── */}
      <aside className="
        hidden lg:flex flex-col justify-between
        w-[420px] xl:w-[480px] flex-shrink-0
        relative overflow-hidden
        bg-gradient-to-br from-charcoal-900 via-charcoal-900 to-charcoal-950
        px-10 py-10
      ">
        {/* Decorative glow blobs */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-brand-600/20 blur-[80px]" aria-hidden="true" />
        <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-brand-500/15 blur-[64px]" aria-hidden="true" />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-10" aria-hidden="true"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        {/* Top — brand lockup */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <LogoMark size={42} />
            <div className="flex flex-col leading-none">
              <span className="font-display font-bold text-white text-xl tracking-tight">HighOnSwift</span>
              <span className="text-white/40 text-[10px] font-medium tracking-widest uppercase">Interview Portal</span>
            </div>
          </div>

          <h2 className="font-display font-extrabold text-white text-3xl xl:text-4xl leading-tight tracking-tight mb-4">
            Your hiring<br />command centre.
          </h2>
          <p className="text-white/55 text-sm leading-relaxed max-w-xs">
            Manage assessments, track candidates, and review results — all from one place.
          </p>
        </div>

        {/* Mid — features */}
        <div className="relative z-10 flex flex-col gap-5 my-10">
          <PanelFeature
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
            }
            title="Create & manage quizzes"
            desc="Build tailored assessments for any domain in minutes."
          />
          <PanelFeature
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            }
            title="Candidate tracking"
            desc="Monitor submissions, scores, and tab-switch activity in real time."
          />
          <PanelFeature
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            }
            title="Detailed analytics"
            desc="Compare results, spot top performers, and export data."
          />
        </div>

        {/* Bottom — tagline */}
        <div className="relative z-10">
          <p className="text-white/30 text-xs font-medium">
            AI Solutions. Fast. Practical. Business-Ready.
          </p>
        </div>
      </aside>

      {/* ── Right login panel ── */}
      <div className="
        flex flex-1 flex-col items-center justify-center
        px-4 py-12 sm:px-8
        relative
      ">
        {/* Background accent */}
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 opacity-35"
            style={{ backgroundImage: 'radial-gradient(circle, #ccc7c1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-brand-500/8 blur-[96px]" />
        </div>

        {/* Mobile brand header */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <LogoMark size={36} />
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-charcoal-900 text-lg tracking-tight">HighOnSwift</span>
            <span className="text-[10px] font-medium text-charcoal-400 tracking-wide uppercase">Interview Portal</span>
          </div>
        </div>

        {/* Form card */}
        <div className="w-full max-w-sm animate-fade-up">

          {/* Heading */}
          <div className="mb-7 text-center lg:text-left">
            <h1 className="font-display font-extrabold text-charcoal-900 text-2xl sm:text-3xl tracking-tight mb-1.5">
              Welcome back
            </h1>
            <p className="text-charcoal-500 text-sm">
              Sign in to your admin account.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white border border-warm-200 rounded-3xl shadow-lg overflow-hidden">
            {/* Top accent */}
            <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700" />

            <form onSubmit={handleLogin} className="p-6 sm:p-7 space-y-5">

              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 animate-fade-down">
                  <svg width="15" height="15" className="mt-0.5 flex-shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-red-700 text-sm font-medium leading-snug">{error}</p>
                </div>
              )}

              {/* Email field */}
              <FieldWrapper
                id="email"
                label="Email address"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="admin@highonswift.com"
                autoComplete="email"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                }
              />

              {/* Password field */}
              <FieldWrapper
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••••"
                autoComplete="current-password"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                }
              />

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="
                  w-full flex items-center justify-center gap-2.5
                  bg-brand-600 hover:bg-brand-700
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-600
                  text-white font-display font-semibold text-[0.9375rem]
                  py-3.5 px-5 rounded-2xl
                  shadow-brand-sm hover:shadow-brand-md
                  active:scale-[0.97]
                  transition-all duration-200
                "
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}