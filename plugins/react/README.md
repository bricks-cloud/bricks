# Bricks React Plugin

This module takes an array of `StyledBricksNode`s and convert them into React code.

## API

```js
plugin.transform(nodes, options);
```

## Options

```ts
{
  tailwindcss?: boolean;
  typescript?: boolean;
}
```

If `tailwindcss` is set to true, the React code will be styled with Tailwind CSS classes. Otherwise, the React code will be styled with an inline style object.

If `typescript` is set to true, the React code will be in TypeScript. Otherwise, the React code will be in JavaScript.

## Running tests

`yarn workspace bricks-react-plugin test`
