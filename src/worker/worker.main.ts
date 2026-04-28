import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  console.log('Worker process initialized and running...');
  // The application context initializes all providers, 
  // establishing DB connections and starting BullMQ workers
  
  // We can gracefully handle shutdowns if needed
  app.enableShutdownHooks();
  await app.init();
}
bootstrap();
