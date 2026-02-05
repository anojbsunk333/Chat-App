import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Bell } from "lucide-react";
import { format } from "date-fns";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    conversations,
    unreadCounts = {}, // Add default value
    fetchConversations,
    markMessagesAsRead,
    fetchUnreadCounts, // Add this
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [sortedConversations, setSortedConversations] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    getUsers();
    fetchConversations?.();
    fetchUnreadCounts?.(); // Fetch unread counts
  }, [getUsers, fetchConversations, fetchUnreadCounts]);

  // Calculate total unread messages
  useEffect(() => {
    if (unreadCounts && typeof unreadCounts === "object") {
      const total = Object.values(unreadCounts).reduce((sum, count) => {
        return sum + (Number(count) || 0);
      }, 0);
      setTotalUnread(total);
    } else {
      setTotalUnread(0);
    }
  }, [unreadCounts]);

  // Sort conversations by last message timestamp AND unread status
  useEffect(() => {
    if (conversations && conversations.length > 0) {
      const sorted = [...conversations].sort((a, b) => {
        const aUserId = a.user?._id || a.userId;
        const bUserId = b.user?._id || b.userId;

        // FIRST: Prioritize unread conversations
        const aUnread = unreadCounts[aUserId] > 0;
        const bUnread = unreadCounts[bUserId] > 0;

        if (aUnread && !bUnread) return -1;
        if (!aUnread && bUnread) return 1;

        // THEN: Sort by last message time
        const timeA = a.lastMessage?.createdAt
          ? new Date(a.lastMessage.createdAt)
          : new Date(a.updatedAt || a.lastMessageTime || 0);
        const timeB = b.lastMessage?.createdAt
          ? new Date(b.lastMessage.createdAt)
          : new Date(b.updatedAt || b.lastMessageTime || 0);
        return timeB - timeA; // Newest first
      });
      setSortedConversations(sorted);
    } else if (users && users.length > 0) {
      // Fallback to users if no conversations yet
      const sortedUsers = [...users].sort((a, b) => {
        // Sort by unread count first
        const aUnread = unreadCounts[a._id] > 0;
        const bUnread = unreadCounts[b._id] > 0;
        if (aUnread && !bUnread) return -1;
        if (!aUnread && bUnread) return 1;

        // Then online status
        const aOnline = onlineUsers.includes(a._id);
        const bOnline = onlineUsers.includes(b._id);
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;

        // Then by name
        return (a.fullName || a.name || "").localeCompare(
          b.fullName || b.name || "",
        );
      });
      setSortedConversations(
        sortedUsers.map((user) => ({
          userId: user._id,
          user: user,
          lastMessage: null,
          unreadCount: unreadCounts?.[user._id] || 0,
        })),
      );
    } else {
      setSortedConversations([]);
    }
  }, [conversations, users, onlineUsers, unreadCounts]);

  const filteredConversations = showOnlineOnly
    ? sortedConversations.filter((conv) => {
        const userId = conv.user?._id || conv.userId || conv._id;
        return userId && onlineUsers.includes(userId);
      })
    : sortedConversations;

  // Format time function
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffHours = (now - date) / (1000 * 60 * 60);

      if (diffHours < 24) {
        return format(date, "HH:mm");
      } else if (diffHours < 48) {
        return "Yesterday";
      } else {
        return format(date, "dd/MM");
      }
    } catch (error) {
      console.error("Error formatting time:", error);
      return "";
    }
  };

  // Handle user click - mark messages as read
  const handleUserClick = async (user) => {
    if (!user?._id) return;

    setSelectedUser(user);
    if (markMessagesAsRead && user._id) {
      try {
        await markMessagesAsRead(user._id);
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    }
  };

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-80 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-6" />
            <span className="font-medium hidden lg:block">Chats</span>
          </div>
          {totalUnread > 0 && (
            <div className="relative hidden lg:block">
              <Bell className="size-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            </div>
          )}
        </div>
        {/* Online filter toggle */}
        <div className="mt-3 hidden lg:flex items-center justify-between">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">
            {onlineUsers.length - 1} online • {totalUnread} unread
          </span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3 flex-1">
        {filteredConversations.map((conv) => {
          const user = conv.user || conv;
          const userId = user._id || conv.userId;
          const unreadCount =
            unreadCounts && userId ? unreadCounts[userId] || 0 : 0;
          const lastMessage = conv.lastMessage;
          const hasUnread = unreadCount > 0;
          const userFullName = user.fullName || user.name || "Unknown User";
          const profilePic = user.profilePic || "/avatar.png";
          const isOnline = userId && onlineUsers.includes(userId);
          const isSelected = selectedUser?._id === userId;

          return (
            <button
              key={userId}
              onClick={() => handleUserClick(user)}
              className={`
                w-full p-3 flex items-center gap-3 relative
                hover:bg-base-300 transition-all duration-200
                ${isSelected ? "bg-base-300 ring-1 ring-base-300" : ""}
                ${hasUnread ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500" : ""}
              `}
            >
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={profilePic}
                  alt={userFullName}
                  className={`
                    size-12 object-cover rounded-full
                    ${hasUnread ? "ring-2 ring-blue-500" : ""}
                    ${isSelected ? "ring-2 ring-primary" : ""}
                  `}
                  onError={(e) => {
                    e.target.src = "/avatar.png";
                  }}
                />
                {isOnline && (
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-green-500 
                    rounded-full ring-2 ring-zinc-900 dark:ring-zinc-700"
                  />
                )}
                {hasUnread && !isSelected && (
                  <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </div>

              {/* User info - only visible on larger screens */}
              <div className="hidden lg:block text-left min-w-0 flex-1">
                <div className="flex justify-between items-center">
                  <div
                    className={`font-medium truncate ${hasUnread ? "font-bold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {userFullName}
                    {hasUnread && (
                      <span className="ml-2 inline-block size-2 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                  </div>
                  {lastMessage?.createdAt && (
                    <div
                      className={`text-xs ${hasUnread ? "text-blue-600 dark:text-blue-400 font-medium" : "text-gray-400"}`}
                    >
                      {formatTime(lastMessage.createdAt)}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-1">
                  <div
                    className={`text-sm truncate ${hasUnread ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-500"}`}
                  >
                    {lastMessage ? (
                      lastMessage.text ? (
                        lastMessage.text.length > 30 ? (
                          `${lastMessage.text.substring(0, 30)}...`
                        ) : (
                          lastMessage.text
                        )
                      ) : (
                        "📷 Image"
                      )
                    ) : (
                      <span className="italic">No messages yet</span>
                    )}
                  </div>

                  {hasUnread && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1 ml-2 animate-pulse">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>

                <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                  <span>{isOnline ? "🟢 Online" : "⚫ Offline"}</span>
                  {hasUnread && (
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {unreadCount} new{" "}
                      {unreadCount === 1 ? "message" : "messages"}
                    </span>
                  )}
                </div>
              </div>

              {/* Mobile view - only show badge */}
              <div className="lg:hidden">
                {hasUnread && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {filteredConversations.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            {showOnlineOnly ? "No online users" : "No conversations"}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
