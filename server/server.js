const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const registerChessSockets = require('./sockets/chessSockets');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }  // dev only
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  registerChessSockets(io, socket);
});

const PORT = 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
