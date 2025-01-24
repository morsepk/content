/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        'glow': '0px 5px 40px rgba(229, 232, 130, 0.59), 0px -5px 40px rgba(229, 232, 130, 0.59)',
      },
    },
  },
  plugins: [],
};
