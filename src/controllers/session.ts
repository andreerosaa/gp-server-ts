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
	DayStatusByMonth,
	getMonthlySessionsRequestValidation,
	IBookSessionRequest,
	IClearDayRequest,
	ICreateFromTemplateRequest,
	ICreateRecurringSessionRequest,
	IDayStatusByMonth,
	ISearchSessionByDate,
	ISession,
	searchSessionByDateRequestValidation,
	SessionStatusEnum
} from '../interfaces/session';
import { auth, client, MAX_SESSIONS_USER_PER_DAY, SESSION_SERIES_LENGTH } from '../config/config';
import jwt from 'jsonwebtoken';
import { authorizationHandler } from '../middleware/authorizationHandler';
import { getTherapistById } from '../models/therapist';
import { Validate } from '../decorators/validate';
import { computerDatesByRecurrence } from '../helpers/recurrence';
import { createSeries, deleteSeriesById, getSeriesById } from '../models/series';
import { getTemplateById } from '../models/template';
import { getUserById } from '../models/user';
import { RoleEnum } from '../interfaces/user';
import { roleHandler } from '../middleware/roleHandler';
import { EventTypes } from '../interfaces/mail';
import eventBus from '../events/eventBus';
import { isToday } from '../helpers/date';

@Controller('/session')
class SessionController {
	@Route('get', '', authorizationHandler, roleHandler(RoleEnum.ADMIN))
	@MongoGetAll(Session)
	getAll(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGetAll);
	}

	@Route('get', '/:id', authorizationHandler, roleHandler(RoleEnum.ADMIN))
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

			if (!session.userId || session.userId.length === 0) {
				return res.status(403).json({ message: 'User not found' });
			} else {
				const user = await getUserById(session.userId);

				if (!user?.verified) {
					return res.status(403).json({ message: 'Unverified user' });
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

			if (!session.userId || session.userId.length === 0) {
				return res.status(403).json({ message: 'User not found' });
			} else {
				const user = await getUserById(session.userId);

				if (!user?.verified) {
					return res.status(403).json({ message: 'Unverified user' });
				}
			}

			if (session.cancelationToken !== token) {
				return res.status(400).json({ message: 'Invalid token' });
			}

			if (session.status === SessionStatusEnum.AVAILABLE) {
				return res.status(403).json({ message: 'Session already reopened' });
			}

			if (session.status === SessionStatusEnum.CANCELED || session.status === SessionStatusEnum.COMPLETED) {
				return res.status(403).json({ message: 'Session already canceled or completed' });
			}

			if (session.status === SessionStatusEnum.CONFIRMED) {
				return res.status(403).json({ message: 'Session already confirmed' });
			}

			const updateSessionRequest = {
				userId: '',
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

	@Route('post', '', authorizationHandler, roleHandler(RoleEnum.ADMIN))
	@MongoCreate(Session)
	create(req: Request, res: Response, next: NextFunction) {
		return res.status(201).json(req.mongoCreate);
	}

	@Route('post', '/query', authorizationHandler, roleHandler(RoleEnum.ADMIN))
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

	@Route('post', '/date-detailed', authorizationHandler, roleHandler(RoleEnum.ADMIN))
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
						userId: session.userId,
						therapist: { id: therapist?._id, name: therapist?.name },
						seriesId: session.seriesId,
						createdAt: session.createdAt,
						updatedAt: session.updatedAt
					};
				})
			);

			const sessionsDetailed = await Promise.all(
				sessionsWithTherapist.map(async (session) => {
					let user = null;

					if (session.userId) {
						user = await getUserById(session.userId);
					}
					return {
						_id: session._id,
						date: session.date,
						durationInMinutes: session.durationInMinutes,
						vacancies: session.vacancies,
						status: session.status,
						confirmationToken: session.confirmationToken,
						cancelationToken: session.cancelationToken,
						user: user ? { id: user?._id, name: user?.name, surname: user?.surname, email: user?.email } : undefined,
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

	@Route('post', '/month')
	@Validate(getMonthlySessionsRequestValidation)
	async getMonthlySessions(req: Request<any, any, IDayStatusByMonth>, res: Response, next: NextFunction) {
		try {
			const { month, year } = req.body;

			if (month == null || year == null) {
				return res.sendStatus(400);
			}

			const startOfMonth = new Date(year, month, 1);

			const endOfMonth = new Date(year, month + 1, 0);
			endOfMonth.setUTCHours(23, 59, 59, 999);

			const request = {
				date: {
					$gte: startOfMonth,
					$lte: endOfMonth
				}
			};
			const allSessionsInMonth = await getSessionByQuery(request);

			if (!allSessionsInMonth) {
				return res.sendStatus(404);
			}

			if (allSessionsInMonth.length === 0) {
				return res.status(200).json(allSessionsInMonth);
			}

			const dayStatusByMonth: DayStatusByMonth = { available: [], pending: [], full: [], completed: [] };

			// Group sessions by date
			const groupedByDate = allSessionsInMonth.reduce((acc: { [key: number]: ISession[] }, session) => {
				if (!acc[session.date.getDate()]) {
					acc[session.date.getDate()] = [];
				}
				acc[session.date.getDate()].push(session);
				return acc;
			}, {});

			// Classify each day
			for (const [, sessions] of Object.entries(groupedByDate)) {
				if (sessions.some((s) => s.status === SessionStatusEnum.AVAILABLE)) {
					dayStatusByMonth.available.push(sessions[0].date);
				} else if (sessions.some((s) => s.status === SessionStatusEnum.PENDING)) {
					dayStatusByMonth.pending.push(new Date(sessions[0].date));
				} else if (sessions.some((s) => s.status === SessionStatusEnum.CONFIRMED)) {
					dayStatusByMonth.full.push(new Date(sessions[0].date));
				} else {
					dayStatusByMonth.completed.push(new Date(sessions[0].date));
				}
			}

			return res.status(200).json(dayStatusByMonth);
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('post', '/book/:id', authorizationHandler)
	@Validate(bookSessionRequestValidation)
	async book(req: Request<any, any, IBookSessionRequest>, res: Response, next: NextFunction) {
		try {
			const { userId } = req.body;
			const userIdToken = req.sub;
			const userRole = req.role;

			if (!userId || !userIdToken || !userRole) {
				return res.sendStatus(400);
			}

			if (userRole === RoleEnum.PATIENT && userId !== userIdToken) {
				return res.status(403).json({ message: 'User cannot book for other users' });
			}

			const session = await getSessionById(req.params.id);
			if (!session) {
				return res.sendStatus(404);
			} else if (session.userId) {
				return res.status(403).json({ message: 'Session already booked' });
			} else if (session.status !== SessionStatusEnum.AVAILABLE) {
				return res.status(403).json({ message: 'Session is not available' });
			}

			const findUserById = await getUserById(userId);

			if (!findUserById) {
				return res.status(404).json({ message: 'User not found' });
			}

			if (!findUserById.verified) {
				return res.status(403).json({ message: 'Unverified user' });
			}

			const startOfDay = new Date(session.date);
			startOfDay.setUTCHours(0, 0, 0, 0);

			const endOfDay = new Date(session.date);
			endOfDay.setUTCHours(23, 59, 59, 999);

			const request = {
				userId: findUserById._id,
				date: {
					$gte: startOfDay,
					$lte: endOfDay
				}
			};

			const sessionsBookedByUser = await getSessionByQuery(request);

			if (sessionsBookedByUser.length === MAX_SESSIONS_USER_PER_DAY) {
				return res.status(406).json({ message: 'Maximum number of sessions per user per day reached' });
			}

			const jwtExpiration = Math.floor((new Date(session.date).getTime() - 24 * 60 * 60 * 1000 - Date.now()) / 1000);

			const confirmationToken = jwt.sign({ sub: userId, sessionId: session._id }, auth.JWT_SECRET as jwt.Secret, { expiresIn: jwtExpiration });
			const cancelationToken = jwt.sign({ sub: userId, sessionId: session._id }, auth.JWT_SECRET as jwt.Secret, { expiresIn: jwtExpiration });

			const updateSessionRequest = {
				userId: userId,
				status: SessionStatusEnum.PENDING,
				confirmationToken: confirmationToken,
				cancelationToken: cancelationToken
			};

			const updatedSession = await updateSessionById(req.params.id, updateSessionRequest);

			if (!updatedSession) {
				return res.status(500).json({ message: 'Error updating session' });
			}

			if (isToday(updatedSession.date)) {
				logging.log(`Event: ${EventTypes.CONFIRMATION_EMAIL}`);
				eventBus.emit(EventTypes.CONFIRMATION_EMAIL, { session: updatedSession, email: findUserById.email });
			} else {
				logging.log(`Event: ${EventTypes.SESSION_BOOKED}`);
				eventBus.emit(EventTypes.SESSION_BOOKED, { session: updatedSession, email: findUserById.email });
			}

			return res.status(200).json(updatedSession);
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('post', '/recurring', authorizationHandler, roleHandler(RoleEnum.ADMIN))
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

	@Route('post', '/template', authorizationHandler, roleHandler(RoleEnum.ADMIN))
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

					return new Date(newDate.setHours(newTime.getHours(), newTime.getMinutes(), 0, 0));
				})
				.filter((date) => date > now);

			if (!dates || dates.length === 0) {
				return res.status(403).json({ message: 'Cannot create sessions before the current time' });
			}

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

	@Route('patch', '/update/:id', authorizationHandler, roleHandler(RoleEnum.ADMIN))
	@MongoUpdate(Session)
	update(req: Request, res: Response, next: NextFunction) {
		//TODO: send email to patient if has patient (Event)
		return res.status(201).json(req.mongoUpdate);
	}

	@Route('post', '/day/delete', authorizationHandler, roleHandler(RoleEnum.ADMIN))
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

	@Route('delete', '/recurring/delete/:id', authorizationHandler, roleHandler(RoleEnum.ADMIN))
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

	@Route('delete', '/delete/:id', authorizationHandler, roleHandler(RoleEnum.ADMIN))
	@MongoDelete(Session)
	delete(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json({ message: 'deleted' });
	}
}

export default SessionController;
