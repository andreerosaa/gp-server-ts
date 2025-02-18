import { Request, Response, NextFunction } from 'express';
import { Controller } from '../decorators/controller';
import { Route } from '../decorators/route';
import { MongoGetAll } from '../decorators/mongoose/getAll';
import { MongoGet } from '../decorators/mongoose/get';
import { MongoQuery } from '../decorators/mongoose/query';
import { MongoDelete } from '../decorators/mongoose/delete';
import {
	createUser,
	getUserByEmail,
	getUserById,
	loginUserValidation,
	registerUserValidation,
	updateUserById,
	User,
	verifyEmailValidation
} from '../models/user';
import { comparePasswords, hashPassword } from '../helpers/auth';
import jwt from 'jsonwebtoken';
import { auth, PRODUCTION } from '../config/config';
import { authorizationHandler } from '../middleware/authorizationHandler';
import { Validate } from '../decorators/validate';
import { loginLimitHandler } from '../middleware/loginLimitHandler';
import { RoleEnum } from '../interfaces/user';
import { roleHandler } from '../middleware/roleHandler';
import eventBus from '../events/eventBus';
import { EventTypes } from '../interfaces/mail';

@Controller('/user')
class UserController {
	@Route('get', '', authorizationHandler, roleHandler(RoleEnum.ADMIN))
	@MongoGetAll(User)
	getAll(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGetAll);
	}

	@Route('get', '/:id', authorizationHandler, roleHandler(RoleEnum.ADMIN))
	@MongoGet(User)
	getById(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGet);
	}

	@Route('get', '/me/:id', authorizationHandler)
	async getPersonalDataById(req: Request, res: Response, next: NextFunction) {
		try {
			const userIdToken = req.sub;
			const userRole = req.role;

			if (!userIdToken || !userRole) {
				return res.sendStatus(400);
			}

			if (userRole === RoleEnum.PATIENT && req.params.id !== userIdToken) {
				return res.status(403).json({ message: 'User is not allowed to retrieve information from other users' });
			}

			const findUser = await getUserById(req.params.id);

			if (!findUser) {
				return res.status(404).json({ message: 'User not found' });
			}

			return res.status(200).json(findUser).end();
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('get', '/code/:id')
	async getVerificationCode(req: Request, res: Response, next: NextFunction) {
		try {
			const findUser = await getUserById(req.params.id);

			if (!findUser) {
				return res.status(404).json({ message: 'User not found' });
			}

			if (findUser?.verified) {
				return res.status(403).json({
					message: 'User is already verified',
					user: findUser
				});
			}

			const newVerificationRequest = {
				verificationCode: Math.floor(1000 + Math.random() * 9000),
				expirationCode: new Date(new Date().getTime() + 5 * 60 * 1000)
			};

			const updateVerificationCodeUser = await updateUserById(req.params.id, newVerificationRequest);

			if (updateVerificationCodeUser) {
				logging.log('User verification code updated: ', updateVerificationCodeUser.verificationCode);
			}

			logging.log(`Event: ${EventTypes.NEW_VERIFICATION_CODE}`);
			eventBus.emit(EventTypes.NEW_VERIFICATION_CODE, {
				email: updateVerificationCodeUser?.email,
				code: newVerificationRequest.verificationCode
			});

			return res.status(200).end();
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('post', '/verify/:id')
	@Validate(verifyEmailValidation)
	async verify(req: Request, res: Response, next: NextFunction) {
		try {
			const findUser = await getUserById(req.params.id);

			if (!findUser) {
				return res.status(404).json({ message: 'User not found' });
			}

			if (findUser?.verified) {
				return res.status(403).json({
					message: 'User is already verified',
					user: findUser
				});
			}

			if (findUser.expirationCode && req.body.verificationCode === findUser.verificationCode && new Date() < findUser.expirationCode) {
				const verifyUserRequest = { verified: true };
				await updateUserById(req.params.id, verifyUserRequest);

				logging.log('User verified successfully');
				return res.status(200).end();
			} else {
				return res.status(400).json({ error: 'Invalid or expired code' }).end();
			}
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('post', '/register')
	@Validate(registerUserValidation)
	async register(req: Request, res: Response, next: NextFunction) {
		try {
			const { name, surname, email, password } = req.body;

			if (!name || !surname || !email || !password) {
				return res.sendStatus(400);
			}

			const existingUser = await getUserByEmail(email);

			if (existingUser) {
				return res.status(403).json({ message: 'Already exists' });
			}

			const hashedPassword = await hashPassword(password);

			const verificationCode = Math.floor(1000 + Math.random() * 9000);

			const user = await createUser({
				name: name,
				surname: surname,
				email: email,
				verificationCode: verificationCode,
				expirationCode: new Date(new Date().getTime() + 5 * 60 * 1000),
				password: hashedPassword
			});

			logging.log(`Event: ${EventTypes.USER_REGISTERED}`);
			eventBus.emit(EventTypes.USER_REGISTERED, { email: user.email, code: user.verificationCode });

			return res.status(201).json({ id: user._id, email: user.email }).end();
		} catch (error) {
			logging.error(error);
			return res.status(400).json({ error: error });
		}
	}

	@Route('post', '/login', loginLimitHandler)
	@Validate(loginUserValidation)
	async login(req: Request, res: Response, next: NextFunction) {
		try {
			const { email, password } = req.body;

			if (!email || !password) {
				return res.sendStatus(400);
			}

			const existingUser = await getUserByEmail(email).select('+password');

			if (!existingUser) {
				return res.status(400).json({ message: 'Invalid credentials' });
			}

			if (!existingUser.verified) {
				return res.status(403).json({ message: 'Unverified user', userId: existingUser._id });
			}

			// Compare passwords
			const passwordMatch = await comparePasswords(req.body.password, existingUser.password);
			if (!passwordMatch) {
				return res.status(400).json({ error: 'Incorrect username or password' });
			}

			// Generate JWT token
			const accessToken = jwt.sign({ sub: existingUser._id, role: existingUser.role }, auth.JWT_SECRET as jwt.Secret, {
				expiresIn: '5m'
			});
			const refreshToken = jwt.sign({ sub: existingUser._id, role: existingUser.role }, auth.JWT_REFRESH_TOKEN_SECRET as jwt.Secret, {
				expiresIn: '1h'
			});

			// Set the refresh token as an HTTP-only cookie
			res.cookie('refreshToken', refreshToken, {
				httpOnly: true,
				secure: PRODUCTION, // secure if in production
				sameSite: 'strict',
				maxAge: 60 * 60 * 1000 // 1h,
			});

			return res.status(200).json({ accessToken: accessToken }).end();
		} catch (error) {
			logging.error(error);
			return res.status(400).json({ error: error });
		}
	}

	@Route('post', '/logout')
	logout(req: Request, res: Response, next: NextFunction) {
		try {
			res.clearCookie('refreshToken', {
				httpOnly: true,
				secure: PRODUCTION,
				sameSite: 'strict'
			});
			return res.status(200).json({ message: 'Logged out successfully' });
		} catch (error) {
			logging.error(error);
			return res.status(400).json({ error: error });
		}
	}

	@Route('post', '/refresh')
	refreshToken(req: Request, res: Response, next: NextFunction) {
		try {
			const { refreshToken } = req.cookies;

			if (!refreshToken) {
				return res.status(400).json({ message: 'Refresh token not found' });
			}

			const verifyRefreshToken = <{ sub: string; role: RoleEnum }>jwt.verify(refreshToken, auth.JWT_REFRESH_TOKEN_SECRET as jwt.Secret);

			if (!verifyRefreshToken) {
				return res.status(403).json({ message: 'Invalid refresh token' });
			}

			const accessToken = jwt.sign({ sub: verifyRefreshToken.sub, role: verifyRefreshToken.role }, auth.JWT_SECRET as jwt.Secret, {
				expiresIn: '5m'
			});

			return res.status(200).json({ accessToken: accessToken }).end();
		} catch (error) {
			logging.error(error);
			return res.status(400).json({ error: error });
		}
	}

	@Route('post', '/query', authorizationHandler, roleHandler(RoleEnum.ADMIN))
	@MongoQuery(User)
	query(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoQuery);
	}

	@Route('patch', '/update/:id', authorizationHandler, roleHandler(RoleEnum.ADMIN))
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

	@Route('delete', '/delete/:id', authorizationHandler, roleHandler(RoleEnum.ADMIN))
	@MongoDelete(User)
	delete(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json({ message: 'deleted' });
	}
}

export default UserController;
