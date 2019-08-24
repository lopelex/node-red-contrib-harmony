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
            });
    
            setTimeout(() => {
                node.server.hub.on('stateDigest', (digest) => {
                    node.send({
                        payload: {
                            activity: digest.activityId,
                            status: digest.activityStatus
                        },
                        activity: digest.activityId,
                        status: digest.activityStatus
                    });
                });
            }, 5000);
        }
    }

    RED.nodes.registerType('hws-observer', Node);
};