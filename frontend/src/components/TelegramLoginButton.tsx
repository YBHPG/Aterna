import React, { useEffect, useRef } from "react";

export interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

interface Props {
    botName: string;
    onAuth: (user: TelegramUser) => void;
    buttonSize?: "large" | "medium" | "small";
    cornerRadius?: number;
    requestAccess?: "write";
}

export const TelegramLoginButton: React.FC<Props> = ({
    botName,
    onAuth,
    buttonSize = "large",
    cornerRadius = 20,
    requestAccess = "write",
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        (window as any).onTelegramAuth = (user: TelegramUser) => {
            onAuth(user);
        };

        const script = document.createElement("script");
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute("data-telegram-login", botName);
        script.setAttribute("data-size", buttonSize);
        script.setAttribute("data-radius", cornerRadius.toString());
        script.setAttribute("data-request-access", requestAccess);
        script.setAttribute("data-userpic", "false");
        script.setAttribute("data-onauth", "onTelegramAuth(user)");
        script.async = true;

        if (containerRef.current) {
            containerRef.current.innerHTML = "";
            containerRef.current.appendChild(script);
        }
    }, [botName, buttonSize, cornerRadius, requestAccess, onAuth]);

    return <div ref={containerRef} />;
};
