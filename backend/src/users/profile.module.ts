import { Module } from "@nestjs/common";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { UsersModule } from "../users/users.module";
import { EmailModule } from "../email/email.module";
import { AuthModule } from "../auth/auth.module";
import { TelegramModule } from "../auth/telegram.module";

@Module({
    imports: [UsersModule, EmailModule, AuthModule, TelegramModule],
    controllers: [ProfileController],
    providers: [ProfileService],
})
export class ProfileModule {}
