/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        weintern: {
          navy: {
            950: '#070D19',
            900: '#0A192F',
            800: '#112240',
            700: '#1E293B',
            600: '#233554',
          },
          gold: {
            400: '#FCD34D',
            500: '#F59E0B',
            600: '#D97706',
          },
          accent: '#38BDF8',
          success: '#10B981',
          danger: '#EF4444',
          warning: '#F59E0B'
        }
      }
    },
  },
  plugins: [],
}
