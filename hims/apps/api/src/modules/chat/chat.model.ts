import mongoose, { Schema, Document } from 'mongoose';

export interface IChatRoom extends Document {
  tenantId: mongoose.Types.ObjectId;
  type: 'direct' | 'group' | 'department';
  name?: string;
  participants: mongoose.Types.ObjectId[];
  departmentId?: mongoose.Types.ObjectId;
  lastMessage?: { text: string; senderId: mongoose.Types.ObjectId; sentAt: Date };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatMessage extends Document {
  tenantId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  text?: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  replyTo?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  readBy: Array<{ userId: mongoose.Types.ObjectId; readAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const ChatRoomSchema = new Schema<IChatRoom>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  type: { type: String, enum: ['direct', 'group', 'department'], default: 'direct' },
  name: String,
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
  lastMessage: {
    text: String,
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    sentAt: Date,
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

ChatRoomSchema.index({ tenantId: 1, participants: 1 });
ChatRoomSchema.index({ tenantId: 1, type: 1 });

const ChatMessageSchema = new Schema<IChatMessage>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  roomId: { type: Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: String,
  fileUrl: String,
  fileType: String,
  fileName: String,
  replyTo: { type: Schema.Types.ObjectId, ref: 'ChatMessage' },
  isDeleted: { type: Boolean, default: false },
  readBy: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, readAt: Date }],
}, { timestamps: true });

ChatMessageSchema.index({ tenantId: 1, roomId: 1, createdAt: -1 });

export const ChatRoomModel = mongoose.model<IChatRoom>('ChatRoom', ChatRoomSchema);
export const ChatMessageModel = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
