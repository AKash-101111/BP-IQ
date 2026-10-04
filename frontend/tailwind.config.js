/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F6F8',
        panel: '#FFFFFF',
        borderline: '#D9DDE3',
        textPrimary: '#20242A',
        textSecondary: '#68707C',
        accent: {
          DEFAULT: '#315E9B',
          hover: '#24487A',
          subtle: '#EBF2FA',
        },
        issue: {
          DEFAULT: '#C43D3D',
          subtle: '#FDEDEC',
          border: '#F5B7B1',
        },
        warning: {
          DEFAULT: '#B7791F',
          subtle: '#FEF5E7',
          border: '#FAD7A0',
        },
        success: {
          DEFAULT: '#2F6B4F',
          subtle: '#EAF5EE',
          border: '#A9DFBF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        workbench: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        elevation: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)',
      }
    },
  },
  plugins: [],
}
