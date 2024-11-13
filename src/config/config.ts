import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

export const DEVELOPMENT = process.env.NODE_ENV === 'development';
export const TEST = process.env.NODE_ENV === 'test';

export const CRON_JOB_PERIODICITY_HOURS = process.env.CRON_JOB_PERIODICITY_HOURS || 1;
export const CRON_JOB_START_ZERO = process.env.CRON_JOB_START_ZERO || true;

export const MONGO_USER = process.env.MONGO_USER || '';
export const MONGO_PASSWORD = process.env.MONGO_PASSWORD || '';
export const MONGO_URL = process.env.MONGO_URL || '';
export const MONGO_DATABASE = process.env.MONGO_USER || '';
export const MONGO_OPTIONS: mongoose.ConnectOptions = { retryWrites: true, w: 'majority' };

export const SERVER_HOSTNAME = process.env.SERVER_HOSTNAME || 'localhost';
export const SERVER_PORT = process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 3000;

export const cron = {
	CRON_JOB_PERIODICITY_HOURS,
	// CRON_JOB_CONFIG: `* * */${CRON_JOB_PERIODICITY_HOURS} * * *`
	CRON_JOB_CONFIG: `*/${CRON_JOB_PERIODICITY_HOURS} * * * * *` //FIXME: remove, for testing purposes only
};

export const mongo = {
	MONGO_USER,
	MONGO_PASSWORD,
	MONGO_URL,
	MONGO_DATABASE,
	MONGO_OPTIONS,
	MONGO_CONNECTION: `mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_URL}/${MONGO_DATABASE}`
};

export const server = {
	SERVER_HOSTNAME,
	SERVER_PORT,
	SERVER_BASE_URL: `http://${SERVER_HOSTNAME}:${SERVER_PORT}`
};
