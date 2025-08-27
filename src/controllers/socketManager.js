import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

export const connectToServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {

    // JOIN CALL
    socket.on("join-call", (path) => {

      if (!connections[path]) connections[path] = [];
      connections[path].push(socket.id);

      timeOnline[socket.id] = new Date();

      // Notify all users in room
      for (let a = 0; a < connections[path].length; a++) {
        io.to(connections[path][a]).emit("user-joined", socket.id);
      }

      // Send previous messages
      if (messages[path]) {
        for (let a = 0; a < messages[path].length; a++) {
          const msg = messages[path][a];
          io.to(socket.id).emit("chat-message", msg.data, msg.sender, msg["socket-id-sender"]);
        }
      }
    });

    // SIGNAL (WebRTC)
    socket.on("signal", (toID, message) => {
      io.to(toID).emit("signal", socket.id, message);
    });

    // CHAT MESSAGE
    socket.on("chat-message", (data, sender) => {

      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) return [roomKey, true];
          return [room, isFound];
        },
        ["", false]
      );

      if (found) {
        if (!messages[matchingRoom]) messages[matchingRoom] = [];
        messages[matchingRoom].push({ sender, data, "socket-id-sender": socket.id });

        connections[matchingRoom].forEach((elem) => {
          io.to(elem).emit("chat-message", data, sender, socket.id);
        });
      }
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      const diffTime = Math.abs(new Date() - timeOnline[socket.id]);
      delete timeOnline[socket.id];

      for (const [key, arr] of Object.entries(connections)) {
        const index = arr.indexOf(socket.id);
        if (index !== -1) {
          // Notify others
          for (let a = 0; a < connections[key].length; a++) {
            io.to(connections[key][a]).emit("user-left", socket.id);
          }

          // Remove socket from room
          connections[key].splice(index, 1);

          // Delete room if empty
          if (connections[key].length === 0) delete connections[key];
        }
      }
    });
  });

  return io;
};
