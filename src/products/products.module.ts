import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PassportModule } from '@nestjs/passport';
import { ProductsController } from './products.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule, PassportModule.register({ defaultStrategy: 'jwt' })],
    providers: [ProductsService],
    controllers: [ProductsController],
    exports: [ProductsService],
})
export class ProductsModule {}