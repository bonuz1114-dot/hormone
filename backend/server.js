const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Object สำหรับเก็บสถานะผู้เล่นที่ทำเสร็จในแต่ละห้อง { roomId: Set(userIds) }
const roomProgress = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // เข้าร่วมห้อง
  socket.on('join_room', ({ roomId, userId }) => {
    socket.join(roomId);
    socket.userId = userId;
    socket.roomId = roomId;
    console.log(`User ${userId} joined room: ${roomId}`);
  });

  // แจ้งเมื่อผู้เล่นตอบข้อสุดท้ายเสร็จ
  socket.on('player_finished', ({ roomId, userId }) => {
    if (!roomProgress[roomId]) {
      roomProgress[roomId] = new Set();
    }
    
    // บันทึก userId ที่ทำเสร็จ
    roomProgress[roomId].add(userId);

    const room = io.sockets.adapter.rooms.get(roomId);
    const totalPlayers = room ? room.size : 1;
    const finishedCount = roomProgress[roomId].size;

    // ส่งสถานะอัปเดตจำนวนคนที่ทำเสร็จให้ทุกคนในห้อง
    io.to(roomId).emit('room_progress_update', {
      finishedCount,
      totalPlayers
    });

    // ถ้าทำเสร็จครบทุกคนแล้ว แจ้งให้ทุกเครื่องเปลี่ยนหน้าพร้อมกัน
    if (finishedCount >= totalPlayers) {
      io.to(roomId).emit('all_players_finished');
      delete roomProgress[roomId]; // รีเซ็ตข้อมูลห้อง
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});