import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {}

    async sendConfirmationEmail(to: string, token: string): Promise<void> {
        const apiToken = this.configService.get<string>("MAILOPOST_API_TOKEN");

        if (!apiToken) {
            throw new Error("MAILOPOST_API_TOKEN is not configured");
        }

        const fromEmail =
            this.configService.get<string>("MAILOPOST_FROM_EMAIL") || "noreply@bulbadyshka.ru";

        const link = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`;
        const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; color: #231001; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #231001; text-align: center;">Подтверждение Email</h2>
        <p style="font-size: 16px; line-height: 1.5;">Здравствуйте!</p>
        <p style="font-size: 16px; line-height: 1.5;">Для завершения регистрации, пожалуйста, подтвердите ваш адрес электронной почты, перейдя по ссылке ниже:</p>
        <p style="text-align: center; margin-top: 30px;">
          <a href="${link}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Подтвердить Email</a>
        </p>
      </div>
    `;

        const payload = {
            from_email: fromEmail,
            subject: "Подтверждение регистрации",
            to: to,
            html: htmlTemplate,
        };

        try {
            await firstValueFrom(
                this.httpService.post("https://api.mailopost.ru/v1/email/messages", payload, {
                    headers: {
                        Authorization: `Bearer ${apiToken}`,
                        "Content-Type": "application/json",
                    },
                }),
            );
            this.logger.log(`Confirmation email sent to ${to}`);
        } catch (error: any) {
            this.logger.error(`Failed to send confirmation email to ${to}`);
            throw error;
        }
    }

    async sendNotificationEmail(
        to: string,
        firstName: string | undefined,
        createdAt: Date,
        preview: string,
        link: string,
    ): Promise<void> {
        const apiToken = this.configService.get<string>("MAILOPOST_API_TOKEN");

        if (!apiToken) {
            throw new Error("MAILOPOST_API_TOKEN is not configured");
        }

        const fromEmail =
            this.configService.get<string>("MAILOPOST_FROM_EMAIL") || "noreply@bulbadyshka.ru";

        const greeting = firstName ? `Привет, ${firstName}!` : "Здравствуйте!";
        const dateStr = new Date(createdAt).toLocaleDateString("ru-RU");

        const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; color: #231001; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #231001; text-align: center;">${greeting}</h2>
        <p style="font-size: 16px; line-height: 1.5;">Настало время открыть ваше письмо в будущее, созданное <strong>${dateStr}</strong>.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; font-style: italic; color: #231001;">
          "${preview}"
        </div>
        <p style="text-align: center; margin-top: 30px;">
          <a href="${link}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Читать полное письмо</a>
        </p>
      </div>
    `;

        const payload = {
            from_email: fromEmail,
            subject: "Вам доставлено письмо в будущее!",
            to: to,
            html: htmlTemplate,
        };

        try {
            await firstValueFrom(
                this.httpService.post("https://api.mailopost.ru/v1/email/messages", payload, {
                    headers: {
                        Authorization: `Bearer ${apiToken}`,
                        "Content-Type": "application/json",
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
