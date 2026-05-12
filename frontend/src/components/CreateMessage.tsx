import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface CreateMessageForm {
    content: string;
    recipientEmail: string;
    triggerDate: string;
}

export const CreateMessage: React.FC = () => {
    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<CreateMessageForm>();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    // Восстановление черновика из localStorage при загрузке компонента
    useEffect(() => {
        const savedDraft = localStorage.getItem("draft_message");
        if (savedDraft) {
            try {
                const parsedDraft = JSON.parse(savedDraft);
                if (parsedDraft && (parsedDraft.content || parsedDraft.triggerDate)) {
                    reset(parsedDraft);
                    alert("Восстановлен черновик"); // Замените на Toast-библиотеку при необходимости
                }
            } catch (error) {
                console.error("Не удалось восстановить черновик:", error);
            }
        }
    }, [reset]);

    // Отслеживаем изменения формы "на лету" и пишем черновик в localStorage
    useEffect(() => {
        const subscription = watch((value) => {
            localStorage.setItem("draft_message", JSON.stringify(value));
        });
        return () => subscription.unsubscribe();
    }, [watch]);

    // Обязательная очистка стейта формы при размонтировании (unmount)
    useEffect(() => {
        return () => {
            reset();
        };
    }, [reset]);

    const onSubmit = async (data: CreateMessageForm) => {
        if (!isAuthenticated) {
            navigate("/register?intent=send_draft");
            return;
        }

        try {
            // Преобразуем дату из локального формата input в ISO-строку (UTC)
            const payload = {
                ...data,
                triggerDate: new Date(data.triggerDate).toISOString(),
            };

            // Вызов POST /messages через глобальный инстанс API (интерцептор сам подставит токен)
            const response = await api.post("/messages", payload);

            if (response.status === 201) {
                // MVP-уведомление (замените на нужную библиотеку Toast при необходимости)
                alert("Письмо успешно отправлено в будущее!");
                // Очищаем стейт формы
                reset();
                // Выполняем редирект
                navigate("/dashboard");
            }
        } catch (error) {
            console.error("Ошибка при отправке сообщения в будущее:", error);
        }
    };

    const validateFutureDate = (value: string) => {
        const selectedDate = new Date(value).getTime();
        const minDate = Date.now() + 360; //0000; // Текущее время + 1 час (в мс)
        return selectedDate > minDate || "Дата отправки должна быть минимум на 1 час в будущем";
    };

    return (
        <div className="max-w-2xl px-4 py-8 mx-auto">
            <h2 className="mb-6 text-3xl font-bold text-gray-800">Письмо в будущее</h2>
            {/* Отключаем автозаполнение на уровне формы */}
            <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="space-y-6">
                <div>
                    <label
                        htmlFor="content"
                        className="block mb-2 text-sm font-medium text-gray-700"
                    >
                        Текст сообщения:
                    </label>
                    <textarea
                        id="content"
                        {...register("content", { required: "Введите текст сообщения" })}
                        rows={5}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {errors.content && (
                        <span className="text-sm text-red-500">{errors.content.message}</span>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="recipientEmail"
                        className="block mb-2 text-sm font-medium text-gray-700"
                    >
                        Email получателя:
                    </label>
                    <input
                        type="email"
                        id="recipientEmail"
                        {...register("recipientEmail", {
                            required: "Введите email получателя",
                            pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: "Введите корректный email",
                            },
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {errors.recipientEmail && (
                        <span className="text-sm text-red-500">
                            {errors.recipientEmail.message}
                        </span>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="triggerDate"
                        className="block mb-2 text-sm font-medium text-gray-700"
                    >
                        Дата и время отправки:
                    </label>
                    <input
                        type="datetime-local"
                        id="triggerDate"
                        {...register("triggerDate", {
                            required: "Укажите дату и время отправки",
                            validate: validateFutureDate,
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {errors.triggerDate && (
                        <span className="text-sm text-red-500">{errors.triggerDate.message}</span>
                    )}
                </div>

                <button
                    type="submit"
                    className="w-full px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                    Отправить в будущее
                </button>
            </form>
        </div>
    );
};

export default CreateMessage;
