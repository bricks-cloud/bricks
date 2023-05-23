import { Identify, identify, track } from "@amplitude/analytics-browser";
import { Node } from "./bricks/node";
import uuid from "react-native-uuid";
import { NameMap, File } from "./code/code";

export const isEmpty = (value: any): boolean => {
  return (
    value === undefined ||
    value === null ||
    Number.isNaN(value) ||
    (typeof value === "object" && Object.keys(value).length === 0) ||
    (typeof value === "string" && value.trim().length === 0)
  );
};

export const trackEvent = (eventName: string, eventProperties: any) => {
  const event = new Identify();
  event.setOnce("username", figma.currentUser.name);
  identify(event);
  track(eventName, isEmpty(eventProperties) ? {} : eventProperties);
};


export const traverseNodes = async (
  node: Node,
  callback: (node: Node) => Promise<boolean>
) => {
  const shouldContinue = await callback(node);

  if (!shouldContinue) {
    return;
  }

  await Promise.all(
    node.children.map((child) => traverseNodes(child, callback))
  );
};

export const replaceVariableNameWithinFile = (
  files: File[],
  nameMap: NameMap
) => {
  for (const file of files) {
    if (file.path === "/GeneratedComponent.jsx") {
      let content: string = file.content;
      Object.entries(nameMap).forEach(([oldName, newName]) => {
        content = content.replaceAll(
          new RegExp("\\b" + oldName + "\\b", "g"),
          newName
        );
      });

      file.content = content;
    }
  }
};



export const createId = () => {
  let id = "";
  try {
    id = uuid.v1() as string;
  } catch {
    id = "id" + Math.random().toString(16).slice(2);
  }

  return id;
};