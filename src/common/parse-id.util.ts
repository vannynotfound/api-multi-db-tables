import { BadRequestException } from '@nestjs/common';

/**
 * Turns a route parameter into a positive integer id.
 * Without this, `+id` silently becomes NaN and the query returns an empty
 * result, which reads like "not found" instead of "you sent a bad id".
 */
export function parseId(value: string, label = 'id'): number {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw new BadRequestException(`${label} must be a positive whole number`);
    }
    return id;
}
