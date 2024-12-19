import { Request, Response, NextFunction } from 'express';
import { Controller } from '../decorators/controller';
import { Route } from '../decorators/route';
import { MongoGetAll } from '../decorators/mongoose/getAll';
import { MongoGet } from '../decorators/mongoose/get';
import { MongoQuery } from '../decorators/mongoose/query';
import { MongoDelete } from '../decorators/mongoose/delete';
import { createUser, getUserByUsername, updateUserById, User, userValidation } from '../models/user';
import { comparePasswords, hashPassword } from '../helpers/auth';
import jwt from 'jsonwebtoken';
import { auth, PRODUCTION } from '../config/config';
import { authorizationHandler } from '../middleware/authorizationHandler';
import { Validate } from '../decorators/validate';

@Controller('/user')
class UserController {
	@Route('get', '', authorizationHandler)
	@MongoGetAll(User)
	getAll(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGetAll);
	}

	@Route('get', '/:id', authorizationHandler)
	@MongoGet(User)
	getById(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGet);
	}

	@Route('post', '/register')
	@Validate(userValidation)
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
	@Validate(userValidation)
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
			const accessToken = jwt.sign({ username: existingUser.username }, auth.JWT_SECRET as jwt.Secret, { expiresIn: '5m' });
			const refreshToken = jwt.sign({ username: existingUser.username }, auth.JWT_REFRESH_TOKEN_SECRET as jwt.Secret, { expiresIn: '1h' });

			// Set the refresh token as an HTTP-only cookie
			res.cookie('refreshToken', refreshToken, {
				httpOnly: true,
				secure: PRODUCTION, // secure if in production
				sameSite: 'strict',
				maxAge: 60 * 60 * 1000 // 1h
			});

			return res.status(200).json({ accessToken: accessToken }).end();
		} catch (error) {
			logging.error(error);
			return res.status(400).json({ error: error });
		}
	}

	@Route('post', '/query', authorizationHandler)
	@MongoQuery(User)
	query(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoQuery);
	}

	@Route('patch', '/update/:id', authorizationHandler)
	async update(req: Request, res: Response, next: NextFunction) {
		try {
			const user = await User.findById(req.params.id);

			if (!user) {
				return res.sendStatus(404);
			}

			const { password } = req.body;

			if (password) {
				req.body.password = await hashPassword(password);
			}

			const updateUser = await updateUserById(user.id, req.body);
			return res.status(201).json({ updateUser });
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('delete', '/delete/:id', authorizationHandler)
	@MongoDelete(User)
	delete(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json({ message: 'deleted' });
	}
}

export default UserController;
