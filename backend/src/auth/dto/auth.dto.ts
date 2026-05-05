import { IsEmail, IsString, MinLength, IsOptional } from "class-validator";

export class AuthDto {
    @IsEmail({}, { message: "Некорректный формат email" })
    email: string;

    @IsString({ message: "Пароль должен быть строкой" })
    @MinLength(6, { message: "Минимальная длина пароля 6 символов" })
    password: string;

    @IsOptional()
    @IsString({ message: "Имя должно быть строкой" })
    firstName?: string;
}
