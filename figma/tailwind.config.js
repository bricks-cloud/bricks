/** @type {import('tailwindcss').Config} */
module.exports = {
  // safelist: [
  //   {
  //     pattern: /./, // the '.' means 'everything'
  //   },
  // ],
  content: ["./src/**/*.{html,js,tsx}"],
  theme: {
    backgroundImage: {
      "dark-mask": `url('../src/assets/dark-mask.png')`,
    },
    fontFamily: {
      primary: "var(--primary-font)",
      secondary: "var(--secondary-font)",
      body: "var(--body-font)",
      vietnam: `'Be Vietnam Pro', sans-serif`,
      roboto: `'Roboto', sans-serif`,
    },
    extend: {},
  },
  plugins: [],
};
