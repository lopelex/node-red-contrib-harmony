const events = require('events');
const getHub = require('../lib/getHub');

module.exports = (RED) => {

    class Node {

        constructor(config) {

            let node = this;

            RED.nodes.createNode(node, config);
            
            node.config = config;
            node.events = new events.EventEmitter();
            node.debug = config.debug;
    
            node.hub = getHub(RED, node.config.ip);

            node.openListener = () => node.info(node, `HarmonyWS use (${node.config.ip} - ${node.config.name})`);
            node.closeListener = () => node.reconnect();
            node.stateDigestListener = (digest) => node.emit('stateDigest', digest);
            node.automationStateListener = (state) => node.emit('automationState', state);

            node.hub.on('open', node.openListener);
            node.hub.on('close', node.closeListener);
            node.hub.on('stateDigest', node.stateDigestListener);
            node.hub.on('automationState', node.automationStateListener);
   
            node.hub.getConfig()
                .then(() => {
                    node.info(node, 'startup');
                    node.emit('startup');
                })
                .catch(err => {
                    node.error(node, err.message);
                });

            node.reconnectInterval = () => setInterval(() => node.reconnect() , 60000);
     
            node.on('close', () => node.onClose());
        }

        reconnect() {

            let node = this;

            if (!node.hub.isConnected()) {
                node.info(node, 'reloadConfig');
                node.hub.reloadConfig()
                    .catch(err => {
                        node.error(node, err.message);
                    });
            }
        }

        onClose() {

            let node = this;

            if (node.hub) {
                node.hub.removeListener('open', node.openListener);
                node.hub.removeListener('close', node.closeListener);
                node.hub.removeListener('stateDigest', node.stateDigestListener);
                node.hub.removeListener('automationState', node.automationStateListener);

                clearInterval(node.reconnectInterval);
            }
        }

        sendDebug(level, source, msg) {

            if (!this.debug) return;

            let data = {
                id: source.id,
                name: source.name,
                topic: 'HarmonyWS',
                property: level,
                msg: msg,
                _path: ''
            };
            data = RED.util.encodeObject(data, {
                maxLength: 1000
            });
            RED.comms.publish('debug', data);

        }

        info(source, msg) {

            this.sendDebug('info', source, msg);
            if (this.debug) RED.log.info(msg);
        }

        error(source, msg) {

            this.sendDebug('error', source, msg);
            // if (this.debug) RED.log.error(msg);
        }
    }

    RED.nodes.registerType('harmonyws-server', Node);
};
