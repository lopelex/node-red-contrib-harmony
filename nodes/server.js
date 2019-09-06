const events = require('events');
const getHub = require('../lib/getHub');

module.exports = (RED) => {

    class Node {

        constructor(config) {

            let node = this;

            RED.nodes.createNode(node, config);            

            node.debug = true;
            node.config = config;
            node.events = new events.EventEmitter();
    
            node.hub = getHub(RED, node.config.ip);

            node.openListener = () => RED.log.info(`HarmonyWS use (${node.config.ip} - ${node.config.name})`);
            node.closeListener = () => node.reconnect();
            node.stateDigestListener = (digest) => node.emit('stateDigest', digest);
            node.automationStateListener = (state) => node.emit('automationState', state);

            node.hub.on('open', node.openListener);
            node.hub.on('close', node.closeListener);
            node.hub.on('stateDigest', node.stateDigestListener);
            node.hub.on('automationState', node.automationStateListener);
   
            node.hub.getConfig()
                .then(() => {
                    node.emit('startup');
                })
                .catch(err => {
                    if (node.debug) console.error(err.message);
                });

            node.reconnectInterval = () => setInterval(() => node.reconnect() , 60000);
     
            node.on('close', () => node.onClose());
        }

        reconnect() {

            let node = this;

            if (!node.hub.isConnected()) {
                node.hub.reloadConfig()
                    .catch(err => {
                        if (node.debug) console.error(err.message);
                    });
            }
        }

        onClose() {

            let node = this;

            if (node.hub) {
                node.hub.off('open', node.openListener);
                node.hub.off('close', node.closeListener);
                node.hub.off('stateDigest', node.stateDigestListener);
                node.hub.off('automationState', node.automationStateListener);

                clearInterval(node.reconnectInterval);
            }
        }
    }

    RED.nodes.registerType('hws-server', Node);
};
