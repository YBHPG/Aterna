import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Устанавливаем глобальный префикс /api (чтобы адрес совпадал с настройками фронтенда)
    app.setGlobalPrefix("api");

    // Включаем CORS и разрешаем запросы с фронтенда (стандартные порты Vite и React)
    app.enableCors({
        origin: ["http://localhost:3001", "http://localhost:5173", "http://127.0.0.1"],
        credentials: true,
    });

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(3000);
}
bootstrap();
