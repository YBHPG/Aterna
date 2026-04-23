# Aterna

## Описание

Бэкенд-часть веб-приложения Aterna. Проект построен на базе современной Node.js архитектуры с использованием фреймворка NestJS, обеспечивающего модульность, масштабируемость и строгую типизацию.

## Используемый технологический стек

- **Платформа:** Node.js
- **Фреймворк:** [NestJS](https://nestjs.com/)
- **Язык программирования:** TypeScript
- **Базы данных:**
    - PostgreSQL (ORM: [TypeORM](https://typeorm.io/)) — для реляционных данных (пользователи, авторизация).
    - MongoDB (ODM: [Mongoose](https://mongoosejs.com/)) — для документ-ориентированных данных (письма).
- **Очереди:** Redis + BullMQ — брокер задач для отложенной доставки писем (инфраструктура готова).
- **Безопасность и криптография:** `bcrypt` (хэширование паролей), Node.js `crypto` (AES-256-GCM)
- **Аутентификация:** JWT (Passport.js, `@nestjs/jwt`)
- **Валидация:** `joi` (env-переменные), `class-validator` (тела запросов)
- **Тестирование:** Jest

---

## Проделанная работа

### 1. Базовая инициализация проекта

- Развернут каркас приложения на NestJS.
- Настроена конфигурация TypeScript (`tsconfig.json`) и игнорируемые файлы (`.gitignore`).
- Установлены все ключевые зависимости (БД, криптография, тестирование).
- Настроена среда для выполнения изолированных Unit-тестов с помощью Jest.
- Поднята инфраструктура через Docker Compose: PostgreSQL, MongoDB, Redis.

### 2. Проектирование реляционной схемы данных пользователя

Реализован базовый модуль `UsersModule` для управления аутентификационными данными пользователей в PostgreSQL:

- **Entity (`User`):** Сущность с полями: уникальный идентификатор (`UUID`), нормализованный `email` (уникальный индекс), криптографический хэш пароля (`passwordHash`) и временные метки (`createdAt`, `updatedAt`).
- **Service (`UsersService`):**
    - `findByEmail` — поиск пользователя по email.
    - `create` — создание пользователя с нормализацией email и хэшированием пароля через `bcrypt` (salt rounds = 10).
- **Тестирование:** Unit-тесты (`users.service.spec.ts`) с мокированием репозитория.

### 3. JWT-аутентификация

Реализован модуль `AuthModule` на основе Passport.js со stateless JWT-аутентификацией:

- **`AuthService`:**
    - `validateUser` — проверка email и пароля через `bcrypt.compare`.
    - `login` — генерация JWT-токена с payload `{ email, sub: userId }`, TTL 24 часа.
- **`JwtStrategy`** — валидация Bearer-токена из заголовка `Authorization` при каждом запросе.
- **`JwtAuthGuard`** — глобальный guard: все роуты защищены по умолчанию. Публичные роуты помечаются декоратором `@Public()`.
- **Тестирование:** Unit-тесты (`auth.service.spec.ts`) на успешный логин, неверный пароль и несуществующего пользователя.

**Публичные эндпоинты:**

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/auth/register` | Регистрация пользователя, возвращает `access_token` |
| `POST` | `/auth/login` | Логин, возвращает `access_token` |

**Тело запросов:**
```json
{
  "email": "user@example.com",
  "password": "minimum6chars"
}
```

**Ответ:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Защищённые роуты требуют заголовка:
```
Authorization: Bearer <access_token>
```

### 4. Криптографическое ядро AES-256-GCM

Реализован изолированный модуль `CryptoModule` для шифрования пользовательских данных на уровне приложения (Application-Level Encryption) перед записью в базу данных.

- **Алгоритм:** AES-256-GCM (режим AEAD — обеспечивает конфиденциальность и целостность данных одновременно).
- **`CryptoService.encrypt(plainText)`** — шифрует строку:
    - Генерирует криптографически стойкий IV (12 байт) для каждого вызова.
    - Возвращает `{ encryptedContent, iv, authTag }` в формате Base64.
- **`CryptoService.decrypt(cipherText, iv, authTag)`** — расшифровывает:
    - Жёстко проверяет длину `authTag` (строго 16 байт) — защита от атак с усечённым тегом.
    - При малейшем изменении данных GCM-проверка подлинности выбрасывает исключение.
- **Мастер-ключ:** загружается из `ENCRYPTION_KEY` (32 байта, Base64). Длина проверяется при старте приложения.
- **Тестирование:** 13 Unit-тестов (`crypto.service.spec.ts`):
    - Успешный цикл encrypt → decrypt.
    - Корректная обработка пустых строк, юникода, длинных текстов (2KB+).
    - Перехват исключений при подмене `cipherText`, `iv`, `authTag` (включая усечённый тег).
    - Проверка невозможности расшифровки другим ключом.

---

## Переменные окружения

Скопируй `.env.example` в `.env` и заполни значения:

```dotenv
# PostgreSQL
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=

# MongoDB
MONGO_INITDB_ROOT_USERNAME=
MONGO_INITDB_ROOT_PASSWORD=

# Connection strings
POSTGRES_URI=postgresql://<user>:<password>@127.0.0.1:5432/<db>
MONGODB_URI=mongodb://<user>:<password>@127.0.0.1:27018/<db>?authSource=admin

# JWT
JWT_SECRET=

# AES-256-GCM master key (32 bytes, Base64)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
ENCRYPTION_KEY=
```

---

## Разработка и запуск

### Запуск инфраструктуры (PostgreSQL, MongoDB, Redis)

```bash
docker-compose up -d
```

### Установка зависимостей

```bash
npm install
```

### Запуск приложения

```bash
npm run start:dev
```

### Запуск тестов

```bash
npm run test
```

---

## Статус реализации

| Модуль | Статус |
|--------|--------|
| Инфраструктура (Docker Compose) | Ready |
| UsersModule | Ready |
| AuthModule (JWT) | Ready |
| CryptoModule (AES-256-GCM) | Ready |
| MessagesModule | In progress |
| Queue Worker (delayed delivery) | In progress |
