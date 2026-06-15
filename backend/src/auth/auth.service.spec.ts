import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import { EmailService } from "../email/email.service";
import * as bcrypt from "bcrypt";

jest.mock("bcrypt");

describe("AuthService", () => {
    let authService: AuthService;
    let usersService: UsersService;
    let jwtService: JwtService;

    beforeEach(async () => {
        const mockUsersService = {
            findByEmail: jest.fn(),
        };

        const mockJwtService = {
            sign: jest.fn(),
        };

        const mockEmailService = {
            sendConfirmationEmail: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UsersService, useValue: mockUsersService },
                { provide: JwtService, useValue: mockJwtService },
                { provide: EmailService, useValue: mockEmailService },
            ],
        }).compile();

        authService = module.get<AuthService>(AuthService);
        usersService = module.get<UsersService>(UsersService);
        jwtService = module.get<JwtService>(JwtService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("validateUser", () => {
        it("должен возвращать пользователя при верных учетных данных", async () => {
            const user = { id: "1", email: "test@test.com", passwordHash: "hash" };
            (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await authService.validateUser("test@test.com", "password");

            expect(usersService.findByEmail).toHaveBeenCalledWith("test@test.com");
            expect(bcrypt.compare).toHaveBeenCalledWith("password", "hash");
            expect(result).toEqual(user);
        });

        it("должен выбрасывать UnauthorizedException при неверном пароле", async () => {
            const user = { id: "1", email: "test@test.com", passwordHash: "hash" };
            (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(
                authService.validateUser("test@test.com", "wrong_password"),
            ).rejects.toThrow(UnauthorizedException);
        });

        it("должен выбрасывать UnauthorizedException если пользователь не найден", async () => {
            (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

            await expect(authService.validateUser("notfound@test.com", "password")).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });

    describe("login", () => {
        it("должен возвращать валидный JWT access_token", async () => {
            const user = { id: "1", email: "test@test.com" };
            (jwtService.sign as jest.Mock).mockReturnValue("signed_token");

            const result = await authService.login(user);

            expect(jwtService.sign).toHaveBeenCalledWith({
                email: "test@test.com",
                sub: "1",
                firstName: undefined,
                telegramId: undefined,
                hasPassword: false,
                isEmailConfirmed: undefined,
                pendingEmail: null,
            });
            expect(result).toEqual({ access_token: "signed_token" });
        });
    });
});
