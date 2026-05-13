# Этап 1: Сборка (Build)
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
# Используем npm ci для строгой фиксации версий зависимостей (быстрее и надежнее npm install)
RUN npm ci
COPY . .
RUN npm run build

# Этап 2: Продакшен (Production)
FROM node:20-alpine
WORKDIR /usr/src/app

# Копируем только файлы для установки prod-зависимостей
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Копируем скомпилированный код из builder-а
COPY --from=builder /usr/src/app/dist ./dist

# Запускаем процесс от непривилегированного пользователя для защиты сервера
USER node

EXPOSE 3000
CMD ["npm", "run", "start:prod"]