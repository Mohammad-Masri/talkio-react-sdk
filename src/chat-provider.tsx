import React, { createContext, useContext, useEffect, useState } from "react";
import { ChatClient } from "./index";
import {
  ConnectionStatus,
  MessageResponse,
  RoomDetails,
  ShortRoomResponse,
  UserMessageInput,
} from "./types";
import { connectTwoArrays } from "./utils";

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
  chatClient: ChatClient;
  status: ConnectionStatus;
  rooms: ShortRoomResponse[];
  getRoomDetails: (roomId: string) => RoomDetails;
  pushOldMessages: (
    roomId: string,
    messages: MessageResponse[],
    hasMore: boolean
  ) => void;

  sendMessage: (roomId: string) => void;
  setMessageInput: (roomId: string, messageInput: UserMessageInput) => void;
};

const ChatContext = createContext<ChatContextProps | undefined>(undefined);

export const ChatProvider: React.FC<{
  socketUrl: string;
  serverUrl: string;
  authToken: string;
  children: React.ReactNode;
}> = ({ socketUrl, serverUrl, authToken, children }) => {
  const [chatClient, setChatClient] = useState<ChatClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [rooms, setRooms] = useState<ShortRoomResponse[]>([]);
  const [roomsMap, setRoomsMap] = useState<RoomsMap>({});

  useEffect(() => {
    const client = new ChatClient(socketUrl, serverUrl, authToken);

    setChatClient(client);

    client.getConnectionStatus().subscribe(setStatus);
    client.onConnect(() => setStatus("connected"));
    client.onDisconnect(() => setStatus("disconnected"));
    client.onError(console.error);

    client.onMessageReceived((data) => {
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

        return [updatedRoom, ...prevRooms.filter((room) => room.id !== roomId)];
      });
    });

    client.onMessageReaded((data) => {
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

    client.onMessageDeleted((data) => {
      console.log("inside message deleted\n", data);
      const { roomId, messageId } = data;

      updateRoomsMap(roomId, (room) => ({
        ...room,
        messages: room.messages.filter((m) => m.id !== messageId),
      }));
    });

    client.onMessageUpdated((data) => {
      console.log("inside message updated\n", data);

      const { roomId, id } = data;

      updateRoomsMap(roomId, (room) => ({
        ...room,
        messages: room.messages.map((m) => (m.id === id ? data : m)),
      }));
    });

    client.onTypingStarted((data) => {
      console.log("inside typing started\n", data);
      const { roomId, user } = data;

      // TODO
      // No need to push the same user as typing user
      if (data.user.id !== client.getUserData().id)
        updateRoomsMap(roomId, (room) => ({
          ...room,
          typings: connectTwoArrays(room.typings, [user], "id"),
        }));
    });

    client.onTypingStopped((data) => {
      console.log("inside typing stopped\n", data);

      const { roomId, user } = data;

      updateRoomsMap(roomId, (room) => ({
        ...room,
        typings: room.typings.filter((u) => u.id !== user.id),
      }));
    });

    client.onCallOfferReceived(async (data) => {
      console.log("inside call offer received\n", data);
    });

    client.onCallOfferAnswered((data) => {
      console.log("inside call offer answered\n", data);
    });

    client.onCandidateReceived(async (data) => {
      console.log("inside candidate received\n", data);
    });

    return () => {
      client.disconnect();
    };
  }, [socketUrl, authToken]);

  useEffect(() => {
    if (chatClient)
      chatClient
        .fetchRooms()
        .then((response) => {
          setRooms(response.data);
        })
        .catch((error) => {
          console.log(error);
        });
  }, [chatClient]);

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
    oldMessages = oldMessages.reverse();
    updateRoomsMap(roomId, (room) => ({
      ...room,
      lastMessageId: oldMessages[0]?.id || "",
      hasMore,
      messages: connectTwoArrays(oldMessages.reverse(), room.messages, "id"),
    }));
  };

  const sendMessage = (roomId: string) => {
    if (!chatClient) return;
    const { messageInput } = getRoomDetails(roomId);

    if (!messageInput.content && messageInput.attachments.length === 0)
      return console.log("Empty Message!!");

    const message = {
      replyOn: messageInput.replyOn?.id,
      content: messageInput.content,
      attachments: messageInput.attachments,
    };

    messageInput.editOn
      ? chatClient.updateMessage({
          roomId,
          messageId: messageInput.editOn.id,
          message,
        })
      : chatClient.sendMessage({ roomId, message });

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

    chatClient?.[
      input.content || input.attachments.length ? "startTyping" : "stopTyping"
    ]({ roomId });
  };

  return (
    <ChatContext.Provider
      value={{
        chatClient,
        status,
        rooms,
        getRoomDetails,
        pushOldMessages,
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
