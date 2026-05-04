import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async sendTransactionalEmail(to: string, decryptedBody: string): Promise<void> {
    const apiToken = this.configService.get<string>('MAILOPOST_API_TOKEN');
    
    if (!apiToken) {
      throw new Error('MAILOPOST_API_TOKEN is not configured');
    }

    const fromEmail = this.configService.get<string>('MAILOPOST_FROM_EMAIL') || 'noreply@bulbadyshka.ru';

    const payload = {
      from_email: fromEmail,
      subject: 'Ваше письмо в будущее',
      to: to,
      html: decryptedBody,
    };

    try {
      await firstValueFrom(
        this.httpService.post('https://api.mailopost.ru/v1/email/messages', payload, {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );
      this.logger.log(`Email successfully sent to ${to}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send email to ${to}. Error response: ${JSON.stringify(error.response?.data || error.message)}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
