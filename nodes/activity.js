module.exports = (RED) => {

    class Node {
        constructor(config) {

            let node = this;

            RED.nodes.createNode(node, config);

            this.config = config;
            this.server = RED.nodes.getNode(this.config.server);

            if (!this.server) return;

            this.activity = this.config.activity;
            
            this.on('input', msg => {
    
                let id;

                if (msg.payload.activity) {
                    id = msg.payload.activity;
                } else if (msg.activity) {
                    id = msg.activity;
                }
                if (!id) {
                    id = node.activity;
                }
                if (!node.toBoolean(msg.payload, true)) {
                    id = '-1'; //poweroff
                }
                node.server.hub.startActivity(id)
                    .then(res => {
                        if (!res.code || res.code != 200) {
                            throw new Error('Unable to start activity.');
                        }
                        node.send({
                            payload: {
                                activity: id
                            },
                            activity: id
                        });
                    })
                    .catch(err => {
                        node.send({
                            payload: false,
                            error: err.message                            
                        });
                        if (this.server.debug) console.log('Error: ' + err.message);
                    });
            });
        }
    
        toBoolean(value, defaultValue) {

            if (typeof value == 'boolean' || value instanceof Boolean) {
                return value;
            }
            if (typeof value == 'string' || value instanceof String) {
                value = value.trim().toLowerCase();
                if (value === 'false' ||
                value === '0' ||
                value === 'off'
                ) {
                    return false;
                }
            }
            if (typeof value == 'number' || value instanceof Number) {
                if (value === 0) {
                    return false;
                }
            }
            return defaultValue;
        }
    }

    RED.nodes.registerType('hws-activity', Node);
};