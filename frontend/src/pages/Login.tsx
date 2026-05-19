import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { TelegramLoginButton, TelegramUser } from "../components/TelegramLoginButton";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";

interface LoginFormInputs {
    email: string;
    password: string;
}

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
    const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

    // Состояния для модального окна сброса пароля
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
    const [forgotStep, setForgotStep] = useState<1 | 2>(1);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotOtp, setForgotOtp] = useState("");
    const [forgotNewPassword, setForgotNewPassword] = useState("");
    const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
    const [isForgotLoading, setIsForgotLoading] = useState(false);

    const passwordValue = watch("password");

    const processDraftAndRedirect = async () => {
        const draft = localStorage.getItem("draft_message");
        if (draft) {
            navigate("/");
        } else {
            navigate("/dashboard");
        }
    };

    const handleResendConfirmation = async () => {
        if (!unconfirmedEmail) return;
        try {
            await api.post("/auth/resend-confirmation", { email: unconfirmedEmail });
            toast.success("Письмо с подтверждением отправлено!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Не удалось отправить письмо");
        }
    };

    const handleForgotRequest = async () => {
        if (!forgotEmail) return toast.error("Введите email");
        try {
            setIsForgotLoading(true);
            await api.post("/auth/forgot-password", { email: forgotEmail });
            toast.success("Код отправлен на почту");
            setForgotStep(2);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Ошибка при запросе кода");
        } finally {
            setIsForgotLoading(false);
        }
    };

    const handleForgotReset = async () => {
        if (!forgotOtp || forgotOtp.length !== 6) return toast.error("Введите 6-значный код");
        if (forgotNewPassword.length < 6)
            return toast.error("Новый пароль должен быть не короче 6 символов");

        try {
            setIsForgotLoading(true);
            const response = await api.post("/auth/reset-password", {
                email: forgotEmail,
                otp: forgotOtp,
                newPassword: forgotNewPassword,
            });
            toast.success("Пароль успешно изменен!");
            setIsForgotModalOpen(false);

            const token =
                response.data.token || response.data.access_token || response.data.accessToken;
            if (token) {
                login(token);
                await processDraftAndRedirect();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Неверный код или ошибка сервера");
        } finally {
            setIsForgotLoading(false);
        }
    };

    const onSubmit = async (data: LoginFormInputs) => {
        setUnconfirmedEmail(null);
        try {
            const response = await api.post("/auth/login", data);
            // Ищем токен под разными возможными ключами
            const token =
                response.data.token || response.data.access_token || response.data.accessToken;
            if (token) {
                login(token); // сохраняет токен в localStorage и обновляет контекст
                await processDraftAndRedirect();
            }
        } catch (error: any) {
            if (error.response?.status === 403 && error.response?.data?.unconfirmedEmail) {
                setUnconfirmedEmail(error.response.data.email);
                toast("Почта не подтверждена. Доступ запрещен.", { icon: "ℹ️" });
            } else {
                console.error("Ошибка при входе:", error);
                toast.error("Не удалось войти в систему. Проверьте данные и попробуйте снова.");
            }
        }
    };

    const handleTelegramAuth = async (user: TelegramUser) => {
        setUnconfirmedEmail(null);
        try {
            const response = await api.post("/auth/telegram", user);
            const token =
                response.data.token || response.data.access_token || response.data.accessToken;
            if (token) {
                login(token); // сохраняет токен в localStorage и обновляет контекст
                await processDraftAndRedirect();
            }
        } catch (error: any) {
            if (error.response?.status === 403 && error.response?.data?.unconfirmedEmail) {
                setUnconfirmedEmail(error.response.data.email);
                toast("Почта не подтверждена. Доступ запрещен.", { icon: "ℹ️" });
            } else {
                console.error("Ошибка при входе через Telegram:", error);
                toast.error("Не удалось войти через Telegram. Попробуйте снова.");
            }
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
                            <div className="flex justify-between items-center">
                                <label
                                    className="text-base font-medium"
                                    style={{ color: "var(--color-text-main)" }}
                                >
                                    Пароль
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForgotEmail(watch("email") || "");
                                        setIsForgotModalOpen(true);
                                        setForgotStep(1);
                                        setForgotOtp("");
                                        setForgotNewPassword("");
                                    }}
                                    className="text-sm font-semibold hover:underline"
                                    style={{ color: "var(--color-accent)" }}
                                >
                                    Забыли пароль?
                                </button>
                            </div>
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

                        {unconfirmedEmail && (
                            <div
                                className="mt-4 p-4 flex flex-col gap-2 rounded-[22px]"
                                style={{
                                    backgroundColor: "rgba(var(--rgb-danger), 0.05)",
                                    border: "1px solid rgba(var(--rgb-danger), 0.2)",
                                }}
                            >
                                <span
                                    className="text-sm text-center sm:text-left"
                                    style={{
                                        fontFamily: "Inter, sans-serif",
                                        color: "var(--color-text-main)",
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Ваш email ({unconfirmedEmail}) не подтвержден. Для входа
                                    необходимо подтвердить почту.
                                </span>
                                <button
                                    type="button"
                                    onClick={handleResendConfirmation}
                                    className="self-start mx-auto sm:mx-0 text-sm font-semibold hover:underline transition-opacity"
                                    style={{
                                        fontFamily: "Inter, sans-serif",
                                        color: "var(--color-danger)",
                                    }}
                                >
                                    Отправить письмо еще раз
                                </button>
                            </div>
                        )}
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

            {/* Модальное окно восстановления пароля */}
            {isForgotModalOpen &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity"
                        onClick={() => setIsForgotModalOpen(false)}
                    >
                        <div
                            className="bg-[var(--color-bg-card)] p-8 md:p-12 rounded-[40px] shadow-2xl max-w-md w-full border border-[rgba(var(--rgb-border),0.1)] flex flex-col items-center gap-6 relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="absolute top-6 right-6 text-[rgba(var(--rgb-text-main),0.4)] hover:text-[var(--color-text-main)] transition-colors text-xl font-bold"
                                onClick={() => setIsForgotModalOpen(false)}
                            >
                                ✕
                            </button>

                            <h3
                                className="text-2xl md:text-3xl font-bold text-center"
                                style={{
                                    fontFamily: "Cormorant, serif",
                                    color: "var(--color-text-main)",
                                }}
                            >
                                Сброс пароля
                            </h3>

                            {forgotStep === 1 ? (
                                <>
                                    <p
                                        className="text-center text-[rgba(var(--rgb-text-main),0.8)] text-base"
                                        style={{ fontFamily: "Inter, sans-serif" }}
                                    >
                                        Введите email, к которому привязан аккаунт, и мы отправим
                                        код для восстановления.
                                    </p>
                                    <input
                                        type="email"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        placeholder="Ваш email"
                                        className="w-full bg-[var(--color-bg-main)] px-4 py-3 rounded-[22px] outline-none text-[var(--color-text-main)] border border-transparent focus:border-[var(--color-accent)] transition-colors"
                                        style={{ fontFamily: "Cormorant, serif", fontSize: 16 }}
                                    />
                                    <button
                                        onClick={handleForgotRequest}
                                        disabled={isForgotLoading}
                                        className={`w-full px-8 py-3 transition-opacity ${isForgotLoading ? "opacity-50" : "hover:opacity-90"} bg-[var(--color-accent)] text-[var(--color-bg-card)] rounded-[25px] font-bold`}
                                        style={{ fontFamily: "Cormorant, serif", fontSize: 18 }}
                                    >
                                        {isForgotLoading ? "Отправка..." : "Получить код"}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p
                                        className="text-center text-[rgba(var(--rgb-text-main),0.8)] text-base"
                                        style={{ fontFamily: "Inter, sans-serif" }}
                                    >
                                        Мы отправили код на {forgotEmail}.
                                    </p>
                                    <div className="w-full flex flex-col gap-4">
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={forgotOtp}
                                            onChange={(e) =>
                                                setForgotOtp(e.target.value.replace(/\D/g, ""))
                                            }
                                            placeholder="000000"
                                            className="w-full text-center text-3xl tracking-[0.5em] font-mono bg-[var(--color-bg-main)] py-3 rounded-[22px] outline-none text-[var(--color-text-main)] border border-transparent focus:border-[var(--color-accent)] transition-colors"
                                        />
                                        <div className="flex items-center px-4 py-2.5 bg-[var(--color-bg-main)] rounded-[22px]">
                                            <input
                                                type={showForgotNewPassword ? "text" : "password"}
                                                value={forgotNewPassword}
                                                onChange={(e) =>
                                                    setForgotNewPassword(e.target.value)
                                                }
                                                placeholder="Новый пароль"
                                                className="bg-transparent outline-none w-full"
                                                style={{
                                                    fontFamily: "Cormorant, serif",
                                                    fontSize: 16,
                                                    color: "var(--color-text-main)",
                                                }}
                                            />
                                            {!!forgotNewPassword && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowForgotNewPassword(
                                                            !showForgotNewPassword,
                                                        )
                                                    }
                                                    className="ml-2 text-[var(--color-text-main)] opacity-60 hover:opacity-100 flex-shrink-0"
                                                >
                                                    {showForgotNewPassword ? (
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
                                        <button
                                            onClick={handleForgotReset}
                                            disabled={isForgotLoading}
                                            className={`w-full px-8 py-3 transition-opacity ${isForgotLoading ? "opacity-50" : "hover:opacity-90"} bg-[var(--color-accent)] text-[var(--color-bg-card)] rounded-[25px] font-bold`}
                                            style={{ fontFamily: "Cormorant, serif", fontSize: 18 }}
                                        >
                                            {isForgotLoading ? "Сброс..." : "Сбросить пароль"}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
};

export default Login;
