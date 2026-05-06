import React from "react";
import { Link } from "react-router-dom";
import { Message } from "./Dashboard";

interface MessageItemProps {
    message: Message;
    onCancel: (id: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onCancel }) => {
    // Функция для рендера бейджа с цветовым кодированием (Подзадача 17.3)
    const renderStatusBadge = (status: Message["status"]) => {
        switch (status) {
            case "pending":
                return (
                    <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full">
                        В очереди
                    </span>
                );
            case "sent":
                return (
                    <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">
                        Отправлено
                    </span>
                );
            case "error":
                return (
                    <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded-full">
                        Ошибка
                    </span>
                );
            case "cancelled":
                return (
                    <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full">
                        Отменено
                    </span>
                );
            default:
                return (
                    <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full">
                        {status}
                    </span>
                );
        }
    };

    return (
        <Link
            to={`/messages/${message._id}`}
            className="block transition-transform hover:-translate-y-1"
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border rounded-md shadow-sm hover:shadow-md gap-4">
                <div>
                    <p className="font-medium text-gray-800">{message.recipientEmail}</p>
                    <p className="text-sm text-gray-500">
                        {new Date(message.triggerDate).toLocaleString()}
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    {renderStatusBadge(message.status)}

                    {/* Отрисовка кнопки отмены только для статуса pending (Подзадача 17.4) */}
                    {message.status === "pending" && (
                        <button
                            type="button"
                            className="px-3 py-1 text-sm font-medium text-red-600 transition-colors border border-red-600 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                            onClick={(e) => {
                                e.preventDefault(); // Предотвращаем переход по ссылке при отмене
                                onCancel(message._id);
                            }}
                        >
                            Отменить
                        </button>
                    )}
                </div>
            </div>
        </Link>
    );
};
