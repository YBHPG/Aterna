import { IsOptional, IsString, MinLength } from "class-validator";

export class UpdatePasswordDto {
    @IsOptional()
    @IsString()
    oldPassword?: string;

    @IsString()
    @MinLength(6, { message: "Пароль должен содержать минимум 6 символов" })
    newPassword!: string;

    // Добавляем разрешение на получение OTP-кода
    @IsOptional()
    @IsString()
    otp?: string;
}
