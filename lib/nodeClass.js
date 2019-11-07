
class NodeClass {

    constructor(config, RED) {

        RED.nodes.createNode(this, config);

        this.config = config;
        this.server = RED.nodes.getNode(this.config.server);

        if (this.server) {
            this.init();
        }
    }

    init(){

    }
}

module.exports = NodeClass;
