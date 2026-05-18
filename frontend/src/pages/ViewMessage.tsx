import React, { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

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
    const [isMenuHovered, setIsMenuHovered] = useState(false);
    const navigate = useNavigate();
    const { logout, user } = useAuth() as any;
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    // Авто-изменение высоты текстового поля при редактировании
    useEffect(() => {
        const el = textareaRef.current;
        if (el) {
            // 1. Запоминаем текущую высоту
            const currentHeight = el.style.height;

            // 2. Отключаем анимацию и ставим auto для правильного пересчета
            el.style.transition = "none";
            el.style.height = "auto";
            const targetHeight = el.scrollHeight;

            // 3. Возвращаем старую высоту и делаем принудительный reflow браузера
            el.style.height = currentHeight || `${targetHeight}px`;
            void el.offsetHeight;

            // 4. Включаем анимацию и задаем целевую высоту
            el.style.transition = "height 0.15s ease-out";
            el.style.height = `${targetHeight}px`;
        }
    }, [editContent]);

    if (loading) {
        return (
            <div
                className="min-h-screen w-full flex items-center justify-center"
                style={{ backgroundColor: "var(--color-bg-main)", fontFamily: "Inter, sans-serif" }}
            >
                <div
                    className="text-2xl"
                    style={{ fontFamily: "Cormorant, serif", color: "var(--color-text-main)" }}
                >
                    Загрузка письма...
                </div>
            </div>
        );
    }

    if (error)
        return (
            <div
                className="min-h-screen w-full flex items-center justify-center flex-col gap-6"
                style={{ backgroundColor: "var(--color-bg-main)", fontFamily: "Inter, sans-serif" }}
            >
                <h2
                    className="text-2xl font-bold text-red-600 text-center"
                    style={{ fontFamily: "Cormorant, serif" }}
                >
                    {error}
                </h2>
                <Link
                    to="/dashboard"
                    className="px-8 py-3 rounded-[25px] border transition-all duration-300 bg-transparent text-[var(--color-border)] border-[var(--color-border)] hover:bg-[rgba(var(--rgb-border),0.1)] text-center"
                    style={{
                        fontFamily: "Cormorant, serif",
                        fontWeight: 600,
                        fontSize: 16,
                        textDecoration: "none",
                    }}
                >
                    Вернуться к письмам
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
            toast.success("Изменения успешно сохранены!");
            navigate("/dashboard");
        } catch (err) {
            console.error("Ошибка при сохранении письма:", err);
            toast.error("Не удалось сохранить изменения.");
        } finally {
            setIsSaving(false);
        }
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
    } catch (e) {}

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

    // Форматирование дат
    const createdAtDate = new Date(message.createdAt);
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

    return (
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
                        onClick={(e) => {
                            if (!isMenuHovered) {
                                e.preventDefault();
                                setIsMenuHovered(true);
                            }
                        }}
                        className="relative z-10 bg-[var(--color-profile-bg)] text-[var(--color-profile-text)] px-7 py-3 rounded-[2rem] tracking-wide text-center block max-w-[150px] sm:max-w-[250px] truncate"
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
                            onClick={() => setIsMenuHovered(false)}
                            className="text-[var(--color-border)] w-full text-center transition-colors hover:text-[var(--color-error-hover)] mb-2"
                            style={{
                                fontFamily: "Cormorant, serif",
                                fontSize: 16,
                                fontWeight: 600,
                                textDecoration: "none",
                            }}
                        >
                            Список писем
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
                className={`mx-auto px-4 flex-1 w-full transition-all duration-300 ease-in-out ${isMenuHovered ? "mt-[84px] md:mt-[114px]" : "mt-[20px] md:mt-[50px]"}`}
                style={{ maxWidth: 1120 }}
            >
                <div
                    className="w-full px-6 py-8 md:px-[50px] md:py-[40px] flex flex-col mx-auto rounded-[30px] md:rounded-[50px]"
                    style={{
                        backgroundColor: "var(--color-bg-card)",
                        maxWidth: 800,
                        boxShadow:
                            "0px 8px 10px -6px rgba(0,0,0,0.1), 0px 20px 25px -3px rgba(0,0,0,0.1)",
                    }}
                >
                    {/* Header Info */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                        <h2
                            className="text-3xl md:text-4xl font-bold"
                            style={{
                                fontFamily: "Cormorant, serif",
                                color: "var(--color-text-main)",
                            }}
                        >
                            Письмо от {titleDate}
                        </h2>
                        <div
                            className="flex items-center space-x-3 shrink-0"
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

                    {/* Recipient */}
                    <div className="flex flex-col gap-2 mb-8">
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
                            className="truncate"
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

                    {/* Content Section */}
                    {message.isLocked ? (
                        <div
                            className="w-full flex flex-col items-center justify-center px-6 py-12 md:py-16 mb-8 text-center rounded-[20px] md:rounded-[30px]"
                            style={{ backgroundColor: "var(--color-bg-main)" }}
                        >
                            <div className="mb-4 text-5xl opacity-80">🔏</div>
                            <h3
                                className="mb-2 text-2xl font-bold"
                                style={{
                                    fontFamily: "Cormorant, serif",
                                    color: "var(--color-text-main)",
                                }}
                            >
                                Письмо запечатано
                            </h3>
                            <p
                                style={{
                                    fontFamily: "Inter, sans-serif",
                                    fontSize: 16,
                                    color: "var(--color-accent)",
                                }}
                            >
                                Вы сможете прочитать его после доставки или если отмените отправку.
                            </p>
                        </div>
                    ) : isEditable ? (
                        <div className="w-full flex flex-col mb-8">
                            <div
                                className="w-full px-6 py-4 md:px-[50px] md:py-[30px] rounded-[20px] md:rounded-[30px]"
                                style={{
                                    backgroundColor: "var(--color-bg-main)",
                                }}
                            >
                                <textarea
                                    ref={textareaRef}
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    className="w-full bg-transparent outline-none resize-none"
                                    style={{
                                        fontFamily: "Cormorant, serif",
                                        fontWeight: 500,
                                        fontSize: 18,
                                        lineHeight: "1.6",
                                        color: "var(--color-text-main)",
                                        overflow: "hidden",
                                        transition: "height 0.15s ease-out",
                                    }}
                                    rows={3}
                                />
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={`px-8 py-3 transition-opacity ${isSaving ? "opacity-50" : "hover:opacity-90"}`}
                                    style={{
                                        backgroundColor: "var(--color-accent)",
                                        color: "var(--color-bg-card)",
                                        borderRadius: 25,
                                        fontFamily: "Cormorant, serif",
                                        fontWeight: 700,
                                        fontSize: 16,
                                        border: "none",
                                        cursor: isSaving ? "not-allowed" : "pointer",
                                    }}
                                >
                                    {isSaving ? "Сохранение..." : "Сохранить изменения"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="w-full px-6 py-4 md:px-[50px] md:py-[30px] mb-8 rounded-[20px] md:rounded-[30px]"
                            style={{ backgroundColor: "var(--color-bg-main)" }}
                        >
                            <p
                                className="w-full bg-transparent outline-none whitespace-pre-wrap"
                                style={{
                                    fontFamily: "Cormorant, serif",
                                    fontWeight: 500,
                                    fontSize: 18,
                                    lineHeight: "1.6",
                                    color: "var(--color-text-main)",
                                }}
                            >
                                {message.content}
                            </p>
                        </div>
                    )}

                    {/* Back Button */}
                    <div className="flex justify-center mt-2">
                        <Link
                            to="/dashboard"
                            className="px-8 py-3 rounded-[25px] border transition-all duration-300 bg-transparent text-[var(--color-border)] border-[var(--color-border)] hover:bg-[rgba(var(--rgb-border),0.1)] text-center"
                            style={{
                                fontFamily: "Cormorant, serif",
                                fontWeight: 600,
                                fontSize: 16,
                                textDecoration: "none",
                            }}
                        >
                            Вернуться к письмам
                        </Link>
                    </div>
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
    );
};

export default ViewMessage;
