import {
  BricksElementNode,
  BricksSvgNode,
  BricksTextNode,
  StyledBricksNode,
} from "bricks-core/src/StyledBricksNode";
import plugin from "./index";

describe("generates HTML code with inline style", () => {
  test("returns empty array when input is empty", () => {
    expect(plugin.transform([])).toEqual([]);
  });

  test("generates nodes with inline style", () => {
    const node = new BricksElementNode();
    node.attributes = {
      foo: "bar",
      baz: "qux",
    };

    const input: StyledBricksNode[] = [node];

    expect(plugin.transform(input)).toEqual([
      {
        path: "/GeneratedComponent.html",
        content: '<div style="foo: bar; baz: qux"></div>\n',
      },
    ]);
  });

  test("generates text nodes", () => {
    const input: StyledBricksNode[] = [new BricksTextNode("foo")];

    expect(plugin.transform(input)).toEqual([
      {
        path: "/GeneratedComponent.html",
        content: "<p>foo</p>\n",
      },
    ]);
  });

  test("generates img nodes", () => {
    const node = new BricksElementNode();
    node.tagName = "img";
    node.base64image = Buffer.from("foo").toString("base64");

    const input: StyledBricksNode[] = [node];

    expect(plugin.transform(input)).toEqual([
      {
        path: "/assets/img_1.png",
        content: Buffer.from(node.base64image, "base64"),
      },
      {
        path: "/GeneratedComponent.html",
        content: '<img src="/assets/img_1.png" />\n',
      },
    ]);
  });

  test("generates svg nodes", () => {
    const svg = "<svg></svg>";
    const node = new BricksSvgNode(svg);
    const input: StyledBricksNode[] = [node];

    expect(plugin.transform(input)).toEqual([
      {
        path: "/assets/svg_1.svg",
        content: svg,
      },
      {
        path: "/GeneratedComponent.html",
        content: '<img src="/assets/svg_1.svg" />\n',
      },
    ]);
  });

  test("generates nested nodes", () => {
    const node = new BricksElementNode();
    node.children = [new BricksElementNode()];

    const input: StyledBricksNode[] = [node];

    expect(plugin.transform(input)).toEqual([
      {
        path: "/GeneratedComponent.html",
        content: "<div><div></div></div>\n",
      },
    ]);
  });
});

describe("generates HTML code with Tailwind", () => {
  test("generates nodes with Tailwind CSS classes", () => {
    const node = new BricksElementNode();
    node.attributes = {
      height: "1px",
    };

    const input: StyledBricksNode[] = [node];

    const htmlFile = plugin
      .transform(input, { tailwindcss: true })
      .find((file) => file.path.endsWith(".html"));
    expect(htmlFile).toEqual({
      path: "/GeneratedComponent.html",
      content: '<div class="h-px"></div>\n',
    });
  });
});

test("output code should be formatted", () => {
  // Triple-nested divs: <div><div><div></div></div></div>
  const nestedNode = new BricksElementNode();
  nestedNode.children = [new BricksElementNode()];
  const node = new BricksElementNode();
  node.children = [nestedNode];

  const input: StyledBricksNode[] = [node];

  expect(plugin.transform(input)).toEqual([
    {
      path: "/GeneratedComponent.html",
      content: `<div>
  <div><div></div></div>
</div>
`,
    },
  ]);
});
