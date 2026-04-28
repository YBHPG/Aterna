import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';

describe('EmailService', () => {
  let service: EmailService;
  let httpService: HttpService;

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'MAILOPOST_API_TOKEN') return 'test-token';
      if (key === 'MAILOPOST_FROM_EMAIL') return 'test@futurelater.ru';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendTransactionalEmail', () => {
    it('should format payload correctly and make HTTP POST request', async () => {
      mockHttpService.post.mockReturnValue(of({ data: { success: true } }));

      const to = 'recipient@example.com';
      const decryptedBody = '<p>Test email</p>';

      await service.sendTransactionalEmail(to, decryptedBody);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://api.mailopost.ru/v1/email/messages',
        {
          from_email: 'test@futurelater.ru',
          subject: 'Ваше письмо в будущее',
          to: to,
          html: decryptedBody,
        },
        {
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        },
      );
    });
    
    it('should throw an error if API token is missing', async () => {
      mockConfigService.get.mockReturnValueOnce(null); // Override for this test only
      
      await expect(service.sendTransactionalEmail('test@test.com', 'test')).rejects.toThrow('MAILOPOST_API_TOKEN is not configured');
    });
  });
});
