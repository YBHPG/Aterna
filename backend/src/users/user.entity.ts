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

    @Column({ nullable: true })
    firstName: string;

    @Column({ name: "password_hash", nullable: true })
    passwordHash?: string;

    @Column({ nullable: true, unique: true })
    telegramId?: string;

    @Column({ nullable: true, unique: true })
    vkId?: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
