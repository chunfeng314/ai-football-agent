import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f5e9',
          100: '#c8e6c9',
          500: '#4caf50',
          700: '#388e3c',
          900: '#1b5e20',
        },
      },
    },
  },
  plugins: [],
};

export default config;
