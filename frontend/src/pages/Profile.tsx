import React from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

const Profile: React.FC = () => {
    const { logout } = useAuth();

    // Форма смены Email
    const {
        register: registerEmail,
        handleSubmit: handleEmailSubmit,
        formState: { errors: emailErrors },
    } = useForm<{ email: string }>();

    // Форма смены пароля
    const {
        register: registerPassword,
        handleSubmit: handlePasswordSubmit,
        reset: resetPasswordForm,
        formState: { errors: passwordErrors },
    } = useForm<{ currentPassword: string; newPassword: string }>();

    const onEmailChange = async (data: { email: string }) => {
        try {
            await api.patch("/profile/email", data);
            alert("Email успешно обновлен!");
        } catch (error: any) {
            console.error("Ошибка при обновлении email:", error);
            alert(error.response?.data?.message || "Не удалось обновить email");
        }
    };

    const onPasswordChange = async (data: { currentPassword: string; newPassword: string }) => {
        try {
            await api.patch("/profile/password", data);
            alert("Пароль успешно изменен!");
            resetPasswordForm();
        } catch (error: any) {
            console.error("Ошибка при смене пароля:", error);
            alert(error.response?.data?.message || "Не удалось изменить пароль");
        }
    };

    return (
        <div className="max-w-2xl px-4 py-8 mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-gray-800">Настройки профиля</h2>
                <Link to="/dashboard" className="text-blue-600 hover:underline">
                    &larr; Назад в Дашборд
                </Link>
            </div>

            <div className="p-6 mb-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <h3 className="mb-4 text-xl font-semibold text-gray-700">Изменить Email</h3>
                <form onSubmit={handleEmailSubmit(onEmailChange)} className="space-y-4">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                            Новый Email
                        </label>
                        <input
                            type="email"
                            {...registerEmail("email", {
                                required: "Введите новый email",
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: "Некорректный формат email",
                                },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                        />
                        {emailErrors.email && (
                            <p className="mt-1 text-sm text-red-600">{emailErrors.email.message}</p>
                        )}
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300"
                    >
                        Обновить Email
                    </button>
                </form>
            </div>

            <div className="p-6 mb-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <h3 className="mb-4 text-xl font-semibold text-gray-700">Сменить пароль</h3>
                <form onSubmit={handlePasswordSubmit(onPasswordChange)} className="space-y-4">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                            Текущий пароль
                        </label>
                        <input
                            type="password"
                            {...registerPassword("currentPassword", {
                                required: "Введите текущий пароль",
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                        />
                        {passwordErrors.currentPassword && (
                            <p className="mt-1 text-sm text-red-600">
                                {passwordErrors.currentPassword.message}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                            Новый пароль
                        </label>
                        <input
                            type="password"
                            {...registerPassword("newPassword", {
                                required: "Введите новый пароль",
                                minLength: { value: 6, message: "Минимум 6 символов" },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                        />
                        {passwordErrors.newPassword && (
                            <p className="mt-1 text-sm text-red-600">
                                {passwordErrors.newPassword.message}
                            </p>
                        )}
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring focus:ring-green-300"
                    >
                        Сменить пароль
                    </button>
                </form>
            </div>

            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <h3 className="mb-4 text-xl font-semibold text-gray-700">Интеграции и Сессии</h3>
                <div className="flex flex-col items-start space-y-4">
                    <button
                        type="button"
                        onClick={() =>
                            alert("Привязка Telegram будет доступна в следующих обновлениях")
                        }
                        className="px-4 py-2 font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 focus:outline-none"
                    >
                        + Привязать Telegram
                    </button>

                    <div className="w-full pt-4 mt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={logout}
                            className="px-4 py-2 font-medium text-red-600 transition-colors border border-red-200 rounded hover:bg-red-50 focus:outline-none"
                        >
                            Выйти из аккаунта
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
