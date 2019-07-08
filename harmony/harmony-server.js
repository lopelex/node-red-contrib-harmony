const HarmonyHubDiscover = require('@harmonyhub/discover').Explorer;
const Hub = require('./hub');
const events = require('events');
const netstat = require('node-netstat');
const util = require('util');

const debug = false;

module.exports = function(RED) {

    RED.harmonyHubs = new Map();

    function HarmonyServerNode(config) {
        var node = this;
        RED.nodes.createNode(this, config);

        node.ip = config.ip;
        node.events = new events.EventEmitter();
        node.harmonyHubs = RED.harmonyHubs;

        node.hub = getHub(config.ip);

        node.reconnect = () => {
            if (node.hub && typeof node.hub.isConnected !== 'undefined') {
                if (!node.hub.isConnected()) {
                    node.hub.reloadConfig()
                        .catch(err => {
                            if (debug) console.error(err.message);
                        });
                }
            }
        }

        node.hub.on('stateDigest', digest => node.events.emit('stateDigest', digest));
        node.hub.on('close', node.reconnect);

        setInterval(node.reconnect, 60000);

        node.hub.getConfig()
            .catch(err => {
                if (debug) console.error(err);
            });

        RED.events.on('nodes-started', function() {
            node.emit('stateDigest', {
                activityId: node.hub.activityId,
                activityStatus: node.hub.activityStatus
            });
        });

        this.on('close', () => {
            if (node.hub && typeof node.hub.end !== 'undefined') {
                node.hub.removeAllListeners('open');
                node.hub.removeAllListeners('stateDigest');
                node.hub.removeAllListeners('close');
                clearInterval(node.reconnect);
                node.hub.end()
                    .catch(err => {
                        if (debug) console.error(err);
                    });
                delete(node.hub);
            }
        });
    }
    RED.nodes.registerType('harmonyws-server', HarmonyServerNode);

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

    function getHub(ip) {

        var hub = RED.harmonyHubs.get(ip);
        if (!hub) {
            hub = new Hub(ip);
            RED.harmonyHubs.set(ip, hub);
            RED.log.info('HarmonyWS create (' + ip + ')');
            hub.on('open', () => RED.log.info('HarmonyWS open (' + ip + ')'));
            hub.on('close', () => RED.log.info('HarmonyWS close (' + ip + ')'));
        }
        return hub;
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

        if (!req.query.ip) {
            res.status(400).send('Missing argument');
        } else {
            var hub = getHub(req.query.ip);
            hub.reloadConfig()
                .then(config => res.status(200).send(JSON.stringify(config)))
                .catch(err => res.status(400).send('Error getConfig: ' + err));
        }
    });

    RED.httpAdmin.get('/harmonyws/activities', (req, res, next) => {

        if (!req.query.ip) {
            res.status(400).send('Missing argument');
        } else {
            var hub = getHub(req.query.ip);
            hub.getActivities()
                .then(activities => res.status(200).send(JSON.stringify(activities)))
                .catch(err => res.status(400).send('Error getActivities: ' + err));
        }
    });

    RED.httpAdmin.get('/harmonyws/activityCommands', (req, res, next) => {

        if (!req.query.ip || !req.query.activity) {
            res.status(400).send('Missing argument');
        } else {
            var hub = getHub(req.query.ip);
            hub.getActivityCommands(req.query.activity)
                .then(commands => res.status(200).send(JSON.stringify(commands)))
                .catch(err => res.status(400).send('Error getActivityCommands: ' + err));
        }
    });

    RED.httpAdmin.get('/harmonyws/devices', (req, res, next) => {

        if (!req.query.ip) {
            res.status(400).send('Missing argument');
        } else {
            var hub = getHub(req.query.ip);
            hub.getDevices()
                .then(devices => res.status(200).send(JSON.stringify(devices)))
                .catch(err => res.status(400).send('Error getDevices: ' + err));
        }
    });

    RED.httpAdmin.get('/harmonyws/deviceCommands', (req, res, next) => {

        if (!req.query.ip || !req.query.device) {
            res.status(400).send('Missing argument');
        } else {
            var hub = getHub(req.query.ip);
            hub.getDeviceCommands(req.query.device)
                .then(commands => res.status(200).send(JSON.stringify(commands)))
                .catch(err => res.status(400).send('Error getDevices: ' + err));
        }
    });

    RED.httpAdmin.get('/harmonyws/activitiesAndDevices', (req, res, next) => {

        if (!req.query.ip) {
            res.status(400).send('Missing argument');
        } else {
            var hub = getHub(req.query.ip);
            var list = [];
            hub.getActivities()
                .then(activities => list = activities)
                .then(() => hub.getDevices())
                .then(devices => list = list.concat(devices))
                .then(() => res.status(200).send(JSON.stringify(list)))
                .catch(err => res.status(400).send('Error getDevices: ' + err));
        }
    });
}
