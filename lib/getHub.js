const Hub = require('./hub');

module.exports = (RED, ip) => {

    if(!global.hwsHubs) {
        global.hwsHubs = new Map();
    }

    let hub = global.hwsHubs.get(ip);
    if (!hub) {
        hub = new Hub(ip);
        global.hwsHubs.set(ip, hub);
        hub.on('open', () => RED.log.info(`HarmonyWS open (${ip})`));
        hub.on('close', () => RED.log.info(`HarmonyWS close (${ip})`));
    }
    return hub;
};