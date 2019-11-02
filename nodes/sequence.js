module.exports = (RED) => {

    class Node {
        constructor(config) {

            let node = this;

            RED.nodes.createNode(node, config);

            node.config = config;
            node.server = RED.nodes.getNode(node.config.server);

            if (!node.server) return;

            node.on('input', msg => {

                node.server.info(node, 'sequence input');
                node.server.info(node, msg);

                this.sequence();
            });
        }

        sequence() {

            let node = this;

            node.config.sequence.reduce((accu, value) => {

                switch (value.type) {

                    case 'command':
                    {
                        let [id, command] = decodeURI(value.command).split(':');
                        let action = node.server.hub.getAction(id, command);

                        return accu.then(() => new Promise((resolve, reject) =>
                            node.server.hub.sendCommand(action, 0, 1, 0)
                                .then(() => {
                                    node.send({
                                        payload: action
                                    });
                                    resolve();
                                })
                                .catch(err => reject(err))
                        ));
                    }

                    case 'delay':
                    {
                        let delay = value.delay;

                        return accu.then(() => new Promise((resolve) => {
                            node.send({
                                payload: 'delay: ' + delay
                            });
                            setTimeout(() => resolve(), delay);
                        }));
                    }
                    default:
                        return false;
                }
            }
            , Promise.resolve());
        }
    }

    RED.nodes.registerType('harmonyws-sequence', Node);
};
