const getHub = require('../lib/getHub');

module.exports = (RED) => {

    class Node {

        constructor(config) {

            let node = this;

            RED.nodes.createNode(node, config);            

            node.debug = true;
            node.config = config;
    
            node.hub = getHub(RED, node.config.ip);

            node.openListener = () => RED.log.info(`HarmonyWS use (${node.config.ip})`);
            node.stateDigestListener = (digest) => node.events.emit('stateDigest', digest);
            node.closeListener = () => node.reconnect();

            node.hub.on('open', node.openListener);
            node.hub.on('stateDigest', node.stateDigestListener);
            node.hub.on('close', node.closeListener);
   
            node.hub.getConfig()
                .catch(err => {
                    if (node.debug) console.error('Error: ' + err.message);
                });

            node.reconnectInterval = () => setInterval(() => node.reconnect() , 60000);
    
            RED.events.on('nodes-started', () => {
                node.emit('stateDigest', {
                    activityId: node.hub.activityId,
                    activityStatus: node.hub.activityStatus
                });
            });
    
            node.on('close', () => node.onClose());
        }

        reconnect() {

            let node = this;

            if (!node.hub.isConnected()) {
                node.hub.reloadConfig()
                    .catch(err => {
                        if (node.debug) console.error('Error: ' + err.message);
                    });
            }
        }

        onClose() {

            let node = this;

            if (node.hub) {
                node.hub.off('open', node.openListener);
                node.hub.off('stateDigest', node.stateDigestListener);
                node.hub.off('close', node.closeListener);
                clearInterval(node.reconnectInterval);
            }
        }
    }

    RED.nodes.registerType('hws-server', Node);
};
