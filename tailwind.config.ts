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
        token: {
          gold: "#F59E0B",
          danger: "#EF4444",
          safe: "#10B981",
        },
        arena: {
          primary: "#6366F1",
          secondary: "#8B5CF6",
        },
      },
      animation: {
        "token-pulse": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "countdown": "countdown 1s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
