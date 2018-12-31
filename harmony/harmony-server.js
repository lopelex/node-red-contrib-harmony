const HarmonyHubDiscover = require('@harmonyhub/discover').Explorer
var Harmony = require('harmony-websocket')
var events = require('events')
var netstat = require('node-netstat')
const NodeCache = require('node-cache');

var debug = true;

module.exports = function(RED) {
    function HarmonyServerNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;

        node.ip = n.ip;
        node.harmonyEventEmitter = new events.EventEmitter();

        node.cache = new NodeCache();

        createClient(node);

        node.getConfig = getConfig;
        node.getActivities = getActivities;
        node.getActivityCommands = getActivityCommands;
        node.getDevices = getDevices;
        node.getDeviceCommands = getDeviceCommands;

        this.on('close', function() {
            if (node.harmony && typeof node.harmony.end !== 'undefined') {
                try {
                    node.harmony.end();
                } catch (e) {}
            }
        })
    }
    RED.nodes.registerType('harmonyws-server', HarmonyServerNode)

    function createClient(node) {
        if (node.harmony && typeof node.harmony.end !== 'undefined') {
            try {
                node.harmony.end();
            } catch (e) {}
        }
        node.harmony = new Harmony();
        node.harmony.on('open', () => getConfig(node));
        node.harmony.on('stateDigest', digest => node.harmonyEventEmitter.emit('stateDigest', digest));
        node.harmony.on('close', () => createClient(node));
        node.harmony.connect(node.ip)
            .catch(err => {
                if (debug) console.log('error: ' + err);
            });
    }

    function getConfig(node) {

        if (debug) console.log('getConfigCache?');
        return node.harmony.getConfig()
            .then(config => {
                node.cache.set('config', config);
            }).catch(err => {
                if (debug) console.log('error: ' + err);
            });
    }

    function getActivities(node) {

        var config = node.cache.get('config');
        if (!config) return false;

        return config.data.activity
            .map(action => {
                return {
                    id: action.id,
                    label: action.label
                }
            });
    }

    function getActivityCommands(node, activityId) {

        var config = node.cache.get('config');
        if (!config) return false;

        var activity = config.data.activity
            .filter(act => {
                return act.id === activityId
            })
            .pop();
        return activity.controlGroup
            .map(group => {
                return group.function
            })
            .reduce((prev, curr) => {
                return prev.concat(curr)
            })
            .map(cmd => {
                return {
                    action: cmd.action,
                    label: cmd.label
                }
            });
    }

    function getDevices(node) {

        var config = node.cache.get('config');
        if (!config) return false;

        return config.data.device
            .filter(device => {
                return device.controlGroup.length > 0
            })
            .map(device => {
                return {
                    id: device.id,
                    label: device.label
                }
            });
    }

    function getDeviceCommands(node, deviceId) {

        var config = node.cache.get('config');
        if (!config) return false;

        var device = config.data.device
            .filter(device => {
                return device.id === deviceId
            })
            .pop();
        return device.controlGroup
            .map(group => {
                return group.function
            })
            .reduce((prev, curr) => {
                return prev.concat(curr)
            })
            .map(cmd  => {
                return {
                    action: JSON.parse(cmd.action),
                    label: cmd.label
                }
            });
    }

    function getNextAvailablePort(portRangeAsString) {
        var portString = process.env.USE_PORT_RANGE || portRangeAsString

        if (portString) {
            var portStart, portLast

            portStart = parseInt(portString.split('-')[0])
            portLast = parseInt(portString.split('-')[1])

            var portArr = []

            netstat({
                sync: true,
                filter: {
                    local: {
                        address: null
                    }
                }
            }, portArr.push.bind(portArr))

            portArr = portArr.map(
                portInfo => portInfo.local.port
            ).filter(
                // filter port range and also the index to eliminate duplicates
                (portNr, index, arr) => portNr >= portStart && portNr <= portLast && arr.indexOf(portNr) === index
            )

            if (portArr.length > portLast - portStart) {
                throw new Error('No available port in the range ' + portString)
            } else {
                for (var i = portStart; i <= portLast; ++i) {
                    if (portArr.indexOf(i) < 0) {
                        return i
                    }
                }
            }
        } else {
            return 0
        }
    }

    // bad!!!
    // if there is no server registered
    RED._harmony = {
        cache: new NodeCache(),
        getConfig: ip => {
            var that = RED._harmony;
            if (debug) console.log('getConfigCacheTemp?');

            var harmonyClient = new Harmony();
            return harmonyClient.connect(ip)
                .then(() => harmonyClient.getConfig())
                .then(config => {
                    that.loaded = ip;
                    that.cache.set('config', config);
                    if (debug) console.log('getConfigCacheTemp:');
                })
                .then(() => harmonyClient.end());
        },
        getActivities: getActivities,
        getActivityCommands: getActivityCommands,
        getDevices: getDevices,
        getDeviceCommands: getDeviceCommands
    }

    RED.httpAdmin.get('/harmonyws/server', (req, res, next) => {

        try {
            const discover = new HarmonyHubDiscover(getNextAvailablePort('5002-5100'));
            var hubsFound;

            discover.on('update', hubs => {
                hubsFound = hubs;
            });

            discover.start();
            setTimeout(() => {
                discover.stop();
                res.end(JSON.stringify(hubsFound));
            }, 3000);
        } catch (e) {
            res.status(200).send()
        }
    });

    RED.httpAdmin.get('/harmonyws/config', (req, res, next) => {

        if (!req.query.id || !req.query.ip) {
            res.status(400).send('Missing argument');
        } else {
            var node = RED.nodes.getNode(req.query.id);
            if (!node) {
                res.status(400).send('Please deploy first');
                return
            }
            node.getConfig(node)
                .then(() => res.status(200).send());
        }
    });

    RED.httpAdmin.get('/harmonyws/activities', (req, res, next) => {
        if (!req.query.id || !req.query.ip) {
            res.status(400).send('Missing argument');
        } else {
            var node = RED.nodes.getNode(req.query.id);
            if (!node) {
                var harmony = RED._harmony;
                if (harmony.loaded === req.query.ip) {
                    res.status(200).send(JSON.stringify(harmony.getActivities(harmony)))
                } else {
                    harmony.getConfig(req.query.ip)
                        .then(() => {
                            res.status(200).send(JSON.stringify(harmony.getActivities(harmony)))
                        })
                    .catch((err) => res.status(400).send('Please deploy first'));
                }
                return;
            }
            res.status(200).send(JSON.stringify(node.getActivities(node)));
        }
    });

    RED.httpAdmin.get('/harmonyws/commands', (req, res, next) => {

        if (!req.query.id || !req.query.ip || !req.query.activity) {
            res.status(400).send('Missing argument');
        } else {
            var node = RED.nodes.getNode(req.query.id);
            if (!node) {
                var harmony = RED._harmony;
                if (harmony.loaded === req.query.ip) {
                    res.status(200).send(JSON.stringify(harmony.getActivityCommands(harmony, req.query.activity)))
                } else {
                    harmony.getConfig(req.query.ip)
                        .then(() => {
                            res.status(200).send(JSON.stringify(harmony.getActivityCommands(harmony, req.query.activity)))
                        })
                    .catch((err) => res.status(400).send('Please deploy first'));
                }
                return;
            }
            res.status(200).send(JSON.stringify(node.getActivityCommands(node, req.query.activity)));
        }
    });

    RED.httpAdmin.get('/harmonyws/devices', (req, res, next) => {

        if (!req.query.id || !req.query.ip) {
            res.status(400).send('Missing argument');
        } else {
            var node = RED.nodes.getNode(req.query.id);
            if (!node) {
                var harmony = RED._harmony;
                if (harmony.loaded === req.query.ip) {
                    res.status(200).send(JSON.stringify(harmony.getDevices(harmony)))
                } else {
                    harmony.getConfig(req.query.ip)
                        .then(() => {
                            res.status(200).send(JSON.stringify(harmony.getDevices(harmony)))
                        }).catch((err) => res.status(400).send('Please deploy first'));
                }
                return;
            }
            res.status(200).send(JSON.stringify(node.getDevices(node)));
        }
    });

    RED.httpAdmin.get('/harmonyws/device-commands', (req, res, next) => {

        if (!req.query.id || !req.query.ip || !req.query.device) {
            res.status(400).send('Missing argument');
        } else {
            var node = RED.nodes.getNode(req.query.id);
            if (!node) {
                var harmony = RED._harmony;
                if (harmony.loaded === req.query.ip) {
                    res.status(200).send(JSON.stringify(harmony.getDeviceCommands(harmony, req.query.device)))
                } else {
                    harmony.getConfig(req.query.ip)
                        .then(() => {
                            res.status(200).send(JSON.stringify(harmony.getDeviceCommands(harmony, req.query.device)))
                        }).catch((err) => res.status(400).send('Please deploy first'));
                }
                return;
            }
            res.status(200).send(JSON.stringify(node.getDeviceCommands(node, req.query.device)));
        }
    });
}
