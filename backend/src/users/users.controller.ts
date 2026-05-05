import { Controller, Post, Body } from "@nestjs/common";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    public async register(@Body() body: any) {
        // Передаем email, пароль и имя из тела запроса в наш сервис
        return this.usersService.create(body.email, body.password, body.firstName);
    }
}
