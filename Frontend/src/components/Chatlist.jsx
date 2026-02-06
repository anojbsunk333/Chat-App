import { useEffect, useState } from "react";
import { useSocket } from "../lib/socket"; // Update this import based on your structure
import useChatStore from "../store/useChatStore"; // Assuming you have a store

function ChatList({ chats, currentUserId }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socket = useSocket(); // Get socket from context or store

  useEffect(() => {
    if (!socket) return;

    // Listen for online users updates
    socket.on("getOnlineUsers", (userIds) => {
      console.log("Online users received:", userIds);
      setOnlineUsers(userIds);
    });

    // Request initial online users
    // You might need to emit an event to get initial list
    socket.emit("requestOnlineUsers");

    return () => {
      socket.off("getOnlineUsers");
    };
  }, [socket]);

  // Check if a user is online
  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h3>Chats</h3>
        <div className="online-status">
          <span>{onlineUsers.length - 1} online</span>{" "}
          {/* Subtract current user */}
        </div>
      </div>

      {chats.map((chat) => {
        // Assuming chat has a participants array
        const otherUser = chat.participants?.find(
          (p) => p._id !== currentUserId,
        );

        return (
          <div
            key={chat._id || chat.id}
            className={`chat-item ${isUserOnline(otherUser?._id) ? "online" : "offline"}`}
          >
            <div className="chat-avatar">
              <img
                src={otherUser?.profilePic || "/default-avatar.png"}
                alt={otherUser?.fullName}
              />
              {isUserOnline(otherUser?._id) && (
                <span className="online-dot"></span>
              )}
            </div>

            <div className="chat-info">
              <div className="chat-header">
                <strong>{otherUser?.fullName}</strong>
                <span className="last-time">
                  {new Date(chat.updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="chat-preview">
                <span className="last-message">
                  {chat.lastMessage?.text || "No messages yet"}
                </span>
                {chat.unreadCount > 0 && (
                  <span className="unread-badge">{chat.unreadCount}</span>
                )}
              </div>

              <div className="chat-status">
                {isUserOnline(otherUser?._id) ? (
                  <span className="status-online">Online</span>
                ) : (
                  <span className="status-offline">Offline</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ChatList;
