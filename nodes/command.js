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
    
            node.on('input', msg => {
    
                let action;

                try {
    
                    let [id, command] = decodeURI(node.command).split(':');
    
                    if (msg.payload.command) {
                        command = msg.payload.command;
                    } else if (msg.command) {
                        command = msg.command;
                    }
    
                    action = node.server.hub.getAction(id || node.activity, command);
    
                } catch (err) {
                    if (node.server.debug) console.log('Error: ' + err.message);
                }
    
                if (!action) {
                    node.send({
                        payload: false
                    });
                } else {
                    node.server.hub.sendCommand(action, node.hold, node.repeat, node.delay)
                        .then(() => {
                            node.send({
                                payload: action
                            });
                        })
                        .catch(err => {
                            node.send({
                                payload: false,
                                error: err.message
                            });
                            if (node.server.debug) console.log('Error: ' + err.message);
                        });
                }
            });
        }
    }

    RED.nodes.registerType('hws-command', Node);
};