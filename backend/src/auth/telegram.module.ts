import { Module } from "@nestjs/common";
import { TelegramService } from "./telegram.service";
import { HttpModule } from "@nestjs/axios";
import { UsersModule } from "../users/users.module";
import { TelegramController } from "./telegram.controller";

@Module({
    imports: [HttpModule, UsersModule],
    controllers: [TelegramController],
    providers: [TelegramService],
    exports: [TelegramService],
})
export class TelegramModule {}
