import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import * as Joi from "joi";
import { MongoModule } from "./database/mongo.module";
import { CryptoModule } from "./crypto/crypto.module";
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from './database/schemas/message.schema';
import { EmailDeliveryProcessor } from './worker/email-delivery.processor';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                MONGODB_URI: Joi.string().required(),
                MONGO_INITDB_ROOT_USERNAME: Joi.string().required(),
                MONGO_INITDB_ROOT_PASSWORD: Joi.string().required(),
                ENCRYPTION_KEY: Joi.string().required(),
                REDIS_HOST: Joi.string().required(),
                REDIS_PORT: Joi.number().required(),
                POSTGRES_URI: Joi.string().required(),
                POSTGRES_USER: Joi.string().required(),
                POSTGRES_PASSWORD: Joi.string().required(),
                POSTGRES_DB: Joi.string().required(),
                JWT_SECRET: Joi.string().required(),
            }),
        }),
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                connection: {
                    host: configService.get<string>('REDIS_HOST'),
                    port: configService.get<number>('REDIS_PORT'),
                },
            }),
            inject: [ConfigService],
        }),
        MongoModule,
        CryptoModule,
        MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
        BullModule.registerQueue({ name: 'email-delivery-queue' }),
    ],
    providers: [EmailDeliveryProcessor],
})
export class WorkerModule {}
