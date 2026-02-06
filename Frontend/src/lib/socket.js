// Frontend/src/lib/socket.js
import { io } from "socket.io-client";

let socket = null;

// Create socket connection with userId
export const initSocket = (userId) => {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io("http://localhost:3000", {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    query: {
      userId: userId, // This is the key part!
    },
  });

  // Socket event listeners
  socket.on("connect", () => {
    console.log(
      "Connected to socket server with id:",
      socket.id,
      "for user:",
      userId,
    );
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from socket server");
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
  });

  socket.on("getOnlineUsers", (onlineUsers) => {
    console.log("Online users updated:", onlineUsers);
    // You'll need to update your store with this
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    console.error("Socket not initialized. Call initSocket first.");
  }
  return socket;
};
