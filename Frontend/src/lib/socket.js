// Frontend/src/lib/socket.js
import { io } from "socket.io-client";

// Create socket connection
const socket = io("http://localhost:3000", {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Socket event listeners
socket.on("connect", () => {
  console.log("Connected to socket server with id:", socket.id);
});

socket.on("disconnect", () => {
  console.log("Disconnected from socket server");
});

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error);
});

export { socket };
