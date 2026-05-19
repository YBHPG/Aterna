import { Injectable, BadRequestException, UnauthorizedException, Logger } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { EmailService } from "../email/email.service";
import { AuthService } from "../auth/auth.service";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { UpdateEmailDto } from "./dto/update-email.dto";
import { TelegramAuthDto } from "../auth/dto/telegram-auth.dto";
import { UpdateNameDto } from "./dto/update-name.dto";
import { TelegramService } from "../auth/telegram.service";

@Injectable()
export class ProfileService {
    private readonly logger = new Logger(ProfileService.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly emailService: EmailService,
        private readonly authService: AuthService,
        private readonly telegramService: TelegramService,
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

    public async requestPasswordOtp(userId: string, fallbackToEmail: boolean = false) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException("Пользователь не найден");

        // Генерируем 6-значный код
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Сохраняем код и время жизни (10 минут).
        // ВНИМАНИЕ: Вам нужно добавить эти поля в сущность User (user.entity.ts)!
        (user as any).passwordChangeOtp = otp;
        (user as any).passwordChangeOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await this.usersService.save(user);

        let sentVia = "email";

        if (user.telegramId && !fallbackToEmail) {
            try {
                // ВНИМАНИЕ: Убедитесь, что у вас есть метод sendMessage в TelegramService
                await this.telegramService.sendMessage(
                    user.telegramId,
                    `Ваш код для смены пароля: *${otp}*`,
                );
                sentVia = "telegram";
            } catch (e) {
                // Фоллбэк на почту, если Telegram недоступен
                await (this.emailService as any).sendPasswordChangeOtp(user.email, otp);
            }
        } else {
            await (this.emailService as any).sendPasswordChangeOtp(user.email, otp);
        }

        return { sentVia };
    }

    public async updatePassword(userId: string, dto: UpdatePasswordDto & { otp?: string }) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException("Пользователь не найден");

        const savedOtp = String(user.passwordChangeOtp || "").trim();
        const inputOtp = String(dto.otp || "").trim();

        this.logger.debug(`[updatePassword] Сравнение кодов OTP для пользователя ${userId}`);
        this.logger.debug(
            `[updatePassword] Код из базы (savedOtp): '${savedOtp}' (длина: ${savedOtp.length})`,
        );
        this.logger.debug(
            `[updatePassword] Код из запроса (inputOtp): '${inputOtp}' (длина: ${inputOtp.length})`,
        );

        if (!savedOtp || savedOtp !== inputOtp) {
            throw new BadRequestException("Неверный код подтверждения");
        }
        if (
            (user as any).passwordChangeOtpExpires &&
            new Date() > (user as any).passwordChangeOtpExpires
        ) {
            throw new BadRequestException("Время действия кода истекло");
        }

        if (user.passwordHash) {
            if (!dto.oldPassword) throw new BadRequestException("Введите текущий пароль");
            const isMatch = await bcrypt.compare(dto.oldPassword, user.passwordHash);
            if (!isMatch) throw new BadRequestException("Неверный текущий пароль");
        }

        const saltRounds = 10;
        user.passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);
        (user as any).passwordChangeOtp = null;
        (user as any).passwordChangeOtpExpires = null;
        await this.usersService.save(user);

        return this.authService.login(user);
    }

    public async updateEmail(userId: string, dto: UpdateEmailDto) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException("Пользователь не найден");

        const newEmail = dto.email.toLowerCase();
        if (user.email === newEmail) return this.authService.login(user);

        const existingUser = await this.usersService.findByEmail(newEmail);
        if (existingUser) throw new BadRequestException("Этот email уже используется");

        user.pendingEmail = newEmail;
        user.emailConfirmationToken = crypto.randomBytes(32).toString("hex");

        await this.usersService.save(user);

        try {
            await this.emailService.sendConfirmationEmail(newEmail, user.emailConfirmationToken);
        } catch (error) {
            this.logger.error("Failed to send email confirmation:", error);
            throw new BadRequestException("Не удалось отправить письмо с подтверждением");
        }

        return this.authService.login(user);
    }

    public async resendConfirmationEmail(userId: string) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException("Пользователь не найден");

        const targetEmail = user.pendingEmail || user.email;

        if (user.isEmailConfirmed && !user.pendingEmail) {
            throw new BadRequestException("Email уже подтвержден");
        }

        if (!targetEmail || targetEmail.endsWith("@telegram.local")) {
            throw new BadRequestException("Нет валидного email для подтверждения");
        }

        user.emailConfirmationToken = crypto.randomBytes(32).toString("hex");
        await this.usersService.save(user);

        try {
            await this.emailService.sendConfirmationEmail(targetEmail, user.emailConfirmationToken);
        } catch (error) {
            this.logger.error("Failed to resend email confirmation:", error);
            throw new BadRequestException("Не удалось отправить письмо");
        }

        return { message: "Письмо отправлено" };
    }

    public async unlinkTelegram(userId: string) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException("Пользователь не найден");

        if (
            !user.email ||
            user.email.endsWith("@telegram.local") ||
            !user.isEmailConfirmed ||
            !user.passwordHash
        ) {
            throw new BadRequestException(
                "Чтобы отвязать Telegram, необходимо добавить email, подтвердить его и установить пароль",
            );
        }

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
