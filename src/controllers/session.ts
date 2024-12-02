import { Request, Response, NextFunction } from 'express';
import { Controller } from '../decorators/controller';
import { Route } from '../decorators/route';
import { MongoGetAll } from '../decorators/mongoose/getAll';
import { getSessionById, getSessionByQuery, Session, updateSessionById } from '../models/session';
import { MongoGet } from '../decorators/mongoose/get';
import { MongoCreate } from '../decorators/mongoose/create';
import { MongoQuery } from '../decorators/mongoose/query';
import { MongoUpdate } from '../decorators/mongoose/update';
import { MongoDelete } from '../decorators/mongoose/delete';
import { IBookSessionRequest } from '../interfaces/bookSession';
import { ISessionByDate, SessionStatusEnum } from '../interfaces/session';
import { MailService } from '../services/mail';
import { getPatientByEmail, createPatient, getPatientById } from '../models/patient';
import { auth } from '../config/config';
import jwt from 'jsonwebtoken';
import { authorizationHandler } from '../middleware/authorizationHandler';
import { ISearchSessionByDate } from '../interfaces/searchSessionByDate';
import { getTherapistById } from '../models/therapist';

@Controller('/session')
class SessionController {
	@Route('get', '', authorizationHandler)
	@MongoGetAll(Session)
	getAll(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGetAll);
	}

	@Route('get', '/:id', authorizationHandler)
	@MongoGet(Session)
	getById(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGet);
	}

	@Route('get', '/confirm/:id')
	async confirm(req: Request, res: Response, next: NextFunction) {
		try {
			const { token } = req.query;

			if (!token) {
				return res.sendStatus(400);
			}

			const session = await getSessionById(req.params.id);

			if (!session) {
				return res.sendStatus(404);
			}

			if (!session.patientId || session.patientId.length === 0) {
				return res.status(403).json({ message: 'Patient not found' });
			} else {
				const patient = await getPatientById(session.patientId);

				if (!patient?.verified) {
					return res.status(403).json({ message: 'Patient not verified' });
				}
			}

			if (session.confirmationToken !== token) {
				return res.status(400).json({ message: 'Invalid token' });
			}

			if (session.status !== SessionStatusEnum.PENDING && session.status !== SessionStatusEnum.AVAILABLE) {
				return res.status(403).json({ message: 'Session already confirmed or canceled' });
			}

			const updateSessionRequest = { status: SessionStatusEnum.CONFIRMED };
			const updateSession = await updateSessionById(req.params.id, updateSessionRequest);
			return res.status(201).json(updateSession);
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('post', '', authorizationHandler)
	@MongoCreate(Session)
	create(req: Request, res: Response, next: NextFunction) {
		return res.status(201).json(req.mongoCreate);
	}

	@Route('post', '/query', authorizationHandler)
	@MongoQuery(Session)
	query(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoQuery);
	}

	@Route('post', '/date')
	async getByDate(req: Request<any, any, ISearchSessionByDate>, res: Response, next: NextFunction) {
		try {
			//TODO: add format validation
			const { date } = req.body;

			if (!date) {
				return res.sendStatus(400);
			}

			const startOfDay = new Date(date);
			startOfDay.setUTCHours(0, 0, 0, 0);

			const endOfDay = new Date(date);
			endOfDay.setUTCHours(23, 59, 59, 999);

			const request = {
				date: {
					$gte: startOfDay,
					$lte: endOfDay
				}
			};

			const sessions = await getSessionByQuery(request);

			if (!sessions) {
				return res.sendStatus(404);
			}

			if (sessions.length === 0) {
				return res.status(200).json(sessions);
			}

			const sessionsWithTherapist = await Promise.all(
				sessions.map(async (session) => {
					const therapist = await getTherapistById(session.therapistId);
					return {
						_id: session._id,
						date: session.date,
						durationInMinutes: session.durationInMinutes,
						vacancies: session.vacancies,
						status: session.status,
						confirmationToken: session.confirmationToken,
						patientId: session.patientId,
						therapist: { id: therapist?._id, name: therapist?.name },
						createdAt: session.createdAt,
						updatedAt: session.updatedAt
					};
				})
			);

			return res.status(200).json(sessionsWithTherapist);
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('post', '/book/:id')
	async book(req: Request<any, any, IBookSessionRequest>, res: Response, next: NextFunction) {
		try {
			//TODO: add format validation
			const { patientName, email } = req.body;

			if (!patientName || !email) {
				return res.sendStatus(400);
			}

			const session = await getSessionById(req.params.id);
			if (!session) {
				return res.sendStatus(404);
			} else if (session.patientId) {
				return res.status(403).json({ message: 'Session already booked' });
			}

			const findPatientByEmail = await getPatientByEmail(email);

			const jwtExpiration = Math.floor((new Date(session.date).getTime() - Date.now()) / 1000);

			const confirmationToken = jwt.sign({ patientName: patientName }, auth.JWT_SECRET as jwt.Secret, { expiresIn: jwtExpiration });

			const updateSessionRequest = { patientId: '', status: SessionStatusEnum.PENDING, confirmationToken: confirmationToken };

			let newPatient = false;

			if (!findPatientByEmail) {
				try {
					const createPatientRequest = {
						name: patientName,
						email: email,
						verified: false,
						verificationCode: Math.floor(1000 + Math.random() * 9000),
						expirationCode: new Date(new Date().getTime() + 5 * 60 * 1000)
					};

					const createdPatient = await createPatient(createPatientRequest);
					newPatient = true;

					logging.log('Patient created successfully', createdPatient);
					updateSessionRequest.patientId = createdPatient._id.toString();

					//FIXME: cleanup or separate responsibilities of this part
					const emailMessage = `<h1> Your verification code: ${createPatientRequest.verificationCode} </h1>`;
					const receiver = email;
					const subject = 'Verification code';

					const emailService = new MailService();
					const sent: boolean = await emailService.send({ message: emailMessage, to: receiver, subject });
					logging.log(sent ? 'Verification code created successfully' : 'Error sending verification code');
				} catch (error) {
					logging.error(error);
					return res.status(500).json(error);
				}
			} else {
				updateSessionRequest.patientId = findPatientByEmail._id.toString();
			}

			const updatedSession = await updateSessionById(req.params.id, updateSessionRequest);

			return res.status(201).json({
				session: updatedSession,
				newPatient: newPatient
			});
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('patch', '/update/:id', authorizationHandler)
	@MongoUpdate(Session)
	update(req: Request, res: Response, next: NextFunction) {
		return res.status(201).json(req.mongoUpdate);
	}

	@Route('delete', '/delete/:id', authorizationHandler)
	@MongoDelete(Session)
	delete(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json({ message: 'deleted' });
	}
}

export default SessionController;
