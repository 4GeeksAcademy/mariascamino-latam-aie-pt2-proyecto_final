/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./application.html", "./validation.js"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
