# Этап 1: Сборка (Build)
FROM node:20-alpine AS builder
WORKDIR /app

# Устанавливаем зависимости
COPY package*.json ./
RUN npm ci

# Копируем исходный код и собираем проект. 
# Важно: ваш файл .env тоже будет скопирован сюда, и Vite «зашьет» переменные в статику.
COPY . .
RUN npm run build

# Этап 2: Раздача статики (Production server)
FROM nginx:alpine

# Копируем собранные файлы (из папки dist)
COPY --from=builder /app/dist /usr/share/nginx/html

# Перезаписываем дефолтный конфиг Nginx, чтобы добавить fallback на index.html для работы React Router (SPA)
RUN echo "server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files \$uri \$uri/ /index.html; } }" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]