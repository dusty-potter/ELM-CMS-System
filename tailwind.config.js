/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#3B82F6',
        'brand-orange': '#F97316',
      },
    },
  },
  plugins: [],
}
