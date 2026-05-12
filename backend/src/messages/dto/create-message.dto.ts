import { IsString, MaxLength, IsDateString, MinDate } from "class-validator";
import { Type } from "class-transformer";

export class CreateMessageDto {
    @IsString({ message: "Текст сообщения должен быть строкой" })
    @MaxLength(10000, { message: "Максимальная длина сообщения — 10 000 символов" })
    content: string;

    @Type(() => Date)
    @MinDate(new Date(), { message: "Дата отправки должна быть в будущем" })
    triggerDate: Date;
}
