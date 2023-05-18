import { isEmpty } from "../../src/utils";
import { propRegistryGlobalInstance } from "../loop/prop-registry";
import { PropToPropBinding, DataType } from "../loop/component";
import { snakeCaseToCamelCase } from "../../src/code/generator/util";
import { TwcssPropRenderingMap, TwcssPropRenderingMeta } from "../../src/code/generator/tailwindcss/css-to-twcss";

// getVariablePropForTwcss gets variable props for tailwindcss styling classes
export const getVariablePropForTwcss = (nodeId: string, twcssPropRenderingMap: TwcssPropRenderingMap) => {
  let variableProps: string = "";
  const propBindings: PropToPropBinding[] = propRegistryGlobalInstance.getPropToPropBindingByNodeId(nodeId);

  if (!isEmpty(propBindings)) {
    for (const propBinding of propBindings) {
      for (const location of propBinding.locations) {
        if (location.type === "css") {
          // @ts-ignore
          const twcssPropRenderingMeta: TwcssPropRenderingMeta = twcssPropRenderingMap[location.cssKey];
          if (!isEmpty(twcssPropRenderingMeta)) {
            // @ts-ignore
            twcssPropRenderingMeta.filledClassIndexes.add(propBinding.twcssClassIndex);
          }

          if (propBinding.dataType === DataType.boolean) {
            if (isEmpty(propBinding.conditionalValue)) {
              variableProps += ` \${${propBinding.prop} ? "${propBinding.defaultValue}" : ""}`;
              continue;
            }

            variableProps += ` \${${propBinding.prop} ? "${propBinding.defaultValue}" : "${propBinding.conditionalValue}"}`;
            continue;
          }

          variableProps += ` \${${propBinding.prop}}`;
        }
      }
    }
  }

  return variableProps;
};


// getVariablePropForCss gets variable props for css styling classes
export const getVariablePropForCss = (nodeId: string): [string, Set<string>] => {
  let variableProps: string = "";
  const propBindings: PropToPropBinding[] = propRegistryGlobalInstance.getPropToPropBindingByNodeId(nodeId);

  const cssKeyConnectedToProps: Set<string> = new Set<string>();
  if (!isEmpty(propBindings)) {
    for (const propBinding of propBindings) {
      for (const location of propBinding.locations) {
        if (location.type === "css" && !isEmpty(location.cssKey)) {
          // @ts-ignore
          const cssKey: string = location.cssKey;
          cssKeyConnectedToProps.add(cssKey);
          if (propBinding.dataType === DataType.boolean) {

            if (isEmpty(propBinding.conditionalValue)) {
              variableProps += ` ...(${propBinding.prop} && {${snakeCaseToCamelCase(cssKey)}: "${propBinding.defaultValue}"}),`;
              continue;
            }

            variableProps += ` ${snakeCaseToCamelCase(cssKey)}: ${propBinding.prop} ? "${propBinding.defaultValue}" : "${propBinding.conditionalValue}",`;
            continue;
          }

          variableProps += `${snakeCaseToCamelCase(cssKey)}: ${propBinding.prop},`;
        }
      }
    }
  }

  return [variableProps, cssKeyConnectedToProps];
};

// getWidthAndHeightVariableProp gets vairables props for the width and heights of html img tags
export const getWidthAndHeightVariableProp = (nodeId: string): string => {
  const propBindings: PropToPropBinding[] = propRegistryGlobalInstance.getPropToPropBindingByNodeId(nodeId);

  let widthAndHeight: string = "";

  if (!isEmpty(propBindings)) {
    for (const propBinding of propBindings) {
      for (const location of propBinding.locations) {
        if (location.type === "css") {
          if (location.cssKey === "width") {
            if (propBinding.dataType === DataType.boolean) {
              if (isEmpty(propBinding.conditionalValue)) {
                continue;
              }

              widthAndHeight += ` width={${propBinding.prop} ? "${propBinding.defaultValue}" : "${propBinding.conditionalValue}"}`;
              continue;
            }

            widthAndHeight += ` width={${propBinding.prop}}`;
          }

          if (location.cssKey === "height") {
            if (propBinding.dataType === DataType.boolean) {
              if (isEmpty(propBinding.conditionalValue)) {
                continue;
              }

              widthAndHeight += ` height={${propBinding.prop} ? "${propBinding.defaultValue}" : "${propBinding.conditionalValue}"}`;
              continue;
            }

            widthAndHeight += ` height={${propBinding.prop}}`;
          }
        }
      }
    }
  }

  return widthAndHeight.trim();
};

// getVariableProp gets variable props according to location types such as src and alt
export const getVariableProp = (nodeId: string, locationType: string): string => {
  const propBindings: PropToPropBinding[] = propRegistryGlobalInstance.getPropToPropBindingByNodeId(nodeId);

  if (!isEmpty(propBindings)) {
    for (const propBinding of propBindings) {
      for (const location of propBinding.locations) {
        if (location.type === locationType) {
          return propBinding.prop;
        }
      }
    }
  }

  return "";
};


// getTextVariableProp gets variable props for text in JSX
export const getTextVariableProp = (nodeId: string): string => {
  const propBindings: PropToPropBinding[] = propRegistryGlobalInstance.getPropToPropBindingByNodeId(nodeId);

  if (!isEmpty(propBindings)) {
    for (const propBinding of propBindings) {
      for (const location of propBinding.locations) {
        if (location.type === "text") {
          if (propBinding.dataType === DataType.boolean) {
            if (isEmpty(propBinding.conditionalValue)) {
              continue;
            }

            return `{${propBinding.prop} ? "${propBinding.defaultValue}" : "${propBinding.conditionalValue}"}`;
          }

          return `{${propBinding.prop}}`;
        }
      }
    }
  }

  return "";
};