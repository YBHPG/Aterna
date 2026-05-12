import React from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { TelegramLoginButton, TelegramUser } from "../components/TelegramLoginButton";

interface RegisterFormInputs {
    email: string;
    password: string;
    firstName?: string;
}

const Register: React.FC = () => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormInputs>();
    const navigate = useNavigate();
    const { login } = useAuth();

    const processDraftAndRedirect = async () => {
        const draft = localStorage.getItem("draft_message");
        if (draft) {
            try {
                const parsedDraft = JSON.parse(draft);
                if (parsedDraft.content && parsedDraft.triggerDate) {
                    const payload = {
                        ...parsedDraft,
                        triggerDate: new Date(parsedDraft.triggerDate).toISOString(),
                    };
                    await api.post("/messages", payload);
                    localStorage.removeItem("draft_message");
                    alert("Отложенное письмо успешно отправлено!");
                }
            } catch (err) {
                console.error("Ошибка при отправке черновика:", err);
            }
        }
        navigate("/dashboard");
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
                login(token); // сразу авторизуем после успешной регистрации (если backend возвращает токен)
                await processDraftAndRedirect();
            } else {
                navigate("/login"); // если токена нет, отправляем на страницу входа
            }
        } catch (error) {
            console.error("Ошибка при регистрации:", error);
            alert("Не удалось зарегистрироваться. Проверьте данные и попробуйте снова.");
        }
    };

    const handleTelegramAuth = async (user: TelegramUser) => {
        try {
            const response = await api.post("/auth/telegram", user);
            const token =
                response.data.token || response.data.access_token || response.data.accessToken;
            if (token) {
                login(token); // сразу авторизуем после успешной регистрации
                await processDraftAndRedirect();
            }
        } catch (error) {
            console.error("Ошибка при входе через Telegram:", error);
            alert("Не удалось авторизоваться через Telegram. Попробуйте снова.");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
                <h2 className="mb-6 text-2xl font-bold text-center text-gray-800">Регистрация</h2>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="mb-4">
                        <label
                            className="block mb-2 text-sm font-medium text-gray-700"
                            htmlFor="firstName"
                        >
                            Имя (необязательно)
                        </label>
                        <input
                            id="firstName"
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-200"
                            {...register("firstName")}
                        />
                        {errors.firstName && (
                            <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                        )}
                    </div>

                    <div className="mb-4">
                        <label
                            className="block mb-2 text-sm font-medium text-gray-700"
                            htmlFor="email"
                        >
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-200"
                            {...register("email", { required: "Введите email" })}
                        />
                        {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                        )}
                    </div>

                    <div className="mb-6">
                        <label
                            className="block mb-2 text-sm font-medium text-gray-700"
                            htmlFor="password"
                        >
                            Пароль
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-200"
                            {...register("password", {
                                required: "Введите пароль",
                                minLength: { value: 6, message: "Минимум 6 символов" },
                            })}
                        />
                        {errors.password && (
                            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full px-4 py-2 font-bold text-white bg-green-500 rounded hover:bg-green-600 focus:outline-none focus:ring focus:ring-green-300"
                    >
                        Зарегистрироваться
                    </button>
                </form>
                <div className="mt-6 flex flex-col items-center">
                    <p className="mb-4 text-sm text-gray-600">
                        Или зарегистрируйтесь через соцсети:
                    </p>
                    <div className="flex flex-col space-y-3 w-full">
                        <div className="flex justify-center">
                            <TelegramLoginButton
                                botName={import.meta.env.VITE_TELEGRAM_BOT_NAME || "Aterna_bot"}
                                onAuth={handleTelegramAuth}
                            />
                        </div>
                    </div>
                </div>
                <p className="mt-4 text-sm text-center text-gray-600">
                    Уже есть аккаунт?{" "}
                    <Link to="/login" className="text-blue-500 hover:underline">
                        Войти
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
