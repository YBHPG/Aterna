import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CryptoService } from '../crypto/crypto.service';
import { getModelToken } from '@nestjs/mongoose';
import { Message, MessageStatus } from '../database/schemas/message.schema';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // Create application context instead of a full web server
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const cryptoService = app.get(CryptoService);
  const messageModel = app.get<Model<Message>>(getModelToken(Message.name));

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

    for (const msg of messages) {
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

      await newMessage.save();
      successCount++;
    }

    console.log(`Successfully imported ${successCount} messages.`);
    console.log(`If you need to rollback, run: ts-node src/scripts/rollback-import.ts ${batchId}`);
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
