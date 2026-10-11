import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RowDataPacket, OkPacket } from 'mysql2';

@Injectable()
export class OrdersService {
    constructor(private databaseService: DatabaseService) {}

    private pool = () => this.databaseService.getPool();

    // orders is the join table of the schema: it reaches users, products
    // and - through products - categories.
    private readonly selectOrder = `
        SELECT o.id, o.user_id, u.username,
               o.product_id, p.name AS product_name, p.price,
               c.name AS category_name,
               o.quantity,
               ROUND(p.price * o.quantity, 2) AS total_price,
               o.created_at, o.updated_at
        FROM orders o
        INNER JOIN users u    ON u.id = o.user_id
        INNER JOIN products p ON p.id = o.product_id
        LEFT JOIN categories c ON c.id = p.category_id`;

    async getAll() {
        const [rows] = await this.pool().execute<RowDataPacket[]>(
            `${this.selectOrder} ORDER BY o.id`,
        );
        return rows;
    }

    async findById(id: number) {
        const [rows] = await this.pool().execute<RowDataPacket[]>(
            `${this.selectOrder} WHERE o.id = ?`,
            [id],
        );
        if (rows.length === 0) {
            throw new NotFoundException(`Order with id ${id} not found`);
        }
        return rows[0];
    }

    async createOrder(userId: number, productId: number, quantity: number) {
        await this.assertExists('users', userId, 'userId');
        await this.assertExists('products', productId, 'productId');

        const [result] = await this.pool().execute<OkPacket>(
            'INSERT INTO orders (user_id, product_id, quantity) VALUES (?, ?, ?)',
            [userId, productId, this.validateQuantity(quantity)],
        );
        return this.findById(result.insertId);
    }

    async updateOrder(
        id: number,
        partial: { userId?: number; productId?: number; quantity?: number },
    ) {
        const fields: string[] = [];
        const values: any[] = [];

        if (partial.userId !== undefined) {
            await this.assertExists('users', partial.userId, 'userId');
            fields.push('user_id = ?');
            values.push(partial.userId);
        }

        if (partial.productId !== undefined) {
            await this.assertExists('products', partial.productId, 'productId');
            fields.push('product_id = ?');
            values.push(partial.productId);
        }

        if (partial.quantity !== undefined) {
            fields.push('quantity = ?');
            values.push(this.validateQuantity(partial.quantity));
        }

        if (fields.length === 0) {
            throw new BadRequestException(
                'Provide at least one field to update: userId, productId, quantity',
            );
        }

        await this.findById(id); // 404 before attempting the write
        values.push(id);

        await this.pool().execute(
            `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`,
            values,
        );
        return this.findById(id);
    }

    async deleteOrder(id: number) {
        const [result] = await this.pool().execute<OkPacket>(
            'DELETE FROM orders WHERE id = ?',
            [id],
        );
        if (result.affectedRows === 0) {
            throw new NotFoundException(`Order with id ${id} not found`);
        }
        return { message: `Order ${id} deleted successfully` };
    }

    private validateQuantity(quantity: number): number {
        const value = Number(quantity);
        if (!Number.isInteger(value) || value <= 0) {
            throw new BadRequestException('quantity must be a whole number greater than 0');
        }
        return value;
    }

    // orders has NOT NULL foreign keys, so a missing parent row would come back
    // as a raw MySQL error. Check first and answer with a readable 400 instead.
    private async assertExists(table: 'users' | 'products', id: number, label: string) {
        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            throw new BadRequestException(`${label} must be a positive whole number`);
        }

        const [rows] = await this.pool().execute<RowDataPacket[]>(
            `SELECT id FROM ${table} WHERE id = ?`,
            [id],
        );
        if (rows.length === 0) {
            throw new BadRequestException(
                `${label} ${id} does not exist in the ${table} table`,
            );
        }
    }
}
