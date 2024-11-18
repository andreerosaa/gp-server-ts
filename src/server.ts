import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import 'reflect-metadata';
import './config/logging';
import { loggingHandler } from './middleware/loggingHandler';
import { corsHandler } from './middleware/corsHandler';
import { routeNotFound } from './middleware/routeNotFound';
import { cron, mongo, server, SERVER_HOSTNAME, SERVER_PORT } from './config/config';
import { defineRoutes } from './modules/routes';
import { CronJob } from 'cron';
import MainController from './controllers/main';
import { declareHandler } from './middleware/declareHandler';
import SessionController from './controllers/session';
import TherapistController from './controllers/therapist';
import PatientController from './controllers/patient';
import UserController from './controllers/user';
import { deleteSessionById, getSessionByQuery } from './models/session';
import { SessionStatusEnum } from './interfaces/session';
import { getPatientById } from './models/patient';
import { MailService } from './services/mail';

export const application = express();
export let httpServer: ReturnType<typeof http.createServer>;

export const Main = async () => {
	logging.info('----------------------------------------');
	logging.info('Initializing API');
	logging.info('----------------------------------------');
	application.use(express.urlencoded({ extended: true }));
	application.use(express.json());

	logging.info('----------------------------------------');
	logging.info('Connecting to Mongo');
	logging.info('----------------------------------------');
	try {
		const connection = await mongoose.connect(mongo.MONGO_CONNECTION, mongo.MONGO_OPTIONS);
		logging.info('----------------------------------------');
		logging.info('Connected to Mongo', connection.version);
		logging.info('----------------------------------------');
	} catch (error) {
		logging.info('----------------------------------------');
		logging.info('Unable to connect to Mongo');
		logging.error(error);
		logging.info('----------------------------------------');
	}

	logging.info('----------------------------------------');
	logging.info('Logging and Configuration');
	logging.info('----------------------------------------');
	application.use(declareHandler);
	application.use(loggingHandler);
	application.use(corsHandler);

	logging.info('----------------------------------------');
	logging.info('Define Controller Routing');
	logging.info('----------------------------------------');
	defineRoutes([MainController, SessionController, TherapistController, PatientController, UserController], application);

	logging.info('----------------------------------------');
	logging.info('Define Controller Routing');
	logging.info('----------------------------------------');
	application.use(routeNotFound);

	logging.info('----------------------------------------');
	logging.info('Start Server');
	logging.info('----------------------------------------');
	httpServer = http.createServer(application);
	httpServer.listen(server.SERVER_PORT, () => {
		logging.info('----------------------------------------');
		logging.info('Server Started: ' + SERVER_HOSTNAME + ':' + SERVER_PORT);
		logging.info('----------------------------------------');
	});

	logging.info('----------------------------------------');
	logging.info('Start Cron Jobs');
	logging.info('----------------------------------------');

	/** DELETING OLD SESSIONS */
	const oldSessionsJob = CronJob.from({
		cronTime: cron.CRON_JOB_CONFIG,
		onTick: async () => {
			try {
				logging.info('Filtering older sessions');

				const request = { date: { $lte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000) } };
				const response = await getSessionByQuery(request);

				if (response.length) {
					response.forEach(async (session) => {
						try {
							await deleteSessionById(session._id.toString());
							logging.log(`Successfully deleted session with id: ${session._id}`);
						} catch (error) {
							logging.error(error);
						}
					});
				}
			} catch (error) {
				logging.error(error);
			}
		},
		start: true,
		timeZone: 'system'
	});
	oldSessionsJob.start();

	/** SENDING SESSION CONFIRMATION EMAILS */
	const confirmSessionsJob = CronJob.from({
		cronTime: cron.CRON_JOB_CONFIG,
		onTick: async () => {
			try {
				logging.info('Sending session confirmation emails');

				const request = {
					date: {
						$gte: new Date(new Date().getTime()),
						$lte: new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
					}
				};
				const response = await getSessionByQuery(request);

				if (response.length) {
					response.forEach(async (session) => {
						try {
							if (session.status === SessionStatusEnum.PENDING && session.patientId && session.patientId.length > 0) {
								const patient = await getPatientById(session.patientId);
								if (patient) {
									const emailMessage = `<h1> Please confirm your attendance</h1>
									<a href="${server.SERVER_BASE_URL}/session/confirm/${session.id}?token=${session.confirmationToken}">Click here to confirm</a>`;
									const receiver = patient.email;
									const subject = 'Confirmation email';
									const emailService = new MailService();

									const sent: boolean = await emailService.send({ message: emailMessage, to: receiver, subject });
									logging.log(sent ? 'Confirmation email sent successfully' : 'Error sending confirmation email');
								}
							}
						} catch (error) {
							logging.error(error);
						}
					});
				}
			} catch (error) {
				logging.error(error);
			}
		},
		start: true,
		timeZone: 'system'
	});
	confirmSessionsJob.start();
};

export const Shutdown = (callback: any) => httpServer && httpServer.close(callback);

Main();
