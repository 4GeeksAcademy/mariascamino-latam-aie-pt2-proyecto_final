/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/index.html", "./public/application.html", "./public/validation.js"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
