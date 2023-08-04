import { NodeType, VectorGroupNode, VectorNode, ImageNode, Node } from "../../bricks/node";
import { File } from "../code";
import { ExportFormat } from "../../design/adapter/node";
import { nameRegistryGlobalInstance } from "../name-registry/name-registry";
import { ImportedComponentMeta } from "../generator/html/generator";

export let extraFileRegistryGlobalInstance: ExtraFileRegistry;
export const instantiateExtraFileRegistryGlobalInstance = () => {
  extraFileRegistryGlobalInstance = new ExtraFileRegistry();
};

export class ExtraFileRegistry {
  files: File[];
  importStatements: ImportedComponentMeta[];
  constructor() {
    this.files = [];
    this.importStatements = [];
  }


  addImportStatement(node: VectorGroupNode | VectorNode | ImageNode) {
    const id: string = node.getId();
    if (node.getType() === NodeType.VECTOR || node.getType() === NodeType.VECTOR_GROUP) {
      const componentName: string = nameRegistryGlobalInstance.getVectorName(id);
      const path: string = "/assets/" + componentName + ".svg";
      this.importStatements.push({
        node,
        importPath: path,
        componentName,
      });
    }

    if (node.getType() === NodeType.IMAGE) {
      const componentName: string = nameRegistryGlobalInstance.getImageName(id);
      const path: string = "/assets/" + componentName + ".png";
      this.importStatements.push({
        node,
        importPath: path,
        componentName,
      });
    }
  }

  async addExportableFile(node: VectorGroupNode | VectorNode | ImageNode) {
    const id: string = node.getId();
    if (node.getType() === NodeType.VECTOR || node.getType() === NodeType.VECTOR_GROUP) {
      const path: string = "/assets/" + nameRegistryGlobalInstance.getVectorName(id) + ".svg";
      const content: string = await node.export(ExportFormat.SVG);
      this.files.push({
        content,
        path,
      });
    }


    if (node.getType() === NodeType.IMAGE) {
      const path: string = "/assets/" + nameRegistryGlobalInstance.getImageName(id) + ".png";
      const content: string = await node.export(ExportFormat.PNG);
      this.files.push({
        content,
        path,
      });
    }
  }

  getFiles(): File[] {
    return this.files;
  }

  getImportComponentMeta(): ImportedComponentMeta[] {
    return this.importStatements;
  }
}

export const gatherExtraFilesAndImportedComponentsMeta = (node: Node) => {
  if (node.getType() === NodeType.VECTOR) {
    const vectorNode: VectorNode = node as VectorNode;
    extraFileRegistryGlobalInstance.addExportableFile(vectorNode);
    extraFileRegistryGlobalInstance.addImportStatement(vectorNode);
  }

  if (node.getType() === NodeType.VECTOR_GROUP) {
    const vectorGroupNode: VectorGroupNode = node as VectorGroupNode;
    extraFileRegistryGlobalInstance.addExportableFile(vectorGroupNode);
    extraFileRegistryGlobalInstance.addImportStatement(vectorGroupNode);
    return;
  }

  if (node.getType() === NodeType.IMAGE) {
    const imageNode: ImageNode = node as ImageNode;
    extraFileRegistryGlobalInstance.addExportableFile(imageNode);
    extraFileRegistryGlobalInstance.addImportStatement(imageNode);
  }

  for (const child of node.getChildren()) {
    gatherExtraFilesAndImportedComponentsMeta(child);
  }
};