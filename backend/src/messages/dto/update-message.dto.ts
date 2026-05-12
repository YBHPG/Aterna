import { IsString, MaxLength } from "class-validator";

export class UpdateMessageDto {
    @IsString({ message: "Текст сообщения должен быть строкой" })
    @MaxLength(10000, { message: "Максимальная длина сообщения — 10 000 символов" })
    content: string;
}
