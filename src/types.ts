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
  | "call-offer-received"
  | "call-offer-answered"
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
  | "share-candidate";

export enum ParticipantRoles {
  Admin = "Admin",
  Member = "Member",
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

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

export interface CallOfferResponse {
  roomId: string;
  from: string;

  offer: RTCSessionDescriptionInit;
}

export interface AnswerCallOfferInput {
  roomId: string;

  answer: RTCSessionDescriptionInit;
}

export interface AnswerCallOfferResponse {
  roomId: string;
  from: string;
  answer: RTCSessionDescriptionInit;
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
