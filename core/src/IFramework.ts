import { IFile } from "./IFile";
import { StyledBricksNode } from "./StyledBricksNode";

export interface IFramework<IOptions> {
  name: string; // used for logging warnings and errors
  transform: (
    styledBricksNodes: StyledBricksNode[],
    options: IOptions
  ) => IFile[];
}
