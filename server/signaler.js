// signaler.js — Minimal Socket.IO signaling for LAN WebRTC text chat
const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // allow LAN browsers
});

// If a production client build exists, serve it as static files
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const rooms = new Map(); // pin → { offer, answer, clients: Set<socket.id> }

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create-room', ({ pin, offer }) => {
    if (rooms.has(pin)) {
      socket.emit('error', 'PIN already in use');
      return;
    }
    rooms.set(pin, { offer, answer: null, clients: new Set([socket.id]) });
    socket.join(pin);
    socket.emit('room-created', { pin });
    console.log(`Room created: ${pin}`);
  });

  socket.on('join-room', ({ pin }) => {
    if (!rooms.has(pin)) {
      socket.emit('error', 'Room not found');
      return;
    }
    const room = rooms.get(pin);
    room.clients.add(socket.id);
    socket.join(pin);

    // Send offer to new joiner
    socket.emit('offer', room.offer);

    console.log(`Joined room: ${pin} (total: ${room.clients.size})`);
  });

  socket.on('answer', ({ pin, answer }) => {
    if (!rooms.has(pin)) return;
    const room = rooms.get(pin);
    room.answer = answer;

    // Forward answer to creator (first client)
    io.to([...room.clients][0]).emit('answer', answer); // send to creator
  });

  socket.on('candidate', ({ pin, candidate }) => {
    io.to(pin).emit('candidate', candidate);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const [pin, room] of rooms.entries()) {
      if (room.clients.has(socket.id)) {
        room.clients.delete(socket.id);
        if (room.clients.size === 0) rooms.delete(pin);
      }
    }
  });
});

const PORT = 9001; // change if needed
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Signaling server running on http://localhost:${PORT}`);
  console.log('Find your LAN IP (e.g. ipconfig / ifconfig) and share it with joiners');
});