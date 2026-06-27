import { NestFactory } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { AppModule } from '../app.module';
import { CryptoService } from '../crypto/crypto.service';
import { getModelToken } from '@nestjs/mongoose';
import { Message, MessageStatus } from '../database/schemas/message.schema';
import { Model } from 'mongoose';
import { Queue } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';

const BASE_DELAY_MS = 60_000;  // 1 минута до первого письма
const STAGGER_MS    = 30_000;  // 30 секунд между каждым

async function bootstrap() {
  // Create application context instead of a full web server
  const app = await NestFactory.createApplicationContext(AppModule);

  const cryptoService = app.get(CryptoService);
  const messageModel = app.get<Model<Message>>(getModelToken(Message.name));
  const emailQueue = app.get<Queue>(getQueueToken('email-delivery-queue'));

  const importFilePath = process.argv[2];
  if (!importFilePath) {
    console.error('Usage: ts-node src/scripts/import-messages.ts <path-to-json-file>');
    await app.close();
    process.exit(1);
  }

  const batchId = `import-${Date.now()}`;
  console.log(`Starting import. Batch ID: ${batchId}`);

  try {
    const fileContent = fs.readFileSync(path.resolve(importFilePath), 'utf-8');
    const messages = JSON.parse(fileContent);

    if (!Array.isArray(messages)) {
      throw new Error('JSON file must contain an array of messages');
    }

    let successCount = 0;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg.userId || !msg.recipientEmail || !msg.triggerDate || !msg.content) {
        console.warn('Skipping invalid message (missing userId, recipientEmail, triggerDate, or content):', msg);
        continue;
      }

      // Encrypt the open text
      const { encryptedContent, iv, authTag } = cryptoService.encrypt(msg.content);

      // Create new message document
      const newMessage = new messageModel({
        userId: msg.userId,
        recipientEmail: msg.recipientEmail,
        triggerDate: new Date(msg.triggerDate),
        encryptedContent,
        iv,
        authTag,
        status: msg.status || MessageStatus.PENDING,
        importBatchId: batchId,
      });

      const savedMessage = await newMessage.save();

      // Перезаписываем createdAt на дату из JSON,
      // чтобы в интерфейсе письмо отображалось как написанное в прошлом.
      // Схема использует timestamps: true, поэтому createdAt устанавливается
      // автоматически как Date.now() — после save() мы его перезаписываем через $set.
      const displayDate = new Date(msg.createdAt || msg.triggerDate);
      await messageModel.updateOne(
        { _id: savedMessage._id },
        { $set: { createdAt: displayDate } },
      );

      // Добавляем задачу в BullMQ-очередь с нарастающей задержкой,
      // чтобы письма приходили по одному с интервалом.
      const delay = BASE_DELAY_MS + (i * STAGGER_MS);
      await emailQueue.add(
        'send-email',
        { messageId: savedMessage._id.toString() },
        {
          delay,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );

      const deliverySeconds = Math.round(delay / 1000);
      console.log(
        `  Message ${i + 1}: saved → delivery in ~${deliverySeconds >= 60 ? `${Math.floor(deliverySeconds / 60)}m ${deliverySeconds % 60}s` : `${deliverySeconds}s`}`,
      );

      successCount++;
    }

    console.log(`\nSuccessfully imported ${successCount} messages (batch: ${batchId}).`);
    console.log(`Rollback: ts-node src/scripts/rollback-import.ts ${batchId}`);
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
