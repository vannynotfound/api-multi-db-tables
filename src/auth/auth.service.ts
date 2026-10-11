import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService, private jwtService: JwtService) {}

    async validateUser(username: string, password: string): Promise<any> {
        const user = await this.usersService.findByUsername(username);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const valid = await bcrypt.compare(password, user.password);
        if (valid) {
            return { id: user.id, username: user.username, role: user.role };
        }
        throw new UnauthorizedException('Invalid credentials');
    }

    async login(user: { id: number; username: string; role: string }) {
        const { accessToken, refreshToken } = this.signTokens(user);
        await this.usersService.setRefreshToken(user.id, refreshToken);
        return {
            accessToken,
            refreshToken,
            user: { id: user.id, username: user.username, role: user.role },
        };
    }

    async logout(userId: number) {
        await this.usersService.setRefreshToken(userId, null);
        return { message: 'Logged out successfully' };
    }

    async refreshTokens(refreshToken: string) {
        if (!refreshToken) {
            throw new UnauthorizedException('refreshToken is required');
        }

        try {
            jwt.verify(refreshToken, this.refreshSecret());
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        // The token must also be the one currently stored for that user,
        // so a token invalidated by logout cannot be replayed.
        const found = await this.usersService.findByRefreshToken(refreshToken);
        if (!found) {
            throw new UnauthorizedException('Refresh token is no longer valid');
        }

        const tokens = this.signTokens(found);
        await this.usersService.setRefreshToken(found.id, tokens.refreshToken);
        return tokens;
    }

    private signTokens(user: { id: number; username: string; role: string }) {
        const payload = { sub: user.id, username: user.username, role: user.role };
        return {
            accessToken: this.jwtService.sign(payload),
            refreshToken: jwt.sign(payload, this.refreshSecret(), {
                expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
            } as jwt.SignOptions),
        };
    }

    private refreshSecret(): string {
        return process.env.JWT_REFRESH_TOKEN_SECRET || 'default_refresh_secret';
    }
}
