const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const rooms = {};

// API
app.get('/api/health', (req, res) => res.json({ status: 'ok', rooms: Object.keys(rooms).length }));
app.get('/api/rooms', (req, res) => {
  res.json(Object.entries(rooms).map(([code, r]) => ({
    code, users: r.users.length, track: r.track ? r.track.name : null, isPlaying: r.isPlaying
  })));
});

// SOCKET.IO
io.on('connection', (socket) => {
  console.log('🛹 Conectou:', socket.id);
  let currentRoom = null;

  socket.on('join-room', ({ roomCode, character, username }) => {
    if (currentRoom) leaveRoom(socket, currentRoom);
    socket.join(roomCode);
    currentRoom = roomCode;
    if (!rooms[roomCode]) rooms[roomCode] = { users: [], track: null, isPlaying: false, position: 0, lastUpdate: Date.now(), trackIndex: 0 };
    const user = { id: socket.id, character: character || 'mc-red', username: username || 'Player' };
    rooms[roomCode].users.push(user);
    console.log(`🚪 ${user.username} → ${roomCode} (${rooms[roomCode].users.length} users)`);
    io.to(roomCode).emit('room-update', { users: rooms[roomCode].users, track: rooms[roomCode].track, isPlaying: rooms[roomCode].isPlaying, trackIndex: rooms[roomCode].trackIndex });
    io.to(roomCode).emit('chat-message', { username: 'SISTEMA', message: `${user.username} entrou na sala! 🛹`, system: true, timestamp: Date.now() });
    if (rooms[roomCode].track && rooms[roomCode].isPlaying) {
      const elapsed = (Date.now() - rooms[roomCode].lastUpdate) / 1000;
      socket.emit('sync-play', { trackIndex: rooms[roomCode].trackIndex, position: (rooms[roomCode].position || 0) + elapsed, name: rooms[roomCode].track.name, artist: rooms[roomCode].track.artist });
    }
  });

  socket.on('play-track', ({ roomCode, trackIndex, name, artist }) => {
    if (!rooms[roomCode]) return;
    rooms[roomCode].track = { name, artist };
    rooms[roomCode].isPlaying = true;
    rooms[roomCode].position = 0;
    rooms[roomCode].trackIndex = trackIndex;
    rooms[roomCode].lastUpdate = Date.now();
    console.log(`▶️  ${name} — ${artist} [${roomCode}]`);
    socket.to(roomCode).emit('sync-play', { trackIndex, position: 0, name, artist });
    io.to(roomCode).emit('chat-message', { username: 'SISTEMA', message: `▶️ ${name} — ${artist}`, system: true, timestamp: Date.now() });
  });

  socket.on('pause-track', ({ roomCode }) => {
    if (!rooms[roomCode]) return;
    rooms[roomCode].isPlaying = false;
    socket.to(roomCode).emit('sync-pause');
  });

  socket.on('resume-track', ({ roomCode, position }) => {
    if (!rooms[roomCode]) return;
    rooms[roomCode].isPlaying = true;
    rooms[roomCode].position = position;
    rooms[roomCode].lastUpdate = Date.now();
    socket.to(roomCode).emit('sync-resume', { position });
  });

  socket.on('next-track', ({ roomCode, trackIndex, name, artist }) => {
    if (!rooms[roomCode]) return;
    rooms[roomCode].track = { name, artist };
    rooms[roomCode].trackIndex = trackIndex;
    rooms[roomCode].position = 0;
    rooms[roomCode].lastUpdate = Date.now();
    rooms[roomCode].isPlaying = true;
    socket.to(roomCode).emit('sync-play', { trackIndex, position: 0, name, artist });
    io.to(roomCode).emit('chat-message', { username: 'SISTEMA', message: `⏭ ${name} — ${artist}`, system: true, timestamp: Date.now() });
  });

  socket.on('chat-message', ({ roomCode, message, username }) => {
    if (!message || !message.trim()) return;
    io.to(roomCode).emit('chat-message', { id: socket.id, username: username || 'Player', message: message.trim(), system: false, timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    console.log(`👋 Saiu: ${socket.id}`);
    if (currentRoom) leaveRoom(socket, currentRoom);
  });
});

function leaveRoom(socket, roomCode) {
  if (!rooms[roomCode]) return;
  const user = rooms[roomCode].users.find(u => u.id === socket.id);
  rooms[roomCode].users = rooms[roomCode].users.filter(u => u.id !== socket.id);
  if (rooms[roomCode].users.length === 0) { delete rooms[roomCode]; }
  else {
    io.to(roomCode).emit('room-update', { users: rooms[roomCode].users, track: rooms[roomCode].track, isPlaying: rooms[roomCode].isPlaying });
    if (user) io.to(roomCode).emit('chat-message', { username: 'SISTEMA', message: `${user.username} saiu 👋`, system: true, timestamp: Date.now() });
  }
  socket.leave(roomCode);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🛹 SKATESOUND SERVER v3.0`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Sem Spotify — beats royalty-free!`);
  console.log(`   Pronto pra compartilhar 🔥\n`);
});