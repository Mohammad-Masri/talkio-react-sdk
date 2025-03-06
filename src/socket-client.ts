import io, { Socket } from "socket.io-client";
import { BehaviorSubject } from "rxjs";
import axios, { AxiosInstance } from "axios";
import { jwtDecode } from "jwt-decode";

import {
  Actions,
  ConnectionStatus,
  DeleteMessageResponse,
  Events,
  MessageResponse,
  MessagesResponse,
  ReadDeleteMessageInput,
  ReadMessageResponse,
  SendMessageInput,
  UpdateMessageInput,
  StartStopTypingResponse,
  StartStopTypingInput,
  CandidateResponse,
  ShareCandidateInput,
  FullRoomResponse,
  PrivateCallReceivedResponse,
  PrivateCallAnsweredResponse,
  PrivateCallDeclinedResponse,
  StartPrivateCallInput,
  AnswerPrivateCallInput,
  DeclinePrivateCallInput,
} from "./types";

export class SocketClient {
  private socket: typeof Socket;
  private http: AxiosInstance;

  private connectionStatus$: BehaviorSubject<ConnectionStatus> =
    new BehaviorSubject("connecting");

  private socketUrl: string;
  private serverUrl: string;
  private authToken: string;
  private userData: { id: string; username: string };

  constructor(socketUrl: string, serverUrl: string, authToken: string) {
    this.socketUrl = socketUrl;
    this.serverUrl = serverUrl;
    this.authToken = authToken;

    const decoded: { id: string; username: string } = jwtDecode(authToken);

    this.userData = {
      id: decoded.id,
      username: decoded.username,
    };
    this.initializeSocket();
    this.initHttpClient();
  }

  private initializeSocket() {
    this.socket = io(this.socketUrl, {
      auth: { token: this.authToken },
      reconnectionAttempts: 5, // Limit reconnection attempts
      reconnectionDelay: 2000, // Start with 2s delay
    });

    this.socket.on("connect", () => {
      this.connectionStatus$.next("connected");
      console.log("Connected successfully!");
    });

    this.socket.on("connect_error", (error) => {
      console.warn("Connection Error:", error.message);
    });

    this.socket.on("reconnect_attempt", (attempt) => {
      console.log(`Reconnection attempt ${attempt}`);
      this.connectionStatus$.next("connecting");
    });
  }

  private initHttpClient() {
    this.http = axios.create({
      baseURL: this.serverUrl,
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
    });
  }

  getConnectionStatus() {
    return this.connectionStatus$.asObservable();
  }

  private checkSocket() {
    if (!this.socket) {
      console.warn("Socket is not initialized.");
      return false;
    }
    return true;
  }

  private on(event: Events, callback: (...args: unknown[]) => void) {
    this.socket?.on(event, callback);
  }

  public off(event: Events) {
    this.socket?.off(event);
  }

  private emit<T>(action: Actions, data: T) {
    this.socket?.emit(action, data);
  }

  public getUserData() {
    return this.userData;
  }

  public isMessageByYou(message: MessageResponse) {
    return this.userData.id === message.sender?.id;
  }

  onConnect(callback: () => void) {
    this.on("connect", () => {
      this.connectionStatus$.next("connected");
      callback();
    });
  }

  onDisconnect(callback: (reason: any) => void) {
    this.on("disconnect", (reason: any) => {
      this.connectionStatus$.next("disconnected");
      callback(reason);
    });
  }

  onError(callback: (error: any) => void) {
    this.on("error", (error: any) => {
      callback(error);
    });
  }

  // TODO
  onUserConnected(callback: (data: any) => void) {
    this.on("user-connected", callback);
  }
  // TODO
  onRoomJoined(callback: (data: any) => void) {
    this.on("room-joined", callback);
  }
  // TODO
  onRoomLeaved(callback: (data: any) => void) {
    this.on("room-leaved", callback);
  }

  onMessageReceived(callback: (data: MessageResponse) => void) {
    this.on("message-received", callback);
  }
  onMessageDeleted(callback: (data: DeleteMessageResponse) => void) {
    this.on("message-deleted", callback);
  }

  onMessageReaded(callback: (data: ReadMessageResponse) => void) {
    this.on("message-readed", callback);
  }

  onMessageUpdated(callback: (data: MessageResponse) => void) {
    this.on("message-updated", callback);
  }

  onTypingStarted(callback: (data: StartStopTypingResponse) => void) {
    this.on("typing-started", callback);
  }

  onTypingStopped(callback: (data: StartStopTypingResponse) => void) {
    this.on("typing-stopped", callback);
  }

  onPrivateCallReceived(callback: (data: PrivateCallReceivedResponse) => void) {
    this.on("private-call-received", callback);
  }

  onPrivateCallAnswered(callback: (data: PrivateCallAnsweredResponse) => void) {
    this.on("private-call-answered", callback);
  }

  onPrivateCallDeclined(callback: (data: PrivateCallDeclinedResponse) => void) {
    this.on("private-call-declined", callback);
  }

  onCandidateReceived(callback: (data: CandidateResponse) => void) {
    this.on("candidate-received", callback);
  }

  joinRoom(roomId: string) {
    const ok = this.checkSocket();
    if (ok) {
      this.emit("join-room", { roomId });
    }
  }

  leaveRoom(roomId: string) {
    const ok = this.checkSocket();
    if (ok) {
      this.emit("leave-room", { roomId });
    }
  }

  sendMessage(message: SendMessageInput) {
    const ok = this.checkSocket();
    if (ok) {
      this.emit("send-message", message);
    }
  }

  readMessage(data: ReadDeleteMessageInput) {
    const ok = this.checkSocket();
    if (ok) {
      this.emit("read-message", data);
    }
  }

  deleteMessage(data: ReadDeleteMessageInput) {
    const ok = this.checkSocket();
    if (ok) {
      this.emit("delete-message", data);
    }
  }

  updateMessage(data: UpdateMessageInput) {
    const ok = this.checkSocket();
    if (ok) {
      this.emit("update-message", data);
    }
  }

  startTyping(data: StartStopTypingInput) {
    const ok = this.checkSocket();
    if (ok) {
      this.emit("start-typing", data);
    }
  }

  stopTyping(data: StartStopTypingInput) {
    const ok = this.checkSocket();
    if (ok) {
      this.emit("stop-typing", data);
    }
  }

  startPrivateCall(data: StartPrivateCallInput) {
    const ok = this.checkSocket();
    if (ok) {
      this.emit("start-private-call", data);
    }
  }

  answerCallOffer(data: AnswerPrivateCallInput) {
    const ok = this.checkSocket();
    if (ok) {
      this.emit("answer-private-call", data);
    }
  }
  declineCallOffer(data: DeclinePrivateCallInput) {
    const ok = this.checkSocket();
    if (ok) {
      this.emit("decline-private-call", data);
    }
  }

  shareCandidate(data: ShareCandidateInput) {
    const ok = this.checkSocket();
    if (ok) {
      this.emit("share-candidate", data);
    }
  }

  reconnect() {
    const ok = this.checkSocket();
    if (ok) {
      this.socket.connect();
    }
  }

  disconnect() {
    this.socket.disconnect();
  }

  fetchRooms() {
    return this.http.get<FullRoomResponse[]>("/api/rooms");
  }

  fetchMessages(roomId: string, lastMessageId: string, limit: number = 100) {
    return this.http.get<MessagesResponse>(
      `/api/rooms/${roomId}/messages?lastMessageId=${lastMessageId}&limit=${limit}`
    );
  }
}
