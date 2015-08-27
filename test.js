DEVICE = process.env.DEVICE || "/dev/tty.usbserial-DA01I03H"


var util = require('util');
var SerialPort = require('serialport').SerialPort;
var xbee_api = require('xbee-api');
var C = xbee_api.constants;
var xbeeAPI = new xbee_api.XBeeAPI({
    api_mode: 2
});
var serialport = new SerialPort(DEVICE, {
    baudrate: 9600,
    parser: xbeeAPI.rawParser()
});
serialport.on("open", function () {
    var frame_obj = {
        type: 0x10,
        id: 0x4D2,
        broadcastRadius: 0xFFFF,
        options: 0x00,
        data: "3"
    };
    serialport.write(xbeeAPI.buildFrame(frame_obj));
    console.log('Sent to serial port.');
});
serialport.on('data', function (data) {
    console.log('data received: ' + data);
});
// All frames parsed by the XBee will be emitted here
xbeeAPI.on("frame_object", function (frame) {
    console.log(">>", frame);
});