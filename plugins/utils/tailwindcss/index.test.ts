import { buildTwcConfigFileContent, buildTwcCssFileContent } from ".";

const fonts = {
  foo: {
    source: "some-url",
    tailwindAlias: "some-alias",
  },
  bar: {
    source: "some-other-url",
    tailwindAlias: "some-other-alias",
  },
};

test("generates css with custom font family", () => {
  const css = buildTwcCssFileContent(fonts);

  expect(css).toEqual(`@tailwind base;
@tailwind components;
@tailwind utilities;
@import url("some-url");
@import url("some-other-url");
`);
});

test("generates tailwind config with custom font family", () => {
  const config = buildTwcConfigFileContent(fonts, "jsx");

  expect(config).toEqual(`module.exports = {
  content: ["./*.jsx"],
  theme: {
    fontFamily: {
      "some-alias": "foo",
      "some-other-alias": "bar",
    },
    extend: {},
  },
  plugins: [],
};
`);
});
