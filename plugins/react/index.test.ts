import {
  BricksElementNode,
  BricksSvgNode,
  BricksTextNode,
  StyledBricksNode,
} from "bricks-core/src/StyledBricksNode";
import plugin from "./index";

describe("generates React code with inline style objects", () => {
  test("returns empty array when input is empty", () => {
    expect(plugin.transform([])).toEqual([]);
  });

  test("generates nodes with inline style objects", () => {
    const node = new BricksElementNode();
    node.attributes = {
      "background-color": "rainbow",
      "font-size": "gigantic",
    };

    const input: StyledBricksNode[] = [node];

    expect(plugin.transform(input)).toEqual([
      {
        path: "/GeneratedComponent.jsx",
        content: `const GeneratedComponent = () => (
  <div style={{ backgroundColor: "rainbow", fontSize: "gigantic" }}></div>
);
export default GeneratedComponent;
`,
      },
    ]);
  });

  test("generates text nodes", () => {
    const input: StyledBricksNode[] = [new BricksTextNode("foo")];

    expect(plugin.transform(input)).toEqual([
      {
        path: "/GeneratedComponent.jsx",
        content: `const GeneratedComponent = () => <p>foo</p>;
export default GeneratedComponent;
`,
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
        path: "/GeneratedComponent.jsx",
        content: `import img_1 from "./assets/img_1.png";
const GeneratedComponent = () => <img src={img_1} />;
export default GeneratedComponent;
`,
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
        path: "/GeneratedComponent.jsx",
        content: `import svg_1 from "./assets/svg_1.svg";
const GeneratedComponent = () => <img src={svg_1} />;
export default GeneratedComponent;
`,
      },
    ]);
  });

  test("generates nested nodes", () => {
    const node = new BricksElementNode();
    node.children = [new BricksElementNode()];

    const input: StyledBricksNode[] = [node];

    expect(plugin.transform(input)).toEqual([
      {
        path: "/GeneratedComponent.jsx",
        content: `const GeneratedComponent = () => (
  <div>
    <div></div>
  </div>
);
export default GeneratedComponent;
`,
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

    const files = plugin.transform(input, { tailwindcss: true });

    expect(files.find((f) => f.path.endsWith(".jsx"))).toEqual({
      path: "/GeneratedComponent.jsx",
      content: `import "./style.css";
const GeneratedComponent = () => <div className="h-px"></div>;
export default GeneratedComponent;
`,
    });
    expect(files.find((f) => f.path === "/style.css")).toBeTruthy();
    expect(files.find((f) => f.path === "/tailwind.config.js")).toBeTruthy();
  });
});

describe("generates React code in TypeScript", () => {
  test("generates the correct file extension", () => {
    const node = new BricksElementNode();
    expect(
      plugin
        .transform([node], { typescript: true })
        .find((file) => file.path.endsWith(".tsx")),
    ).toBeTruthy();
  });
});
