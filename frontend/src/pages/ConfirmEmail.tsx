import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const ConfirmEmail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [status, setStatus] = useState("Подтверждение почты...");
    const processedRef = useRef(false); // Защита от двойного вызова useEffect в React Strict Mode

    useEffect(() => {
        if (processedRef.current) return;
        processedRef.current = true;

        const confirmAndSendDraft = async () => {
            const token = searchParams.get("token");
            if (!token) {
                toast.error("Токен подтверждения не найден");
                navigate("/");
                return;
            }

            try {
                // Обращаемся к бэкенду для подтверждения почты
                const response = await api.get(`/auth/confirm?token=${token}`);

                // Если бэкенд возвращает токен авторизации (для автовхода)
                const authToken =
                    response.data?.token ||
                    response.data?.access_token ||
                    response.data?.accessToken;
                if (authToken) {
                    login(authToken);
                }

                setStatus("Почта подтверждена! Перенаправляем...");

                // Проверяем наличие черновика, который ждал подтверждения
                const draft = localStorage.getItem("draft_message");
                if (draft) {
                    toast.success("Почта подтверждена! Теперь вы можете отправить письмо.");
                    navigate("/");
                } else {
                    toast.success("Ваша почта успешно подтверждена!");
                    navigate("/dashboard");
                }
            } catch (error) {
                console.error("Ошибка при подтверждении почты:", error);
                toast.error("Не удалось подтвердить почту. Возможно, ссылка устарела.");
                navigate("/dashboard");
            }
        };

        confirmAndSendDraft();
    }, [navigate, searchParams, login]);

    return (
        <div
            className="min-h-screen w-full flex flex-col"
            style={{ backgroundColor: "var(--color-bg-main)", fontFamily: "Inter, sans-serif" }}
        >
            {/* Header */}
            <header className="flex items-center justify-center gap-4 pt-6 pb-4 shrink-0">
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
            </header>

            {/* Main Content */}
            <main
                className="mx-auto px-4 flex-1 w-full flex items-center justify-center"
                style={{ maxWidth: 1120 }}
            >
                <div
                    className="w-full px-6 py-12 flex flex-col items-center text-center mx-auto"
                    style={{
                        backgroundColor: "var(--color-bg-card)",
                        borderRadius: 50,
                        maxWidth: 450,
                        boxShadow:
                            "0px 8px 10px -6px rgba(0,0,0,0.1), 0px 20px 25px -3px rgba(0,0,0,0.1)",
                    }}
                >
                    {/* Спиннер загрузки */}
                    <div className="w-12 h-12 mb-6 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
                    <h2
                        className="text-2xl md:text-3xl font-bold"
                        style={{ fontFamily: "Cormorant, serif", color: "var(--color-text-main)" }}
                    >
                        {status}
                    </h2>
                </div>
            </main>
        </div>
    );
};

export default ConfirmEmail;
