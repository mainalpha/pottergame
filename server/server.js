/**
 * Potter's Duel — Main Server
 */

'use strict';

const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const db = require('./db');
const GameEngine = require('./game-logic');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 25000,
  pingTimeout: 20000
});

const gameEngine = new GameEngine();

app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, '..', 'client'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true
}));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
  etag: true
}));

app.get('/api/health', async (_req, res) => {
  try {
    await db.ping();
    res.json({ ok: true, db: 'connected', uptime: process.uptime() });
  } catch {
    res.status(503).json({ ok: false, db: 'disconnected' });
  }
});

const authRoutes = require('./auth-routes');
const profileRoutes = require('./profile-routes');
const cardsRoutes = require('./cards-routes');
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/cards', cardsRoutes);

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('leave_queue', (data) => {
    gameEngine.leaveQueue(socket.id, data?.userId);
  });

  socket.on('join_queue', async (data) => {
    try {
      const { userId, mode } = data || {};
      if (!userId || !mode) {
        return socket.emit('error', { message: 'userId and mode are required.' });
      }
      socket.emit('queue_joined', { message: 'Searching for opponent...' });
      await gameEngine.joinQueue(socket, userId, mode, io);
    } catch (error) {
      console.error('join_queue error:', error);
      socket.emit('error', { message: 'Failed to join queue.' });
    }
  });

  socket.on('reconnect_game', async (data) => {
    try {
      const { userId } = data || {};
      if (userId) {
        await gameEngine.handleReconnect(socket, userId, io);
      }
    } catch (error) {
      console.error('reconnect_game error:', error);
    }
  });

  socket.on('play_vs_bot', async (data) => {
    try {
      const { userId } = data || {};
      if (!userId) {
        return socket.emit('error', { message: 'userId is required.' });
      }
      await gameEngine.joinBotMatch(socket, userId, io);
    } catch (error) {
      console.error('play_vs_bot error:', error);
      socket.emit('error', { message: 'Failed to start bot match.' });
    }
  });

  socket.on('pick_faction', async (data) => {
    try {
      const { userId, faction } = data || {};
      if (!userId || !faction) {
        return socket.emit('error', { message: 'userId and faction are required.' });
      }
      await gameEngine.handlePickFaction(userId, faction, io);
    } catch (error) {
      console.error('pick_faction error:', error);
      socket.emit('error', { message: 'Failed to pick faction.' });
    }
  });

  socket.on('cast_spell', async (data) => {
    try {
      const { userId, cardId } = data || {};
      const room = gameEngine.findRoomByPlayer(userId);

      if (!room) {
        return socket.emit('error', { message: 'You are not in an active game.' });
      }

      await gameEngine.handleCastSpell(room, userId, cardId, io);
    } catch (error) {
      console.error('cast_spell error:', error);
      socket.emit('error', { message: 'Failed to cast spell.' });
    }
  });

  socket.on('surrender', async (data) => {
    try {
      const { userId } = data || {};
      if (userId) {
        await gameEngine.handleSurrender(userId, io);
      }
    } catch (error) {
      console.error('surrender error:', error);
      socket.emit('error', { message: 'Failed to surrender.' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    gameEngine.removeFromQueue(socket.id);
    gameEngine.handleDisconnect(socket.id, io);
  });
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await db.ping();
    console.log('Database connected');
  } catch (err) {
    console.warn('Database unavailable — auth and cooldowns disabled:', err.message);
  }

  server.listen(PORT, () => {
    console.log(`Magic happens on port ${PORT}`);
  });
}

function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  io.close();
  server.close(() => {
    db.pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
