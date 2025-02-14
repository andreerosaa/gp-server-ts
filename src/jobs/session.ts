import { CronJob } from 'cron';
import { cron } from '../config/config';
import { deleteSessionById, getSessionByQuery } from '../models/session';
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

			const request = {
				date: {
					$gte: new Date(new Date().getTime()),
					$lte: new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
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
