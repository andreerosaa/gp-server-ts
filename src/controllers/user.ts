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
import { MailService } from '../services/mail';
import { loginLimitHandler } from '../middleware/loginLimitHandler';

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

			logging.log('Verification code created successfully', updateVerificationCodeUser);

			//FIXME: cleanup or separate responsibilities of this part
			const emailMessage = `
						<h1> Ginásio Palmeiras </h1>
						<p> O seu código de verificação é: ${newVerificationRequest.verificationCode} </p>
					`;
			const receiver = findUser.email;
			const subject = `Código de verificação: ${newVerificationRequest.verificationCode}`;

			const emailService = new MailService();
			const sent: boolean = await emailService.send({ message: emailMessage, to: receiver, subject });
			logging.log(sent ? 'Verification code created successfully' : 'Error sending verification code');
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
				return res.sendStatus(200).end();
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

			//TODO: add event to queue and handle sending emails with event handlers
			const emailMessage = `
						<h1> Ginásio Palmeiras </h1>
						<p> O seu código de verificação é: ${verificationCode} </p>
					`;
			const receiver = email;
			const subject = `Código de verificação: ${verificationCode}`;

			const emailService = new MailService();
			const sent: boolean = await emailService.send({ message: emailMessage, to: receiver, subject });
			logging.log(sent ? 'Verification code created successfully' : 'Error sending verification code');

			return res.status(200).json({ id: user._id, email: user.email }).end();
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
				return res.status(403).json({ message: 'Unverified user' });
			}

			// Compare passwords
			const passwordMatch = await comparePasswords(req.body.password, existingUser.password);
			if (!passwordMatch) {
				return res.status(401).json({ error: 'Invalid credentials' });
			}

			// Generate JWT token
			const accessToken = jwt.sign({ email: existingUser.email, role: existingUser.role }, auth.JWT_SECRET as jwt.Secret, {
				expiresIn: '5m'
			});
			const refreshToken = jwt.sign({ email: existingUser.email, role: existingUser.role }, auth.JWT_REFRESH_TOKEN_SECRET as jwt.Secret, {
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
				return res.status(401).json({ message: 'Refresh token not found' });
			}

			const verifyRefreshToken = <{ username: string }>jwt.verify(refreshToken, auth.JWT_REFRESH_TOKEN_SECRET as jwt.Secret);

			if (!verifyRefreshToken) {
				return res.status(403).json({ message: 'Invalid refresh token' });
			}

			const accessToken = jwt.sign({ username: verifyRefreshToken.username }, auth.JWT_SECRET as jwt.Secret, { expiresIn: '5m' });

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
