import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { UsersService } from "./users.service";
import { User } from "./user.entity";
import * as bcrypt from "bcrypt";

jest.mock("bcrypt");

describe("UsersService", () => {
    let service: UsersService;
    let repository: any;

    beforeEach(async () => {
        repository = {
            create: jest.fn().mockImplementation((dto: any) => dto),
            save: jest
                .fn()
                .mockImplementation((user: any) =>
                    Promise.resolve({ id: "mock-uuid-1234", ...user }),
                ),
            findOne: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: getRepositoryToken(User),
                    useValue: repository,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
    });

    it("должен создавать пользователя с нормализованным email и хэшированным паролем", async () => {
        const hashSpy = jest
            .spyOn(bcrypt, "hash")
            .mockImplementation(() => Promise.resolve("hashed_password") as any);

        const result = await service.create("TeSt@ExAmPlE.com", "password123");

        expect(hashSpy).toHaveBeenCalledWith("password123", 10);
        expect(repository.create).toHaveBeenCalledWith({
            email: "test@example.com",
            passwordHash: "hashed_password",
            firstName: undefined,
        });
        expect(repository.save).toHaveBeenCalled();
        expect(result.email).toEqual("test@example.com");
        expect(result.passwordHash).toEqual("hashed_password");
    });

    it("должен находить пользователя по id", async () => {
        const mockUser = { id: "mock-uuid-1234", email: "test@example.com" };
        repository.findOne.mockResolvedValue(mockUser);

        const result = await service.findById("mock-uuid-1234");

        expect(repository.findOne).toHaveBeenCalledWith({
            where: { id: "mock-uuid-1234" },
        });
        expect(result).toEqual(mockUser);
    });
});
