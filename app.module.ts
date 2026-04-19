import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import * as Joi from "joi";
import { PostgresModule } from "./src/database/postgres.module";
import { MongoModule } from "./src/database/mongo.module";

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
            }),
        }),
        PostgresModule,
        MongoModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
