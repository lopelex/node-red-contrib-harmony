const SSDPClient = require('node-ssdp').Client;
const UPnPClient = require('node-upnp');

module.exports = (timeout) => {

    return new Promise((resolve) => {

        let ssdp = new SSDPClient();

        let devices = [];
 
        ssdp.on('response', (headers, code, rinfo) => {

            if(code == 200) {
                let upnp = new UPnPClient({
                    url: headers.LOCATION
                });
           
                upnp.getDeviceDescription()
                    .then((desc) => {
                        desc.ip = rinfo.address;
                        if(!devices.find(hub => hub.ip === desc.ip)) {
                            devices.push(desc);
                        }
                    })
                    .catch(() => {
                        
                    });  
            }      
        });

        ssdp.search('urn:myharmony-com:device:harmony:1');

        setTimeout(() => {
            resolve(devices);
        }, timeout);
    });
};