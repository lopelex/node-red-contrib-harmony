const EventEmitter = require('events');
const Harmony = require('harmony-websocket');
const isPortReachable = require('is-port-reachable');

DEFAULT_HUB_PORT = 8088;


class Hub extends EventEmitter {

    constructor(ip) {

        super();
        this.ip = ip;
        this.config = false;
        this.harmony = false;
        this.activityId = false;
        this.activityStatus = false;
    }

    _connect() {

        if (!this.harmony) {
            this.harmony = new Harmony();
            this.harmony.on('open', () => this.emit('open'));
            this.harmony.on('close', () => this.emit('close'));
            this.harmony.on('stateDigest', digest => this._onStateDigest(digest));
        }

        return isPortReachable(DEFAULT_HUB_PORT, {
                host: this.ip,
                timeout: 2000
            })
            .then((result) => {
                if(!result) {
                    throw new Error('Hub not reachable');
                }
            })
            .then(() => this.harmony.connect(this.ip))
            .then(() => this.harmony.getCurrentActivity())
            .then(activityId => {
                this.activityId = activityId;
                this.activityStatus = 4;
            })
            .then(() => this.harmony.getConfig())
            .then(config => {
                this.connected = true;
                this.config = config;
            })
            .then(() => this.config);
    }

    _onStateDigest(digest) {

        try {
            this.activityId = digest.data.activityId;
            this.activityStatus = digest.data.activityStatus;
            this.emit('stateDigest', {
                activityId: this.activityId,
                activityStatus: this.activityStatus
            });
        } catch (err) {}
    }

    isConnected() {

        try {
            return this.harmony._client._ws._connection.connected;
        } catch (e) {
            return false;
        }
    }

    reloadConfig() {

        this.config = false;
        if (!this.isConnected()) {
            return this._connect();
        }
        return this.harmony.getConfig()
            .then(config => {
                this.config = config;
            })
            .then(() => this.config);
    }

    getConfig() {

        if (this.config) {
            return new Promise(resolve => resolve(this.config));
        } else {
            return this._connect();
        }
    }

    getActivities() {

        return this.getConfig()
            .then(config => {
                return config.data.activity
                    .filter(activity => {
                        let commands = activity.controlGroup
                            .map(group => group.function)
                            .reduce((prev, curr) => prev.concat(curr), [])
                            .map(cmd => {
                                return {
                                    action: cmd.action,
                                    label: cmd.label
                                }
                            });
                        activity.commands = commands;
                        return true;
                    }).map(activity => {
                        return {
                            id: activity.id,
                            label: activity.label,
                            commands: activity.commands,
                            type: 'activity'
                        }
                    });
            });
    }

    getActivityCommands(activityId) {

        return this.getConfig()
            .then(config => {
                let activity = config.data.activity
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
                    }, [])
                    .map(cmd => {
                        return {
                            action: cmd.action,
                            label: cmd.label
                        }
                    });
            });
    }

    getDevices() {

        return this.getConfig()
            .then(config => {
                return config.data.device
                    .filter(dev => {
                        let commands = dev.controlGroup
                            .map(group => group.function)
                            .reduce((prev, curr) => prev.concat(curr), [])
                            .map(cmd => {
                                return {
                                    action: cmd.action,
                                    label: cmd.label
                                }
                            });
                        dev.commands = commands;
                        return true;
                    }).map(dev => {
                        return {
                            id: dev.id,
                            label: dev.label,
                            commands: dev.commands,
                            type: 'device'
                        }
                    });
            });
    }

    getDeviceCommands(deviceId) {

        return this.getConfig()
            .then(config => {
                let device = config.data.device
                    .filter(dev => dev.id === deviceId)
                    .pop();
                return device.controlGroup
                    .map(group => group.function)
                    .reduce((prev, curr) => prev.concat(curr), [])
                    .map(cmd => {
                        return {
                            action: JSON.parse(cmd.action),
                            label: cmd.label
                        }
                    });
            });
    }

    startActivity(activityId) {


        let promise = () => {
            return this.harmony.startActivity(activityId);
        }
        if (!this.isConnected()) {
            return this._connect()
                .then(() => promise());
        }
        return promise();
    }

    getCurrentActivity() {

        let promise = () => {
            return this.getCurrentActivity()
                .then(activityId => {
                    this.activityId = activityId;
                    this.activityStatus = 4;
                    this.emit('stateDigest', {
                        activityId: this.activityId,
                        activityStatus: this.activityStatus
                    });
                })
                .then(() => this.activityId);
        }
        if (!this.isConnected()) {
            return this._connect()
                .then(() => promise());
        }
        return promise();
    }

    getAction(id, command) {

        if (!id || !command) {
            return false;
        }
        return JSON.stringify({
            command: command.replace(' ', ''),
            type: 'IRCommand',
            deviceId: id,
        });
    }

    sendCommand(action, hold, repeat, delay) {

        let promise = Promise.resolve();

        for (let i = 0; i < repeat; i++) {
            if (hold > 0) {
                promise = promise
                    .then(() => this.harmony.sendCommandWithDelay(action, hold))
                    .then(response => new Promise(resolve => setTimeout(() => resolve(response), delay)))
                    .catch(err => reject(err));
            } else {
                promise = promise
                    .then(() => this.harmony.sendCommand(action))
                    .then(response => new Promise(resolve => setTimeout(() => resolve(response), delay)))
                    .catch(err => reject(err));
            }
        }

        if (!this.isConnected()) {
            return this._connect()
                .then(() => promise);
        }
        return promise;
    }

    end() {

        if (this.harmony) {
            return this.harmony.end();
        }
    }
}

module.exports = Hub;
