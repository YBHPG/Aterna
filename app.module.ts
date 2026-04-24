import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import * as Joi from "joi";
import { PostgresModule } from "./src/database/postgres.module";
import { MongoModule } from "./src/database/mongo.module";
import { UsersModule } from "./src/users/users.module";
import { AuthModule } from "./src/auth/auth.module";
import { CryptoModule } from "./src/crypto/crypto.module";
import { MessagesModule } from "./src/messages/messages.module";
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './src/auth/jwt-auth.guard';

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
            }),
        }),
        PostgresModule,
        MongoModule,
        UsersModule,
        AuthModule,
        CryptoModule,
        MessagesModule,
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
