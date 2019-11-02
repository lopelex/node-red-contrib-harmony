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

                        let [id, command] = decodeURI(value.command).split(':');
                        let action = node.server.hub.getAction(id, command);

                        return accu.then((value) => new Promise((resolve, reject) =>
                            node.server.hub.sendCommand(action, 0, 1, 0)
                                .then((res) => {
                                    node.send({
                                        payload: action
                                    });
                                    resolve();
                                })
                                .catch(err => reject(err))
                        ));

                        break;

                    case 'delay':

                        let delay = value.delay;

                        return accu.then((value) => new Promise((resolve, reject) =>
                            setTimeout(() => {
                                node.send({
                                    payload: 'delay: ' + delay
                                });
                                resolve();
                            }, delay)
                        ));
                        break;
                    default:
                }
            }
            , Promise.resolve());
        }
    }

    RED.nodes.registerType('harmonyws-sequence', Node);
};
