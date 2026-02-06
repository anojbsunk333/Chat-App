import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
let server;
let io;

// Only initialize Socket.IO for development/local deployment
if (process.env.NODE_ENV !== "production") {
  server = http.createServer(app);
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://chat-app-three-pi-78.vercel.app"
      ],
      credentials: true,
    },
  });

  // used to store online users
  const userSocketMap = {}; // {userId: socketId}

  export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
  }

  io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;

    if (userId) {
      userSocketMap[userId] = socket.id;
      console.log(`User ${userId} connected`);
      console.log("Current online users:", Object.keys(userSocketMap));

      // Notify all OTHER users that this user came online
      socket.broadcast.emit("user-online", { userId });

      // Send current online users to the newly connected user
      socket.emit("getOnlineUsers", Object.keys(userSocketMap));

      // Broadcast updated list to all users
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }

    socket.on("disconnect", () => {
      console.log("A user disconnected", socket.id);

      let disconnectedUserId = null;
      for (const [key, value] of Object.entries(userSocketMap)) {
        if (value === socket.id) {
          disconnectedUserId = key;
          delete userSocketMap[key];
          break;
        }
      }

      if (disconnectedUserId) {
        // Notify all users that this user went offline
        socket.broadcast.emit("user-offline", { userId: disconnectedUserId });
        console.log(`User ${disconnectedUserId} went offline`);
      }

      // Broadcast updated list to all users
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });
} else {
  // For production serverless (Vercel), don't use Socket.IO
  server = app;
}

export { io, app, server };
export function getReceiverSocketId(userId) {
  // Stub for production
  return null;
}
