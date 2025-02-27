import React, { createContext, useContext, useEffect, useState } from "react";
import { ChatClient } from "./index";
import {
  ConnectionStatus,
  MessageAttachmentInput,
  MessageResponse,
  ShortRoomResponse,
  UserResponse,
} from "./types";
import { connectTwoArrays, createPeerConnection } from "./utils";

type UserMessageInput = {
  replyOnMessageId: string | undefined;
  editOnMessageId: string | undefined;
  content?: string;
  attachments: MessageAttachmentInput[];
};

type CallDetails = {
  hasCall: boolean;
  localStream: MediaStream | undefined;
  peerConnection: RTCPeerConnection | undefined;
  streams: MediaStream[];
};
type RoomDetails = {
  lastMessageId: string;
  hasMore: boolean;
  messages: MessageResponse[];
  typings: UserResponse[];
  messageInput: {
    replyOn: MessageResponse | undefined;
    editOn: MessageResponse | undefined;
    content?: string;
    attachments: MessageAttachmentInput[];
  };
};

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

    client.getConnectionStatus().subscribe(setStatus);

    client.onConnect(() => setStatus("connected"));
    client.onDisconnect(() => setStatus("disconnected"));
    client.onError((error) => console.error("Chat Error:", error));

    client.onMessageReceived((data) => {
      console.log("inside message received\n", data);

      setRoomsMap((prev) => ({
        ...prev,
        [data.roomId]: prev[data.roomId]
          ? {
              ...prev[data.roomId],
              messages: connectTwoArrays(
                prev[data.roomId]?.messages || [],
                [data],
                "id"
              ),
            }
          : {
              ...INIT_ROOM_DETAILS,
              messages: [data],
            },
      }));

      const { roomId } = data;

      setRooms((prevRooms) => {
        const roomToUpdate = prevRooms.find((room) => room.id === roomId);

        if (!roomToUpdate) return prevRooms;

        const updatedRoom = { ...roomToUpdate, lastMessage: data };

        return [updatedRoom, ...prevRooms.filter((room) => room.id !== roomId)];
      });
    });

    client.onMessageReaded((data) => {
      console.log("inside message readed\n", data);

      setRoomsMap((prev) => ({
        ...prev,
        [data.roomId]: prev[data.roomId]
          ? {
              ...prev[data.roomId],
              messages: (prev[data.roomId]?.messages || []).map((m) => {
                if (m.id === data.messageId) {
                  m.readAt = data.readAt;
                }
                return m;
              }),
            }
          : INIT_ROOM_DETAILS,
      }));
    });

    client.onMessageDeleted((data) => {
      console.log("inside message deleted\n", data);

      setRoomsMap((prev) => ({
        ...prev,
        [data.roomId]: prev[data.roomId]
          ? {
              ...prev[data.roomId],
              messages: prev[data.roomId].messages.filter(
                (m) => m.id !== data.messageId
              ),
            }
          : INIT_ROOM_DETAILS,
      }));
    });

    client.onMessageUpdated((data) => {
      console.log("inside message updated\n", data);

      setRoomsMap((prev) => ({
        ...prev,
        [data.roomId]: prev[data.roomId]
          ? {
              ...prev[data.roomId],
              messages: (prev[data.roomId]?.messages || []).map((m) => {
                if (m.id === data.id) {
                  m = data;
                }
                return m;
              }),
            }
          : INIT_ROOM_DETAILS,
      }));
    });

    client.onTypingStarted((data) => {
      console.log("inside typing started\n", data);

      // No need to push the same user as typing user
      if (data.user.id !== client.getUserData().id)
        setRoomsMap((prev) => ({
          ...prev,
          [data.roomId]: prev[data.roomId]
            ? {
                ...prev[data.roomId],
                typings: connectTwoArrays(
                  prev[data.roomId]?.typings || [],
                  [data.user],
                  "id"
                ),
              }
            : {
                ...INIT_ROOM_DETAILS,
                typings: [data.user],
              },
        }));
    });

    client.onTypingStopped((data) => {
      console.log("inside typing stopped\n", data);

      setRoomsMap((prev) => ({
        ...prev,
        [data.roomId]: prev[data.roomId]
          ? {
              ...prev[data.roomId],
              typings: (prev[data.roomId]?.typings || []).filter(
                (u) => u.id !== data.user.id
              ),
            }
          : INIT_ROOM_DETAILS,
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

    setChatClient(client);

    return () => {
      client.disconnect();
    };
  }, [socketUrl, authToken]);

  const getRoomDetails = (roomId: string) => {
    const details = roomsMap[roomId] || INIT_ROOM_DETAILS;

    return details;
  };

  const pushOldMessages = (
    roomId: string,
    oldMessages: MessageResponse[],
    hasMore: boolean
  ) => {
    oldMessages = oldMessages.reverse();

    setRoomsMap((prev) => ({
      ...prev,
      [roomId]: prev[roomId]
        ? {
            ...prev[roomId],
            lastMessageId: oldMessages[0]?.id || "",
            hasMore,
            messages: connectTwoArrays(
              oldMessages,
              prev[roomId]?.messages || [],
              "id"
            ),
          }
        : {
            ...INIT_ROOM_DETAILS,
            lastMessageId: oldMessages[0]?.id || "",
            hasMore,
            messages: connectTwoArrays(
              oldMessages,
              prev[roomId]?.messages || [],
              "id"
            ),
          },
    }));
  };

  const sendMessage = (roomId: string) => {
    if (chatClient) {
      const messageInput = getRoomDetails(roomId).messageInput;

      if (messageInput.content || messageInput.attachments.length !== 0) {
        if (messageInput.editOn) {
          chatClient.updateMessage({
            roomId,
            messageId: messageInput.editOn.id,
            message: {
              replyOn: messageInput.replyOn?.id,
              content: messageInput.content,
              attachments: messageInput.attachments,
            },
          });
        } else {
          chatClient.sendMessage({
            roomId,
            message: {
              replyOn: messageInput.replyOn?.id,
              content: messageInput.content,
              attachments: messageInput.attachments,
            },
          });
        }

        setMessageInput(roomId, {
          attachments: [],
          editOnMessageId: undefined,
          replyOnMessageId: undefined,
          content: "",
        });
      } else {
        console.log("Empty Message!!");
      }
    }
  };

  const setMessageInput = (roomId: string, messageInput: UserMessageInput) => {
    setRoomsMap((prev) => ({
      ...prev,
      [roomId]: prev[roomId]
        ? {
            ...prev[roomId],

            messageInput: {
              attachments: messageInput.attachments,
              content: messageInput.content,
              replyOn: messageInput.replyOnMessageId
                ? (prev[roomId].messages || []).find(
                    (m) => m.id === messageInput.replyOnMessageId
                  )
                : undefined,
              editOn: messageInput.editOnMessageId
                ? (prev[roomId].messages || []).find(
                    (m) => m.id === messageInput.editOnMessageId
                  )
                : undefined,
            },
          }
        : {
            ...INIT_ROOM_DETAILS,
            messageInput: {
              attachments: messageInput.attachments,
              content: messageInput.content,
              replyOn: messageInput.replyOnMessageId
                ? (prev[roomId].messages || []).find(
                    (m) => m.id === messageInput.replyOnMessageId
                  )
                : undefined,
              editOn: messageInput.editOnMessageId
                ? (prev[roomId].messages || []).find(
                    (m) => m.id === messageInput.editOnMessageId
                  )
                : undefined,
            },
          },
    }));

    if (messageInput.content || messageInput.attachments.length !== 0) {
      chatClient.startTyping({ roomId });
    } else {
      chatClient.stopTyping({ roomId });
    }
  };

  useEffect(() => {
    chatClient
      ?.fetchRooms()
      .then((response) => {
        console.log("fetched rooms\n", response.data);
        setRooms(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
  }, [chatClient]);

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
