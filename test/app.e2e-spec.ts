import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// Needs a reachable database (the .env credentials): AppModule opens the pool.
describe('AppController (e2e)', () => {
    let app: INestApplication<App>;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    it('/ (GET) returns the API index', async () => {
        const response = await request(app.getHttpServer()).get('/').expect(200);

        expect(response.body.name).toBe('api-multi-db-tables');
        expect(response.body.tables).toContain('users');
    });

    it('/users (GET) is protected', () => {
        return request(app.getHttpServer()).get('/users').expect(401);
    });

    afterEach(async () => {
        await app.close();
    });
});
