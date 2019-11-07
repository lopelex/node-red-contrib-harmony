const NodeClass = require('../lib/nodeClass');

module.exports = (RED) => {

    class Node extends NodeClass {

        constructor(config) {
            super(config, RED);
        }

        init() {

            this.on('input', (msg) => {

                this.server.info(this, 'command input');
                this.server.info(this, msg);

                let action;

                try {

                    let [id, command] = decodeURI(this.config.command).split(':');

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
                        id = this.config.activity;
                    }

                    action = this.server.hub.getAction(id, command);

                } catch (err) {
                    this.server.error(this, err.message);
                }

                if (!action) {
                    this.send({
                        payload: false
                    });
                } else {
                    let hold = parseInt(this.config.hold);
                    let repeat = parseInt(this.config.repeat);
                    let delay = parseInt(this.config.delay);

                    this.server.hub.sendCommand(action, hold, repeat, delay)
                        .then(res => {
                            if (!res.code || res.code != 200) {
                                throw new Error('Unable to send command.');
                            }
                            this.send({
                                payload: action
                            });
                        })
                        .catch(err => {
                            this.send({
                                payload: false,
                                error: err.message
                            });
                            this.server.error(this, err.message);
                        });
                }
            });
        }
    }

    RED.nodes.registerType('harmonyws-command', Node);
};
