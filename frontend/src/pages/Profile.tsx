import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";

const Profile: React.FC = () => {
    const { logout, user } = useAuth() as any;
    const navigate = useNavigate();
    const [isMenuHovered, setIsMenuHovered] = useState(false);
    const [, setRefreshKey] = useState(0);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
    const [otpTimer, setOtpTimer] = useState(0);
    const [otpCode, setOtpCode] = useState("");
    const [otpMethod, setOtpMethod] = useState<"telegram" | "email">("email");
    const [pendingPasswordData, setPendingPasswordData] = useState<{
        oldPassword?: string;
        newPassword: string;
    } | null>(null);

    // Безопасное декодирование JWT токена
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

    const rawToken = localStorage.getItem("token") || localStorage.getItem("access_token");
    const decodedToken = rawToken ? decodeJWT(rawToken) : null;

    // Автоматическое обновление данных профиля (полезно при привязке Telegram через вебхук)
    useEffect(() => {
        let isMounted = true;
        const fetchFreshToken = async () => {
            try {
                const response = await api.get("/profile/me");
                const newToken = response.data?.access_token || response.data?.token;
                const currentToken =
                    localStorage.getItem("access_token") || localStorage.getItem("token");

                if (newToken && currentToken) {
                    const newPayload = decodeJWT(newToken);
                    const currentPayload = decodeJWT(currentToken);

                    if (newPayload && currentPayload) {
                        const isChanged =
                            newPayload.telegramId !== currentPayload.telegramId ||
                            newPayload.isEmailConfirmed !== currentPayload.isEmailConfirmed ||
                            newPayload.hasPassword !== currentPayload.hasPassword ||
                            newPayload.email !== currentPayload.email ||
                            newPayload.firstName !== currentPayload.firstName;

                        if (isChanged) {
                            localStorage.setItem("access_token", newToken);
                            localStorage.setItem("token", newToken);
                            if (isMounted) setRefreshKey((prev) => prev + 1); // Форсируем перерисовку UI
                        }
                    }
                }
            } catch (error) {
                // Игнорируем ошибки сети при фоновом опросе
            }
        };

        fetchFreshToken();
        const intervalId = setInterval(fetchFreshToken, 3000); // Опрашиваем каждые 3 секунды

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    // Таймер для OTP модалки
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isOtpModalOpen && otpTimer > 0) {
            interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isOtpModalOpen, otpTimer]);

    // Предпочитаем свежие данные из токена напрямую, иначе фоллбэк на контекст
    const currentUser = decodedToken || user?.user || user;
    const displayName =
        currentUser?.firstName ||
        currentUser?.name ||
        currentUser?.telegramUsername ||
        currentUser?.telegram?.username ||
        currentUser?.email ||
        "Профиль";

    const nameLen = displayName.length;
    const nameFontSize = nameLen > 22 ? 14 : 16;

    // Форма смены Имени
    const {
        register: registerName,
        handleSubmit: handleNameSubmit,
        reset: resetNameForm,
        formState: { errors: nameErrors },
    } = useForm<{ firstName: string }>({
        defaultValues: {
            firstName: currentUser?.firstName || "",
        },
    });

    // Надежное предзаполнение имени при обновлении currentUser
    useEffect(() => {
        if (currentUser?.firstName) {
            resetNameForm({ firstName: currentUser.firstName });
        }
    }, [currentUser, resetNameForm]);

    // Форма смены Email
    const {
        register: registerEmail,
        handleSubmit: handleEmailSubmit,
        reset: resetEmailForm,
        formState: { errors: emailErrors },
    } = useForm<{ email: string }>({
        defaultValues: {
            email:
                currentUser?.email && !currentUser.email.endsWith("@telegram.local")
                    ? currentUser.email
                    : "",
        },
    });

    useEffect(() => {
        if (currentUser?.email && !currentUser.email.endsWith("@telegram.local")) {
            resetEmailForm({ email: currentUser.email });
        }
    }, [currentUser, resetEmailForm]);

    // Форма смены пароля
    const {
        register: registerPassword,
        handleSubmit: handlePasswordSubmit,
        reset: resetPasswordForm,
        watch: watchPassword,
        formState: { errors: passwordErrors },
    } = useForm<{ oldPassword?: string; newPassword: string }>();

    const oldPasswordValue = watchPassword("oldPassword");
    const newPasswordValue = watchPassword("newPassword");

    const onNameChange = async (data: { firstName: string }) => {
        try {
            const response = await api.patch("/profile/name", data);
            toast.success("Имя успешно обновлено!");

            // Если бэкенд возвращает обновленный токен, сохраняем его и перезагружаем страницу
            const newToken =
                response.data?.token || response.data?.access_token || response.data?.accessToken;
            if (newToken) {
                localStorage.setItem("access_token", newToken);
                localStorage.setItem("token", newToken);
                window.location.reload();
            } else {
                // Подсказка, если бэкенд не обновил токен автоматически
                toast.success("Чтобы новое имя отобразилось в меню, перезайдите в аккаунт", {
                    duration: 6000,
                });
            }
        } catch (error: any) {
            console.error("Ошибка при обновлении имени:", error);
            toast.error(error.response?.data?.message || "Не удалось обновить имя");
        }
    };

    const onEmailChange = async (data: { email: string }) => {
        if (currentUser?.email === data.email) {
            toast("Это ваш текущий email", { icon: "ℹ️" });
            return;
        }

        try {
            await api.patch("/profile/email", data);
            toast.success("Email успешно обновлен!");
        } catch (error: any) {
            console.error("Ошибка при обновлении email:", error);
            toast.error(error.response?.data?.message || "Не удалось обновить email");
        }
    };

    const onPasswordSubmitRequest = async (data: { oldPassword?: string; newPassword: string }) => {
        try {
            // 1. Сначала запрашиваем код (автоматически отправится в Telegram, если он есть)
            const response = await api.post("/profile/password/otp", { fallbackToEmail: false });
            setOtpMethod(response.data.sentVia);
            setPendingPasswordData(data);
            setOtpCode("");
            setOtpTimer(30);
            setIsOtpModalOpen(true);
            toast.success(
                response.data.sentVia === "telegram"
                    ? "Код отправлен в Telegram"
                    : "Код отправлен на почту",
            );
        } catch (error: any) {
            console.error("Ошибка при запросе кода:", error);
            toast.error(error.response?.data?.message || "Не удалось запросить код");
        }
    };

    const requestFallbackEmailOtp = async () => {
        try {
            const response = await api.post("/profile/password/otp", { fallbackToEmail: true });
            setOtpMethod(response.data.sentVia);
            setOtpTimer(30);
            setOtpCode("");
            toast.success("Новый код отправлен на почту");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Ошибка при запросе кода на почту");
        }
    };

    const confirmPasswordChange = async () => {
        if (!otpCode || otpCode.length !== 6) {
            toast.error("Введите 6-значный код");
            return;
        }
        try {
            // 2. Отправляем пароли вместе с кодом
            const response = await api.patch("/profile/password", {
                ...pendingPasswordData,
                otp: otpCode,
            });
            toast.success("Пароль успешно изменен!");
            const newToken =
                response.data?.token || response.data?.access_token || response.data?.accessToken;
            if (newToken) {
                localStorage.setItem("access_token", newToken);
                localStorage.setItem("token", newToken);
                setTimeout(() => window.location.reload(), 500);
            }
            resetPasswordForm();
            setIsOtpModalOpen(false);
            setPendingPasswordData(null);
        } catch (error: any) {
            console.error("Ошибка при смене пароля:", error);
            toast.error(error.response?.data?.message || "Неверный код");
        }
    };

    const isDummyEmail = currentUser?.email?.endsWith("@telegram.local");
    const hasEmail = !!currentUser?.email && !isDummyEmail;
    const hasPassword = currentUser?.hasPassword !== undefined ? currentUser.hasPassword : hasEmail;
    const isEmailConfirmed =
        currentUser?.isEmailConfirmed !== undefined ? currentUser.isEmailConfirmed : true;

    // Возвращаем строгую проверку подтверждения почты
    const canUnlinkTelegram = hasEmail && hasPassword && isEmailConfirmed;
    const isTelegramLinked = !!currentUser?.telegramId;

    const getUnlinkError = () => {
        if (!hasEmail) return "Чтобы отвязать Telegram, добавьте email в настройках выше.";
        if (!isEmailConfirmed)
            return "Чтобы отвязать Telegram, подтвердите ваш email (ссылка отправлена на почту).";
        if (!hasPassword) return "Чтобы отвязать Telegram, установите пароль.";
        return "";
    };
    const unlinkErrorText = getUnlinkError();

    const onTelegramUnbind = async () => {
        if (!canUnlinkTelegram) return;
        try {
            const response = await api.delete("/profile/telegram");
            toast.success("Telegram успешно отвязан!");
            const newToken =
                response.data?.token || response.data?.access_token || response.data?.accessToken;
            if (newToken) {
                localStorage.setItem("access_token", newToken);
                localStorage.setItem("token", newToken);
                setTimeout(() => window.location.reload(), 500);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Не удалось отвязать Telegram");
        }
    };

    const onTelegramBind = async () => {
        try {
            const response = await api.get("/profile/telegram-link");
            if (response.data && response.data.link) {
                window.open(response.data.link, "_blank");
            } else {
                toast.error("Не удалось получить ссылку для привязки Telegram.");
            }
        } catch (error) {
            console.error("Ошибка при генерации ссылки Telegram:", error);
            toast.error("Ошибка соединения с сервером.");
        }
    };

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
                className={`mx-auto px-4 flex-1 w-full transition-all duration-300 ease-in-out ${
                    isMenuHovered ? "mt-[84px] md:mt-[114px]" : "mt-[20px] md:mt-[50px]"
                }`}
                style={{ maxWidth: 1120 }}
            >
                <div
                    className="w-full px-6 py-8 md:px-[50px] md:py-[40px] flex flex-col mx-auto rounded-[30px] md:rounded-[50px]"
                    style={{
                        backgroundColor: "var(--color-bg-card)",
                        maxWidth: 548,
                        boxShadow:
                            "0px 8px 10px -6px rgba(0,0,0,0.1), 0px 20px 25px -3px rgba(0,0,0,0.1)",
                    }}
                >
                    <div className="flex flex-col items-center justify-center mb-8 md:mb-10 gap-2 w-full">
                        <h2
                            className="text-3xl md:text-4xl font-bold text-center"
                            style={{
                                fontFamily: "Cormorant, serif",
                                color: "var(--color-text-main)",
                            }}
                        >
                            Настройки профиля
                        </h2>
                    </div>

                    <div className="flex flex-col w-full gap-10">
                        {/* Изменить Имя */}
                        <div className="flex flex-col gap-6">
                            <h3
                                className="text-xl md:text-2xl font-semibold text-center sm:text-left"
                                style={{
                                    fontFamily: "Cormorant, serif",
                                    color: "var(--color-text-main)",
                                }}
                            >
                                Ваше имя
                            </h3>
                            <form
                                onSubmit={handleNameSubmit(onNameChange)}
                                className="flex flex-col gap-5"
                            >
                                <div className="flex flex-col gap-2">
                                    <label
                                        className="text-base font-medium"
                                        style={{
                                            fontFamily: "Inter, sans-serif",
                                            fontSize: 16,
                                            color: "var(--color-text-main)",
                                        }}
                                    >
                                        Имя профиля
                                    </label>
                                    <div
                                        className="flex items-center px-4 py-2.5 relative transition-opacity"
                                        style={{
                                            backgroundColor: "var(--color-bg-main)",
                                            borderRadius: 22,
                                        }}
                                    >
                                        <input
                                            type="text"
                                            {...registerName("firstName", {
                                                required: "Имя не может быть пустым",
                                            })}
                                            className="bg-transparent outline-none w-full"
                                            style={{
                                                fontFamily: "Cormorant, serif",
                                                fontWeight: 400,
                                                fontSize: 16,
                                                color: "var(--color-text-main)",
                                                letterSpacing: "0.6px",
                                            }}
                                            autoComplete="given-name"
                                        />
                                    </div>
                                    {nameErrors.firstName && (
                                        <span className="text-sm text-red-500">
                                            {nameErrors.firstName.message}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    className="w-full px-8 py-3 transition-opacity hover:opacity-90"
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
                                    Сохранить имя
                                </button>
                            </form>
                        </div>

                        {/* Изменить Email */}
                        <div className="flex flex-col gap-6">
                            <h3
                                className="text-xl md:text-2xl font-semibold text-center sm:text-left"
                                style={{
                                    fontFamily: "Cormorant, serif",
                                    color: "var(--color-text-main)",
                                }}
                            >
                                Изменить Email
                            </h3>
                            <form
                                onSubmit={handleEmailSubmit(onEmailChange)}
                                className="flex flex-col gap-5"
                            >
                                <div className="flex flex-col gap-2">
                                    <label
                                        className="text-base font-medium"
                                        style={{
                                            fontFamily: "Inter, sans-serif",
                                            fontSize: 16,
                                            color: "var(--color-text-main)",
                                        }}
                                    >
                                        Ваш Email
                                    </label>
                                    <div
                                        className="flex items-center px-4 py-2.5 relative transition-opacity"
                                        style={{
                                            backgroundColor: "var(--color-bg-main)",
                                            borderRadius: 22,
                                        }}
                                    >
                                        <input
                                            type="email"
                                            {...registerEmail("email", {
                                                required: "Введите новый email",
                                                pattern: {
                                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                    message: "Некорректный формат email",
                                                },
                                            })}
                                            className="bg-transparent outline-none w-full"
                                            style={{
                                                fontFamily: "Cormorant, serif",
                                                fontWeight: 400,
                                                fontSize: 16,
                                                color: "var(--color-text-main)",
                                                letterSpacing: "0.6px",
                                            }}
                                            autoComplete="email"
                                        />
                                    </div>
                                    {emailErrors.email && (
                                        <span className="text-sm text-red-500">
                                            {emailErrors.email.message}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    className="w-full px-8 py-3 transition-opacity hover:opacity-90"
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
                                    Обновить Email
                                </button>
                            </form>
                        </div>

                        {/* Сменить пароль */}
                        <div className="flex flex-col gap-6">
                            <h3
                                className="text-xl md:text-2xl font-semibold text-center sm:text-left"
                                style={{
                                    fontFamily: "Cormorant, serif",
                                    color: "var(--color-text-main)",
                                }}
                            >
                                {hasPassword ? "Сменить пароль" : "Установить пароль"}
                            </h3>
                            <form
                                onSubmit={handlePasswordSubmit(onPasswordSubmitRequest)}
                                className="flex flex-col gap-5"
                            >
                                {/* Скрытое поле для менеджеров паролей (Bitwarden, Chrome, Safari) */}
                                <input
                                    type="text"
                                    name="username"
                                    autoComplete="username"
                                    value={currentUser?.email || ""}
                                    readOnly
                                    style={{ display: "none" }}
                                />
                                {hasPassword && (
                                    <div className="flex flex-col gap-2">
                                        <label
                                            className="text-base font-medium"
                                            style={{
                                                fontFamily: "Inter, sans-serif",
                                                fontSize: 16,
                                                color: "var(--color-text-main)",
                                            }}
                                        >
                                            Текущий пароль
                                        </label>
                                        <div
                                            className="flex items-center px-4 py-2.5 relative transition-opacity"
                                            style={{
                                                backgroundColor: "var(--color-bg-main)",
                                                borderRadius: 22,
                                            }}
                                        >
                                            <input
                                                type={showOldPassword ? "text" : "password"}
                                                {...registerPassword("oldPassword", {
                                                    required: "Введите текущий пароль",
                                                })}
                                                className="bg-transparent outline-none w-full"
                                                style={{
                                                    fontFamily: "Cormorant, serif",
                                                    fontWeight: 400,
                                                    fontSize: 16,
                                                    color: "var(--color-text-main)",
                                                    letterSpacing: "0.6px",
                                                }}
                                                autoComplete="current-password"
                                            />
                                            {!!oldPasswordValue && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowOldPassword(!showOldPassword)
                                                    }
                                                    className="ml-2 text-[var(--color-text-main)] opacity-60 hover:opacity-100 transition-opacity focus:outline-none flex-shrink-0"
                                                >
                                                    {showOldPassword ? (
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
                                        {passwordErrors.oldPassword && (
                                            <span className="text-sm text-red-500">
                                                {passwordErrors.oldPassword.message}
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div className="flex flex-col gap-2">
                                    <label
                                        className="text-base font-medium"
                                        style={{
                                            fontFamily: "Inter, sans-serif",
                                            fontSize: 16,
                                            color: "var(--color-text-main)",
                                        }}
                                    >
                                        Новый пароль
                                    </label>
                                    <div
                                        className="flex items-center px-4 py-2.5 relative transition-opacity"
                                        style={{
                                            backgroundColor: "var(--color-bg-main)",
                                            borderRadius: 22,
                                        }}
                                    >
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            {...registerPassword("newPassword", {
                                                required: "Введите новый пароль",
                                                minLength: {
                                                    value: 6,
                                                    message: "Минимум 6 символов",
                                                },
                                            })}
                                            className="bg-transparent outline-none w-full"
                                            style={{
                                                fontFamily: "Cormorant, serif",
                                                fontWeight: 400,
                                                fontSize: 16,
                                                color: "var(--color-text-main)",
                                                letterSpacing: "0.6px",
                                            }}
                                            autoComplete="new-password"
                                        />
                                        {!!newPasswordValue && (
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="ml-2 text-[var(--color-text-main)] opacity-60 hover:opacity-100 transition-opacity focus:outline-none flex-shrink-0"
                                            >
                                                {showNewPassword ? (
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
                                    {passwordErrors.newPassword && (
                                        <span className="text-sm text-red-500">
                                            {passwordErrors.newPassword.message}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    className="w-full px-8 py-3 transition-opacity hover:opacity-90"
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
                                    {hasPassword ? "Сменить пароль" : "Установить пароль"}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="mt-10 md:mt-12 pt-8 border-t border-[rgba(var(--rgb-bg-main),0.5)] w-full">
                        <h3
                            className="text-xl md:text-2xl font-semibold mb-6 text-center sm:text-left"
                            style={{
                                fontFamily: "Cormorant, serif",
                                color: "var(--color-text-main)",
                            }}
                        >
                            Интеграции и Сессии
                        </h3>
                        <div className="flex flex-col gap-4">
                            {isTelegramLinked ? (
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={
                                            canUnlinkTelegram
                                                ? onTelegramUnbind
                                                : () => {
                                                      toast.error(unlinkErrorText);
                                                  }
                                        }
                                        className={`w-full px-6 py-2.5 rounded-[22px] border transition-all duration-300 ${
                                            canUnlinkTelegram
                                                ? "bg-transparent text-[var(--color-danger)] border-[var(--color-danger)] hover:bg-[rgba(var(--rgb-danger),0.1)] cursor-pointer"
                                                : "bg-transparent text-[rgba(var(--rgb-border),0.4)] border-[rgba(var(--rgb-border),0.2)] cursor-not-allowed"
                                        }`}
                                        style={{
                                            fontFamily: "Cormorant, serif",
                                            fontWeight: 600,
                                            fontSize: 16,
                                        }}
                                    >
                                        Отвязать Telegram
                                    </button>
                                    {!canUnlinkTelegram && (
                                        <span
                                            className="text-sm text-center text-[rgba(var(--rgb-accent),0.7)] px-2"
                                            style={{ fontFamily: "Inter, sans-serif" }}
                                        >
                                            {unlinkErrorText}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={onTelegramBind}
                                    className="w-full px-6 py-2.5 rounded-[22px] border transition-all duration-300 bg-transparent text-[var(--color-border)] border-[var(--color-border)] hover:bg-[rgba(var(--rgb-border),0.1)]"
                                    style={{
                                        fontFamily: "Cormorant, serif",
                                        fontWeight: 600,
                                        fontSize: 16,
                                        cursor: "pointer",
                                    }}
                                >
                                    + Привязать Telegram
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsMenuHovered(false);
                                    if (logout) logout();
                                    navigate("/");
                                }}
                                className="w-full px-6 py-2.5 rounded-[22px] border transition-all duration-300 bg-[var(--color-beige-btn)] border-[var(--color-beige-btn)] text-[var(--color-border)] hover:bg-[var(--color-beige-btn-hover)]"
                                style={{
                                    fontFamily: "Cormorant, serif",
                                    fontWeight: 600,
                                    fontSize: 16,
                                    cursor: "pointer",
                                }}
                            >
                                Выйти из аккаунта
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Модальное окно подтверждения OTP */}
            {isOtpModalOpen &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity"
                        onClick={() => setIsOtpModalOpen(false)}
                    >
                        <div
                            className="bg-[var(--color-bg-card)] p-8 md:p-12 rounded-[40px] shadow-2xl max-w-md w-full border border-[rgba(var(--rgb-border),0.1)] flex flex-col items-center gap-6 relative transform transition-transform"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="absolute top-6 right-6 text-[rgba(var(--rgb-text-main),0.4)] hover:text-[var(--color-text-main)] transition-colors text-xl font-bold"
                                onClick={() => setIsOtpModalOpen(false)}
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
                                Подтверждение
                            </h3>
                            <p
                                className="text-center text-[rgba(var(--rgb-text-main),0.8)] text-base"
                                style={{ fontFamily: "Inter, sans-serif" }}
                            >
                                Мы отправили код подтверждения{" "}
                                {otpMethod === "telegram" ? "в ваш Telegram" : "на вашу почту"}.
                            </p>

                            <input
                                type="text"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                                placeholder="000000"
                                className="w-full text-center text-4xl tracking-[0.5em] font-mono bg-[var(--color-bg-main)] py-4 rounded-[22px] outline-none text-[var(--color-text-main)] border border-transparent focus:border-[var(--color-accent)] transition-colors"
                            />

                            <button
                                onClick={confirmPasswordChange}
                                className="w-full px-8 py-3 transition-opacity hover:opacity-90 bg-[var(--color-accent)] text-[var(--color-bg-card)] rounded-[25px] font-bold"
                                style={{ fontFamily: "Cormorant, serif", fontSize: 18 }}
                            >
                                Подтвердить
                            </button>

                            {otpMethod === "telegram" && (
                                <div
                                    className="text-center w-full flex flex-col items-center mt-2"
                                    style={{ fontFamily: "Inter, sans-serif" }}
                                >
                                    {otpTimer > 0 ? (
                                        <span className="text-sm text-[rgba(var(--rgb-text-main),0.5)]">
                                            Отправить код на почту можно через {otpTimer} сек.
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={requestFallbackEmailOtp}
                                            className="text-sm font-medium text-[var(--color-accent)] hover:underline transition-all"
                                        >
                                            Отправить код на почту
                                        </button>
                                    )}
                                </div>
                            )}
                            {otpMethod === "email" && (
                                <div
                                    className="text-center w-full flex flex-col items-center mt-2"
                                    style={{ fontFamily: "Inter, sans-serif" }}
                                >
                                    {otpTimer > 0 ? (
                                        <span className="text-sm text-[rgba(var(--rgb-text-main),0.5)]">
                                            Запросить новый код можно через {otpTimer} сек.
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={requestFallbackEmailOtp}
                                            className="text-sm font-medium text-[var(--color-accent)] hover:underline transition-all"
                                        >
                                            Отправить код повторно
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body,
                )}

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

export default Profile;
