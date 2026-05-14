import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#041E42',
          light: '#0A2E5C',
          mid: '#062244',
        },
        red: {
          DEFAULT: '#C8102E',
          dark: '#A00D24',
          light: '#E8213F',
        },
        gold: '#FFB81C',
        ice: {
          DEFAULT: '#EEF5FF',
          dark: '#D0DFF5',
        },
        surface: {
          DEFAULT: '#0B1622',
          2: '#112033',
          3: '#172844',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        sport: ["'Bebas Neue'", 'Impact', "'Arial Black'", 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
