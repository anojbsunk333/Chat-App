import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      read: false,
    });

    await newMessage.save();

    // Populate sender info for socket
    const populatedMessage = await Message.findById(newMessage._id)
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic");

    // Send notification to receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", {
        ...populatedMessage.toObject(),
        isNew: true,
        unread: true,
      });
    }

    // Also emit to sender for real-time update
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageSent", populatedMessage);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all unique conversations for the user
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$senderId", userId] }, "$receiverId", "$senderId"],
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", userId] },
                    { $eq: ["$read", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          lastMessageTime: { $first: "$createdAt" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          userId: "$_id",
          lastMessage: {
            _id: "$lastMessage._id",
            text: "$lastMessage.text",
            image: "$lastMessage.image",
            senderId: "$lastMessage.senderId",
            receiverId: "$lastMessage.receiverId",
            read: "$lastMessage.read",
            createdAt: "$lastMessage.createdAt",
          },
          unreadCount: 1,
          user: {
            _id: "$user._id",
            fullName: "$user.fullName",
            profilePic: "$user.profilePic",
            email: "$user.email",
          },
          lastMessageTime: 1,
        },
      },
      {
        $sort: { lastMessageTime: -1 },
      },
    ]);

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error in getConversations:", error);
    res.status(500).json({ error: error.message });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { userId: otherUserId } = req.params;

    const result = await Message.updateMany(
      {
        senderId: otherUserId,
        receiverId: userId,
        read: false,
      },
      {
        $set: { read: true },
      },
    );

    // Notify the sender that messages were read
    const senderSocketId = getReceiverSocketId(otherUserId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", {
        receiverId: userId,
        count: result.modifiedCount,
      });
    }

    res.status(200).json({
      message: "Messages marked as read",
      count: result.modifiedCount,
      senderId: otherUserId,
    });
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiverId: userId,
          read: false,
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert array to object
    const countsObject = unreadCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {});

    res.status(200).json(countsObject);
  } catch (error) {
    console.error("Error in getUnreadCount:", error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE - Delete a specific message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Find and delete message, ensuring user is the sender
    const message = await Message.findOneAndDelete({
      _id: messageId,
      senderId: userId,
    });

    if (!message) {
      return res.status(404).json({
        error: "Message not found or you don't have permission to delete it",
      });
    }

    // Notify receiver about message deletion
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", {
        messageId: messageId,
      });
    }

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE - Delete entire conversation between two users
export const deleteConversation = async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.user._id;

    // Delete all messages between the two users
    const result = await Message.deleteMany({
      $or: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId },
      ],
    });

    // Notify the other user
    const otherUserSocketId = getReceiverSocketId(otherUserId);
    if (otherUserSocketId) {
      io.to(otherUserSocketId).emit("conversationDeleted", {
        userId: currentUserId,
      });
    }

    res.status(200).json({
      message: "Conversation deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error in deleteConversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// PATCH - Update message (edit text)
export const updateMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text) {
      return res.status(400).json({ message: "Text is required" });
    }

    const updatedMessage = await Message.findOneAndUpdate(
      {
        _id: messageId,
        senderId: userId,
      },
      { text, editedAt: new Date() },
      { new: true },
    )
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic");

    if (!updatedMessage) {
      return res.status(404).json({
        error: "Message not found or you don't have permission to edit it",
      });
    }

    // Notify receiver about message edit
    const receiverSocketId = getReceiverSocketId(updatedMessage.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageEdited", updatedMessage);
    }

    res.status(200).json(updatedMessage);
  } catch (error) {
    console.error("Error in updateMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// PATCH - Bulk update messages status
export const updateMessagesStatus = async (req, res) => {
  try {
    const { messageIds, status } = req.body;
    const userId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds) || !status) {
      return res.status(400).json({
        message: "messageIds array and status are required",
      });
    }

    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        receiverId: userId,
      },
      { read: status === "read" },
    );

    res.status(200).json({
      message: "Messages status updated",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error in updateMessagesStatus:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
