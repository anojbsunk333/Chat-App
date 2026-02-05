import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentChat: null,
  messages: [],
  unreadCounts: {},
  notifications: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages, authUser } = get();

    // Check if selectedUser exists
    if (!selectedUser?._id) {
      toast.error("No user selected");
      return;
    }

    console.log("Sending to user ID:", selectedUser._id); // Debug log

    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData,
      );

      // Add the new message to the local state
      set({
        messages: [...messages, res.data],
        unreadCounts: {
          ...get().unreadCounts,
          [selectedUser._id]: 0, // Reset unread count for this user after sending
        },
      });

      return res.data;
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error.response?.data?.message || "Failed to send message");
      throw error;
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;

    if (!socket) {
      console.error("Socket not available");
      return;
    }

    console.log("Subscribing to messages for user:", selectedUser._id);

    // Listen for new messages from the selected user
    socket.on("newMessage", (newMessage) => {
      console.log("Received newMessage event:", newMessage);

      const isMessageFromSelectedUser =
        newMessage.senderId === selectedUser._id ||
        newMessage.senderId?._id === selectedUser._id;

      if (isMessageFromSelectedUser) {
        console.log("Adding message from selected user:", newMessage);
        set((state) => ({
          messages: [...state.messages, newMessage],
          unreadCounts: {
            ...state.unreadCounts,
            [selectedUser._id]: (state.unreadCounts[selectedUser._id] || 0) + 1,
          },
        }));

        // Play notification sound
        playNotificationSound();
      }
    });

    // Also listen for messages you sent (messageSent event)
    socket.on("messageSent", (sentMessage) => {
      console.log("Received messageSent event:", sentMessage);

      const isMessageToSelectedUser =
        sentMessage.receiverId === selectedUser._id ||
        sentMessage.receiverId?._id === selectedUser._id;

      if (isMessageToSelectedUser) {
        console.log("Adding sent message to selected user:", sentMessage);
        // Check if message already exists
        const existingMessage = get().messages.find(
          (msg) => msg._id === sentMessage._id,
        );

        if (!existingMessage) {
          set((state) => ({
            messages: [...state.messages, sentMessage],
          }));
        }
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("messageSent");
    }
  },

  setSelectedUser: (selectedUser) => {
    console.log("Setting selected user:", selectedUser?._id);
    set({ selectedUser });
  },

  fetchConversations: async () => {
    try {
      const response = await axiosInstance.get("/messages/conversations");
      set({ conversations: response.data });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    }
  },

  markMessagesAsRead: async (userId) => {
    try {
      await axiosInstance.post(`/messages/mark-read/${userId}`);
      set((state) => ({
        unreadCounts: {
          ...state.unreadCounts,
          [userId]: 0,
        },
      }));
    } catch (error) {
      console.error("Error marking messages as read:", error);
      toast.error("Failed to mark messages as read");
    }
  },

  fetchUnreadCounts: async () => {
    try {
      const response = await axiosInstance.get("/messages/unread/count");
      set({ unreadCounts: response.data });
    } catch (error) {
      console.error("Error fetching unread counts:", error);
    }
  },

  addUnreadCount: (userId) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: (state.unreadCounts[userId] || 0) + 1,
      },
    }));
  },

  clearUnreadCount: (userId) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: 0,
      },
    }));
  },

  initializeStore: () => {
    set({
      conversations: [],
      messages: [],
      unreadCounts: {},
      notifications: [],
      users: [],
      selectedUser: null,
    });
  },
}));

// Helper function for notification sound
const playNotificationSound = () => {
  try {
    const audio = new Audio(
      "https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3",
    );
    audio.volume = 0.3;
    audio.play().catch((e) => console.log("Audio play failed:", e));
  } catch (error) {
    console.log("Could not play notification sound:", error);
  }
};
