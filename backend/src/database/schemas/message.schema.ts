import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  CANCELLED = 'cancelled',
  ERROR = 'error',
}

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  recipientEmail: string;

  @Prop({ required: true, type: Date })
  triggerDate: Date;

  @Prop({ required: true })
  encryptedContent: string;

  @Prop({ required: true })
  iv: string;

  @Prop({ required: true })
  authTag: string;

  @Prop({ type: String, enum: MessageStatus, default: MessageStatus.PENDING })
  status: MessageStatus;

  @Prop({ type: String, required: false })
  importBatchId?: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
