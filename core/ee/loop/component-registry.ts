import { Component } from "./component";

type IdToComponentsMap = {
    [id: string]: Component;
};

export let componentRegistryGlobalInstance: ComponentRegistry;

export const instantiateComponentRegistryGlobalInstance = () => {
    componentRegistryGlobalInstance = new ComponentRegistry();
};

class ComponentRegistry {
    idToComponentMap: IdToComponentsMap;
    nodeIdToComponentIdMap: IdToComponentsMap;

    constructor() {
        this.idToComponentMap = {};
        this.nodeIdToComponentIdMap = {};
    }

    addNodeIdToComponentMapping(nodeId: string, component: Component) {
        this.nodeIdToComponentIdMap[nodeId] = component;
    }

    getComponentByNodeId(nodeId: string): Component {
        return this.nodeIdToComponentIdMap[nodeId];
    }

    registerComponent(component: Component) {
        this.idToComponentMap[component.id] = component;
    }

    getComponent(id: string): Component {
        return this.idToComponentMap[id];
    }
}