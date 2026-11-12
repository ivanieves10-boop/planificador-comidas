/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#427A58',
          dark: '#314A36',
          light: '#E7F1E9',
        },
        background: '#F5F7F4',
      },
    },
  },
  plugins: [],
}
