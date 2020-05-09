const getHub = require('../lib/getHub');

module.exports = (RED) => {

    class Node {

        constructor(config) {

            RED.nodes.createNode(this, config);

            this.config = config;

            this.hub = getHub(RED, this.config.ip);

            this.openListener = () => this.info(this, `HarmonyWS use (${this.config.ip} - ${this.config.name})`);
            this.closeListener = () => this.reconnect();
            this.stateDigestListener = (digest) => this.emit('stateDigest', digest);
            this.automationStateListener = (state) => this.emit('automationState', state);

            this.hub.on('open', this.openListener);
            this.hub.on('close', this.closeListener);
            this.hub.on('stateDigest', this.stateDigestListener);
            this.hub.on('automationState', this.automationStateListener);

            this.hub.getConfig()
                .then(() => {
                    this.info(this, 'startup');
                    this.emit('startup');
                })
                .catch(err => {
                    this.error(this, err.message);
                });

            this.reconnectInterval = () => setInterval(() => this.reconnect() , 60000);

            this.on('close', () => this.onClose());
        }

        reconnect() {

            if (!this.hub.isConnected()) {
                this.info(this, 'reloadConfig');
                this.hub.reloadConfig()
                    .catch(err => {
                        this.error(this, err.message);
                    });
            }
        }

        onClose() {

            if (this.hub) {
                this.hub.removeListener('open', this.openListener);
                this.hub.removeListener('close', this.closeListener);
                this.hub.removeListener('stateDigest', this.stateDigestListener);
                this.hub.removeListener('automationState', this.automationStateListener);

                clearInterval(this.reconnectInterval);
            }
        }

        sendDebug(level, source, msg) {

            if (!this.config.debug) return;

            let data = {
                id: source.id,
                name: source.name,
                topic: 'HarmonyWS',
                property: level,
                msg: msg,
                _path: ''
            };
            try {
                data = RED.util.encodeObject(data, {
                    maxLength: 1000
                });
                RED.comms.publish('debug', data);                
            } catch (e) {
                //
            }
        }

        info(source, msg) {

            this.sendDebug('info', source, msg);
            if (this.config.debug) RED.log.info(msg);
        }

        error(source, msg) {

            this.sendDebug('error', source, msg);
        }
    }

    RED.nodes.registerType('harmonyws-server', Node);
};
