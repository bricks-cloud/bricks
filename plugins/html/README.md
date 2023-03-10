# Bricks HTML Plugin

This module takes an array of `StyledBricksNode`s and convert them into HTML code.

## API

```js
plugin.transform(nodes, options);
```

## Options

```
{
  tailwindcss?: boolean;
}
```

If `tailwindcss` is set to true, the HTML code will be styled with Tailwind CSS classes. Otherwise, the HTML code will be styled with inline CSS.

## Running tests

`yarn workspace bricks-html-plugin test`
