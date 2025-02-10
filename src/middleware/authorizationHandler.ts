import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { auth } from '../config/config';
import { RoleEnum } from '../interfaces/user';

declare global {
	namespace Express {
		interface Request {
			email?: string;
			role?: RoleEnum;
		}
	}
}

interface JwtPayload {
	email: string;
	role: RoleEnum;
}

export function authorizationHandler(req: Request, res: Response, next: NextFunction) {
	const token = req.headers.authorization?.split(' ')[1];

	if (!token) {
		logging.error({ message: 'Access denied: missing token' });
		res.status(401).json({ error: 'Access denied: missing token' });
	} else {
		try {
			const decoded = jwt.verify(token, auth.JWT_SECRET as jwt.Secret) as JwtPayload;

			req.email = decoded.email;
			req.role = decoded.role;

			next();
		} catch (err) {
			logging.error({ error: err, message: 'Invalid token' });
			res.status(403).json({ error: 'Invalid token' });
		}
	}
}
