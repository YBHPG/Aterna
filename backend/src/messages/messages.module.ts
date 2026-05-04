import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { Message, MessageSchema } from '../database/schemas/message.schema';
import { CryptoModule } from '../crypto/crypto.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    CryptoModule,
    BullModule.registerQueue({ name: 'email-delivery-queue' }),
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule { }
