import React, { createContext, useContext, useEffect, useState } from "react";
import { CallStatus, FullRoomResponse, RoomTypes } from "./types";
import { useTalkio } from "./talkio-provider";

type CallTypes = "voice-only" | "video";

type CallContextProps = {
  callStatus: CallStatus;
  startCall: (roomId: string, type: CallTypes) => void;
  acceptCall: (type: CallTypes) => void;
  declineCall: () => void;
  remoteStreams: MediaStream[];
  localStream: MediaStream | undefined;

  roomCallingMe: FullRoomResponse | undefined;
};

const CallContext = createContext<CallContextProps | undefined>(undefined);

export const CallProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { socketClient, rooms } = useTalkio();

  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [peerConnection, setPeerConnection] = useState<
    RTCPeerConnection | undefined
  >(undefined);

  const [localStream, setLocalStream] = useState<MediaStream | undefined>(
    undefined
  );
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);

  const [roomCallingMe, setRoomCallingMe] = useState<
    FullRoomResponse | undefined
  >(undefined);

  useEffect(() => {
    if (socketClient) {
      socketClient.onPrivateCallReceived(async (data) => {
        console.log("inside private call received\n", data);
        const room = rooms.find((r) => r.id === data.roomId);
        if (!room) return console.log("room is not found!");

        setCallStatus("ringing");

        setRoomCallingMe(room);

        const pc = createPeerConnection(data.roomId);

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        setPeerConnection(pc);
      });

      socketClient.onPrivateCallAnswered(async (data) => {
        console.log("inside private call answered\n", data);
        setCallStatus("in-call");

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      });

      socketClient.onPrivateCallDeclined(async (data) => {
        console.log("inside private call declined\n", data);
        setCallStatus("idle");

        setPeerConnection(undefined);

        if (localStream) {
          localStream.getTracks().forEach((track) => track.stop());
          setLocalStream(undefined);
        }
      });

      socketClient.onCandidateReceived(async (data) => {
        console.log("inside candidate received\n", data);
        if (peerConnection) {
          await peerConnection.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }
      });

      return () => {
        socketClient.off("private-call-received");
        socketClient.off("private-call-answered");
        socketClient.off("candidate-received");
      };
    }
  }, [socketClient, rooms, peerConnection]);

  const createPeerConnection = (roomId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketClient.shareCandidate({
          roomId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("ontrack\n", event);
      setRemoteStreams((prev) => {
        const newStream = event.streams[0];
        // Prevent duplicate streams
        if (!prev.find((s) => s.id === newStream.id)) {
          return [...prev, newStream];
        }
        return prev;
      });
    };

    return pc;
  };

  const startCall = async (roomId: string, type: CallTypes = "voice-only") => {
    if (!socketClient)
      return console.log("socketClient is not initialized yet!");
    if (callStatus !== "idle") return console.log("In a Call!");

    const room = rooms.find((r) => r.id === roomId);
    // TODO: to be implemented later
    if (!room || room.type !== RoomTypes.Private)
      return console.log(
        `can't decline the ${RoomTypes.Private} call, the room is not found or the room is not a ${RoomTypes.Private} room, it's ${room?.type} `
      );

    let users = room.participants.map((p) => p.user);
    users = users.filter((u) => u.id !== socketClient.getUserData().id);

    if (users.length === 0)
      return console.log(`these is no users in the room to start a call!`);

    const stream = await navigator.mediaDevices.getUserMedia(
      type === "voice-only"
        ? {
            audio: true,
            video: false,
          }
        : {
            video: true,
            audio: true,
          }
    );

    if (!stream) return console.log("Stream is not available!");

    setLocalStream(stream);

    setCallStatus("ringing");

    const pc = createPeerConnection(roomId);
    setPeerConnection(pc);

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketClient.startPrivateCall({
      roomId,
      offer,
    });
  };

  const acceptCall = async (type: CallTypes = "voice-only") => {
    if (!roomCallingMe) return console.log("there is no call to accept!");

    // TODO: to be fixed after implement group calls
    if (roomCallingMe.type === RoomTypes.Group)
      return console.log(
        `The room type is not ${RoomTypes.Private}, can only start a call on the ${RoomTypes.Private} rooms`
      );

    const stream = await navigator.mediaDevices.getUserMedia(
      type === "voice-only"
        ? {
            audio: true,
            video: false,
          }
        : {
            video: true,
            audio: true,
          }
    );
    if (!stream) return console.log("Stream is not available!");
    if (!peerConnection)
      return console.log("peer connection is not initialized yet!");

    setCallStatus("in-call");

    setLocalStream(stream);

    stream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, stream));

    const answer = await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    socketClient.answerCallOffer({
      roomId: roomCallingMe.id,
      answer,
    });
  };

  const declineCall = () => {
    if (!roomCallingMe) return console.log("there is no call to decline!");

    socketClient.declineCallOffer({
      roomId: roomCallingMe.id,
    });

    setCallStatus("idle");
    setRoomCallingMe(undefined);
    setPeerConnection(undefined);

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(undefined);
    }
  };

  return (
    <CallContext.Provider
      value={{
        callStatus,
        startCall,
        acceptCall,
        declineCall,
        remoteStreams,
        localStream,
        roomCallingMe,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};
