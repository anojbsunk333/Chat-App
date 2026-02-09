import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL =
  import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null, onlineUsers: [] }); // Clear onlineUsers on logout
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    console.log("Connecting socket for user:", authUser._id);

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.connect();

    // Socket event listeners
    socket.on("connect", () => {
      console.log("Socket connected with ID:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    // Update online users list
    socket.on("getOnlineUsers", (userIds) => {
      console.log("Received online users:", userIds);
      set({ onlineUsers: userIds });
    });

    // Listen for individual user online events
    socket.on("user-online", (data) => {
      console.log("User came online:", data.userId);
      const { onlineUsers } = get();
      if (!onlineUsers.includes(data.userId)) {
        set({ onlineUsers: [...onlineUsers, data.userId] });
      }
    });

    // Listen for individual user offline events
    socket.on("user-offline", (data) => {
      console.log("User went offline:", data.userId);
      const { onlineUsers } = get();
      set({
        onlineUsers: onlineUsers.filter((id) => id !== data.userId),
      });
    });

    set({ socket: socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket?.connected) {
      console.log("Disconnecting socket");

      // Remove all listeners
      socket.off("getOnlineUsers");
      socket.off("user-online");
      socket.off("user-offline");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");

      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },

  // Helper function to check if a specific user is online
  isUserOnline: (userId) => {
    const { onlineUsers } = get();
    return onlineUsers.includes(userId);
  },

  // Get socket instance for other components to use
  getSocket: () => {
    return get().socket;
  },
}));
