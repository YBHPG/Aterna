import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bullmq';
import { MessagesService } from './messages.service';
import { CryptoService } from '../crypto/crypto.service';
import { Message, MessageStatus } from '../database/schemas/message.schema';
import { CreateMessageDto } from './dto/create-message.dto';

describe('MessagesService', () => {
  let service: MessagesService;
  let cryptoService: CryptoService;

  const mockEncryptResult = {
    encryptedContent: 'ZW5jcnlwdGVkQ29udGVudA==',
    iv: 'aXZWYWx1ZTEyMzQ=',
    authTag: 'YXV0aFRhZ1ZhbHVl',
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
        { provide: getQueueToken('email-delivery-queue'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    cryptoService = module.get<CryptoService>(CryptoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-postgres-id-123';
    const dto: CreateMessageDto = {
      content: 'Тестовое послание в будущее',
      recipientEmail: 'recipient@example.com',
      triggerDate: new Date('2099-01-01T10:00:00.000Z'),
    };

    it('должен вызвать cryptoService.encrypt с открытым текстом сообщения', async () => {
      (cryptoService.encrypt as jest.Mock).mockReturnValue(mockEncryptResult);
      mockSave.mockResolvedValue({ _id: { toString: () => 'test-id' } });

      await service.create(userId, { ...dto });

      expect(cryptoService.encrypt).toHaveBeenCalledTimes(1);
      expect(cryptoService.encrypt).toHaveBeenCalledWith(dto.content);
    });

    it('должен создать документ с криптоданными и метаданными', async () => {
      (cryptoService.encrypt as jest.Mock).mockReturnValue(mockEncryptResult);
      mockSave.mockResolvedValue({ _id: { toString: () => 'test-id' } });

      await service.create(userId, { ...dto });

      expect(mockMessageModel).toHaveBeenCalledWith({
        userId,
        recipientEmail: dto.recipientEmail,
        triggerDate: dto.triggerDate,
        encryptedContent: mockEncryptResult.encryptedContent,
        iv: mockEncryptResult.iv,
        authTag: mockEncryptResult.authTag,
      });
    });

    it('должен сохранить документ в MongoDB через .save()', async () => {
      (cryptoService.encrypt as jest.Mock).mockReturnValue(mockEncryptResult);
      const savedDocument = {
        _id: { toString: () => 'mongo-object-id' },
        userId,
        recipientEmail: dto.recipientEmail,
        triggerDate: dto.triggerDate,
        ...mockEncryptResult,
        status: MessageStatus.PENDING,
      };
      mockSave.mockResolvedValue(savedDocument);

      const result = await service.create(userId, { ...dto });

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result).toEqual(savedDocument);
    });

    it('должен сохранить документ со статусом pending', async () => {
      (cryptoService.encrypt as jest.Mock).mockReturnValue(mockEncryptResult);
      const savedDocument = {
        _id: { toString: () => 'mongo-object-id' },
        userId,
        status: MessageStatus.PENDING,
        ...mockEncryptResult,
      };
      mockSave.mockResolvedValue(savedDocument);

      const result = await service.create(userId, { ...dto });

      expect(result.status).toBe(MessageStatus.PENDING);
    });

    it('не должен передавать открытый текст content в конструктор модели', async () => {
      (cryptoService.encrypt as jest.Mock).mockReturnValue(mockEncryptResult);
      mockSave.mockResolvedValue({ _id: { toString: () => 'test-id' } });

      await service.create(userId, { ...dto });

      const constructorArg = mockMessageModel.mock.calls[0][0];
      expect(constructorArg).not.toHaveProperty('content');
    });

    it('должен публиковать задачу в очередь с вычисленным delay (MVP-фокус)', async () => {
      (cryptoService.encrypt as jest.Mock).mockReturnValue(mockEncryptResult);
      mockSave.mockResolvedValue({ _id: { toString: () => 'test-message-id' } });

      const mockNow = new Date('2026-04-26T12:00:00.000Z').getTime();
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      const triggerDate = new Date('2099-01-01T10:00:00.000Z');
      const dtoWithDate = { ...dto, triggerDate };
      const expectedDelay = triggerDate.getTime() - mockNow;

      await service.create(userId, dtoWithDate);

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-email',
        { messageId: 'test-message-id' },
        {
          delay: expectedDelay,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );

      jest.restoreAllMocks();
    });
  });

  describe('findAllByUser', () => {
    it('должен возвращать массив писем без зашифрованного контента', async () => {
      const mockExec = jest.fn().mockResolvedValue([{ _id: '1', recipientEmail: 'test@example.com' }]);
      const mockSelect = jest.fn().mockReturnValue({ exec: mockExec });
      mockFind.mockReturnValue({ select: mockSelect });

      const result = await service.findAllByUser('user1');

      expect(mockFind).toHaveBeenCalledWith({ userId: 'user1' });
      expect(mockSelect).toHaveBeenCalledWith('-encryptedContent -iv -authTag');
      expect(result).toEqual([{ _id: '1', recipientEmail: 'test@example.com' }]);
    });
  });

  describe('cancel', () => {
    it('должен выбросить NotFoundException если письмо не найдено', async () => {
      const mockExec = jest.fn().mockResolvedValue(null);
      mockFindById.mockReturnValue({ exec: mockExec });

      await expect(service.cancel('msg1', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('должен выбросить ForbiddenException при попытке отменить письмо с чужим userId', async () => {
      const mockDocument = {
        _id: 'msg1',
        userId: 'ownerId',
        status: MessageStatus.PENDING,
        save: jest.fn(),
      };
      const mockExec = jest.fn().mockResolvedValue(mockDocument);
      mockFindById.mockReturnValue({ exec: mockExec });

      await expect(service.cancel('msg1', 'hackerId')).rejects.toThrow(ForbiddenException);
    });

    it('должен изменить статус на cancelled если письмо pending', async () => {
      const mockDocument = {
        _id: 'msg1',
        userId: 'ownerId',
        status: MessageStatus.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };
      const mockExec = jest.fn().mockResolvedValue(mockDocument);
      mockFindById.mockReturnValue({ exec: mockExec });

      const result = await service.cancel('msg1', 'ownerId');

      expect(mockDocument.status).toBe(MessageStatus.CANCELLED);
      expect(mockDocument.save).toHaveBeenCalled();
      expect(result).toEqual(mockDocument);
    });

    it('не должен менять статус если письмо не pending', async () => {
      const mockDocument = {
        _id: 'msg1',
        userId: 'ownerId',
        status: MessageStatus.SENT,
        save: jest.fn().mockResolvedValue(true),
      };
      const mockExec = jest.fn().mockResolvedValue(mockDocument);
      mockFindById.mockReturnValue({ exec: mockExec });

      const result = await service.cancel('msg1', 'ownerId');

      expect(mockDocument.status).toBe(MessageStatus.SENT); // remained SENT
      expect(mockDocument.save).not.toHaveBeenCalled();
      expect(result).toEqual(mockDocument);
    });
  });
});
