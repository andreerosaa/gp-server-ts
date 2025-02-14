import { server } from '../config/config';
import { EventTypes, SessionBookedEventPayload, UserRegisteredEventPayload as VerificationCodeEventPayload } from '../interfaces/mail';
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

eventBus.on(EventTypes.SESSION_BOOKED, async ({ session, email }: SessionBookedEventPayload) => {
	const message = `<h1> Ginásio Palmeiras </h1>
				<h3> Sessão de ${session.date.toLocaleDateString()} às ${session.date.toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit'
	})}</h3>
    <p> Por favor confirme a sua presença</p>
    <p>
        <button><a href="${server.SERVER_BASE_URL}/session/confirm/${session._id}?token=${session.confirmationToken}">
            Clique para confirmar
        </a><button>
        <a href="${server.SERVER_BASE_URL}/session/cancel/${session._id}?token=${session.cancelationToken}">Clique para cancelar</a>
    </p>`;
	const to = email;
	const subject = 'Email de confirmação';

	await mailService.send({ to: to, subject: subject, message: message });
});
