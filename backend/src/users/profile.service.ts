import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { EmailService } from "../email/email.service";
import { AuthService } from "../auth/auth.service";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { UpdateEmailDto } from "./dto/update-email.dto";
import { TelegramAuthDto } from "../auth/dto/telegram-auth.dto";
import { UpdateNameDto } from "./dto/update-name.dto";

@Injectable()
export class ProfileService {
    constructor(
        private readonly usersService: UsersService,
        private readonly emailService: EmailService,
        private readonly authService: AuthService,
    ) {}

    public async getMe(userId: string) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException("Пользователь не найден");
        return this.authService.login(user);
    }

    public async updateName(userId: string, dto: UpdateNameDto) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException("Пользователь не найден");

        // Убираем возможные HTML-теги для защиты от базового XSS
        const sanitizedName = dto.firstName.replace(/<[^>]*>?/gm, "").trim();

        user.firstName = sanitizedName;
        await this.usersService.save(user);

        // Сразу генерируем и возвращаем новый JWT токен, чтобы фронтенд его подхватил
        return this.authService.login(user);
    }

    public async updatePassword(userId: string, dto: UpdatePasswordDto) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException("Пользователь не найден");

        if (user.passwordHash) {
            if (!dto.oldPassword) throw new BadRequestException("Введите текущий пароль");
            const isMatch = await bcrypt.compare(dto.oldPassword, user.passwordHash);
            if (!isMatch) throw new BadRequestException("Неверный текущий пароль");
        }

        const saltRounds = 10;
        user.passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);
        await this.usersService.save(user);

        return this.authService.login(user);
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
        await this.usersService.save(user);

        return this.authService.login(user);
    }

    public async generateTelegramLink(userId: string): Promise<string> {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException("Пользователь не найден");

        // Генерируем уникальный токен из 32 символов (Telegram поддерживает payload до 64 символов)
        const token = crypto.randomBytes(16).toString("hex");
        user.telegramConnectionToken = token;
        await this.usersService.save(user);

        const botName = process.env.TELEGRAM_BOT_NAME || "Aterna_Bot"; // Укажите юзернейм вашего бота в .env (без @)
        return `https://t.me/${botName}?start=${token}`;
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
