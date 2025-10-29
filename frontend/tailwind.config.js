/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        
        // 🖤 Pure Black Theme Extensions - Modernized with Better Visibility
        'pure-black': '#0a0a0a',       // Slightly lighter for better visibility
        'almost-black': '#141414',
        'deep-black': '#1a1a1a',
        'charcoal': '#262626',
        
        // Minimal accent colors for pure black theme
        'accent-success': 'hsl(var(--accent-success))',
        'accent-warning': 'hsl(var(--accent-warning))',
        'accent-danger': 'hsl(var(--accent-danger))',
        'accent-info': 'hsl(var(--accent-info))',
        'accent-ai': 'hsl(var(--accent-ai))',
        
        // Gray scale for pure black theme
        'gray-950': '#0a0a0a',
        'gray-900': '#141414',
        'gray-850': '#1a1a1a',
        'gray-800': '#262626',
        'gray-750': '#333333',
        'gray-700': '#404040',
        
        // Modern gradient colors for Pure Black theme
        'space': {
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
        
        // Professional gradient accents
        'gradient': {
          'start': '#ffffff',
          'mid': '#e2e8f0',
          'end': '#cbd5e1',
        },
        
        // Threat level colors - optimized for black background
        'threat': {
          critical: '#ff4444',
          high: '#ff8800',
          moderate: '#4488ff',
          low: '#44ff88',
          none: '#888888',
        },
        
        // CLIFF specific colors
        'cliff': {
          black: '#000000',
          'almost-black': '#0a0a0a',
          'deep-black': '#141414',
          charcoal: '#1a1a1a',
          'dark-gray': '#262626',
          'medium-gray': '#404040',
          'light-gray': '#666666',
          white: '#ffffff',
          'off-white': '#f8f8f8',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "Monaco", "Courier New", "monospace"],
      },
      
      // 🖤 Pure Black Theme Extensions - Modern & Professional
      backgroundImage: {
        'pure-black-gradient': 'linear-gradient(135deg, #0a0a0a 0%, #141414 50%, #1a1a1a 100%)',
        'dark-gradient': 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        'minimal-gradient': 'linear-gradient(180deg, #0a0a0a 0%, #141414 100%)',
        'space-gradient': 'linear-gradient(135deg, #0a0a0a 0%, #0f0f0f 25%, #141414 50%, #1a1a1a 75%, #262626 100%)',
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'star-field': `
          radial-gradient(1px 1px at 30px 50px, rgba(255,255,255,0.3), transparent),
          radial-gradient(1px 1px at 80px 120px, rgba(255,255,255,0.2), transparent),
          radial-gradient(1px 1px at 150px 80px, rgba(255,255,255,0.4), transparent)
        `,
      },
      
      // Enhanced animations for pure black theme
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "fade-out": "fadeOut 0.5s ease-in-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "slide-in-up": "slideInUp 0.3s ease-out",
        "slide-in-down": "slideInDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "scale-out": "scaleOut 0.2s ease-in",
        "bounce-gentle": "bounceGentle 2s ease-in-out infinite",
        "pulse-gentle": "pulseGentle 2s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "float": "float 4s ease-in-out infinite",
        "rotate-slow": "rotateSlow 10s linear infinite",
        "twinkle": "twinkle 3s ease-in-out infinite",
        "gradient-shift": "gradientShift 4s ease-in-out infinite",
        "voice-pulse": "voicePulse 1.8s ease-in-out infinite",
        "loading-dots": "loadingDots 1.5s ease-in-out infinite",
        "critical-pulse": "criticalPulse 2.5s ease-in-out infinite",
      },
      
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideInUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        slideInDown: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        scaleOut: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.9)", opacity: "0" },
        },
        bounceGentle: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseGentle: {
          "0%, 100%": { opacity: "0.8" },
          "50%": { opacity: "1" },
        },
        glow: {
          "0%": { boxShadow: "0 0 15px rgba(255, 255, 255, 0.1)" },
          "100%": { boxShadow: "0 0 25px rgba(255, 255, 255, 0.2)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        rotateSlow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.2", transform: "scale(0.9)" },
          "50%": { opacity: "0.6", transform: "scale(1.1)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        voicePulse: {
          "0%, 100%": { 
            boxShadow: "0 0 15px rgba(255, 255, 255, 0.2)",
            borderColor: "rgba(255, 255, 255, 0.3)"
          },
          "50%": { 
            boxShadow: "0 0 25px rgba(255, 255, 255, 0.4)",
            borderColor: "rgba(255, 255, 255, 0.5)"
          },
        },
        loadingDots: {
          "0%, 80%, 100%": { opacity: "0.3" },
          "40%": { opacity: "0.8" },
        },
        criticalPulse: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(255, 68, 68, 0.2)" },
          "50%": { boxShadow: "0 0 30px rgba(255, 68, 68, 0.4)" },
        },
      },
      
      // Box shadows optimized for pure black theme
      boxShadow: {
        'minimal': '0 1px 3px rgba(255, 255, 255, 0.1)',
        'gentle': '0 4px 6px rgba(255, 255, 255, 0.05)',
        'medium': '0 8px 15px rgba(255, 255, 255, 0.1)',
        'large': '0 15px 25px rgba(255, 255, 255, 0.15)',
        'glow': '0 0 15px rgba(255, 255, 255, 0.1)',
        'glow-lg': '0 0 25px rgba(255, 255, 255, 0.15)',
        'inner': 'inset 0 0 10px rgba(255, 255, 255, 0.05)',
        'inner-lg': 'inset 0 0 20px rgba(255, 255, 255, 0.1)',
      },
      
      // Typography enhancements
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      
      // Spacing for pure black theme
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // Z-index layers
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      
      // Backdrop blur variants
      backdropBlur: {
        'xs': '2px',
        'minimal': '8px',
        'gentle': '12px',
        'strong': '20px',
      },
      
      // Border radius for pure black theme
      borderRadius: {
        'xs': '0.125rem',
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      extend: {
        height: {
          '128': '32rem',
          '144': '36rem',
          '160': '40rem',
        }
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}