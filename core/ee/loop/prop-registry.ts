import { PropToPropBinding } from "./component";

export type IdToPropBindingMap = {
    [id: string]: PropToPropBinding[];
};

export let propRegistryGlobalInstance: PropRegistry;

export const instantiatePropRegistryGlobalInstance = () => {
    propRegistryGlobalInstance = new PropRegistry();
};

class PropRegistry {
    idToPropBindings: IdToPropBindingMap;

    constructor() {
        this.idToPropBindings = {};
    }

    getPropToPropBindingByNodeId(nodeId: string): PropToPropBinding[] {
        return this.idToPropBindings[nodeId];
    }

    addPropToPropBinding(nodeId: string, bindings: PropToPropBinding[]) {
        this.idToPropBindings[nodeId] = bindings;
    }
}
