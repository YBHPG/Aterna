import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class TelegramService {
    private readonly logger = new Logger(TelegramService.name);

    async sendNotification(telegramId: string, message: string): Promise<void> {
        this.logger.log(`[Telegram] Отправка уведомления для ${telegramId}: ${message}`);
    }
}
