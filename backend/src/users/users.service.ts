import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "./user.entity";

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly usersRepo: Repository<User>,
    ) {}

    public async findByEmail(emailAddress: string): Promise<User | null> {
        return this.usersRepo.findOne({
            where: { email: emailAddress.toLowerCase() },
        });
    }

    public async findById(id: string): Promise<User | null> {
        return this.usersRepo.findOne({
            where: { id },
        });
    }

    public async findByTelegramId(telegramId: string): Promise<User | null> {
        return this.usersRepo.findOne({
            where: { telegramId },
        });
    }

    public async findByVkId(vkId: string): Promise<User | null> {
        return this.usersRepo.findOne({
            where: { vkId },
        });
    }

    public async create(
        emailAddress: string,
        passwordPlain?: string,
        firstName?: string,
        telegramId?: string,
        vkId?: string,
    ): Promise<User> {
        const email = emailAddress.toLowerCase();

        let passwordHash;
        if (passwordPlain) {
            const saltRounds = 10;
            passwordHash = await bcrypt.hash(passwordPlain, saltRounds);
        }

        const newUser = this.usersRepo.create({
            email,
            passwordHash,
            firstName,
            telegramId,
            vkId,
        });

        return this.usersRepo.save(newUser);
    }
}
