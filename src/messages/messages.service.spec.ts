import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
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
  const mockMessageModel = jest.fn().mockImplementation(() => ({
    save: mockSave,
  }));

  const mockCryptoService = {
    encrypt: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getModelToken(Message.name), useValue: mockMessageModel },
        { provide: CryptoService, useValue: mockCryptoService },
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
      mockSave.mockResolvedValue({});

      await service.create(userId, { ...dto });

      expect(cryptoService.encrypt).toHaveBeenCalledTimes(1);
      expect(cryptoService.encrypt).toHaveBeenCalledWith(dto.content);
    });

    it('должен создать документ с криптоданными и метаданными', async () => {
      (cryptoService.encrypt as jest.Mock).mockReturnValue(mockEncryptResult);
      mockSave.mockResolvedValue({});

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
        _id: 'mongo-object-id',
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
        _id: 'mongo-object-id',
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
      mockSave.mockResolvedValue({});

      await service.create(userId, { ...dto });

      const constructorArg = mockMessageModel.mock.calls[0][0];
      expect(constructorArg).not.toHaveProperty('content');
    });
  });
});
