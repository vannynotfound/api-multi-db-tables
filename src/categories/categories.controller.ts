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
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { parseId } from '../common/parse-id.util';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Get()
    async getAll() {
        return this.categoriesService.getAll();
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        return this.categoriesService.findById(parseId(id));
    }

    @Post()
    async create(@Body() body: { name: string; description?: string }) {
        return this.categoriesService.createCategory(body.name, body.description ?? null);
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() body: { name?: string; description?: string },
    ) {
        return this.categoriesService.updateCategory(parseId(id), body);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.categoriesService.deleteCategory(parseId(id));
    }
}
