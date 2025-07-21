const { Chess } = require('chess.js');

const games = {}; // roomID -> Chess instance

function registerChessSockets(io, socket) {
  socket.on('joinGame', (roomID) => {
    socket.join(roomID);

    if (!games[roomID]) {
      games[roomID] = new Chess();
    }

    const game = games[roomID];
    socket.emit('gameState', game.fen());
    socket.to(roomID).emit('playerJoined', socket.id);
  });

  socket.on('makeMove', ({ roomID, from, to, promotion }) => {
    const game = games[roomID];
    if (!game) return;

    try {
      const moveObj = { from, to };
      if (promotion) {
        moveObj.promotion = promotion;
      }

      const move = game.move(moveObj);
      if (!move) {
        socket.emit('invalidMove', 'Invalid move');
        return;
      }

      const newFen = game.fen();
      io.to(roomID).emit('gameState', newFen);
    } catch (err) {
      console.error(`Move error in room ${roomID}:`, err);
      socket.emit('invalidMove', err.message || 'Invalid move');
    }
  });

  socket.on('resetGame', (roomID) => {
    if (!games[roomID]) {
      games[roomID] = new Chess();
    } else {
      games[roomID].reset();
    }

    const game = games[roomID];
    const fen = game.fen();
    io.to(roomID).emit('resetGame', fen);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
}

module.exports = registerChessSockets;
