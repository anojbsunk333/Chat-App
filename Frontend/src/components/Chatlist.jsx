
import { useEffect } from "react";

// ChatList.js
function ChatList({ chats, userId }) {
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    // Fetch unread counts for all chats
    chats.forEach((chat) => {
      fetchUnreadCount(chat.id);
    });
  }, [chats]);

  const fetchUnreadCount = async (chatId) => {
    const res = await fetch(`/api/chats/${chatId}/unread`);
    const data = await res.json();
    setUnreadCounts((prev) => ({
      ...prev,
      [chatId]: data.count,
    }));
  };

  return (
    <div className="chat-list">
      {chats.map((chat) => {
        const unread = unreadCounts[chat.id] || 0;

        return (
          <div
            key={chat.id}
            className={`chat-item ${unread > 0 ? "unread" : ""}`}
            onClick={() => markChatAsRead(chat.id)}
          >
            <div className="chat-info">
              <strong>{chat.name}</strong>
              <span className={`last-message ${unread > 0 ? "bold" : ""}`}>
                {chat.lastMessage}
              </span>
            </div>
            {unread > 0 && <span className="unread-badge">{unread}</span>}
          </div>
        );
      })}
    </div>
  );
}
