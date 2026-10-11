import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PassportModule } from '@nestjs/passport';
import { CategoriesController } from './categories.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule, PassportModule.register({ defaultStrategy: 'jwt' })],
    providers: [CategoriesService],
    controllers: [CategoriesController],
    exports: [CategoriesService],
})
export class CategoriesModule {}
