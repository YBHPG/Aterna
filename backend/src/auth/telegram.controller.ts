import { Controller, Post, Body } from "@nestjs/common";
import { TelegramService } from "./telegram.service";
import { Public } from "./decorators/public.decorator";

@Controller("telegram")
export class TelegramController {
    constructor(private readonly telegramService: TelegramService) {}

    @Public() // Вебхук должен быть доступен без JWT-токена
    @Post("webhook")
    async handleWebhook(@Body() update: any) {
        await this.telegramService.handleWebhook(update);
        return "OK"; // Всегда отвечаем 200 OK, чтобы Telegram не повторял запросы
    }
}
