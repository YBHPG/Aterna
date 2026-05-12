import { Module } from "@nestjs/common";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { UsersModule } from "../users/users.module";
import { EmailModule } from "../email/email.module";
import { AuthModule } from "../auth/auth.module";

@Module({
    imports: [UsersModule, EmailModule, AuthModule],
    controllers: [ProfileController],
    providers: [ProfileService],
})
export class ProfileModule {}
