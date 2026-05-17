import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Message } from "./Dashboard";
import { createPortal } from "react-dom";

interface MessageItemProps {
    message: Message;
    onCancel: (id: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onCancel }) => {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const createdAtDate = message.createdAt ? new Date(message.createdAt) : new Date();
    const triggerDateObj = new Date(message.triggerDate);

    const titleDate = createdAtDate.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
    const startDate = createdAtDate.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
    const endDate = triggerDateObj.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    // Проверяем, прошло ли меньше 24 часов
    const isWithin24Hours = Date.now() - createdAtDate.getTime() < 24 * 60 * 60 * 1000;
    const canEdit = message.status === "pending" && isWithin24Hours;
    const canRead = message.status === "sent";

    return (
        <>
            <div className="flex items-center bg-[var(--color-bg-msg)] px-8 py-6 md:px-12 md:py-8 rounded-[2.5rem] shadow-sm w-full transition-transform hover:-translate-y-1 border border-[rgba(var(--rgb-border),0.05)]">
                <div className="flex-grow grid grid-cols-1 xl:grid-cols-3 gap-x-8 gap-y-6 items-end w-full">
                    {/* Заголовок и Даты */}
                    <div className="flex flex-col gap-2">
                        <span
                            className="font-medium"
                            style={{
                                fontFamily: "Inter, sans-serif",
                                fontSize: 18,
                                color: "var(--color-text-main)",
                            }}
                        >
                            Письмо от {titleDate}
                        </span>
                        <div
                            className="flex items-center space-x-3"
                            style={{
                                fontFamily: "Cormorant, serif",
                                fontWeight: 500,
                                fontSize: 18,
                                color: "var(--color-text-main)",
                            }}
                        >
                            <span>{startDate}</span>
                            <span style={{ fontFamily: "sans-serif", fontSize: 16 }}>→</span>
                            <span>{endDate}</span>
                        </div>
                    </div>

                    {/* Адрес получателя */}
                    <div className="flex flex-col gap-2 overflow-hidden xl:items-center w-full">
                        <span
                            className="font-medium"
                            style={{
                                fontFamily: "Inter, sans-serif",
                                fontSize: 16,
                                color: "var(--color-text-main)",
                            }}
                        >
                            Адрес получателя
                        </span>
                        <span
                            className="truncate w-full xl:text-center"
                            title={message.recipientEmail}
                            style={{
                                fontFamily: "Cormorant, serif",
                                fontWeight: 400,
                                fontSize: 18,
                                color: "var(--color-text-main)",
                                letterSpacing: "0.6px",
                            }}
                        >
                            {message.recipientEmail}
                        </span>
                    </div>

                    {/* Кнопки */}
                    <div className="flex flex-wrap items-center justify-start xl:justify-end gap-2.5 w-full">
                        {canEdit && (
                            <Link
                                to={`/messages/${message._id}`}
                                className="px-6 py-2.5 rounded-[22px] border transition-all duration-300 bg-transparent text-[var(--color-border)] border-[var(--color-border)] hover:bg-[rgba(var(--rgb-border),0.1)] text-center"
                                style={{
                                    fontFamily: "Cormorant, serif",
                                    fontWeight: 500,
                                    fontSize: 18,
                                    textDecoration: "none",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                Изменить
                            </Link>
                        )}
                        {canRead && (
                            <Link
                                to={`/messages/${message._id}`}
                                className="px-6 py-2.5 rounded-[22px] border transition-all duration-300 bg-transparent text-[var(--color-border)] border-[var(--color-border)] hover:bg-[rgba(var(--rgb-border),0.1)] text-center"
                                style={{
                                    fontFamily: "Cormorant, serif",
                                    fontWeight: 500,
                                    fontSize: 18,
                                    textDecoration: "none",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                Прочитать
                            </Link>
                        )}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                setIsDeleteModalOpen(true);
                            }}
                            className="px-6 py-2.5 rounded-[22px] border transition-all duration-300 bg-[var(--color-danger)] border-[var(--color-danger)] text-[var(--color-bg-msg)] hover:bg-[var(--color-danger-hover)] text-center"
                            style={{
                                fontFamily: "Cormorant, serif",
                                fontWeight: 500,
                                fontSize: 18,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Удалить
                        </button>
                    </div>
                </div>
            </div>

            {/* Кастомное модальное окно удаления */}
            {isDeleteModalOpen &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity"
                        onClick={() => setIsDeleteModalOpen(false)}
                    >
                        <div
                            className="bg-[var(--color-bg-card)] p-8 md:p-12 rounded-[40px] shadow-2xl max-w-md w-full border border-[rgba(var(--rgb-border),0.1)] flex flex-col items-center gap-8 transform transition-transform"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3
                                className="text-xl md:text-2xl font-semibold text-center"
                                style={{
                                    fontFamily: "Inter, sans-serif",
                                    color: "var(--color-text-main)",
                                    lineHeight: "1.4",
                                    fontWeight: 400,
                                    fontSize: 20,
                                }}
                            >
                                Вы уверены, что хотите удалить письмо от{" "}
                                {titleDate.replace(/\s*г\.$/, "")}?
                            </h3>
                            <div className="flex flex-wrap justify-center w-full gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="px-6 py-2.5 rounded-[22px] border transition-all duration-300 bg-transparent text-[var(--color-border)] border-[var(--color-border)] hover:bg-[rgba(var(--rgb-border),0.1)] text-center flex-1 min-w-[120px]"
                                    style={{
                                        fontFamily: "Cormorant, serif",
                                        fontWeight: 400,
                                        fontSize: 18,
                                        cursor: "pointer",
                                    }}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        onCancel(message._id);
                                    }}
                                    className="px-6 py-2.5 rounded-[22px] border transition-all duration-300 bg-[var(--color-danger)] border-[var(--color-danger)] text-[var(--color-bg-msg)] hover:bg-[var(--color-danger-hover)] text-center flex-1 min-w-[120px]"
                                    style={{
                                        fontFamily: "Cormorant, serif",
                                        fontWeight: 400,
                                        fontSize: 18,
                                        cursor: "pointer",
                                    }}
                                >
                                    Удалить
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
};
