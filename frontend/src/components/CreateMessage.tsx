import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios'; // Если у вас есть глобально настроенный API инстанс, импортируйте его (например, import api from '../api')
import { useNavigate } from 'react-router-dom';

interface CreateMessageForm {
  content: string;
  recipientEmail: string;
  triggerDate: string;
}

export const CreateMessage: React.FC = () => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateMessageForm>();
  const navigate = useNavigate();

  // Обязательная очистка стейта формы при размонтировании (unmount)
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const onSubmit = async (data: CreateMessageForm) => {
    try {
      // Преобразуем дату из локального формата input в ISO-строку (UTC)
      const payload = {
        ...data,
        triggerDate: new Date(data.triggerDate).toISOString(),
      };

      // Вызов POST /messages к бэкенду
      // Примечание: Убедитесь, что префикс /api нужен. Если в NestJS нет app.setGlobalPrefix('api'), путь будет просто /messages
      const token = localStorage.getItem('access_token'); // Берем токен из хранилища
      
      const response = await axios.post('http://localhost:3000/messages', payload, {
        headers: {
          Authorization: `Bearer ${token}`, // Передаем токен согласно требованиям бэкенда
        },
      });

      if (response.status === 201) {
        // MVP-уведомление (замените на нужную библиотеку Toast при необходимости)
        alert('Письмо успешно отправлено в будущее!'); 
        // Очищаем стейт формы
        reset(); 
        // Выполняем редирект
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Ошибка при отправке сообщения в будущее:', error);
    }
  };

  const validateFutureDate = (value: string) => {
    const selectedDate = new Date(value).getTime();
    const minDate = Date.now() + 3600000; // Текущее время + 1 час (в мс)
    return selectedDate > minDate || 'Дата отправки должна быть минимум на 1 час в будущем';
  };

  return (
    <div className="create-message-container">
      <h2>Письмо в будущее</h2>
      {/* Отключаем автозаполнение на уровне формы */}
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
        <div className="form-group">
          <label htmlFor="content">Текст сообщения:</label>
          <textarea
            id="content"
            {...register('content', { required: 'Введите текст сообщения' })}
            rows={5}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {errors.content && <span className="error-message">{errors.content.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="recipientEmail">Email получателя:</label>
          <input
            type="email"
            id="recipientEmail"
            {...register('recipientEmail', {
              required: 'Введите email получателя',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Введите корректный email',
              },
            })}
          />
          {errors.recipientEmail && <span className="error-message">{errors.recipientEmail.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="triggerDate">Дата и время отправки:</label>
          <input
            type="datetime-local"
            id="triggerDate"
            {...register('triggerDate', {
              required: 'Укажите дату и время отправки',
              validate: validateFutureDate,
            })}
          />
          {errors.triggerDate && <span className="error-message">{errors.triggerDate.message}</span>}
        </div>

        <button type="submit">Отправить в будущее</button>
      </form>
    </div>
  );
};

export default CreateMessage;