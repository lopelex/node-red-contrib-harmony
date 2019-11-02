module.exports = (RED) => {

    class Node {
        constructor(config) {

            let node = this;

            RED.nodes.createNode(node, config);

            node.config = config;
            node.server = RED.nodes.getNode(node.config.server);

            if (!node.server) return;

            node.activity = node.config.activity;
            node.label = node.config.label;
            node.command = node.config.command;
            node.hold = Number.parseInt(node.config.hold) || 0;
            node.repeat = Number.parseInt(node.config.repeat) || 1;
            node.delay = Number.parseInt(node.config.delay) || 0;

            node.on('input', (msg) => {

                let action;

                node.server.info(node, 'command input');
                node.server.info(node, msg);

                try {

                    let [id, command] = decodeURI(node.command).split(':');

                    if (msg.payload.command) {
                        command = msg.payload.command;
                        if(msg.payload.deviceId) {
                            id = msg.payload.deviceId;
                        }
                    } else if (msg.command) {
                        command = msg.command;
                        if(msg.deviceId) {
                            id = msg.deviceId;
                        }
                    }

                    if(!id) {
                        id = node.activity;
                    }

                    action = node.server.hub.getAction(id, command);

                } catch (err) {
                    node.server.error(node, err.message);
                }

                if (!action) {
                    node.send({
                        payload: false
                    });
                } else {
                    node.server.hub.sendCommand(action, node.hold, node.repeat, node.delay)
                        .then(res => {
                            if (!res.code || res.code != 200) {
                                throw new Error('Unable to send command.');
                            }
                            node.send({
                                payload: action
                            });
                        })
                        .catch(err => {
                            node.send({
                                payload: false,
                                error: err.message
                            });
                            node.server.error(node, err.message);
                        });
                }
            });
        }
    }

    RED.nodes.registerType('harmonyws-command', Node);
};
