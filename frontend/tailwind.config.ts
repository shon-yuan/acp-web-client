import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        github: {
          bg: '#0d1117',
          surface: '#161b22',
          'surface-hover': '#1f242c',
          border: '#30363d',
          'border-light': '#21262d',
          text: '#c9d1d9',
          'text-primary': '#f0f6fc',
          muted: '#8b949e',
          accent: '#58a6ff',
          'accent-hover': '#79c0ff',
          success: '#238636',
          'success-hover': '#2ea043',
          warning: '#d29922',
          danger: '#da3633',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
