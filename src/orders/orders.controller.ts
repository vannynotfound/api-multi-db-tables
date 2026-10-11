import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Request,
    UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { parseId } from '../common/parse-id.util';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @Get()
    async getAll() {
        return this.ordersService.getAll();
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        return this.ordersService.findById(parseId(id));
    }

    // userId is optional: left out, the order belongs to the logged-in user.
    @Post()
    async create(
        @Body() body: { userId?: number; productId: number; quantity: number },
        @Request() req: { user: { id: number } },
    ) {
        return this.ordersService.createOrder(
            body.userId ?? req.user.id,
            body.productId,
            body.quantity,
        );
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() body: { userId?: number; productId?: number; quantity?: number },
    ) {
        return this.ordersService.updateOrder(parseId(id), body);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.ordersService.deleteOrder(parseId(id));
    }
}
