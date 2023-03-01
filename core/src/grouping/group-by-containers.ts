import { IBricksNode } from "../IBricksNode";

export function groupByContainers(nodes: IBricksNode[]): IBricksNode[] {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const currentNode = nodes[i];

    if (!currentNode) {
      continue;
    }

    const nodesOverlappingMe = findNodesOverlappingMe(currentNode, nodes);

    if (
      nodesOverlappingMe.length > 0 &&
      isMyAreaTheLargest(currentNode, nodesOverlappingMe)
    ) {
      currentNode.children.push(...nodesOverlappingMe);

      // remove assigned nodes from list
      const idsToRemove = nodesOverlappingMe.map((o) => o.id);
      nodes = nodes.filter((node) => !idsToRemove.includes(node.id));
    }

    // recursively group children
    currentNode.children = groupByContainers(currentNode.children);
  }
  return nodes;
}

function findNodesOverlappingMe(
  me: IBricksNode,
  candidateNodes: IBricksNode[]
): IBricksNode[] {
  const overlappingNodes: IBricksNode[] = [];
  for (const candidateNode of candidateNodes) {
    // do not consider myself
    if (candidateNode.id === me.id) {
      continue;
    }

    if (isOverlapping(me, candidateNode)) {
      overlappingNodes.push(candidateNode);
    }
  }

  return overlappingNodes;
}

function isOverlapping(node1: IBricksNode, node2: IBricksNode): boolean {
  const RectA = {
    Left: node1.absoluteRenderbounds.x,
    Right: node1.absoluteRenderbounds.x + node1.absoluteRenderbounds.width,
    Top: node1.absoluteRenderbounds.y,
    Bottom: node1.absoluteRenderbounds.y + node1.absoluteRenderbounds.height,
  };

  const RectB = {
    Left: node2.absoluteRenderbounds.x,
    Right: node2.absoluteRenderbounds.x + node2.absoluteRenderbounds.width,
    Top: node2.absoluteRenderbounds.y,
    Bottom: node2.absoluteRenderbounds.y + node2.absoluteRenderbounds.height,
  };

  return (
    RectA.Left < RectB.Right &&
    RectA.Right > RectB.Left &&
    RectA.Top < RectB.Bottom &&
    RectA.Bottom > RectB.Top
  );
}

function isMyAreaTheLargest(
  me: IBricksNode,
  otherNodes: IBricksNode[]
): boolean {
  const myArea = me.absoluteRenderbounds.height * me.absoluteRenderbounds.width;

  const areasOfOtherNodes = otherNodes.map(
    (node) => node.absoluteRenderbounds.height * node.absoluteRenderbounds.width
  );

  return myArea === Math.max(...areasOfOtherNodes, myArea);
}
