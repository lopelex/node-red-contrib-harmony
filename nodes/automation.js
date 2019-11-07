const NodeClass = require('../lib/nodeClass');

module.exports = (RED) => {

    class Node extends NodeClass {

        constructor(config) {
            super(config, RED);
        }

        init() {

            this.on('input', msg => {

                this.server.info(this, 'automation input');
                this.server.info(this, msg);

                try {
                    let action = {};
                    action[this.config.device] = JSON.parse(this.config.json);

                    this.server.hub.sendAutomationCommand(action)
                        .then(res => {
                            if (!res.code || res.code != 200) {
                                throw new Error('Unable to send automation command.');
                            }
                            this.send({
                                payload: true
                            });
                        })
                        .catch(err => {
                            this.send({
                                payload: false,
                                error: err.message
                            });
                            this.server.error(this, err.message);
                        });
                } catch (err) {
                    this.server.error(this, err.message);
                }
            });
        }
    }

    RED.nodes.registerType('harmonyws-automation', Node);
};
