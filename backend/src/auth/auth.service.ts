import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { TelegramAuthDto } from "./dto/telegram-auth.dto";

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
    ) {}

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException("Неверный email или пароль");
        }

        const isPasswordValid = await bcrypt.compare(pass, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException("Неверный email или пароль");
        }

        const { passwordHash, ...result } = user;
        return result;
    }

    async login(user: any) {
        const payload = { email: user.email, sub: user.id };
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
                undefined,
            );
        }

        return this.login(user);
    }
}
