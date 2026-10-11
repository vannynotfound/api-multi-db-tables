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
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { parseId } from '../common/parse-id.util';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    async getAll() {
        return this.usersService.getAll();
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        return this.usersService.findById(parseId(id));
    }

    @Post()
    async create(@Body() body: { username: string; password: string; role?: string }) {
        return this.usersService.createUser(body.username, body.password, body.role ?? 'user');
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() body: { username?: string; password?: string; role?: string },
    ) {
        return this.usersService.updateUser(parseId(id), body);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.usersService.deleteUser(parseId(id));
    }
}
