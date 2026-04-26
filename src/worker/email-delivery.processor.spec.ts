import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { EmailDeliveryProcessor } from './email-delivery.processor';
import { Message, MessageStatus } from '../database/schemas/message.schema';
import { CryptoService } from '../crypto/crypto.service';

describe('EmailDeliveryProcessor', () => {
  let processor: EmailDeliveryProcessor;
  let cryptoService: jest.Mocked<CryptoService>;
  
  const mockMessageModel = {
    findById: jest.fn(),
  };

  const mockCryptoService = {
    decrypt: jest.fn(),
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
      ],
    }).compile();

    processor = module.get<EmailDeliveryProcessor>(EmailDeliveryProcessor);
    cryptoService = module.get(CryptoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should ignore job if message status is cancelled', async () => {
    const mockMessage = {
      _id: 'message-id',
      status: MessageStatus.CANCELLED,
    };

    mockMessageModel.findById.mockResolvedValueOnce(mockMessage);

    const mockJob = {
      id: 'job-id',
      data: { messageId: 'message-id' },
    } as unknown as Job;

    await processor.process(mockJob);

    expect(mockMessageModel.findById).toHaveBeenCalledWith('message-id');
    // Ensure decrypt is NOT called
    expect(cryptoService.decrypt).not.toHaveBeenCalled();
  });

  it('should decrypt and process successfully if status is pending', async () => {
    const mockSave = jest.fn();
    const mockMessage = {
      _id: 'message-id',
      status: MessageStatus.PENDING,
      encryptedContent: 'encrypted',
      iv: 'iv',
      authTag: 'authTag',
      save: mockSave,
    };

    mockMessageModel.findById.mockResolvedValueOnce(mockMessage);
    mockCryptoService.decrypt.mockReturnValueOnce('decrypted-content');

    const mockJob = {
      id: 'job-id',
      data: { messageId: 'message-id' },
    } as unknown as Job;

    await processor.process(mockJob);

    expect(mockMessageModel.findById).toHaveBeenCalledWith('message-id');
    expect(cryptoService.decrypt).toHaveBeenCalledWith('encrypted', 'iv', 'authTag');
    expect(mockMessage.status).toBe(MessageStatus.SENT);
    expect(mockSave).toHaveBeenCalled();
  });

  it('should set status to error if decryption fails', async () => {
    const mockSave = jest.fn();
    const mockMessage = {
      _id: 'message-id',
      status: MessageStatus.PENDING,
      encryptedContent: 'encrypted',
      iv: 'iv',
      authTag: 'authTag',
      save: mockSave,
    };

    mockMessageModel.findById.mockResolvedValueOnce(mockMessage);
    mockCryptoService.decrypt.mockImplementationOnce(() => {
      throw new Error('Decryption failed');
    });

    const mockJob = {
      id: 'job-id',
      data: { messageId: 'message-id' },
    } as unknown as Job;

    await processor.process(mockJob);

    expect(mockMessageModel.findById).toHaveBeenCalledWith('message-id');
    expect(cryptoService.decrypt).toHaveBeenCalledWith('encrypted', 'iv', 'authTag');
    expect(mockMessage.status).toBe(MessageStatus.ERROR);
    expect(mockSave).toHaveBeenCalled();
  });
});
