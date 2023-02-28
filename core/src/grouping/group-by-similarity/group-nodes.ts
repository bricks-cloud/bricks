import { BricksNode } from "../../BricksNode";
import { DBSCAN } from "../dbscan";
import {
  groupByGap,
  intersectionNum,
  resolveConflictByDist,
  resolveConflictByArea,
  ascendinglyByBoundingBoxXThenY,
  getBottomY,
  getCenterY,
  getTopY,
  getLeftX,
  getCenterX,
  getRightX,
} from "./utils";

export function groupNodes(nodes: BricksNode[]): BricksNode[] {
  if (nodes.length === 0) {
    return [];
  }

  nodes.sort(ascendinglyByBoundingBoxXThenY);

  // find horizontally aligned nodes
  const alignBottomModel = new DBSCAN(nodes.map(getBottomY));
  let alignBottomGroups = alignBottomModel
    .run({ epsilon: 3, minPts: 2 })
    .map((idxs) => idxs.map((i) => nodes[i]));

  const alignVerticalCentersModel = new DBSCAN(nodes.map(getCenterY));
  let alignVerticalCentersGroups = alignVerticalCentersModel
    .run({ epsilon: 3, minPts: 2 })
    .map((idxs) => idxs.map((i) => nodes[i]));

  const alignTopModel = new DBSCAN(nodes.map(getTopY));
  let alignTopGroups = alignTopModel
    .run({ epsilon: 3, minPts: 2 })
    .map((idxs) => idxs.map((i) => nodes[i]));

  // find vertically aligned nodes
  const alignLeftModel = new DBSCAN(nodes.map(getLeftX));
  let alignLeftGroups = alignLeftModel
    .run({ epsilon: 3, minPts: 2 })
    .map((idxs) => idxs.map((i) => nodes[i]));

  const alignHorizontalCentersModel = new DBSCAN(nodes.map(getCenterX));
  let alignHorizontalCentersGroups = alignHorizontalCentersModel
    .run({ epsilon: 3, minPts: 2 })
    .map((idxs) => idxs.map((i) => nodes[i]));

  const alignRightModel = new DBSCAN(nodes.map(getRightX));
  let alignRightGroups = alignRightModel
    .run({ epsilon: 3, minPts: 2 })
    .map((idxs) => idxs.map((i) => nodes[i]));

  // resolve conflicts
  nodes.forEach((me) => {
    const groupsWithMe = [
      ...alignBottomGroups,
      ...alignVerticalCentersGroups,
      ...alignTopGroups,
    ].filter((group) => group.some((node) => node.id === me.id));

    if (groupsWithMe.length > 1) {
      resolveConflictByDist(me, "HORIZONTAL", ...groupsWithMe);
    }
  });

  nodes.forEach((me) => {
    const groupsWithMe = [
      ...alignRightGroups,
      ...alignHorizontalCentersGroups,
      ...alignLeftGroups,
    ].filter((group) => group.some((node) => node.id === me.id));
    if (groupsWithMe.length > 1) {
      resolveConflictByDist(me, "VERTICAL", ...groupsWithMe);
    }
  });

  nodes.forEach((me) => {
    const groupsWithMe = [
      ...alignBottomGroups,
      ...alignVerticalCentersGroups,
      ...alignTopGroups,
      ...alignRightGroups,
      ...alignHorizontalCentersGroups,
      ...alignLeftGroups,
    ].filter((group) => group.some((node) => node.id === me.id));

    if (groupsWithMe.length > 1) {
      resolveConflictByArea(me, ...groupsWithMe);
    }
  });

  // remove empty arrays
  const nonEmptyGroup = (group: BricksNode[]) => group.length > 0;
  alignBottomGroups = alignBottomGroups.filter(nonEmptyGroup);
  alignVerticalCentersGroups = alignVerticalCentersGroups.filter(nonEmptyGroup);
  alignTopGroups = alignTopGroups.filter(nonEmptyGroup);
  alignRightGroups = alignRightGroups.filter(nonEmptyGroup);
  alignHorizontalCentersGroups =
    alignHorizontalCentersGroups.filter(nonEmptyGroup);
  alignLeftGroups = alignLeftGroups.filter(nonEmptyGroup);

  // further group by gaps
  alignBottomGroups = alignBottomGroups.map((group) =>
    groupByGap(group, "HORIZONTAL", "MAX")
  );
  alignVerticalCentersGroups = alignVerticalCentersGroups.map((group) =>
    groupByGap(group, "HORIZONTAL", "CENTER")
  );
  alignTopGroups = alignTopGroups.map((group) =>
    groupByGap(group, "HORIZONTAL", "MIN")
  );
  alignRightGroups = alignRightGroups.map((group) =>
    groupByGap(group, "VERTICAL", "MAX")
  );
  alignHorizontalCentersGroups = alignHorizontalCentersGroups.map((group) =>
    groupByGap(group, "VERTICAL", "CENTER")
  );
  alignLeftGroups = alignLeftGroups.map((group) =>
    groupByGap(group, "VERTICAL", "MIN")
  );

  // find ungrouped nodes
  const ungroupedNodes = intersectionNum(
    alignBottomModel.noise,
    alignVerticalCentersModel.noise,
    alignTopModel.noise,
    alignLeftModel.noise,
    alignHorizontalCentersModel.noise,
    alignRightModel.noise
  ).map((i) => nodes[i]);

  return [
    ...ungroupedNodes,
    ...alignBottomGroups.flat(1),
    ...alignVerticalCentersGroups.flat(1),
    ...alignTopGroups.flat(1),
    ...alignRightGroups.flat(1),
    ...alignHorizontalCentersGroups.flat(1),
    ...alignLeftGroups.flat(1),
  ];
}
