import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getUsersForSidebar,
  getMessages,
  sendMessage,
  getConversations,
  markMessagesAsRead,
  getUnreadCount,
  deleteMessage,
  deleteConversation,
  updateMessage,
  updateMessagesStatus,
} from "../controllers/message.controller.js";

const router = express.Router();

// GET methods - Retrieve resources
router.get("/users", protectRoute, getUsersForSidebar);
router.get("/conversations", protectRoute, getConversations);
router.get("/unread/count", protectRoute, getUnreadCount);
router.get("/:id", protectRoute, getMessages);

// POST methods - Create resources
router.post("/send/:id", protectRoute, sendMessage);
router.post("/mark-read/:userId", protectRoute, markMessagesAsRead);

// PATCH methods - Partial updates
router.patch("/:messageId", protectRoute, updateMessage);
router.patch("/status/bulk", protectRoute, updateMessagesStatus);

// DELETE methods - Remove resources
router.delete("/:messageId", protectRoute, deleteMessage);
router.delete("/conversation/:userId", protectRoute, deleteConversation);

export default router;
