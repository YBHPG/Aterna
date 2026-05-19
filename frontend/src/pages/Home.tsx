import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

type DeliveryOption = "6months" | "1year" | "3years" | "5years" | "custom";

const DELIVERY_OPTIONS: { key: DeliveryOption; label: string }[] = [
    { key: "6months", label: "6 месяцев" },
    { key: "1year", label: "1 год" },
    { key: "3years", label: "3 года" },
    { key: "5years", label: "5 лет" },
];

const PLACEHOLDER_TEXT =
    "Привет! Пишу тебе из прошлого. Надеюсь, у тебя всё отлично. Сейчас я думаю о...";

interface CreateMessageForm {
    content: string;
    recipientEmail: string;
    triggerDate: string;
}

const getLocalISOString = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const calculateDate = (opt: DeliveryOption): string => {
    const date = new Date();
    if (opt === "6months") date.setMonth(date.getMonth() + 6);
    if (opt === "1year") date.setFullYear(date.getFullYear() + 1);
    if (opt === "3years") date.setFullYear(date.getFullYear() + 3);
    if (opt === "5years") date.setFullYear(date.getFullYear() + 5);
    return getLocalISOString(date);
};

export default function Home() {
    const [selected, setSelected] = useState<DeliveryOption>("6months");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [calendarViewDate, setCalendarViewDate] = useState(new Date());
    const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
    const [isMethodsInitialized, setIsMethodsInitialized] = useState(false);
    const [calendarPosition, setCalendarPosition] = useState<"top" | "bottom">("bottom");
    const calendarButtonRef = useRef<HTMLDivElement>(null);
    const [isMenuHovered, setIsMenuHovered] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const draftRestoredRef = useRef(false);
    const selectedRef = useRef<DeliveryOption>(selected);

    useEffect(() => {
        selectedRef.current = selected;
    }, [selected]);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        getValues,
        formState: { errors, isValid },
    } = useForm<CreateMessageForm>({
        mode: "onChange",
        defaultValues: {
            triggerDate: calculateDate("6months"),
        },
    });

    const navigate = useNavigate();
    const { isAuthenticated, logout, user } = useAuth() as any;

    // Расшифровываем токен напрямую из localStorage, если AuthContext не возвращает объект user
    let decodedToken: any = null;
    try {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token");
        if (token) {
            // Декодируем payload (вторую часть) JWT токена
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

    const currentUser = decodedToken || user?.user || user;
    const rawEmail = currentUser?.email || "";
    const isDummyEmail = rawEmail.endsWith("@telegram.local");
    const userEmail = isDummyEmail ? "" : rawEmail;
    const hasEmail = !!userEmail;
    const telegramUsername = currentUser?.telegramUsername || currentUser?.telegram?.username || "";
    const telegramName = telegramUsername
        ? `@${telegramUsername}`
        : currentUser?.firstName || "Подключен";
    const hasTelegram = !!(currentUser?.telegramId || telegramUsername);
    const isMulti = hasEmail && hasTelegram;
    const displayName =
        currentUser?.firstName ||
        currentUser?.name ||
        currentUser?.telegramUsername ||
        currentUser?.telegram?.username ||
        currentUser?.email ||
        "Список писем";

    // Восстановление черновика из localStorage
    useEffect(() => {
        if (draftRestoredRef.current) return;

        const savedDraft = localStorage.getItem("draft_message");
        if (savedDraft) {
            try {
                const parsedDraft = JSON.parse(savedDraft);
                if (parsedDraft && parsedDraft.content && parsedDraft.content.trim() !== "") {
                    reset({
                        ...parsedDraft,
                        recipientEmail: parsedDraft.recipientEmail || userEmail || "",
                    });
                    setSelected(parsedDraft.deliveryOption || "custom");
                    toast.success("Восстановлен черновик");
                } else {
                    localStorage.removeItem("draft_message");
                }
            } catch (error) {
                console.error("Не удалось восстановить черновик:", error);
            }
        }

        draftRestoredRef.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reset]);

    // Установка email пользователя, если он загрузился позже или не было черновика
    useEffect(() => {
        if (userEmail && draftRestoredRef.current) {
            if (!getValues("recipientEmail")) {
                setValue("recipientEmail", userEmail);
            }
        }
    }, [userEmail, getValues, setValue]);

    // Инициализация выбранных методов получения
    useEffect(() => {
        if (!isMethodsInitialized && (hasEmail || hasTelegram)) {
            const methods = [];
            if (hasEmail) methods.push("email");
            if (hasTelegram) methods.push("telegram");
            setSelectedMethods(methods);
            setIsMethodsInitialized(true);
        }
    }, [hasEmail, hasTelegram, isMethodsInitialized]);

    // Отслеживаем изменения "на лету" и сохраняем черновик
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;
        const subscription = watch((value) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                // Сохраняем черновик только если текст письма не пустой
                if (value.content && value.content.trim() !== "") {
                    localStorage.setItem(
                        "draft_message",
                        JSON.stringify({ ...value, deliveryOption: selectedRef.current }),
                    );
                } else {
                    localStorage.removeItem("draft_message");
                }
            }, 1000);
        });
        return () => {
            subscription.unsubscribe();
            clearTimeout(timeoutId);
        };
    }, [watch]);

    // Очистка при размонтировании
    useEffect(() => {
        return () => reset();
    }, [reset]);

    const handleOptionSelect = (opt: DeliveryOption) => {
        setSelected(opt);
        if (opt !== "custom") {
            setValue("triggerDate", calculateDate(opt), { shouldValidate: true });
        }
    };

    const getRecipientDisplayText = () => {
        if (selectedMethods.length === 2) return "2 получателя";
        if (selectedMethods.includes("email")) return userEmail;
        if (selectedMethods.includes("telegram")) return `Телеграм: ${telegramName}`;
        return "Выберите получателя";
    };

    const toggleMethod = (method: string) => {
        setSelectedMethods((prev) =>
            prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method],
        );
    };

    const onSubmit = async (data: CreateMessageForm) => {
        if (!isAuthenticated) {
            navigate("/register?intent=send_draft");
            return;
        }

        if (isAuthenticated && isMulti && selectedMethods.length === 0) {
            toast.error("Выберите хотя бы один способ получения");
            return;
        }

        try {
            let finalRecipient = data.recipientEmail;
            if (isAuthenticated) {
                if (selectedMethods.length === 2) {
                    finalRecipient = "both";
                } else if (selectedMethods.includes("telegram")) {
                    finalRecipient = "telegram";
                } else if (selectedMethods.includes("email")) {
                    finalRecipient = "email";
                } else if (hasTelegram && !hasEmail) {
                    finalRecipient = "telegram";
                }
            }

            const payload = {
                ...data,
                recipientEmail: finalRecipient,
                triggerDate: new Date(data.triggerDate).toISOString(), // UTC формат
            };

            const response = await api.post("/messages", payload);

            if (response.status === 201) {
                toast.success("Письмо успешно отправлено в будущее!");
                reset();
                localStorage.removeItem("draft_message");
                navigate("/dashboard");
            }
        } catch (error) {
            console.error("Ошибка при отправке сообщения в будущее:", error);
            toast.error("Не удалось отправить письмо. Попробуйте еще раз.");
        }
    };

    // --- Логика работы кастомного календаря ---
    const currentTriggerDate = watch("triggerDate");
    const selectedDateObj =
        selected === "custom" && currentTriggerDate ? new Date(currentTriggerDate) : null;

    const viewYear = calendarViewDate.getFullYear();
    const viewMonth = calendarViewDate.getMonth();

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Понедельник = 0
    const emptyDays = Array.from({ length: firstDayIndex }, (_, i) => i);
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const monthNames = [
        "Январь",
        "Февраль",
        "Март",
        "Апрель",
        "Май",
        "Июнь",
        "Июль",
        "Август",
        "Сентябрь",
        "Октябрь",
        "Ноябрь",
        "Декабрь",
    ];
    const monthNamesDeclined = [
        "января",
        "февраля",
        "марта",
        "апреля",
        "мая",
        "июня",
        "июля",
        "августа",
        "сентября",
        "октября",
        "ноября",
        "декабря",
    ];

    const isPrevDisabled =
        viewYear === new Date().getFullYear() && viewMonth === new Date().getMonth();

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.preventDefault();
        setCalendarViewDate(new Date(viewYear, viewMonth - 1, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.preventDefault();
        setCalendarViewDate(new Date(viewYear, viewMonth + 1, 1));
    };

    const handleDateSelect = (day: number) => {
        // Если выбирают сегодня, ставим конец дня, чтобы пройти валидацию (минимум 1 час в будущем)
        const selectedD = new Date(viewYear, viewMonth, day, 23, 59, 59);
        if (selectedD.getTime() <= Date.now() + 3600000) {
            toast.error("Выберите дату минимум на 1 час в будущем!");
            return;
        }
        setValue("triggerDate", getLocalISOString(selectedD), { shouldValidate: true });
        setSelected("custom");
        setIsCalendarOpen(false);
    };

    const toggleCalendar = () => {
        if (!isCalendarOpen && calendarButtonRef.current) {
            const rect = calendarButtonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow < 350) {
                setCalendarPosition("top");
            } else {
                setCalendarPosition("bottom");
            }
        }
        setIsCalendarOpen(!isCalendarOpen);
    };

    const today = new Date();
    const formattedDate = today.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    // Высчитываем подходящий размер шрифта на основе длины имени или email
    const nameLen = displayName.length;
    const nameFontSize = nameLen > 22 ? 14 : 16;

    const isFormReady = isValid && (!isAuthenticated || !isMulti || selectedMethods.length > 0);

    const { ref: contentRef, ...contentRest } = register("content", {
        required: "Введите текст сообщения",
    });
    const contentValue = watch("content");

    // Авто-изменение высоты текстового поля при вводе
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
    }, [contentValue]);

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
                {isAuthenticated ? (
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
                ) : (
                    <Link
                        to="/login"
                        className="bg-[var(--color-profile-bg)] text-[var(--color-profile-text)] px-7 py-3 rounded-[2rem] tracking-wide inline-block text-center"
                        style={{
                            fontFamily: "Cormorant, serif",
                            fontSize: 16,
                            textDecoration: "none",
                        }}
                    >
                        Войти
                    </Link>
                )}
            </header>

            {/* Main Card */}
            <main
                className={`mx-auto px-4 flex-1 w-full transition-all duration-300 ease-in-out ${
                    isMenuHovered ? "mt-[84px] md:mt-[114px]" : "mt-[20px] md:mt-[50px]"
                }`}
                style={{ maxWidth: 1120 }}
            >
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    autoComplete="off"
                    className="w-full px-6 py-6 md:px-12 md:py-10 flex flex-col rounded-[30px] md:rounded-[50px]"
                    style={{
                        backgroundColor: "var(--color-bg-card)",
                        boxShadow:
                            "0px 8px 10px -6px rgba(0,0,0,0.1), 0px 20px 25px -3px rgba(0,0,0,0.1)",
                    }}
                >
                    {/* Letter label */}
                    <div
                        className="mb-2 md:mb-3 shrink-0"
                        style={{
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 500,
                            fontSize: 18,
                            color: "var(--color-text-main)",
                        }}
                    >
                        Письмо от {formattedDate}
                    </div>

                    {/* Letter textarea */}
                    <div
                        className="w-full px-6 py-4 md:px-[50px] md:py-[30px] mb-6 md:mb-8 rounded-[20px] md:rounded-[30px]"
                        style={{
                            backgroundColor: "var(--color-bg-main)",
                        }}
                    >
                        <textarea
                            {...contentRest}
                            ref={(e) => {
                                contentRef(e);
                                textareaRef.current = e;
                            }}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                            placeholder={PLACEHOLDER_TEXT}
                            className="w-full bg-transparent outline-none resize-none placeholder-[rgba(var(--rgb-text-main),0.5)]"
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
                    {errors.content && (
                        <span className="text-sm text-red-500 mb-6 block pl-4">
                            {errors.content.message}
                        </span>
                    )}

                    {/* Bottom row: email + date selector + submit button */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 md:gap-8 shrink-0 w-full">
                        <div className="flex flex-wrap gap-6 md:gap-8 w-full xl:w-auto">
                            {/* Email field */}
                            <div className="flex flex-col gap-2 relative w-full sm:w-auto sm:min-w-[300px] flex-1">
                                <label
                                    className="text-base font-medium"
                                    style={{
                                        fontFamily: "Inter, sans-serif",
                                        fontSize: 16,
                                        color: "var(--color-text-main)",
                                    }}
                                >
                                    {isAuthenticated && hasTelegram && !hasEmail
                                        ? "Куда пришлём письмо"
                                        : "Почта, на которую пришлём письмо"}
                                </label>
                                <div
                                    className="flex items-center px-4 py-2.5 relative transition-opacity"
                                    style={{
                                        backgroundColor: "var(--color-bg-main)",
                                        borderRadius: 22,
                                        cursor: isMulti
                                            ? "pointer"
                                            : !isAuthenticated
                                              ? "text"
                                              : "not-allowed",
                                        opacity: isAuthenticated && !isMulti ? 0.6 : 1,
                                    }}
                                    onClick={() => isMulti && setDropdownOpen(!dropdownOpen)}
                                >
                                    {!isAuthenticated ? (
                                        <input
                                            type="email"
                                            {...register("recipientEmail", {
                                                required: "Введите почту получателя",
                                                pattern: {
                                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                    message: "Введите корректный email",
                                                },
                                            })}
                                            className="bg-transparent outline-none w-full"
                                            style={{
                                                fontFamily: "Cormorant, serif",
                                                fontWeight: 400,
                                                fontSize: 18,
                                                color: "var(--color-text-main)",
                                                letterSpacing: "0.6px",
                                            }}
                                        />
                                    ) : isMulti ? (
                                        <>
                                            <div className="flex justify-between items-center w-full select-none">
                                                <span
                                                    style={{
                                                        fontFamily: "Cormorant, serif",
                                                        fontWeight: 400,
                                                        fontSize: 18,
                                                        color: "var(--color-text-main)",
                                                        letterSpacing: "0.6px",
                                                    }}
                                                >
                                                    {getRecipientDisplayText()}
                                                </span>
                                                <span
                                                    className="text-[rgba(var(--rgb-text-main),0.7)] text-sm transform transition-transform"
                                                    style={{
                                                        transform: dropdownOpen
                                                            ? "rotate(180deg)"
                                                            : "none",
                                                    }}
                                                >
                                                    ▼
                                                </span>
                                            </div>
                                            {dropdownOpen && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setDropdownOpen(false)}
                                                    ></div>
                                                    <div className="absolute top-[110%] left-0 w-full bg-[var(--color-dropdown-bg)] rounded-[22px] shadow-lg z-50 overflow-hidden border border-[var(--color-bg-main)] flex flex-col py-2">
                                                        <label
                                                            className="flex items-center px-4 py-2 hover:bg-[var(--color-bg-main)] cursor-pointer transition-colors m-0"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedMethods.includes(
                                                                    "email",
                                                                )}
                                                                onChange={() =>
                                                                    toggleMethod("email")
                                                                }
                                                                className="mr-3 w-4 h-4 cursor-pointer accent-[var(--color-accent)]"
                                                            />
                                                            <span
                                                                style={{
                                                                    fontFamily: "Cormorant, serif",
                                                                    fontSize: 18,
                                                                    color: "var(--color-text-main)",
                                                                }}
                                                            >
                                                                {userEmail}
                                                            </span>
                                                        </label>
                                                        <label
                                                            className="flex items-center px-4 py-2 hover:bg-[var(--color-bg-main)] cursor-pointer transition-colors m-0"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedMethods.includes(
                                                                    "telegram",
                                                                )}
                                                                onChange={() =>
                                                                    toggleMethod("telegram")
                                                                }
                                                                className="mr-3 w-4 h-4 cursor-pointer accent-[var(--color-accent)]"
                                                            />
                                                            <span
                                                                style={{
                                                                    fontFamily: "Cormorant, serif",
                                                                    fontSize: 18,
                                                                    color: "var(--color-text-main)",
                                                                }}
                                                            >
                                                                Телеграм: {telegramName}
                                                            </span>
                                                        </label>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <input
                                            type="text"
                                            readOnly
                                            value={
                                                hasTelegram && !hasEmail
                                                    ? `Телеграм: ${telegramName}`
                                                    : userEmail
                                            }
                                            className="bg-transparent outline-none w-full cursor-not-allowed"
                                            style={{
                                                fontFamily: "Cormorant, serif",
                                                fontWeight: 400,
                                                fontSize: 18,
                                                color: "var(--color-text-main)",
                                                letterSpacing: "0.6px",
                                            }}
                                        />
                                    )}
                                </div>
                                {!isAuthenticated && errors.recipientEmail && (
                                    <span className="text-sm text-red-500">
                                        {errors.recipientEmail.message}
                                    </span>
                                )}
                            </div>

                            {/* Date selector */}
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <span
                                    className="text-base font-medium"
                                    style={{
                                        fontFamily: "Inter, sans-serif",
                                        fontSize: 16,
                                        color: "var(--color-text-main)",
                                    }}
                                >
                                    Когда хотите его получить?
                                </span>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    {DELIVERY_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => handleOptionSelect(opt.key)}
                                            className={`px-6 py-2.5 rounded-[22px] border transition-all duration-300 ${
                                                selected === opt.key
                                                    ? "bg-[var(--color-border)] text-[var(--color-bg-msg)] border-[var(--color-border)]"
                                                    : "bg-transparent text-[var(--color-border)] border-[var(--color-border)] hover:bg-[rgba(var(--rgb-border),0.1)]"
                                            }`}
                                            style={{
                                                fontFamily: "Cormorant, serif",
                                                fontWeight: 500,
                                                fontSize: 18,
                                                cursor: "pointer",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}

                                    {/* Кнопка кастомной даты с выпадающим календарем */}
                                    <div className="relative" ref={calendarButtonRef}>
                                        <button
                                            type="button"
                                            onClick={toggleCalendar}
                                            className={`flex items-center space-x-2 px-6 py-2.5 rounded-[22px] border transition-all duration-300 ${
                                                selected === "custom" || isCalendarOpen
                                                    ? "bg-[var(--color-border)] text-[var(--color-bg-msg)] border-[var(--color-border)]"
                                                    : "bg-transparent text-[var(--color-border)] border-[var(--color-border)] hover:bg-[rgba(var(--rgb-border),0.1)]"
                                            }`}
                                            style={{
                                                fontFamily: "Cormorant, serif",
                                                fontWeight: 500,
                                                fontSize: 18,
                                                cursor: "pointer",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            <span>
                                                {selected === "custom" && selectedDateObj
                                                    ? `${selectedDateObj.getDate()} ${monthNamesDeclined[selectedDateObj.getMonth()]} ${selectedDateObj.getFullYear()}`
                                                    : "выбрать дату"}
                                            </span>
                                            <img
                                                src="/calendar.svg"
                                                alt="calendar"
                                                className="w-6 h-6"
                                                style={{
                                                    filter:
                                                        selected === "custom" || isCalendarOpen
                                                            ? "var(--icon-filter-active)"
                                                            : "var(--icon-filter)",
                                                }}
                                            />
                                        </button>

                                        {/* Выпадающий календарь */}
                                        {isCalendarOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setIsCalendarOpen(false)}
                                                ></div>
                                                <div
                                                    className={`absolute ${calendarPosition === "top" ? "bottom-full mb-3" : "top-full mt-3"} left-0 p-5 bg-[var(--color-bg-msg)] rounded-2xl shadow-lg border border-[rgba(var(--rgb-border),0.1)] w-72 z-20`}
                                                >
                                                    {/* Шапка календаря */}
                                                    <div
                                                        className="flex justify-between items-center mb-4 text-[var(--color-border)]"
                                                        style={{ fontFamily: "Inter, sans-serif" }}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={handlePrevMonth}
                                                            disabled={isPrevDisabled}
                                                            className={`transition-colors ${isPrevDisabled ? "opacity-30 cursor-not-allowed" : "hover:text-[var(--color-calendar-hover)]"}`}
                                                        >
                                                            ←
                                                        </button>
                                                        <span className="font-semibold text-lg">
                                                            {monthNames[viewMonth]} {viewYear}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={handleNextMonth}
                                                            className="hover:text-[var(--color-calendar-hover)] transition-colors"
                                                        >
                                                            →
                                                        </button>
                                                    </div>

                                                    {/* Дни недели */}
                                                    <div
                                                        className="grid grid-cols-7 gap-1 mb-2"
                                                        style={{ fontFamily: "Inter, sans-serif" }}
                                                    >
                                                        {[
                                                            "Пн",
                                                            "Вт",
                                                            "Ср",
                                                            "Чт",
                                                            "Пт",
                                                            "Сб",
                                                            "Вс",
                                                        ].map((day) => (
                                                            <div
                                                                key={day}
                                                                className="text-center text-[rgba(var(--rgb-border),0.6)] text-sm"
                                                            >
                                                                {day}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Сетка дней */}
                                                    <div
                                                        className="grid grid-cols-7 gap-1"
                                                        style={{ fontFamily: "Inter, sans-serif" }}
                                                    >
                                                        {emptyDays.map((_, index) => (
                                                            <div
                                                                key={`empty-${index}`}
                                                                className="w-8 h-8"
                                                            ></div>
                                                        ))}
                                                        {monthDays.map((day) => {
                                                            const isSelected =
                                                                selected === "custom" &&
                                                                selectedDateObj?.getDate() ===
                                                                    day &&
                                                                selectedDateObj?.getMonth() ===
                                                                    viewMonth &&
                                                                selectedDateObj?.getFullYear() ===
                                                                    viewYear;
                                                            const isPast =
                                                                new Date(
                                                                    viewYear,
                                                                    viewMonth,
                                                                    day,
                                                                    23,
                                                                    59,
                                                                    59,
                                                                ) < new Date();

                                                            return (
                                                                <button
                                                                    type="button"
                                                                    key={day}
                                                                    disabled={isPast}
                                                                    onClick={() =>
                                                                        handleDateSelect(day)
                                                                    }
                                                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200 ${
                                                                        isSelected
                                                                            ? "bg-[var(--color-border)] text-[var(--color-bg-msg)]"
                                                                            : isPast
                                                                              ? "text-[rgba(var(--rgb-border),0.3)] cursor-not-allowed"
                                                                              : "text-[var(--color-border)] hover:bg-[rgba(var(--rgb-border),0.2)]"
                                                                    }`}
                                                                >
                                                                    {day}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {errors.triggerDate && (
                                    <span className="text-sm text-red-500">
                                        {errors.triggerDate.message}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Submit button (Right corner) */}
                        <div className="flex w-full xl:w-auto justify-end shrink-0">
                            <button
                                type="submit"
                                disabled={!isFormReady}
                                className={`px-8 py-3 transition-opacity w-full sm:w-auto ${isFormReady ? "hover:opacity-90" : "opacity-50"}`}
                                style={{
                                    backgroundColor: "var(--color-accent)",
                                    color: "var(--color-bg-card)",
                                    borderRadius: 25,
                                    fontFamily: "Cormorant, serif",
                                    fontWeight: 700,
                                    fontSize: 18,
                                    border: "none",
                                    cursor: isFormReady ? "pointer" : "not-allowed",
                                }}
                            >
                                Отправить
                            </button>
                        </div>
                    </div>
                </form>
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
}
