import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google';
import './globals.css';

/* ============================================================
   FONTS
   ============================================================ */
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
  preload: true,
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://interviews.highonswift.com'),

  title: {
    default: 'HOS Interview Portal — HighOnSwift',
    template: '%s · HighOnSwift',
  },
  description:
    'AI-powered interview management platform by HighOnSwift. Fast, practical, and business-ready hiring assessments.',

  keywords: [
    'HighOnSwift',
    'interview management',
    'hiring assessment',
    'HR platform',
    'AI recruitment',
    'candidate quiz',
  ],

  authors: [{ name: 'HighOnSwift', url: 'https://highonswift.com' }],
  creator: 'HighOnSwift',
  publisher: 'HighOnSwift',

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://interview.highonswift.com',
    siteName: 'HOS Interview Portal',
    title: 'HOS Interview Portal — HighOnSwift',
    description:
      'AI-powered interview management. Fast. Practical. Business-Ready.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HighOnSwift Interview Portal',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'HOS Interview Portal — HighOnSwift',
    description:
      'AI-powered interview management. Fast. Practical. Business-Ready.',
    images: ['/og-image.png'],
    creator: '@highonswift',
  },

  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },

  manifest: '/manifest.json',

  robots: {
    index: false,   // keep the portal unlisted from search engines
    follow: false,
  },
};

/* ============================================================
   VIEWPORT
   ============================================================ */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e8483a' },
    { media: '(prefers-color-scheme: dark)', color: '#d03a2d' },
  ],
};

/* ============================================================
   ROOT LAYOUT
   ============================================================ */
import MobileBlocker from '@/components/MobileBlocker';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to Google Fonts CDN for faster font load */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Inline critical brand token so first paint is on-brand */}
        <style dangerouslySetInnerHTML={{
          __html: `
          :root {
            --brand-primary: #e8483a;
            --brand-hover:   #d03a2d;
            --color-bg:      #fafaf9;
          }
          /* Prevent flash of unstyled body */
          body { background-color: #fafaf9; }
        `}} />
      </head>

      <body
        className="
          font-body antialiased
          bg-[--color-bg] text-charcoal-900
          min-h-dvh flex flex-col
          selection:bg-brand-100 selection:text-brand-900
        "
      >
        {/* Mobile device blocker */}
        <MobileBlocker />

        {/* Skip-to-content link for keyboard / screen-reader users */}
        <a
          href="#main-content"
          className="
            sr-only focus:not-sr-only
            fixed top-4 left-4 z-[100]
            bg-brand-600 text-white
            font-display font-semibold text-sm
            px-4 py-2 rounded-xl
            shadow-brand-sm
            focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2
            transition-all duration-150
          "
        >
          Skip to content
        </a>

        {/* Main content area — grows to fill viewport */}
        <main
          id="main-content"
          className="flex-1 flex flex-col"
        >
          {children}
        </main>

        {/* Portal-level toast / notification mount point */}
        <div id="toast-root" aria-live="polite" aria-atomic="true" />

        {/* Modal mount point */}
        <div id="modal-root" />
      </body>
    </html>
  );
}