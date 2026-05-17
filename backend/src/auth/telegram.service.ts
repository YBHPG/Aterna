import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom } from "rxjs";
import { UsersService } from "../users/users.service";

@Injectable()
export class TelegramService {
    private readonly logger = new Logger(TelegramService.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly usersService: UsersService,
    ) {}

    async sendNotification(telegramId: string, text: string, dashboardUrl: string): Promise<void> {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            this.logger.warn("TELEGRAM_BOT_TOKEN не настроен. Пропуск отправки.");
            return;
        }

        const messageToSend = text.length <= 4000 ? text : text.substring(0, 4000) + "...";

        const replyMarkup = {
            inline_keyboard: [[{ text: "Перейти к письмам", url: dashboardUrl }]],
        };

        try {
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            await lastValueFrom(
                this.httpService.post(url, {
                    chat_id: telegramId,
                    text: messageToSend,
                    reply_markup: replyMarkup,
                }),
            );
            this.logger.log(`[Telegram] Отправка уведомления для ${telegramId} выполнена успешно`);
        } catch (error: any) {
            this.logger.error(
                `Ошибка при отправке сообщения в Telegram (${telegramId}): ${error.message}`,
            );
        }
    }

    async sendMessage(chatId: string, text: string): Promise<void> {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            this.logger.warn("TELEGRAM_BOT_TOKEN не настроен. Пропуск отправки.");
            return;
        }

        try {
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            await lastValueFrom(
                this.httpService.post(url, {
                    chat_id: chatId,
                    text: text,
                    parse_mode: "Markdown",
                }),
            );
            this.logger.log(`[Telegram] Сообщение отправлено ${chatId}`);
        } catch (error: any) {
            this.logger.error(
                `Ошибка при отправке сообщения в Telegram (${chatId}): ${error.message}`,
            );
        }
    }

    async handleWebhook(update: any): Promise<void> {
        if (!update?.message?.text) return;

        const text = update.message.text;
        const chatId = update.message.chat.id;

        // Ловим команду /start <token>
        if (text.startsWith("/start ")) {
            const token = text.split(" ")[1];
            if (token) {
                const user = await this.usersService.findByTelegramConnectionToken(token);
                if (user) {
                    user.telegramId = chatId.toString();
                    user.telegramConnectionToken = null as any; // Очищаем токен после успешной привязки
                    await this.usersService.save(user);

                    await this.sendNotification(
                        chatId.toString(),
                        "✅ Ваш Telegram успешно привязан к аккаунту Aterna!",
                        `${process.env.FRONTEND_URL}/dashboard`,
                    );
                } else {
                    await this.sendNotification(
                        chatId.toString(),
                        "❌ Ссылка для привязки недействительна или устарела. Попробуйте сгенерировать новую в профиле.",
                        `${process.env.FRONTEND_URL}`,
                    );
                }
            }
        }
    }
}
