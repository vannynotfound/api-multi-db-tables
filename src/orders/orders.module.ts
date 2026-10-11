import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PassportModule } from '@nestjs/passport';
import { OrdersController } from './orders.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule, PassportModule.register({ defaultStrategy: 'jwt' })],
    providers: [OrdersService],
    controllers: [OrdersController],
    exports: [OrdersService],
})
export class OrdersModule {}