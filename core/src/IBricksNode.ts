export interface IBricksNode {
  source: "figma" | "bricks";
  children: IBricksNode[];
  id: string;
  name: string;
  type: NodeType;
  absoluteBoundingBox: Rect;
  absoluteRenderbounds: Rect;
  layoutMode: LayoutMode;
  // applicable only if layoutMode is not "NONE"
  primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "MAX" | "CENTER" | "BASELINE";

  // TODO: clean up interface, a few props only exist for certain types
  svg?: string; // only exists if type === VECTOR
}

export type LayoutMode = "VERTICAL" | "HORIZONTAL" | "NONE";
