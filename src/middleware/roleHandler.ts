import { Request, Response, NextFunction, RequestHandler } from 'express';
import { RoleEnum } from '../interfaces/user';

export function roleHandler(requiredRole: RoleEnum): RequestHandler {
	return (req: Request, res: Response, next: NextFunction) => {
		if (!req.role) {
			logging.error({ message: 'Access denied: missing role' });
			res.status(401).json({ error: 'Access denied: missing role' });
		}

		if (req.role !== requiredRole) {
			logging.error({ message: `Access denied: requires ${requiredRole} role` });
			res.status(403).json({ error: `Access denied: requires ${requiredRole} role` });
		} else {
			next();
		}
	};
}
