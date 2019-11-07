const NodeClass = require('../lib/nodeClass');
const toBoolean = require('../lib/toBoolean');

module.exports = (RED) => {

    class Node extends NodeClass {

        constructor(config) {
            super(config, RED);
        }

        init() {

            this.on('input', msg => {

                this.server.info(this, 'activity input');
                this.server.info(this, msg);

                let id;

                if (msg.payload.activity) {
                    id = msg.payload.activity;
                }
                else if (msg.activity) {
                    id = msg.activity;
                }
                else if (!toBoolean(msg.payload, true)) {
                    id = '-1'; //poweroff
                }

                if (!id) {
                    id = this.config.activity;
                }

                this.server.hub.startActivity(id)
                    .then(res => {
                        if (!res.code || res.code != 200) {
                            throw new Error('Unable to start activity.');
                        }
                        this.send({
                            payload: {
                                activity: id
                            },
                            activity: id
                        });
                    })
                    .catch(err => {
                        this.send({
                            payload: false,
                            error: err.message
                        });
                        this.server.error(this, err.message);
                    });
            });
        }
    }

    RED.nodes.registerType('harmonyws-activity', Node);
};
