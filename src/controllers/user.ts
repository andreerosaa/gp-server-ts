import { Request, Response, NextFunction } from 'express';
import { Controller } from '../decorators/controller';
import { Route } from '../decorators/route';
import { MongoGetAll } from '../decorators/mongoose/getAll';
import { MongoGet } from '../decorators/mongoose/get';
import { MongoQuery } from '../decorators/mongoose/query';
import { MongoUpdate } from '../decorators/mongoose/update';
import { MongoDelete } from '../decorators/mongoose/delete';
import { createUser, getUserByUsername, User } from '../models/user';
import { comparePasswords, hashPassword } from '../helpers/auth';
import jwt from 'jsonwebtoken';
import { auth } from '../config/config';

@Controller('/user')
class UserController {
	@Route('get')
	@MongoGetAll(User)
	getAll(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGetAll);
	}

	@Route('get', '/:id')
	@MongoGet(User)
	getById(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGet);
	}

	@Route('post', '/register')
	async register(req: Request, res: Response, next: NextFunction) {
		try {
			const { username, password } = req.body;

			if (!username || !password) {
				return res.sendStatus(400);
			}

			const existingUser = await getUserByUsername(username);

			if (existingUser) {
				return res.status(403).json({ message: 'Already exists' });
			}

			const hashedPassword = await hashPassword(password);

			const user = await createUser({
				username: username,
				password: hashedPassword
			});

			return res.status(200).json(user).end();
		} catch (error) {
			logging.error(error);
			return res.status(400).json({ error: error });
		}
	}

	@Route('post', '/login')
	async login(req: Request, res: Response, next: NextFunction) {
		try {
			const { username, password } = req.body;

			if (!username || !password) {
				return res.sendStatus(400);
			}

			const existingUser = await getUserByUsername(username).select('+password');

			if (!existingUser) {
				return res.status(400).json({ message: 'Invalid credentials' });
			}

			// Compare passwords
			const passwordMatch = await comparePasswords(req.body.password, existingUser.password);
			if (!passwordMatch) {
				return res.status(401).json({ error: 'Invalid credentials' });
			}

			// Generate JWT token
			const token = jwt.sign({ username: existingUser.username }, auth.JWT_SECRET as jwt.Secret, { expiresIn: '5m' });

			return res.status(200).json({ accessToken: token }).end();
		} catch (error) {
			logging.error(error);
			return res.status(400).json({ error: error });
		}
	}

	@Route('post', '/query')
	@MongoQuery(User)
	query(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoQuery);
	}

	@Route('patch', '/update/:id')
	@MongoUpdate(User)
	update(req: Request, res: Response, next: NextFunction) {
		return res.status(201).json(req.mongoUpdate);
	}

	@Route('delete', '/delete/:id')
	@MongoDelete(User)
	delete(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json({ message: 'deleted' });
	}
}

export default UserController;
