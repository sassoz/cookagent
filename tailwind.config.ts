import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#f9fafb',
        ink: '#111827',
        brand: '#14532d',
      },
    },
  },
  plugins: [],
};

export default config;
