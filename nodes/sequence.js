const NodeClass = require('../lib/nodeClass');

module.exports = (RED) => {

    class Node extends NodeClass {

        constructor(config) {
            super(config, RED);
        }

        init() {

            this.on('input', msg => {

                this.server.info(this, 'sequence input');
                this.server.info(this, msg);

                this.sequence();
            });
        }

        sequence() {

            let seq = this.config.sequence;
            seq.push({
                type: 'done'
            });

            this.config.sequence.reduce((accu, value) => {

                switch (value.type) {

                    case 'activity':
                    {
                        let id = value.activity;

                        return accu.then(() => new Promise((resolve, reject) => {

                            let activityId = this.server.hub.activityId;
                            let activityStatus = this.server.hub.activityStatus;

                            if(activityId == id && (activityStatus == 2 || activityStatus == 4)) {
                                this.server.info(this, 'activity match');
                                resolve();
                                return;
                            }

                            let stateDigestListener = (digest) => {
                                if(digest.activityId == id && digest.activityStatus == 2) {
                                    this.server.info(this, 'digest');
                                    this.server.removeListener('stateDigest', stateDigestListener);
                                    resolve();
                                }
                            };

                            this.server.on('stateDigest', stateDigestListener);

                            this.server.hub.startActivity(id)
                                .catch(err => reject(err));
                        }).catch(err =>
                            this.send({
                                payload: false,
                                error: err
                            })
                        ));
                    }

                    case 'command':
                    {
                        let [id, command] = decodeURI(value.command).split(':');
                        let action = this.server.hub.getAction(id, command);

                        return accu.then(() => new Promise((resolve, reject) =>
                            this.server.hub.sendCommand(action, 0, 1, 0)
                                .then(() => {
                                    this.server.info(this, value.type);
                                    resolve();
                                })
                                .catch(err => reject(err))
                        ).catch(err =>
                            this.send({
                                payload: false,
                                error: err
                            })
                        ));
                    }

                    case 'delay':
                    {
                        let delay = value.delay;

                        return accu.then(() => new Promise((resolve) => {
                            this.server.info(this, value.type);
                            setTimeout(() => resolve(), delay);
                        }).catch(err =>
                            this.send({
                                payload: false,
                                error: err
                            })
                        ));
                    }

                    case 'done':
                    {
                        return accu.then(() => new Promise((resolve) => {
                            this.send({
                                payload: true
                            });
                            resolve();
                        }).catch(err =>
                            this.send({
                                payload: false,
                                error: err
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
