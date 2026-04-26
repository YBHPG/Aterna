import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Model } from 'mongoose';
import { CryptoService } from '../crypto/crypto.service';
import { Message, MessageDocument } from '../database/schemas/message.schema';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    private readonly cryptoService: CryptoService,
    @InjectQueue('email-delivery-queue') private readonly emailQueue: Queue,
  ) {}

  async create(userId: string, dto: CreateMessageDto): Promise<MessageDocument> {
    // Шифруем открытый текст
    const { encryptedContent, iv, authTag } = this.cryptoService.encrypt(dto.content);

    // Требование безопасности: немедленно перезаписываем открытый текст в памяти
    // после завершения операции шифрования
    (dto as unknown as Record<string, unknown>).content = '';

    // Сохраняем криптоконтейнер и метаданные в MongoDB
    const message = new this.messageModel({
      userId,
      recipientEmail: dto.recipientEmail,
      triggerDate: dto.triggerDate,
      encryptedContent,
      iv,
      authTag,
    });

    const savedMessage = await message.save();

    // 8.4: Вычисляем задержку в миллисекундах
    const delay = dto.triggerDate.getTime() - Date.now();

    // 8.5: Публикуем задачу в очередь, передавая только ID документа
    await this.emailQueue.add(
      'send-email',
      { messageId: savedMessage._id.toString() },
      { delay }
    );

    return savedMessage;
  }
}


