/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,tsx}",
    "node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    fontFamily: {
      vietnam: `'Be Vietnam Pro', sans-serif`,
      roboto: `'Roboto', sans-serif`,
    },
    extend: {},
  },
  plugins: [require("flowbite/plugin")],
};
