import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import 'reflect-metadata';
import './config/loging';
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
import { Session } from './models/session';
import { ISession } from './interfaces/session';

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
	defineRoutes([MainController, SessionController, TherapistController, PatientController], application);

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
	const job = CronJob.from({
		cronTime: cron.CRON_JOB_CONFIG,
		onTick: async () => {
			try {
				logging.info('Filtering older sessions');

				const request = { date: { $lte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000) } };
				const response = await axios.post(`${server.SERVER_BASE_URL}/session/query`, request);

				if (response.data.length) {
					response.data.forEach(async (session: ISession) => {
						try {
							const response = await axios.delete(`${server.SERVER_BASE_URL}/session/delete/${session._id}`);

							if (response.status === 200) {
								logging.log(`Successfuly deleted session with id: ${session._id}`);
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
	job.start();

	/** TODO: SENDING SESSION CONFIRMATION EMAILS */
};

export const Shutdown = (callback: any) => httpServer && httpServer.close(callback);

Main();
