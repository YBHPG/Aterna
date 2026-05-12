import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../utils/api";

interface MessageData {
    id: string;
    recipientEmail: string;
    triggerDate: string;
    status: string;
    content?: string;
    createdAt: string;
    isLocked?: boolean;
}

const ViewMessage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [message, setMessage] = useState<MessageData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [editContent, setEditContent] = useState<string>("");
    const [isSaving, setIsSaving] = useState<boolean>(false);

    useEffect(() => {
        const fetchMessage = async () => {
            try {
                const response = await api.get(`/messages/${id}`);
                setMessage(response.data);
                setEditContent(response.data.content || "");
            } catch (err: any) {
                if (err.response && err.response.status === 403) {
                    setError(
                        "Нет доступа к письму. Возможно, оно принадлежит другому пользователю.",
                    );
                } else if (err.response && err.response.status === 404) {
                    setError("Письмо не найдено.");
                } else {
                    setError("Произошла ошибка при загрузке письма.");
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchMessage();
        }
    }, [id]);

    if (loading) return <div className="py-8 text-center text-gray-500">Загрузка письма...</div>;
    if (error)
        return (
            <div className="max-w-2xl px-4 py-8 mx-auto text-center">
                <h2 className="mb-4 text-2xl font-bold text-red-600">{error}</h2>
                <Link to="/dashboard" className="text-blue-600 hover:underline">
                    Вернуться в Дашборд
                </Link>
            </div>
        );
    if (!message) return null;

    // Письмо можно редактировать, только если статус pending, оно не заблокировано и прошло менее 24 часов.
    // Следовательно, если статус 'sent' или 'cancelled', isEditable будет false и отрендерится обычный текст.
    const isEditable =
        message.status === "pending" &&
        !message.isLocked &&
        Date.now() - new Date(message.createdAt).getTime() < 24 * 60 * 60 * 1000;

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await api.patch(`/messages/${id}`, { content: editContent });
            alert("Изменения успешно сохранены!");
            setMessage({ ...message, content: editContent });
        } catch (err) {
            console.error("Ошибка при сохранении письма:", err);
            alert("Не удалось сохранить изменения.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-3xl px-4 py-8 mx-auto">
            <div className="p-8 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-100">
                    <h2 className="text-3xl font-bold text-gray-800">Ваше письмо в будущее</h2>
                    <span
                        className={`px-3 py-1 text-sm font-semibold rounded-full ${message.isLocked ? "text-yellow-800 bg-yellow-100" : "text-green-800 bg-green-100"}`}
                    >
                        {message.isLocked ? "Запечатано" : "Успешно расшифровано"}
                    </span>
                </div>

                <div className="mb-6 space-y-2 text-gray-600">
                    <p>
                        <span className="font-semibold text-gray-700">Получатель:</span>{" "}
                        {message.recipientEmail}
                    </p>
                    <p>
                        <span className="font-semibold text-gray-700">Запланировано на:</span>{" "}
                        {new Date(message.triggerDate).toLocaleString()}
                    </p>
                    <p>
                        <span className="font-semibold text-gray-700">Дата создания:</span>{" "}
                        {new Date(message.createdAt).toLocaleString()}
                    </p>
                </div>

                {message.isLocked ? (
                    <div className="p-12 text-center border-2 border-gray-300 border-dashed rounded-lg bg-gray-50">
                        <div className="mb-4 text-5xl">🔏</div>
                        <h3 className="mb-2 text-xl font-bold text-gray-700">Письмо запечатано</h3>
                        <p className="text-gray-500">
                            Вы сможете прочитать его после доставки или если отмените отправку.
                        </p>
                    </div>
                ) : isEditable ? (
                    <div className="p-6 shadow-inner bg-indigo-50 rounded-lg border-l-4 border-indigo-500">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2 text-gray-800 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <div className="mt-4 text-right">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 font-medium text-white transition-colors bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                            >
                                {isSaving ? "Сохранение..." : "Сохранить изменения"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 shadow-inner bg-indigo-50 rounded-lg border-l-4 border-indigo-500">
                        <p className="font-serif text-lg leading-relaxed text-gray-800 whitespace-pre-wrap">
                            {message.content}
                        </p>
                    </div>
                )}

                <div className="mt-8 text-center">
                    <Link
                        to="/dashboard"
                        className="inline-block px-6 py-2 text-white transition-colors bg-indigo-600 rounded hover:bg-indigo-700"
                    >
                        Вернуться в Дашборд
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ViewMessage;
