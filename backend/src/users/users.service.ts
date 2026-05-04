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

    public async create(emailAddress: string, passwordPlain: string): Promise<User> {
        const email = emailAddress.toLowerCase();
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(passwordPlain, saltRounds);

        const newUser = this.usersRepo.create({
            email,
            passwordHash,
        });

        return this.usersRepo.save(newUser);
    }
}
