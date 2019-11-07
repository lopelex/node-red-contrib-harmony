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
            let seq = node.config.sequence;
            seq.push({
                type: 'done'
            });

            node.config.sequence.reduce((accu, value) => {

                switch (value.type) {

                    case 'activity':
                    {
                        let id = value.activity;

                        return accu.then(() => new Promise((resolve, reject) => {

                            let activityId = node.server.hub.activityId;
                            let activityStatus = node.server.hub.activityStatus;

                            if(activityId == id && (activityStatus == 2 || activityStatus == 4)) {
                                node.server.info(node, 'match');
                                resolve();
                            }

                            let stateDigestListener = (digest) => {
                                if(digest.activityId == id && digest.activityStatus == 2) {
                                    node.server.info(node, 'digest');
                                    node.server.removeListener('stateDigest', stateDigestListener);
                                    resolve();
                                }
                            };

                            node.server.on('stateDigest', stateDigestListener);

                            node.server.hub.startActivity(id)
                                .catch(err => reject(err));
                        }).catch(err =>
                            node.send({
                                payload: false
                            })
                        ));
                    }

                    case 'command':
                    {
                        let [id, command] = decodeURI(value.command).split(':');
                        let action = node.server.hub.getAction(id, command);

                        return accu.then(() => new Promise((resolve, reject) =>
                            node.server.hub.sendCommand(action, 0, 1, 0)
                                .then(() => {
                                    node.server.info(node, value.type);
                                    resolve();
                                })
                                .catch(err => reject(err))
                        ).catch(err =>
                            node.send({
                                payload: false
                            })
                        ));
                    }

                    case 'delay':
                    {
                        let delay = value.delay;

                        return accu.then(() => new Promise((resolve) => {
                            node.server.info(node, value.type);
                            setTimeout(() => resolve(), delay);
                        }).catch(err =>
                            node.send({
                                payload: false
                            })
                        ));
                    }

                    case 'done':
                    {
                        return accu.then(() => new Promise((resolve) => {
                            node.send({
                                payload: true
                            });
                            resolve();
                        }).catch(err =>
                            node.send({
                                payload: false
                            })
                        ));
                    }
                    default:
                        return false;
                }
            }
            , Promise.resolve());

            seq.pop();
        }
    }

    RED.nodes.registerType('harmonyws-sequence', Node);
};
