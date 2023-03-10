import { isEmpty } from "lodash";
import { BoundingBoxCoordinates } from "../adapter/node";
import { Node, VisibleNode, PostionalRelationship, GroupNode, NodeType } from "./node";

export const doOverlap = (currentCoordinate: BoundingBoxCoordinates, targetCoordinates: BoundingBoxCoordinates) => {
    if (currentCoordinate.leftTop.x === currentCoordinate.rightBot.x || currentCoordinate.leftTop.y === currentCoordinate.rightBot.y) {
        return false;
    }

    if (targetCoordinates.leftTop.x === targetCoordinates.rightBot.x || targetCoordinates.leftTop.y === targetCoordinates.rightBot.y) {
        return false;
    }

    if (currentCoordinate.leftTop.x > targetCoordinates.rightBot.x || targetCoordinates.leftTop.x > currentCoordinate.rightBot.x) {
        return false;
    }

    if (currentCoordinate.rightBot.y < targetCoordinates.leftTop.y || targetCoordinates.rightBot.y < currentCoordinate.leftTop.y) {
        return false;
    }

    return true;
}

export const groupNodes = (nodes: Node[]): Node[] => {
    if (isEmpty(nodes)) {
        return [];
    }

    let groupedNodes = groupNodesByInclusion(nodes);
    groupedNodes = groupNodesByOverlap(groupedNodes);

    for (const node of groupedNodes) {
        if (node.getType() === NodeType.GROUP) {
            for (const childNode of node.getChildren()) {
                groupNodes(childNode.getChildren());
            }
        } else {
            groupNodes(node.getChildren());
        }
    }

    return groupedNodes;
};

// groupNodesByInclusion groups nodes if they have an inclusion relationship
export const groupNodesByInclusion = (nodes: Node[]): Node[] => {
    let removedNodes = new Set<string>();
    let processed: Node[] = [];

    for (let i = 0; i < nodes.length; i++) {
        let currentNode = nodes[i] as VisibleNode;
        if (removedNodes.has(currentNode.getId())) {
            continue;
        }

        for (let j = i + 1; j < nodes.length; j++) {
            let follower = nodes[j];
            let targetNode = follower as VisibleNode;

            switch (currentNode.getPositionalRelationship(targetNode)) {
                case PostionalRelationship.COMPLETE_OVERLAP:
                case PostionalRelationship.INCLUDE:
                    removedNodes.add(targetNode.getId());
                    currentNode.addChildren([targetNode]);
            }
        }

        processed.push(currentNode);
    }

    return processed;
};

// groupNodesByOverlap groups nodes if they have an overlap relationship
export const groupNodesByOverlap = (nodes: Node[]): Node[] => {
    const skippable = new Set<string>();
    const processed: Node[] = [];

    for (let i = 0; i < nodes.length; i++) {
        const currentNode = nodes[i] as VisibleNode;
        if (skippable.has(currentNode.getId())) {
            continue;
        }

        const overlappingNodes = findOverlappingNodes(currentNode, nodes, new Set());

        if (isEmpty(overlappingNodes)) {
            processed.push(currentNode);
        } else {
            overlappingNodes.forEach((overlappingNode) => {
                skippable.add(overlappingNode.getId());
            });
            const grouped = new GroupNode(overlappingNodes);
            processed.push(grouped);
        }
    }

    return processed;
};



// findOverlappingNodes finds all the overlapping nodes given a starting node
export const findOverlappingNodes = (startingNode: Node, targetNodes: Node[], currentPath: Set<string>): Node[] => {
    const startingVisibleNode = startingNode as VisibleNode;
    for (let i = 0; i < targetNodes.length; i++) {
        let targetNode = targetNodes[i] as VisibleNode;

        if (currentPath.has(targetNode.getId())) {
            continue;
        }

        if (startingNode.getId() === targetNode.getId()) {
            continue;
        }

        const overlappingNodes = [];
        if (startingVisibleNode.getPositionalRelationship(targetNode) === PostionalRelationship.OVERLAP) {
            overlappingNodes.push(targetNode);

            if (!currentPath.has(startingVisibleNode.getId())) {
                overlappingNodes.push(startingNode);
                currentPath.add(startingVisibleNode.getId());
            }

            currentPath.add(targetNode.getId());
        }

        let completePath = [...overlappingNodes];
        for (const overlappingNode of overlappingNodes) {
            const result = findOverlappingNodes(overlappingNode, targetNodes, currentPath);
            completePath = completePath.concat(...result);
        }

        if (completePath.length !== 0) {
            return completePath;
        }
    }

    return [];
}