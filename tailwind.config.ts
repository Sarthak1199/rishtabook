import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#FAFAF8',
        'text-primary': '#1C1C1E',
        'text-secondary': '#6B6B6B',
        accent: '#C2185B',
        'accent-light': '#FCE4EC',
        success: '#2E7D32',
        warning: '#E65100',
        danger: '#C62828',
        border: '#E8E8E4',
        card: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
