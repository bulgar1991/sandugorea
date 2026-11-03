/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts,scss}'],
  future: {
    // `hover:` only applies on devices that can really hover (no sticky hover on phones).
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      fontFamily: {
        logo: ['"Arita Dotum"', 'Manrope', 'sans-serif'],
        sans: [
          'Manrope',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Arial',
          'sans-serif',
        ],
        display: ['"Cormorant Garamond"', 'Georgia', '"Times New Roman"', 'serif'],
        // Every title.
        title: ['"Train One"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        // Handwritten: logo, the photographer's name, signature.
        script: ['Allura', '"Cormorant Garamond"', 'cursive'],
        // Highlighted (gold) words inside titles.
        accent: ['Parisienne', '"Cormorant Garamond"', 'cursive'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      // The site palette: black everywhere, warm ivory text, champagne gold for links/buttons.
      // Use as classes (`bg-surface`, `text-accent`) and in SCSS as `theme('colors.accent')`.
      // Flat names (not nested objects) so theme() works without `.DEFAULT`.
      colors: {
        background: '#000000',
        surface: '#0b0b0b',
        'surface-light': '#141414',
        line: '#262626',

        ink: '#f3ede3',
        'ink-muted': '#a39e94',
        'ink-subtle': '#6b675f',

        accent: '#c9a46a',
        'accent-light': '#e6cb9c',
        'accent-dark': '#9c7a45',

        danger: '#e5484d',
        success: '#4cc38a',
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
        label: ['0.7rem', { lineHeight: '1rem' }],
        hero: ['9.5rem', { lineHeight: '0.95' }],
        giant: ['16rem', { lineHeight: '1' }],
      },

      letterSpacing: {
        caps: '0.2em',
        'caps-md': '0.25em',
        'caps-lg': '0.3em',
        'caps-xl': '0.4em',
        'caps-2xl': '0.55em',
      },

      lineHeight: {
        display: '0.95',
      },

      spacing: {
        header: '5rem',
        18: '4.5rem',
        30: '7.5rem',
        sidebar: '16rem',
      },

      maxWidth: {
        site: '80rem',
      },

      aspectRatio: {
        portrait: '4 / 5',
        tall: '8 / 11',
        photo: '3 / 2',
        wide: '9 / 7',
      },

      zIndex: {
        menu: '40',
        header: '50',
        modal: '80',
        lightbox: '90',
        toast: '95',
        preloader: '100',
      },

      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
      },

      transitionDuration: {
        400: '400ms',
        600: '600ms',
        800: '800ms',
        1200: '1200ms',
        1400: '1400ms',
        1800: '1800ms',
      },

      backgroundImage: {
        'hero-shade':
          'linear-gradient(to top, #000 0%, rgb(0 0 0 / 0.55) 35%, rgb(0 0 0 / 0.15) 70%, rgb(0 0 0 / 0.5) 100%)',
        'fade-up': 'linear-gradient(to top, rgb(0 0 0 / 0.85), rgb(0 0 0 / 0.1) 50%, transparent)',
        'fade-side': 'linear-gradient(to right, rgb(0 0 0 / 0.2), #000)',
        'grid-lines':
          'linear-gradient(rgb(255 255 255 / 0.025) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.025) 1px, transparent 1px)',
        'glow-accent': 'radial-gradient(circle, #9c7a45 0%, transparent 65%)',
      },

      backgroundSize: {
        grid: '48px 48px',
      },

      // Every animation only touches transform / opacity / clip-path, so it runs on the GPU.
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        rise: {
          from: { transform: 'translate3d(0, 105%, 0)' },
          to: { transform: 'translate3d(0, 0, 0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translate3d(0, 24px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translate3d(24px, 0, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        'slide-out': {
          from: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
          to: { opacity: '0', transform: 'translate3d(24px, 0, 0)' },
        },
        'zoom-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'panel-in': {
          from: { opacity: '0', transform: 'translate3d(0, 40px, 0) scale(0.98)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0) scale(1)' },
        },
        'ken-burns': { from: { transform: 'scale(1.12)' }, to: { transform: 'scale(1)' } },
        marquee: { to: { transform: 'translate3d(-50%, 0, 0)' } },
        progress: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        'curtain-up': { to: { transform: 'translate3d(0, -100%, 0)' } },
        'wipe-down': {
          from: { clipPath: 'inset(0 0 100% 0)' },
          to: { clipPath: 'inset(0 0 0 0)' },
        },
        'wipe-up': { from: { clipPath: 'inset(0 0 0 0)' }, to: { clipPath: 'inset(0 0 100% 0)' } },
        'scroll-hint': {
          '0%': { transform: 'scaleY(0)', transformOrigin: 'top' },
          '50%': { transform: 'scaleY(1)', transformOrigin: 'top' },
          '51%': { transformOrigin: 'bottom' },
          '100%': { transform: 'scaleY(0)', transformOrigin: 'bottom' },
        },
        shake: {
          '20%, 60%': { transform: 'translate3d(-6px, 0, 0)' },
          '40%, 80%': { transform: 'translate3d(6px, 0, 0)' },
        },
        breathe: {
          '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)' },
          '50%': { transform: 'translate(-50%, -50%) scale(1.15)' },
        },
        'ping-soft': {
          from: { transform: 'scale(1)', opacity: '1' },
          to: { transform: 'scale(1.6)', opacity: '0' },
        },
        // Typing cursor.
        caret: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
        // Slow wandering of decorative frames.
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(10px, -14px, 0)' },
        },
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -12px, 0)' },
        },
        // Handwriting effect: the wordmark is uncovered left to right.
        write: { from: { clipPath: 'inset(0 100% 0 0)' }, to: { clipPath: 'inset(0 0 0 0)' } },
        // Hero portrait rising into its frame.
        'portrait-in': {
          from: { opacity: '0', transform: 'translate3d(0, 60px, 0) scale(0.97)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0) scale(1)' },
        },
      },

      animation: {
        'fade-in': 'fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-out': 'fade-out 0.3s ease forwards',
        rise: 'rise 1.2s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-up': 'fade-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in': 'slide-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-out': 'slide-out 0.3s ease forwards',
        'zoom-in': 'zoom-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'panel-in': 'panel-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'ken-burns': 'ken-burns 9s ease-out forwards',
        marquee: 'marquee 40s linear infinite',
        progress: 'progress 6.5s linear forwards',
        'curtain-up': 'curtain-up 0.9s cubic-bezier(0.76, 0, 0.24, 1) forwards',
        'wipe-down': 'wipe-down 0.6s cubic-bezier(0.76, 0, 0.24, 1) both',
        'wipe-up': 'wipe-up 0.5s cubic-bezier(0.76, 0, 0.24, 1) forwards',
        'scroll-hint': 'scroll-hint 2.2s cubic-bezier(0.76, 0, 0.24, 1) infinite',
        'line-grow': 'progress 1.3s cubic-bezier(0.76, 0, 0.24, 1) 0.3s both',
        shake: 'shake 0.45s ease',
        breathe: 'breathe 8s ease-in-out infinite',
        'ping-soft': 'ping-soft 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        'spin-fast': 'spin 0.7s linear infinite',
        caret: 'caret 1s steps(1) infinite',
        drift: 'drift 9s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 18s linear infinite',
        write: 'write 1.4s cubic-bezier(0.65, 0, 0.35, 1) both',
        'portrait-in': 'portrait-in 1.4s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};
