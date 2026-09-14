import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff3f2',
          100: '#ffe4e1',
          200: '#ffcdc8',
          300: '#ffaaa3',
          400: '#ff7b70',
          500: '#f05044',
          600: '#e8483a',
          700: '#d03a2d',
          800: '#ad2f24',
          900: '#8e2920',
          950: '#4e1310',
        },

        charcoal: {
          50:  '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          800: '#3d3d3d',
          900: '#2d2d2d',
          950: '#1a1a1a',
        },

        warm: {
          50:  '#fafaf9',
          100: '#f5f4f2',
          200: '#eeece9',
          300: '#e2deda',
          400: '#ccc7c1',
          500: '#b5afa8',
          600: '#979088',
          700: '#7d756d',
          800: '#67605a',
          900: '#564f4a',
        },

        surface:    '#fafaf9',
        'surface-raised': '#ffffff',
        border:     '#e2deda',
        muted:      '#97908838',
      },

      fontFamily: {
        display: ['Plus Jakarta Sans', 'DM Sans', 'sans-serif'],
        body:    ['DM Sans', 'Plus Jakarta Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
        'xs':  ['0.75rem',  { lineHeight: '1.125rem' }],
        'sm':  ['0.875rem', { lineHeight: '1.375rem' }],
        'base':['1rem',     { lineHeight: '1.625rem' }],
        'lg':  ['1.125rem', { lineHeight: '1.75rem' }],
        'xl':  ['1.25rem',  { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem',   { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.375rem' }],
        '4xl': ['2.25rem',  { lineHeight: '2.75rem' }],
        '5xl': ['3rem',     { lineHeight: '3.5rem' }],
        '6xl': ['3.75rem',  { lineHeight: '4.25rem' }],
      },

      borderRadius: {
        'xs':  '0.25rem',
        'sm':  '0.375rem',
        DEFAULT:'0.5rem',
        'md':  '0.625rem',
        'lg':  '0.75rem',
        'xl':  '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        'pill':'9999px',
      },

      boxShadow: {
        'xs':   '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'sm':   '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        DEFAULT:'0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'md':   '0 6px 16px -2px rgb(0 0 0 / 0.10), 0 3px 6px -2px rgb(0 0 0 / 0.06)',
        'lg':   '0 12px 28px -4px rgb(0 0 0 / 0.12), 0 4px 10px -3px rgb(0 0 0 / 0.07)',
        'xl':   '0 20px 40px -6px rgb(0 0 0 / 0.14), 0 8px 16px -4px rgb(0 0 0 / 0.08)',
        '2xl':  '0 32px 60px -8px rgb(0 0 0 / 0.18)',
        'brand-sm': '0 4px 14px 0 rgb(232 72 58 / 0.25)',
        'brand-md': '0 8px 24px 0 rgb(232 72 58 / 0.30)',
        'brand-lg': '0 16px 40px 0 rgb(232 72 58 / 0.35)',
        'inner':    'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'none':     'none',
      },

      backgroundImage: {
        'hero-gradient':   'linear-gradient(135deg, #fff3f2 0%, #fafaf9 50%, #fff8f7 100%)',
        'brand-gradient':  'linear-gradient(135deg, #f05044 0%, #e8483a 50%, #d03a2d 100%)',
        'card-shimmer':    'linear-gradient(135deg, #ffffff 0%, #fff8f7 100%)',
        'admin-mesh':      'radial-gradient(at 20% 20%, #fff3f2 0px, transparent 50%), radial-gradient(at 80% 80%, #fafaf9 0px, transparent 50%)',
        'sidebar-gradient':'linear-gradient(180deg, #2d2d2d 0%, #1a1a1a 100%)',
      },

      animation: {
        'fade-in':        'fadeIn 0.4s ease-out both',
        'fade-up':        'fadeUp 0.5s ease-out both',
        'fade-down':      'fadeDown 0.4s ease-out both',
        'slide-in-left':  'slideInLeft 0.4s ease-out both',
        'slide-in-right': 'slideInRight 0.4s ease-out both',
        'scale-in':       'scaleIn 0.35s ease-out both',
        'pulse-brand':    'pulseBrand 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow':      'spin 3s linear infinite',
        'bounce-soft':    'bounceSoft 1.5s ease-in-out infinite',
        'check-draw':     'checkDraw 0.6s ease-out 0.2s both',
        'confetti-pop':   'confettiPop 0.5s ease-out both',
        'timer-shrink':   'timerShrink linear both',
        'shimmer':        'shimmer 1.8s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeDown: {
          from: { opacity: '0', transform: 'translateY(-12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        pulseBrand: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        checkDraw: {
          from: { strokeDashoffset: '100' },
          to:   { strokeDashoffset: '0' },
        },
        confettiPop: {
          '0%':   { transform: 'scale(0) rotate(-10deg)', opacity: '0' },
          '60%':  { transform: 'scale(1.15) rotate(3deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        timerShrink: {
          from: { width: '100%' },
          to:   { width: '0%' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },

      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'snappy': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },

      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
      },

      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '68': '17rem',
        '72': '18rem',
        '80': '20rem',
        '88': '22rem',
        '96': '24rem',
      },

      zIndex: {
        '1':   '1',
        '2':   '2',
        '60':  '60',
        '70':  '70',
        '80':  '80',
        '90':  '90',
        '100': '100',
      },

      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [],
}

export default config