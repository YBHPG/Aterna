import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: "postgres",
                url: configService.get<string>("POSTGRES_URI"),
                autoLoadEntities: true,
                synchronize: true, // Внимание: для production среды рекомендуется использовать миграции и отключать этот флаг
            }),
        }),
    ],
})
export class PostgresModule {}
