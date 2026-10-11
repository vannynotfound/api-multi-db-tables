import '../config/env';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as mysql from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    pool: mysql.Pool;

    async onModuleInit() {
        this.pool = mysql.createPool({
            host: process.env.DB_HOST,
            port: +(process.env.DB_PORT || 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            // DECIMAL columns (products.price) otherwise arrive as strings
            decimalNumbers: true,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });

        const connection = await this.pool.getConnection();
        await connection.ping();
        connection.release();
        console.log('Database connection established');
    }

    async onModuleDestroy() {
        await this.pool.end();
        console.log('Database connection closed');
    }

    getPool(): mysql.Pool {
        return this.pool;
    }
}
