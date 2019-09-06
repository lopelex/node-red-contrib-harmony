module.exports = (RED) => {

    class Node {
        constructor(config) {

            let node = this;

            RED.nodes.createNode(node, config);

            node.config = config;
            node.server = RED.nodes.getNode(node.config.server);

            if (!node.server) return;

            node.on('input', () => {               

                try {    
                    let action = {};
                    action[node.config.device] = JSON.parse(node.config.json);

                    node.server.hub.sendAutomationCommand(action)
                        .then((res) => {
                            if (!res.code || res.code != 200) {
                                throw new Error('Unable to start activity.');
                            }
                            node.send({
                                payload: true
                            });
                        });    
                } catch (err) {
                    if (node.server.debug) console.log(err.message);
                }
            });                
 
        }
    }

    RED.nodes.registerType('hws-automation', Node);
};