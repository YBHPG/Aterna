import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Model } from "mongoose";
import { CryptoService } from "../crypto/crypto.service";
import { Message, MessageDocument, MessageStatus } from "../database/schemas/message.schema";
import { CreateMessageDto } from "./dto/create-message.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";

@Injectable()
export class MessagesService {
    constructor(
        @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
        private readonly cryptoService: CryptoService,
        @InjectQueue("email-delivery-queue") private readonly emailQueue: Queue,
    ) {}

    async create(
        userId: string,
        userEmail: string,
        dto: CreateMessageDto,
    ): Promise<MessageDocument> {
        // Шифруем открытый текст
        const { encryptedContent, iv, authTag } = this.cryptoService.encrypt(dto.content);

        // Требование безопасности: немедленно перезаписываем открытый текст в памяти
        // после завершения операции шифрования
        (dto as unknown as Record<string, unknown>).content = "";

        // Сохраняем криптоконтейнер и метаданные в MongoDB
        const message = new this.messageModel({
            userId,
            recipientEmail: userEmail,
            triggerDate: dto.triggerDate,
            encryptedContent,
            iv,
            authTag,
        });

        const savedMessage = await message.save();

        // 8.4: Вычисляем задержку в миллисекундах
        const delay = dto.triggerDate.getTime() - Date.now();

        // 8.5: Публикуем задачу в очередь, передавая только ID документа
        await this.emailQueue.add(
            "send-email",
            { messageId: savedMessage._id.toString() },
            {
                delay,
                attempts: 3,
                backoff: { type: "exponential", delay: 5000 },
            },
        );

        return savedMessage;
    }
    async findAllByUser(userId: string): Promise<MessageDocument[]> {
        return this.messageModel.find({ userId }).select("-encryptedContent -iv -authTag").exec();
    }

    async update(id: string, userId: string, dto: UpdateMessageDto): Promise<MessageDocument> {
        const message = await this.messageModel.findById(id).exec();

        if (!message) {
            throw new NotFoundException("Message not found");
        }

        if (message.userId !== userId) {
            throw new ForbiddenException("You do not have permission to edit this message");
        }

        if (message.status !== MessageStatus.PENDING) {
            throw new ForbiddenException("Можно редактировать только письма в статусе pending");
        }

        const createdAt = (message as any).createdAt;
        if (createdAt && Date.now() - createdAt.getTime() > 24 * 60 * 60 * 1000) {
            throw new ForbiddenException("Время на редактирование истекло");
        }

        const { encryptedContent, iv, authTag } = this.cryptoService.encrypt(dto.content);

        // Требование безопасности: немедленно перезаписываем открытый текст в памяти
        (dto as unknown as Record<string, unknown>).content = "";

        message.encryptedContent = encryptedContent;
        message.iv = iv;
        message.authTag = authTag;

        return message.save();
    }

    async cancel(id: string, userId: string): Promise<MessageDocument> {
        const document = await this.messageModel.findById(id).exec();

        if (!document) {
            throw new NotFoundException("Message not found");
        }

        if (document.userId !== userId) {
            throw new ForbiddenException("You do not have permission to cancel this message");
        }

        if (document.status === MessageStatus.PENDING) {
            document.status = MessageStatus.CANCELLED;
            await document.save();
        }

        return document;
    }

    async findByIdAndDecrypt(id: string, userId: string) {
        const message = await this.messageModel.findById(id).exec();

        if (!message) {
            throw new NotFoundException("Message not found");
        }

        if (message.userId !== userId) {
            throw new ForbiddenException("You do not have permission to access this message");
        }

        const createdAt = (message as any).createdAt;
        const isPending = message.status === MessageStatus.PENDING;
        const isOlderThan24h = createdAt && Date.now() - createdAt.getTime() > 24 * 60 * 60 * 1000;

        if (isPending && isOlderThan24h) {
            return {
                id: message._id.toString(),
                recipientEmail: message.recipientEmail,
                triggerDate: message.triggerDate,
                status: message.status,
                isLocked: true,
                createdAt,
            };
        }

        const decryptedContent = this.cryptoService.decrypt(
            message.encryptedContent,
            message.iv,
            message.authTag,
        );

        return {
            id: message._id.toString(),
            recipientEmail: message.recipientEmail,
            triggerDate: message.triggerDate,
            status: message.status,
            content: decryptedContent,
            createdAt,
        };
    }
}
