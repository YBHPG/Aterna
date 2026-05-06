import { Controller, Post, Body } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./create-user.dto";

@Controller("users")
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    public async register(@Body() dto: CreateUserDto) {
        return this.usersService.create(
            dto.email,
            dto.password,
            dto.firstName,
            dto.telegramId,
            dto.vkId,
        );
    }
}
