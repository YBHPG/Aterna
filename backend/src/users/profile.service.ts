import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { EmailService } from "../email/email.service";
import { AuthService } from "../auth/auth.service";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { UpdateEmailDto } from "./dto/update-email.dto";
import { TelegramAuthDto } from "../auth/dto/telegram-auth.dto";

@Injectable()
export class ProfileService {
    constructor(
        private readonly usersService: UsersService,
        private readonly emailService: EmailService,
        private readonly authService: AuthService,
    ) {}

    public async updatePassword(userId: string, dto: UpdatePasswordDto) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException("Пользователь не найден");
        if (!user.passwordHash) {
            throw new BadRequestException(
                "У этого аккаунта не задан пароль (возможно, регистрация через Telegram).",
            );
        }

        const isMatch = await bcrypt.compare(dto.oldPassword, user.passwordHash);
        if (!isMatch) throw new BadRequestException("Неверный текущий пароль");

        const saltRounds = 10;
        user.passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);
        return this.usersService.save(user);
    }

    public async updateEmail(userId: string, dto: UpdateEmailDto) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException("Пользователь не найден");

        const newEmail = dto.email.toLowerCase();
        if (user.email === newEmail) return user;

        const existingUser = await this.usersService.findByEmail(newEmail);
        if (existingUser) throw new BadRequestException("Этот email уже используется");

        user.email = newEmail;
        user.isEmailConfirmed = false;
        user.emailConfirmationToken = crypto.randomBytes(32).toString("hex");

        await this.usersService.save(user);
        await this.emailService.sendConfirmationEmail(user.email, user.emailConfirmationToken);

        return user;
    }

    public async unlinkTelegram(userId: string) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException("Пользователь не найден");

        user.telegramId = null;
        return this.usersService.save(user);
    }

    public async linkTelegram(userId: string, dto: TelegramAuthDto) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken)
            throw new Error("Telegram bot token is not configured in environment variables");

        const isValid = this.authService.verifyTelegramAuthorization(dto, botToken);
        if (!isValid) throw new BadRequestException("Неверная подпись Telegram");

        const existingUser = await this.usersService.findByTelegramId(dto.id.toString());
        if (existingUser && existingUser.id !== userId) {
            throw new BadRequestException(
                "Этот Telegram аккаунт уже привязан к другому пользователю",
            );
        }

        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException("Пользователь не найден");

        user.telegramId = dto.id.toString();
        return this.usersService.save(user);
    }
}
