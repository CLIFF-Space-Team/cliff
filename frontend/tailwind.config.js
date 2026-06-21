/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './providers/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // Surface tiers — three flat values, no gradients
        'surface-0': 'hsl(var(--surface-0))',
        'surface-1': 'hsl(var(--surface-1))',
        'surface-2': 'hsl(var(--surface-2))',
        'surface-3': 'hsl(var(--surface-3))',

        // Hairline borders
        'border-subtle': 'hsl(var(--border-subtle))',
        'border-default': 'hsl(var(--border-default))',
        'border-strong': 'hsl(var(--border-strong))',

        // Text tiers
        'text-primary': 'hsl(var(--text-primary))',
        'text-secondary': 'hsl(var(--text-secondary))',
        'text-tertiary': 'hsl(var(--text-tertiary))',
        'text-disabled': 'hsl(var(--text-disabled))',

        // Single accent
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },

        // Threat semantic — only place color lives
        threat: {
          critical: 'hsl(var(--threat-critical))',
          high: 'hsl(var(--threat-high))',
          moderate: 'hsl(var(--threat-moderate))',
          low: 'hsl(var(--threat-low))',
          none: 'hsl(var(--threat-none))',
        },

        // Radix-style aliases (drive shadcn-style primitives)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'JetBrains Mono', 'Consolas', 'monospace'],
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-out': { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        'slide-in-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'pulse-gentle': {
          '0%, 100%': { opacity: '0.85' },
          '50%': { opacity: '1' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'critical-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 hsl(var(--threat-critical) / 0.45)' },
          '50%': { boxShadow: '0 0 0 8px hsl(var(--threat-critical) / 0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'fade-out': 'fade-out 200ms ease-in',
        'slide-in-up': 'slide-in-up 240ms ease-out',
        'slide-in-right': 'slide-in-right 240ms ease-out',
        'pulse-gentle': 'pulse-gentle 2.4s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'critical-pulse': 'critical-pulse 2.5s ease-in-out infinite',
      },
      boxShadow: {
        panel:
          '0 1px 0 hsl(var(--border-subtle)) inset, 0 8px 24px rgba(0, 0, 0, 0.4)',
        'glow-subtle': '0 0 0 1px hsl(var(--border-default))',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
