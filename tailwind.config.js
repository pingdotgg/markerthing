const colors = require("tailwindcss/colors");
const typography = require("./tailwind.typography.config");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      display: ["Inter"],
    },
    boxShadow: {
      sm: "0 1px 2px 0 rgb(0 0 0 / 0.15)",
      DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)",
      md: "0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)",
      lg: "0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)",
      xl: "0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)",
      "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.75)",
      inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.15)",
    },
    extend: {
      typography,
      colors: {
        truegray: colors.neutral,
        red: colors.rose,
        gray: {
          ...colors.zinc,
          750: "#333338",
          850: "#202023",
          950: "#0C0C0E",
        },
        pink: {
          50: "#FEE6F0",
          100: "#FDCDE1",
          200: "#F1A5C6",
          300: "#ED8AB5",
          400: "#E96EA4",
          500: "#E24A8D",
          600: "#DB1D70",
          700: "#C01A62",
          800: "#A41654",
          900: "#6E0F38",
        },
      },
      fontSize: {
        xxs: ".6rem",
      },
      keyframes: {
        "fade-in-down": {
          "0%": {
            opacity: "0",
            transform: "translateY(-10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-in-left": {
          "0%": {
            opacity: "0",
            transform: "translateX(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },
        "pipe-flow": {
          "0%": {
            transform: "translateX(-60%)",
          },
          "100%": {
            transform: "translateX(60%)",
          },
        },
        "pipe-grow": {
          "0%": {
            opacity: 0.4,
            transform: "scale(1)",
          },
          "49%": {
            opacity: 0.4,
            transform: "scale(1)",
          },
          "50%": {
            transform: "scale(3)",
          },
          "60%": {
            opacity: 0.6,
            transform: "scale(1)",
          },
          "100%": {
            opacity: 0.6,
            transform: "scale(1)",
          },
        },
        "wipe-left": {
          "0%": {
            "clip-path": "inset(0 0 0 0)",
          },
          "100%": {
            "clip-path": "inset(0 100% 0 0)",
          },
        },
      },
      brightness: {
        25: ".25",
      },
      backgroundImage: {
        "warning-stripes": `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2327272a' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
        onboarding: `url("/images/air-balloon.svg")`,
      },
      backgroundSize: {
        landing: "120rem",
      },
      animation: {
        roll: "spin 2s linear reverse",
        "pipe-grow": "pipe-grow 2s linear infinite",
        "pipe-flow": "pipe-flow 2s linear infinite",
        "wipe-left": "wipe-left 1s linear",
        "fade-in-down": "fade-in-down 0.5s ease-out",
        "fade-in-left": "fade-in-left 0.5s ease-out",
        "fade-in-hero": "fade-in-left 1.5s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-in 0.2s ease-out reverse forwards",
      },
      gridTemplateColumns: {
        call: "1fr minmax(auto, min-content)",
        "call-mobile": "1fr",
        "admin-call": "1fr minmax(auto, max-content)",
        "toggle-list": "min-content minmax(0, 100%)",
        "focused-video": "minmax(12rem, min(15rem, 20%)) minmax(12rem, 100%)",
      },
      gridTemplateRows: {
        call: "minmax(0,100%) min-content",
        "call-mobile": "minmax(30vh, 1fr) minmax(0, min-content) min-content",
        "admin-call": "min-content minmax(0, 100%)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/line-clamp"),
  ],
};
