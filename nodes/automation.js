module.exports = (RED) => {

    class Node {
        constructor(config) {

            let node = this;

            RED.nodes.createNode(node, config);

            node.config = config;
            node.server = RED.nodes.getNode(node.config.server);

            if (!node.server) return;

            node.on('input', msg => {               

                node.server.info(node, 'automation input');
                node.server.info(node, msg);

                try {    
                    let action = {};
                    action[node.config.device] = JSON.parse(node.config.json);

                    node.server.hub.sendAutomationCommand(action)
                        .then(res => {
                            if (!res.code || res.code != 200) {
                                throw new Error('Unable to send automation command.');
                            }
                            node.send({
                                payload: true
                            });
                        })                        
                        .catch(err => {
                            node.send({
                                payload: false,
                                error: err.message
                            });
                            node.server.error(node, err.message);
                        });    
                } catch (err) {
                    node.server.error(node, err.message);
                }
            }); 
        }
    }

    RED.nodes.registerType('hws-automation', Node);
};