module.exports = (RED) => {

    class Node {
        constructor(config) {

            let node = this;

            RED.nodes.createNode(node, config);

            this.config = config;
            this.server = RED.nodes.getNode(this.config.server);

            if (!this.server) return;

            node.on('input', () => {
                node.send({
                    payload: {
                        activity: node.server.hub.activityId,
                        status: node.server.hub.activityStatus
                    },
                    activity: node.server.hub.activityId,
                    status: node.server.hub.activityStatus
                });
                node.writeToContext();
            });

            node.server.on('startup', () => {
                if(node.config.startup) {
                    node.send({
                        payload: {
                            activity: node.server.hub.activityId,
                            status: node.server.hub.activityStatus,
                            automation: node.server.hub.automationState
                        },
                        activity: node.server.hub.activityId,
                        status: node.server.hub.activityStatus,
                        automation: node.server.hub.automationState
                    });
                    node.writeToContext();
                }
            }); 
    
            node.server.on('stateDigest', (digest) => {
                node.send({
                    payload: {
                        activity: digest.activityId,
                        status: digest.activityStatus
                    },
                    activity: digest.activityId,
                    status: digest.activityStatus
                });
                node.writeToContext();
            });

            node.server.on('automationState', (state) => {
                node.send({
                    payload: {
                        automationState: state
                    },
                    automationState: state
                });
                node.writeToContext(state);
            });  
        }

        writeToContext(state) {

            let node = this;

            if(node.config.toContext) {
                let type = (node.config.context === 'flow') ? 'flow' : 'global';
                let context = node.context()[type];
                let contextKeyActivity = RED.util.parseContextStore(node.config.contextKeyActivity);
                let contextKeyAutomation = RED.util.parseContextStore(node.config.contextKeyAutomation);
                let contextKeyAutomationEvents = RED.util.parseContextStore(node.config.contextKeyAutomation + '_event');
                let status = node.server.hub.activityStatus;
                if(status == 0 || status == 2 || status == 4) {
                    context.set(contextKeyActivity.key, node.server.hub.activityId);
                }
                if(node.server.hub.automationState) {
                    context.set(contextKeyAutomation.key, node.server.hub.automationState);
                }
                if(state) {
                    context.set(contextKeyAutomationEvents.key, state);
                }
            }
        }
    }

    RED.nodes.registerType('hws-observer', Node);
};