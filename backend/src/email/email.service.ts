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

        const link = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`;

        if (!apiToken) {
            throw new Error("MAILOPOST_API_TOKEN is not configured");
        }

        const fromEmail =
            this.configService.get<string>("MAILOPOST_FROM_EMAIL") || "noreply@bulbadyshka.ru";

        const htmlTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aterna - Подтверждение Email</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant:wght@500;600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f0eb; font-family: 'Inter', Arial, sans-serif; color: #2c2a29;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f0eb; padding: 40px 0;">
    <tr>
      <td align="center">
        <!-- Основная карточка письма -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 40px; box-shadow: 0px 20px 25px -3px rgba(0,0,0,0.05); overflow: hidden; margin: 0 auto; max-width: 90%;">
          
          <!-- Заголовок -->
          <tr>
            <td align="center" style="padding: 50px 40px 15px;">
              <h1 style="font-family: 'Cormorant', Georgia, serif; font-size: 36px; font-weight: 700; margin: 0; color: #2c2a29;">
                Подтверждение Email
              </h1>
            </td>
          </tr>

          <!-- Приветствие -->
          <tr>
            <td align="center" style="padding: 0 40px 30px;">
              <p style="font-family: 'Inter', Arial, sans-serif; font-size: 18px; margin: 0; color: #2c2a29;">
                Здравствуйте!
              </p>
            </td>
          </tr>

          <!-- Текст письма -->
          <tr>
            <td align="center" style="padding: 0 40px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f0eb; border-radius: 30px;">
                <tr>
                  <td align="center" style="padding: 30px 40px;">
                    <p style="font-family: 'Cormorant', Georgia, serif; font-size: 20px; line-height: 1.6; color: #2c2a29; margin: 0; text-align: center;">
                      Для завершения регистрации, пожалуйста, подтвердите ваш адрес электронной почты, нажав на кнопку ниже.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Кнопка и футер -->
          <tr>
            <td align="center" style="padding: 0 40px 50px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="background-color: #2c2a29; border-radius: 25px;">
                    <a href="${link}" target="_blank" style="display: inline-block; padding: 15px 35px; font-family: 'Cormorant', Georgia, serif; font-size: 18px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 25px;">
                      Подтвердить Email
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Подвал -->
              <p style="font-size: 14px; color: #8c8a89; margin-top: 40px; font-family: 'Inter', Arial, sans-serif;">
                © Aterna. Защищенные послания в будущее.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
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

    async sendPasswordChangeOtp(to: string, otp: string): Promise<void> {
        const apiToken = this.configService.get<string>("MAILOPOST_API_TOKEN");

        if (!apiToken) {
            throw new Error("MAILOPOST_API_TOKEN is not configured");
        }

        const fromEmail =
            this.configService.get<string>("MAILOPOST_FROM_EMAIL") || "noreply@bulbadyshka.ru";

        const htmlTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aterna - Смена пароля</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant:wght@500;600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f0eb; font-family: 'Inter', Arial, sans-serif; color: #2c2a29;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f0eb; padding: 40px 0;">
    <tr>
      <td align="center">
        <!-- Основная карточка письма -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 40px; box-shadow: 0px 20px 25px -3px rgba(0,0,0,0.05); overflow: hidden; margin: 0 auto; max-width: 90%;">
          
          <!-- Заголовок -->
          <tr>
            <td align="center" style="padding: 50px 40px 15px;">
              <h1 style="font-family: 'Cormorant', Georgia, serif; font-size: 36px; font-weight: 700; margin: 0; color: #2c2a29;">
                Смена пароля
              </h1>
            </td>
          </tr>

          <!-- Приветствие -->
          <tr>
            <td align="center" style="padding: 0 40px 30px;">
              <p style="font-family: 'Inter', Arial, sans-serif; font-size: 18px; margin: 0; color: #2c2a29;">
                Здравствуйте!
              </p>
            </td>
          </tr>

          <!-- Текст письма с кодом -->
          <tr>
            <td align="center" style="padding: 0 40px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f0eb; border-radius: 30px;">
                <tr>
                  <td align="center" style="padding: 30px 40px;">
                    <p style="font-family: 'Cormorant', Georgia, serif; font-size: 20px; line-height: 1.6; color: #2c2a29; margin: 0; text-align: center;">
                      Ваш код подтверждения для смены пароля:
                    </p>
                    <div style="font-family: 'Inter', Arial, sans-serif; font-size: 36px; font-weight: 700; letter-spacing: 8px; text-align: center; margin: 20px 0 0; color: #2c2a29;">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Дополнительная информация и футер -->
          <tr>
            <td align="center" style="padding: 0 40px 50px;">
              <p style="font-family: 'Inter', Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #8c8a89; margin: 0 0 40px; text-align: center;">
                Код действителен в течение 10 минут. Если вы не запрашивали смену пароля, проигнорируйте это письмо.
              </p>
              
              <!-- Подвал -->
              <p style="font-size: 14px; color: #8c8a89; margin: 0; font-family: 'Inter', Arial, sans-serif;">
                © Aterna. Защищенные послания в будущее.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

        const payload = {
            from_email: fromEmail,
            subject: "Код подтверждения для смены пароля",
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
            this.logger.log(`OTP email sent to ${to}`);
        } catch (error: any) {
            this.logger.error(`Failed to send OTP email to ${to}`);
            throw error;
        }
    }

    async sendNotificationEmail(
        to: string,
        firstName: string | undefined,
        _createdAt: Date,
        preview: string,
        link: string,
    ): Promise<void> {
        const apiToken = this.configService.get<string>("MAILOPOST_API_TOKEN");

        if (!apiToken) {
            throw new Error("MAILOPOST_API_TOKEN is not configured");
        }

        const fromEmail =
            this.configService.get<string>("MAILOPOST_FROM_EMAIL") || "noreply@bulbadyshka.ru";

        // Очищаем имя от эмодзи, цифр и спецсимволов, оставляя только буквы, пробелы и дефисы
        const cleanName = firstName ? firstName.replace(/[^\p{L}\s-]/gu, "").trim() : "";
        const greeting = cleanName ? `Привет, ${cleanName}!` : "Здравствуйте!";

        const htmlTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aterna - Письмо из прошлого</title>
  <!-- Подключаем шрифты Cormorant и Inter для почтовых клиентов, которые их поддерживают -->
  <link href="https://fonts.googleapis.com/css2?family=Cormorant:wght@500;600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f0eb; font-family: 'Inter', Arial, sans-serif; color: #2c2a29;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f0eb; padding: 40px 0;">
    <tr>
      <td align="center">
        <!-- Основная карточка письма -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 40px; box-shadow: 0px 20px 25px -3px rgba(0,0,0,0.05); overflow: hidden; margin: 0 auto; max-width: 90%;">
          
          <!-- Заголовок -->
          <tr>
            <td align="center" style="padding: 50px 40px 15px;">
              <h1 style="font-family: 'Cormorant', Georgia, serif; font-size: 36px; font-weight: 700; margin: 0; color: #2c2a29;">
                Вам письмо из прошлого
              </h1>
            </td>
          </tr>

          <!-- Приветствие -->
          <tr>
            <td align="center" style="padding: 0 40px 30px;">
              <p style="font-family: 'Inter', Arial, sans-serif; font-size: 18px; margin: 0; color: #2c2a29;">
                ${greeting}
              </p>
            </td>
          </tr>

          <!-- Текст письма -->
          <tr>
            <td align="center" style="padding: 0 40px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f0eb; border-radius: 30px;">
                <tr>
                  <td style="padding: 30px 40px;">
                    <p style="font-family: 'Cormorant', Georgia, serif; font-size: 20px; line-height: 1.6; color: #2c2a29; margin: 0; white-space: pre-wrap;">${preview}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Кнопка и футер -->
          <tr>
            <td align="center" style="padding: 0 40px 50px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <!-- Кнопка, ведущая на главную -->
                  <td align="center" style="background-color: #2c2a29; border-radius: 25px;">
                    <a href="${link}" target="_blank" style="display: inline-block; padding: 15px 35px; font-family: 'Cormorant', Georgia, serif; font-size: 18px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 25px;">
                      Написать новое письмо
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Подвал -->
              <p style="font-size: 14px; color: #8c8a89; margin-top: 40px; font-family: 'Inter', Arial, sans-serif;">
                © Aterna. Защищенные послания в будущее.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
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
