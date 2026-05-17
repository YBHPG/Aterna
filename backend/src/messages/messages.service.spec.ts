import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { getQueueToken } from "@nestjs/bullmq";
import { MessagesService } from "./messages.service";
import { CryptoService } from "../crypto/crypto.service";
import { Message, MessageStatus } from "../database/schemas/message.schema";
import { CreateMessageDto } from "./dto/create-message.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";

describe("MessagesService", () => {
    let service: MessagesService;
    let cryptoService: CryptoService;

    const mockEncryptResult = {
        encryptedContent: "ZW5jcnlwdGVkQ29udGVudA==",
        iv: "aXZWYWx1ZTEyMzQ=",
        authTag: "YXV0aFRhZ1ZhbHVl",
    };

    const mockSave = jest.fn();
    const mockFind = jest.fn();
    const mockFindById = jest.fn();

    const mockMessageModel = jest.fn().mockImplementation(() => ({
        save: mockSave,
    }));
    Object.assign(mockMessageModel, {
        find: mockFind,
        findById: mockFindById,
    });

    const mockCryptoService = {
        encrypt: jest.fn(),
        decrypt: jest.fn(),
    };

    const mockQueue = {
        add: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessagesService,
                { provide: getModelToken(Message.name), useValue: mockMessageModel },
                { provide: CryptoService, useValue: mockCryptoService },
                { provide: getQueueToken("email-delivery-queue"), useValue: mockQueue },
            ],
        }).compile();

        service = module.get<MessagesService>(MessagesService);
        cryptoService = module.get<CryptoService>(CryptoService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("create", () => {
        const userId = "user-postgres-id-123";
        const userEmail = "recipient@example.com";
        const dto: CreateMessageDto = {
            content: "Тестовое послание в будущее",
            triggerDate: new Date("2099-01-01T10:00:00.000Z"),
        };

        it("должен вызвать cryptoService.encrypt с открытым текстом сообщения", async () => {
            (cryptoService.encrypt as jest.Mock).mockReturnValue(mockEncryptResult);
            mockSave.mockResolvedValue({ _id: { toString: () => "test-id" } });

            await service.create(userId, userEmail, { ...dto });

            expect(cryptoService.encrypt).toHaveBeenCalledTimes(1);
            expect(cryptoService.encrypt).toHaveBeenCalledWith(dto.content);
        });

        it("должен создать документ с криптоданными и метаданными", async () => {
            (cryptoService.encrypt as jest.Mock).mockReturnValue(mockEncryptResult);
            mockSave.mockResolvedValue({ _id: { toString: () => "test-id" } });

            await service.create(userId, userEmail, { ...dto });

            expect(mockMessageModel).toHaveBeenCalledWith({
                userId,
                recipientEmail: userEmail,
                triggerDate: dto.triggerDate,
                encryptedContent: mockEncryptResult.encryptedContent,
                iv: mockEncryptResult.iv,
                authTag: mockEncryptResult.authTag,
            });
        });

        it("должен сохранить документ в MongoDB через .save()", async () => {
            (cryptoService.encrypt as jest.Mock).mockReturnValue(mockEncryptResult);
            const savedDocument = {
                _id: { toString: () => "mongo-object-id" },
                userId,
                recipientEmail: userEmail,
                triggerDate: dto.triggerDate,
                ...mockEncryptResult,
                status: MessageStatus.PENDING,
            };
            mockSave.mockResolvedValue(savedDocument);

            const result = await service.create(userId, userEmail, { ...dto });

            expect(mockSave).toHaveBeenCalledTimes(1);
            expect(result).toEqual(savedDocument);
        });

        it("должен сохранить документ со статусом pending", async () => {
            (cryptoService.encrypt as jest.Mock).mockReturnValue(mockEncryptResult);
            const savedDocument = {
                _id: { toString: () => "mongo-object-id" },
                userId,
                status: MessageStatus.PENDING,
                ...mockEncryptResult,
            };
            mockSave.mockResolvedValue(savedDocument);

            const result = await service.create(userId, userEmail, { ...dto });

            expect(result.status).toBe(MessageStatus.PENDING);
        });

        it("не должен передавать открытый текст content в конструктор модели", async () => {
            (cryptoService.encrypt as jest.Mock).mockReturnValue(mockEncryptResult);
            mockSave.mockResolvedValue({ _id: { toString: () => "test-id" } });

            await service.create(userId, userEmail, { ...dto });

            const constructorArg = mockMessageModel.mock.calls[0][0];
            expect(constructorArg).not.toHaveProperty("content");
        });

        it("должен публиковать задачу в очередь с вычисленным delay (MVP-фокус)", async () => {
            (cryptoService.encrypt as jest.Mock).mockReturnValue(mockEncryptResult);
            mockSave.mockResolvedValue({ _id: { toString: () => "test-message-id" } });

            const mockNow = new Date("2026-04-26T12:00:00.000Z").getTime();
            jest.spyOn(Date, "now").mockReturnValue(mockNow);

            const triggerDate = new Date("2099-01-01T10:00:00.000Z");
            const dtoWithDate = { ...dto, triggerDate };
            const expectedDelay = triggerDate.getTime() - mockNow;

            await service.create(userId, userEmail, dtoWithDate);

            expect(mockQueue.add).toHaveBeenCalledTimes(1);
            expect(mockQueue.add).toHaveBeenCalledWith(
                "send-email",
                { messageId: "test-message-id" },
                {
                    delay: expectedDelay,
                    attempts: 3,
                    backoff: { type: "exponential", delay: 5000 },
                },
            );

            jest.restoreAllMocks();
        });
    });

    describe("findAllByUser", () => {
        it("должен возвращать массив писем без зашифрованного контента", async () => {
            const mockExec = jest
                .fn()
                .mockResolvedValue([{ _id: "1", recipientEmail: "test@example.com" }]);
            const mockSelect = jest.fn().mockReturnValue({ exec: mockExec });
            mockFind.mockReturnValue({ select: mockSelect });

            const result = await service.findAllByUser("user1");

            expect(mockFind).toHaveBeenCalledWith({ userId: "user1" });
            expect(mockSelect).toHaveBeenCalledWith("-encryptedContent -iv -authTag");
            expect(result).toEqual([{ _id: "1", recipientEmail: "test@example.com" }]);
        });
    });

    describe("update", () => {
        const userId = "user1";
        const msgId = "msg1";
        const updateDto: UpdateMessageDto = { content: "Новый текст" };

        it("должен выбросить NotFoundException если письмо не найдено", async () => {
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
            await expect(service.update(msgId, userId, updateDto)).rejects.toThrow(
                NotFoundException,
            );
        });

        it("должен выбросить ForbiddenException если письмо чужое", async () => {
            const mockDoc = { userId: "otherUser" };
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDoc) });
            await expect(service.update(msgId, userId, updateDto)).rejects.toThrow(
                ForbiddenException,
            );
        });

        it("должен выбросить ForbiddenException если статус не pending", async () => {
            const mockDoc = { userId, status: MessageStatus.SENT };
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDoc) });
            await expect(service.update(msgId, userId, updateDto)).rejects.toThrow(
                ForbiddenException,
            );
        });

        it("должен выбросить ForbiddenException если прошло больше 24 часов", async () => {
            const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
            const mockDoc = { userId, status: MessageStatus.PENDING, createdAt: oldDate };
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDoc) });
            await expect(service.update(msgId, userId, updateDto)).rejects.toThrow(
                ForbiddenException,
            );
        });

        it("должен зашифровать новый текст и сохранить документ", async () => {
            const recentDate = new Date();
            const mockDoc = {
                userId,
                status: MessageStatus.PENDING,
                createdAt: recentDate,
                encryptedContent: "old",
                iv: "old",
                authTag: "old",
                save: jest.fn().mockResolvedValue(true),
            };
            mockFindById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDoc) });
            (cryptoService.encrypt as jest.Mock).mockReturnValue({
                encryptedContent: "newContent",
                iv: "newIv",
                authTag: "newTag",
            });

            await service.update(msgId, userId, { ...updateDto });

            expect(cryptoService.encrypt).toHaveBeenCalledWith(updateDto.content);
            expect(mockDoc.encryptedContent).toBe("newContent");
            expect(mockDoc.iv).toBe("newIv");
            expect(mockDoc.authTag).toBe("newTag");
            expect(mockDoc.save).toHaveBeenCalled();
        });
    });

    describe("cancel", () => {
        it("должен выбросить NotFoundException если письмо не найдено", async () => {
            const mockExec = jest.fn().mockResolvedValue(null);
            mockFindById.mockReturnValue({ exec: mockExec });

            await expect(service.cancel("msg1", "user1")).rejects.toThrow(NotFoundException);
        });

        it("должен выбросить ForbiddenException при попытке отменить письмо с чужим userId", async () => {
            const mockDocument = {
                _id: "msg1",
                userId: "ownerId",
                status: MessageStatus.PENDING,
                save: jest.fn(),
            };
            const mockExec = jest.fn().mockResolvedValue(mockDocument);
            mockFindById.mockReturnValue({ exec: mockExec });

            await expect(service.cancel("msg1", "hackerId")).rejects.toThrow(ForbiddenException);
        });

        it("должен изменить статус на cancelled если письмо pending", async () => {
            const mockDocument = {
                _id: "msg1",
                userId: "ownerId",
                status: MessageStatus.PENDING,
                save: jest.fn().mockResolvedValue(true),
            };
            const mockExec = jest.fn().mockResolvedValue(mockDocument);
            mockFindById.mockReturnValue({ exec: mockExec });

            const result = await service.cancel("msg1", "ownerId");

            expect(mockDocument.status).toBe(MessageStatus.CANCELLED);
            expect(mockDocument.save).toHaveBeenCalled();
            expect(result).toEqual(mockDocument);
        });

        it("должен менять статус на cancelled даже если письмо уже отправлено", async () => {
            const mockDocument = {
                _id: "msg1",
                userId: "ownerId",
                status: MessageStatus.SENT,
                save: jest.fn().mockResolvedValue(true),
            };
            const mockExec = jest.fn().mockResolvedValue(mockDocument);
            mockFindById.mockReturnValue({ exec: mockExec });

            const result = await service.cancel("msg1", "ownerId");

            expect(mockDocument.status).toBe(MessageStatus.CANCELLED);
            expect(mockDocument.save).toHaveBeenCalled();
            expect(result).toEqual(mockDocument);
        });
    });

    describe("findByIdAndDecrypt", () => {
        it("должен выбросить NotFoundException если письмо не найдено", async () => {
            const mockExec = jest.fn().mockResolvedValue(null);
            mockFindById.mockReturnValue({ exec: mockExec });

            await expect(service.findByIdAndDecrypt("msg1", "user1")).rejects.toThrow(
                NotFoundException,
            );
        });

        it("должен выбросить ForbiddenException если письмо чужое", async () => {
            const mockDocument = { userId: "ownerId" };
            const mockExec = jest.fn().mockResolvedValue(mockDocument);
            mockFindById.mockReturnValue({ exec: mockExec });

            await expect(service.findByIdAndDecrypt("msg1", "hackerId")).rejects.toThrow(
                ForbiddenException,
            );
        });

        it("должен расшифровать контент, если письмо старше 24 часов, но статус не pending (например, SENT)", async () => {
            const mockDocument = {
                _id: { toString: () => "msg1" },
                userId: "ownerId",
                recipientEmail: "test@example.com",
                triggerDate: new Date("2099-01-01"),
                status: MessageStatus.SENT,
                encryptedContent: "encrypted",
                iv: "iv",
                authTag: "tag",
                createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // > 24 hours ago
            };
            const mockExec = jest.fn().mockResolvedValue(mockDocument);
            mockFindById.mockReturnValue({ exec: mockExec });
            mockCryptoService.decrypt.mockReturnValue("decrypted-content");

            const result = await service.findByIdAndDecrypt("msg1", "ownerId");

            expect(result.id).toBe("msg1");
            expect(result.content).toBe("decrypted-content");
            expect(result.status).toBe(MessageStatus.SENT);
            expect(mockCryptoService.decrypt).toHaveBeenCalledWith("encrypted", "iv", "tag");
        });

        it("должен вернуть isLocked: true и не расшифровывать контент, если письмо pending и старше 24 часов", async () => {
            const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
            const mockDocument = {
                _id: { toString: () => "msg1" },
                userId: "ownerId",
                recipientEmail: "test@example.com",
                triggerDate: new Date("2099-01-01"),
                status: MessageStatus.PENDING,
                encryptedContent: "encrypted",
                iv: "iv",
                authTag: "tag",
                createdAt: oldDate,
            };
            const mockExec = jest.fn().mockResolvedValue(mockDocument);
            mockFindById.mockReturnValue({ exec: mockExec });

            const result = await service.findByIdAndDecrypt("msg1", "ownerId");

            expect(result.id).toBe("msg1");
            expect(result).not.toHaveProperty("content");
            expect(result).toHaveProperty("isLocked", true);
            expect(mockCryptoService.decrypt).not.toHaveBeenCalled();
        });

        it("должен расшифровать контент, если письмо pending, но создано менее 24 часов назад", async () => {
            const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
            const mockDocument = {
                _id: { toString: () => "msg1" },
                userId: "ownerId",
                recipientEmail: "test@example.com",
                triggerDate: new Date("2099-01-01"),
                status: MessageStatus.PENDING,
                encryptedContent: "encrypted",
                iv: "iv",
                authTag: "tag",
                createdAt: recentDate,
            };
            const mockExec = jest.fn().mockResolvedValue(mockDocument);
            mockFindById.mockReturnValue({ exec: mockExec });
            mockCryptoService.decrypt.mockReturnValue("decrypted-content");

            const result = await service.findByIdAndDecrypt("msg1", "ownerId");

            expect(result.content).toBe("decrypted-content");
            expect(mockCryptoService.decrypt).toHaveBeenCalled();
        });
    });
});
