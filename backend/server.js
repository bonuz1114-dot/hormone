import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('create_room', ({ playerName }) => {
    const roomCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    rooms[roomCode] = {
      id: roomCode,
      players: [
        {
          id: socket.id,
          name: playerName,
          score: 0,
          timeUsed: 0,
          maxStreak: 0,
          isHost: true,
          submitted: false
        }
      ]
    };

    socket.join(roomCode);

    socket.emit('room_created', {
      roomCode
    });

    io.to(roomCode).emit(
      'update_players',
      rooms[roomCode].players
    );
  });

  socket.on(
    'join_room',
    ({ roomCode, playerName }, callback) => {
      const code = roomCode.toUpperCase();
      const room = rooms[code];

      if (!room) {
        return callback({
          success: false,
          message: 'ไม่พบรหัสห้องนี้ กรุณาตรวจสอบอีกครั้ง'
        });
      }

      if (room.players.length >= 20) {
        return callback({
          success: false,
          message: 'ห้องนี้มีผู้เล่นเต็มแล้ว'
        });
      }

      const newPlayer = {
        id: socket.id,
        name: playerName,
        score: 0,
        timeUsed: 0,
        maxStreak: 0,
        isHost: false,
        submitted: false
      };

      room.players.push(newPlayer);

      socket.join(code);

      callback({
        success: true
      });

      io.to(code).emit(
        'update_players',
        room.players
      );
    }
  );

  socket.on(
    'start_game',
    ({ roomCode, shuffledQuestionsList }) => {
      const code = roomCode.toUpperCase();
      const room = rooms[code];

      if (!room) return;

      const host = room.players.find(
        (p) =>
          p.id === socket.id &&
          p.isHost
      );

      if (!host) return;

      room.players.forEach((p) => {
        p.score = 0;
        p.timeUsed = 0;
        p.maxStreak = 0;
        p.submitted = false;
      });

      io.to(code).emit(
        'update_players',
        room.players
      );

      io.to(code).emit(
        'game_started_by_host',
        {
          shuffledQuestionsList
        }
      );
    }
  );

  socket.on(
    'submit_results',
    ({
      roomCode,
      score,
      timeUsed,
      maxStreak
    }) => {
      const code = roomCode.toUpperCase();
      const room = rooms[code];

      if (!room) return;

      const player = room.players.find(
        (p) => p.id === socket.id
      );

      if (player && !player.submitted) {
        player.score =
          Number(score) || 0;

        player.timeUsed =
          Number(timeUsed) || 0;

        player.maxStreak =
          Number(maxStreak) || 0;

        player.submitted = true;
      }

      io.to(code).emit(
        'update_players',
        room.players
      );

      const allSubmitted =
        room.players.length > 0 &&
        room.players.every(
          (p) => p.submitted === true
        );

      if (allSubmitted) {
        room.players.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }

          return a.timeUsed - b.timeUsed;
        });

        io.to(code).emit(
          'game_over',
          room.players
        );
      }
    }
  );

  socket.on('disconnect', () => {
    for (const roomCode in rooms) {
      const room = rooms[roomCode];

      const playerIndex =
        room.players.findIndex(
          (p) => p.id === socket.id
        );

      if (playerIndex === -1) {
        continue;
      }

      const leavingPlayer =
        room.players[playerIndex];

      room.players.splice(
        playerIndex,
        1
      );

      if (room.players.length === 0) {
        delete rooms[roomCode];
      } else if (leavingPlayer.isHost) {
        io.to(roomCode).emit(
          'host_disconnected',
          {
            message:
              'โฮสต์ได้ออกจากห้องเกมแล้ว ระบบกำลังพาท่านกลับสู่หน้าหลัก'
          }
        );

        delete rooms[roomCode];
      } else {
        io.to(roomCode).emit(
          'update_players',
          room.players
        );
      }

      break;
    }
  });
});

const PORT =
  process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT}`
  );
});