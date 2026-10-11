import * as dotenv from 'dotenv';

/**
 * Loads .env once, as a side effect of importing this file.
 *
 * It has to be the first import of main.ts: several modules read process.env
 * while their decorators are being evaluated (JwtModule.register, for one),
 * which happens before any function body runs.
 */
dotenv.config();
