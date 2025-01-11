import { Request, Response, NextFunction } from 'express';
import { Controller } from '../decorators/controller';
import { Route } from '../decorators/route';
import { MongoGetAll } from '../decorators/mongoose/getAll';
import {
	createManySessions,
	deleteManySessionsByDay,
	deleteManySessionsBySeriesId,
	getSessionById,
	getSessionByQuery,
	Session,
	updateSessionById
} from '../models/session';
import { MongoGet } from '../decorators/mongoose/get';
import { MongoCreate } from '../decorators/mongoose/create';
import { MongoQuery } from '../decorators/mongoose/query';
import { MongoUpdate } from '../decorators/mongoose/update';
import { MongoDelete } from '../decorators/mongoose/delete';
import {
	bookSessionRequestValidation,
	clearDayValidation,
	createFromTemplateValidation,
	createRecurringSessionValidation,
	IBookSessionRequest,
	IClearDayRequest,
	ICreateFromTemplateRequest,
	ICreateRecurringSessionRequest,
	ISearchSessionByDate,
	searchSessionByDateRequestValidation,
	SessionStatusEnum
} from '../interfaces/session';
import { MailService } from '../services/mail';
import { getPatientByEmail, getPatientById } from '../models/patient';
import { auth, client, server, SESSION_SERIES_LENGTH } from '../config/config';
import jwt from 'jsonwebtoken';
import { authorizationHandler } from '../middleware/authorizationHandler';
import { getTherapistById } from '../models/therapist';
import { Validate } from '../decorators/validate';
import { computerDatesByRecurrence } from '../helpers/recurrence';
import { createSeries, deleteSeriesById, getSeriesById } from '../models/series';
import { getTemplateById } from '../models/template';

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
	@Validate(searchSessionByDateRequestValidation)
	async getByDate(req: Request<any, any, ISearchSessionByDate>, res: Response, next: NextFunction) {
		try {
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

	@Route('post', '/date-detailed')
	@Validate(searchSessionByDateRequestValidation)
	async getByDateDetailed(req: Request<any, any, ISearchSessionByDate>, res: Response, next: NextFunction) {
		try {
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
						seriesId: session.seriesId,
						createdAt: session.createdAt,
						updatedAt: session.updatedAt
					};
				})
			);

			const sessionsDetailed = await Promise.all(
				sessionsWithTherapist.map(async (session) => {
					let patient = null;

					if (session.patientId) {
						patient = await getPatientById(session.patientId);
					}
					return {
						_id: session._id,
						date: session.date,
						durationInMinutes: session.durationInMinutes,
						vacancies: session.vacancies,
						status: session.status,
						confirmationToken: session.confirmationToken,
						cancelationToken: session.cancelationToken,
						patient: patient ? { id: patient?._id, name: patient?.name, email: patient?.email } : undefined,
						therapist: session.therapist,
						seriesId: session.seriesId,
						createdAt: session.createdAt,
						updatedAt: session.updatedAt
					};
				})
			);

			return res.status(200).json(sessionsDetailed);
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('post', '/book/:id')
	@Validate(bookSessionRequestValidation)
	async book(req: Request<any, any, IBookSessionRequest>, res: Response, next: NextFunction) {
		try {
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

	@Route('post', '/recurring')
	@Validate(createRecurringSessionValidation)
	async createRecurringSession(req: Request<any, any, ICreateRecurringSessionRequest>, res: Response, next: NextFunction) {
		try {
			const { date, therapistId, durationInMinutes, vacancies, recurrence, status } = req.body;

			if (!date || !therapistId || !durationInMinutes || !vacancies || recurrence == null || status == null) {
				return res.sendStatus(400);
			}

			const now = new Date();
			const inputDate = new Date(date);

			if (inputDate < now) {
				return res.status(403).json({ message: 'Not allowed to create sessions in the past' });
			}

			const recurrenceDates = computerDatesByRecurrence(date, recurrence, SESSION_SERIES_LENGTH);

			if (!recurrenceDates || recurrenceDates.length <= 0) {
				return res.status(500).json({ message: 'Error creating recurrence dates' });
			}

			const createSessionSeries = await createSeries({
				recurrence: recurrence,
				startDate: recurrenceDates[0],
				endDate: recurrenceDates[recurrenceDates.length - 1]
			});

			if (!createSessionSeries) {
				return res.status(500).json({ message: 'Error creating series' });
			}

			const commonSessionValues = {
				seriesId: createSessionSeries._id,
				therapistId: therapistId,
				durationInMinutes: durationInMinutes,
				vacancies: vacancies,
				status: status
			};
			const sessionInSeries = await createManySessions(commonSessionValues, recurrenceDates);

			if (!sessionInSeries) {
				return res.status(500).json({ message: 'Error inserting sessions' });
			}

			return res.status(200).json({ message: 'Session series created successfully' });
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('post', '/template')
	@Validate(createFromTemplateValidation)
	async createFromTemplate(req: Request<any, any, ICreateFromTemplateRequest>, res: Response, next: NextFunction) {
		try {
			const { date, templateId } = req.body;

			if (!date || !templateId) {
				return res.sendStatus(400);
			}

			const template = await getTemplateById(templateId);

			if (!template) {
				return res.status(404).json({ message: 'Template not found' });
			}

			const commonSessionValues = {
				therapistId: template.therapistId,
				durationInMinutes: template.durationInMinutes,
				vacancies: template.vacancies,
				status: SessionStatusEnum.AVAILABLE
			};

			const now = new Date();

			const dates = template.startTimes
				.map((time) => {
					const newDate = new Date(date);
					const newTime = new Date(time.toLocaleString());

					return new Date(newDate.setHours(newTime.getHours(), newTime.getMinutes()));
				})
				.filter((date) => date > now);

			const sessions = await createManySessions(commonSessionValues, dates);

			if (!sessions) {
				return res.status(500).json({ message: 'Error inserting sessions' });
			}

			return res.status(200).json({ message: 'Session series created successfully' });
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

	@Route('post', '/day/delete')
	@Validate(clearDayValidation)
	async clearDaySessions(req: Request<any, any, IClearDayRequest>, res: Response, next: NextFunction) {
		try {
			const { date } = req.body;

			if (!date) {
				return res.sendStatus(400);
			}

			const deletedSessionsByDay = await deleteManySessionsByDay(date);

			if (deletedSessionsByDay.deletedCount === 0) {
				return res.status(500).json({ message: 'Error deleting sessions' });
			}

			return res.status(200).json({ message: 'Session series deleted successfully' });
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('delete', '/recurring/delete/:id')
	async deleteRecurringSessions(req: Request, res: Response, next: NextFunction) {
		try {
			const series = await getSeriesById(req.params.id);

			if (!series) {
				return res.sendStatus(404);
			}

			const deletedSessionsBySeries = await deleteManySessionsBySeriesId(req.params.id);

			if (deletedSessionsBySeries.deletedCount === 0) {
				return res.status(500).json({ message: 'Error deleting sessions' });
			}

			const deletedSeries = await deleteSeriesById(req.params.id);

			if (!deletedSeries) {
				return res.status(500).json({ message: 'Error deleting series' });
			}

			return res.status(200).json({ message: 'Session series deleted successfully' });
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('delete', '/delete/:id', authorizationHandler)
	@MongoDelete(Session)
	delete(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json({ message: 'deleted' });
	}
}

export default SessionController;
