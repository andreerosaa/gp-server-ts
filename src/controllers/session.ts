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
import { IBookSessionRequest, ISearchSessionByDate, SessionStatusEnum } from '../interfaces/session';
import { MailService } from '../services/mail';
import { getPatientByEmail, getPatientById } from '../models/patient';
import { auth, client, server } from '../config/config';
import jwt from 'jsonwebtoken';
import { authorizationHandler } from '../middleware/authorizationHandler';
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

			await updateSessionById(req.params.id, updateSessionRequest);

			return res.redirect(`${client.CLIENT_BASE_URL}/confirmed`);
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('get', '/cancel/:id')
	async cancel(req: Request, res: Response, next: NextFunction) {
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

			if (session.cancelationToken !== token) {
				return res.status(400).json({ message: 'Invalid token' });
			}

			if (session.status === SessionStatusEnum.AVAILABLE) {
				return res.status(403).json({ message: 'Session already canceled' });
			}

			const updateSessionRequest = {
				patientId: '',
				confirmationToken: '',
				cancelationToken: '',
				status: SessionStatusEnum.AVAILABLE
			};

			await updateSessionById(req.params.id, updateSessionRequest);

			return res.redirect(`${client.CLIENT_BASE_URL}/canceled`);
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
						cancelationToken: session.cancelationToken,
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
			} else if (session.status !== SessionStatusEnum.AVAILABLE) {
				return res.status(403).json({ message: 'Session is not available' });
			}

			const findPatientByEmail = await getPatientByEmail(email);

			if (!findPatientByEmail) {
				return res.status(404).json({ message: 'Patient not found' });
			}

			if (!findPatientByEmail.verified) {
				return res.status(403).json({ message: 'Unverified patient' });
			}

			const jwtExpiration = Math.floor((new Date(session.date).getTime() - 24 * 60 * 60 * 1000 - Date.now()) / 1000);

			const confirmationToken = jwt.sign({ patientName: patientName }, auth.JWT_SECRET as jwt.Secret, { expiresIn: jwtExpiration });
			const cancelationToken = jwt.sign({ patientName: patientName }, auth.JWT_SECRET as jwt.Secret, { expiresIn: jwtExpiration });

			const updateSessionRequest = {
				patientId: findPatientByEmail._id.toString(),
				status: SessionStatusEnum.PENDING,
				confirmationToken: confirmationToken,
				cancelationToken: cancelationToken
			};

			const updatedSession = await updateSessionById(req.params.id, updateSessionRequest);

			if (!updatedSession) {
				return res.status(500).json({ message: 'Error updating session' });
			}

			//FIXME: remove from here
			const emailMessage = `<h1> Ginásio Palmeiras </h1>
				<h3> Sessão de ${updatedSession.date.toLocaleDateString()} às ${updatedSession.date.toLocaleTimeString()}</h3>
				<p> Por favor confirme a sua presença</p>
				<p>
					<button><a href="${server.SERVER_BASE_URL}/session/confirm/${updatedSession.id}?token=${updatedSession.confirmationToken}">
						Clique para confirmar
					</a><button>
					<a href="${server.SERVER_BASE_URL}/session/cancel/${updatedSession.id}?token=${updatedSession.cancelationToken}">Clique para cancelar</a>
				</p>`;
			const receiver = findPatientByEmail.email;
			const subject = 'Email de confirmação';
			const emailService = new MailService();

			const sent: boolean = await emailService.send({ message: emailMessage, to: receiver, subject });
			if (sent) {
				logging.log('Confirmation email sent successfully');
			} else {
				logging.log('Error sending confirmation email');
			}

			return res.status(201).json(updatedSession);
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
