import { EventTypes, UserRegisteredEventPayload as VerificationCodeEventPayload } from '../interfaces/mail';
import mailService from '../services/mail';
import eventBus from './eventBus';

eventBus.on(EventTypes.USER_REGISTERED, async ({ email, code }: VerificationCodeEventPayload) => {
	const message = `
						<h1> Ginásio Palmeiras </h1>
						<p> O seu código de verificação é: ${code} </p>
					`;
	const subject = `Código de verificação: ${code}`;

	await mailService.send({ to: email, subject: subject, message: message });
});

eventBus.on(EventTypes.NEW_VERIFICATION_CODE, async ({ email, code }: VerificationCodeEventPayload) => {
	const message = `
						<h1> Ginásio Palmeiras </h1>
						<p> O seu código de verificação é: ${code} </p>
					`;
	const subject = `Código de verificação: ${code}`;

	await mailService.send({ to: email, subject: subject, message: message });
});
