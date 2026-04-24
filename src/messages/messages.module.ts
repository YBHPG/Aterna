import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from '../database/schemas/message.schema';
import { CryptoModule } from '../crypto/crypto.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    CryptoModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule { }
