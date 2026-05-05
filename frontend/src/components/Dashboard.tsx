import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { MessageItem } from './MessageItem';
import { useAuth } from '../context/AuthContext';

// Интерфейс метаданных сообщения (основан на модели бэкенда, без зашифрованного контента)
export interface Message {
  _id: string;
  recipientEmail: string;
  triggerDate: string;
  status: 'pending' | 'sent' | 'error' | 'cancelled';
}

export const Dashboard: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const fetchMessages = useCallback(async () => {
    console.log('Вызван fetchMessages: попытка GET /messages');
    setLoading(true);
      try {
        const response = await api.get('/messages');
        
        console.log('Ответ от API /messages:', response.data);
        
        // Проверяем формат ответа и безопасно устанавливаем стейт
        if (Array.isArray(response.data)) {
          setMessages(response.data);
        } else if (response.data && Array.isArray(response.data.data)) {
          setMessages(response.data.data); // Если данные в response.data.data
        } else {
          console.warn('Неожиданный формат данных от API:', response.data);
        }
        setError(null);
      } catch (err: any) {
        console.error('Ошибка при загрузке сообщений:', err);
        if (err.response && err.response.status === 401) {
          logout();
          navigate('/login');
        } else {
          setError('Не удалось загрузить список писем.');
        }
      } finally {
        setLoading(false);
      }
  }, [logout, navigate]);

  useEffect(() => {
    console.log('Dashboard useEffect запущен');
    fetchMessages();
  }, [fetchMessages]);

  const handleCancel = async (id: string) => {
    // Сохраняем текущее состояние для возможного отката
    const previousMessages = [...messages];
    
    // Оптимистичное обновление локального стейта (без ожидания ответа сервера)
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg._id === id ? { ...msg, status: 'cancelled' } : msg
      )
    );

    try {
      await api.patch(`/messages/${id}/cancel`);
    } catch (err: any) {
      console.error('Ошибка при отмене сообщения:', err);
      // Откат состояния в случае неудачного запроса
      setMessages(previousMessages);

      if (err.response && err.response.status === 401) {
        logout();
        navigate('/login');
      }
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Загрузка писем...</div>;
  }

  return (
    <div className="max-w-4xl px-4 py-8 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Мои письма в будущее</h2>
        <button onClick={fetchMessages} className="px-4 py-2 text-sm text-white transition-colors bg-blue-600 rounded hover:bg-blue-700">
          Обновить
        </button>
      </div>
      
      {error && <div className="mb-4 text-red-500">{error}</div>}

      {messages.length === 0 && !error ? (
        <p className="text-gray-500">У вас пока нет запланированных писем.</p>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageItem key={msg._id} message={msg} onCancel={handleCancel} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;