import nodemailer from 'nodemailer';
import { mail } from '../config/config';

export interface ISendMail {
	to: string;
	subject: string;
	message: string;
}

export const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 587,
	auth: {
		user: mail.GOOGLE_EMAIL,
		pass: mail.GOOGLE_PASSWORD
	}
});

export class MailService {
	async send({ to, subject, message }: ISendMail) {
		const mailOptions = {
			from: mail.GOOGLE_EMAIL,
			to,
			subject,
			html: message
		};

		try {
			await transporter.sendMail(mailOptions);
			logging.log('Email sent successfully to: ', to);
			return true;
		} catch (error) {
			logging.error('Error sending email ', error);
			return false;
		}
	}
}
