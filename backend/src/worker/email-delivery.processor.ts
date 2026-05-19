import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Message, MessageDocument, MessageStatus } from "../database/schemas/message.schema";
import { CryptoService } from "../crypto/crypto.service";
import { Logger } from "@nestjs/common";
import { EmailService } from "../email/email.service";
import { UsersService } from "../users/users.service";
import { TelegramService } from "../auth/telegram.service";

@Processor("email-delivery-queue", {
    limiter: {
        max: 10,
        duration: 1000,
    },
})
export class EmailDeliveryProcessor extends WorkerHost {
    private readonly logger = new Logger(EmailDeliveryProcessor.name);

    constructor(
        @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
        private readonly cryptoService: CryptoService,
        private readonly emailService: EmailService,
        private readonly usersService: UsersService,
        private readonly telegramService: TelegramService,
    ) {
        super();
    }

    async process(job: Job<{ messageId: string }>): Promise<void> {
        const { messageId } = job.data;

        if (!messageId) {
            this.logger.warn(`No messageId provided in job ${job.id}`);
            return;
        }

        const message = await this.messageModel.findById(messageId);

        if (!message) {
            this.logger.warn(`Message with id ${messageId} not found`);
            return;
        }

        if (message.status === MessageStatus.CANCELLED) {
            this.logger.log(`Message ${messageId} was cancelled. Skipping delivery.`);
            return;
        }

        try {
            let { encryptedContent, iv, authTag, recipientEmail, userId } = message;

            const user = await this.usersService.findById(userId);

            let decryptedContent = this.cryptoService.decrypt(encryptedContent, iv, authTag);

            const link = `${process.env.FRONTEND_URL}`;
            const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;

            let sendEmail = false;
            let sendTelegram = false;

            if (recipientEmail === "telegram") {
                sendTelegram = !!user?.telegramId;
            } else if (recipientEmail === "both") {
                sendTelegram = !!user?.telegramId;
                sendEmail = user?.isEmailConfirmed === true;
            } else if (recipientEmail === "email") {
                sendEmail = user?.isEmailConfirmed === true;
            } else {
                // Поддержка старых сообщений, где был указан точный email
                if (recipientEmail && !recipientEmail.endsWith("@telegram.local")) {
                    sendEmail = user?.isEmailConfirmed === true;
                }
                if (user?.telegramId) {
                    sendTelegram = true;
                }
            }

            if (sendEmail) {
                const targetEmail = user?.email || recipientEmail;
                if (targetEmail && !targetEmail.endsWith("@telegram.local")) {
                    await this.emailService.sendNotificationEmail(
                        targetEmail,
                        user?.firstName,
                        (message as any).createdAt,
                        decryptedContent,
                        link,
                    );
                    this.logger.log(`Email sent for message ${messageId}.`);
                } else {
                    this.logger.warn(
                        `User ${userId} has unconfirmed or dummy email. Skipping email delivery.`,
                    );
                }
            } else {
                this.logger.log(`Skipping email delivery for message ${messageId}.`);
            }

            if (sendTelegram) {
                const telegramText = `У вас новое письмо из прошлого!\n\n${decryptedContent}`;
                await this.telegramService.sendNotification(
                    user?.telegramId as string,
                    telegramText,
                    dashboardUrl,
                );
                this.logger.log(`Telegram notification sent for message ${messageId}.`);
            } else if (user?.telegramId) {
                this.logger.log(
                    `Skipping Telegram delivery for message ${messageId} due to recipientEmail setting.`,
                );
            }

            // Уничтожение расшифрованного текста из памяти сразу после рассылки (безопасность)
            decryptedContent = "";

            message.status = MessageStatus.SENT;
            await message.save();
        } catch (error) {
            this.logger.error(
                `Failed to process message ${messageId}`,
                error instanceof Error ? error.stack : String(error),
            );
            message.status = MessageStatus.ERROR;
            await message.save();
        }
    }
}
