import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnprocessableEntityException, InternalServerErrorException } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import * as crypto from 'crypto';

// Валидный 32-байтный ключ в base64 для всех тестов
const VALID_KEY = crypto.randomBytes(32).toString('base64');

function buildModule(encryptionKey: string | undefined): Promise<TestingModule> {
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'ENCRYPTION_KEY') return encryptionKey;
    }),
  };

  return Test.createTestingModule({
    providers: [
      CryptoService,
      { provide: ConfigService, useValue: mockConfigService },
    ],
  }).compile();
}

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module = await buildModule(VALID_KEY);
    service = module.get<CryptoService>(CryptoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Инициализация сервиса ───────────────────────────────────────────────

  describe('инициализация', () => {
    it('должен успешно инициализироваться с корректным 32-байтным ключом', () => {
      expect(service).toBeDefined();
    });

    it('должен выбрасывать InternalServerErrorException если ENCRYPTION_KEY отсутствует', async () => {
      await expect(buildModule(undefined)).rejects.toThrow(InternalServerErrorException);
    });

    it('должен выбрасывать InternalServerErrorException если ключ раскодируется не в 32 байта', async () => {
      const shortKey = crypto.randomBytes(16).toString('base64'); // 16 байт — недостаточно
      await expect(buildModule(shortKey)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ─── encrypt ────────────────────────────────────────────────────────────

  describe('encrypt', () => {
    it('должен возвращать объект с полями encryptedContent, iv, authTag в формате base64', () => {
      const result = service.encrypt('Привет, мир!');

      expect(result).toHaveProperty('encryptedContent');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');

      // Все три поля — валидные base64-строки (не пустые)
      expect(Buffer.from(result.encryptedContent, 'base64').length).toBeGreaterThan(0);
      expect(Buffer.from(result.iv, 'base64').length).toBe(12);
      expect(Buffer.from(result.authTag, 'base64').length).toBe(16);
    });

    it('должен генерировать уникальный IV при каждом вызове', () => {
      const result1 = service.encrypt('одинаковый текст');
      const result2 = service.encrypt('одинаковый текст');

      expect(result1.iv).not.toBe(result2.iv);
    });

    it('должен давать разный шифротекст для одного plainText из-за разных IV', () => {
      const result1 = service.encrypt('одинаковый текст');
      const result2 = service.encrypt('одинаковый текст');

      expect(result1.encryptedContent).not.toBe(result2.encryptedContent);
    });

    it('должен корректно шифровать пустую строку', () => {
      const result = service.encrypt('');

      expect(result).toHaveProperty('encryptedContent');
      expect(Buffer.from(result.authTag, 'base64').length).toBe(16);
    });
  });

  // ─── decrypt (happy path) ────────────────────────────────────────────────

  describe('decrypt — успешный цикл', () => {
    it('должен расшифровывать текст, зашифрованный методом encrypt', () => {
      const plainText = 'Секретное письмо в будущее';
      const { encryptedContent, iv, authTag } = service.encrypt(plainText);

      const decrypted = service.decrypt(encryptedContent, iv, authTag);

      expect(decrypted).toBe(plainText);
    });

    it('должен корректно обрабатывать многострочный текст с юникодом', () => {
      const plainText = 'Дорогой я!\nСегодня 2025 год. 🌍\nС уважением, прошлое.';
      const { encryptedContent, iv, authTag } = service.encrypt(plainText);

      expect(service.decrypt(encryptedContent, iv, authTag)).toBe(plainText);
    });

    it('должен корректно обрабатывать длинный текст (> 1KB)', () => {
      const plainText = 'А'.repeat(2000);
      const { encryptedContent, iv, authTag } = service.encrypt(plainText);

      expect(service.decrypt(encryptedContent, iv, authTag)).toBe(plainText);
    });
  });

  // ─── decrypt — подделка данных ───────────────────────────────────────────

  describe('decrypt — защита от подделки', () => {
    it('должен выбрасывать UnprocessableEntityException при изменении одного байта шифротекста', () => {
      const { encryptedContent, iv, authTag } = service.encrypt('важные данные');

      // Меняем первый байт шифротекста
      const tampered = Buffer.from(encryptedContent, 'base64');
      tampered[0] ^= 0xff;
      const tamperedContent = tampered.toString('base64');

      expect(() => service.decrypt(tamperedContent, iv, authTag)).toThrow(
        UnprocessableEntityException,
      );
    });

    it('должен выбрасывать UnprocessableEntityException при изменении authTag', () => {
      const { encryptedContent, iv, authTag } = service.encrypt('важные данные');

      // Меняем первый байт authTag
      const tampered = Buffer.from(authTag, 'base64');
      tampered[0] ^= 0xff;
      const tamperedTag = tampered.toString('base64');

      expect(() => service.decrypt(encryptedContent, iv, tamperedTag)).toThrow(
        UnprocessableEntityException,
      );
    });

    it('должен выбрасывать UnprocessableEntityException при изменении IV', () => {
      const { encryptedContent, iv, authTag } = service.encrypt('важные данные');

      // Меняем первый байт IV
      const tampered = Buffer.from(iv, 'base64');
      tampered[0] ^= 0xff;
      const tamperedIv = tampered.toString('base64');

      expect(() => service.decrypt(encryptedContent, tamperedIv, authTag)).toThrow(
        UnprocessableEntityException,
      );
    });

    it('должен выбрасывать UnprocessableEntityException при authTag короче 16 байт', () => {
      const { encryptedContent, iv } = service.encrypt('важные данные');

      const shortTag = crypto.randomBytes(8).toString('base64'); // 8 байт — недопустимо

      expect(() => service.decrypt(encryptedContent, iv, shortTag)).toThrow(
        UnprocessableEntityException,
      );
    });

    it('должен выбрасывать UnprocessableEntityException при authTag длиннее 16 байт', () => {
      const { encryptedContent, iv } = service.encrypt('важные данные');

      const longTag = crypto.randomBytes(32).toString('base64'); // 32 байта — недопустимо

      expect(() => service.decrypt(encryptedContent, iv, longTag)).toThrow(
        UnprocessableEntityException,
      );
    });

    it('не должен расшифровывать данные другим экземпляром сервиса (другой ключ)', async () => {
      const { encryptedContent, iv, authTag } = service.encrypt('секрет');

      // Создаём второй экземпляр с другим ключом
      const otherModule = await buildModule(crypto.randomBytes(32).toString('base64'));
      const otherService = otherModule.get<CryptoService>(CryptoService);

      expect(() => otherService.decrypt(encryptedContent, iv, authTag)).toThrow(
        UnprocessableEntityException,
      );
    });
  });
});
