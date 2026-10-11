import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RowDataPacket, OkPacket } from 'mysql2';

@Injectable()
export class ProductsService {
    constructor(private databaseService: DatabaseService) {}

    private pool = () => this.databaseService.getPool();

    // products JOIN categories, so one request shows the related table too
    private readonly selectProduct = `
        SELECT p.id, p.name, p.price, p.category_id,
               c.name AS category_name,
               p.created_at, p.updated_at
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id`;

    async getAll() {
        const [rows] = await this.pool().execute<RowDataPacket[]>(
            `${this.selectProduct} ORDER BY p.id`,
        );
        return rows;
    }

    async findById(id: number) {
        const [rows] = await this.pool().execute<RowDataPacket[]>(
            `${this.selectProduct} WHERE p.id = ?`,
            [id],
        );
        if (rows.length === 0) {
            throw new NotFoundException(`Product with id ${id} not found`);
        }
        return rows[0];
    }

    async createProduct(name: string, price: number, categoryId: number | null = null) {
        if (!name || !name.trim()) {
            throw new BadRequestException('name is required');
        }

        const validPrice = this.validatePrice(price);
        await this.assertCategoryExists(categoryId);

        const [result] = await this.pool().execute<OkPacket>(
            'INSERT INTO products (name, price, category_id) VALUES (?, ?, ?)',
            [name.trim(), validPrice, categoryId ?? null],
        );
        return this.findById(result.insertId);
    }

    async updateProduct(
        id: number,
        partial: { name?: string; price?: number; categoryId?: number | null },
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

        if (partial.price !== undefined) {
            fields.push('price = ?');
            values.push(this.validatePrice(partial.price));
        }

        if (partial.categoryId !== undefined) {
            await this.assertCategoryExists(partial.categoryId);
            fields.push('category_id = ?');
            values.push(partial.categoryId);
        }

        if (fields.length === 0) {
            throw new BadRequestException(
                'Provide at least one field to update: name, price, categoryId',
            );
        }

        await this.findById(id); // 404 before attempting the write
        values.push(id);

        await this.pool().execute(
            `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
            values,
        );
        return this.findById(id);
    }

    async deleteProduct(id: number) {
        try {
            const [result] = await this.pool().execute<OkPacket>(
                'DELETE FROM products WHERE id = ?',
                [id],
            );
            if (result.affectedRows === 0) {
                throw new NotFoundException(`Product with id ${id} not found`);
            }
            return { message: `Product ${id} deleted successfully` };
        } catch (error: any) {
            // orders.product_id is ON DELETE RESTRICT
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                throw new BadRequestException(
                    `Product ${id} still has orders referencing it. Delete those orders first.`,
                );
            }
            throw error;
        }
    }

    private validatePrice(price: number): number {
        const value = Number(price);
        if (!Number.isFinite(value) || value < 0) {
            throw new BadRequestException('price must be a number greater than or equal to 0');
        }
        return value;
    }

    private async assertCategoryExists(categoryId: number | null | undefined) {
        if (categoryId === null || categoryId === undefined) return;

        if (!Number.isInteger(Number(categoryId)) || Number(categoryId) <= 0) {
            throw new BadRequestException('categoryId must be a positive whole number or null');
        }

        const [rows] = await this.pool().execute<RowDataPacket[]>(
            'SELECT id FROM categories WHERE id = ?',
            [categoryId],
        );
        if (rows.length === 0) {
            throw new BadRequestException(`Category with id ${categoryId} does not exist`);
        }
    }
}
