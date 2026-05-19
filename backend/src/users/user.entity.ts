import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from "typeorm";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ unique: true })
    email!: string;

    @Column({ default: false })
    isEmailConfirmed: boolean;

    @Column({ nullable: true })
    emailConfirmationToken: string;

    @Column({ nullable: true })
    firstName: string;

    @Column({ name: "pending_email", nullable: true })
    pendingEmail?: string | null;

    @Column({ name: "password_hash", nullable: true })
    passwordHash?: string;

    @Column({ nullable: true, unique: true })
    telegramId?: string | null;

    @Column({ nullable: true })
    telegramConnectionToken?: string;

    @Column({ name: "password_change_otp", nullable: true })
    passwordChangeOtp?: string;

    @Column({ name: "password_change_otp_expires", type: "timestamp", nullable: true })
    passwordChangeOtpExpires?: Date;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
