import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api";
import toast from "react-hot-toast";

interface RegisterFormInputs {
    email: string;
    password: string;
    firstName?: string;
}

const Register: React.FC = () => {
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<RegisterFormInputs>();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);

    const passwordValue = watch("password");

    const processDraftAndRedirect = async () => {
        const draft = localStorage.getItem("draft_message");
        if (draft) {
            toast.success(
                "Почти готово! Подтвердите почту по ссылке из письма, чтобы отправить ваше письмо.",
                { duration: 6000 },
            );
            navigate("/");
        } else {
            toast.success("Регистрация успешна! Подтвердите почту для завершения.");
            navigate("/login");
        }
    };

    const onSubmit = async (data: RegisterFormInputs) => {
        try {
            // Очистка входной строки firstName от HTML-тегов перед отправкой во избежание XSS
            if (data.firstName) {
                data.firstName = data.firstName.replace(/<[^>]*>?/gm, "").trim();
            }

            const response = await api.post("/auth/register", data);
            // Ищем токен под разными возможными ключами
            const token =
                response.data.token || response.data.access_token || response.data.accessToken;
            if (token) {
                // Не авторизуем пользователя сразу, так как требуется подтверждение почты
                await processDraftAndRedirect();
            } else {
                await processDraftAndRedirect(); // токена нет, выводим тост о подтверждении почты
            }
        } catch (error: any) {
            console.error("Ошибка при регистрации:", error);
            if (error.response?.data?.message) {
                toast(error.response.data.message, { icon: "ℹ️" });
            } else {
                toast.error("Не удалось зарегистрироваться. Проверьте данные и попробуйте снова.");
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
                        Регистрация
                    </h2>

                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
                        {/* Имя */}
                        <div className="flex flex-col gap-2">
                            <label
                                className="text-base font-medium"
                                style={{ color: "var(--color-text-main)" }}
                            >
                                Имя (необязательно)
                            </label>
                            <div className="flex items-center px-4 py-2.5 bg-[var(--color-bg-main)] rounded-[22px]">
                                <input
                                    id="firstName"
                                    type="text"
                                    className="bg-transparent outline-none w-full"
                                    style={{
                                        fontFamily: "Cormorant, serif",
                                        fontSize: 16,
                                        color: "var(--color-text-main)",
                                    }}
                                    autoComplete="given-name"
                                    {...register("firstName")}
                                />
                            </div>
                            {errors.firstName && (
                                <span className="text-sm text-red-500">
                                    {errors.firstName.message}
                                </span>
                            )}
                        </div>

                        {/* Email */}
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

                        {/* Пароль */}
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
                                    autoComplete="new-password"
                                    {...register("password", {
                                        required: "Введите пароль",
                                        minLength: { value: 6, message: "Минимум 6 символов" },
                                    })}
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
                            Зарегистрироваться
                        </button>
                    </form>

                    <p
                        className="mt-8 text-center text-sm"
                        style={{ color: "var(--color-text-main)" }}
                    >
                        Уже есть аккаунт?{" "}
                        <Link
                            to="/login"
                            className="font-semibold hover:underline"
                            style={{ color: "var(--color-accent)" }}
                        >
                            Войти
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

export default Register;
