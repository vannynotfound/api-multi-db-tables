import {
    Injectable,
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RowDataPacket, OkPacket } from 'mysql2';

@Injectable()
export class CategoriesService {
    constructor(private databaseService: DatabaseService) {}

    private pool = () => this.databaseService.getPool();

    async getAll() {
        const [rows] = await this.pool().execute<RowDataPacket[]>(
            `SELECT c.id, c.name, c.description, c.created_at, c.updated_at,
                    COUNT(p.id) AS product_count
             FROM categories c
             LEFT JOIN products p ON p.category_id = c.id
             GROUP BY c.id
             ORDER BY c.id`,
        );
        return rows;
    }

    async findById(id: number) {
        const [rows] = await this.pool().execute<RowDataPacket[]>(
            'SELECT id, name, description, created_at, updated_at FROM categories WHERE id = ?',
            [id],
        );
        if (rows.length === 0) {
            throw new NotFoundException(`Category with id ${id} not found`);
        }
        return rows[0];
    }

    async createCategory(name: string, description: string | null = null) {
        if (!name || !name.trim()) {
            throw new BadRequestException('name is required');
        }

        try {
            const [result] = await this.pool().execute<OkPacket>(
                'INSERT INTO categories (name, description) VALUES (?, ?)',
                [name.trim(), description ?? null],
            );
            return this.findById(result.insertId);
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new ConflictException(`Category "${name}" already exists`);
            }
            throw error;
        }
    }

    async updateCategory(
        id: number,
        partial: { name?: string; description?: string | null },
    ) {
        const fields: string[] = [];
        const values: any[] = [];

        if (partial.name !== undefined) {
            if (!partial.name.trim()) {
                throw new BadRequestException('name cannot be empty');
            }
            fields.push('name = ?');
            values.push(partial.name.trim());
        }

        if (partial.description !== undefined) {
            fields.push('description = ?');
            values.push(partial.description);
        }

        if (fields.length === 0) {
            throw new BadRequestException('Provide at least one field to update: name, description');
        }

        await this.findById(id); // 404 before attempting the write
        values.push(id);

        try {
            await this.pool().execute(
                `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
                values,
            );
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new ConflictException(`Category "${partial.name}" already exists`);
            }
            throw error;
        }

        return this.findById(id);
    }

    async deleteCategory(id: number) {
        const [result] = await this.pool().execute<OkPacket>(
            'DELETE FROM categories WHERE id = ?',
            [id],
        );
        if (result.affectedRows === 0) {
            throw new NotFoundException(`Category with id ${id} not found`);
        }
        return { message: `Category ${id} deleted successfully` };
    }
}
