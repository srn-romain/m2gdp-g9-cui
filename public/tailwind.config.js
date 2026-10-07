/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: { creme: '#FAF7F2', terracotta: '#DB5A3B', sauge: '#5B8266', ardoise: '#2B2B2B' },
      fontFamily: { brand: ['Chewy', 'Comic Sans MS', 'cursive'], sans: ['DM Sans', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
