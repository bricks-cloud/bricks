import { Node } from "../../../bricks/node";
import { isEmpty } from "../../../utils";

export let RadialGradientGlobalRegistry: RadialGradientRegistry;

// RadialGradientRegistry contains related informaiton used for rendering radial gradient in tailwindcss.
export class RadialGradientRegistry {
    radialGradientExist: boolean;
    constructor(node: Node) {
        this.radialGradientExist = doesRadialGradientExist(node);
    }

    getRadialGradientExist(): boolean {
        return this.radialGradientExist;
    }
}

// instantiateRadialRadientRegistryGlobalInstance creates a singleton.
export const instantiateRadialRadientRegistryGlobalInstance = (node: Node) => {
    RadialGradientGlobalRegistry = new RadialGradientRegistry(node);
};


export const doesRadialGradientExist = (node: Node): boolean => {
    if (isEmpty(node)) {
        return false;
    }

    if (!isEmpty(node.getACssAttribute("background"))) {
        const bgCssValue: string = node.getACssAttribute("background");
        if (bgCssValue.startsWith("radial-gradient")) {
            return true;
        }
    }

    const children: Node[] = node.getChildren();
    let result: boolean = false;
    for (const child of children) {
        if (result) {
            return result;
        }

        result = result || doesRadialGradientExist(child);
    }

    return result;
};
