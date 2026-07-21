import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();

// 💡 1. ปรับ CORS ให้รองรับ URL ของ Frontend และทำงานบนระบบจริง
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST"]
}));

const server = http.createServer(app);

// 💡 2. ปรับ CORS Socket.io ให้เปิดรับทุก Origin ชัดเจน
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 💾 โครงสร้างข้อมูลสำหรับเก็บสถานะห้องเกมใน Memory
const rooms = {}; 

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. เหตุการณ์: สร้างห้องใหม่ (โดย Host)
  socket.on('create_room', ({ playerName }) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    rooms[roomCode] = {
      id: roomCode,
      players: [
        {
          id: socket.id,
          name: playerName,
          score: 0,
          timeUsed: 0,
          isHost: true,
          submitted: false
        }
      ]
    };

    socket.join(roomCode);
    socket.emit('room_created', { roomCode });
    io.to(roomCode).emit('update_players', rooms[roomCode].players);
  });

  // 2. เหตุการณ์: เข้าร่วมห้อง (โดยผู้เล่นคนอื่น)
  socket.on('join_room', ({ roomCode, playerName }, callback) => {
    const code = roomCode.toUpperCase();
    const room = rooms[code];

    if (!room) {
      return callback({ success: false, message: 'ไม่พบรหัสห้องนี้ กรุณาตรวจสอบอีกครั้ง' });
    }

    const newPlayer = {
      id: socket.id,
      name: playerName,
      score: 0,
      timeUsed: 0,
      isHost: false,
      submitted: false
    };

    room.players.push(newPlayer);
    socket.join(code);

    callback({ success: true });
    io.to(code).emit('update_players', room.players);
  });

  // 3. เหตุการณ์: โฮสต์กดเริ่มเกม (ส่งต่อชุดคำถามที่สับเปลี่ยนแล้ว)
  socket.on('start_game', ({ roomCode, shuffledQuestionsList }) => {
    const code = roomCode.toUpperCase();
    const room = rooms[code];

    if (room) {
      room.players.forEach(p => {
        p.score = 0;
        p.timeUsed = 0;
        p.submitted = false;
      });

      io.to(code).emit('update_players', room.players);
      io.to(code).emit('game_started_by_host', { shuffledQuestionsList });
    }
  });

  // 4. เหตุการณ์: ผู้เล่นส่งผลคะแนนเมื่อตอบเสร็จ เพื่อคำนวณ คนแพ้/คนชนะ
  socket.on('submit_results', ({ roomCode, score, timeUsed }) => {
    const code = roomCode.toUpperCase();
    const room = rooms[code];

    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.score = score;
        player.timeUsed = timeUsed;
        player.submitted = true;
      }

      io.to(code).emit('update_players', room.players);

      const allSubmitted = room.players.every(p => p.submitted === true);

      if (allSubmitted) {
        // จัดอันดับ: คะแนนมาก่อน -> ถ้าคะแนนเท่ากัน ใครเวลาน้อยกว่าชนะ
        room.players.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score; 
          }
          return a.timeUsed - b.timeUsed; 
        });

        io.to(code).emit('game_over', room.players);
      }
    }
  });

  // 5. เหตุการณ์: ผู้เล่นหรือโฮสต์กดปิดหน้าเว็บ/เน็ตหลุด
  socket.on('disconnect', () => {
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);

      if (playerIndex !== -1) {
        const leavingPlayer = room.players[playerIndex];
        room.players.splice(playerIndex, 1);

        if (room.players.length === 0) {
          delete rooms[roomCode];
        } else if (leavingPlayer.isHost) {
          io.to(roomCode).emit('host_disconnected', { message: 'โฮสต์ได้ออกจากห้องเกมแล้ว ระบบกำลังพาท่านกลับสู่หน้าหลัก' });
          delete rooms[roomCode];
        } else {
          io.to(roomCode).emit('update_players', room.players);
        }
        break; 
      }
    }
  });
});

// 💡 2. เปลี่ยนให้ใช้พอร์ตจาก Environment Variable ที่ Cloud กำหนดมาให้
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});