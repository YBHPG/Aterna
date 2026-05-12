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

            const link = `${process.env.FRONTEND_URL}/messages/${messageId}`;
            const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;

            if (recipientEmail) {
                if (user?.isEmailConfirmed === true) {
                    await this.emailService.sendNotificationEmail(
                        recipientEmail,
                        user.firstName,
                        (message as any).createdAt,
                        decryptedContent,
                        link,
                    );
                    this.logger.log(`Email sent for message ${messageId}.`);
                } else {
                    this.logger.warn(
                        `User ${userId} has unconfirmed email or not found. Skipping email delivery.`,
                    );
                }
            }

            if (user?.telegramId) {
                const telegramText = `У вас новое письмо из прошлого!\n\n${decryptedContent}`;
                await this.telegramService.sendNotification(
                    user.telegramId,
                    telegramText,
                    dashboardUrl,
                );
                this.logger.log(`Telegram notification sent for message ${messageId}.`);
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
