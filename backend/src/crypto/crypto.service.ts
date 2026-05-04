import { Injectable, InternalServerErrorException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const REQUIRED_KEY_BYTES = 32;
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

@Injectable()
export class CryptoService {
  private readonly masterKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawKey = this.configService.get<string>('ENCRYPTION_KEY');

    if (!rawKey) {
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY is not set in environment variables.',
      );
    }

    const keyBuffer = Buffer.from(rawKey, 'base64');

    if (keyBuffer.byteLength !== REQUIRED_KEY_BYTES) {
      throw new InternalServerErrorException(
        `ENCRYPTION_KEY must be exactly ${REQUIRED_KEY_BYTES} bytes (256 bit) after base64 decoding, ` +
          `but got ${keyBuffer.byteLength} bytes.`,
      );
    }

    this.masterKey = keyBuffer;
  }

  encrypt(plainText: string): { encryptedContent: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      encryptedContent: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  decrypt(cipherText: string, iv: string, authTag: string): string {
    const authTagBuffer = Buffer.from(authTag, 'base64');

    if (authTagBuffer.byteLength !== AUTH_TAG_BYTES) {
      throw new UnprocessableEntityException(
        `Auth tag must be exactly ${AUTH_TAG_BYTES} bytes, ` +
          `but got ${authTagBuffer.byteLength} bytes. Possible tampering detected.`,
      );
    }

    const ivBuffer = Buffer.from(iv, 'base64');
    const cipherTextBuffer = Buffer.from(cipherText, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, ivBuffer);
    decipher.setAuthTag(authTagBuffer);

    try {
      const decrypted = Buffer.concat([
        decipher.update(cipherTextBuffer),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch {
      throw new UnprocessableEntityException(
        'Decryption failed: ciphertext or auth tag has been tampered with.',
      );
    }
  }
}
