import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Message, MessageDocument, MessageStatus } from "../database/schemas/message.schema";
import { CryptoService } from "../crypto/crypto.service";
import { Logger } from "@nestjs/common";
import { EmailService } from "../email/email.service";
import { UsersService } from "../users/users.service";

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
            const { encryptedContent, iv, authTag, recipientEmail, userId } = message;

            const user = await this.usersService.findById(userId);

            const decryptedContent = this.cryptoService.decrypt(encryptedContent, iv, authTag);

            const preview =
                decryptedContent.length > 100
                    ? decryptedContent.substring(0, 100) + "..."
                    : decryptedContent;

            const link = `${process.env.FRONTEND_URL}/messages/${messageId}`;

            await this.emailService.sendNotificationEmail(
                recipientEmail,
                user?.firstName,
                (message as any).createdAt,
                preview,
                link,
            );
            this.logger.log(`Email sent for message ${messageId}.`);

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
