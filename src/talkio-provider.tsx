import React, { createContext, useContext, useEffect, useState } from "react";
import { SocketClient } from "./socket-client";
import { ConnectionStatus, ShortRoomResponse } from "./types";

type TalkioContextProps = {
  socketClient: SocketClient | null;
  status: ConnectionStatus;
  rooms: ShortRoomResponse[];
  setRooms: (value: React.SetStateAction<ShortRoomResponse[]>) => void;
};

const TalkioContext = createContext<TalkioContextProps | undefined>(undefined);

export const TalkioProvider: React.FC<{
  socketUrl: string;
  serverUrl: string;
  authToken: string;
  children: React.ReactNode;
}> = ({ socketUrl, serverUrl, authToken, children }) => {
  const [socketClient, setTalkio] = useState<SocketClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [rooms, setRooms] = useState<ShortRoomResponse[]>([]);

  useEffect(() => {
    const client = new SocketClient(socketUrl, serverUrl, authToken);
    setTalkio(client);

    client.getConnectionStatus().subscribe(setStatus);
    client.onConnect(() => setStatus("connected"));
    client.onDisconnect(() => setStatus("disconnected"));
    client.onError(console.error);

    client
      .fetchRooms()
      .then((response) => {
        setRooms(response.data);
      })
      .catch((error) => {
        console.log(error);
      });

    return () => {
      client.disconnect();
    };
  }, [socketUrl, authToken]);

  return (
    <TalkioContext.Provider value={{ socketClient, status, rooms, setRooms }}>
      {children}
    </TalkioContext.Provider>
  );
};

export const useTalkio = () => {
  const context = useContext(TalkioContext);
  if (!context) {
    throw new Error("useTalkio must be used within a TalkioProvider");
  }
  return context;
};
