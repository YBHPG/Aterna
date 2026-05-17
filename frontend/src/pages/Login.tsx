import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { TelegramLoginButton, TelegramUser } from "../components/TelegramLoginButton";
import toast from "react-hot-toast";

interface LoginFormInputs {
    email: string;
    password: string;
}

const decodeJWT = (token: string) => {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const binString = atob(base64);
        const bytes = new Uint8Array(binString.length);
        for (let i = 0; i < binString.length; i++) {
            bytes[i] = binString.charCodeAt(i);
        }
        return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
        return null;
    }
};

const Login: React.FC = () => {
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<LoginFormInputs>();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [showPassword, setShowPassword] = useState(false);

    const passwordValue = watch("password");

    const processDraftAndRedirect = async () => {
        const draft = localStorage.getItem("draft_message");
        if (draft) {
            navigate("/");
        } else {
            navigate("/dashboard");
        }
    };

    const onSubmit = async (data: LoginFormInputs) => {
        try {
            const response = await api.post("/auth/login", data);
            // Ищем токен под разными возможными ключами
            const token =
                response.data.token || response.data.access_token || response.data.accessToken;
            if (token) {
                const decoded = decodeJWT(token);
                const isDummyEmail = decoded?.email?.endsWith("@telegram.local");
                const isEmailConfirmed = decoded?.isEmailConfirmed !== false || isDummyEmail;

                if (!isEmailConfirmed) {
                    toast.error(
                        "Пожалуйста, подтвердите вашу почту перед входом. Письмо было отправлено при регистрации.",
                    );
                    return;
                }

                login(token); // сохраняет токен в localStorage и обновляет контекст (подзадача 15.4)
                await processDraftAndRedirect();
            }
        } catch (error: any) {
            console.error("Ошибка при входе:", error);
            toast.error("Не удалось войти в систему. Проверьте данные и попробуйте снова.");
        }
    };

    const handleTelegramAuth = async (user: TelegramUser) => {
        try {
            const response = await api.post("/auth/telegram", user);
            const token =
                response.data.token || response.data.access_token || response.data.accessToken;
            if (token) {
                const decoded = decodeJWT(token);
                const isDummyEmail = decoded?.email?.endsWith("@telegram.local");
                const isEmailConfirmed = decoded?.isEmailConfirmed !== false || isDummyEmail;

                if (!isEmailConfirmed) {
                    toast.error("Сначала подтвердите вашу почту, привязанную к аккаунту.");
                    return;
                }

                login(token); // сохраняет токен в localStorage и обновляет контекст
                await processDraftAndRedirect();
            }
        } catch (error: any) {
            console.error("Ошибка при входе через Telegram:", error);
            toast.error("Не удалось войти через Telegram. Попробуйте снова.");
        }
    };

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
                    className="w-full px-6 py-8 md:px-[50px] md:py-[40px] flex flex-col mx-auto rounded-[30px] md:rounded-[50px]"
                    style={{
                        backgroundColor: "var(--color-bg-card)",
                        maxWidth: 450,
                        boxShadow:
                            "0px 8px 10px -6px rgba(0,0,0,0.1), 0px 20px 25px -3px rgba(0,0,0,0.1)",
                    }}
                >
                    <h2
                        className="mb-8 text-3xl md:text-4xl font-bold text-center"
                        style={{ fontFamily: "Cormorant, serif", color: "var(--color-text-main)" }}
                    >
                        Вход
                    </h2>

                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <label
                                className="text-base font-medium"
                                style={{ color: "var(--color-text-main)" }}
                            >
                                Email
                            </label>
                            <div className="flex items-center px-4 py-2.5 bg-[var(--color-bg-main)] rounded-[22px]">
                                <input
                                    id="email"
                                    type="email"
                                    className="bg-transparent outline-none w-full"
                                    style={{
                                        fontFamily: "Cormorant, serif",
                                        fontSize: 16,
                                        color: "var(--color-text-main)",
                                    }}
                                    autoComplete="username"
                                    {...register("email", { required: "Введите email" })}
                                />
                            </div>
                            {errors.email && (
                                <span className="text-sm text-red-500">{errors.email.message}</span>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label
                                className="text-base font-medium"
                                style={{ color: "var(--color-text-main)" }}
                            >
                                Пароль
                            </label>
                            <div className="flex items-center px-4 py-2.5 bg-[var(--color-bg-main)] rounded-[22px]">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    className="bg-transparent outline-none w-full"
                                    style={{
                                        fontFamily: "Cormorant, serif",
                                        fontSize: 16,
                                        color: "var(--color-text-main)",
                                    }}
                                    autoComplete="current-password"
                                    {...register("password", { required: "Введите пароль" })}
                                />
                                {!!passwordValue && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="ml-2 text-[var(--color-text-main)] opacity-60 hover:opacity-100 transition-opacity focus:outline-none flex-shrink-0"
                                    >
                                        {showPassword ? (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                                                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                                                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                                                <line x1="2" y1="2" x2="22" y2="22" />
                                            </svg>
                                        ) : (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                )}
                            </div>
                            {errors.password && (
                                <span className="text-sm text-red-500">
                                    {errors.password.message}
                                </span>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full px-8 py-3 mt-4 transition-opacity hover:opacity-90"
                            style={{
                                backgroundColor: "var(--color-accent)",
                                color: "var(--color-bg-card)",
                                borderRadius: 25,
                                fontFamily: "Cormorant, serif",
                                fontWeight: 700,
                                fontSize: 16,
                                border: "none",
                                cursor: "pointer",
                            }}
                        >
                            Войти
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-[rgba(var(--rgb-bg-main),0.5)] flex flex-col items-center">
                        <p className="mb-4 text-sm font-medium text-[rgba(var(--rgb-accent),0.8)]">
                            Или войдите через:
                        </p>
                        <div className="flex justify-center w-full">
                            <TelegramLoginButton
                                botName={import.meta.env.VITE_TELEGRAM_BOT_NAME}
                                onAuth={handleTelegramAuth}
                            />
                        </div>
                    </div>

                    <p
                        className="mt-8 text-center text-sm"
                        style={{ color: "var(--color-text-main)" }}
                    >
                        Нет аккаунта?{" "}
                        <Link
                            to="/register"
                            className="font-semibold hover:underline"
                            style={{ color: "var(--color-accent)" }}
                        >
                            Зарегистрироваться
                        </Link>
                    </p>
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

export default Login;
