import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import 'reflect-metadata';
import './config/logging';
import { loggingHandler } from './middleware/loggingHandler';
import { corsHandler } from './middleware/corsHandler';
import { routeNotFound } from './middleware/routeNotFound';
import { mongo, server, SERVER_HOSTNAME, SERVER_PORT } from './config/config';
import { defineRoutes } from './modules/routes';
import MainController from './controllers/main';
import { declareHandler } from './middleware/declareHandler';
import SessionController from './controllers/session';
import TherapistController from './controllers/therapist';
import PatientController from './controllers/patient';
import UserController from './controllers/user';
import { rateLimitHandler } from './middleware/rateLimitHandler';
import { confirmSessionsJob, oldSessionsJob } from './jobs/session';
import cookieParser from 'cookie-parser';
import SeriesController from './controllers/series';

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
	application.use(cookieParser());
	application.use(declareHandler);
	application.use(loggingHandler);
	application.use(corsHandler);
	application.use(rateLimitHandler);

	logging.info('----------------------------------------');
	logging.info('Define Controller Routing');
	logging.info('----------------------------------------');
	defineRoutes([MainController, SessionController, TherapistController, PatientController, UserController, SeriesController], application);

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
	oldSessionsJob.start();

	/** SENDING SESSION CONFIRMATION EMAILS */
	confirmSessionsJob.start();
};

export const Shutdown = (callback: any) => httpServer?.close(callback);

Main();
