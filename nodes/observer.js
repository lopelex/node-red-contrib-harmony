const NodeClass = require('../lib/nodeClass');

module.exports = (RED) => {

    class Node extends NodeClass {

        constructor(config) {
            super(config, RED);
        }

        init() {

            this.on('input', () => {
                
                this.send({
                    payload: {
                        activity: this.server.hub.activityId,
                        status: this.server.hub.activityStatus
                    },
                    activity: this.server.hub.activityId,
                    status: this.server.hub.activityStatus
                });
                this.writeToContext();
            });

            this.startupListener = (state) => {
                if(this.config.startup) {
                    this.send({
                        payload: {
                            activity: this.server.hub.activityId,
                            status: this.server.hub.activityStatus,
                            automation: this.server.hub.automationState
                        },
                        activity: this.server.hub.activityId,
                        status: this.server.hub.activityStatus,
                        automation: this.server.hub.automationState
                    });
                    this.writeToContext();
                }
            };

            this.stateDigestListener = (digest) => {
                this.send({
                    payload: {
                        activity: digest.activityId,
                        status: digest.activityStatus
                    },
                    activity: digest.activityId,
                    status: digest.activityStatus
                });
                this.writeToContext();
            };

            this.automationStateListener = (state) => {
                this.send({
                    payload: {
                        automationState: state
                    },
                    automationState: state
                });
                this.writeToContext(state);
            };

            this.server.on('startup', this.startupListener);
            this.server.on('stateDigest', this.stateDigestListener);
            this.server.on('automationState', this.automationStateListener);

            this.on('close', () => this.onClose());
        }

        onClose() {

            this.server.removeListener('startup', this.startupListener);
            this.server.removeListener('stateDigest', this.stateDigestListener);
            this.server.removeListener('automationState', this.automationStateListener);
        }

        writeToContext(state) {

            if(this.config.toContext) {
                let type = (this.config.context === 'flow') ? 'flow' : 'global';
                let context = this.context()[type];
                let contextKeyActivity = RED.util.parseContextStore(this.config.contextKeyActivity);
                let contextKeyAutomation = RED.util.parseContextStore(this.config.contextKeyAutomation);
                let contextKeyAutomationEvents = RED.util.parseContextStore(this.config.contextKeyAutomation + '_event');
                let status = this.server.hub.activityStatus;
                if(status == 0 || status == 2 || status == 4) {
                    context.set(contextKeyActivity.key, this.server.hub.activityId);
                }
                if(this.server.hub.automationState) {
                    context.set(contextKeyAutomation.key, this.server.hub.automationState);
                }
                if(state) {
                    context.set(contextKeyAutomationEvents.key, state);
                }
            }
        }
    }

    RED.nodes.registerType('harmonyws-observer', Node);
};
