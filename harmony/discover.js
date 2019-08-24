const SSDPClient = require('node-ssdp').Client;
const UPnPClient = require('node-upnp');

module.exports = (timeout) => {

    return new Promise((resolve/*, reject*/) => {

        let ssdp = new SSDPClient();

        let devices = [];

        ssdp.on('response', function inResponse(headers, code, rinfo) {

            if(code == 200) {
                let upnp = new UPnPClient({
                    url: headers.LOCATION
                });
           
                upnp.getDeviceDescription()
                    .then(function(desc) {
                        desc.ip = rinfo.address;
                        devices.push(desc);                
                    });  
            }      
        });

        ssdp.search('urn:myharmony-com:device:harmony:1');

        setTimeout(() => {
            resolve(devices);
        }, timeout);
    });
};