require('../lib/object-watch');

module.exports = (RED) => {

    class Node {
        constructor(config) {

            let node = this;

            RED.nodes.createNode(node, config);

            this.config = config;

            let context = node.context();
            let contextKey = RED.util.parseContextStore(node.config.contextKey);

            let global = new Proxy(context.global, {
                apply(target, thisArg, args) {
                    console.log('apply:');
                    console.log(target);
                    console.log(thisArg);
                    console.log(args);
                    Reflect.apply(target, thisArg, args);
                },
                get(target, property, receiver) {
                    console.log('get:');
                    console.log(target);
                    console.log(property);
                    console.log(receiver);
                    return Reflect.get(target, property, receiver);
                },
                set(target, property, value) {
                    console.log('set:');
                    console.log(target);
                    console.log(property);
                    console.log(value);
                    return Reflect.set(target, property, value);
                }
            });

            node.on('input', () => {
                global.set('test', Math.random());
            });

        }
    }

    RED.nodes.registerType('hws-test', Node);
};