import { Request, Response, NextFunction } from 'express';
import { Controller } from '../decorators/controller';
import { Route } from '../decorators/route';
import { MongoGetAll } from '../decorators/mongoose/getAll';
import { getSessionById, Session, updateSessionById } from '../models/session';
import { MongoGet } from '../decorators/mongoose/get';
import { MongoCreate } from '../decorators/mongoose/create';
import { MongoQuery } from '../decorators/mongoose/query';
import { MongoUpdate } from '../decorators/mongoose/update';
import { MongoDelete } from '../decorators/mongoose/delete';
import { IBookSession } from '../interfaces/bookSession';
import { SessionStatusEnum } from '../interfaces/session';
import { MailService } from '../services/mail';
import { getPatientByEmail, createPatient } from '../models/patient';

@Controller('/session')
class SessionController {
	@Route('get')
	@MongoGetAll(Session)
	getAll(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGetAll);
	}

	@Route('get', '/:id')
	@MongoGet(Session)
	getById(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGet);
	}

	@Route('post')
	@MongoCreate(Session)
	create(req: Request, res: Response, next: NextFunction) {
		return res.status(201).json(req.mongoCreate);
	}

	@Route('post', '/query')
	@MongoQuery(Session)
	query(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoQuery);
	}

	@Route('post', '/book/:id')
	async book(req: Request<any, any, IBookSession>, res: Response, next: NextFunction) {
		try {
			//TODO: add format validation
			const { patientName, email } = req.body;

			if (!patientName || !email) {
				return res.sendStatus(400);
			}

			const session = await getSessionById(req.params.id);
			if (!session) {
				return res.sendStatus(404);
			} else if (session.patientId) {
				return res.status(403).json({ message: 'Session already booked' });
			}

			const findPatientByEmail = await getPatientByEmail(email);
			const updateSessionRequest = { patientId: '', status: SessionStatusEnum.PENDING };

			if (!findPatientByEmail) {
				try {
					const createPatientRequest = {
						name: patientName,
						email: email,
						verified: false,
						verificationCode: Math.floor(1000 + Math.random() * 9000),
						expirationCode: new Date(new Date().getTime() + 5 * 60 * 1000)
					};

					const createdPatient = await createPatient(createPatientRequest);

					logging.log('Patient created successfully', createdPatient);
					updateSessionRequest.patientId = createdPatient._id.toString();

					//FIXME: cleanup or separate responsibilities of this part
					const emailMessage = `<h1> Your verification code: ${createPatientRequest.verificationCode} </h1>`;
					const receiver = email;
					const subject = 'NodeMailer Test 1';

					const emailService = new MailService();
					const sent: boolean = await emailService.send({ message: emailMessage, to: receiver, subject });
					logging.log(sent ? 'Verification code created successfully' : 'Error sending verification code');
				} catch (error) {
					logging.error(error);
					return res.status(500).json(error);
				}
			} else {
				updateSessionRequest.patientId = findPatientByEmail._id.toString();
			}

			const updateSession = await updateSessionById(req.params.id, updateSessionRequest);
			return res.status(201).json(updateSession);
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('patch', '/update/:id')
	@MongoUpdate(Session)
	update(req: Request, res: Response, next: NextFunction) {
		return res.status(201).json(req.mongoUpdate);
	}

	@Route('delete', '/delete/:id')
	@MongoDelete(Session)
	delete(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json({ message: 'deleted' });
	}
}

export default SessionController;
