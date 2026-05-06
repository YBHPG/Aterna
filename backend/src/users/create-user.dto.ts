import { IsEmail, IsString, MinLength, IsOptional, ValidateIf } from "class-validator";

export class CreateUserDto {
    @IsEmail()
    email!: string;

    // Пароль обязателен только если нет ни telegramId, ни vkId
    @ValidateIf((o) => !o.telegramId && !o.vkId)
    @IsString()
    @MinLength(6)
    password?: string;

    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    telegramId?: string;

    @IsOptional()
    @IsString()
    vkId?: string;
}
