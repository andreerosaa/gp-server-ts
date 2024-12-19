import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

export const DEVELOPMENT = process.env.NODE_ENV === 'development';
export const TEST = process.env.NODE_ENV === 'test';

export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_TOKEN_SECRET;

export const CRON_JOB_DELETE_SESSIONS_PERIODICITY_HOURS = process.env.CRON_JOB_DELETE_SESSIONS_PERIODICITY_HOURS || 1;
export const CRON_JOB_CONFIRMATION_EMAILS_PERIODICITY_HOURS = process.env.CRON_JOB_CONFIRMATION_EMAILS_PERIODICITY_HOURS || 1;

export const MONGO_USER = process.env.MONGO_USER || '';
export const MONGO_PASSWORD = process.env.MONGO_PASSWORD || '';
export const MONGO_URL = process.env.MONGO_URL || '';
export const MONGO_DATABASE = process.env.MONGO_USER || '';
export const MONGO_OPTIONS: mongoose.ConnectOptions = { retryWrites: true, w: 'majority' };

export const GOOGLE_EMAIL = process.env.GOOGLE_EMAIL || '';
export const GOOGLE_PASSWORD = process.env.GOOGLE_PASSWORD || '';

export const SERVER_HOSTNAME = process.env.SERVER_HOSTNAME || 'localhost';
export const SERVER_PORT = process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 3000;
export const SERVER_CORS_ALLOWED_ORIGINS: string[] = process.env.SERVER_CORS_ALLOWED_ORIGINS?.split(', ') || [];

export const CLIENT_HOSTNAME = process.env.CLIENT_HOSTNAME || 'localhost';
export const CLIENT_PORT = process.env.CLIENT_PORT ? Number(process.env.CLIENT_PORT) : 4200;

export const auth = {
	JWT_SECRET,
	JWT_REFRESH_TOKEN_SECRET
};

export const cron = {
	CRON_JOB_DELETE_SESSIONS_PERIODICITY_HOURS,
	CRON_JOB_DELETE_SESSIONS_CONFIG: `0 */${CRON_JOB_DELETE_SESSIONS_PERIODICITY_HOURS} * * * `, // <minute> <hour> <day-of-month> <month> <day-of-week> <command>
	// CRON_JOB_DELETE_SESSIONS_CONFIG: `*/1 * * * * `, //FIXME: remove, for testing purposes only every minute
	CRON_JOB_CONFIRMATION_EMAILS_PERIODICITY_HOURS,
	CRON_JOB_CONFIRMATION_EMAILS_CONFIG: `0 */${CRON_JOB_CONFIRMATION_EMAILS_PERIODICITY_HOURS} * * * ` // <minute> <hour> <day-of-month> <month> <day-of-week> <command>
	// CRON_JOB_CONFIRMATION_EMAILS_CONFIG: `*/1 * * * * ` //FIXME: remove, for testing purposes only every minute
};

export const mongo = {
	MONGO_USER,
	MONGO_PASSWORD,
	MONGO_URL,
	MONGO_DATABASE,
	MONGO_OPTIONS,
	MONGO_CONNECTION: `mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_URL}/${MONGO_DATABASE}`
};

export const mail = {
	GOOGLE_EMAIL,
	GOOGLE_PASSWORD
};

export const server = {
	SERVER_HOSTNAME,
	SERVER_PORT,
	SERVER_BASE_URL: `http://${SERVER_HOSTNAME}:${SERVER_PORT}`,
	SERVER_CORS_ALLOWED_ORIGINS
};

export const client = {
	CLIENT_HOSTNAME,
	CLIENT_PORT,
	CLIENT_BASE_URL: `http://${CLIENT_HOSTNAME}:${CLIENT_PORT}`
};
