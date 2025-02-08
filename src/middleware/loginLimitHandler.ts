import { rateLimit } from 'express-rate-limit';

export const loginLimitHandler = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 5, // max 5 login attempts per 15 minutes
	message: 'Too many login attempts. Try again later.'
});
