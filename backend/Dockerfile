FROM node:20-alpine

# Создаем рабочую директорию
WORKDIR /usr/src/app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код приложения
COPY . .

# Порт по умолчанию для NestJS
EXPOSE 3000

# Запуск приложения
CMD ["npm", "run", "start:dev"]