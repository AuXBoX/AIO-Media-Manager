/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./electron/**/*.{js,ts}",
  ],
  theme: {
    // Responsive breakpoints (mobile-first)
    screens: {
      'sm': '640px',   // Small devices (landscape phones)
      'md': '768px',   // Medium devices (tablets)
      'lg': '1024px',  // Large devices (desktops)
      'xl': '1280px',  // Extra large devices (large desktops)
      '2xl': '1536px', // 2X large devices (larger desktops)
    },
    extend: {
      colors: {
        // Primary brand colors (Modern Blue - Plex Pro aesthetic)
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',  // Light blue
          500: '#3b82f6',  // Base blue
          600: '#2563eb',  // Dark blue
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
          subtle: 'rgba(59, 130, 246, 0.1)',  // Subtle blue background
        },
        // Background colors
        background: {
          primary: '#F8FAFC',    // Light gray-blue
          secondary: '#EEF4FF',  // Very light blue
          glass: 'rgba(255, 255, 255, 0.75)',  // Translucent white for glass effects
          white: '#FFFFFF',
        },
        // Text colors
        text: {
          primary: '#0F172A',    // Almost black
          secondary: '#334155',  // Dark gray
          tertiary: '#64748B',   // Medium gray
        },
        // Border colors
        border: {
          DEFAULT: 'rgba(148, 163, 184, 0.12)',
          hover: 'rgba(148, 163, 184, 0.24)',
        },
        // Secondary colors (slate for neutral UI elements)
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Semantic colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          '"Fira Sans"',
          '"Droid Sans"',
          '"Helvetica Neue"',
          'sans-serif',
        ],
        mono: [
          'source-code-pro',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Courier New"',
          'monospace',
        ],
      },
      backdropBlur: {
        xs: '2px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
      },
      fontSize: {
        'heading-1': ['2rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.025em' }],
        'heading-2': ['1.5rem', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '-0.02em' }],
        'heading-3': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        // Softer shadow system for modern Plex Pro aesthetic
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',           // Small
        'soft': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',         // Alias for small
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.05)',        // Medium
        'medium': '0 4px 6px -1px rgba(0, 0, 0, 0.05)',    // Alias for medium
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.05)',      // Large
        'hard': '0 10px 15px -3px rgba(0, 0, 0, 0.05)',    // Alias for large
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.05)',      // Extra Large
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.08)',    // Floating
        'floating': '0 25px 50px -12px rgba(0, 0, 0, 0.08)', // Floating panels
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',  // Inner shadow
        'inner-soft': 'inset 0 2px 4px rgba(0, 0, 0, 0.06)', // Inner soft
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'fade-out': 'fadeOut 0.2s ease-in-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'slide-in-down': 'slideInDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      transitionDuration: {
        '400': '400ms',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      minHeight: {
        '12': '3rem',
        '16': '4rem',
        '20': '5rem',
      },
    },
  },
  plugins: [],
}
