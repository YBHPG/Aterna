import { Controller, Patch, Delete, Post, Body, Get } from "@nestjs/common";
import { ProfileService } from "./profile.service";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { UpdateEmailDto } from "./dto/update-email.dto";
import { TelegramAuthDto } from "../auth/dto/telegram-auth.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("profile")
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @Patch("password")
    public async updatePassword(@CurrentUser() user: any, @Body() dto: UpdatePasswordDto) {
        await this.profileService.updatePassword(user.userId, dto);
        return { message: "Пароль успешно изменен" };
    }

    @Patch("email")
    public async updateEmail(@CurrentUser() user: any, @Body() dto: UpdateEmailDto) {
        await this.profileService.updateEmail(user.userId, dto);
        return {
            message: "Email обновлен. Пожалуйста, проверьте почту для подтверждения нового адреса.",
        };
    }

    @Delete("telegram")
    public async unlinkTelegram(@CurrentUser() user: any) {
        await this.profileService.unlinkTelegram(user.userId);
        return { message: "Telegram успешно отвязан" };
    }

    @Get("telegram-link")
    public async getTelegramLink(@CurrentUser() user: any) {
        const link = await this.profileService.generateTelegramLink(user.userId);
        return { link };
    }

    @Post("telegram")
    public async linkTelegram(@CurrentUser() user: any, @Body() dto: TelegramAuthDto) {
        await this.profileService.linkTelegram(user.userId, dto);
        return { message: "Telegram успешно привязан" };
    }
}
