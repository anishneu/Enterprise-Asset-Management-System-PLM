/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tv: {
          brand: "#0284c7",
          "brand-dark": "#0369a1",
          "brand-light": "#e0f2fe",
          accent: "#0ea5e9",
          bg: "#eef2f7",
          surface: "#ffffff",
          "surface-muted": "#f8fafc",
          text: "#0f172a",
          "text-muted": "#64748b",
          border: "#e2e8f0",
          danger: "#dc2626",
          "danger-bg": "#fef2f2",
        },
      },
      borderRadius: {
        "tv-sm": "8px",
        "tv-md": "12px",
        "tv-lg": "16px",
      },
      boxShadow: {
        "tv-sm": "0 1px 2px rgba(15, 23, 42, 0.06)",
        "tv-md": "0 8px 24px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        tv: ['"Plus Jakarta Sans"', "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
