/** @type {import('tailwindcss').Config} */
module.exports = {
  // safelist: [
  //   {
  //     pattern: /./, // the '.' means 'everything'
  //   },
  // ],
  content: [
    "./src/**/*.{html,js,tsx}",
    'node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}'
  ],
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
  plugins: [
    require('flowbite/plugin')
  ],
};
