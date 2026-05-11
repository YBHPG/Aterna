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
        await this.authService.confirmEmail(token);
        return { message: "Email успешно подтвержден" };
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
