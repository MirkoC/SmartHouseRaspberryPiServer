// Start the app with: "sudo DEVICE=/dev/ttyUSB0 node smart_house_rpi_server.js"

HOST = process.env.SERVER_HOST || '127.0.0.1';
PORT = process.env.SERVER_PORT || 8080;
DEVICE = process.env.DEVICE || "/dev/tty.usbserial-DA01I03H"
RAILS_SERVER = 'localhost';
RAILS_PORT = '3000';

var url = require('url'),
    http = require('http'),
    serialport = require("serialport"),
    SerialPort = serialport.SerialPort;
    querystring = require('qs')

var util = require('util');
var xbee_api = require('xbee-api');
var C = xbee_api.constants;
var xbeeAPI = new xbee_api.XBeeAPI({
    api_mode: 2
});

DOOR = 0;
TEMP = 0;
LIGHT = 0;

var patterns = {
    messages: {
        door: /D([0-9])/,
        temp: /T([0-9]+)/,
        light: /L([0-9]+)/
    },
    requests: {
        door: /\/door.*/,
        temp: /\/heat.*/,
        light: /\/light.*/
    }
}

var testPatterns = {
    messages: {
        cao: /cao/,
        hello: /hello/
    }
}

http.createServer(httpReqHandlerFn).listen(PORT, HOST);
console.log('Server running at http://'+HOST+':'+PORT+'/');

var port = new SerialPort(DEVICE, {
    baudrate: 9600,
    parser: xbeeAPI.rawParser()
});

port.on("open", function () {
    console.log('Serial port ' + DEVICE + 'is open');
    port.on('data', xbeeMsgHandlerFn)
});

// All frames parsed by the XBee will be emitted here
xbeeAPI.on("frame_object", xbeeMsgHandlerFn); /*function (frame) {
    console.log(">>", frame);
});*/

function httpReqHandlerFn(request, response){
    setHeaders(response);


    if (request.method == 'GET') {
        var value = readValue(request, response);
        console.log('FETCHING VALUE: ' + value);

        response.end(value.toString() + '\r\n');

    } else if (request.method == 'POST') {
        var command = constructCommand(request);
        console.log('WRITING COMMAND: "' + (command.data) + '"');

        port.write(xbeeAPI.buildFrame(command));
        /*port.write(command, function(err, results) {

            if (err) {
                response.statusCode = 400;
                response.end('Writing failed!' + '\r\n');
            } else if (results) {
                response.end('Command "' + stringEscape(command) + '" sent.' + '\r\n');
            }
        });*/
    }
}


function constructCommand(request, response) {
    /*var parsed = url.parse(request.url, true),
        value = parsed.query.value;*/
    var value = request.url.split("/")[1].split("=")[1];
    var frame_obj = {
        type: 0x10,
        id: 0x4D2,
        broadcastRadius: 0xFFFF,
        options: 0x00,
        data: value
    };
    if (m = request.url.match(patterns.requests.temp)) {
        return frame_obj;
    } else if (m = request.url.match(patterns.requests.light)) {
        return 'L'+value+'\n';
    } else if (m = request.url.match(patterns.requests.door)) {
        return 'D'+value+'\n';
    }
}

function readValue(request, response) {
    if (m = request.url.match(patterns.requests.temp)) {
        return TEMP;
    } else if (m = request.url.match(patterns.requests.light)) {
        return LIGHT;
    } else if (m = request.url.match(patterns.requests.door)) {
        return DOOR;
    } else {
        response.statusCode = 400;
        return -1
    }
}



function setHeaders(response) {
    response.setHeader("Content-Type", "text/plain");
}

function stringEscape(str) {
    return str.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}



function xbeeMsgHandlerFn(data_raw) {

    if (data_raw.data == undefined)
        return;
    data = data_raw.data.toString();


    splitted_data = data.split(" ")
    console.log(splitted_data[1]);
    console.log(splitted_data[2]);


    if (splitted_data[1] = "T") {
        var post_path = "/temperatures";
    }
    else if (splitted_data[1] = "D") {
        post_path = "/doors";
    }

    var postData = JSON.stringify({
        'value' : splitted_data[4],
        'room_id' : '1'
    });



    var options = {
        hostname: RAILS_SERVER,
        port: RAILS_PORT,
        path: post_path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': postData.length
        }
    };



    var req = http.request(options, function(res) {
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
        });
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });


    req.write(postData);
    req.end();

}