import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    markMessagesAsRead,
    clearUnreadCount,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      subscribeToMessages();

      // Mark messages as read when opening chat
      markMessagesAsRead(selectedUser._id);
      clearUnreadCount(selectedUser._id);
    }

    return () => unsubscribeFromMessages();
  }, [
    selectedUser?._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
    markMessagesAsRead,
    clearUnreadCount,
  ]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Helper function to get sender ID from message
  const getSenderId = (message) => {
    if (typeof message.senderId === "object" && message.senderId !== null) {
      return message.senderId._id || message.senderId;
    }
    return message.senderId;
  };

  // Helper function to check if message is from current user
  const isOwnMessage = (message) => {
    const senderId = getSenderId(message);
    return senderId === authUser?._id;
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((message) => {
            const ownMessage = isOwnMessage(message);

            return (
              <div
                key={message._id || message.timestamp || Date.now()}
                className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex max-w-xs lg:max-w-md ${ownMessage ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <div className="flex flex-col items-center mr-2">
                    <div className="size-8 rounded-full overflow-hidden border border-gray-300">
                      <img
                        src={
                          ownMessage
                            ? authUser?.profilePic || "/avatar.png"
                            : selectedUser?.profilePic || "/avatar.png"
                        }
                        alt={
                          ownMessage ? "You" : selectedUser?.fullName || "User"
                        }
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = "/avatar.png";
                        }}
                      />
                    </div>
                  </div>

                  {/* Message Bubble */}
                  <div className="flex flex-col">
                    {/* Sender Name and Time - Only for received messages */}
                    {!ownMessage && (
                      <div className="flex items-center gap-2 mb-1 ml-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {selectedUser?.fullName || "User"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatMessageTime(message.createdAt)}
                        </span>
                      </div>
                    )}

                    {/* Message Content */}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        ownMessage
                          ? "bg-blue-500 text-white rounded-br-none"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none"
                      }`}
                    >
                      {message.image && (
                        <img
                          src={message.image}
                          alt="Attachment"
                          className="max-w-full rounded-md mb-2"
                        />
                      )}
                      {message.text && (
                        <p className="break-words">{message.text}</p>
                      )}
                    </div>

                    {/* Time and Read Status for own messages */}
                    <div
                      className={`flex items-center gap-2 mt-1 ${ownMessage ? "justify-end mr-1" : "justify-start ml-1"}`}
                    >
                      {ownMessage && (
                        <>
                          <span className="text-xs text-gray-500">
                            {formatMessageTime(message.createdAt)}
                          </span>
                          {message.read && (
                            <span className="text-xs text-blue-500 flex items-center gap-1">
                              Read
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
