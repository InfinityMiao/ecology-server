#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require('../app');
var debug = require('debug')('ecology:server');
var http = require('http');
var process = require('process');
var fs = require('fs');
var connection = require('../lib/connection').connection;

var myDate = new Date();
process.on('uncaughtException', function (e) {
    if(e.code == "PROTOCOL_CONNECTION_LOST"){
        connection.connect();
        console.log("reconnected");
    }
    fs.readFile('./bin/error.txt', function(err1,data){
        fs.writeFile('./bin/error.txt', "\n"+data+myDate.toLocaleString()+":"+e, function(err2){
            if(err1 || err2)
                console.log(err1,err2);
        });
    });
});

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || require('../config.json').port);
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
