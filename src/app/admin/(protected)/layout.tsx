'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

/* ─── Logo mark ──────────────────────────────────────────────────────────── */
function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 14C6 7 12 3 20 2C28 1 42 4 45 14C48 24 44 38 36 44C28 50 14 46 8 38C2 30 6 21 6 14Z" fill="#e8483a" />
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="22" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif" letterSpacing="-0.5">H</text>
    </svg>
  );
}

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/admin/dashboard',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    label: 'Create Quiz',
    href: '/admin/quiz/create',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),
  },
  {
    label: 'Manage Quizzes',
    href: '/admin/quiz/manage',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    label: 'Results',
    href: '/admin/results',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6"  y1="20" x2="6"  y2="14"/>
      </svg>
    ),
  },
];

/* ─── Loading skeleton ───────────────────────────────────────────────────── */
function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#fafaf9]">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <LogoMark size={44} />
        <div className="flex items-center gap-2 text-sm text-charcoal-400 font-medium">
          <svg className="animate-spin text-brand-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Verifying session…
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar nav item ───────────────────────────────────────────────────── */
function NavItem({
  href, label, icon, active, onClick,
}: {
  href: string; label: string; icon: React.ReactNode; active?: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        group flex items-center gap-3
        px-3.5 py-2.5 rounded-xl
        font-display font-medium text-sm
        transition-all duration-150
        ${active
          ? 'bg-brand-600 text-white shadow-brand-sm'
          : 'text-charcoal-400 hover:bg-white/8 hover:text-white'
        }
      `}
    >
      <span className={`flex-shrink-0 transition-colors ${active ? 'text-white' : 'text-charcoal-500 group-hover:text-white'}`}>
        {icon}
      </span>
      {label}
      {active && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" aria-hidden="true" />
      )}
    </Link>
  );
}

/* ─── Main layout ────────────────────────────────────────────────────────── */
export default function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const [loading,       setLoading]       = useState(true);
  const [userEmail,     setUserEmail]     = useState<string | null>(null);
  const [signingOut,    setSigningOut]    = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/admin/login');
      } else {
        setUserEmail(session.user.email ?? null);
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  if (loading) return <LoadingScreen />;

  /* User initials avatar */
  const initials = userEmail
    ? userEmail.split('@')[0].slice(0, 2).toUpperCase()
    : 'HR';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Brand lockup */}
      <div className="flex items-center gap-3 px-4 py-5 mb-2">
        <LogoMark size={36} />
        <div className="flex flex-col leading-none min-w-0">
          <span className="font-display font-bold text-white text-base tracking-tight">HighOnSwift</span>
          <span className="text-white/35 text-[9px] font-medium tracking-widest uppercase truncate">Interview Portal</span>
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 mb-2">
        <span className="text-white/25 text-[10px] font-display font-semibold tracking-widest uppercase">
          Navigation
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 px-3 flex-1" aria-label="Admin navigation">
        {NAV_ITEMS.map(item => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
            onClick={() => setMobileSidebarOpen(false)}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-5 space-y-2">
        {/* Divider */}
        <div className="border-t border-white/10 mb-3" />

        {/* User card */}
        <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/6 border border-white/8">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <span className="font-display font-bold text-white text-xs">{initials}</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-display font-semibold text-white text-xs truncate">
              {userEmail ?? 'Admin'}
            </span>
            <span className="text-white/35 text-[10px] font-medium">HR Administrator</span>
          </div>
        </div>

        {/* Sign out button */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="
            w-full flex items-center gap-3
            px-3.5 py-2.5 rounded-xl
            font-display font-medium text-sm
            text-charcoal-400 hover:text-red-400
            hover:bg-red-500/10
            transition-all duration-150
            disabled:opacity-50
          "
        >
          {signingOut ? (
            <svg className="animate-spin text-charcoal-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          )}
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-warm-100">

      {/* ── Desktop sidebar ── */}
      <aside className="
        hidden lg:flex flex-col
        w-60 xl:w-64 flex-shrink-0
        sticky top-0 h-dvh
        bg-gradient-to-b from-charcoal-900 to-charcoal-950
        border-r border-white/5
        overflow-y-auto scrollbar-hide
      ">
        {/* Decorative glow */}
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full bg-brand-600/15 blur-[64px] pointer-events-none" aria-hidden="true" />
        <div className="relative z-10 flex flex-col h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-charcoal-950/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <aside className="
            relative z-10 w-72 h-full flex flex-col
            bg-gradient-to-b from-charcoal-900 to-charcoal-950
            shadow-xl animate-slide-in-left
            overflow-y-auto scrollbar-hide
          ">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Mobile topbar */}
        <header className="
          lg:hidden sticky top-0 z-40
          flex items-center justify-between
          bg-white/95 backdrop-blur-md
          border-b border-warm-200
          px-4 py-3
          shadow-xs
        ">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-xl text-charcoal-600 hover:bg-warm-100 hover:text-charcoal-900 transition-colors"
            aria-label="Open navigation menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6"  x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="font-display font-bold text-charcoal-900 text-sm">HighOnSwift</span>
          </div>

          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <span className="font-display font-bold text-white text-xs">{initials}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 sm:p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}