import type { Config } from "tailwindcss";
import daisyui from 'daisyui';

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        recruituBlue: "#0d2496",
        recruituLightBlue: "#4859f2",
        hoverBlue: "#7582bf"
      },
    },
  },
  plugins: [daisyui],
} satisfies Config;
