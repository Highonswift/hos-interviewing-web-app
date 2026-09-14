'use client';

import { useEffect, useState } from 'react';

export default function MobileBlocker() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent || '' : '';
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isSmallScreen = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
      setIsMobile(isMobileUA || isSmallScreen);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  if (!isMobile) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-[#1a1a1a] flex flex-col items-center justify-center p-6 text-center text-white select-none">
      {/* Background radial glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#e8483a]/15 rounded-full blur-[90px]" />
      </div>

      <div className="relative z-10 max-w-sm flex flex-col items-center animate-fade-in">
        {/* Device icon badge */}
        <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/15 flex items-center justify-center mb-6 shadow-xl backdrop-blur-md">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f05044" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>

        {/* Title */}
        <span className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#e8483a]/20 text-[#ff7b70] border border-[#e8483a]/30 mb-3">
          Desktop / Laptop Only
        </span>

        <h1 className="text-2xl font-bold font-display text-white mb-3 tracking-tight">
          Laptop View Required
        </h1>

        <p className="text-sm text-charcoal-300 leading-relaxed mb-6 font-body">
          The HighOnSwift Interview Portal contains coding environments, timed assessments, and anti-cheat mechanisms designed strictly for laptop and desktop screens.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-charcoal-300 text-left w-full flex items-start gap-3 mb-6">
          <span className="text-base flex-shrink-0">💻</span>
          <div>
            <p className="font-semibold text-white mb-0.5">How to proceed</p>
            <p>Please open this assessment link on your laptop or desktop web browser (Chrome, Edge, Safari, or Firefox).</p>
          </div>
        </div>

        <p className="text-[11px] text-charcoal-400">
          HighOnSwift Assessment Platform · Secure Hiring Portal
        </p>
      </div>
    </div>
  );
}
