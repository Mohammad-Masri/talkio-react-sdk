export type UserMessageInput = {
  replyOnMessageId: string | undefined;
  editOnMessageId: string | undefined;
  content?: string;
  attachments: MessageAttachmentInput[];
};

export type CallDetails = {
  hasCall: boolean;
  localStream: MediaStream | undefined;
  peerConnection: RTCPeerConnection | undefined;
  streams: MediaStream[];
};
export type RoomDetails = {
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

export type Events =
  | "connect"
  | "disconnect"
  | "error"
  | "user-connected"
  | "room-joined"
  | "room-leaved"
  | "message-received"
  | "message-readed"
  | "message-updated"
  | "message-deleted"
  | "typing-started"
  | "typing-stopped"
  | "call-offer-initialized"
  | "call-offer-received"
  | "call-offer-answered"
  | "call-offer-declined"
  | "candidate-received";

export type Actions =
  | "join-room"
  | "leave-room"
  | "send-message"
  | "read-message"
  | "update-message"
  | "delete-message"
  | "start-typing"
  | "stop-typing"
  | "send-call-offer"
  | "answer-call-offer"
  | "decline-call-offer"
  | "share-candidate";

export enum ParticipantRoles {
  Admin = "Admin",
  Member = "Member",
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export type CallStatus = "idle" | "ringing" | "in-call";

export class MessageAttachmentInput {
  URL: string;

  mimeType: string;
}

export class MessageInput {
  replyOn?: string;
  content?: string;

  attachments: MessageAttachmentInput[];
}

export class SendMessageInput {
  roomId: string;

  message: MessageInput;
}

export class ReadDeleteMessageInput {
  roomId: string;

  messageId: string;
}

export class UpdateMessageInput {
  roomId: string;

  messageId: string;

  message: MessageInput;
}

export enum RoomTypes {
  Private = "Private",
  Group = "Group",
}
export interface ShortRoomResponse {
  id: string;
  name: string;
  type: RoomTypes;
  participantsCount: number;
  lastMessage: MessageResponse | undefined;
}

export interface ParticipantResponse {
  user: UserResponse;
  role: ParticipantRoles;
}

export interface FullRoomResponse {
  id: string;
  name: string;
  type: RoomTypes;
  participantsCount: number;
  lastMessage: MessageResponse | undefined;
  participants: ParticipantResponse[];
}

export interface UserResponse {
  id: string;
  name: string;
  username: string;
  avatarURL: string | undefined;
  isOnline: boolean;
  lastSeen: string;
}

export interface MessageAttachmentResponse {
  id: string;

  URL: string;

  mimeType: string;
}

export interface MessageResponse {
  id: string;
  roomId: string;
  replyOn?: MessageResponse | undefined;
  content: string;
  attachments: MessageAttachmentResponse[];
  sender: UserResponse;
  readedByMe: boolean;
  readAt?: Date | undefined;

  createdAt: string;
  updatedAt?: Date | undefined;
}

export interface MessagesResponse {
  data: MessageResponse[];

  hasMore: boolean;
}

export interface ReadMessageResponse {
  roomId: string;

  messageId: string;

  readAt: Date;
}

export interface DeleteMessageResponse {
  roomId: string;

  messageId: string;
}

export interface StartStopTypingInput {
  roomId: string;
}

export interface StartStopTypingResponse {
  roomId: string;

  user: UserResponse;
}

export interface SendCallOfferInput {
  roomId: string;

  offer: RTCSessionDescriptionInit;
}

export interface CallInitializedResponse {
  roomId: string;

  call: CallResponse;
}

export interface CallOfferResponse {
  // roomId: string;
  from: string;

  offer: RTCSessionDescriptionInit;

  call: CallResponse;
}

export interface AnswerCallOfferInput {
  roomId: string;

  answer: RTCSessionDescriptionInit;
}

export interface DeclineCallOfferInput {
  roomId: string;
}

export interface AnswerCallOfferResponse {
  roomId: string;
  from: string;
  answer: RTCSessionDescriptionInit;
  // call: CallResponse;
}

export interface DeclineCallOfferResponse {
  roomId: string;
  from: string;
}

export interface ShareCandidateInput {
  roomId: string;

  candidate: RTCIceCandidate;
}

export interface CandidateResponse {
  roomId: string;
  from: string;
  candidate: RTCIceCandidate;
}

export interface CallResponse {
  id: string;
  room: ShortRoomResponse;
  caller: UserResponse;
  isYouCaller: boolean;
  createdAt: string;
}
