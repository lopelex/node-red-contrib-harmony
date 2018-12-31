module.exports = function(RED) {

    function getDeviceCommands(server, deviceLabel, commandLabel) {

        var config = server.cache.get('config');
        if (!config) return false;

        var device = config.data.device
            .filter(dev => {
                return dev.label === deviceLabel;
            })
            .pop();
        if (!device) return false;
        return device.controlGroup
            .map(group => {
                return group.function;
            })
            .reduce((prev, curr) => {
                return prev.concat(curr);
            })
            .filter(cmd => {
                return cmd.label === commandLabel;
            })
            .map(cmd => {
                return cmd.action;
            })[0];
    }

    function getActivityCommands(server, activityLabel, commandLabel) {

        var config = server.cache.get('config');
        if (!config) return false;

        var activity = config.data.activity
            .filter(act => {
                return act.label === activityLabel;
            })
            .pop();
        if (!activity) return false;
        return activity.controlGroup
            .map(group => {
                return group.function;
            })
            .reduce((prev, curr) => {
                return prev.concat(curr);
            })
            .filter(cmd => {
                return cmd.label === commandLabel;
            })
            .map(cmd => {
                return cmd.action;
            })[0];
    }

    function HarmonySendCommand(n) {
        RED.nodes.createNode(this, n);
        var node = this;

        node.server = RED.nodes.getNode(n.server);
        node.activity = n.activity;
        node.label = n.label;
        node.command = n.command;
        node.harmony_type = n.harmony_type;
        node.repeat = Number.parseInt(n.repeat) || 1;

        if (!node.server) return;

        node.on('input', msg => {

            var action = decodeURI(node.command);

            try {
                if (msg.payload.command) {

                    if (msg.payload.device) {
                        action = getDeviceCommands(node.server, msg.payload.device, msg.payload.command);
                    }
                    if (msg.payload.activity) {
                        action = getActivityCommands(node.server, msg.payload.activity, msg.payload.command);
                    }
                    node.repeat = Number.parseInt(msg.payload.repeat) || 1;
                }
            } catch (err) {
                console.log('Error: ' + err);
            }

            if (!action) {
                node.send({
                    payload: false
                });
            } else {
                for (var i = 0; i < node.repeat; i++) {
                    node.server.harmony.sendCommands(action, 50)
                        .catch(err => {
                            node.send({
                                payload: false
                            });
                            if (err) throw err;
                        });
                }
                node.send({
                    payload: action
                });
            }
        });
    }
    RED.nodes.registerType('HWS command', HarmonySendCommand)

    function HarmonyActivity(n) {
        RED.nodes.createNode(this, n);
        var node = this;

        node.server = RED.nodes.getNode(n.server);
        node.activity = n.activity;
        node.label = n.label;

        if (!node.server) return;

        node.on('input', msg => {
            try {
                msg.payload = JSON.parse(msg.payload);
            } catch (err) {
                console.log('Error: ' + err);
            }
            node.server.harmony.startActivity(node.activity)
                .then(response => {
                    node.send({
                        payload: true
                    });
                })
                .catch(err => {
                    node.send({
                        payload: false
                    });
                    console.log('Error: ' + err);
                })
        })
    }
    RED.nodes.registerType('HWS activity', HarmonyActivity);

    function HarmonyObserve(n) {
        RED.nodes.createNode(this, n);
        var node = this;

        node.server = RED.nodes.getNode(n.server);
        node.label = n.label;

        if (!node.server) return;

        setTimeout(() => {
            try {
                node.server.harmonyEventEmitter.on('stateDigest', digest => {
                    try {
                        node.send({
                            payload: {
                                activityId: digest.data.activityId,
                                activityStatus: digest.data.activityStatus
                            }
                        });
                    } catch (err) {
                        console.log('Error: ' + err);
                    }
                })
            } catch (err) {
                console.log('Error: ' + err);
            }
        }, 2000);
    }
    RED.nodes.registerType('HWS observe', HarmonyObserve);
}
