module.exports = (RED) => {

    class Node {
        constructor(config) {

            let node = this;

            RED.nodes.createNode(node, config);

            node.config = config;
            node.server = RED.nodes.getNode(node.config.server);

            if (!node.server) return;

            node.activity = node.config.activity;
            
            node.on('input', msg => {
    
                let id;

                node.server.info(node, 'activity input');
                node.server.info(node, msg);

                if (msg.payload.activity) {
                    id = msg.payload.activity;
                } 
                else if (msg.activity) {
                    id = msg.activity;
                }
                else if (!node.toBoolean(msg.payload, true)) {
                    id = '-1'; //poweroff
                }
                
                if (!id) {
                    id = node.activity;
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
                        node.server.error(node, err.message);
                    });
            });
        }
    
        toBoolean(value, defaultValue) {

            if (typeof value == 'boolean' || value instanceof Boolean) {
                return value;
            }
            if (typeof value == 'string' || value instanceof String) {
                value = value.trim().toLowerCase();
                if (value === 'false' || value === '0' || value === 'off') {
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

    RED.nodes.registerType('harmonyws-activity', Node);
};