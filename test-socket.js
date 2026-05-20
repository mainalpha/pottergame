const io = require('socket.io-client');
const socket = io('http://localhost:5000'); // Check server port from .env, wait PORT=5000

socket.on('connect', () => {
  console.log('Connected!');
  socket.emit('play_vs_bot', { userId: 1 });
});

socket.on('error', (err) => {
  console.log('Socket error:', err);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
  process.exit();
});
