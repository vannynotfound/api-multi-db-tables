import {
    Injectable,
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcryptjs';
import { RowDataPacket, OkPacket } from 'mysql2';

@Injectable()
export class UsersService {
    constructor(private databaseService: DatabaseService) {}

    private pool = () => this.databaseService.getPool();

    // password and refresh_token are never part of a response
    private readonly publicColumns = 'id, username, role, created_at, updated_at';

    async createUser(username: string, password: string, role: string = 'user'): Promise<any> {
        if (!username || !username.trim()) {
            throw new BadRequestException('username is required');
        }
        if (!password || password.length < 6) {
            throw new BadRequestException('password is required and must be at least 6 characters');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        try {
            const [result] = await this.pool().execute<OkPacket>(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                [username.trim(), hashedPassword, role],
            );
            return this.findById(result.insertId);
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new ConflictException(`Username "${username}" is already taken`);
            }
            throw error;
        }
    }

    async findByUsername(username: string): Promise<any> {
        const [rows] = await this.pool().execute<RowDataPacket[]>(
            'SELECT id, username, password, role, refresh_token FROM users WHERE username = ?',
            [username],
        );
        return rows[0];
    }

    async findById(id: number): Promise<any> {
        const [rows] = await this.pool().execute<RowDataPacket[]>(
            `SELECT ${this.publicColumns} FROM users WHERE id = ?`,
            [id],
        );
        if (rows.length === 0) {
            throw new NotFoundException(`User with id ${id} not found`);
        }
        return rows[0];
    }

    async getAll() {
        const [rows] = await this.pool().execute<RowDataPacket[]>(
            `SELECT u.id, u.username, u.role, u.created_at, u.updated_at,
                    COUNT(o.id) AS order_count
             FROM users u
             LEFT JOIN orders o ON o.user_id = u.id
             GROUP BY u.id
             ORDER BY u.id`,
        );
        return rows;
    }

    async updateUser(
        id: number,
        partial: { username?: string; password?: string; role?: string },
    ): Promise<any> {
        const fields: string[] = [];
        const values: any[] = [];

        if (partial.username !== undefined) {
            if (!partial.username.trim()) {
                throw new BadRequestException('username cannot be empty');
            }
            fields.push('username = ?');
            values.push(partial.username.trim());
        }

        if (partial.password !== undefined) {
            if (partial.password.length < 6) {
                throw new BadRequestException('password must be at least 6 characters');
            }
            fields.push('password = ?');
            values.push(await bcrypt.hash(partial.password, 10));
        }

        if (partial.role !== undefined) {
            if (!partial.role.trim()) {
                throw new BadRequestException('role cannot be empty');
            }
            fields.push('role = ?');
            values.push(partial.role.trim());
        }

        if (fields.length === 0) {
            throw new BadRequestException(
                'Provide at least one field to update: username, password, role',
            );
        }

        await this.findById(id); // 404 before attempting the write
        values.push(id);

        try {
            await this.pool().execute(
                `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
                values,
            );
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new ConflictException(`Username "${partial.username}" is already taken`);
            }
            throw error;
        }

        return this.findById(id);
    }

    async deleteUser(id: number) {
        try {
            const [result] = await this.pool().execute<OkPacket>(
                'DELETE FROM users WHERE id = ?',
                [id],
            );
            if (result.affectedRows === 0) {
                throw new NotFoundException(`User with id ${id} not found`);
            }
            return { message: `User ${id} deleted successfully` };
        } catch (error: any) {
            // orders.user_id is ON DELETE RESTRICT
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                throw new BadRequestException(
                    `User ${id} still has orders referencing them. Delete those orders first.`,
                );
            }
            throw error;
        }
    }

    async setRefreshToken(id: number, refreshToken: string | null): Promise<void> {
        await this.pool().execute(
            'UPDATE users SET refresh_token = ? WHERE id = ?',
            [refreshToken, id],
        );
    }

    async findByRefreshToken(refreshToken: string): Promise<any> {
        const [rows] = await this.pool().execute<RowDataPacket[]>(
            'SELECT id, username, role FROM users WHERE refresh_token = ?',
            [refreshToken],
        );
        return rows[0];
    }
}
