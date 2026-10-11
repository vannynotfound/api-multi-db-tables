import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
    let appController: AppController;

    beforeEach(async () => {
        const app: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [AppService],
        }).compile();

        appController = app.get<AppController>(AppController);
    });

    describe('root', () => {
        it('lists the four tables of the database', () => {
            expect(appController.getApiInfo().tables).toEqual([
                'users',
                'categories',
                'products',
                'orders',
            ]);
        });

        it('documents full CRUD for every table', () => {
            const { endpoints } = appController.getApiInfo();

            for (const table of ['users', 'categories', 'products', 'orders'] as const) {
                const methods = endpoints[table].map((route) => route.split(' ')[0]);
                expect(methods).toEqual(
                    expect.arrayContaining(['GET', 'POST', 'PUT', 'DELETE']),
                );
            }
        });
    });
});
