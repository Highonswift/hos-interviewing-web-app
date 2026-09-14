import Link from 'next/link';
import { Zap, Target, Lock, BarChart3 } from 'lucide-react';

/* ─── Inline SVG logo mark ───────────────────────────────────────────────── */
function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Coral-red rounded blob */}
      <path
        d="M6 14C6 7 12 3 20 2C28 1 42 4 45 14C48 24 44 38 36 44C28 50 14 46 8 38C2 30 6 21 6 14Z"
        fill="#e8483a"
      />
      {/* White "H" letterform */}
      <text
        x="50%"
        y="54%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="white"
        fontSize="22"
        fontWeight="700"
        fontFamily="Plus Jakarta Sans, DM Sans, sans-serif"
        letterSpacing="-0.5"
      >
        H
      </text>
    </svg>
  );
}

/* ─── Feature pill ───────────────────────────────────────────────────────── */
function FeaturePill({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white border border-warm-200 text-charcoal-600 text-xs font-semibold font-display px-3 py-1.5 rounded-pill shadow-xs">
      <Icon size={14} className="text-brand-500" strokeWidth={2.5} />
      {label}
    </span>
  );
}

/* ─── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-display font-bold text-2xl text-charcoal-900 leading-none">
        {value}
      </span>
      <span className="text-xs text-charcoal-400 font-medium text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="relative flex flex-col min-h-dvh overflow-hidden">

      {/* ── Background: dot grid + brand radial glow ── */}
      <div
        className="absolute inset-0 -z-10 bg-[#fafaf9]"
        aria-hidden="true"
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle, #ccc7c1 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Top-left coral glow */}
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-brand-500/10 blur-[96px]" />
        {/* Bottom-right warm glow */}
        <div className="absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full bg-brand-300/10 blur-[80px]" />
      </div>

      {/* ── Top nav bar ── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <LogoMark size={38} />
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-charcoal-900 text-lg tracking-tight">
              HighOnSwift
            </span>
            <span className="text-[10px] font-medium text-charcoal-400 tracking-wide uppercase">
              Interview Portal
            </span>
          </div>
        </div>

        {/* Nav CTA */}
        <Link
          href="/admin/login"
          className="
            hidden sm:inline-flex items-center gap-2
            font-display font-semibold text-sm
            text-charcoal-600 hover:text-brand-600
            border border-warm-300 hover:border-brand-300
            bg-white hover:bg-brand-50
            px-4 py-2 rounded-xl
            shadow-xs hover:shadow-brand-sm
            transition-all duration-200
          "
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Admin Login
        </Link>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6 text-center">

        {/* Eyebrow badge */}
        <div className="animate-fade-down mb-6">
          <span className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-display font-semibold px-4 py-1.5 rounded-pill">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse-brand" aria-hidden="true" />
            AI Solutions · Fast · Practical · Business-Ready
          </span>
        </div>

        {/* Heading */}
        <h1
          className="
            animate-fade-up stagger-1
            font-display font-extrabold
            text-charcoal-900
            text-4xl sm:text-5xl lg:text-6xl
            leading-[1.1] tracking-tight
            max-w-3xl mb-5
          "
        >
          Hire smarter with{' '}
          <span
            className="relative inline-block"
            style={{
              background: 'linear-gradient(135deg, #f05044 0%, #d03a2d 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            AI-powered
          </span>{' '}
          interviews
        </h1>

        {/* Subheading */}
        <p
          className="
            animate-fade-up stagger-2
            font-body text-charcoal-500 text-lg sm:text-xl
            leading-relaxed max-w-xl mb-8
          "
        >
          The HighOnSwift Interview Portal helps your HR team create,
          manage, and evaluate candidate assessments — all in one place.
        </p>

        {/* Feature pills */}
        <div className="animate-fade-up stagger-3 flex flex-wrap justify-center gap-2 mb-10">
          <FeaturePill icon={Zap} label="Instant results" />
          <FeaturePill icon={Target} label="Smart scoring" />
          <FeaturePill icon={Lock} label="Secure & private" />
          <FeaturePill icon={BarChart3} label="Detailed analytics" />
        </div>

        {/* Stats row */}
        <div className="animate-fade-up stagger-5 mt-12 flex items-center gap-8 sm:gap-12">
          <StatCard value="100%" label="Browser-based" />
          <div className="w-px h-8 bg-warm-300" aria-hidden="true" />
          <StatCard value="∞" label="Candidates" />
          <div className="w-px h-8 bg-warm-300" aria-hidden="true" />
          <StatCard value="Real-time" label="Results" />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 py-6 px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-warm-200">
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
          <span className="font-display font-semibold text-xs text-charcoal-400">
            HighOnSwift
          </span>
        </div>
        <p className="text-xs text-charcoal-400 font-medium">
          AI Solutions. Fast. Practical. Business-Ready.
        </p>
        <p className="text-xs text-charcoal-400">
          © {new Date().getFullYear()} HighOnSwift. All rights reserved.
        </p>
      </footer>

    </div>
  );
}