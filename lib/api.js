const discover = require('./discover');
const getHub = require('./getHub');

module.exports = (RED) => {

    RED.httpAdmin.get('/hws/discover', (req, res) => {

        discover(3000).then(devices => { 
            res.end(JSON.stringify(devices));
        });
    });

    RED.httpAdmin.get('/hws/config', (req, res) => {

        if (!req.query.ip) {
            res.status(400).send('Missing argument');
        } else {
            let hub = getHub(RED, req.query.ip);
            if(hub) {
                hub.reloadConfig()
                    .then(config => res.status(200).send(JSON.stringify(config)))
                    .catch(err => res.status(400).send('Error: ' + err));
            }
            else {
                res.status(400).send('Error');
            }
        }
    });

    RED.httpAdmin.get('/hws/activities', (req, res) => {

        if (!req.query.ip) {
            res.status(400).send('Missing argument');
        } else {
            let hub = getHub(RED, req.query.ip);
            if(hub) {
                hub.getActivities()
                    .then(activities => res.status(200).send(JSON.stringify(activities)))
                    .catch(err => res.status(400).send('Error: ' + err));
            }
            else {
                res.status(400).send('Error');
            }
        }
    });

    RED.httpAdmin.get('/hws/activitiesAndDevices', (req, res) => {

        if (!req.query.ip) {
            res.status(400).send('Missing argument');
        } else {
            let hub = getHub(RED, req.query.ip);
            if(hub) {
                let list = [];
                hub.getActivities()
                    .then(activities => list = list.concat(activities))
                    .then(() => hub.getDevices())
                    .then(devices => list = list.concat(devices))
                    .then(() => res.status(200).send(JSON.stringify(list)))
                    .catch(err => res.status(400).send('Error: ' + err));
            }
            else {
                res.status(400).send('Error');
            }
        }
    });

    RED.httpAdmin.get('/hws/automation', (req, res) => {

        if (!req.query.ip) {
            res.status(400).send('Missing argument');
        } else {
            let hub = getHub(RED, req.query.ip);
            if(hub) {
                hub.reloadAutomationCommands()
                    .then(automationState => res.status(200).send(JSON.stringify(automationState.data)))
                    .catch(err => res.status(400).send('Error: ' + err));                
            }
            else {
                res.status(400).send('Error');
            }
        }
    });
};