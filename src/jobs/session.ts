import { CronJob } from 'cron';
import { cron, server } from '../config/config';
import { deleteSessionById, getSessionByQuery } from '../models/session';
import { SessionStatusEnum } from '../interfaces/session';
import { MailService } from '../services/mail';
import { getUserById } from '../models/user';

/** DELETING OLD SESSIONS */
export const oldSessionsJob = CronJob.from({
	cronTime: cron.CRON_JOB_DELETE_SESSIONS_CONFIG,
	onTick: async () => {
		try {
			logging.info('Filtering older sessions');

			const request = { date: { $lte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000) } };
			const response = await getSessionByQuery(request);

			if (response.length > 0) {
				response.forEach(async (session) => {
					try {
						await deleteSessionById(session._id.toString());
						logging.log(`Successfully deleted session with id: ${session._id}`);
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
								const emailMessage = `
										<h1> Ginásio Palmeiras </h1>
										<h1> Sessão de ${session.date.toLocaleDateString()} às ${session.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h1>
										<p> Por favor confirme a sua presença</p>
										<p><a href="${server.SERVER_BASE_URL}/session/confirm/${session.id}?token=${session.confirmationToken}">Clique para confirmar</a></p>
				                        <p><a href="${server.SERVER_BASE_URL}/session/cancel/${session.id}?token=${
									session.cancelationToken
								}">Clique para cancelar</a></p>
									`;
								const receiver = user.email;
								const subject = 'Email de confirmação';
								const emailService = new MailService();

								const sent: boolean = await emailService.send({ message: emailMessage, to: receiver, subject });
								if (sent) {
									logging.log('Confirmation email sent successfully');
								} else {
									logging.log('Error sending confirmation email');
								}
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
