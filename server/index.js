require("dotenv").config();
// ========================================
// SKATESOUND SERVER v2.1
// Node.js + Express + Socket.io + Spotify Auth
// ========================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend estático (quando tiver no mesmo server)
app.use(express.static(path.join(__dirname, '../')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ==================
// SPOTIFY CONFIG
// ==================
// Preencha com suas credenciais do Spotify Developer Dashboard
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || 'SEU_CLIENT_ID';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || 'SEU_CLIENT_SECRET';
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3001/callback';

// ==================
// ROOMS (em memória)
// Para produção, use Redis
// ==================
const rooms = {};

// ==================
// API ROUTES
// ==================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'SkateSound Server',
    version: '2.1.0',
    rooms: Object.keys(rooms).length,
    totalUsers: Object.values(rooms).reduce((sum, r) => sum + r.users.length, 0),
    uptime: Math.floor(process.uptime())
  });
});

// Lista salas ativas (público)
app.get('/api/rooms', (req, res) => {
  const list = Object.entries(rooms).map(([code, room]) => ({
    code,
    users: room.users.length,
    track: room.track ? `${room.track.name} - ${room.track.artist}` : null,
    isPlaying: room.isPlaying
  }));
  res.json(list);
});

// ==================
// SPOTIFY AUTH ROUTES
// ==================

// Step 1: Redirecionar para Spotify login
app.get('/auth/spotify', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state',
    'user-read-currently-playing'
  ].join(' ');

  const url = 'https://accounts.spotify.com/authorize?' +
    `client_id=${SPOTIFY_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${state}` +
    `&show_dialog=true`;

  res.redirect(url);
});

// Step 2: Callback — troca code por tokens
app.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect('/?error=spotify_denied');
  }

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: SPOTIFY_REDIRECT_URI
      })
    });

    const data = await tokenRes.json();

    if (data.error) {
      return res.redirect('/?error=token_failed');
    }

    // Redireciona de volta pro frontend com os tokens na hash
    // (Em produção, use cookies httpOnly ou session)
    res.redirect(`/?spotify_token=${data.access_token}&refresh_token=${data.refresh_token}&expires_in=${data.expires_in}`);

  } catch (err) {
    console.error('Spotify auth error:', err);
    res.redirect('/?error=server_error');
  }
});

// Step 3: Refresh token
app.post('/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token required' });
  }

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      })
    });

    const data = await tokenRes.json();
    res.json(data);

  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'refresh_failed' });
  }
});

// ==================
// SOCKET.IO — REAL-TIME
// ==================
io.on('connection', (socket) => {
  console.log(`🛹 Conectou: ${socket.id}`);
  let currentRoom = null;

  // JOIN ROOM
  socket.on('join-room', ({ roomCode, character, username }) => {
    // Sair da sala anterior se tiver
    if (currentRoom && rooms[currentRoom]) {
      leaveRoom(socket, currentRoom);
    }

    socket.join(roomCode);
    currentRoom = roomCode;

    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        users: [],
        track: null,
        isPlaying: false,
        position: 0,
        lastUpdate: Date.now()
      };
    }

    const user = {
      id: socket.id,
      character: character || 'mc-red',
      username: username || 'Player'
    };
    rooms[roomCode].users.push(user);

    console.log(`🚪 ${user.username} → sala ${roomCode} (${rooms[roomCode].users.length} users)`);

    // Notificar todos
    io.to(roomCode).emit('room-update', {
      users: rooms[roomCode].users,
      track: rooms[roomCode].track,
      isPlaying: rooms[roomCode].isPlaying
    });

    // Mensagem de sistema no chat
    io.to(roomCode).emit('chat-message', {
      username: 'SISTEMA',
      message: `${user.username} entrou no bar! 🛹`,
      system: true,
      timestamp: Date.now()
    });

    // Sync música pro novo user se já tiver tocando
    if (rooms[roomCode].track && rooms[roomCode].isPlaying) {
      const elapsed = Date.now() - rooms[roomCode].lastUpdate;
      socket.emit('sync-play', {
        trackUri: rooms[roomCode].track.uri,
        name: rooms[roomCode].track.name,
        artist: rooms[roomCode].track.artist,
        position: (rooms[roomCode].position || 0) + elapsed
      });
    }
  });

  // PLAY
  socket.on('play-track', ({ roomCode, trackUri, position, name, artist }) => {
    if (!rooms[roomCode]) return;

    rooms[roomCode].track = { uri: trackUri, name, artist };
    rooms[roomCode].isPlaying = true;
    rooms[roomCode].position = position || 0;
    rooms[roomCode].lastUpdate = Date.now();

    console.log(`▶️  ${name} — ${artist} [${roomCode}]`);

    // Broadcast para todos MENOS quem mandou
    socket.to(roomCode).emit('sync-play', { trackUri, position, name, artist });

    // Chat notification
    io.to(roomCode).emit('chat-message', {
      username: 'SISTEMA',
      message: `▶️ ${name} — ${artist}`,
      system: true,
      timestamp: Date.now()
    });
  });

  // PAUSE
  socket.on('pause-track', ({ roomCode }) => {
    if (!rooms[roomCode]) return;
    rooms[roomCode].isPlaying = false;
    console.log(`⏸  Pausou [${roomCode}]`);
    socket.to(roomCode).emit('sync-pause');
  });

  // NEXT
  socket.on('next-track', ({ roomCode, trackUri, name, artist }) => {
    if (!rooms[roomCode]) return;
    rooms[roomCode].track = { uri: trackUri, name, artist };
    rooms[roomCode].position = 0;
    rooms[roomCode].lastUpdate = Date.now();
    console.log(`⏭  ${name} [${roomCode}]`);
    socket.to(roomCode).emit('sync-play', { trackUri, position: 0, name, artist });
  });

  // SEEK (sync posição)
  socket.on('seek', ({ roomCode, position }) => {
    if (!rooms[roomCode]) return;
    rooms[roomCode].position = position;
    rooms[roomCode].lastUpdate = Date.now();
    socket.to(roomCode).emit('sync-seek', { position });
  });

  // CHAT
  socket.on('chat-message', ({ roomCode, message, username }) => {
    if (!message || !message.trim()) return;
    io.to(roomCode).emit('chat-message', {
      id: socket.id,
      username: username || 'Player',
      message: message.trim(),
      system: false,
      timestamp: Date.now()
    });
  });

  // DISCONNECT
  socket.on('disconnect', () => {
    console.log(`👋 Desconectou: ${socket.id}`);
    if (currentRoom) {
      leaveRoom(socket, currentRoom);
    }
  });
});

function leaveRoom(socket, roomCode) {
  if (!rooms[roomCode]) return;

  const user = rooms[roomCode].users.find(u => u.id === socket.id);
  rooms[roomCode].users = rooms[roomCode].users.filter(u => u.id !== socket.id);

  if (rooms[roomCode].users.length === 0) {
    delete rooms[roomCode];
    console.log(`🗑  Sala ${roomCode} removida`);
  } else {
    io.to(roomCode).emit('room-update', {
      users: rooms[roomCode].users,
      track: rooms[roomCode].track,
      isPlaying: rooms[roomCode].isPlaying
    });
    if (user) {
      io.to(roomCode).emit('chat-message', {
        username: 'SISTEMA',
        message: `${user.username} saiu do bar 👋`,
        system: true,
        timestamp: Date.now()
      });
    }
  }
  socket.leave(roomCode);
}

// ==================
// CLEANUP — remover salas inativas (cada 5 min)
// ==================
setInterval(() => {
  const now = Date.now();
  for (const code in rooms) {
    if (rooms[code].users.length === 0) {
      delete rooms[code];
    }
  }
}, 5 * 60 * 1000);

// ==================
// START
// ==================
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════╗
║  🛹  SKATESOUND SERVER v2.1             ║
║  http://localhost:${PORT}                    ║
║                                          ║
║  Spotify Auth:  /auth/spotify            ║
║  Callback:      /callback                ║
║  API Health:    /api/health              ║
║  API Rooms:     /api/rooms               ║
║                                          ║
║  Frontend:      http://localhost:${PORT}     ║
╚══════════════════════════════════════════╝
  `);
});