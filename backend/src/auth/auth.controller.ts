import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    Get,
    Query,
    BadRequestException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { AuthDto } from "./dto/auth.dto";
import { Public } from "./decorators/public.decorator";
import { TelegramAuthDto } from "./dto/telegram-auth.dto";

@Controller("auth")
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly usersService: UsersService,
    ) {}

    @Public()
    @Post("register")
    async register(@Body() authDto: AuthDto) {
        return this.authService.register(authDto.email, authDto.password, authDto.firstName);
    }

    @Public()
    @Get("confirm")
    async confirmEmail(@Query("token") token: string) {
        if (!token) {
            throw new BadRequestException("Требуется токен подтверждения");
        }
        // Подтверждаем пользователя и сразу возвращаем JWT токен для автовхода
        const user = await this.authService.confirmEmail(token);
        return this.authService.login(user);
    }

    @Public()
    @Post("resend-confirmation")
    async resendConfirmationEmail(@Body("email") email: string) {
        if (!email) {
            throw new BadRequestException("Требуется email");
        }
        return this.authService.resendConfirmationEmailPublic(email);
    }

    @Public()
    @Post("forgot-password")
    async forgotPassword(@Body("email") email: string) {
        if (!email) throw new BadRequestException("Требуется email");
        return this.authService.forgotPassword(email);
    }

    @Public()
    @Post("reset-password")
    async resetPassword(
        @Body("email") email: string,
        @Body("otp") otp: string,
        @Body("newPassword") newPassword: string,
    ) {
        if (!email || !otp || !newPassword) throw new BadRequestException("Переданы не все данные");
        if (newPassword.length < 6)
            throw new BadRequestException("Минимальная длина пароля 6 символов");
        return this.authService.resetPassword(email, otp, newPassword);
    }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post("login")
    async login(@Body() authDto: AuthDto) {
        const user = await this.authService.validateUser(authDto.email, authDto.password);
        return this.authService.login(user);
    }

    @Public()
    @Post("telegram")
    async loginWithTelegram(@Body() dto: TelegramAuthDto) {
        return this.authService.loginWithTelegram(dto);
    }
}
