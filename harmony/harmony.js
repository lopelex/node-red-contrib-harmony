module.exports = function(RED) {

    function HarmonySendCommand(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.server = RED.nodes.getNode(config.server);
        node.activity = config.activity;
        node.label = config.label;
        node.command = config.command;
        node.harmonyType = config.harmonyType;
        node.delay = Number.parseInt(config.delay) || 50;
        node.repeat = Number.parseInt(config.repeat) || 1;

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
                console.log('Error: ' + err);
            }

            if (!action) {
                node.send({
                    payload: false
                });
            } else {
                node.server.hub.sendCommand(action, node.delay, node.repeat)
                    .then(() => {
                        node.send({
                            payload: action
                        });
                    })
                    .catch(err => {
                        node.send({
                            payload: false
                        });
                        console.log('Error: ' + err);
                    });
            }
        });
    }
    RED.nodes.registerType('HWS command', HarmonySendCommand)



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
                    console.log('Error: ' + err);
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
