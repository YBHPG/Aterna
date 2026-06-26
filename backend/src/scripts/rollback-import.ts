import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Message } from '../database/schemas/message.schema';
import { Model } from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const messageModel = app.get<Model<Message>>(getModelToken(Message.name));

  const batchId = process.argv[2];
  if (!batchId) {
    console.error('Usage: ts-node src/scripts/rollback-import.ts <batch-id>');
    await app.close();
    process.exit(1);
  }

  console.log(`Rolling back import for Batch ID: ${batchId}`);

  try {
    const result = await messageModel.deleteMany({ importBatchId: batchId });
    console.log(`Successfully deleted ${result.deletedCount} messages from batch ${batchId}.`);
  } catch (error) {
    console.error('Rollback failed:', error);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
