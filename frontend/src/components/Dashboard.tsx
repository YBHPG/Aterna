import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../utils/api";
import { useNavigate, Link } from "react-router-dom";
import { MessageItem } from "./MessageItem";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

// Интерфейс метаданных сообщения (основан на модели бэкенда, без зашифрованного контента)
export interface Message {
    _id: string;
    recipientEmail: string;
    triggerDate: string;
    status: "pending" | "sent" | "error" | "cancelled" | "cancelling";
    createdAt?: string;
}

export const Dashboard: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { logout, user, isAuthenticated } = useAuth() as any;
    const [isMenuHovered, setIsMenuHovered] = useState(false);
    const cancelTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const fetchMessages = useCallback(async () => {
        console.log("Вызван fetchMessages: попытка GET /messages");
        setLoading(true);
        try {
            const response = await api.get("/messages");

            console.log("Ответ от API /messages:", response.data);

            // Проверяем формат ответа и безопасно устанавливаем стейт
            if (Array.isArray(response.data)) {
                setMessages(response.data);
            } else if (response.data && Array.isArray(response.data.data)) {
                setMessages(response.data.data); // Если данные в response.data.data
            } else {
                console.warn("Неожиданный формат данных от API:", response.data);
            }
            setError(null);
        } catch (err: any) {
            console.error("Ошибка при загрузке сообщений:", err);
            if (err.response && err.response.status === 401) {
                logout();
                navigate("/login");
            } else {
                setError("Не удалось загрузить список писем.");
            }
        } finally {
            setLoading(false);
        }
    }, [logout, navigate]);

    useEffect(() => {
        console.log("Dashboard useEffect запущен");
        fetchMessages();
    }, [fetchMessages]);

    const undoCancel = (id: string, originalStatus: Message["status"]) => {
        if (cancelTimeouts.current[id]) {
            clearTimeout(cancelTimeouts.current[id]);
            delete cancelTimeouts.current[id];
        }
        setMessages((prev) =>
            prev.map((msg) => (msg._id === id ? { ...msg, status: originalStatus } : msg)),
        );
    };

    const handleCancel = (id: string) => {
        const msgToCancel = messages.find((m) => m._id === id);
        if (!msgToCancel) return;
        const originalStatus = msgToCancel.status;

        // Оптимистичное локальное скрытие письма с анимацией
        setMessages((prevMessages) =>
            prevMessages.map((msg) => (msg._id === id ? { ...msg, status: "cancelling" } : msg)),
        );

        // Окончательное удаление из DOM после завершения анимации (500 мс)
        setTimeout(() => {
            setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                    msg._id === id && msg.status === "cancelling"
                        ? { ...msg, status: "cancelled" }
                        : msg,
                ),
            );
        }, 500);

        // Показываем тост с кнопкой отмены
        toast.custom(
            (t) => (
                <div
                    className={`${t.visible ? "opacity-100" : "opacity-0"} transition-opacity duration-300 relative flex flex-col bg-[var(--color-bg-card)] text-[var(--color-text-main)] rounded-[22px] border-2 border-[rgba(var(--rgb-border),0.2)] shadow-[0px_10px_25px_-5px_rgba(0,0,0,0.3),0px_8px_10px_-6px_rgba(0,0,0,0.1)] overflow-hidden group`}
                    style={{ fontFamily: "Cormorant, serif", fontSize: "18px", fontWeight: 400 }}
                >
                    <div className="flex items-center gap-3 px-5 py-3.5 pb-4">
                        {/* Иконка галочки */}
                        <div className="flex items-center justify-center w-[22px] h-[22px] bg-[var(--color-accent)] text-[var(--color-bg-card)] rounded-full shrink-0">
                            <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <span className="whitespace-nowrap">Письмо удалено!</span>
                        <button
                            onClick={() => {
                                toast.dismiss(t.id);
                                undoCancel(id, originalStatus);
                            }}
                            className="px-3 py-1.5 bg-[var(--color-bg-main)] rounded-[22px] hover:bg-[var(--color-beige-btn-hover)] transition-colors border border-[rgba(var(--rgb-border),0.2)] ml-2 cursor-pointer"
                            style={{
                                fontFamily: "Inter, sans-serif",
                                fontSize: 14,
                                fontWeight: 500,
                            }}
                        >
                            Отменить
                        </button>
                    </div>
                    {/* Полоска прогресса */}
                    <div className="absolute bottom-0 left-0 h-[4px] w-full bg-[rgba(var(--rgb-border),0.1)]">
                        <div
                            className="h-full bg-[var(--color-accent)] group-hover:[animation-play-state:paused]"
                            style={{ animation: "toast-progress 5s linear forwards" }}
                        />
                    </div>
                </div>
            ),
            { duration: 5000 },
        );

        // Отложенный запрос на бэкенд
        cancelTimeouts.current[id] = setTimeout(async () => {
            try {
                await api.patch(`/messages/${id}/cancel`);
            } catch (err: any) {
                console.error("Ошибка при отмене сообщения:", err);
                setMessages((prev) =>
                    prev.map((msg) => (msg._id === id ? { ...msg, status: originalStatus } : msg)),
                );
                toast.error("Не удалось удалить письмо");

                if (err.response && err.response.status === 401) {
                    logout();
                    navigate("/login");
                }
            }
            delete cancelTimeouts.current[id];
        }, 5000);
    };

    // Получение данных пользователя для хедера
    let decodedToken: any = null;
    try {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token");
        if (token) {
            const base64Url = token.split(".")[1];
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const binString = atob(base64);
            const bytes = new Uint8Array(binString.length);
            for (let i = 0; i < binString.length; i++) {
                bytes[i] = binString.charCodeAt(i);
            }
            decodedToken = JSON.parse(new TextDecoder().decode(bytes));
        }
    } catch (e) {
        // игнорируем ошибку парсинга
    }

    const currentUser = user?.user || user || decodedToken;
    const displayName =
        currentUser?.firstName ||
        currentUser?.name ||
        currentUser?.telegramUsername ||
        currentUser?.telegram?.username ||
        currentUser?.email ||
        "Профиль";

    const nameLen = displayName.length;
    const nameFontSize = nameLen > 22 ? 14 : 16;

    const activeMessages = messages.filter((msg) => msg.status !== "cancelled");

    return (
        <>
            <style>{`
                @keyframes toast-progress {
                    0% { width: 100%; }
                    100% { width: 0%; }
                }
                @keyframes message-appear {
                    0% { opacity: 0; transform: scale(0.9); max-height: 0; padding-bottom: 0; }
                    100% { opacity: 1; transform: scale(1); max-height: 400px; padding-bottom: 2rem; }
                }
            `}</style>
            <div
                className="min-h-screen w-full flex flex-col"
                style={{ backgroundColor: "var(--color-bg-main)", fontFamily: "Inter, sans-serif" }}
            >
                {/* Header */}
                <header className="flex items-center justify-center gap-4 pt-6 pb-4 relative z-50 shrink-0">
                    <Link
                        to="/"
                        className="flex items-center shrink-0 hover:opacity-80 transition-opacity"
                    >
                        <img
                            src="/logo.svg"
                            alt="Logo"
                            className="h-10 w-12 object-contain"
                            style={{ filter: "var(--logo-filter)" }}
                        />
                    </Link>
                    <img
                        src="/arrow.svg"
                        alt="Arrow"
                        className="h-4 object-contain"
                        style={{ width: 94, filter: "var(--logo-filter)" }}
                    />

                    <div
                        className="relative inline-flex flex-col items-center group font-serif w-max cursor-pointer"
                        onMouseEnter={() => setIsMenuHovered(true)}
                        onMouseLeave={() => setIsMenuHovered(false)}
                    >
                        <Link
                            to="/profile"
                            className="relative z-10 bg-[var(--color-profile-bg)] text-[var(--color-profile-text)] px-7 py-3 rounded-[2rem] tracking-wide text-center block max-w-[200px] sm:max-w-[250px] truncate"
                            style={{
                                fontFamily: "Cormorant, serif",
                                fontSize: nameFontSize,
                                textDecoration: "none",
                                lineHeight: "1.2",
                            }}
                            title={displayName}
                        >
                            {displayName}
                        </Link>

                        <div className="absolute top-0 left-0 w-full bg-[var(--color-dropdown-bg)] rounded-[2rem] flex flex-col items-center justify-end -z-10 h-[52px] opacity-0 pointer-events-none group-hover:h-[116px] group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 ease-in-out overflow-hidden shadow-sm pb-[12px]">
                            <Link
                                to="/dashboard"
                                className="text-[var(--color-border)] w-full text-center transition-colors hover:text-[var(--color-error-hover)] mb-2"
                                style={{
                                    fontFamily: "Cormorant, serif",
                                    fontSize: 16,
                                    fontWeight: 600,
                                    textDecoration: "none",
                                }}
                            >
                                Дашборд
                            </Link>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsMenuHovered(false);
                                    if (logout) logout();
                                    navigate("/");
                                }}
                                className="text-[var(--color-error)] w-full text-center transition-colors hover:text-[var(--color-error-hover)]"
                                style={{
                                    fontFamily: "Cormorant, serif",
                                    fontSize: 16,
                                    fontWeight: 600,
                                }}
                            >
                                Выйти
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main
                    className={`mx-auto px-4 flex-1 w-full transition-all duration-300 ease-in-out ${
                        isMenuHovered ? "mt-[84px] md:mt-[114px]" : "mt-[20px] md:mt-[50px]"
                    }`}
                    style={{ maxWidth: 1120 }}
                >
                    <div className="w-full flex flex-col">
                        <div className="flex flex-col items-center justify-center mb-12 gap-6">
                            <h2
                                className="text-4xl md:text-5xl font-bold text-center"
                                style={{
                                    fontFamily: "Cormorant, serif",
                                    color: "var(--color-text-main)",
                                }}
                            >
                                Отправленные письма
                            </h2>
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                <button
                                    onClick={() => navigate("/")}
                                    className="px-6 py-2.5 rounded-[22px] border transition-all duration-300 bg-transparent text-[var(--color-border)] border-[var(--color-border)] hover:bg-[rgba(var(--rgb-border),0.1)]"
                                    style={{
                                        fontFamily: "Cormorant, serif",
                                        fontWeight: 600,
                                        fontSize: 16,
                                        cursor: "pointer",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    Написать новое письмо
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="pb-8 w-full">
                                        <div className="flex items-center bg-[rgba(var(--rgb-bg-msg),0.6)] px-8 py-6 md:px-12 md:py-8 rounded-[2.5rem] shadow-sm w-full border border-[rgba(var(--rgb-border),0.05)]">
                                            <div className="flex-grow grid grid-cols-1 xl:grid-cols-3 gap-x-8 gap-y-6 items-end w-full">
                                                <div className="flex flex-col gap-3">
                                                    <div className="h-6 bg-[rgba(var(--rgb-border),0.1)] rounded-md w-3/4 animate-pulse"></div>
                                                    <div className="h-5 bg-[rgba(var(--rgb-border),0.1)] rounded-md w-1/2 animate-pulse"></div>
                                                </div>
                                                <div className="flex flex-col gap-3 xl:items-center w-full">
                                                    <div className="h-5 bg-[rgba(var(--rgb-border),0.1)] rounded-md w-1/2 xl:w-1/3 animate-pulse"></div>
                                                    <div className="h-6 bg-[rgba(var(--rgb-border),0.1)] rounded-md w-3/4 xl:w-2/3 animate-pulse"></div>
                                                </div>
                                                <div className="flex flex-wrap items-center justify-start xl:justify-end gap-2.5 w-full">
                                                    <div className="h-[46px] w-[120px] bg-[rgba(var(--rgb-border),0.1)] rounded-[22px] animate-pulse"></div>
                                                    <div className="h-[46px] w-[120px] bg-[rgba(var(--rgb-border),0.1)] rounded-[22px] animate-pulse"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="mb-4 text-red-500 font-medium text-center">{error}</div>
                        ) : activeMessages.length === 0 ? (
                            <p
                                className="text-xl opacity-80 text-center"
                                style={{
                                    fontFamily: "Cormorant, serif",
                                    color: "var(--color-text-main)",
                                }}
                            >
                                У вас пока нет запланированных писем.
                            </p>
                        ) : (
                            <div className="flex flex-col">
                                {activeMessages.map((msg) => (
                                    <div
                                        key={msg._id}
                                        className={`transition-all duration-500 ease-in-out origin-top overflow-hidden ${
                                            msg.status === "cancelling"
                                                ? "opacity-0 scale-90 max-h-0 pb-0"
                                                : "opacity-100 scale-100 max-h-[400px] pb-8"
                                        }`}
                                        style={{
                                            animation:
                                                msg.status !== "cancelling"
                                                    ? "message-appear 0.5s ease-out"
                                                    : "none",
                                        }}
                                    >
                                        <MessageItem message={msg} onCancel={handleCancel} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                {/* Footer */}
                <footer
                    className="w-full py-8 mt-10 flex flex-col items-center justify-center gap-2 text-[rgba(var(--rgb-accent),0.7)] shrink-0"
                    style={{ fontFamily: "Inter, sans-serif" }}
                >
                    <div className="text-sm font-medium">
                        © {new Date().getFullYear()} Aterna. Защищенные послания в будущее.
                    </div>
                    <div className="text-xs flex gap-4 mt-1">
                        <Link to="#" className="hover:text-[var(--color-accent)] transition-colors">
                            Политика конфиденциальности
                        </Link>
                        <Link to="#" className="hover:text-[var(--color-accent)] transition-colors">
                            Технологии безопасности
                        </Link>
                    </div>
                </footer>
            </div>
        </>
    );
};

export default Dashboard;
