import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class UpdateNameDto {
    @IsNotEmpty({ message: "Имя не может быть пустым" })
    @IsString()
    @MaxLength(50, { message: "Имя не должно превышать 50 символов" })
    firstName: string;
}
