import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { parseId } from '../common/parse-id.util';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    @Get()
    async getAll() {
        return this.productsService.getAll();
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        return this.productsService.findById(parseId(id));
    }

    @Post()
    async create(
        @Body()
        body: {
            name: string;
            price: number;
            categoryId?: number | null;
            category_id?: number | null;
        },
    ) {
        return this.productsService.createProduct(
            body.name,
            body.price,
            body.categoryId ?? body.category_id ?? null,
        );
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body()
        body: {
            name?: string;
            price?: number;
            categoryId?: number | null;
            category_id?: number | null;
        },
    ) {
        const { category_id, ...partial } = body;
        if (partial.categoryId === undefined && category_id !== undefined) {
            partial.categoryId = category_id;
        }
        return this.productsService.updateProduct(parseId(id), partial);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.productsService.deleteProduct(parseId(id));
    }
}
