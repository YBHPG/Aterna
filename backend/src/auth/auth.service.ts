import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    ForbiddenException,
} from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { EmailService } from "../email/email.service";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { TelegramAuthDto } from "./dto/telegram-auth.dto";

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly emailService: EmailService,
    ) {}

    async register(email: string, passwordPlain?: string, firstName?: string) {
        const existingUser = await this.usersService.findByEmail(email);
        if (existingUser) {
            throw new BadRequestException("Пользователь с таким email уже существует");
        }

        const user = await this.usersService.create(email, passwordPlain, firstName);

        if (!user.emailConfirmationToken) {
            user.emailConfirmationToken = crypto.randomBytes(32).toString("hex");
            await this.usersService.save(user);
        }

        try {
            await this.emailService.sendConfirmationEmail(user.email, user.emailConfirmationToken);
        } catch (error) {
            console.error("Failed to send confirmation email during registration:", error);
        }

        // Убрали автоматический логин. Теперь пользователь должен подтвердить почту.
        return { message: "Регистрация успешна. Подтвердите email." };
    }

    async confirmEmail(token: string): Promise<any> {
        const user = await this.usersService.findByEmailConfirmationToken(token);
        if (!user) {
            throw new BadRequestException("Неверный или просроченный токен подтверждения");
        }
        if (user.pendingEmail) {
            user.email = user.pendingEmail;
            user.pendingEmail = null;
        }
        return this.usersService.confirmEmail(user);
    }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException("Неверный email или пароль");
        }

        const isPasswordValid = await bcrypt.compare(pass, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException("Неверный email или пароль");
        }

        if (user.isEmailConfirmed === false && !user.email.endsWith("@telegram.local")) {
            throw new ForbiddenException({
                message: "Email не подтвержден",
                unconfirmedEmail: true,
                email: user.email,
            });
        }

        return user;
    }

    async resendConfirmationEmailPublic(email: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new BadRequestException("Пользователь не найден");
        }
        if (user.isEmailConfirmed) {
            throw new BadRequestException("Email уже подтвержден");
        }

        user.emailConfirmationToken = crypto.randomBytes(32).toString("hex");
        await this.usersService.save(user);
        await this.emailService.sendConfirmationEmail(user.email, user.emailConfirmationToken);

        return { message: "Письмо отправлено" };
    }

    async forgotPassword(email: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new BadRequestException("Пользователь с таким email не найден");
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        (user as any).passwordChangeOtp = otp;
        (user as any).passwordChangeOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await this.usersService.save(user);

        try {
            await this.emailService.sendPasswordChangeOtp(user.email, otp);
        } catch (error) {
            console.error("Failed to send OTP email during forgot password:", error);
            throw new BadRequestException("Не удалось отправить код на почту");
        }

        return { message: "Код отправлен на почту" };
    }

    async resetPassword(email: string, otp: string, newPassword: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) throw new BadRequestException("Неверный email или код");

        const savedOtp = String((user as any).passwordChangeOtp || "").trim();
        const inputOtp = String(otp || "").trim();

        if (!savedOtp || savedOtp !== inputOtp) {
            throw new BadRequestException("Неверный код подтверждения");
        }

        if (
            (user as any).passwordChangeOtpExpires &&
            new Date() > (user as any).passwordChangeOtpExpires
        ) {
            throw new BadRequestException("Время действия кода истекло");
        }

        const saltRounds = 10;
        user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
        (user as any).passwordChangeOtp = null;
        (user as any).passwordChangeOtpExpires = null;

        // Если юзер подтвердил свою почту через код сброса, автоматически снимаем флаг неподтвержденной почты
        if (!user.isEmailConfirmed) {
            user.isEmailConfirmed = true;
        }
        await this.usersService.save(user);

        return this.login(user);
    }

    async login(user: any) {
        const payload = {
            email: user.email,
            sub: user.id,
            firstName: user.firstName,
            telegramId: user.telegramId,
            hasPassword: !!user.passwordHash,
            isEmailConfirmed: user.isEmailConfirmed,
            pendingEmail: user.pendingEmail || null,
        };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    public verifyTelegramAuthorization(data: TelegramAuthDto, botToken: string): boolean {
        const { hash, ...userData } = data;

        // Сортируем ключи по алфавиту и собираем строку проверки
        const dataCheckString = Object.keys(userData)
            .filter((key) => (userData as any)[key] !== undefined)
            .sort()
            .map((key) => `${key}=${(userData as any)[key]}`)
            .join("\n");

        // Ключ - это SHA256 от токена бота
        const secretKey = crypto.createHash("sha256").update(botToken).digest();

        // HMAC-SHA-256 от строки проверки
        const calculatedHash = crypto
            .createHmac("sha256", secretKey)
            .update(dataCheckString)
            .digest("hex");

        return calculatedHash === hash;
    }

    public async loginWithTelegram(data: TelegramAuthDto) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            throw new Error("Telegram bot token is not configured in environment variables");
        }

        const isValid = this.verifyTelegramAuthorization(data, botToken);
        if (!isValid) {
            throw new UnauthorizedException(
                "Invalid Telegram authorization data (hash verification failed)",
            );
        }

        let user = await this.usersService.findByTelegramId(data.id.toString());

        if (!user) {
            const dummyEmail = `${data.id}@telegram.local`;
            user = await this.usersService.create(
                dummyEmail,
                undefined,
                data.first_name,
                data.id.toString(),
            );
        } else {
            if (user.isEmailConfirmed === false && !user.email.endsWith("@telegram.local")) {
                throw new ForbiddenException({
                    message: "Email не подтвержден",
                    unconfirmedEmail: true,
                    email: user.email,
                });
            }
        }

        return this.login(user);
    }
}
