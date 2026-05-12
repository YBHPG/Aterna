import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { Job } from "bullmq";
import { EmailDeliveryProcessor } from "./email-delivery.processor";
import { Message, MessageStatus } from "../database/schemas/message.schema";
import { CryptoService } from "../crypto/crypto.service";
import { EmailService } from "../email/email.service";
import { UsersService } from "../users/users.service";
import { TelegramService } from "../auth/telegram.service";

describe("EmailDeliveryProcessor", () => {
    let processor: EmailDeliveryProcessor;
    let cryptoService: jest.Mocked<CryptoService>;
    let emailService: jest.Mocked<EmailService>;
    let telegramService: jest.Mocked<TelegramService>;

    const mockMessageModel = {
        findById: jest.fn(),
    };

    const mockCryptoService = {
        decrypt: jest.fn(),
    };

    const mockEmailService = {
        sendTransactionalEmail: jest.fn(),
        sendNotificationEmail: jest.fn(),
    };

    const mockUsersService = {
        findById: jest.fn(),
    };

    const mockTelegramService = {
        sendNotification: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EmailDeliveryProcessor,
                {
                    provide: getModelToken(Message.name),
                    useValue: mockMessageModel,
                },
                {
                    provide: CryptoService,
                    useValue: mockCryptoService,
                },
                {
                    provide: EmailService,
                    useValue: mockEmailService,
                },
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
                {
                    provide: TelegramService,
                    useValue: mockTelegramService,
                },
            ],
        }).compile();

        processor = module.get<EmailDeliveryProcessor>(EmailDeliveryProcessor);
        cryptoService = module.get(CryptoService);
        emailService = module.get(EmailService);
        telegramService = module.get(TelegramService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(processor).toBeDefined();
    });

    it("should ignore job if message status is cancelled", async () => {
        const mockMessage = {
            _id: "message-id",
            status: MessageStatus.CANCELLED,
        };

        mockMessageModel.findById.mockResolvedValueOnce(mockMessage);

        const mockJob = {
            id: "job-id",
            data: { messageId: "message-id" },
        } as unknown as Job;

        await processor.process(mockJob);

        expect(mockMessageModel.findById).toHaveBeenCalledWith("message-id");
        // Ensure decrypt is NOT called
        expect(cryptoService.decrypt).not.toHaveBeenCalled();
        expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
    });

    it("should decrypt, send email and process successfully if status is pending", async () => {
        const mockSave = jest.fn();
        const mockMessage = {
            _id: "message-id",
            status: MessageStatus.PENDING,
            encryptedContent: "encrypted",
            iv: "iv",
            authTag: "authTag",
            userId: "user-id",
            recipientEmail: "test@example.com",
            createdAt: new Date("2026-05-05T10:00:00.000Z"),
            save: mockSave,
        };

        mockMessageModel.findById.mockResolvedValueOnce(mockMessage);
        mockUsersService.findById.mockResolvedValueOnce({
            id: "user-id",
            firstName: "John",
            telegramId: "tg-123",
            isEmailConfirmed: true,
        });
        mockCryptoService.decrypt.mockReturnValueOnce("decrypted-content");
        mockEmailService.sendNotificationEmail.mockResolvedValueOnce(undefined);

        const mockJob = {
            id: "job-id",
            data: { messageId: "message-id" },
        } as unknown as Job;

        await processor.process(mockJob);

        expect(mockMessageModel.findById).toHaveBeenCalledWith("message-id");
        expect(mockUsersService.findById).toHaveBeenCalledWith("user-id");
        expect(cryptoService.decrypt).toHaveBeenCalledWith("encrypted", "iv", "authTag");
        expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
            "test@example.com",
            "John",
            mockMessage.createdAt,
            "decrypted-content",
            `${process.env.FRONTEND_URL}/messages/message-id`,
        );
        expect(telegramService.sendNotification).toHaveBeenCalledWith(
            "tg-123",
            "У вас новое письмо из прошлого!\n\ndecrypted-content",
            `${process.env.FRONTEND_URL}/dashboard`,
        );
        expect(mockMessage.status).toBe(MessageStatus.SENT);
        expect(mockSave).toHaveBeenCalled();
    });

    it("should set status to error if decryption fails", async () => {
        const mockSave = jest.fn();
        const mockMessage = {
            _id: "message-id",
            status: MessageStatus.PENDING,
            encryptedContent: "encrypted",
            iv: "iv",
            authTag: "authTag",
            userId: "user-id",
            createdAt: new Date("2026-05-05T10:00:00.000Z"),
            save: mockSave,
        };

        mockMessageModel.findById.mockResolvedValueOnce(mockMessage);
        mockCryptoService.decrypt.mockImplementationOnce(() => {
            throw new Error("Decryption failed");
        });

        const mockJob = {
            id: "job-id",
            data: { messageId: "message-id" },
        } as unknown as Job;

        await processor.process(mockJob);

        expect(mockMessageModel.findById).toHaveBeenCalledWith("message-id");
        expect(cryptoService.decrypt).toHaveBeenCalledWith("encrypted", "iv", "authTag");
        expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
        expect(mockMessage.status).toBe(MessageStatus.ERROR);
        expect(mockSave).toHaveBeenCalled();
    });

    it("should set status to error if email sending fails", async () => {
        const mockSave = jest.fn();
        const mockMessage = {
            _id: "message-id",
            status: MessageStatus.PENDING,
            encryptedContent: "encrypted",
            iv: "iv",
            authTag: "authTag",
            userId: "user-id",
            recipientEmail: "test@example.com",
            createdAt: new Date("2026-05-05T10:00:00.000Z"),
            save: mockSave,
        };

        mockMessageModel.findById.mockResolvedValueOnce(mockMessage);
        mockUsersService.findById.mockResolvedValueOnce({
            id: "user-id",
            firstName: "John",
            isEmailConfirmed: true,
        });
        mockCryptoService.decrypt.mockReturnValueOnce("decrypted-content");
        mockEmailService.sendNotificationEmail.mockRejectedValueOnce(new Error("Email failed"));

        const mockJob = {
            id: "job-id",
            data: { messageId: "message-id" },
        } as unknown as Job;

        await processor.process(mockJob);

        expect(mockMessageModel.findById).toHaveBeenCalledWith("message-id");
        expect(cryptoService.decrypt).toHaveBeenCalledWith("encrypted", "iv", "authTag");
        expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
            "test@example.com",
            "John",
            mockMessage.createdAt,
            "decrypted-content",
            `${process.env.FRONTEND_URL}/messages/message-id`,
        );
        expect(mockMessage.status).toBe(MessageStatus.ERROR);
        expect(mockSave).toHaveBeenCalled();
    });
});
