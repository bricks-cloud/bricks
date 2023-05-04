export let aiApplicationRegistryGlobalInstance: AiApplicationRegistry;
export const instantiateAiApplicationRegistryGlobalInstance = () => {
    aiApplicationRegistryGlobalInstance = new AiApplicationRegistry();
};

export enum AiApplication {
    componentIdentification = "componentIdentification",
    autoNaming = "autoNaming",
}


class AiApplicationRegistry {
    applications: AiApplication[];

    constructor() {
        this.applications = [];
    };

    addApplication(application: AiApplication) {
        if (this.applications.includes(application)) {
            return;
        }

        this.applications.push(application);
    }

    getApplications(): AiApplication[] {
        return this.applications;
    }
}