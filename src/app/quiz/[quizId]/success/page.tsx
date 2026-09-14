'use client';

import { useEffect, useState } from 'react';

/* ─── Logo mark ──────────────────────────────────────────────────────────── */
function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 14C6 7 12 3 20 2C28 1 42 4 45 14C48 24 44 38 36 44C28 50 14 46 8 38C2 30 6 21 6 14Z" fill="#e8483a" />
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="22" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif" letterSpacing="-0.5">H</text>
    </svg>
  );
}

/* ─── Confetti particle ──────────────────────────────────────────────────── */
interface Particle {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
  shape: 'rect' | 'circle' | 'triangle';
}

function ConfettiCanvas() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const colors = ['#e8483a', '#f05044', '#ffaaa3', '#ff7b70', '#2d2d2d', '#ffd166', '#06d6a0', '#118ab2'];
    const shapes: Particle['shape'][] = ['rect', 'circle', 'triangle'];
    const generated: Particle[] = Array.from({ length: 48 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      delay: Math.random() * 0.8,
      duration: 2.2 + Math.random() * 1.4,
      rotation: Math.random() * 360,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    }));
    setParticles(generated);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.x}%`,
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s both`,
          }}
        >
          {p.shape === 'circle' ? (
            <div style={{ width: p.size, height: p.size, borderRadius: '50%', backgroundColor: p.color, transform: `rotate(${p.rotation}deg)` }} />
          ) : p.shape === 'triangle' ? (
            <div style={{
              width: 0, height: 0,
              borderLeft: `${p.size / 2}px solid transparent`,
              borderRight: `${p.size / 2}px solid transparent`,
              borderBottom: `${p.size}px solid ${p.color}`,
              transform: `rotate(${p.rotation}deg)`,
            }} />
          ) : (
            <div style={{ width: p.size, height: p.size * 0.5, backgroundColor: p.color, borderRadius: 2, transform: `rotate(${p.rotation}deg)` }} />
          )}
        </div>
      ))}

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ─── Animated checkmark ─────────────────────────────────────────────────── */
function AnimatedCheck() {
  return (
    <div className="relative flex items-center justify-center mx-auto mb-6" style={{ width: 88, height: 88 }}>
      {/* Outer ring pulse */}
      <div className="absolute inset-0 rounded-full bg-green-200 animate-ping opacity-30" />
      {/* Mid ring */}
      <div className="absolute inset-2 rounded-full bg-green-100" />
      {/* Inner circle */}
      <div className="relative w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg animate-confetti-pop">
        <svg
          width="32" height="32" viewBox="0 0 24 24"
          fill="none" stroke="white"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{
            strokeDasharray: 100,
            strokeDashoffset: 0,
            animation: 'checkDraw 0.55s ease-out 0.3s both',
          }}
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    </div>
  );
}

/* ─── Info row ───────────────────────────────────────────────────────────── */
function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-charcoal-600">
      <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0 text-brand-600">
        {icon}
      </div>
      <span>{text}</span>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function SuccessPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay so CSS animation plays after hydration
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative flex flex-col min-h-dvh overflow-hidden bg-[#fafaf9]">

      {/* Confetti */}
      <ConfettiCanvas />

      {/* Background */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, #ccc7c1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-green-400/10 blur-[96px]" />
        <div className="absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full bg-brand-300/10 blur-[80px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <LogoMark size={34} />
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-charcoal-900 text-base tracking-tight">HighOnSwift</span>
            <span className="text-[10px] font-medium text-charcoal-400 tracking-wide uppercase">Interview Portal</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div
          className={`
            w-full max-w-md
            transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'}
          `}
        >
          {/* Card */}
          <div className="bg-white/95 backdrop-blur-sm border border-warm-200 rounded-3xl shadow-xl overflow-hidden">

            {/* Top accent — green for success */}
            <div className="h-1.5 w-full bg-gradient-to-r from-green-400 via-green-500 to-green-600" />

            <div className="px-7 sm:px-8 pt-8 pb-7">

              {/* Checkmark */}
              <AnimatedCheck />

              {/* Copy */}
              <div className="text-center mb-7">
                <div className="mb-3">
                  <span className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-display font-semibold px-3.5 py-1.5 rounded-pill">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Successfully submitted
                  </span>
                </div>

                <h1 className="font-display font-extrabold text-charcoal-900 text-2xl sm:text-3xl tracking-tight leading-tight mb-3">
                  Assessment complete!
                </h1>

                <p className="text-charcoal-500 text-sm leading-relaxed">
                  Your answers have been securely recorded. The HighOnSwift recruitment team will review your results and get back to you soon.
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-warm-100 mb-6" />

              {/* What's next info rows */}
              <div className="space-y-3 mb-7">
                <p className="font-display font-semibold text-xs text-charcoal-400 uppercase tracking-wider mb-3">
                  What happens next
                </p>

                <InfoRow
                  icon={
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  }
                  text="Your recruiter will contact you with the next steps."
                />

                <InfoRow
                  icon={
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                    </svg>
                  }
                  text="Results are typically reviewed within 1–2 business days."
                />

                <InfoRow
                  icon={
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  }
                  text="Return to your Google Meet or recruiter now."
                />
              </div>

              {/* Close button */}
              <button
                onClick={() => window.close()}
                className="
                  w-full flex items-center justify-center gap-2.5
                  bg-charcoal-900 hover:bg-charcoal-800
                  text-white font-display font-semibold text-[0.9375rem]
                  py-3.5 px-5 rounded-2xl
                  shadow-sm hover:shadow-md
                  active:scale-[0.97]
                  transition-all duration-200
                "
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
                Close this window
              </button>

            </div>
          </div>

          {/* Tagline */}
          <p className="text-center text-xs text-charcoal-400 mt-5 font-medium">
            Powered by{' '}
            <span className="text-brand-600 font-semibold">HighOnSwift</span>
            {' '}· AI Solutions. Fast. Practical. Business-Ready.
          </p>
        </div>
      </main>

      {/* Keyframes for check draw (supplement globals.css) */}
      <style>{`
        @keyframes checkDraw {
          from { stroke-dashoffset: 100; }
          to   { stroke-dashoffset: 0;   }
        }
        @keyframes confetti-pop {
          0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(3deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-confetti-pop {
          animation: confetti-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both;
        }
      `}</style>
    </div>
  );
}