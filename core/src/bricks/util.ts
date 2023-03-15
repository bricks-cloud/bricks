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

const decideBetweenDirectionalSegmentations = (horizontalSegmentedNodes: Node[], verticalSegmentedNodes: Node[]): Node[] => {
    if (horizontalSegmentedNodes.length < 2 && verticalSegmentedNodes.length >= 2) {
        return verticalSegmentedNodes;
    }

    if (verticalSegmentedNodes.length < 2 && horizontalSegmentedNodes.length >= 2) {
        return horizontalSegmentedNodes;
    }

    if (horizontalSegmentedNodes.length >= 2 && verticalSegmentedNodes.length >= 2) {
        return horizontalSegmentedNodes.length < verticalSegmentedNodes.length ? horizontalSegmentedNodes : verticalSegmentedNodes;
    }

    return [];
}

export const groupNodes = (nodes: Node[]): Node[] => {
    if (isEmpty(nodes)) {
        return [];
    }

    let groupedNodes = groupNodesByInclusion(nodes);
    groupedNodes = groupNodesByOverlap(groupedNodes);

    const horizontalSegmentedNodes = groupNodesByDirectionalOverlap(groupedNodes, Direction.HORIZONTAL);
    const verticalSegmentedNodes = groupNodesByDirectionalOverlap(groupedNodes, Direction.VERTICAL);
    const decided = decideBetweenDirectionalSegmentations(horizontalSegmentedNodes, verticalSegmentedNodes);

    if (!isEmpty(decided)) {
        groupedNodes = decided;
    }

    for (const nodes of getNonGroupChildrenNodes(groupedNodes)) {
        groupNodes(nodes);
    }

    return groupedNodes;
};

export const getNonGroupChildrenNodes = (nodes: Node[]): Node[][] => {
    if (isEmpty(nodes)) {
        return [];
    }

    let result = [];
    for (const node of nodes) {
        if (node.type != NodeType.GROUP) {
            result.push(node.getChildren());
            continue;
        }

        result = result.concat(getNonGroupChildrenNodes(node.children));
    }

    return result;
}

// groupNodesByInclusion groups nodes if they have an inclusion relationship
// input nodes are ordered by z-index
export const groupNodesByInclusion = (nodes: Node[]): Node[] => {
    let removedNodes = new Set<string>();
    let processed: Node[] = [];

    // starting from the last index because we want to find inclusion relationship from its closest node
    // in terms of z-index
    for (let i = nodes.length - 1; i >= 0; i--) {
        let currentNode = nodes[i] as VisibleNode;

        for (let j = i + 1; j < nodes.length; j++) {
            let targetNode = nodes[j];

            if (removedNodes.has(targetNode.getId())) {
                continue;
            }

            switch (currentNode.getPositionalRelationship(targetNode)) {
                case PostionalRelationship.COMPLETE_OVERLAP:
                case PostionalRelationship.INCLUDE:
                    removedNodes.add(targetNode.getId());
                    currentNode.addChildren([targetNode]);
            }
        }

        processed.push(currentNode);
    }

    // remove included nodes 
    // maintain order by z-index
    let processedWithoutMovedNodes: Node[] = [];
    for (let i = processed.length - 1; i >= 0; i--) {
        let currentNode = processed[i];
        if (removedNodes.has(currentNode.getId())) {
            continue;
        }

        processedWithoutMovedNodes.push(currentNode);
    }

    return processedWithoutMovedNodes;
};

// groupNodesByOverlap groups nodes if they have an overlap relationship
export const groupNodesByOverlap = (nodes: Node[]): Node[] => {
    if (nodes.length < 2) {
        return nodes;
    }

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
            continue;
        }

        overlappingNodes.forEach((overlappingNode) => {
            skippable.add(overlappingNode.getId());
        });

        processed.push(new GroupNode(overlappingNodes));
    }

    return processed;
};


enum Direction {
    VERTICAL = "VERTICAL",
    HORIZONTAL = "HORIZONTAL"
}

class Line {
    readonly upper: number;
    readonly lower: number;

    constructor(pointA: number, pointB: number) {
        if (pointA >= pointB) {
            this.upper = pointA;
            this.lower = pointB;
            return;
        }

        this.upper = pointB;
        this.lower = pointA;
    }

    overlap(l: Line): boolean {
        if (this.lower > l.upper) {
            return false;
        }

        if (this.upper < l.lower) {
            return false;
        }

        return true;
    }
}

const getLineBasedOnDirection = (node: Node, direction: Direction) => {
    const coordinates = node.getAbsRenderingBox();

    if (direction === Direction.HORIZONTAL) {
        return new Line(coordinates.leftTop.y, coordinates.rightBot.y);
    }

    return new Line(coordinates.leftTop.x, coordinates.rightBot.x);

};

// groupNodesByDirectionalOverlap groups nodes by finding one directional overlap
export const groupNodesByDirectionalOverlap = (nodes: Node[], direction: Direction): Node[] => {
    if (nodes.length < 2) {
        return nodes;
    }

    const skippable = new Set<string>();
    const segmentedNodes: Node[] = [];
    for (let i = 0; i < nodes.length; i++) {
        const currentNode = nodes[i];

        if (skippable.has(currentNode.getId())) {
            continue;
        }

        const nodesToBeMerged = findDirectionalOverlappingNodes(currentNode, nodes, new Set<string>(), direction);

        if (nodesToBeMerged.length <= 1) {
            segmentedNodes.push(currentNode);
            continue;
        }

        nodesToBeMerged.forEach((node) => {
            skippable.add(node.getId());
        });

        segmentedNodes.push(new GroupNode(nodesToBeMerged));
    }

    return segmentedNodes;
};

// findDirectionalOverlappingNodes finds all the directional overlapping nodes given a starting node
export const findDirectionalOverlappingNodes = (startingNode: Node, targetNodes: Node[], currentPath: Set<string>, direction: Direction): Node[] => {
    let line = getLineBasedOnDirection(startingNode, direction);

    for (let i = 0; i < targetNodes.length; i++) {
        let targetNode = targetNodes[i] as VisibleNode;
        if (currentPath.has(targetNode.getId())) {
            continue;
        }

        const overlappingNodes = [];
        const targetLine = getLineBasedOnDirection(targetNode, direction);
        if (line.overlap(targetLine)) {
            overlappingNodes.push(targetNode);
            currentPath.add(targetNode.getId());

            if (!currentPath.has(startingNode.getId())) {
                overlappingNodes.push(startingNode);
                currentPath.add(startingNode.getId());
            }
        }

        let completePath = [...overlappingNodes];
        for (const overlappingNode of overlappingNodes) {
            const result = findDirectionalOverlappingNodes(overlappingNode, targetNodes, currentPath, direction);
            completePath = completePath.concat(...result);
        }

        if (completePath.length !== 0) {
            return completePath;
        }
    }

    return [];
}

// findOverlappingNodes finds all the overlapping nodes given a starting node
export const findOverlappingNodes = (startingNode: Node, targetNodes: Node[], currentPath: Set<string>): Node[] => {
    for (let i = 0; i < targetNodes.length; i++) {
        let targetNode = targetNodes[i];

        if (currentPath.has(targetNode.getId())) {
            continue;
        }

        const overlappingNodes = [];

        if (startingNode.getPositionalRelationship(targetNode) === PostionalRelationship.OVERLAP) {
            overlappingNodes.push(targetNode);

            if (!currentPath.has(startingNode.getId())) {
                overlappingNodes.push(startingNode);
                currentPath.add(startingNode.getId());
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