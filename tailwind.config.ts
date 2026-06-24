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
        brand: "#2853e0",
        "bg-primary": "#fdfdfd",
        "text-primary": "#333333",
        "text-secondary": "#9ba6cc",
        "border-light": "#d6e0ff",
        "required": "#f56c6c",
      },
      fontSize: {
        xs: "12px",
        sm: "12px",
        base: "12px",
        lg: "14px",
        xl: "16px",
      },
      borderRadius: {
        card: "4px",
        modal: "12px",
      },
    },
  },
  plugins: [],
};
export default config;