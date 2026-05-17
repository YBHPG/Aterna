import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import * as Joi from "joi";
import { PostgresModule } from "./database/postgres.module";
import { MongoModule } from "./database/mongo.module";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { CryptoModule } from "./crypto/crypto.module";
import { MessagesModule } from "./messages/messages.module";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { BullModule } from "@nestjs/bullmq";
import { ProfileModule } from "./users/profile.module";
import { TelegramModule } from "./auth/telegram.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                POSTGRES_URI: Joi.string().required(),
                MONGODB_URI: Joi.string().required(),
                POSTGRES_USER: Joi.string().required(),
                POSTGRES_PASSWORD: Joi.string().required(),
                POSTGRES_DB: Joi.string().required(),
                MONGO_INITDB_ROOT_USERNAME: Joi.string().required(),
                MONGO_INITDB_ROOT_PASSWORD: Joi.string().required(),
                JWT_SECRET: Joi.string().required(),
                ENCRYPTION_KEY: Joi.string().required(),
                REDIS_HOST: Joi.string().required(),
                REDIS_PORT: Joi.number().required(),
            }),
        }),
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                connection: {
                    host: configService.get<string>("REDIS_HOST"),
                    port: configService.get<number>("REDIS_PORT"),
                },
            }),
            inject: [ConfigService],
        }),
        PostgresModule,
        MongoModule,
        UsersModule,
        AuthModule,
        CryptoModule,
        MessagesModule,
        ProfileModule,
        TelegramModule,
    ],
    controllers: [],
    providers: [
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ],
})
export class AppModule {}
