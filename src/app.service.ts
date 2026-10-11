import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
    getApiInfo() {
        return {
            name: 'api-multi-db-tables',
            description:
                'Backend system over a 4-table MySQL database with full CRUD operations.',
            tables: ['users', 'categories', 'products', 'orders'],
            endpoints: {
                auth: [
                    'POST /auth/register',
                    'POST /auth/login',
                    'POST /auth/refresh',
                    'POST /auth/logout',
                ],
                users: [
                    'GET /users',
                    'GET /users/:id',
                    'POST /users',
                    'PUT /users/:id',
                    'DELETE /users/:id',
                ],
                categories: [
                    'GET /categories',
                    'GET /categories/:id',
                    'POST /categories',
                    'PUT /categories/:id',
                    'DELETE /categories/:id',
                ],
                products: [
                    'GET /products',
                    'GET /products/:id',
                    'POST /products',
                    'PUT /products/:id',
                    'DELETE /products/:id',
                ],
                orders: [
                    'GET /orders',
                    'GET /orders/:id',
                    'POST /orders',
                    'PUT /orders/:id',
                    'DELETE /orders/:id',
                ],
            },
            note: 'Every route except /auth/register and /auth/login needs a Bearer access token.',
        };
    }
}
