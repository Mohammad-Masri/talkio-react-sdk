import React, { createContext, useContext, useEffect, useState } from "react";
import { MessageResponse, RoomDetails, UserMessageInput } from "./types";
import { connectTwoArrays } from "./utils/array";
import { useTalkio } from "./talkio-provider";

const INIT_ROOM_DETAILS: RoomDetails = {
  lastMessageId: "",
  hasMore: true,
  messages: [],
  typings: [],
  messageInput: {
    replyOn: undefined,
    editOn: undefined,
    content: "",
    attachments: [],
  },
};

type RoomsMap = Record<string, RoomDetails>;

type ChatContextProps = {
  getRoomDetails: (roomId: string) => RoomDetails;
  // pushOldMessages: (
  //   roomId: string,
  //   messages: MessageResponse[],
  //   hasMore: boolean
  // ) => void;

  sendMessage: (roomId: string) => void;
  setMessageInput: (roomId: string, messageInput: UserMessageInput) => void;

  loadMoreMessages: (roomId: string, limit?: number) => void;
};

const ChatContext = createContext<ChatContextProps | undefined>(undefined);

export const ChatProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { socketClient, setRooms } = useTalkio();

  const [roomsMap, setRoomsMap] = useState<RoomsMap>({});

  useEffect(() => {
    if (socketClient) {
      socketClient.onMessageReceived((data) => {
        console.log("inside message received\n", data);

        const { roomId } = data;

        updateRoomsMap(roomId, (room) => ({
          ...room,
          messages: connectTwoArrays(room.messages, [data], "id"),
        }));

        setRooms((prevRooms) => {
          const roomToUpdate = prevRooms.find((room) => room.id === roomId);

          if (!roomToUpdate) return prevRooms;

          const updatedRoom = { ...roomToUpdate, lastMessage: data };

          return [
            updatedRoom,
            ...prevRooms.filter((room) => room.id !== roomId),
          ];
        });
      });

      socketClient.onMessageReaded((data) => {
        console.log("inside message readed\n", data);

        const { roomId } = data;

        updateRoomsMap(roomId, (room) => ({
          ...room,
          messages: room.messages.map((m) => {
            if (m.id === data.messageId) {
              m.readAt = data.readAt;
            }
            return m;
          }),
        }));
      });

      socketClient.onMessageDeleted((data) => {
        console.log("inside message deleted\n", data);
        const { roomId, messageId } = data;

        updateRoomsMap(roomId, (room) => ({
          ...room,
          messages: room.messages.filter((m) => m.id !== messageId),
        }));
      });

      socketClient.onMessageUpdated((data) => {
        console.log("inside message updated\n", data);

        const { roomId, id } = data;

        updateRoomsMap(roomId, (room) => ({
          ...room,
          messages: room.messages.map((m) => (m.id === id ? data : m)),
        }));
      });

      socketClient.onTypingStarted((data) => {
        console.log("inside typing started\n", data);
        const { roomId, user } = data;

        // TODO
        // No need to push the same user as typing user
        if (data.user.id !== socketClient.getUserData().id)
          updateRoomsMap(roomId, (room) => ({
            ...room,
            typings: connectTwoArrays(room.typings, [user], "id"),
          }));
      });

      socketClient.onTypingStopped((data) => {
        console.log("inside typing stopped\n", data);

        const { roomId, user } = data;

        updateRoomsMap(roomId, (room) => ({
          ...room,
          typings: room.typings.filter((u) => u.id !== user.id),
        }));
      });
    }
  }, [socketClient]);

  const getRoomDetails = (roomId) => roomsMap[roomId] || INIT_ROOM_DETAILS;

  const updateRoomsMap = (
    roomId: string,
    updateFn: (room: RoomDetails) => RoomDetails
  ) => {
    setRoomsMap((prev) => ({
      ...prev,
      [roomId]: updateFn(prev[roomId] || INIT_ROOM_DETAILS),
    }));
  };

  const pushOldMessages = (
    roomId: string,
    oldMessages: MessageResponse[],
    hasMore: boolean
  ) => {
    updateRoomsMap(roomId, (room) => ({
      ...room,
      lastMessageId: oldMessages[0]?.id || "",
      hasMore,
      messages: connectTwoArrays(oldMessages.reverse(), room.messages, "id"),
    }));
  };

  const sendMessage = (roomId: string) => {
    if (!socketClient) return;
    const { messageInput } = getRoomDetails(roomId);

    if (!messageInput.content && messageInput.attachments.length === 0)
      return console.log("Empty Message!!");

    const message = {
      replyOn: messageInput.replyOn?.id,
      content: messageInput.content,
      attachments: messageInput.attachments,
    };

    messageInput.editOn
      ? socketClient.updateMessage({
          roomId,
          messageId: messageInput.editOn.id,
          message,
        })
      : socketClient.sendMessage({ roomId, message });

    setMessageInput(roomId, {
      replyOnMessageId: undefined,
      editOnMessageId: undefined,
      content: "",
      attachments: [],
    });
  };

  const setMessageInput = (roomId: string, input: UserMessageInput) => {
    updateRoomsMap(roomId, (room) => ({
      ...room,
      messageInput: {
        ...room.messageInput,
        content: input.content,
        attachments: input.attachments,
        replyOn: input.replyOnMessageId
          ? room.messages.find((m) => m.id === input.replyOnMessageId)
          : undefined,
        editOn: input.editOnMessageId
          ? room.messages.find((m) => m.id === input.editOnMessageId)
          : undefined,
      },
    }));

    socketClient?.[
      input.content || input.attachments.length ? "startTyping" : "stopTyping"
    ]({ roomId });
  };

  const loadMoreMessages = (roomId: string, limit: number = 100) => {
    const { lastMessageId } = getRoomDetails(roomId);

    if (socketClient)
      socketClient
        .fetchMessages(roomId, lastMessageId, limit)
        .then((response) => {
          const { data, hasMore } = response.data;
          pushOldMessages(roomId, data, hasMore);
        });
  };

  return (
    <ChatContext.Provider
      value={{
        getRoomDetails,
        loadMoreMessages,
        sendMessage,
        setMessageInput,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
