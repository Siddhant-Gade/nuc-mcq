/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        peachdark: {
          bg: '#19120c',
          surface: '#221810',
          card: '#2a1f16',
          hover: '#35271d',
          border: '#443224',
          subtle: '#33251a',
          text: '#fde8d7',
          muted: '#d9b89f',
        },
        peach: {
          50: '#fffaf5',
          100: '#ffeedd',
          200: '#ffd8ba',
          300: '#ffbc8c',
          400: '#fa9d5f',
          500: '#f57e3d',
          600: '#e56124',
          700: '#be4919',
          800: '#973c1a',
          900: '#7a3319',
          950: '#421709',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
