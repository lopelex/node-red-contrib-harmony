module.exports = function(RED) {

    const debug = false;

    function HarmonySendCommand(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.server = RED.nodes.getNode(config.server);
        node.activity = config.activity;
        node.label = config.label;
        node.command = config.command;
        node.harmonyType = config.harmonyType;
        node.hold = Number.parseInt(config.hold) || 0;
        node.repeat = Number.parseInt(config.repeat) || 1;
        node.delay = Number.parseInt(config.delay) || 0;

        if (!node.server) return;

        node.on('input', msg => {

            try {

                var [type, id, command] = decodeURI(node.command).split(':');

                if (msg.payload.command) {
                    command = msg.payload.command;
                } else if (msg.command) {
                    command = msg.command;
                }

                var action = node.server.hub.getAction(id || node.activity, command);

            } catch (err) {
                if (debug) console.log('Error: ' + err);
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
                            payload: false
                        });
                        if (debug) console.log('Error: ' + err);
                    });
            }
        });
    }
    RED.nodes.registerType('HWS command', HarmonySendCommand)

    function toBoolean(value, defaultValue) {
        if (typeof value == 'boolean' || value instanceof Boolean) {
            return value;
        }
        if (typeof value == 'string' || value instanceof String) {
            value = value.trim().toLowerCase();
            if (value === 'false' ||
                value === '0' ||
                value === 'off'
            ) {
                return false;
            }
        }
        if (typeof value == 'number' || value instanceof Number) {
            if (value === 0) {
                return false;
            }
        }
        return defaultValue;
    }

    function HarmonyActivity(config) {
        var node = this;
        RED.nodes.createNode(this, config);

        node.server = RED.nodes.getNode(config.server);
        node.activity = config.activity;

        if (!node.server) return;

        node.on('input', msg => {

            var id;

            if (msg.payload.activity) {
                id = msg.payload.activity;
            } else if (msg.activity) {
                id = msg.activity;
            }
            if (!id) {
                id = node.activity;
            }
            if (!toBoolean(msg.payload, true)) {
                id = '-1'; //poweroff
            }
            node.server.hub.startActivity(id)
                .then(res => {
                    if (!res.code || res.code != 200) {
                        throw new Error();
                    }
                    node.send({
                        payload: {
                            activity: id
                        },
                        activity: id
                    });
                })
                .catch(err => {
                    node.send({
                        payload: false
                    });
                    if (debug) console.log('Error: ' + err);
                });
        });
    }
    RED.nodes.registerType('HWS activity', HarmonyActivity);

    function HarmonyObserve(config) {
        var node = this;
        RED.nodes.createNode(this, config);

        node.server = RED.nodes.getNode(config.server);

        if (!node.server) return;

        node.on('input', msg => {
            node.send({
                payload: {
                    activity: node.server.hub.activityId,
                    status: node.server.hub.activityStatus
                },
                activity: node.server.hub.activityId,
                status: node.server.hub.activityStatus
            });
        });

        setTimeout(() => {
            node.server.hub.on('stateDigest', digest => {
                node.send({
                    payload: {
                        activity: digest.activityId,
                        status: digest.activityStatus
                    },
                    activity: digest.activityId,
                    status: digest.activityStatus
                });
            });
        }, 5000);
    }
    RED.nodes.registerType('HWS observe', HarmonyObserve);
}
