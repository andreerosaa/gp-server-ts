import { CronJob } from 'cron';
import { cron } from '../config/config';
import { deleteSessionById, getSessionByQuery, updateSessionById } from '../models/session';
import { SessionStatusEnum } from '../interfaces/session';
import { getUserById } from '../models/user';
import { EventTypes } from '../interfaces/mail';
import eventBus from '../events/eventBus';

/** DELETING OLD SESSIONS */
export const oldSessionsJob = CronJob.from({
	cronTime: cron.CRON_JOB_DELETE_SESSIONS_CONFIG,
	onTick: async () => {
		try {
			logging.info('Deleting 1 year old sessions');

			const yearFromNow = new Date();
			yearFromNow.setFullYear(yearFromNow.getFullYear() - 1);

			const request = { date: { $lte: yearFromNow } };
			const response = await getSessionByQuery(request);

			if (response.length > 0) {
				response.forEach(async (session) => {
					try {
						await deleteSessionById(session._id.toString());
						logging.log(`Session deleted: ${session._id}`);
					} catch (error) {
						logging.error(error);
					}
				});
			}
			return;
		} catch (error) {
			logging.error(error);
		}
	},
	start: true,
	timeZone: 'system'
});

/** SENDING SESSION CONFIRMATION EMAILS */
export const confirmSessionsJob = CronJob.from({
	cronTime: cron.CRON_JOB_CONFIRMATION_EMAILS_CONFIG,
	onTick: async () => {
		try {
			logging.info('Sending session confirmation emails');

			const dayFromNow = new Date();
			dayFromNow.setDate(dayFromNow.getDate() + 1);
			dayFromNow.setMinutes(dayFromNow.getMinutes(), 0, 0); // ensure seconds and milliseconds are 0

			const request = {
				date: {
					$gte: dayFromNow,
					$lte: new Date(dayFromNow.getTime() + 60 * 60 * 1000)
				}
			};

			const response = await getSessionByQuery(request);

			if (response.length > 0) {
				response.forEach(async (session) => {
					try {
						if (session.status === SessionStatusEnum.PENDING && session.userId && session.userId.length > 0) {
							const user = await getUserById(session.userId);
							if (user) {
								logging.log(`Event: ${EventTypes.CONFIRMATION_EMAIL}`);
								eventBus.emit(EventTypes.CONFIRMATION_EMAIL, { session: session, email: user.email });
							}
						}
					} catch (error) {
						logging.error(error);
					}
				});
			}
			return;
		} catch (error) {
			logging.error(error);
		}
	},
	start: true,
	timeZone: 'system'
});

/** COMPLETE SESSIONS */
export const completeSessionsJob = CronJob.from({
	cronTime: cron.CRON_JOB_COMPLETE_SESSIONS_CONFIG,
	onTick: async () => {
		try {
			const now = new Date();

			const request = {
				status: { $ne: SessionStatusEnum.COMPLETED },
				$expr: {
					$lt: [{ $add: ['$date', { $multiply: ['$durationInMinutes', 60 * 1000] }] }, now]
				}
			};
			const response = await getSessionByQuery(request);

			if (response.length > 0) {
				response.forEach(async (session) => {
					try {
						if (session.status !== SessionStatusEnum.COMPLETED) {
							const updatedSession = await updateSessionById(session._id.toString(), { status: SessionStatusEnum.COMPLETED });
							if (updatedSession) {
								logging.log('Session completed: ', updatedSession._id.toString());
							}
						}
					} catch (error) {
						logging.error(error);
					}
				});
			}
			return;
		} catch (error) {
			logging.error(error);
		}
	},
	start: true,
	timeZone: 'system'
});
