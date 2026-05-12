import { IsEmail } from "class-validator";

export class UpdateEmailDto {
    @IsEmail({}, { message: "Некорректный формат email" })
    email!: string;
}
